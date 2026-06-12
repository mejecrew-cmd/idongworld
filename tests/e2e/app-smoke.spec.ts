import { expect, test, type Page } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:4000'

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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
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

  for (const path of [
    '/island',
    '/island/lodge',
    '/island/harbor',
    '/island/full-map',
    '/voyage/board?route=neighbor',
    '/voyage/island/shell',
    '/dev/catalog',
  ]) {
    await expectNoLegacyStateCalls(page, async () => {
      await page.goto(path)
      await expect(page.locator('#root')).toBeVisible()
      await expect(page.locator('body')).not.toContainText('Application error')
    })
  }

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/harbor')
    await expect(page.getByRole('button', { name: /배 세관/ })).toHaveCount(0)
  })

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/lodge')
    await expect(page.getByRole('button', { name: /숙소 세관/ })).toHaveCount(0)
  })

  await expectNoLegacyStateCalls(page, async () => {
    await page.goto('/island/full-map')
    await page.getByText('3. 성장의 정원').click()
    await page.getByRole('button', { name: /미니게임 시작/ }).click()
    await page.getByRole('button', { name: /닫기/ }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
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

  expect(pageErrors, 'page runtime errors').toEqual([])
})
