/**
 * packages/frontend/src/screens/SignupScreen.tsx
 * ------------------------------------------------------------
 * 역할: 최초 로그인 직후 닉네임을 확정하는 가입 화면.
 * 연결: LoginScreen에서 신규 계정으로 판정되면 /signup으로 이동하고,
 *       이 화면을 통과한 뒤 /title로 이동한다.
 * 주의: DB 문서 생성 시점을 가입 완료 뒤로 옮기는 작업은 backend API 변경 단계에서 처리한다.
 */
import { FormEvent, useMemo, useState } from 'react'
import { logout as accountLogout } from '@idongworld/account'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'
import { api, setPasswordSessionToken } from '@/lib/api'
import { hydrateSplitState } from '@/lib/syncStore'
import { accountStoreFacade, voyageSessionFacade } from '@/lib/storeFacades'

const AUTH_ENTRY_IS_NEW_KEY = 'idongworld-auth-entry-is-new'
const PENDING_PASSWORD_SIGNUP_TOKEN_KEY = 'idongworld-pending-password-signup-token'
const PENDING_PASSWORD_SIGNUP_LOGIN_ID_KEY = 'idongworld-pending-password-signup-login-id'
const PENDING_SOCIAL_SIGNUP_KEY = 'idongworld-pending-social-signup'
const NICKNAME_MAX_LENGTH = 8
const FORBIDDEN_NICKNAME_PARTS = ['운영자', '관리자', 'admin', 'system']

type PendingSocialSignup = {
  provider: 'google' | 'twitter' | 'firebase'
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
}

function normalizeNickname(value: string): string {
  return value.trim()
}

function getNicknameError(nickname: string): string | null {
  const normalized = normalizeNickname(nickname)
  if (!normalized) return '닉네임을 입력해 주세요.'
  if ([...normalized].length > NICKNAME_MAX_LENGTH) {
    return `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`
  }

  const lower = normalized.toLowerCase()
  if (FORBIDDEN_NICKNAME_PARTS.some((word) => lower.includes(word))) {
    return '사용할 수 없는 단어가 포함되어 있어요.'
  }

  return null
}

function rememberNewEntry(): void {
  try {
    window.sessionStorage.setItem(AUTH_ENTRY_IS_NEW_KEY, 'true')
  } catch {
    // sessionStorage가 막힌 환경에서는 TitleScreen의 계정 상태 판정에 맡긴다.
  }
}

function readPendingPasswordSignup(): { signupToken: string; loginId?: string } | undefined {
  try {
    const signupToken = window.sessionStorage.getItem(PENDING_PASSWORD_SIGNUP_TOKEN_KEY)
    if (!signupToken) return undefined
    return {
      signupToken,
      loginId: window.sessionStorage.getItem(PENDING_PASSWORD_SIGNUP_LOGIN_ID_KEY) ?? undefined,
    }
  } catch {
    return undefined
  }
}

function clearPendingPasswordSignup(): void {
  try {
    window.sessionStorage.removeItem(PENDING_PASSWORD_SIGNUP_TOKEN_KEY)
    window.sessionStorage.removeItem(PENDING_PASSWORD_SIGNUP_LOGIN_ID_KEY)
  } catch {
    // Ignore storage errors.
  }
}

