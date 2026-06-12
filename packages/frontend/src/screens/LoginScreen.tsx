/**
 * packages/frontend/src/screens/LoginScreen.tsx
 * ------------------------------------------------------------
 * 역할: 게스트 로그인과 소셜 로그인 진입점을 제공하는 첫 화면이다.
 * 연결: guest는 backend `/api/auth/guest`, social은 Firebase Auth와 `/api/auth/session` skeleton을 사용한다.
 * 주의: Google/Twitter 버튼은 기본적으로 준비중 상태이며, `VITE_SOCIAL_LOGIN_ENABLED=true`일 때만 실제 popup을 연다.
 */
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Stack, Tooltip, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade } from '@/lib/storeFacades'
import {
  firebaseSignInSocial,
  isFirebaseEnabled,
  type SocialAuthProvider,
} from '@/lib/firebase'

const SOCIAL_LOGIN_ENABLED = import.meta.env.VITE_SOCIAL_LOGIN_ENABLED === 'true'

function providerLabel(provider: SocialAuthProvider): string {
  return provider === 'google' ? 'Google' : 'Twitter'
}

function readOnboardingComplete(user: unknown): boolean {
  return Boolean(
    user &&
      typeof user === 'object' &&
      'onboardingComplete' in user &&
      (user as { onboardingComplete?: unknown }).onboardingComplete === true,
  )
}

function readOpeningSeen(user: unknown): boolean {
  return Boolean(
    user &&
      typeof user === 'object' &&
      'openingSeen' in user &&
      (user as { openingSeen?: unknown }).openingSeen === true,
  )
}

export const LoginScreen = () => {
  const navigate = useNavigate()
  const firebaseUid = accountStoreFacade.useFirebaseUid()
  const openingSeen = accountStoreFacade.useOpeningSeen()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!firebaseUid) return
    navigate(onboardingComplete || openingSeen ? '/island' : '/title', { replace: true })
  }, [firebaseUid, navigate, onboardingComplete, openingSeen])

  const handleGuest = async () => {
    setLoading(true)
    setError(null)
    let nextPath = '/title'
    try {
      const r = await api.authGuest()
      nextPath = readOnboardingComplete(r.user) ? '/island' : '/title'
      accountStoreFacade.mergeAccountState({
        firebaseUid: r.uid,
        isGuest: true,
        openingSeen: readOpeningSeen(r.user),
        onboardingComplete: readOnboardingComplete(r.user),
        nickname: '게스트',
      })
    } catch (e) {
      console.warn('[auth] backend down, local guest:', e)
      accountStoreFacade.loginGuest()
      setError('서버 연결 실패로 로컬 게스트 모드로 시작합니다.')
    }
    trackEvent('login', { method: 'guest' })
    navigate(readOpeningSeen(accountStoreFacade.getAccountState()) ? '/island' : nextPath)
    setLoading(false)
  }

  const handleSocial = (provider: SocialAuthProvider) => async () => {
    if (!SOCIAL_LOGIN_ENABLED || !isFirebaseEnabled) {
      setError(`${providerLabel(provider)} 로그인은 준비 중입니다. 지금은 게스트로 시작해 주세요.`)
      trackEvent('login_attempt_disabled', { provider })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const user = await firebaseSignInSocial(provider)
      if (!user) throw new Error('firebase_disabled')
      const result = await api.authSession(user.uid, {
        provider,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      })
      accountStoreFacade.mergeAccountState({
        firebaseUid: result.uid,
        isGuest: false,
        openingSeen: readOpeningSeen(result.user),
        onboardingComplete: readOnboardingComplete(result.user),
        nickname: user.displayName ?? user.email ?? providerLabel(provider),
      })
      trackEvent('login', { method: provider })
      navigate(readOnboardingComplete(result.user) || readOpeningSeen(result.user) ? '/island' : '/title')
    } catch (e) {
      console.warn(`[auth] ${provider} login failed`, e)
      setError(`${providerLabel(provider)} 로그인 준비 중 문제가 발생했습니다. 게스트로 시작해 주세요.`)
      trackEvent('login_error', { provider })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 3,
        bgcolor: 'background.default',
      }}
    >
      <ScreenHeader category="인증" title="로그인" subtitle="게스트 또는 소셜 로그인" />
      <Typography variant="h1">아이동월드</Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        00 로그인
      </Typography>
      {error && <Alert severity="warning" sx={{ maxWidth: 320 }}>{error}</Alert>}
      <Stack spacing={1.5} sx={{ minWidth: 280 }}>
        <Button variant="contained" size="large" onClick={handleGuest} disabled={loading}>
          {loading ? '...' : '게스트로 시작'}
        </Button>

        <Tooltip title="준비 중입니다. 지금은 게스트로 시작해 주세요." arrow>
          <span>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleSocial('google')}
              disabled={loading}
              sx={{ justifyContent: 'flex-start', py: 1 }}
            >
              <span style={{ marginRight: 8, fontWeight: 700 }}>G</span> Google 로그인
              <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>준비중</span>
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="준비 중입니다. 지금은 게스트로 시작해 주세요." arrow>
          <span>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleSocial('twitter')}
              disabled={loading}
              sx={{ justifyContent: 'flex-start', py: 1 }}
            >
              <span style={{ marginRight: 8, fontWeight: 700 }}>X</span> Twitter 로그인
              <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>준비중</span>
            </Button>
          </span>
        </Tooltip>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, maxWidth: 320, textAlign: 'center', lineHeight: 1.6 }}>
        현재 기본 진입은 게스트 모드입니다.
        <br />
        Google/Twitter 로그인은 설정 완료 후 활성화됩니다.
      </Typography>
    </Box>
  )
}
