/**
 * packages/backend/scripts/smoke-module-actions.mjs
 * ------------------------------------------------------------
 * 역할: 실행 중인 backend server와 Mongo 저장소를 대상으로 6월 POC 수직 루프가 살아 있는지 확인한다.
 * 연결: frontend route smoke가 화면 렌더링을 확인한다면, 이 파일은 module action API와 dedicated document 연결을 확인한다.
 * 주의: 깊은 밸런스/연출 검증이 아니라 `로그인 -> 마이섬 -> 항해/아이동섬 -> 영입/편입 -> 케어 -> 생산/도감 -> 마이룸`의 최소 생존 검증이다.
 */
const baseUrl = process.env.BACKEND_URL ?? 'http://localhost:4000'

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`
    throw new Error(`${message}${suffix}`)
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const body = await response.json().catch(() => undefined)
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status}\n${JSON.stringify(body, null, 2)}`)
  }
  return body
}

async function requestFailure(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const body = await response.json().catch(() => undefined)
  assert(!response.ok, `${options.method ?? 'GET'} ${path} should fail`, body)
  return { status: response.status, body }
}

async function get(path) {
  return await request(path)
}

async function post(path, body) {
  return await request(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function postFailure(path, body) {
  return await requestFailure(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function patch(path, body) {
  return await request(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

function findSpec(modelSpecs, moduleId) {
  return modelSpecs.specs.find((spec) => spec.moduleId === moduleId)
}

async function step(name, action) {
  console.log(`[module-smoke] ${name}`)
  try {
    return await action()
  } catch (error) {
    error.message = `[module-smoke] ${name} failed\n${error.message}`
    throw error
  }
}

async function assertDedicatedRepositories() {
  const health = await get('/health')
  assert(health.status === 'ok', 'backend health check failed', health)
  assert(health.mongo?.connected === true, 'backend should be connected to Mongo for live smoke', health)
  assert(health.migration?.repositories?.backend === 'mongo', 'backend should use mongo repositories', health)
  assert(health.migration?.legacyStateApiRemoved === true, 'legacy /api/state should remain removed', health)

  const modelSpecs = await get('/api/modules/_model-specs')
  assert(Array.isArray(modelSpecs.specs), 'module model specs missing', modelSpecs)

  const requiredDedicatedModules = [
    'aidong-island',
    'my-aidong',
    'my-island',
    'codex',
    'lodge',
    'route-neighbor',
    'ship',
    'zone-garden',
    'zone-oasis',
    'zone-memory',
    'zone-mine',
  ]

  for (const moduleId of requiredDedicatedModules) {
    const spec = findSpec(modelSpecs, moduleId)
    assert(spec?.dedicatedRegistered === true, `${moduleId} dedicated repository should be registered`, spec)
  }

  return { health, modelSpecs }
}

async function createSmokeAccount() {
  const guest = await post('/api/auth/guest')
  const uid = guest.uid
  assert(typeof uid === 'string' && uid.length > 0, 'guest uid missing', guest)

  const account = await patch('/api/account/state', {
    uid,
    patch: {
      nickname: 'module-smoke',
      onboardingComplete: false,
    },
  })
  assert(account.state?.nickname === 'module-smoke', 'account patch failed', account)
  assert(account.state?.onboardingComplete === false, 'account onboarding flag should start false', account)

  return { uid }
}

async function prepareIslandAndLodge(uid) {
  const garden = await post('/api/modules/my-island/unlock-zone', { uid, zoneId: 'zone-garden' })
  assert(garden.state?.unlockedZones?.includes('zone-garden'), 'my-island should unlock zone-garden', garden)

  const tutorial = await post('/api/modules/my-island/tutorial/complete', { uid })
  assert(tutorial.account?.onboardingComplete === true, 'tutorial completion should update account onboarding flag', tutorial)

  const lodgeConfig = await get('/api/modules/lodge/config')
  assert(lodgeConfig.maxAssignedAidongs >= 1, 'lodge config missing maxAssignedAidongs', lodgeConfig)

  return { unlockedZones: garden.state.unlockedZones }
}

async function prepareVoyageCrew(uid) {
  const crewId = `module-smoke-crew-${uid}`
  const recruited = await post('/api/modules/my-aidong/recruit', { uid, characterId: crewId })
  assert(recruited.state?.recruitedAidongs?.includes(crewId), 'voyage crew recruit failed', recruited)

  const assigned = await post('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
    characterId: crewId,
  })
  assert(assigned.state?.cabinAssignments?.cabin1 === crewId, 'voyage crew should be assigned to cabin1', assigned)

  return { crewId }
}

async function checkVoyageAndAidongIsland(uid) {
  const route = await post('/api/modules/route-neighbor/start', { uid, routeId: 'neighbor' })
  assert(route.routeId === 'neighbor', 'route-neighbor start should echo routeId', route)
  assert(route.boardPosition === 0, 'route-neighbor start should return session initial boardPosition', route)
  assert(route.state?.currentRoute === undefined, 'route-neighbor start must not persist currentRoute', route)
  assert(route.state?.boardPosition === undefined, 'route-neighbor start must not persist boardPosition', route)

  const restartedRoute = await post('/api/modules/route-neighbor/start', { uid, routeId: 'neighbor' })
  assert(restartedRoute.routeId === 'neighbor', 'route-neighbor start should be repeatable per frontend session', restartedRoute)

  const islandConfig = await get('/api/modules/aidong-island/config')
  assert(islandConfig.config?.islandId === 'first-aidong-island', 'aidong-island config should expose first island', islandConfig)

  const land = await post('/api/modules/aidong-island/land', { uid })
  assert(land.state?.currentIslandId === 'first-aidong-island', 'aidong-island land should set currentIslandId', land)
  assert(land.state?.currentNodeId === 'landing-beach', 'aidong-island land should start at landing-beach', land)

  const move = await post('/api/modules/aidong-island/move', { uid, direction: 'north' })
  assert(move.state?.currentNodeId === 'small-grove', 'aidong-island move north should reach small-grove', move)

  const interact = await post('/api/modules/aidong-island/interact', { uid, hotspotId: 'meet-hwanggumeong' })
  assert(interact.candidate?.characterId === '황금멍', 'aidong-island interact should expose hwanggumeong candidate', interact)
  assert(interact.candidate?.status === 'recruitable', 'aidong-island candidate should be recruitable', interact)

  const recruit = await post('/api/modules/aidong-island/recruit', { uid, characterId: '황금멍' })
  assert(recruit.aidongState?.recruitedAidongs?.includes('황금멍'), 'aidong-island recruit should call my-aidong recruit', recruit)
  assert(recruit.nextActions?.includes('my-island/slots/incorporate'), 'aidong-island recruit should point to slot incorporation', recruit)

  const incorporate = await post('/api/modules/my-island/slots/incorporate', {
    uid,
    areaNo: 'AREA-01',
    characterId: '황금멍',
  })
  assert(incorporate.zoneSlots?.['AREA-01']?.occupantAidongId === '황금멍', 'my-island should incorporate recruited Aidong into AREA-01', incorporate)

  const leave = await post('/api/modules/aidong-island/leave', { uid })
  assert(!leave.state?.currentIslandId, 'aidong-island leave should clear currentIslandId', leave)

  return { characterId: '황금멍' }
}

async function checkCareAndLodge(uid, characterId) {
  const assigned = await post('/api/modules/lodge/aidongs/assign-toggle', { uid, characterId })
  assert(assigned.state?.assignedAidongs?.includes(characterId), 'lodge should assign recruited Aidong', assigned)

  const care = await post('/api/modules/my-aidong/care', {
    uid,
    characterId,
    actionId: 'sleep',
  })
  assert(care.result?.actionId === 'sleep', 'care result should echo actionId', care)
  assert(care.state?.needs?.[characterId]?.energy === 10, 'sleep care should recover energy', care)
  assert(care.state?.careLog?.[characterId]?.sleep?.todayCount === 1, 'care should update careLog', care)
}

async function checkProductionCodexAndMyroom(uid, characterId) {
  const productionAssign = await post('/api/modules/zone-garden/production/assign', {
    uid,
    characterId,
    slotId: 'slot1',
  })
  assert(productionAssign.state?.progress?.production?.slot1?.characterId === characterId, 'zone production should assign Aidong to slot1', productionAssign)

  const productionClaim = await post('/api/modules/zone-garden/production/claim', {
    uid,
    slotId: 'slot1',
    idempotencyKey: `module-smoke-production-${uid}`,
  })
  assert(productionClaim.rewards?.[0]?.kind === 'aidong-codex-item', 'zone production should grant Aidong codex item reward', productionClaim)
  assert(productionClaim.rewards?.[0]?.itemId === 'hwanggumeong-golden-paw', 'zone production reward item mismatch', productionClaim)
  assert(productionClaim.aidongState?.aidongCodexItems?.[characterId]?.['hwanggumeong-golden-paw'] === 1, 'zone production should add codex item quantity 1', productionClaim)

  const progress = await get(`/api/modules/my-aidong/codex-items/progress?uid=${encodeURIComponent(uid)}&characterId=${encodeURIComponent(characterId)}`)
  assert(progress.progress?.length === 25, 'my-aidong codex progress should expose 25 slots', progress)
  assert(progress.progress?.[0]?.status === 'owned', 'codex slot 1 should be owned after production claim', progress)
  assert(progress.progress?.[0]?.quantity === 1, 'codex slot 1 quantity should be 1 after production claim', progress)

  const myRoomCodex = await get(`/api/modules/myroom/codex?uid=${encodeURIComponent(uid)}`)
  assert(myRoomCodex.codex?.aidongCodexProgress?.[characterId]?.length === 25, 'myroom codex should include Aidong progress', myRoomCodex)
  assert(myRoomCodex.codex?.aidongCodexProgress?.[characterId]?.[0]?.quantity === 1, 'myroom codex should reflect production reward quantity', myRoomCodex)

  const myRoomCollection = await get(`/api/modules/myroom/collection?uid=${encodeURIComponent(uid)}`)
  assert(
    myRoomCollection.collection?.aidongCodexItems?.some((item) => item.characterId === characterId && item.itemId === 'hwanggumeong-golden-paw'),
    'myroom collection should include earned Aidong codex item',
    myRoomCollection,
  )

  return { myRoomCodex, myRoomCollection }
}

async function checkRouteLandingCompat(uid) {
  const roll = await post('/api/modules/route-neighbor/roll', { uid, steps: 6, routeId: 'neighbor', boardPosition: 6 })
  assert(roll.boardPosition === 6, 'route-neighbor roll should echo session boardPosition', roll)
  assert(roll.state?.boardPosition === undefined, 'route-neighbor roll must not persist boardPosition', roll)
  assert(roll.landing?.targetWorldScope === 'destination-island', 'route landing should target destination-island', roll)
  assert(roll.landing?.landingModuleId === 'destination-shell-island', 'route landing should preserve destination-shell-island compat', roll)

  const currentLanding = await get(`/api/modules/route-neighbor/landing/current?uid=${encodeURIComponent(uid)}`)
  assert(!currentLanding.landing, 'route-neighbor current landing should not be persisted outside session', currentLanding)

  const clearLanding = await post('/api/modules/route-neighbor/landing/clear', {
    uid,
    landingId: 'neighbor:6',
    routeId: 'neighbor',
    boardPosition: 6,
  })
  assert(clearLanding.state?.localResources?.['deck-cargo'] === 1, 'route landing clear should grant deck-cargo compat reward', clearLanding)
  assert(clearLanding.moduleStates?.['destination-shell-island']?.localResources?.['shell-fragment'] === 1, 'route landing clear should seed destination resource', clearLanding)

  const end = await post('/api/modules/route-neighbor/end', { uid })
  assert(end.state?.boardPosition === undefined, 'route end must not expose persisted boardPosition', end)
  assert(!end.state?.currentRoute, 'route end must not expose persisted currentRoute', end)
}

async function checkFinalState(uid, characterId) {
  const myAidongState = await get(`/api/modules/my-aidong/state?uid=${encodeURIComponent(uid)}`)
  const myIslandState = await get(`/api/modules/my-island/state?uid=${encodeURIComponent(uid)}`)
  const lodgeState = await get(`/api/modules/lodge/state?uid=${encodeURIComponent(uid)}`)
  const routeState = await get(`/api/modules/route-neighbor/state?uid=${encodeURIComponent(uid)}`)
  const zoneState = await get(`/api/modules/zone-garden/state?uid=${encodeURIComponent(uid)}`)

  assert(myAidongState.storage === 'dedicated', 'my-aidong state should be dedicated', myAidongState)
  assert(myAidongState.state?.recruitedAidongs?.includes(characterId), 'my-aidong should persist recruited Aidong', myAidongState)
  assert(myAidongState.state?.aidongCodexItems?.[characterId]?.['hwanggumeong-golden-paw'] === 1, 'my-aidong should persist earned codex item', myAidongState)
  assert(myIslandState.storage === 'dedicated', 'my-island state should be dedicated', myIslandState)
  assert(myIslandState.state?.zoneSlots?.['AREA-01']?.occupantAidongId === characterId, 'my-island should persist slot incorporation', myIslandState)
  assert(lodgeState.storage === 'dedicated', 'lodge state should be dedicated', lodgeState)
  assert(lodgeState.state?.assignedAidongs?.includes(characterId), 'lodge should persist assigned Aidong', lodgeState)
  assert(routeState.storage === 'dedicated', 'route-neighbor state should be dedicated', routeState)
  assert(routeState.state?.boardPosition === undefined, 'route-neighbor state must not persist boardPosition', routeState)
  assert(zoneState.storage === 'dedicated', 'zone-garden state should be dedicated', zoneState)
  assert(zoneState.state?.progress?.lastProductionClaim?.characterId === characterId, 'zone-garden should persist production claim', zoneState)

  return { myAidongState, myIslandState, lodgeState, routeState, zoneState }
}

async function main() {
  const { health } = await step('00 health and dedicated repository contracts', assertDedicatedRepositories)
  const { uid } = await step('01 guest login and account bootstrap', createSmokeAccount)
  await step('02 my-island tutorial and lodge config bootstrap', () => prepareIslandAndLodge(uid))
  await step('03 ship crew bootstrap for route start', () => prepareVoyageCrew(uid))
  const { characterId } = await step('04 voyage to aidong-island, recruit, and incorporate into 15-slot island', () => checkVoyageAndAidongIsland(uid))
  await step('05 lodge assignment and four-parameter care action', () => checkCareAndLodge(uid, characterId))
  const { myRoomCodex, myRoomCollection } = await step('06 zone production reward, Aidong codex progress, and myroom aggregation', () => checkProductionCodexAndMyroom(uid, characterId))
  await step('07 route landing compatibility and voyage cleanup', () => checkRouteLandingCompat(uid))
  const finalStates = await step('08 final dedicated document persistence check', () => checkFinalState(uid, characterId))

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    uid,
    mongo: health.mongo,
    checkedLoop: [
      'guest/account',
      'my-island tutorial and 15-slot incorporation',
      'ship crew prerequisite for route start',
      'route-neighbor start and landing compat',
      'aidong-island land/move/interact/recruit/leave',
      'my-aidong recruit/care/codex progress',
      'lodge assignment',
      'zone-garden production reward',
      'myroom codex and collection aggregation',
    ],
    frontendOnlyChecks: [
      'stage route /stage',
      'debut route /stage/debut/:id',
      'photocard placeholder display',
    ],
    summary: {
      characterId,
      codexSlotCount: myRoomCodex.codex.aidongCodexProgress[characterId].length,
      ownedCodexItemCount: myRoomCollection.collection.aidongCodexItems.length,
      islandSlot: finalStates.myIslandState.state.zoneSlots['AREA-01'],
      lodgeAssignedCount: finalStates.lodgeState.state.assignedAidongs.length,
      routeBoardPosition: finalStates.routeState.state.boardPosition ?? null,
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  console.error('Run `pnpm dev:be:local-mongo` in another terminal before this smoke check, or run `pnpm check:live-smoke:local` from the repo root.')
  process.exit(1)
})