/**
 * 📌 packages/backend/scripts/smoke-persistence.mjs — backend split 안내
 * ────────────────────────────────────────────────────────────
 * 🎯 역할: Backend migration/check script. userStore.ts 중심 legacy 저장 흐름이 Mongo repository, module document, customs API로 분리됐는지 실행 단계에서 확인한다.
 *
 * 🔗 userStore.ts와의 연결:
 *   - frontend의 packages/frontend/src/stores/userStore.ts는 auth, host resource,
 *     Aidong, island/codex, voyage 상태를 한 Zustand store에 담는다.
 *   - backend split 이후 이 파일은 그 통합 상태 중 일부를 users, hostStates,
 *     moduleStates, 전용 module state, customsLogs 중 어디에 저장할지
 *     결정하거나 실행한다.
 *
 * 🧭 작업 안내:
 *   - 신규 기능은 account, host, module, customs, action API를 우선 사용한다.
 *   - account/host/module/customs/action API와 repository/service 경계를 우선 사용한다.
 *   - 다른 모듈 document를 직접 수정하지 않는다.
 *   - cross-module resource 이동은 customs와 resource adapter를 통한다.
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

async function main() {
  const health = await request('/health')
  assert(health.status === 'ok', 'backend health check failed', health)
  assert(health.migration?.repositories?.backend === 'mongo', 'backend should use mongo repositories', health)
  assert(
    Array.isArray(health.migration?.repositories?.dedicatedModuleIds) &&
      health.migration.repositories.dedicatedModuleIds.includes('my-aidong') &&
      health.migration.repositories.dedicatedModuleIds.includes('codex') &&
      health.migration.repositories.dedicatedModuleIds.includes('lodge') &&
      health.migration.repositories.dedicatedModuleIds.includes('my-island') &&
      health.migration.repositories.dedicatedModuleIds.includes('route-neighbor') &&
      health.migration.repositories.dedicatedModuleIds.includes('ship'),
    'dedicated module repositories missing from health',
    health,
  )

  const modelSpecs = await request('/api/modules/_model-specs')
  assert(Array.isArray(modelSpecs.specs), 'module model specs missing', modelSpecs)
  const shipSpec = modelSpecs.specs.find((spec) => spec.moduleId === 'ship')
  assert(shipSpec?.collectionName === 'shipStates', 'ship model spec mismatch', shipSpec)
  assert(shipSpec?.dedicatedRegistered === true, 'ship dedicated repository should be registered', shipSpec)
  const myIslandSpec = modelSpecs.specs.find((spec) => spec.moduleId === 'my-island')
  assert(myIslandSpec?.collectionName === 'myIslandStates', 'my-island model spec mismatch', myIslandSpec)
  assert(myIslandSpec?.dedicatedRegistered === true, 'my-island dedicated repository should be registered', myIslandSpec)
  const codexSpec = modelSpecs.specs.find((spec) => spec.moduleId === 'codex')
  assert(codexSpec?.collectionName === 'codexStates', 'codex model spec mismatch', codexSpec)
  assert(codexSpec?.dedicatedRegistered === true, 'codex dedicated repository should be registered', codexSpec)
  const lodgeSpec = modelSpecs.specs.find((spec) => spec.moduleId === 'lodge')
  assert(lodgeSpec?.collectionName === 'lodgeStates', 'lodge model spec mismatch', lodgeSpec)
  assert(lodgeSpec?.dedicatedRegistered === true, 'lodge dedicated repository should be registered', lodgeSpec)

  const guest = await request('/api/auth/guest', { method: 'POST' })
  const uid = guest.uid
  assert(typeof uid === 'string' && uid.length > 0, 'guest uid missing', guest)

  const accountPatch = await request('/api/account/state', {
    method: 'PATCH',
    body: JSON.stringify({
      uid,
      patch: {
        nickname: 'smoke',
        onboardingComplete: false,
      },
    }),
  })
  assert(accountPatch.state?.nickname === 'smoke', 'account state patch failed', accountPatch)

  const account = await request(`/api/account/state?uid=${encodeURIComponent(uid)}`)
  assert(account.state?.onboardingComplete === false, 'account state read failed', account)

  const unlockIsland = await request('/api/modules/my-island/unlock-zone', {
    method: 'POST',
    body: JSON.stringify({ uid, zoneId: 'zone-garden' }),
  })
  assert(unlockIsland.ok === true, 'my-island unlock action failed', unlockIsland)
  assert(unlockIsland.state?.unlockedZones?.includes('zone-garden'), 'my-island unlock state mismatch', unlockIsland)

  const completeTutorial = await request('/api/modules/my-island/tutorial/complete', {
    method: 'POST',
    body: JSON.stringify({ uid }),
  })
  assert(completeTutorial.ok === true, 'my-island tutorial action failed', completeTutorial)
  assert(completeTutorial.account?.onboardingComplete === true, 'my-island tutorial account mismatch', completeTutorial)

  const characterId = '황금멍'
  const recruit = await request('/api/modules/my-aidong/recruit', {
    method: 'POST',
    body: JSON.stringify({ uid, characterId }),
  })
  assert(recruit.ok === true, 'my-aidong recruit action failed', recruit)
  assert(
    recruit.state?.recruitedAidongs?.includes(characterId),
    'my-aidong recruit state mismatch',
    recruit,
  )

  const lodgeAssign = await request('/api/modules/lodge/aidongs/assign-toggle', {
    method: 'POST',
    body: JSON.stringify({ uid, characterId }),
  })
  assert(lodgeAssign.state?.assignedAidongs?.includes(characterId), 'lodge assign action failed', lodgeAssign)

  const unlockDiary = await request('/api/modules/codex/unlock-diary', {
    method: 'POST',
    body: JSON.stringify({ uid, diaryId: 'hwanggumeong_day1' }),
  })
  assert(unlockDiary.state?.unlockedDiaries?.includes('hwanggumeong_day1'), 'codex diary action failed', unlockDiary)

  const unlockSlot = await request('/api/modules/codex/unlock-slot', {
    method: 'POST',
    body: JSON.stringify({ uid, entryId: characterId }),
  })
  assert(unlockSlot.state?.unlockedCodexEntries?.includes(characterId), 'codex slot action failed', unlockSlot)

  const fullCodex = await request('/api/modules/codex/fully-register', {
    method: 'POST',
    body: JSON.stringify({ uid, entryId: characterId }),
  })
  assert(fullCodex.state?.codexFullyRegistered?.includes(characterId), 'codex full action failed', fullCodex)

  const hostBefore = await request(`/api/host/state?uid=${encodeURIComponent(uid)}`)
  assert(hostBefore.state?.coins === 100, 'initial host coins should be 100', hostBefore)

  const zonePatch = await request('/api/modules/zone-garden/state', {
    method: 'PATCH',
    body: JSON.stringify({
      uid,
      patch: {
        localResources: { acorn: 20, flower: 3 },
        clearedCount: 1,
      },
    }),
  })
  assert(zonePatch.storage === 'dedicated', 'zone-garden should use dedicated storage', zonePatch)
  assert(zonePatch.state?.localResources?.acorn === 20, 'zone-garden acorn patch failed', zonePatch)

  const zoneCollect = await request('/api/modules/zone-garden/collect', {
    method: 'POST',
    body: JSON.stringify({ uid, resource: 'flower', amount: 2 }),
  })
  assert(zoneCollect.ok === true, 'zone-garden collect action failed', zoneCollect)
  assert(zoneCollect.state?.localResources?.flower === 5, 'zone-garden collect flower mismatch', zoneCollect)

  const zoneClear = await request('/api/modules/zone-garden/clear', {
    method: 'POST',
    body: JSON.stringify({ uid, clearId: 'garden-harvest' }),
  })
  assert(zoneClear.ok === true, 'zone-garden clear action failed', zoneClear)
  assert(zoneClear.state?.clearedCount === 2, 'zone-garden clear count mismatch', zoneClear)

  const apply = await request('/api/customs/apply', {
    method: 'POST',
    body: JSON.stringify({
      uid,
      ruleId: 'garden-acorn-to-coins',
      multiplier: 2,
      idempotencyKey: `smoke-${uid}`,
    }),
  })
  assert(apply.ok === true, 'customs apply should succeed', apply)
  assert(apply.debit?.amount === 10, 'customs debit amount mismatch', apply)
  assert(apply.credit?.amount === 2, 'customs credit amount mismatch', apply)

  const zoneAfter = await request(`/api/modules/zone-garden/state?uid=${encodeURIComponent(uid)}`)
  assert(zoneAfter.state?.localResources?.acorn === 10, 'zone-garden acorn after customs mismatch', zoneAfter)

  const hostAfter = await request(`/api/host/state?uid=${encodeURIComponent(uid)}`)
  assert(hostAfter.state?.coins === 117, 'host coins after customs mismatch', hostAfter)

  const replay = await request('/api/customs/apply', {
    method: 'POST',
    body: JSON.stringify({
      uid,
      ruleId: 'garden-acorn-to-coins',
      multiplier: 2,
      idempotencyKey: `smoke-${uid}`,
    }),
  })
  assert(replay.replayed === true, 'customs idempotency replay failed', replay)

  const logs = await request(`/api/customs/logs?uid=${encodeURIComponent(uid)}&limit=5`)
  assert(Array.isArray(logs.logs) && logs.logs.length >= 1, 'customs logs missing', logs)

  const hostMutate = await request('/api/host/resources/mutate', {
    method: 'POST',
    body: JSON.stringify({ uid, resource: 'coins', delta: 3 }),
  })
  assert(hostMutate.ok === true, 'host resource action failed', hostMutate)
  assert(hostMutate.state?.coins === 120, 'host resource action coins mismatch', hostMutate)

  const affinity = await request('/api/modules/my-aidong/affinity', {
    method: 'POST',
    body: JSON.stringify({ uid, characterId, delta: 12 }),
  })
  assert(affinity.state?.affinities?.[characterId]?.level === 1, 'my-aidong affinity action mismatch', affinity)

  const shipConfig = await request('/api/modules/ship/config')
  assert(shipConfig.defaultShipType?.shipTypeId === 'dinghy', 'ship config default type mismatch', shipConfig)

  const changeShip = await request('/api/modules/ship/type/change', {
    method: 'POST',
    body: JSON.stringify({ uid, shipTypeId: 'sloop' }),
  })
  assert(changeShip.state?.shipTypeId === 'sloop', 'ship type change action failed', changeShip)

  const cabinShip = await request('/api/modules/ship/cabins/assign', {
    method: 'POST',
    body: JSON.stringify({ uid, slotId: 'cabin1', characterId }),
  })
  assert(cabinShip.state?.cabinAssignments?.cabin1 === characterId, 'ship cabin assign action failed', cabinShip)

  const deckCharacterId = 'smoke-deck-aidong'
  await request('/api/modules/my-aidong/recruit', {
    method: 'POST',
    body: JSON.stringify({ uid, characterId: deckCharacterId }),
  })
  const deckShip = await request('/api/modules/ship/deck/assign', {
    method: 'POST',
    body: JSON.stringify({ uid, slotId: 'deck1', characterId: deckCharacterId }),
  })
  assert(deckShip.state?.deckAssignments?.deck1 === deckCharacterId, 'ship deck assign action failed', deckShip)

  const harborCharacterId = 'smoke-harbor-aidong'
  await request('/api/modules/my-aidong/recruit', {
    method: 'POST',
    body: JSON.stringify({ uid, characterId: harborCharacterId }),
  })

  const assignShip = await request('/api/modules/ship/harbor/assign-toggle', {
    method: 'POST',
    body: JSON.stringify({ uid, characterId: harborCharacterId }),
  })
  assert(assignShip.state?.harborAssignedChars?.includes(harborCharacterId), 'ship harbor assign action failed', assignShip)

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
  await request('/api/modules/ship/state', {
    method: 'PATCH',
    body: JSON.stringify({ uid, patch: { harborLastChargedAt: twoHoursAgo } }),
  })
  const chargeShip = await request('/api/modules/ship/harbor/charge', {
    method: 'POST',
    body: JSON.stringify({ uid, now: Date.now() }),
  })
  assert(chargeShip.charge >= 2, 'ship harbor charge action failed', chargeShip)
  assert(chargeShip.host?.diceCount >= 7, 'ship harbor charge dice mismatch', chargeShip)

  const startRoute = await request('/api/modules/route-neighbor/start', {
    method: 'POST',
    body: JSON.stringify({ uid, routeId: 'neighbor' }),
  })
  assert(startRoute.routeId === 'neighbor', 'route-neighbor start should echo routeId', startRoute)
  assert(startRoute.state?.currentRoute === undefined, 'route-neighbor start must not persist currentRoute', startRoute)

  const rollRoute = await request('/api/modules/route-neighbor/roll', {
    method: 'POST',
    body: JSON.stringify({ uid, steps: 4, routeId: 'neighbor', boardPosition: 4 }),
  })
  assert(rollRoute.steps === 4, 'route-neighbor roll steps mismatch', rollRoute)
  assert(rollRoute.boardPosition === 4, 'route-neighbor roll board position mismatch', rollRoute)
  assert(rollRoute.state?.boardPosition === undefined, 'route-neighbor roll must not persist boardPosition', rollRoute)
  assert(rollRoute.host?.diceCount === 7, 'route-neighbor roll dice mutation mismatch', rollRoute)

  const lodgeState = await request(`/api/modules/lodge/state?uid=${encodeURIComponent(uid)}`)
  assert(lodgeState.storage === 'dedicated', 'lodge should use dedicated storage', lodgeState)
  assert(lodgeState.state?.assignedAidongs?.includes(characterId), 'lodge assigned state mismatch', lodgeState)
  assert(lodgeState.state?.lodgeInventory && typeof lodgeState.state.lodgeInventory === 'object', 'lodge inventory should exist', lodgeState)

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    uid,
    mongo: health.mongo,
    migration: health.migration,
    hostCoins: hostMutate.state.coins,
    myIslandUnlockedZones: unlockIsland.state.unlockedZones,
    codexFullyRegistered: fullCodex.state.codexFullyRegistered,
    lodgeAssignedAidongs: lodgeState.state.assignedAidongs,
    zoneGardenClearedCount: zoneClear.state.clearedCount,
    zoneGardenAcorn: zoneAfter.state.localResources.acorn,
    customsTransactional: apply.transactional,
    routeBoardPosition: rollRoute.boardPosition,
    shipCharge: chargeShip.charge,
    logs: logs.logs.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})



