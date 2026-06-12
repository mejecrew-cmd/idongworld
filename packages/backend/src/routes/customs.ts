/**
 * packages/backend/src/routes/customs.ts
 * ------------------------------------------------------------
 * 역할: customs API를 통해 자원 이동을 처리한다.
 * 연결: source debit, target credit, audit log를 하나의 backend 권위 흐름으로 묶는다.
 * 주의: 모듈이 다른 모듈 document를 직접 수정하지 않도록 adapter 경계를 지킨다.
 */
import { Router } from 'express'
import {
  calculateCustomsAmounts,
  getCustomsRule,
  listCustomsRules,
} from '../customs/rules.js'
import { withMongoTransaction } from '../db/transaction.js'
import { getRequestUid } from '../middleware/auth.js'
import { getCustomsLogRepository } from '../repositories/index.js'
import { getResourceAdapter, validateResourceRef, type ResourceRef } from '../resources/index.js'
import type { ResourceAdapter } from '../resources/index.js'

export const customsRouter = Router()

export function isAdHocCustomsApplyEnabled(): boolean {
  const explicit = process.env.CUSTOMS_AD_HOC_APPLY_ENABLED
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

function parseRef(value: unknown): ResourceRef | undefined {
  if (!value || typeof value !== 'object') return undefined
  const ref = value as Record<string, unknown>
  if (ref.scope !== 'host' && ref.scope !== 'module') return undefined
  const parsed = {
    scope: ref.scope,
    moduleId: typeof ref.moduleId === 'string' ? ref.moduleId : undefined,
    resource: typeof ref.resource === 'string' ? ref.resource : '',
  } satisfies ResourceRef
  return validateResourceRef(parsed) ? undefined : parsed
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

interface CustomsTransferInput {
  uid: string
  ruleId: string
  from: ResourceRef
  to: ResourceRef
  amount: number
  receiveAmount: number
  multiplier?: number
  idempotencyKey?: string
  transactional: boolean
  session?: import('mongoose').ClientSession
  sourceAdapter: ResourceAdapter
  targetAdapter: ResourceAdapter
}

export async function executeCustomsTransfer(input: CustomsTransferInput) {
  const {
    uid,
    ruleId,
    from,
    to,
    amount,
    receiveAmount,
    multiplier,
    idempotencyKey,
    transactional,
    session,
    sourceAdapter,
    targetAdapter,
  } = input

  const canDebit = await sourceAdapter.canDebit(uid, from, amount, session)
  if (!canDebit) {
    const log = await getCustomsLogRepository().create({
      uid,
      ruleId,
      status: 'failure',
      from,
      to,
      debitAmount: amount,
      creditAmount: receiveAmount,
      multiplier,
      idempotencyKey,
      error: 'insufficient_resource',
    }, session)
    return { statusCode: 409, body: { error: 'insufficient_resource', log } }
  }

  let debited = false
  try {
    await sourceAdapter.debit(uid, from, amount, session)
    debited = true
    await targetAdapter.credit(uid, to, receiveAmount, session)
  } catch (error) {
    if (transactional) throw error

    let rollbackError: string | undefined
    if (debited) {
      try {
        await sourceAdapter.credit(uid, from, amount, session)
      } catch (rollback) {
        rollbackError = errorToMessage(rollback)
      }
    }

    const log = await getCustomsLogRepository().create({
      uid,
      ruleId,
      status: 'failure',
      from,
      to,
      debitAmount: amount,
      creditAmount: receiveAmount,
      multiplier,
      idempotencyKey,
      error: rollbackError
        ? `customs_apply_failed_rollback_failed:${rollbackError}`
        : `customs_apply_failed:${errorToMessage(error)}`,
    }, session)

    return {
      statusCode: rollbackError ? 500 : 409,
      body: {
        error: rollbackError ? 'customs_apply_failed_rollback_failed' : 'customs_apply_failed',
        rolledBack: !rollbackError && debited,
        log,
      },
    }
  }

  const log = await getCustomsLogRepository().create({
    uid,
    ruleId,
    status: 'success',
    from,
    to,
    debitAmount: amount,
    creditAmount: receiveAmount,
    multiplier,
    idempotencyKey,
  }, session)

  return {
    statusCode: 200,
    body: {
      ok: true,
      ruleId,
      transactional,
      multiplier,
      debit: { ...from, amount },
      credit: { ...to, amount: receiveAmount },
      log,
    },
  }
}

customsRouter.get('/rules', (_req, res) => {
  res.json({ rules: listCustomsRules() })
})

customsRouter.get('/logs', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })
  const limit = Number(req.query.limit ?? 50)
  const logs = await getCustomsLogRepository().listByUser(
    uid,
    Number.isFinite(limit) ? limit : 50,
  )
  res.json({ logs })
})

