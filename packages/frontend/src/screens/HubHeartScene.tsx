import { useState } from 'react'
import { Alert, Box, Snackbar, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { accountStoreFacade } from '@/lib/storeFacades'

type IslandArea = {
  id: string
  name: string
  gate: 'always' | 'sooksoClean' | 'future'
  path?: string
  x: number
  y: number
}

const AREAS: IslandArea[] = [
  { id: 'lighthouse', name: '등대', gate: 'future', x: 22.5, y: 21.5 },
  { id: 'harbor', name: '항구', gate: 'sooksoClean', path: '/island/harbor', x: 23.5, y: 35.5 },
  { id: 'forest', name: '기억의 숲', gate: 'future', x: 43.5, y: 23.5 },
  { id: 'cave', name: '고민 동굴', gate: 'future', x: 62.5, y: 25.0 },
  { id: 'waterfall', name: '자신감 폭포', gate: 'future', x: 78.0, y: 33.5 },
  { id: 'square', name: '시간 광장', gate: 'future', x: 50.0, y: 41.0 },
  { id: 'oasis', name: '휴식 오아시스', gate: 'future', x: 34.5, y: 45.5 },
  { id: 'bridge', name: '우정의 다리', gate: 'future', x: 52.0, y: 51.0 },
  { id: 'crystal', name: '창의의 샘', gate: 'future', x: 22.0, y: 55.0 },
  { id: 'lodge', name: '숙소', gate: 'always', path: '/island/lodge', x: 45.5, y: 60.0 },
  { id: 'garden', name: '성장의 정원', gate: 'future', x: 67.0, y: 64.0 },
  { id: 'lake', name: '목표 호수', gate: 'future', x: 49.5, y: 75.0 },
]

const mapFrameSx = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  width: 'calc(max(100dvh, calc(100vw * 9 / 16)) * 3 / 4)',
  height: 'max(100dvh, calc(100vw * 9 / 16))',
  transform: 'translate(-50%, -50%)',
  zIndex: 2,
  pointerEvents: 'none',
} as const

export const HubHeartScene = () => {
  const navigate = useNavigate()
  const sooksoClean = accountStoreFacade.useSooksoClean()
  const [toast, setToast] = useState<string | null>(null)

  return (
    <Box sx={{ height: 'calc(100dvh - 178px)', maxHeight: 'calc(100dvh - 178px)', minHeight: 0, p: 0, overflow: 'hidden' }}>
      <Box sx={mapFrameSx}>
        {AREAS.map((area) => {
          const open = area.gate === 'always' || (area.gate === 'sooksoClean' && sooksoClean)
          return (
            <Box
              key={area.id}
              component="button"
              type="button"
              onClick={() => {
                if (!open || !area.path) {
                  setToast(area.gate === 'sooksoClean' ? '숙소를 먼저 정리하면 항구가 열려요.' : `${area.name}은 준비 중이에요.`)
                  return
                }
                navigate(area.path)
              }}
              sx={{
                position: 'absolute',
                left: `${area.x}%`,
                top: `${area.y}%`,
                transform: 'translate(-50%, -50%)',
                width: { xs: 62, sm: 84 },
                height: { xs: 58, sm: 74 },
                p: 0,
                border: 0,
                bgcolor: 'transparent',
                appearance: 'none',
                cursor: 'pointer',
                opacity: open ? 1 : 0.58,
                pointerEvents: 'auto',
                transition: 'transform 150ms ease, opacity 150ms ease',
                '&:hover': {
                  transform: open ? 'translate(-50%, -55%)' : 'translate(-50%, -50%)',
                },
              }}
            >
              <Box
                sx={{
                  mx: 'auto',
                  width: { xs: 40, sm: 54 },
                  height: { xs: 28, sm: 38 },
                  backgroundImage: `url(/assets/ui/main/${open ? 'BtnPlaceOn' : 'BtnPlaceOff'}.png)`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  filter: 'drop-shadow(0 7px 12px rgba(67,51,38,0.2))',
                }}
              />
              <Box
                sx={{
                  mt: -0.25,
                  width: '100%',
                  height: { xs: 28, sm: 34 },
                  px: 0.45,
                  py: 0.32,
                  borderRadius: 1,
                  bgcolor: open ? 'rgba(255,252,241,0.9)' : 'rgba(245,239,228,0.76)',
                  border: '1px solid rgba(255,255,255,0.7)',
                  boxShadow: '0 7px 15px rgba(91,70,54,0.11)',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Typography
                  sx={{
                    color: '#4d3d33',
                    fontWeight: 900,
                    fontSize: { xs: 8.4, sm: 10.4 },
                    lineHeight: 1.08,
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    overflowWrap: 'anywhere',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {area.name}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={1800}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 10 }}
      >
        <Alert severity="info" variant="filled" sx={{ borderRadius: 1.5 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
