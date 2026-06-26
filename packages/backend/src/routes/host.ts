/**
 * packages/backend/src/routes/host.ts
 * ------------------------------------------------------------
 * 역할: host/global resource API를 처리한다.
 * 연결: coins, diamonds, diceCount, inventory, hostName 같은 전역 상태를 hostStates로 분리한다.
 * 주의: 모듈 지역 상태를 host API에 넣지 말고, 모듈 간 이동은 customs에서 처리한다.
 */
import { Router } from 'express'
import { getHostStateRepository } from '../repositories/index.js'
import { getRequestUid } from '../middleware/auth.js'
import type { HostResource } from '../repositories/hostStateRepository.js'

export const hostRouter = Router()

const HOST_RESOURCES = new Set(['coins', 'diamonds', 'diceCount'])

function parseDelta(value: unknown): number | undefined {
  const delta = Number(value)
  return Number.isFinite(delta) && delta !== 0 ? delta : undefined
}

function asHostResource(value: unknown): HostResource | undefined {
  return typeof value === 'string' && HOST_RESOURCES.has(value)
    ? value as HostResource
    : undefined
}

hostRouter.get('/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })
  const state = await getHostStateRepository().getOrCreate(uid)
  res.json({ state })
})

hostRouter.patch('/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })
  const patch = req.body?.patch
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return res.status(400).json({ error: 'invalid_patch' })
  }
  const state = await getHostStateRepository().patch(uid, patch)
  res.json({ state })
})

hostRouter.post('/resources/mutate', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const resource = asHostResource(req.body?.resource)
  const delta = parseDelta(req.body?.delta)
  if (!resource) return res.status(400).json({ error: 'invalid_resource' })
  if (delta === undefined) return res.status(400).json({ error: 'invalid_delta' })

  try {
    const state = await getHostStateRepository().mutateResource(uid, resource, delta)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_host_resource') {
      return res.status(409).json({ error: 'insufficient_resource', resource })
    }
    throw error
  }
})

hostRouter.post('/inventory/mutate', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const itemId = typeof req.body?.itemId === 'string' ? req.body.itemId : ''
  const delta = parseDelta(req.body?.delta)
  if (!itemId) return res.status(400).json({ error: 'invalid_item_id' })
  if (delta === undefined) return res.status(400).json({ error: 'invalid_delta' })

  try {
    const state = await getHostStateRepository().mutateInventory(uid, itemId, delta)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_host_inventory') {
      return res.status(409).json({ error: 'insufficient_inventory', itemId })
    }
    throw error
  }
})






