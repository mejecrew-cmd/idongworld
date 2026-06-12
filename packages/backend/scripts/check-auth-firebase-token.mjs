/**
 * packages/backend/scripts/check-auth-firebase-token.mjs
 * ------------------------------------------------------------
 * 역할: 실제 Firebase ID token이 backend Bearer 인증 경로를 통과하는지 확인한다.
 * 연결: frontend apiFetch()가 붙이는 Authorization: Bearer <idToken>을 backend auth middleware가 검증하는 경로를 점검한다.
 * 주의: 실 Firebase secret과 test ID token이 있는 환경에서만 실행되며, 없으면 skipped로 끝난다.
 */
const baseUrl = process.env.BACKEND_URL ?? 'http://localhost:4000'
const idToken = process.env.AUTH_TEST_ID_TOKEN

function skip(reason) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason }, null, 2))
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  const body = await response.json().catch(() => undefined)
  return { response, body }
}

async function main() {
  if (!idToken) {
    skip('AUTH_TEST_ID_TOKEN_missing')
    return
  }

  const health = await request('/health')
  if (!health.response.ok) {
    throw new Error(`/health failed: ${health.response.status}`)
  }
  if (health.body?.auth?.firebaseAdminEnabled !== true) {
    throw new Error(`Firebase Admin is not enabled on backend:\n${JSON.stringify(health.body?.auth, null, 2)}`)
  }

  const me = await request('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  if (me.response.status === 401) {
    throw new Error(`Bearer token was not accepted:\n${JSON.stringify(me.body, null, 2)}`)
  }
  if (me.response.status !== 200 && me.response.status !== 404) {
    throw new Error(`/api/auth/me returned unexpected status ${me.response.status}:\n${JSON.stringify(me.body, null, 2)}`)
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    authStatus: health.body.auth,
    authMeStatus: me.response.status,
    note: me.response.status === 404
      ? 'token verified, but user document does not exist yet'
      : 'token verified and user document exists',
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
