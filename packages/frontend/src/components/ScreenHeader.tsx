/**
 * 📁 components/ScreenHeader.tsx — 화면 최상단 분류·콘텐츠명 표시
 * ───────────────────────────────────────────────
 * 📌 역할: 모든 화면 최상단에 "분류 · 콘텐츠명" 띠를 표시. 구분·파악 즉시.
 *
 * 🔗 연결:
 *   - 각 화면 컴포넌트가 본문 최상단에 import (명시적·정확한 메타)
 *   - HUD 아래 (MyIsland/Voyage) 또는 최상단 (FullScreen)
 *
 * 💡 초보자 안내:
 *   - category: 분류 (예: "오프닝", "마이섬", "항해")
 *   - title: 콘텐츠명 (예: "1부 잠과 빛", "허브", "이웃섬 보드")
 *   - subtitle (선택): 부가 정보 (예: 진행 단계 1/4)
 *   - 톤: 잔잔·낮은 채도. 게임 흐름 방해 최소.
 */
import { Box, Typography, Chip, IconButton } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const COMMON_UI_ASSET = '/assets/ui/common'

interface ScreenHeaderProps {
  category: string
  title: string
  subtitle?: string
  /** 풀스크린 시네마틱 위에 띄울 때 true — 반투명 흰 텍스트 */
  overlay?: boolean
  showBack?: boolean
  backTo?: string
}

export const ScreenHeader = ({
  category,
  title,
  subtitle,
  overlay = false,
  showBack = false,
  backTo = '/island',
}: ScreenHeaderProps) => {
  const navigate = useNavigate()
  const bg = overlay ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.85)'
  const color = overlay ? 'rgba(255,255,255,0.95)' : 'text.primary'
  const chipBg = overlay ? 'rgba(255,255,255,0.18)' : 'primary.main'
  const chipColor = overlay ? 'white' : 'primary.contrastText'
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(backTo)
  }

  return (
    <Box
      sx={{
        position: overlay ? 'absolute' : 'sticky',
        top: 0,
        width: '100%',
        maxWidth: GAME_STAGE_WIDTH,
        mx: 'auto',
        zIndex: 10,
        bgcolor: bg,
        backdropFilter: 'blur(6px)',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: 0,
        borderBottom: overlay ? 'none' : '1px solid rgba(0,0,0,0.08)',
        pointerEvents: 'none', // 클릭 통과 (오프닝 시퀀스 등)
      }}
    >
      {showBack && (
        <IconButton
          aria-label="뒤로가기"
          size="small"
          onClick={goBack}
          sx={{
            width: 44,
            height: 44,
            flex: '0 0 auto',
            color: 'transparent',
            bgcolor: 'transparent',
            backgroundImage: `url(${COMMON_UI_ASSET}/BtnBack.png)`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            border: 0,
            pointerEvents: 'auto',
            '&:hover': {
              bgcolor: 'transparent',
              transform: 'translateX(-1px)',
            },
          }}
        >
          ‹
        </IconButton>
      )}
      <Chip
        size="small"
        label={category}
        sx={{
          bgcolor: chipBg,
          color: chipColor,
          fontWeight: 600,
          letterSpacing: 0.5,
          flex: '0 0 auto',
        }}
      />
      <Typography
        variant="subtitle1"
        sx={{ color, fontWeight: 500, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}
