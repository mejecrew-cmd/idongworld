import { Box, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const MAIN_UI_ASSET = '/assets/ui/main'

const TABS = [
  { id: 'myroom', label: '내 정보', path: '/island/lodge/myroom/info', asset: 'Btn01MyRoom' },
  { id: 'journal', label: '일지', path: '/island/lodge/myroom/journal', asset: 'Btn02Diary' },
  { id: 'island', label: '마이섬', path: '/island', asset: 'Btn03MyIsland' },
  { id: 'aidong', label: '아이동 정보', path: '/island/lodge/myroom/aidong', asset: 'Btn04MyIdong' },
  { id: 'shop', label: '상점', path: '/shop', asset: 'Btn05Shop' },
] as const

type TabId = typeof TABS[number]['id']

function isTabActive(tabId: TabId, pathname: string): boolean {
  if (tabId === 'myroom') return pathname === '/island/lodge/myroom/info'
  if (tabId === 'journal') return pathname.startsWith('/island/lodge/myroom/journal') || pathname === '/journal'
  if (tabId === 'aidong') {
    return pathname.startsWith('/island/lodge/myroom/aidong') ||
      pathname.startsWith('/island/lodge/myroom/codex') ||
      pathname === '/codex'
  }
  if (tabId === 'island') return pathname === '/island'
  if (tabId === 'shop') return pathname.startsWith('/shop')
  return false
}

export const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        left: '50%',
        width: { xs: 'calc(100% - 18px)', sm: 'calc(100% - 28px)' },
        maxWidth: GAME_STAGE_WIDTH,
        transform: 'translateX(-50%)',
        bottom: { xs: 8, sm: 12 },
        height: { xs: 78, sm: 92 },
        p: { xs: 0.5, sm: 0.75 },
        zIndex: 100,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: { xs: 0.35, sm: 0.55 },
        bgcolor: 'rgba(255,252,241,0.72)',
        border: '1px solid rgba(255,255,255,0.72)',
        borderRadius: 2,
        boxShadow: '0 12px 28px rgba(91,70,54,0.16)',
        backdropFilter: 'blur(12px) saturate(1.08)',
      }}
    >
      {TABS.map((tab) => {
        const active = isTabActive(tab.id, location.pathname)
        return (
          <Box
            key={tab.id}
            data-testid={`bottom-nav-${tab.id}`}
            component="button"
            type="button"
            onClick={() => {
              if (location.pathname !== tab.path) navigate(tab.path)
            }}
            sx={{
              position: 'relative',
              minWidth: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              border: 0,
              borderRadius: 1,
              overflow: 'visible',
              bgcolor: 'transparent',
              transition: 'transform 140ms ease, filter 140ms ease',
              appearance: 'none',
              p: 0,
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
                width: { xs: 64, sm: 78 },
                height: { xs: 64, sm: 78 },
                objectFit: 'contain',
                filter: active ? 'drop-shadow(0 8px 12px rgba(84,78,63,0.2))' : 'none',
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
  )
}
