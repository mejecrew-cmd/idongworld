import { useState } from 'react'
import { Alert, Box, Snackbar, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const MAIN_UI_ASSET = '/assets/ui/main'

const TABS = [
  { id: 'myroom', label: '마이룸', path: '/island/lodge/myroom/info', asset: 'Btn01MyRoom' },
  { id: 'journal', label: '일지', path: '/journal', asset: 'Btn02Diary' },
  { id: 'island', label: '마이섬', path: '/island', asset: 'Btn03MyIsland' },
  { id: 'aidong', label: '아이동', path: null, asset: 'Btn04MyIdong' },
  { id: 'shop', label: '상점', path: null, asset: 'Btn05Shop' },
] as const

function isTabActive(tabId: string, pathname: string): boolean {
  if (tabId === 'myroom') return pathname.startsWith('/island/lodge/myroom')
  if (tabId === 'journal') return pathname.startsWith('/journal')
  if (tabId === 'island') {
    return pathname === '/island' || (
      pathname.startsWith('/island') &&
      !pathname.startsWith('/island/lodge/myroom')
    )
  }
  return false
}

export const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <>
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          left: '50%',
          width: { xs: 'calc(100% - 20px)', sm: 'calc(100% - 28px)' },
          maxWidth: GAME_STAGE_WIDTH,
          transform: 'translateX(-50%)',
          bottom: { xs: 10, sm: 14 },
          height: { xs: 82, sm: 96 },
          p: { xs: 0.5, sm: 0.75 },
          zIndex: 100,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: { xs: 0.35, sm: 0.5 },
          bgcolor: 'rgba(255,254,250,0.92)',
          border: '1px solid rgba(62,155,143,0.18)',
          borderRadius: 2,
          boxShadow: '0 14px 34px rgba(66,86,80,0.14)',
          backdropFilter: 'blur(16px) saturate(1.18)',
        }}
      >
        {TABS.map((tab) => {
          const active = isTabActive(tab.id, location.pathname)
          return (
            <Box
              key={tab.id}
              data-testid={`bottom-nav-${tab.id}`}
              onClick={() => {
                if (!tab.path) {
                  setMessage(tab.id === 'shop' ? '상점은 제작중입니다.' : '아이동 화면은 준비중입니다.')
                  return
                }
                navigate(tab.path)
              }}
              sx={{
                minWidth: 0,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                borderRadius: 1,
                overflow: 'visible',
                bgcolor: 'transparent',
                transition: 'transform 140ms ease, filter 140ms ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Box
                component="img"
                src={`${MAIN_UI_ASSET}/${tab.asset}_${active ? 1 : 0}.png`}
                alt=""
                aria-hidden
                sx={{
                  width: { xs: 62, sm: 78 },
                  height: { xs: 62, sm: 78 },
                  objectFit: 'contain',
                  filter: active ? 'drop-shadow(0 8px 12px rgba(84,78,63,0.18))' : 'none',
                }}
              />
              <Typography
                sx={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                  clip: 'rect(0 0 0 0)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          )
        })}
      </Box>
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={1800}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 9, sm: 10 } }}
      >
        <Alert severity="info" variant="filled" sx={{ borderRadius: 1.5 }}>
          {message}
        </Alert>
      </Snackbar>
    </>
  )
}
