import { expect, test, type Page } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

type SmokeRoute = {
  path: string
  label: string
  expectedUrl?: RegExp
}

const CORE_ROUTE_SMOKE: SmokeRoute[] = [
  { label: 'island hub', path: '/island' },
  { label: 'island full map', path: '/island/full-map' },
  { label: 'harbor anchor', path: '/island/harbor' },
  { label: 'lodge anchor', path: '/island/lodge' },
  { label: 'voyage board guard', path: '/voyage/board?route=neighbor' },
  { label: 'destination shell compat island', path: '/voyage/island/shell' },
  { label: 'aidong island root', path: '/voyage/island/first-aidong-island' },
  { label: 'aidong island land', path: '/voyage/island/first-aidong-island/land' },
  { label: 'aidong island sub', path: '/voyage/island/first-aidong-island/sub' },
  { label: 'myroom info', path: '/island/lodge/myroom/info' },
  { label: 'myroom aidong list', path: '/island/lodge/myroom/aidong' },
  { label: 'myroom aidong sheet', path: '/island/lodge/myroom/aidong/황금멍' },
  { label: 'myroom codex', path: '/island/lodge/myroom/codex' },
  { label: 'myroom collection', path: '/island/lodge/myroom/collection' },
  { label: 'myroom ledger', path: '/island/lodge/myroom/ledger' },
  { label: 'stage hub', path: '/stage' },
  { label: 'stage debut show', path: '/stage/debut/황금멍' },
  { label: 'legacy codex', path: '/codex' },
  { label: 'developer catalog', path: '/dev/catalog' },
]

const AREA_ROUTE_SMOKE: SmokeRoute[] = Array.from({ length: 15 }, (_, index) => {
  const areaNo = String(index + 1).padStart(2, '0')
  return {
    label: `area ${areaNo}`,
    path: `/island/area/${areaNo}`,
  }
})

const REDIRECT_ROUTE_SMOKE: SmokeRoute[] = [
  {
    label: 'myroom home redirects to info',
    path: '/island/lodge/myroom',
    expectedUrl: /\/island\/lodge\/myroom\/info$/,
  },
  {
    label: 'legacy aidong island landing redirects to land',
    path: '/voyage/island/first-aidong-island/landing',
    expectedUrl: /\/voyage\/island\/first-aidong-island\/land$/,
  },
  {
    label: 'legacy debut redirects to stage debut',
    path: '/debut/황금멍',
    expectedUrl: /\/stage\/debut\/%ED%99%A9%EA%B8%88%EB%A9%8D$/,
  },
  {
    label: 'area harbor redirects to harbor',
    path: '/island/area/02',
    expectedUrl: /\/island\/harbor$/,
  },
  {
    label: 'area lodge redirects to lodge',
    path: '/island/area/13',
    expectedUrl: /\/island\/lodge$/,
  },
]

async function expectNoLegacyStateCalls(page: Page, action: () => Promise<void>) {
  const legacyStateCalls: string[] = []
  const onRequest = (request: { url: () => string }) => {
    const url = request.url()
    if (url.includes('/api/state')) legacyStateCalls.push(url)
  }

  page.on('request', onRequest)
  await action()
  page.off('request', onRequest)

  expect(legacyStateCalls, 'legacy /api/state calls must not return').toEqual([])
}

async function expectRouteShell(page: Page, route: SmokeRoute) {
  await page.goto(route.path)
  if (route.expectedUrl) {
    await expect(page, `${route.label} should redirect to expected URL`).toHaveURL(route.expectedUrl)
  }
  await expect(page.locator('#root'), `${route.label} should mount React root`).toBeVisible()
  await expect(page.locator('body'), `${route.label} should not show application error`).not.toContainText('Application error')
  await expect(page.locator('body'), `${route.label} should not be blank`).not.toHaveText(/^\s*$/)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const marker = 'idongworld-e2e-storage-cleared'
    if (window.localStorage.getItem(marker)) return
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.localStorage.setItem(marker, '1')
  })
})