function readPendingSocialSignup(): PendingSocialSignup | undefined {
  try {
    const raw = window.sessionStorage.getItem(PENDING_SOCIAL_SIGNUP_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<PendingSocialSignup>
    if (parsed.provider !== 'google' && parsed.provider !== 'twitter' && parsed.provider !== 'firebase') {
      return undefined
    }
    return {
      provider: parsed.provider,
      email: parsed.email,
      displayName: parsed.displayName,
      photoURL: parsed.photoURL,
    }
  } catch {
    return undefined
  }
}

function clearPendingSocialSignup(): void {
  try {
    window.sessionStorage.removeItem(PENDING_SOCIAL_SIGNUP_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export const SignupScreen = () => {
  const navigate = useNavigate()
  const firebaseUid = accountStoreFacade.useFirebaseUid()
  const currentNickname = accountStoreFacade.useNickname()
  const pendingPasswordSignup = readPendingPasswordSignup()
  const pendingSocialSignup = readPendingSocialSignup()
  const [nickname, setNickname] = useState(
    currentNickname ?? pendingPasswordSignup?.loginId ?? pendingSocialSignup?.displayName ?? '',
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const nicknameError = useMemo(() => (
    nickname ? getNicknameError(nickname) : null
  ), [nickname])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalized = normalizeNickname(nickname)
    const validationError = getNicknameError(normalized)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (pendingPasswordSignup) {
        const response = await api.authPasswordCompleteSignup({
          signupToken: pendingPasswordSignup.signupToken,
          nickname: normalized,
        })
        setPasswordSessionToken(response.token)
        await hydrateSplitState(response.uid).catch((hydrateError) => {
          console.warn('[signup] failed to hydrate password account session:', hydrateError)
        })
        accountStoreFacade.mergeAccountState({
          firebaseUid: response.uid,
          isGuest: false,
          gameStartedAt: accountStoreFacade.getAccountState().gameStartedAt ?? Date.now(),
          nickname: normalized,
        })
        clearPendingPasswordSignup()
      } else if (firebaseUid && pendingSocialSignup) {
        const response = await api.authSocialCompleteSignup(firebaseUid, {
          ...pendingSocialSignup,
          nickname: normalized,
        })
        await hydrateSplitState(response.uid).catch((hydrateError) => {
          console.warn('[signup] failed to hydrate social account session:', hydrateError)
        })
        accountStoreFacade.mergeAccountState({
          firebaseUid: response.uid,
          isGuest: false,
          gameStartedAt: accountStoreFacade.getAccountState().gameStartedAt ?? Date.now(),
          nickname: normalized,
        })
        clearPendingSocialSignup()
      } else if (firebaseUid) {
        accountStoreFacade.mergeAccountState({ nickname: normalized })
        await api.patchAccountState(firebaseUid, { nickname: normalized })
      } else {
        setError('가입을 이어갈 로그인 정보가 없어요. 다시 로그인해 주세요.')
        return
      }
      rememberNewEntry()
      navigate('/title', { replace: true })
    } catch (saveError) {
      console.warn('[signup] failed to save profile:', saveError)
      setError('가입 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    clearPendingPasswordSignup()
    clearPendingSocialSignup()
    voyageSessionFacade.endSession()
    accountLogout()
    navigate('/login', { replace: true })
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: 'linear-gradient(180deg, #f6fbf7 0%, #edf7f2 52%, #fffefa 100%)',
      }}
    >
      <ScreenHeader category="계정" title="가입" subtitle="처음 방문 설정" />

      <Stack
        component="form"
        onSubmit={handleSubmit}
        spacing={2.25}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 2.75,
          borderRadius: 2,
          bgcolor: 'rgba(255,254,250,0.96)',
          border: '1px solid rgba(62,155,143,0.18)',
          boxShadow: '0 18px 42px rgba(39,51,51,0.12)',
        }}
      >
        <Stack spacing={1} sx={{ textAlign: 'center' }}>
          <Typography variant="h1" sx={{ fontSize: 26 }}>
            섬에서 사용할 이름을 정해 주세요
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            아바타는 첫 만남에서 만나는 아이동 얼굴로 설정될 예정이에요.
          </Typography>
        </Stack>

        {error && <Alert severity="warning">{error}</Alert>}

        <TextField
          label="닉네임"
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value)
            setError(null)
          }}
          error={Boolean(nicknameError)}
          helperText={nicknameError ?? `${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`}
          inputProps={{ maxLength: NICKNAME_MAX_LENGTH * 2 }}
          autoComplete="off"
          autoFocus
          fullWidth
        />

        <Button type="submit" variant="contained" size="large" disabled={saving} fullWidth>
          {saving ? '가입 정보 저장 중...' : '가입하고 계속'}
        </Button>

        <Button type="button" variant="text" color="inherit" disabled={saving} onClick={handleLogout} fullWidth>
          로그인으로 돌아가기
        </Button>
      </Stack>
    </Box>
  )
}