customsRouter.post('/apply', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const ruleId = typeof req.body?.ruleId === 'string' ? req.body.ruleId : 'ad-hoc'
  const registeredRule = ruleId === 'ad-hoc' ? undefined : getCustomsRule(ruleId)
  const multiplier = Number(req.body?.multiplier ?? 1)
  const idempotencyKey = typeof req.body?.idempotencyKey === 'string'
    ? req.body.idempotencyKey
    : undefined

  if (ruleId === 'ad-hoc' && !isAdHocCustomsApplyEnabled()) {
    const log = await getCustomsLogRepository().create({
      uid,
      ruleId,
      status: 'failure',
      idempotencyKey,
      error: 'customs_ad_hoc_disabled',
    })
    return res.status(403).json({ error: 'customs_ad_hoc_disabled', log })
  }

  if (idempotencyKey) {
    const existing = await getCustomsLogRepository().findByIdempotencyKey(uid, idempotencyKey)
    if (existing) {
      return res.json({ ok: existing.status === 'success', replayed: true, log: existing })
    }
  }

  const ruleAmounts = registeredRule
    ? calculateCustomsAmounts(registeredRule, multiplier)
    : undefined

  const from = registeredRule?.from ?? parseRef(req.body?.from)
  const to = registeredRule?.to ?? parseRef(req.body?.to)
  const amount = ruleAmounts?.debitAmount ?? Number(req.body?.amount ?? 0)
  const receiveAmount = ruleAmounts?.creditAmount ?? Number(req.body?.receiveAmount ?? amount)

  if (ruleId !== 'ad-hoc' && !registeredRule) {
    const log = await getCustomsLogRepository().create({
      uid,
      ruleId,
      status: 'failure',
      idempotencyKey,
      error: 'customs_rule_not_found',
    })
    return res.status(404).json({ error: 'customs_rule_not_found', ruleId, log })
  }

  if (!from || !to) {
    const log = await getCustomsLogRepository().create({
      uid,
      ruleId,
      status: 'failure',
      idempotencyKey,
      error: 'invalid_resource_ref',
    })
    return res.status(400).json({ error: 'invalid_resource_ref', log })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    const log = await getCustomsLogRepository().create({
      uid,
      ruleId,
      status: 'failure',
      from,
      to,
      idempotencyKey,
      error: 'invalid_amount',
    })
    return res.status(400).json({ error: 'invalid_amount', log })
  }
  if (!Number.isFinite(receiveAmount) || receiveAmount <= 0) {
    const log = await getCustomsLogRepository().create({
      uid,
      ruleId,
      status: 'failure',
      from,
      to,
      debitAmount: amount,
      idempotencyKey,
      error: 'invalid_receive_amount',
    })
    return res.status(400).json({ error: 'invalid_receive_amount', log })
  }

  let result
  try {
    result = await withMongoTransaction(async ({ session, transactional }) => {
      return executeCustomsTransfer({
        uid,
        ruleId,
        from,
        to,
        amount,
        receiveAmount,
        multiplier: registeredRule ? multiplier : undefined,
        idempotencyKey,
        transactional,
        session,
        sourceAdapter: getResourceAdapter(from),
        targetAdapter: getResourceAdapter(to),
      })
    })
  } catch (error) {
    const log = await getCustomsLogRepository().create({
      uid,
      ruleId,
      status: 'failure',
      from,
      to,
      debitAmount: amount,
      creditAmount: receiveAmount,
      multiplier: registeredRule ? multiplier : undefined,
      idempotencyKey,
      error: `customs_apply_failed:${errorToMessage(error)}`,
    })
    result = { statusCode: 500, body: { error: 'customs_apply_failed', log } }
  }

  res.status(result.statusCode).json(result.body)
})






