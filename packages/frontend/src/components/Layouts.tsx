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
      'radial-gradient(circle at 18px 18px, rgba(242,127,117,0.14) 0 2px, transparent 2px 34px)',
      'radial-gradient(circle at 9px 9px, rgba(62,155,143,0.12) 0 1.5px, transparent 1.5px 30px)',
      'linear-gradient(180deg, #e7f8f3 0%, #f6fbf7 45%, #fff5dd 100%)',
    ].join(', '),
    backgroundSize: '34px 34px, 30px 30px, auto',
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

export const MyIslandLayout = () => (
  <Box sx={{ ...appShellSx, pt: '72px', pb: '88px' }}>
    <HUD />
    <Outlet />
    <BottomNav />
  </Box>
)

export const VoyageLayout = () => (
  <Box sx={{ ...appShellSx, pt: '72px', pb: 3 }}>
    <HUD />
    <Outlet />
  </Box>
)

export const FullScreenLayout = () => (
  <Box sx={appShellSx}>
    <Outlet />
  </Box>
)
