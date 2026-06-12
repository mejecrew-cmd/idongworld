/**
 * packages/frontend/src/screens/IslandAreaPlaceholderScene.tsx
 * ------------------------------------------------------------
 * 역할: /island/area/:areaNo 정식 AREA route 중 아직 전용 화면이 없는 구역을 안내한다.
 * 연결: App.tsx의 AREA route, data/zones.ts의 15구역 SoT, IslandFullMapScreen.
 * 주의: 구현된 구역은 App.tsx에서 기존 화면으로 redirect하고, 이 화면은 미구현 구역만 받는다.
 */
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'
import { PHASE_COLOR, PHASE_LABEL, ZONES } from '@/data/zones'

const normalizeAreaNo = (value?: string) => {
  if (!value) return ''
  const digits = value.replace(/\D/g, '').padStart(2, '0').slice(-2)
  return digits ? `AREA-${digits}` : ''
}

export const IslandAreaPlaceholderScene = () => {
  const navigate = useNavigate()
  const { areaNo } = useParams()
  const normalizedAreaNo = normalizeAreaNo(areaNo)
  const zone = ZONES.find((item) => item.areaNo === normalizedAreaNo)

  if (!zone) {
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', pb: 12 }}>
        <ScreenHeader category="마이섬" title="구역 없음" subtitle={areaNo ? `area/${areaNo}` : undefined} />
        <Box sx={{ mt: 3, bgcolor: 'background.paper', borderRadius: 2, p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h1" sx={{ mb: 1 }}>
            찾을 수 없는 구역이에요
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            마이섬 정식 구역은 AREA-01부터 AREA-15까지입니다.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/island/full-map')}>
            풀맵으로 돌아가기
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 760, mx: 'auto', pb: 12 }}>
      <ScreenHeader category="마이섬 구역" title={zone.name} subtitle={zone.areaNo} />

      <Box
        sx={{
          mt: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontSize: 56, mb: 1 }}>{zone.emoji}</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Chip label={zone.areaNo} size="small" color="primary" />
          <Chip label={zone.kind === 'anchor' ? 'anchor 구역' : '편입 슬롯'} size="small" variant="outlined" />
          <Chip label={PHASE_LABEL[zone.phase]} size="small" sx={{ bgcolor: PHASE_COLOR[zone.phase] }} />
        </Stack>

        <Typography variant="h1" sx={{ mb: 1 }}>
          {zone.name}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
          {zone.emotion}
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          {zone.activity}
        </Typography>

        <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2, mb: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            이 구역의 정식 주소는 열려 있지만, 전용 화면과 상호작용은 후속 마일스톤에서 구현됩니다.
            이미 구현된 일부 구역은 기존 호환 화면으로 자동 이동합니다.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button variant="contained" onClick={() => navigate('/island/full-map')}>
            풀맵으로
          </Button>
          {zone.route && (
            <Button variant="outlined" onClick={() => navigate(zone.route!)}>
              호환 화면으로 이동
            </Button>
          )}
          <Button variant="outlined" onClick={() => navigate('/island')}>
            마이섬으로
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
