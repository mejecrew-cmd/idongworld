/**
 * 📁 screens/HeartIslandFirstScreen.tsx — 폐허 숙소터 도착 (회색 = 빛 잃은 하트섬)
 * ───────────────────────────────────────────────
 * 📌 역할: 오프닝 2부 끝 — 폐허 숙소터 첫 인상.
 *           회색섬 = 하트섬이 빛을 잃은 상태 (PM 결정 2026-05-13). 같은 섬.
 *           색 회복은 청소·이름 의식 후 (다음 화면). 본 화면은 회색·폐허만 강조.
 *
 * 🔗 연결:
 *   - 기획 SoT: 모듈/마이섬.md §3 + 의도문서 §4
 *   - 이전: /opening/part2 (배·상륙·폐허·숙소 유도)
 *   - 다음: /heart-island/cleaning (24h 게이지 + 같이 돕기 + 14구역 둘러보기)
 *
 * 💡 초보자 안내:
 *   - 색 회복은 청소·이름 의식 모두 끝낸 후 /island 진입 시점.
 *   - 본 화면은 단일 phase: gray (폐허 인식)
 */
import { Box, Typography, Button, Fade } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'

export const HeartIslandFirstScreen = () => {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(/assets/배경/myisland_harbor_dawn.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        filter: 'grayscale(100%) brightness(0.6)',
      }}
    >
      <ScreenHeader category="회색섬→하트섬" title="1단계 폐허 숙소터 도착" overlay />
      <Fade in timeout={1500}>
        <Box
          sx={{
            bgcolor: 'rgba(255,255,255,0.92)',
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
            maxWidth: 480,
            mx: 2,
          }}
        >
          <Typography variant="h2" sx={{ mb: 2 }}>
            폐허 숙소터.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {`이 섬은 빛을 잃은 하트섬.\n청소를 마치고 이름을 짓고 나면\n다시 색이 돌아온대요.`}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/heart-island/cleaning')}>
            청소 자리로 가기
          </Button>
        </Box>
      </Fade>
    </Box>
  )
}
