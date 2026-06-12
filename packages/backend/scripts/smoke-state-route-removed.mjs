/**
 * 📌 packages/backend/scripts/smoke-state-route-removed.mjs — backend state route 제거 확인
 * ────────────────────────────────────────────────────────────
 * 🎯 역할: backend가 통합 state route 없이 account, host, module, customs API로 동작하는지 확인한다.
 *
 * 🔗 userStore.ts와의 연결:
 *   - frontend의 packages/frontend/src/stores/userStore.ts는 auth, host resource,
 *     Aidong, island/codex, voyage 상태를 한 Zustand store에 담는다.
 *   - backend split 이후 이 파일은 그 통합 상태 중 일부를 users, hostStates,
 *     moduleStates, 전용 module state, customsLogs 중 어디에 저장할지
 *     결정하거나 실행한다.
 *
 * 🧭 작업 안내:
 *   - state route가 제거된 상태를 전제로 한다.
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
  return { response, body }
}

async function expectOk(path, options = {}) {
  const result = await request(path, options)
  if (!result.response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${result.response.status}\n${JSON.stringify(result.body, null, 2)}`)
  }
  return result.body
}

async function main() {
  const health = await expectOk('/health')
  assert(health.status === 'ok', 'backend health check failed', health)
  assert(health.migration?.legacyStateApiRemoved === true, 'state route removal should be reported in health', health)
  assert(health.migration?.repositories?.backend === 'mongo', 'backend should use mongo repositories', health)

  const modelSpec = await expectOk('/api/modules/route-neighbor/model-spec')
  assert(modelSpec.spec?.collectionName === 'routeNeighborStates', 'route-neighbor model spec mismatch', modelSpec)
  assert(modelSpec.spec?.dedicatedRegistered === true, 'route-neighbor dedicated repository should be registered', modelSpec)

  const myIslandSpec = await expectOk('/api/modules/my-island/model-spec')
  assert(myIslandSpec.spec?.collectionName === 'myIslandStates', 'my-island model spec mismatch', myIslandSpec)
  assert(myIslandSpec.spec?.dedicatedRegistered === true, 'my-island dedicated repository should be registered', myIslandSpec)

  const codexSpec = await expectOk('/api/modules/codex/model-spec')
  assert(codexSpec.spec?.collectionName === 'codexStates', 'codex model spec mismatch', codexSpec)
  assert(codexSpec.spec?.dedicatedRegistered === true, 'codex dedicated repository should be registered', codexSpec)

  const lodgeSpec = await expectOk('/api/modules/lodge/model-spec')
  assert(lodgeSpec.spec?.collectionName === 'lodgeStates', 'lodge model spec mismatch', lodgeSpec)
  assert(lodgeSpec.spec?.dedicatedRegistered === true, 'lodge dedicated repository should be registered', lodgeSpec)

  const guest = await expectOk('/api/auth/guest', { method: 'POST' })
  const uid = guest.uid
  assert(typeof uid === 'string' && uid.length > 0, 'guest uid missing', guest)

  const legacyGet = await request(`/api/state?uid=${encodeURIComponent(uid)}`, {
    headers: { 'x-uid': uid },
  })
  assert(legacyGet.response.status === 404, 'state route should be removed', {
    status: legacyGet.response.status,
    body: legacyGet.body,
  })
  assert(legacyGet.body?.error === 'not_found', 'legacy removed error mismatch', legacyGet.body)

  const account = await expectOk('/api/account/state', {
    method: 'PATCH',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ patch: { nickname: 'state-route', onboardingComplete: true } }),
  })
  assert(account.state?.nickname === 'state-route', 'account split API failed', account)

  const host = await expectOk('/api/host/resources/mutate', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ resource: 'coins', delta: 5 }),
  })
  assert(host.state?.coins === 105, 'host action API failed', host)

  const moduleState = await expectOk('/api/modules/zone-garden/state', {
    method: 'PATCH',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ patch: { localResources: { acorn: 15 } } }),
  })
  assert(moduleState.state?.localResources?.acorn === 15, 'module split API failed', moduleState)

  const zoneCollect = await expectOk('/api/modules/zone-garden/collect', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ resource: 'flower', amount: 2 }),
  })
  assert(zoneCollect.state?.localResources?.flower === 2, 'zone collect action failed', zoneCollect)

  const zoneClear = await expectOk('/api/modules/zone-garden/clear', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ clearId: 'garden-harvest' }),
  })
  assert(zoneClear.state?.clearedCount === 1, 'zone clear action failed', zoneClear)

  const myIslandUnlock = await expectOk('/api/modules/my-island/unlock-zone', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ zoneId: 'zone-garden' }),
  })
  assert(myIslandUnlock.state?.unlockedZones?.includes('zone-garden'), 'my-island action API failed', myIslandUnlock)

  const myIslandTutorial = await expectOk('/api/modules/my-island/tutorial/complete', {
    method: 'POST',
    headers: { 'x-uid': uid },
  })
  assert(myIslandTutorial.account?.onboardingComplete === true, 'my-island account action failed', myIslandTutorial)

  const characterId = '황금멍'
  const recruit = await expectOk('/api/modules/my-aidong/recruit', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ characterId }),
  })
  assert(recruit.state?.recruitedAidongs?.includes(characterId), 'module action API failed', recruit)

  const lodgeAssign = await expectOk('/api/modules/lodge/aidongs/assign-toggle', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ characterId }),
  })
  assert(lodgeAssign.state?.assignedAidongs?.includes(characterId), 'lodge action API failed', lodgeAssign)

  const codexDiary = await expectOk('/api/modules/codex/unlock-diary', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ diaryId: 'hwanggumeong_day1' }),
  })
  assert(codexDiary.state?.unlockedDiaries?.includes('hwanggumeong_day1'), 'codex diary action failed', codexDiary)

  const codexSlot = await expectOk('/api/modules/codex/unlock-slot', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ entryId: characterId }),
  })
  assert(codexSlot.state?.unlockedCodexEntries?.includes(characterId), 'codex slot action failed', codexSlot)

  const codexFull = await expectOk('/api/modules/codex/fully-register', {
    method: 'POST',
    headers: { 'x-uid': uid },
    body: JSON.stringify({ entryId: characterId }),
  })
  assert(codexFull.state?.codexFullyRegistered?.includes(characterId), 'codex full action failed', codexFull)

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    uid,
    legacyStateRouteStatus: legacyGet.response.status,
    mongo: health.mongo,
    migration: health.migration,
    hostCoins: host.state.coins,
    myIslandUnlockedZones: myIslandUnlock.state.unlockedZones,
    codexFullyRegistered: codexFull.state.codexFullyRegistered,
    lodgeAssignedAidongs: lodgeAssign.state.assignedAidongs,
    zoneGardenClearedCount: zoneClear.state.clearedCount,
    zoneGardenAcorn: moduleState.state.localResources.acorn,
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})



