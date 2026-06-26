import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { HUD } from './HUD'
import { BottomNav } from './BottomNav'

const appBackgroundSx = {
  bgcolor: 'background.default',
  position: 'relative',
  overflowX: 'hidden',
  isolation: 'isolate',
  '&::before': {
    content: '""',
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: 'max(100vw, calc(100dvh * 16 / 9))',
    height: 'max(100dvh, calc(100vw * 9 / 16))',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    background: [
      'linear-gradient(180deg, rgba(255,254,250,0.7) 0%, rgba(255,254,250,0.42) 45%, rgba(255,245,221,0.72) 100%)',
      'url(/assets/backgrounds/02_MainBG.png)',
    ].join(', '),
    backgroundSize: 'auto, 100% 100%',
    backgroundPosition: 'center, center',
    backgroundRepeat: 'no-repeat',
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '34vh',
    zIndex: 0,
    background: 'linear-gradient(180deg, rgba(255,254,250,0) 0%, rgba(243,195,92,0.16) 100%)',
    pointerEvents: 'none',
  },
} as const

const contentLayerSx = {
  position: 'relative',
  zIndex: 1,
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

const MainTabLayout = () => (
  <Box sx={mainShellSx}>
    <HUD />
    <Box sx={contentLayerSx}>
      <Outlet />
    </Box>
    <BottomNav />
  </Box>
)

export const MyIslandLayout = MainTabLayout

export const VoyageLayout = MainTabLayout

export const FullScreenLayout = () => (
  <Box sx={fullScreenShellSx}>
    <Box sx={contentLayerSx}>
      <Outlet />
    </Box>
  </Box>
)
