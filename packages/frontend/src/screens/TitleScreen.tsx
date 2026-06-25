/**
 * packages/frontend/src/screens/TitleScreen.tsx
 * ------------------------------------------------------------
 * 역할: 로그인 후 매번 보여주는 타이틀 화면이다.
 * 연결: 입장 버튼을 누를 때만 신규/기존 계정 여부를 판단해 opening 또는 island로 이동한다.
 * 주의: 타이틀 화면 진입 자체는 더 이상 오프닝 완료 여부로 자동 스킵하지 않는다.
 */
import { Box, Typography, Button, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
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
    // Fall back to account state.
  }
  return undefined
}

export const TitleScreen = () => {
  const navigate = useNavigate()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const openingSeen = accountStoreFacade.useOpeningSeen()

  const handleStart = async () => {
    const entryIsNew = readAuthEntryIsNew()
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
        backgroundImage: 'url(/assets/諛곌꼍/ocean_dawn_warm.png)',
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
          입장
        </Button>
        {(onboardingComplete || openingSeen) && (
          <Button
            variant="outlined"
            onClick={() => navigate('/island')}
            sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
          >
            바로 마이섬으로
          </Button>
        )}
      </Stack>
    </Box>
  )
}
