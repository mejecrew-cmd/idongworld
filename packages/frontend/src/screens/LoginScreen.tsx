/**
 * packages/frontend/src/screens/LoginScreen.tsx
 * ------------------------------------------------------------
 * Role: account entry screen for social login plus test ID/password credentials.
 * Note: ID/password credentials are backed by the backend password auth API.
 */
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { api, setPasswordSessionToken, type PasswordAuthResponse } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade } from '@/lib/storeFacades'
import { isFirebaseUiEnabled, startFirebaseUi } from '@/lib/firebaseUi'
import { hydrateSplitState } from '@/lib/syncStore'

const ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/

interface CredentialDraft {
  id: string
  password: string
}

interface SignupDraft extends CredentialDraft {
  passwordConfirm: string
}

const authProviders = [
  { label: 'Google', mark: 'G', tone: '#4285f4' },
  { label: 'Twitter', mark: 'X', tone: '#111111' },
] as const

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

function readFirebaseSessionProvider(providerId?: string): 'google' | 'twitter' | 'firebase' {
  if (providerId === 'google.com') return 'google'
  if (providerId === 'twitter.com') return 'twitter'
  return 'firebase'
}

function hasCompletedIntro(
  account: { openingSeen?: boolean; onboardingComplete?: boolean },
  user?: unknown,
): boolean {
  return Boolean(
    account.openingSeen ||
      account.onboardingComplete ||
      readOpeningSeen(user) ||
      readOnboardingComplete(user),
  )
}

function normalizeId(value: string): string {
  return value.trim()
}

function getIdError(id: string): string | null {
  const normalized = normalizeId(id)
  if (!normalized) return 'ID를 입력해 주세요.'
  if (!ID_PATTERN.test(normalized)) return 'ID는 영문, 숫자, 밑줄 4~20자로 입력해 주세요.'
  return null
}

function getPasswordError(password: string): string | null {
  if (!password) return '비밀번호를 입력해 주세요.'
  if (password.length < 6) return '비밀번호는 6자 이상 입력해 주세요.'
  return null
}

function getSignupError(draft: SignupDraft): string | null {
  return (
    getIdError(draft.id) ??
    getPasswordError(draft.password) ??
    (draft.password !== draft.passwordConfirm ? '비밀번호 확인이 일치하지 않습니다.' : null)
  )
}

