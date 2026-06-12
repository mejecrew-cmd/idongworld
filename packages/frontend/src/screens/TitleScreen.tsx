/**
 * 📁 screens/TitleScreen.tsx — 01 타이틀
 * ───────────────────────────────────────────────
 * 📌 역할: 게임 시작 버튼. 신규 유저는 오프닝, 기존은 마이섬 직행 옵션.
 *
 * 🔗 연결:
 *   - 다음: /opening (신규) / /island (기존)
 *
 * 💡 초보자 안내:
 *   - onboardingComplete가 true면 "마이섬으로" 버튼 추가 표시.
 *   - 배경 PNG (ocean_dawn_warm) — 따뜻한 아침 바다.
 */
import { Box, Typography, Button, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade } from '@/lib/storeFacades'
import { api } from '@/lib/api'

export const TitleScreen = () => {
  const navigate = useNavigate()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const openingSeen = accountStoreFacade.useOpeningSeen()

  const handleStart = async () => {
    const account = accountStoreFacade.getAccountState()
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
        backgroundImage: 'url(/assets/배경/ocean_dawn_warm.png)',
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
        01 타이틀
      </Typography>
      <Stack spacing={1.5} sx={{ minWidth: 240 }}>
        <Button variant="contained" onClick={handleStart} size="large">
          {onboardingComplete || openingSeen ? '계속하기' : '게임 시작'}
        </Button>
        {(onboardingComplete || openingSeen) && (
          <Button
            variant="outlined"
            onClick={() => navigate('/island')}
            sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
          >
            마이섬으로
          </Button>
        )}
      </Stack>
    </Box>
  )
}
