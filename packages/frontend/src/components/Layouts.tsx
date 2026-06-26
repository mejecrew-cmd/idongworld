import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { HUD } from './HUD'
import { BottomNav } from './BottomNav'

const appShellSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  position: 'relative',
  overflowX: 'hidden',
  '&::before': {
    content: '""',
    position: 'fixed',
    inset: 0,
    zIndex: -2,
    background: [
      'linear-gradient(180deg, rgba(255,254,250,0.7) 0%, rgba(255,254,250,0.42) 45%, rgba(255,245,221,0.72) 100%)',
      'url(/assets/backgrounds/02_MainBG.png)',
    ].join(', '),
    backgroundSize: 'auto, cover',
    backgroundPosition: 'center, center',
  },
  '&::after': {
    content: '""',
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '34vh',
    zIndex: -1,
    background: 'linear-gradient(180deg, rgba(255,254,250,0) 0%, rgba(243,195,92,0.16) 100%)',
    pointerEvents: 'none',
  },
} as const

const MainTabLayout = () => (
  <Box sx={{ ...appShellSx, pt: '72px', pb: '88px' }}>
    <HUD />
    <Outlet />
    <BottomNav />
  </Box>
)

export const MyIslandLayout = MainTabLayout

export const VoyageLayout = MainTabLayout

export const FullScreenLayout = () => (
  <Box sx={appShellSx}>
    <Outlet />
  </Box>
)
