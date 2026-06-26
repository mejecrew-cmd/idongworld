import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade } from '@/lib/storeFacades'

type IslandArea = {
  areaNo: string
  name: string
  description: string
  status: 'open' | 'locked'
  path?: string
}

const ISLAND_AREAS: IslandArea[] = [
  { areaNo: 'AREA-02', name: '항구', description: '항해와 이동의 출발점입니다.', status: 'open', path: '/island/harbor' },
  { areaNo: 'AREA-01', name: '등대', description: '마이섬의 첫 불빛이 켜질 자리입니다.', status: 'locked' },
  { areaNo: 'AREA-03', name: '기억의 숲', description: '일지와 기억 조각이 쌓이는 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-04', name: '고민 동굴', description: '걱정을 천천히 내려놓는 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-05', name: '자신감 폭포', description: '흔들린 마음을 회복하는 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-06', name: '휴식 오아시스', description: '휴식과 회복 활동이 열릴 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-07', name: '시간의 모래광장', description: '시간 활동이 배치될 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-08', name: '성찰 산책로', description: '돌아보기 활동이 열릴 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-09', name: '목표 산', description: '목표 활동과 도전이 열릴 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-10', name: '우정의 다리', description: '관계 활동이 열릴 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-11', name: '창의의 샘', description: '표현 활동이 열릴 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-12', name: '도전 절벽', description: '도전형 활동이 열릴 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-13', name: '숙소', description: '마이룸과 휴식 기능이 정리될 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-14', name: '성장의 정원', description: '성장 활동이 열릴 구역입니다.', status: 'locked' },
  { areaNo: 'AREA-15', name: '반성의 호수', description: '마무리 활동이 열릴 구역입니다.', status: 'locked' },
]

export const HubHeartScene = () => {
  const navigate = useNavigate()
  const hostName = accountStoreFacade.useHostName()
  const nickname = accountStoreFacade.useNickname()
  const displayName = hostName ?? nickname ?? '마이섬'

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="마이섬" title="마이섬 허브" subtitle={displayName} />
      <GameStage
        stageSx={{
          px: { xs: 2.5, sm: 3 },
          py: 3,
          backgroundImage:
            'linear-gradient(180deg, rgba(255,254,250,0.84), rgba(255,254,250,0.9)), url(/assets/backgrounds/03_Home_01.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Stack spacing={0.75} sx={{ mb: 2.5 }}>
          <Typography variant="h1" sx={{ fontSize: 22 }}>
            전체 지도
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            현재는 항구만 열려 있습니다. 나머지 구역은 리소스와 본편 진행이 들어오면 순차적으로 열립니다.
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          {ISLAND_AREAS.map((area) => {
            const open = area.status === 'open'
            return (
              <Box
                key={area.areaNo}
                sx={{
                  bgcolor: open ? 'rgba(255,254,250,0.96)' : 'rgba(246,248,247,0.82)',
                  border: '1px solid',
                  borderColor: open ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 2,
                  minHeight: 142,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  opacity: open ? 1 : 0.72,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 900, flex: 1 }}>
                    {area.areaNo}
                  </Typography>
                  <Chip
                    size="small"
                    label={open ? '열림' : '닫힘'}
                    color={open ? 'primary' : 'default'}
                    variant={open ? 'filled' : 'outlined'}
                  />
                </Stack>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                  {area.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
                  {area.description}
                </Typography>
                <Button
                  variant={open ? 'contained' : 'outlined'}
                  disabled={!open}
                  onClick={() => area.path && navigate(area.path)}
                  fullWidth
                >
                  {open ? '들어가기' : '잠김'}
                </Button>
              </Box>
            )
          })}
        </Box>
      </GameStage>
    </Box>
  )
}
