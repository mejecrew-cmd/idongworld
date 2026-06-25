import { useState } from 'react'
import { Alert, Box, Snackbar, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const TABS = [
  { id: 'myroom', label: '마이룸', path: '/island/lodge/myroom/info', mark: '룸' },
  { id: 'journal', label: '일지', path: '/journal', mark: '일' },
  { id: 'island', label: '마이섬', path: '/island', mark: '섬' },
  { id: 'aidong', label: '아이동', path: null, mark: '아' },
  { id: 'shop', label: '상점', path: null, mark: '상' },
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
          height: { xs: 60, sm: 66 },
          p: 0.75,
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.25,
                cursor: 'pointer',
                userSelect: 'none',
                borderRadius: 1.5,
                overflow: 'hidden',
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'primary.contrastText' : 'text.secondary',
                backgroundImage: active
                  ? 'linear-gradient(135deg, #67bda4 0%, #3e9b8f 58%, #f3c35c 100%)'
                  : 'none',
                boxShadow: active ? '0 8px 18px rgba(62,155,143,0.22)' : 'none',
                transition: 'transform 140ms ease, background-color 140ms ease, box-shadow 140ms ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  bgcolor: active ? undefined : 'rgba(36,107,111,0.08)',
                },
              }}
            >
              <Box
                sx={{
                  width: { xs: 22, sm: 24 },
                  height: { xs: 22, sm: 24 },
                  borderRadius: 1.25,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  fontWeight: 900,
                  color: active ? '#3e9b8f' : 'primary.main',
                  bgcolor: active ? '#fffefa' : 'rgba(62,155,143,0.08)',
                  border: active ? '1px solid rgba(255,255,255,0.42)' : '1px solid rgba(62,155,143,0.1)',
                }}
              >
                {tab.mark}
              </Box>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, fontWeight: active ? 900 : 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
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