test('backend and frontend smoke path works without legacy state API calls', async ({ page, request }) => {
  const health = await request.get(`${API_URL}/health`)
  expect(health.ok()).toBe(true)
  const healthJson = await health.json()
  expect(healthJson.mongo?.connected).toBe(true)
  expect(healthJson.migration?.legacyStateApiRemoved).toBe(true)
  expect(healthJson.migration?.repositories?.backend).toBe('mongo')

  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: /게스트로 시작|\.\.\./ })).toBeVisible()

    await page.getByRole('button', { name: /게스트로 시작/ }).click()
    await expect(page).toHaveURL(/\/title$/)
    await expect(page.getByRole('button', { name: /게임 시작|계속하기/ })).toBeVisible()
  })

  for (const route of CORE_ROUTE_SMOKE) {
    await expectNoLegacyStateCalls(page, async () => {
      await expectRouteShell(page, route)
    })
  }

  for (const route of AREA_ROUTE_SMOKE) {
    await expectNoLegacyStateCalls(page, async () => {
      await expectRouteShell(page, route)
    })
  }

  for (const route of REDIRECT_ROUTE_SMOKE) {
    await expectNoLegacyStateCalls(page, async () => {
      await expectRouteShell(page, route)
    })
  }

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/harbor')
    await expect(page.getByRole('button', { name: /배 세관/ })).toHaveCount(0)
  })

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/lodge')
    await expect(page.getByRole('button', { name: /숙소 세관/ })).toHaveCount(0)
    await page.getByRole('button', { name: /마이룸/ }).click()
    await page.getByRole('button', { name: /마이룸 열기/ }).click()
    await expect(page).toHaveURL(/\/island\/lodge\/myroom\/info$/)
  })

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/lodge/myroom/collection')
    await page.evaluate(() => {
      window.sessionStorage.setItem('idongworld-photocard-placeholders', JSON.stringify([
        {
          resultId: 'smoke-debut-result',
          characterId: '황금멍',
          score: 18,
          grade: 'A',
          generatedAt: Date.now(),
          signature: { name: '황금 마이크', emoji: '마', zone: 'sunny_meadow' },
          photocardCandidate: { candidateId: 'photocard-smoke-debut-result', status: 'placeholder' },
        },
      ]))
    })
    await page.goto('/island/lodge/myroom/collection')
    await expect(page.getByText(/포토카드 placeholder/)).toBeVisible()
    await expect(page.getByText(/등급 A · 점수 18/)).toBeVisible()
  })

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/full-map')
    await page.getByText(/AREA-14\. 성장의 정원|성장의 정원/).first().click()
    await page.getByRole('button', { name: /미니게임 시작/ }).click()
    await page.getByRole('button', { name: /닫기/ }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/harbor')
    await expect(page.locator('body')).not.toContainText('현재 배가 항해 중입니다')
    await expect(page.locator('body')).not.toContainText('출항 중')
  })

  await expectNoLegacyStateCalls(page, async () => {
    await page.evaluate(() => {
      const raw = window.localStorage.getItem('idongworld-user')
      if (!raw) return
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown> }
      parsed.state = {
        ...parsed.state,
        currentRoute: 'neighbor',
        boardPosition: 7,
      }
      window.localStorage.setItem('idongworld-user', JSON.stringify(parsed))
    })
    await page.goto('/voyage/board?route=neighbor')
    await expect(page).toHaveURL(/\/island\/harbor$/)
    await page.getByTestId('bottom-nav-voyage').click()
    await expect(page).toHaveURL(/\/island\/harbor$/)
  })

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/harbor')
    await page.evaluate(() => {
      window.sessionStorage.setItem('idongworld-voyage-session', JSON.stringify({
        state: {
          activeSession: {
            sessionId: 'smoke-session',
            routeId: 'neighbor',
            boardPosition: 3,
            lastRoll: 3,
            startedAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        version: 0,
      }))
    })
    await page.goto('/voyage/board?route=neighbor')
    await expect(page).toHaveURL(/\/voyage\/board\?route=neighbor$/)

    const storageSnapshot = await page.evaluate(() => {
      const userRaw = window.localStorage.getItem('idongworld-user')
      const sessionRaw = window.sessionStorage.getItem('idongworld-voyage-session')
      const userState = userRaw ? JSON.parse(userRaw).state ?? {} : {}
      const voyageState = sessionRaw ? JSON.parse(sessionRaw).state ?? {} : {}
      return {
        userHasActiveSession: Object.prototype.hasOwnProperty.call(userState, 'activeSession'),
        userMentionsSmokeSession: JSON.stringify(userState).includes('smoke-session'),
        voyageRouteId: voyageState.activeSession?.routeId,
        voyageBoardPosition: voyageState.activeSession?.boardPosition,
      }
    })

    expect(storageSnapshot).toEqual({
      userHasActiveSession: false,
      userMentionsSmokeSession: false,
      voyageRouteId: 'neighbor',
      voyageBoardPosition: 3,
    })
  })

  expect(pageErrors, 'page runtime errors').toEqual([])
})