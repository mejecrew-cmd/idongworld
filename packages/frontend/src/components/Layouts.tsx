import { Box } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'
import { HUD } from './HUD'
import { BottomNav } from './BottomNav'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const appBackgroundSx = {
  bgcolor: 'background.default',
  position: 'relative',
  overflowX: 'hidden',
  isolation: 'isolate',
  '&::before': {
    content: '""',
    position: 'fixed',
    top: 0,
    left: '50%',
    width: `min(100vw, ${GAME_STAGE_WIDTH}px)`,
    height: '100dvh',
    transform: 'translateX(-50%)',
    zIndex: 0,
    background: 'url(/assets/backgrounds/02_MainBG.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28vh',
    zIndex: 0,
    background: 'linear-gradient(180deg, rgba(255,254,250,0) 0%, rgba(255,246,224,0.34) 100%)',
    pointerEvents: 'none',
  },
} as const

const contentLayerSx = {
  position: 'relative',
  zIndex: 1,
} as const

const mutedBackgroundOverlaySx = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  background: 'rgba(230, 232, 232, 0.42)',
  pointerEvents: 'none',
} as const

const fullScreenShellSx = {
  ...appBackgroundSx,
  minHeight: '100dvh',
} as const

const mainShellSx = {
  ...appBackgroundSx,
  minHeight: '100dvh',
  pt: { xs: '72px', sm: '102px', md: '118px' },
  pb: { xs: '104px', sm: '122px' },
} as const

const MainTabLayout = () => {
  const { pathname } = useLocation()
  const isMyIslandHub = pathname === '/island'
  // 내 정보는 상단 프로필을 숨기므로 헤더(뒤로가기+제목)를 적당히 위로 올린다.
  const isMyInfo = pathname === '/island/lodge/myroom/info'

  return (
    <Box sx={{ ...mainShellSx, ...(isMyInfo ? { pt: { xs: '40px', sm: '52px', md: '60px' } } : {}) }}>
      {!isMyIslandHub && <Box aria-hidden sx={mutedBackgroundOverlaySx} />}
      <HUD />
      <Box sx={contentLayerSx}>
        <Outlet />
      </Box>
      <BottomNav />
    </Box>
  )
}

export const MyIslandLayout = MainTabLayout

export const VoyageLayout = MainTabLayout

export const FullScreenLayout = () => (
  <Box sx={fullScreenShellSx}>
    <Box sx={contentLayerSx}>
      <Outlet />
    </Box>
  </Box>
)
