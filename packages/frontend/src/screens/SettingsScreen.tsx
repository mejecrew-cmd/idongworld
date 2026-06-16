import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'

const SETTING_ROWS = [
  { title: '계정', desc: '로그인 정보, 닉네임, 호스트 이름 설정을 배치할 예정입니다.' },
  { title: '사운드', desc: '배경음, 효과음, 음량 조절 옵션을 연결할 자리입니다.' },
  { title: '화면', desc: '해상도, 접근성, 표시 밀도 같은 UI 옵션을 정리할 예정입니다.' },
  { title: '데이터', desc: '저장, 동기화, 초기화 관련 기능이 들어올 영역입니다.' },
]

export const SettingsScreen = () => {
  const navigate = useNavigate()

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="설정" title="환경 설정" subtitle="준비 중" />
      <GameStage stageSx={{ px: 3, py: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h1" sx={{ fontSize: 22, flex: 1, minWidth: 180 }}>
            설정
          </Typography>
          <Chip label="기능 연결 전" color="primary" variant="outlined" />
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          현재는 설정 화면의 형태만 준비되어 있습니다.
        </Typography>

        <Stack spacing={1.25}>
          {SETTING_ROWS.map((row) => (
            <Box
              key={row.title}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'rgba(242,127,117,0.1)',
                    color: '#f27f75',
                    fontWeight: 900,
                    flex: '0 0 auto',
                  }}
                >
                  설
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }}>{row.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {row.desc}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button variant="contained" onClick={() => navigate('/island')}>
            마이섬으로
          </Button>
          <Button variant="outlined" onClick={() => navigate('/shop')}>
            상점으로
          </Button>
        </Stack>
      </GameStage>
    </Box>
  )
}