export const LoginScreen = () => {
  const navigate = useNavigate()
  const firebaseUiContainerRef = useRef<HTMLDivElement | null>(null)
  const [loginDraft, setLoginDraft] = useState<CredentialDraft>({ id: '', password: '' })
  const [signupDraft, setSignupDraft] = useState<SignupDraft>({
    id: '',
    password: '',
    passwordConfirm: '',
  })
  const [signupOpen, setSignupOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [firebaseUiShown, setFirebaseUiShown] = useState(false)

  const firebaseEnabled = isFirebaseUiEnabled()

  const loginIdError = useMemo(() => {
    if (!loginDraft.id) return null
    return getIdError(loginDraft.id)
  }, [loginDraft.id])

  const loginPasswordError = useMemo(() => {
    if (!loginDraft.password) return null
    return getPasswordError(loginDraft.password)
  }, [loginDraft.password])

  useEffect(() => {
    const container = firebaseUiContainerRef.current
    if (!container || !firebaseEnabled) return undefined
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
          await hydrateSplitState(r.uid)
          const latestAccount = accountStoreFacade.getAccountState()
          const shouldEnterIsland = r.isNew === false || hasCompletedIntro(latestAccount, r.user)
          accountStoreFacade.mergeAccountState({
            firebaseUid: r.uid,
            isGuest: false,
            gameStartedAt: latestAccount.gameStartedAt ?? Date.now(),
            openingSeen: latestAccount.openingSeen || readOpeningSeen(r.user),
            onboardingComplete: latestAccount.onboardingComplete || readOnboardingComplete(r.user),
            nickname: user.displayName ?? user.email ?? '사용자',
          })
          trackEvent('login', { method: providerId ?? 'firebaseui' })
          navigate(shouldEnterIsland ? '/island' : '/title')
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
  }, [firebaseEnabled, navigate])

  const completePasswordSession = async (
    id: string,
    response: PasswordAuthResponse,
    eventName: 'login' | 'sign_up',
  ) => {
    setLoading(true)
    setError(null)
    setPasswordSessionToken(response.token)
    await hydrateSplitState(response.uid).catch((e) => {
      console.warn('[auth] failed to hydrate password account session:', e)
    })
    const latestAccount = accountStoreFacade.getAccountState()
    const shouldEnterIsland = response.isNew === false || hasCompletedIntro(latestAccount, response.user)
    accountStoreFacade.mergeAccountState({
      firebaseUid: response.uid,
      isGuest: false,
      gameStartedAt: latestAccount.gameStartedAt ?? Date.now(),
      openingSeen: latestAccount.openingSeen || readOpeningSeen(response.user),
      onboardingComplete: latestAccount.onboardingComplete || readOnboardingComplete(response.user),
      nickname: id,
    })
    trackEvent(eventName, { method: 'test_credentials' })
    navigate(shouldEnterIsland ? '/island' : '/title')
    setLoading(false)
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const id = normalizeId(loginDraft.id)
    const validationError = getIdError(id) ?? getPasswordError(loginDraft.password)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await api.authPasswordLogin({ loginId: id, password: loginDraft.password })
      await completePasswordSession(id, response, 'login')
    } catch (e) {
      console.warn('[auth] password login failed:', e)
      setError('ID 또는 비밀번호가 일치하지 않습니다.')
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    const id = normalizeId(signupDraft.id)
    const validationError = getSignupError({ ...signupDraft, id })
    if (validationError) {
      setSignupError(validationError)
      return
    }

    setLoading(true)
    setSignupError(null)
    try {
      const response = await api.authPasswordSignup({
        loginId: id,
        password: signupDraft.password,
        passwordConfirm: signupDraft.passwordConfirm,
      })
      setSignupOpen(false)
      setSignupDraft({ id: '', password: '', passwordConfirm: '' })
      await completePasswordSession(id, response, 'sign_up')
    } catch (e) {
      console.warn('[auth] password signup failed:', e)
      setSignupError('이미 사용 중인 ID이거나 가입 정보를 확인할 수 없습니다.')
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
        px: 2,
        py: 4,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #f6fbf7 0%, #edf7f2 52%, #fffefa 100%)',
      }}
    >
      <ScreenHeader category="계정" title="로그인" subtitle="계정 진입" />
      <Stack
        component="form"
        spacing={2.25}
        onSubmit={handleLogin}
        autoComplete="off"
        sx={{
          width: '100%',
          maxWidth: 380,
          p: 2.5,
          borderRadius: 2,
          bgcolor: 'rgba(255,254,250,0.94)',
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
            ID, 비밀번호 또는 소셜 계정으로 섬에 들어가세요.
          </Typography>
        </Stack>

        {error && <Alert severity="warning">{error}</Alert>}

        <Stack spacing={1.25}>
          <TextField
            label="ID"
            name="idong-login-id"
            value={loginDraft.id}
            onChange={(event) => {
              setLoginDraft((current) => ({ ...current, id: event.target.value }))
              setError(null)
            }}
            error={Boolean(loginIdError)}
            helperText={loginIdError ?? '영문, 숫자, 밑줄 4~20자'}
            autoComplete="off"
            fullWidth
            size="small"
          />
          <TextField
            label="비밀번호"
            name="idong-login-password"
            type="password"
            value={loginDraft.password}
            onChange={(event) => {
              setLoginDraft((current) => ({ ...current, password: event.target.value }))
              setError(null)
            }}
            error={Boolean(loginPasswordError)}
            helperText={loginPasswordError ?? '6자 이상'}
            autoComplete="off"
            fullWidth
            size="small"
          />
        </Stack>

        <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
          {loading ? '계정 확인 중...' : '로그인'}
        </Button>

        <Button
          type="button"
          variant="outlined"
          size="large"
          disabled={loading}
          onClick={() => {
            setSignupOpen(true)
            setSignupError(null)
            setError(null)
          }}
          fullWidth
        >
          회원가입
        </Button>

        <Divider>또는 소셜 로그인</Divider>

        {firebaseEnabled ? (
          <Stack spacing={1}>
            {!firebaseUiShown && (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  소셜 로그인을 준비하고 있어요.
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
                {provider.label}로 로그인
                <Box component="span" sx={{ ml: 'auto', fontSize: 11, color: 'text.secondary' }}>
                  Firebase 설정 필요
                </Box>
              </Button>
            ))}
          </Stack>
        )}
      </Stack>

      <Dialog
        open={signupOpen}
        onClose={() => {
          if (!loading) setSignupOpen(false)
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 900 }}>회원가입</DialogTitle>
        <DialogContent>
          <Stack spacing={1.75} sx={{ pt: 1 }} component="form" autoComplete="off">
            {signupError && <Alert severity="warning">{signupError}</Alert>}

            <Stack spacing={1} sx={{ p: 1.25, borderRadius: 1, bgcolor: 'rgba(246,251,247,0.72)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                아이디 만들기
              </Typography>
              <TextField
                label="ID"
                name="idong-signup-id"
                value={signupDraft.id}
                onChange={(event) => {
                  setSignupDraft((current) => ({ ...current, id: event.target.value }))
                  setSignupError(null)
                }}
                helperText="이메일 없이 ID만 사용합니다."
                autoComplete="off"
                fullWidth
                size="small"
              />
            </Stack>

            <Stack spacing={1} sx={{ p: 1.25, borderRadius: 1, bgcolor: 'rgba(255,254,250,0.9)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                비밀번호 설정
              </Typography>
              <TextField
                label="비밀번호"
                name="idong-signup-password"
                type="password"
                value={signupDraft.password}
                onChange={(event) => {
                  setSignupDraft((current) => ({ ...current, password: event.target.value }))
                  setSignupError(null)
                }}
                helperText="6자 이상 입력해 주세요."
                autoComplete="off"
                fullWidth
                size="small"
              />
              <TextField
                label="비밀번호 확인"
                name="idong-signup-password-confirm"
                type="password"
                value={signupDraft.passwordConfirm}
                onChange={(event) => {
                  setSignupDraft((current) => ({ ...current, passwordConfirm: event.target.value }))
                  setSignupError(null)
                }}
                autoComplete="off"
                fullWidth
                size="small"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setSignupOpen(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? '가입 중...' : '가입하기'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
