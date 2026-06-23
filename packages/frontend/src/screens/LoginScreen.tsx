/**
 * packages/frontend/src/screens/LoginScreen.tsx
 * ------------------------------------------------------------
 * Role: first account entry screen with login/signup UI shells.
 * Note: FirebaseUI uses Firebase v9+ compat namespace API, while the rest of the app can keep modular helpers.
 */
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade } from '@/lib/storeFacades'
import { isFirebaseUiEnabled, startFirebaseUi } from '@/lib/firebaseUi'

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

const authProviders = [
  { label: 'Google', mark: 'G', tone: '#4285f4' },
  { label: 'Twitter', mark: 'X', tone: '#111111' },
] as const

function readFirebaseSessionProvider(providerId?: string): 'google' | 'twitter' | 'firebase' {
  if (providerId === 'google.com') return 'google'
  if (providerId === 'twitter.com') return 'twitter'
  return 'firebase'
}

export const LoginScreen = () => {
  const navigate = useNavigate()
  const firebaseUiContainerRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [firebaseUiShown, setFirebaseUiShown] = useState(false)

  useEffect(() => {
    const container = firebaseUiContainerRef.current
    if (!container || !isFirebaseUiEnabled()) return undefined
    setFirebaseUiShown(false)

    const ui = startFirebaseUi({
      container,
      providers: ['google', 'x'],
      onUiShown: () => setFirebaseUiShown(true),
      onSignInSuccess: async (authResult) => {
        const user = authResult.user
        if (!user) {
          setError('Firebase 로그인 결과를 확인하지 못했어요.')
          return false
        }

        setLoading(true)
        setError(null)
        try {
          const providerId = user.providerData?.[0]?.providerId
          const r = await api.authSession(user.uid, {
            provider: readFirebaseSessionProvider(providerId),
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          })
          accountStoreFacade.mergeAccountState({
            firebaseUid: r.uid,
            isGuest: false,
            gameStartedAt: accountStoreFacade.getAccountState().gameStartedAt ?? Date.now(),
            openingSeen: readOpeningSeen(r.user),
            onboardingComplete: readOnboardingComplete(r.user),
            nickname: user.displayName ?? user.email ?? '사용자',
          })
          trackEvent('login', { method: providerId ?? 'firebaseui' })
          navigate(readOpeningSeen(r.user) ? '/island' : readOnboardingComplete(r.user) ? '/island' : '/title')
        } catch (e) {
          console.warn('[auth] FirebaseUI login failed:', e)
          setError('Firebase 로그인 처리 중 문제가 발생했습니다. 서버 연결과 Firebase 설정을 확인해 주세요.')
        } finally {
          setLoading(false)
        }
        return false
      },
    })

    return () => {
      ui?.reset()
    }
  }, [navigate])

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
        gameStartedAt: accountStoreFacade.getAccountState().gameStartedAt ?? Date.now(),
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

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 18% 12%, rgba(242,127,117,0.16), transparent 30%), linear-gradient(180deg, #f6fbf7 0%, #edf7f2 48%, #fffefa 100%)',
      }}
    >
      <ScreenHeader category="계정" title="로그인" subtitle="계정 진입" />
      <Stack
        spacing={2.5}
        sx={{
          width: '100%',
          maxWidth: 360,
          p: 2.5,
          borderRadius: 2,
          bgcolor: 'rgba(255,254,250,0.92)',
          border: '1px solid rgba(62,155,143,0.18)',
          boxShadow: '0 18px 42px rgba(39,51,51,0.12)',
        }}
      >
        <Stack spacing={1.25} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.light',
              color: 'primary.dark',
              boxShadow: 'inset 0 0 0 1px rgba(62,155,143,0.18)',
            }}
          >
            <CircularProgress size={22} thickness={4.5} color="inherit" />
          </Box>
          <Typography variant="h1">아이동월드</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            숙소 불을 켜는 중...
          </Typography>
        </Stack>

        <ToggleButtonGroup
          fullWidth
          exclusive
          value={mode}
          onChange={(_, value: 'login' | 'signup' | null) => value && setMode(value)}
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.75,
              borderColor: 'rgba(62,155,143,0.22)',
              fontWeight: 800,
            },
            '& .Mui-selected': {
              bgcolor: 'primary.light',
              color: 'primary.dark',
            },
          }}
        >
          <ToggleButton value="login">로그인</ToggleButton>
          <ToggleButton value="signup">회원가입</ToggleButton>
        </ToggleButtonGroup>

        {error && <Alert severity="warning">{error}</Alert>}

        {isFirebaseUiEnabled() ? (
          <Stack spacing={1}>
            {!firebaseUiShown && (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  소셜 로그인 준비 중...
                </Typography>
              </Stack>
            )}
            <Box
              ref={firebaseUiContainerRef}
              id="firebaseui-auth-container"
              sx={{
                display: firebaseUiShown ? 'block' : 'none',
                '& .firebaseui-container': {
                  maxWidth: '100%',
                  boxShadow: 'none',
                  bgcolor: 'transparent',
                },
              }}
            />
          </Stack>
        ) : (
          <Stack spacing={1}>
            {authProviders.map((provider) => (
              <Button
                key={provider.label}
                variant="outlined"
                fullWidth
                disabled
                sx={{
                  height: 42,
                  justifyContent: 'flex-start',
                  px: 1.25,
                  bgcolor: 'rgba(255,255,255,0.74)',
                  '&.Mui-disabled': {
                    color: 'text.primary',
                    borderColor: 'rgba(39,51,51,0.1)',
                    opacity: 0.72,
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 24,
                    height: 24,
                    mr: 1.25,
                    borderRadius: '50%',
                    display: 'inline-grid',
                    placeItems: 'center',
                    bgcolor: provider.tone,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  {provider.mark}
                </Box>
                {provider.label}로 {mode === 'login' ? '로그인' : '회원가입'}
                <Box component="span" sx={{ ml: 'auto', fontSize: 11, color: 'text.secondary' }}>
                  Firebase 설정 필요
                </Box>
              </Button>
            ))}
          </Stack>
        )}

        <Divider>또는</Divider>

        <Button variant="contained" size="large" onClick={handleGuest} disabled={loading} fullWidth>
          {loading ? '게스트 숙소 준비 중...' : '게스트 로그인'}
        </Button>
      </Stack>
    </Box>
  )
}
