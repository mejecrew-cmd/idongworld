/**
 * packages/frontend/src/screens/TitleScreen.tsx
 * ------------------------------------------------------------
 * 역할: 로그인 후 매번 보여주는 타이틀 화면이다.
 * 연결: 입장 버튼을 누를 때 신규 계정은 opening, 기존 계정은 island로 이동한다.
 * 주의: 타이틀 진입 자체는 자동 스킵하지 않는다. 재방문 계정에는 로그아웃 버튼만 추가로 보여준다.
 */
import { Box, Typography, Button, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { logout as accountLogout } from '@idongworld/account'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade } from '@/lib/storeFacades'
import { api } from '@/lib/api'

const AUTH_ENTRY_IS_NEW_KEY = 'idongworld-auth-entry-is-new'

function readAuthEntryIsNew(): boolean | undefined {
  try {
    const value = window.sessionStorage.getItem(AUTH_ENTRY_IS_NEW_KEY)
    if (value === 'true') return true
    if (value === 'false') return false
  } catch {
    // sessionStorage를 사용할 수 없으면 account state를 기준으로 판단한다.
  }
  return undefined
}

function clearAuthEntryIsNew(): void {
  try {
    window.sessionStorage.removeItem(AUTH_ENTRY_IS_NEW_KEY)
  } catch {
    // 로그아웃은 계속 진행한다.
  }
}

export const TitleScreen = () => {
  const navigate = useNavigate()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const openingSeen = accountStoreFacade.useOpeningSeen()
  const entryIsNew = readAuthEntryIsNew()
  const showLogout = entryIsNew === false || onboardingComplete || openingSeen

  const handleStart = async () => {
    if (entryIsNew === false) {
      navigate('/island')
      return
    }

    const account = accountStoreFacade.getAccountState()
    if (entryIsNew === true) {
      navigate(account.onboardingComplete || account.openingSeen ? '/island' : '/opening')
      return
    }

    if (account.onboardingComplete || account.openingSeen) {
      navigate('/island')
      return
    }

    if (account.firebaseUid) {
      try {
        const response = await api.getAccountState(account.firebaseUid)
        accountStoreFacade.mergeAccountState(response.state)
        const latest = response.state as { openingSeen?: unknown; onboardingComplete?: unknown }
        if (latest.onboardingComplete === true || latest.openingSeen === true) {
          navigate('/island')
          return
        }
      } catch (error) {
        console.warn('[title] failed to refresh account state before opening', error)
      }
    }

    navigate('/opening')
  }

  const handleLogout = () => {
    clearAuthEntryIsNew()
    accountLogout()
    navigate('/login', { replace: true })
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
        backgroundImage: 'url(/assets/backgrounds/01_TitleBG.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <ScreenHeader category="타이틀" title="아이동월드" overlay />
      <Typography
        variant="h1"
        sx={{ fontSize: 48, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
      >
        아이동월드
      </Typography>
      <Typography sx={{ color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
        오늘도 섬으로 들어가기
      </Typography>
      <Stack spacing={1.5} sx={{ minWidth: 240 }}>
        <Button variant="contained" onClick={handleStart} size="large">
          입장하기
        </Button>
        {showLogout && (
          <Button
            variant="outlined"
            onClick={handleLogout}
            sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
          >
            로그아웃
          </Button>
        )}
      </Stack>
    </Box>
  )
}
