/**
 * packages/backend/scripts/smoke-module-actions.mjs
 * ------------------------------------------------------------
 * 역할: 실제 backend server에서 주요 module action API가 dedicated document까지 연결되는지 빠르게 확인한다.
 * 연결: frontend userStore action을 대체하는 /api/modules/{moduleId}/{action} 흐름의 최소 생존 검증이다.
 * 주의: 깊은 밸런스 검증이 아니라 필수 action 경로와 저장소 연결을 확인하는 smoke check다.
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

async function main() {
  const health = await request('/health')
  assert(health.status === 'ok', 'backend health check failed', health)
  assert(health.migration?.repositories?.backend === 'mongo', 'backend should use mongo repositories', health)

  const modelSpecs = await request('/api/modules/_model-specs')
  assert(Array.isArray(modelSpecs.specs), 'module model specs missing', modelSpecs)

  for (const moduleId of [
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
  ]) {
    const spec = findSpec(modelSpecs, moduleId)
    assert(spec?.dedicatedRegistered === true, `${moduleId} dedicated repository should be registered`, spec)
  }

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

  const characterId = '황금멍'
  const recruit = await post('/api/modules/my-aidong/recruit', { uid, characterId })
  assert(recruit.state?.recruitedAidongs?.includes(characterId), 'my-aidong recruit failed', recruit)

  const lodgeConfig = await request('/api/modules/lodge/config')
  assert(lodgeConfig.maxAssignedAidongs >= 1, 'lodge config missing', lodgeConfig)

  const lodgeAssign = await post('/api/modules/lodge/aidongs/assign-toggle', {
    uid,
    characterId,
  })
  assert(lodgeAssign.state?.assignedAidongs?.includes(characterId), 'lodge assign failed', lodgeAssign)

  const affinity = await post('/api/modules/my-aidong/affinity', {
    uid,
    characterId,
    delta: 12,
  })
  assert(affinity.state?.affinities?.[characterId]?.level === 1, 'my-aidong affinity failed', affinity)

  const outfitItem = await post('/api/host/inventory/mutate', {
    uid,
    itemId: 'smoke_outfit',
    delta: 1,
  })
  assert(outfitItem.state?.inventory?.smoke_outfit === 1, 'host Aidong item inventory seed failed', outfitItem)

  const outfit = await post('/api/modules/my-aidong/outfit', {
    uid,
    characterId,
    outfitId: 'smoke_outfit',
  })
  assert(outfit.state?.equippedOutfit?.[characterId] === 'smoke_outfit', 'my-aidong outfit failed', outfit)

  const equippedItem = await post('/api/modules/my-aidong/items/equip-toggle', {
    uid,
    characterId,
    itemId: 'smoke_outfit',
  })
  assert(equippedItem.state?.equippedItems?.[characterId]?.includes('smoke_outfit'), 'my-aidong equipped item failed', equippedItem)

  const codexItem = await post('/api/modules/my-aidong/codex-items/grant', {
    uid,
    characterId,
    itemId: 'smoke_codex_item',
    amount: 2,
    source: 'module-smoke',
  })
  assert(codexItem.state?.aidongCodexItems?.[characterId]?.smoke_codex_item === 2, 'my-aidong codex item grant failed', codexItem)

  const upgradeRequest = await post('/api/modules/my-aidong/upgrades/request', {
    uid,
    characterId,
    upgradeId: 'smoke_upgrade',
    idempotencyKey: `module-smoke-upgrade-${uid}`,
  })
  assert(upgradeRequest.state?.aidongUpgradeState?.[characterId]?.lastRequestedUpgradeId === 'smoke_upgrade', 'my-aidong upgrade request failed', upgradeRequest)

  const unlockZone = await post('/api/modules/my-island/unlock-zone', {
    uid,
    zoneId: 'zone-garden',
  })
  assert(unlockZone.state?.unlockedZones?.includes('zone-garden'), 'my-island unlock-zone failed', unlockZone)

  const tutorial = await post('/api/modules/my-island/tutorial/complete', { uid })
  assert(tutorial.account?.onboardingComplete === true, 'my-island tutorial completion failed', tutorial)

  const encounterCharacterId = 'module-smoke-encounter-aidong'
  const acceptEncounter = await post('/api/modules/route-neighbor/encounter/accept', {
    uid,
    characterId: encounterCharacterId,
    encounterId: `module-smoke-encounter-${uid}`,
  })
  assert(acceptEncounter.aidongState?.recruitedAidongs?.includes(encounterCharacterId), 'route-neighbor encounter should recruit aidong', acceptEncounter)
  assert(acceptEncounter.islandState?.dynamicAidongZones?.[`aidong-${encounterCharacterId}-zone`]?.characterId === encounterCharacterId, 'route-neighbor encounter should open dynamic zone', acceptEncounter)

  const unlockSlot = await post('/api/modules/codex/unlock-slot', {
    uid,
    entryId: characterId,
  })
  assert(unlockSlot.state?.unlockedCodexEntries?.includes(characterId), 'codex unlock-slot failed', unlockSlot)

  const unlockDiary = await post('/api/modules/codex/unlock-diary', {
    uid,
    diaryId: 'hwanggumeong_day1',
  })
  assert(unlockDiary.state?.unlockedDiaries?.includes('hwanggumeong_day1'), 'codex unlock-diary failed', unlockDiary)

  const fullCodex = await post('/api/modules/codex/fully-register', {
    uid,
    entryId: characterId,
  })
  assert(fullCodex.state?.codexFullyRegistered?.includes(characterId), 'codex fully-register failed', fullCodex)

  const collectGarden = await post('/api/modules/zone-garden/collect', {
    uid,
    resource: 'flower',
    amount: 2,
  })
  assert(collectGarden.state?.localResources?.flower === 2, 'zone-garden collect failed', collectGarden)

  const clearGarden = await post('/api/modules/zone-garden/clear', {
    uid,
    clearId: 'garden-harvest',
    idempotencyKey: `module-smoke-garden-${uid}`,
  })
  assert(clearGarden.state?.clearedCount === 1, 'zone-garden clear failed', clearGarden)
  assert(clearGarden.host?.coins === 115, 'zone-garden host coin reward failed', clearGarden)
  assert(clearGarden.host?.inventory?.basic_food === 2, 'zone-garden host inventory reward failed', clearGarden)

  const productionAssign = await post('/api/modules/zone-garden/production/assign', {
    uid,
    characterId,
    slotId: 'slot1',
  })
  assert(productionAssign.state?.progress?.production?.slot1?.characterId === characterId, 'zone production assign failed', productionAssign)

  const productionClaim = await post('/api/modules/zone-garden/production/claim', {
    uid,
    slotId: 'slot1',
    idempotencyKey: `module-smoke-production-${uid}`,
  })
  assert(Array.isArray(productionClaim.rewards) && productionClaim.rewards.length === 0, 'zone production shell should not grant rewards yet', productionClaim)
  assert(productionClaim.state?.progress?.lastProductionClaim?.slotId === 'slot1', 'zone production claim failed', productionClaim)

  const productionUnassign = await post('/api/modules/zone-garden/production/unassign', {
    uid,
    slotId: 'slot1',
  })
  assert(!productionUnassign.state?.progress?.production?.slot1, 'zone production unassign failed', productionUnassign)

  const routeCrewId = 'module-smoke-route-crew'
  await post('/api/modules/my-aidong/recruit', { uid, characterId: routeCrewId })
  const routeCrewShip = await post('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
    characterId: routeCrewId,
  })
  assert(routeCrewShip.state?.cabinAssignments?.cabin1 === routeCrewId, 'ship route crew assign failed', routeCrewShip)

  const startRoute = await post('/api/modules/route-neighbor/start', {
    uid,
    routeId: 'neighbor',
  })
  assert(startRoute.state?.currentRoute === 'neighbor', 'route-neighbor start failed', startRoute)
  assert(startRoute.state?.boardPosition === 0, 'route-neighbor start should reset board position', startRoute)

  const duplicateRoute = await postFailure('/api/modules/route-neighbor/start', {
    uid,
    routeId: 'neighbor',
  })
  assert(duplicateRoute.status === 409, 'route-neighbor duplicate start should be rejected', duplicateRoute)
  assert(duplicateRoute.body?.error === 'route_already_started', 'route-neighbor duplicate start error mismatch', duplicateRoute)

  const sailingShipChange = await postFailure('/api/modules/ship/type/change', {
    uid,
    shipTypeId: 'sloop',
  })
  assert(sailingShipChange.status === 409, 'ship type change should be blocked while sailing', sailingShipChange)
  assert(sailingShipChange.body?.error === 'ship_is_sailing', 'ship type change sailing error mismatch', sailingShipChange)

  const sailingShipAssign = await postFailure('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
  })
  assert(sailingShipAssign.status === 409, 'ship slot assign should be blocked while sailing', sailingShipAssign)
  assert(sailingShipAssign.body?.error === 'ship_is_sailing', 'ship slot assign sailing error mismatch', sailingShipAssign)

  const voyageNotOnShipId = 'module-smoke-voyage-not-on-ship'
  await post('/api/modules/my-aidong/recruit', { uid, characterId: voyageNotOnShipId })
  const voyageNotOnShipAssign = await postFailure('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
    characterId: voyageNotOnShipId,
    context: 'voyage',
  })
  assert(voyageNotOnShipAssign.body?.error === 'aidong_not_on_sailing_ship', 'ship voyage should reject off-ship aidong', voyageNotOnShipAssign)

  const voyageCabinToDeck = await post('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
    context: 'voyage',
  })
  assert(!voyageCabinToDeck.state?.cabinAssignments?.cabin1, 'ship voyage cabin clear should move aidong out of cabin', voyageCabinToDeck)
  assert(voyageCabinToDeck.state?.deckAssignments?.deck1 === routeCrewId, 'ship voyage cabin clear should move aidong to deck', voyageCabinToDeck)

  const voyageDeckToCabin = await post('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
    characterId: routeCrewId,
    context: 'voyage',
  })
  assert(voyageDeckToCabin.state?.cabinAssignments?.cabin1 === routeCrewId, 'ship voyage deck to cabin assign failed', voyageDeckToCabin)

  await post('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
    context: 'voyage',
  })
  const voyageDeckRemove = await postFailure('/api/modules/ship/deck/assign', {
    uid,
    slotId: 'deck1',
    context: 'voyage',
  })
  assert(voyageDeckRemove.body?.error === 'cannot_remove_sailing_aidong', 'ship voyage deck remove should be blocked', voyageDeckRemove)

  const rollRoute = await post('/api/modules/route-neighbor/roll', {
    uid,
    steps: 6,
  })
  assert(rollRoute.steps === 6, 'route-neighbor roll steps mismatch', rollRoute)
  assert(rollRoute.state?.boardPosition === 6, 'route-neighbor board position mismatch', rollRoute)
  assert(rollRoute.landing?.action === 'destination-resource-mission', 'route-neighbor landing action mismatch', rollRoute)
  assert(rollRoute.landing?.targetWorldScope === 'destination-island', 'route-neighbor landing scope mismatch', rollRoute)
  assert(rollRoute.landing?.landingModuleId === 'destination-shell-island', 'route-neighbor landing module mismatch', rollRoute)
  assert(rollRoute.landing?.screenPath === '/voyage/island/shell', 'route-neighbor landing screen mismatch', rollRoute)
  assert(rollRoute.host?.diceCount === 5, 'route-neighbor dice mutation mismatch', rollRoute)

  const currentLanding = await request(`/api/modules/route-neighbor/landing/current?uid=${encodeURIComponent(uid)}`)
  assert(currentLanding.landing?.landingId === 'neighbor:6', 'route-neighbor current landing mismatch', currentLanding)

  const clearLanding = await post('/api/modules/route-neighbor/landing/clear', {
    uid,
    landingId: 'neighbor:6',
  })
  assert(clearLanding.state?.localResources?.['deck-cargo'] === 1, 'route-neighbor landing clear reward failed', clearLanding)
  assert(
    clearLanding.moduleStates?.['destination-shell-island']?.localResources?.['shell-fragment'] === 1,
    'destination island landing reward failed',
    clearLanding,
  )

  const destinationConfig = await request('/api/modules/destination-shell-island/config')
  assert(destinationConfig.config?.initialNodeId === 'beach-center', 'destination island config mismatch', destinationConfig)

  const destinationMoveWest = await post('/api/modules/destination-shell-island/move', {
    uid,
    direction: 'west',
  })
  assert(destinationMoveWest.state?.currentNodeId === 'beach-west', 'destination island west move failed', destinationMoveWest)

  const destinationShellRock = await post('/api/modules/destination-shell-island/hotspots/interact', {
    uid,
    hotspotId: 'shell-rock',
  })
  assert(destinationShellRock.state?.localResources?.['shell-fragment'] === 3, 'destination island shell-rock reward failed', destinationShellRock)

  await post('/api/modules/destination-shell-island/move', { uid, direction: 'east' })
  const destinationMoveEast = await post('/api/modules/destination-shell-island/move', {
    uid,
    direction: 'east',
  })
  assert(destinationMoveEast.state?.currentNodeId === 'beach-east', 'destination island east move failed', destinationMoveEast)

  const destinationTidePool = await post('/api/modules/destination-shell-island/hotspots/interact', {
    uid,
    hotspotId: 'tide-pool',
  })
  assert(destinationTidePool.state?.localResources?.['shell-fragment'] === 4, 'destination island tide-pool reward failed', destinationTidePool)

  const destinationTidePoolAgain = await post('/api/modules/destination-shell-island/hotspots/interact', {
    uid,
    hotspotId: 'tide-pool',
  })
  assert(destinationTidePoolAgain.state?.localResources?.['shell-fragment'] === 5, 'destination island repeat hotspot reward failed', destinationTidePoolAgain)

  const destinationToShip = await post('/api/customs/apply', {
    uid,
    ruleId: 'shell-fragment-to-ship',
    multiplier: 1,
    idempotencyKey: `module-smoke-destination-ship-${uid}`,
  })
  assert(destinationToShip.ok === true, 'destination island to ship customs transfer failed', destinationToShip)

  await post('/api/modules/destination-shell-island/hotspots/interact', { uid, hotspotId: 'tide-pool' })
  await post('/api/modules/destination-shell-island/hotspots/interact', { uid, hotspotId: 'tide-pool' })
  await post('/api/modules/destination-shell-island/move', { uid, direction: 'north' })
  const destinationMission = await post('/api/modules/destination-shell-island/missions/clear', {
    uid,
    missionId: 'open-old-shrine',
  })
  assert(destinationMission.state?.localInventory?.['pearl-dust'] === 1, 'destination island mission reward failed', destinationMission)

  const endRoute = await post('/api/modules/route-neighbor/end', { uid })
  assert(endRoute.state?.boardPosition === 0, 'route-neighbor end board reset failed', endRoute)
  assert(!endRoute.state?.currentRoute, 'route-neighbor end route reset failed', endRoute)

  const clearedRouteCrewShip = await post('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
  })
  assert(!clearedRouteCrewShip.state?.cabinAssignments?.cabin1, 'ship route crew clear failed', clearedRouteCrewShip)

  const harborCharacterId = 'module-smoke-harbor-aidong'
  await post('/api/modules/my-aidong/recruit', { uid, characterId: harborCharacterId })
  const assignShip = await post('/api/modules/ship/harbor/assign-toggle', {
    uid,
    characterId: harborCharacterId,
  })
  assert(assignShip.state?.harborAssignedChars?.includes(harborCharacterId), 'ship harbor assign failed', assignShip)
  assert(assignShip.state?.shipTypeId === 'dinghy', 'ship default type mismatch', assignShip)

  const shipConfig = await request('/api/modules/ship/config')
  assert(shipConfig.defaultShipType?.shipTypeId === 'dinghy', 'ship config default type mismatch', shipConfig)
  assert(Array.isArray(shipConfig.shipTypes) && shipConfig.shipTypes.length >= 3, 'ship config type list missing', shipConfig)

  const changeShip = await post('/api/modules/ship/type/change', {
    uid,
    shipTypeId: 'sloop',
  })
  assert(changeShip.state?.shipTypeId === 'sloop', 'ship type change failed', changeShip)

  const cabinShip = await post('/api/modules/ship/cabins/assign', {
    uid,
    slotId: 'cabin1',
    characterId,
  })
  assert(cabinShip.state?.cabinAssignments?.cabin1 === characterId, 'ship cabin assign failed', cabinShip)

  const cabinFurniturePurchase = await post('/api/modules/ship/cabins/furniture/purchase', {
    uid,
    itemId: 'window',
  })
  assert(cabinFurniturePurchase.state?.cabinFurniture?.window === 1, 'ship cabin furniture purchase failed', cabinFurniturePurchase)

  const cabinFurnitureToggle = await post('/api/modules/ship/cabins/furniture/toggle', {
    uid,
    slotId: 'cabin1',
    itemId: 'window',
  })
  assert(cabinFurnitureToggle.state?.cabins?.cabin1?.furniture?.includes('window'), 'ship cabin furniture placement failed', cabinFurnitureToggle)

  const deckCharacterId = 'module-smoke-deck-aidong'
  await post('/api/modules/my-aidong/recruit', { uid, characterId: deckCharacterId })
  const deckShip = await post('/api/modules/ship/deck/assign', {
    uid,
    slotId: 'deck1',
    characterId: deckCharacterId,
  })
  assert(deckShip.state?.deckAssignments?.deck1 === deckCharacterId, 'ship deck assign failed', deckShip)

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
  await patch('/api/modules/ship/state', {
    uid,
    patch: { harborLastChargedAt: twoHoursAgo },
  })
  const chargeShip = await post('/api/modules/ship/harbor/charge', {
    uid,
    now: Date.now(),
  })
  assert(chargeShip.charge >= 2, 'ship harbor charge failed', chargeShip)
  assert(chargeShip.host?.diceCount >= 7, 'ship harbor dice reward failed', chargeShip)

  await patch('/api/modules/ship/state', {
    uid,
    patch: { shipInventory: { acorn: 2, sailcloth: 1, 'shell-fragment': 1 } },
  })
  const shipToLodge = await post('/api/customs/apply', {
    uid,
    ruleId: 'ship-acorn-to-lodge',
    multiplier: 2,
    idempotencyKey: `module-smoke-ship-lodge-${uid}`,
  })
  assert(shipToLodge.ok === true, 'ship to lodge customs transfer failed', shipToLodge)

  const shipToHost = await post('/api/customs/apply', {
    uid,
    ruleId: 'ship-sailcloth-to-host',
    multiplier: 1,
    idempotencyKey: `module-smoke-ship-host-${uid}`,
  })
  assert(shipToHost.ok === true, 'ship to host customs transfer failed', shipToHost)

  await patch('/api/modules/lodge/state', {
    uid,
    patch: { lodgeInventory: { acorn: 2, 'aidong-ribbon': 1 } },
  })
  const lodgeFurniturePurchase = await post('/api/modules/lodge/furniture/purchase', {
    uid,
    itemId: 'plant',
  })
  assert(lodgeFurniturePurchase.state?.furniture?.plant === 1, 'lodge furniture purchase failed', lodgeFurniturePurchase)

  const lodgeFurnitureToggle = await post('/api/modules/lodge/rooms/furniture/toggle', {
    uid,
    roomId: characterId,
    itemId: 'plant',
  })
  assert(lodgeFurnitureToggle.state?.rooms?.[characterId]?.furniture?.includes('plant'), 'lodge furniture placement failed', lodgeFurnitureToggle)

  const lodgeToHost = await post('/api/customs/apply', {
    uid,
    ruleId: 'lodge-aidong-ribbon-to-host',
    multiplier: 1,
    idempotencyKey: `module-smoke-lodge-host-${uid}`,
  })
  assert(lodgeToHost.ok === true, 'lodge to host customs transfer failed', lodgeToHost)

  const myAidongState = await request(`/api/modules/my-aidong/state?uid=${encodeURIComponent(uid)}`)
  const myIslandState = await request(`/api/modules/my-island/state?uid=${encodeURIComponent(uid)}`)
  const codexState = await request(`/api/modules/codex/state?uid=${encodeURIComponent(uid)}`)
  const lodgeState = await request(`/api/modules/lodge/state?uid=${encodeURIComponent(uid)}`)
  const routeState = await request(`/api/modules/route-neighbor/state?uid=${encodeURIComponent(uid)}`)
  const destinationState = await request(`/api/modules/destination-shell-island/state?uid=${encodeURIComponent(uid)}`)
  const shipState = await request(`/api/modules/ship/state?uid=${encodeURIComponent(uid)}`)
  const zoneState = await request(`/api/modules/zone-garden/state?uid=${encodeURIComponent(uid)}`)
  const hostState = await request(`/api/host/state?uid=${encodeURIComponent(uid)}`)

  assert(myAidongState.storage === 'dedicated', 'my-aidong state should be dedicated', myAidongState)
  assert(myAidongState.state?.equippedItems?.[characterId]?.includes('smoke_outfit'), 'my-aidong owned equippedItems should include global item', myAidongState)
  assert(myAidongState.state?.aidongCodexItems?.[characterId]?.smoke_codex_item === 2, 'my-aidong owned aidongCodexItems should persist', myAidongState)
  assert(myAidongState.state?.aidongUpgradeState?.[characterId]?.lastRequestedUpgradeId === 'smoke_upgrade', 'my-aidong owned aidongUpgradeState should persist', myAidongState)
  assert(myIslandState.storage === 'dedicated', 'my-island state should be dedicated', myIslandState)
  assert(myIslandState.state?.dynamicAidongZones?.[`aidong-${encounterCharacterId}-zone`]?.characterId === encounterCharacterId, 'my-island dynamic Aidong zone should persist', myIslandState)
  assert(codexState.storage === 'dedicated', 'codex state should be dedicated', codexState)
  assert(lodgeState.storage === 'dedicated', 'lodge state should be dedicated', lodgeState)
  assert(routeState.storage === 'dedicated', 'route-neighbor state should be dedicated', routeState)
  assert(shipState.storage === 'dedicated', 'ship state should be dedicated', shipState)
  assert(zoneState.storage === 'dedicated', 'zone-garden state should be dedicated', zoneState)
  assert(hostState.state?.coins === 50, 'host state should reflect zone reward and decor purchases', hostState)
  assert(hostState.state?.inventory?.sailcloth === 1, 'host state should receive ship global item via customs', hostState)
  assert(hostState.state?.inventory?.['aidong-ribbon'] === 1, 'host state should receive lodge Aidong item via customs', hostState)
  assert(lodgeState.state?.assignedAidongs?.includes(characterId), 'lodge owned assignedAidongs should include assigned character', lodgeState)
  assert(lodgeState.state?.lodgeInventory && typeof lodgeState.state.lodgeInventory === 'object', 'lodge owned lodgeInventory should exist', lodgeState)
  assert(lodgeState.state?.lodgeInventory?.acorn === 2, 'lodge should receive ship cargo via customs', lodgeState)
  assert(routeState.state?.boardPosition === 0, 'route-neighbor owned boardPosition should reset to 0', routeState)
  assert(routeState.state?.currentRoute == null, 'route-neighbor owned currentRoute should be cleared', routeState)
  assert(routeState.state?.localResources?.['deck-cargo'] === 1, 'route-neighbor owned landing reward should be stored', routeState)
  assert(routeState.state?.landings?.last?.status === 'cleared', 'route-neighbor owned landing status should be cleared', routeState)
  assert(routeState.state?.progress?.acceptedEncounters?.[`module-smoke-encounter-${uid}`]?.characterId === encounterCharacterId, 'route-neighbor accepted encounter should persist', routeState)
  assert(destinationState.storage === 'dedicated', 'destination island state should be dedicated', destinationState)
  assert(destinationState.state?.currentNodeId === 'old-shrine', 'destination island current node should persist', destinationState)
  assert(destinationState.state?.localInventory?.['pearl-dust'] === 1, 'destination island local inventory should persist', destinationState)
  assert(
    Array.isArray(shipState.state?.harborAssignedChars) && shipState.state.harborAssignedChars.includes(harborCharacterId),
    'ship owned harborAssignedChars should include assigned character',
    shipState,
  )
  assert(typeof shipState.state?.harborLastChargedAt === 'number', 'ship owned harborLastChargedAt should be stored', shipState)
  assert(shipState.state?.shipInventory && typeof shipState.state.shipInventory === 'object', 'ship owned shipInventory should exist', shipState)
  assert(shipState.state?.shipInventory?.acorn === 0, 'ship acorn should be unloaded by customs', shipState)
  assert(shipState.state?.shipInventory?.sailcloth === 0, 'ship global item should be moved by customs', shipState)
  assert(shipState.state?.shipInventory?.['shell-fragment'] === 1, 'ship should receive destination cargo via customs', shipState)
  assert(shipState.state?.shipTypeId === 'sloop', 'ship owned shipTypeId should be stored', shipState)
  assert(shipState.state?.cabinAssignments?.cabin1 === characterId, 'ship owned cabinAssignments should be stored', shipState)
  assert(shipState.state?.deckAssignments?.deck1 === deckCharacterId, 'ship owned deckAssignments should be stored', shipState)
  assert(shipState.state?.cabinFurniture?.window === 1, 'ship owned cabinFurniture should be stored', shipState)
  assert(shipState.state?.cabins?.cabin1?.furniture?.includes('window'), 'ship owned cabin furniture placement should be stored', shipState)
  assert(shipState.state?.cargo && typeof shipState.state.cargo === 'object', 'ship owned cargo should exist', shipState)
  assert(shipState.state?.cabins && typeof shipState.state.cabins === 'object', 'ship owned cabins should exist', shipState)

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    uid,
    mongo: health.mongo,
    checkedActions: {
      myAidong: ['recruit', 'affinity', 'outfit', 'items/equip-toggle'],
      myAidongShell: ['codex-items/grant', 'upgrades/request'],
      myIsland: ['unlock-zone', 'tutorial/complete', 'dynamic-zones/open via encounter'],
      codex: ['unlock-slot', 'unlock-diary', 'fully-register'],
      lodge: ['config', 'aidongs/assign-toggle'],
      destinationShellIsland: ['config', 'move', 'hotspots/interact', 'missions/clear'],
      routeNeighbor: ['encounter/accept', 'start', 'roll', 'landing/current', 'landing/clear', 'end'],
      ship: ['config', 'type/change', 'cabins/assign', 'deck/assign', 'cabins/furniture/purchase', 'cabins/furniture/toggle', 'harbor/assign-toggle', 'harbor/charge'],
      customs: ['shell-fragment-to-ship', 'ship-acorn-to-lodge', 'ship-sailcloth-to-host', 'lodge-aidong-ribbon-to-host'],
      zoneGarden: ['collect', 'clear', 'production/assign', 'production/claim', 'production/unassign'],
    },
    host: {
      coins: hostState.state.coins,
      diceCount: hostState.state.diceCount,
      basicFood: hostState.state.inventory?.basic_food,
      sailcloth: hostState.state.inventory?.sailcloth,
      aidongRibbon: hostState.state.inventory?.['aidong-ribbon'],
      smokeOutfit: hostState.state.inventory?.smoke_outfit,
    },
    lodgeAssignedCount: lodgeState.state.assignedAidongs.length,
    routeBoardPosition: routeState.state.boardPosition,
    routeCurrentRoute: routeState.state.currentRoute,
    routeDeckCargo: routeState.state.localResources?.['deck-cargo'],
    destinationNode: destinationState.state.currentNodeId,
    destinationPearlDust: destinationState.state.localInventory?.['pearl-dust'],
    shipCharge: chargeShip.charge,
    shipAssignedCount: shipState.state.harborAssignedChars.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  console.error('Run `pnpm dev:be:local-mongo` in another terminal before this smoke check.')
  process.exit(1)
})
