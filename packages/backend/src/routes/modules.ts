/**
 * packages/backend/src/routes/modules.ts
 * ------------------------------------------------------------
 * 역할: 공통 모듈 상태 API를 제공한다.
 * 연결: GET/PUT/PATCH /api/modules/{moduleId}/state를 전용 repository 또는 moduleStates fallback에 연결한다.
 * 주의: rule-heavy action이나 자원 이동은 이 generic state API가 아니라 전용 action/customs API로 보낸다.
 */
import { Router } from 'express'
import {
  getDedicatedModuleRepositories,
  getModuleStateRepository,
} from '../repositories/index.js'
import { getRequestUid } from '../middleware/auth.js'
import { getModuleModelSpec, listModuleModelSpecs, type ModuleModelSpec } from '../modules/modelSpecs.js'

export const modulesRouter = Router()

function isValidModuleId(moduleId: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(moduleId)
}

function normalizeDedicatedState(moduleId: string, state: Record<string, unknown>) {
  if ((moduleId === 'route-neighbor' || moduleId.startsWith('zone-')) && state.resources) {
    const { resources: _resources, ...rest } = state
    return { ...rest, localResources: state.localResources ?? state.resources }
  }
  if (moduleId === 'ship' && state.resources) {
    const { resources: _resources, ...rest } = state
    return { ...rest, shipInventory: state.shipInventory ?? state.resources }
  }
  if (moduleId === 'ship' && state.cabins && !state.cabinAssignments) {
    return { ...state, cabinAssignments: state.cabins }
  }
  return state
}

function enrichModelSpec(spec: ModuleModelSpec) {
  return {
    ...spec,
    dedicatedRegistered: Boolean(getDedicatedModuleRepositories()[spec.moduleId]),
  }
}

modulesRouter.get('/_model-specs', (_req, res) => {
  res.json({
    specs: listModuleModelSpecs().map(enrichModelSpec),
  })
})

modulesRouter.get('/:moduleId/model-spec', (req, res) => {
  const moduleId = req.params.moduleId
  if (!isValidModuleId(moduleId)) {
    return res.status(400).json({ error: 'invalid_module_id' })
  }

  const spec = getModuleModelSpec(moduleId)
  if (!spec) return res.status(404).json({ error: 'model_spec_not_found' })

  res.json({
    spec: enrichModelSpec(spec),
  })
})

modulesRouter.get('/:moduleId/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const moduleId = req.params.moduleId
  if (!isValidModuleId(moduleId)) {
    return res.status(400).json({ error: 'invalid_module_id' })
  }

  const dedicated = getDedicatedModuleRepositories()[moduleId]
  if (dedicated) {
    const state = await dedicated.getOrCreate(uid)
    return res.json({
      moduleId,
      storage: 'dedicated',
      state,
      createdAt: 'createdAt' in state ? state.createdAt : undefined,
      updatedAt: 'updatedAt' in state ? state.updatedAt : undefined,
    })
  }

  const state = await getModuleStateRepository().getState(uid, moduleId)
  res.json({
    moduleId,
    storage: 'moduleStates',
    state: state?.state ?? {},
    createdAt: state?.createdAt,
    updatedAt: state?.updatedAt,
  })
})

modulesRouter.put('/:moduleId/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const moduleId = req.params.moduleId
  if (!isValidModuleId(moduleId)) {
    return res.status(400).json({ error: 'invalid_module_id' })
  }

  const state = req.body?.state
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return res.status(400).json({ error: 'invalid_state' })
  }

  const dedicated = getDedicatedModuleRepositories()[moduleId]
  if (dedicated) {
    const doc = await dedicated.patch(
      uid,
      normalizeDedicatedState(moduleId, state as Record<string, unknown>),
    )
    return res.json({
      moduleId,
      storage: 'dedicated',
      state: doc,
      createdAt: 'createdAt' in doc ? doc.createdAt : undefined,
      updatedAt: 'updatedAt' in doc ? doc.updatedAt : undefined,
    })
  }

  const doc = await getModuleStateRepository().upsertState(
    uid,
    moduleId,
    state as Record<string, unknown>,
  )
  res.json({
    moduleId,
    storage: 'moduleStates',
    state: doc.state,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  })
})

modulesRouter.patch('/:moduleId/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const moduleId = req.params.moduleId
  if (!isValidModuleId(moduleId)) {
    return res.status(400).json({ error: 'invalid_module_id' })
  }

  const patch = req.body?.patch
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return res.status(400).json({ error: 'invalid_patch' })
  }

  const dedicated = getDedicatedModuleRepositories()[moduleId]
  if (dedicated) {
    const doc = await dedicated.patch(
      uid,
      normalizeDedicatedState(moduleId, patch as Record<string, unknown>),
    )
    return res.json({
      moduleId,
      storage: 'dedicated',
      state: doc,
      createdAt: 'createdAt' in doc ? doc.createdAt : undefined,
      updatedAt: 'updatedAt' in doc ? doc.updatedAt : undefined,
    })
  }

  const doc = await getModuleStateRepository().patchState(
    uid,
    moduleId,
    patch as Record<string, unknown>,
  )
  res.json({
    moduleId,
    storage: 'moduleStates',
    state: doc.state,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  })
})






