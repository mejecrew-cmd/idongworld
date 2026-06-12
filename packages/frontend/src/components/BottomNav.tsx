import { Box, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { applyActionApiResponse } from '@/lib/actionApiSync'
import { accountStoreFacade, routeNeighborStoreFacade } from '@/lib/storeFacades'

const TABS = [
  { id: 'island', label: '마이섬', path: '/island', mark: '섬' },
  { id: 'voyage', label: '항해', path: '/voyage/board', mark: '항' },
  { id: 'codex', label: '도감', path: '/codex', mark: '도' },
  { id: 'shop', label: '상점', path: '/shop', mark: '상' },
  { id: 'setting', label: '설정', path: '/setting', mark: '설' },
]
const ROUTE_ALIASES: Record<string, 'neighbor'> = {
  neighbor: 'neighbor',
  'route-neighbor': 'neighbor',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function normalizeRouteId(routeId: string | undefined): 'neighbor' | undefined {
  return routeId ? ROUTE_ALIASES[routeId] : undefined
}

export const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navigateToVoyage = async () => {
    const uid = accountStoreFacade.getFirebaseUid()
    if (!uid) {
      routeNeighborStoreFacade.endVoyage()
      navigate('/island/harbor')
      return
    }

    try {
      const routeStateResponse = await api.getModuleState(uid, 'route-neighbor')
      const routeState = asRecord(routeStateResponse.state)
      const activeRoute = normalizeRouteId(typeof routeState.currentRoute === 'string'
        ? routeState.currentRoute
        : undefined)

      if (!activeRoute) {
        routeNeighborStoreFacade.endVoyage()
        navigate('/island/harbor')
        return
      }

      applyActionApiResponse({ state: routeState })
      navigate(`/voyage/board?route=${encodeURIComponent(activeRoute)}`)
    } catch (error) {
      console.warn('[voyage] failed to validate active route before navigation', error)
      routeNeighborStoreFacade.endVoyage()
      navigate('/island/harbor')
    }
  }

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        left: { xs: 10, sm: 18 },
        right: { xs: 10, sm: 18 },
        bottom: { xs: 10, sm: 14 },
        height: 66,
        p: 0.75,
        zIndex: 100,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 0.5,
        bgcolor: 'rgba(255,254,250,0.92)',
        border: '1px solid rgba(62,155,143,0.18)',
        borderRadius: 2,
        boxShadow: '0 14px 34px rgba(66,86,80,0.14)',
        backdropFilter: 'blur(16px) saturate(1.18)',
      }}
    >
      {TABS.map((tab) => {
        const rootPath = tab.path.split('/')[1]
        const active = location.pathname.startsWith(rootPath ? `/${rootPath}` : tab.path)
        return (
          <Box
            key={tab.id}
            data-testid={`bottom-nav-${tab.id}`}
            onClick={() => {
              if (tab.id === 'voyage') {
                void navigateToVoyage()
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
                width: 24,
                height: 24,
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
            <Typography sx={{ fontSize: 11, fontWeight: active ? 900 : 800, lineHeight: 1.1 }}>
              {tab.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
