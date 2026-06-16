import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'

const SHOP_SECTIONS = [
  { title: '일반 상점', desc: '음식, 기본 소모품, 작은 꾸미기 아이템을 준비할 공간입니다.', mark: '상' },
  { title: '의상 상점', desc: 'Aidong 의상과 착용 아이템 구매 흐름을 연결할 예정입니다.', mark: '옷' },
  { title: '시즌 교환소', desc: '이벤트 재화와 한정 보상을 교환하는 영역으로 확장합니다.', mark: '시' },
]

export const ShopScreen = () => {
  const navigate = useNavigate()

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="상점" title="구매·교환" subtitle="준비 중" />
      <GameStage stageSx={{ px: 3, py: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h1" sx={{ fontSize: 22, flex: 1, minWidth: 180 }}>
            상점
          </Typography>
          <Chip label="Phase 준비 중" color="primary" variant="outlined" />
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          아직 구매 기능은 연결되지 않았지만, 이후 상점 기능이 들어올 자리입니다.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
          {SHOP_SECTIONS.map((section) => (
            <Box
              key={section.title}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
                minHeight: 144,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(62,155,143,0.1)',
                  color: 'primary.main',
                  fontWeight: 900,
                  mb: 1.5,
                }}
              >
                {section.mark}
              </Box>
              <Typography sx={{ fontWeight: 900, mb: 0.75 }}>{section.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {section.desc}
              </Typography>
            </Box>
          ))}
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button variant="contained" onClick={() => navigate('/island')}>
            마이섬으로
          </Button>
          <Button variant="outlined" onClick={() => navigate('/codex')}>
            도감으로
          </Button>
        </Stack>
      </GameStage>
    </Box>
  )
}
