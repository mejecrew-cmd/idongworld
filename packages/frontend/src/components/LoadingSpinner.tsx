/**
 * 📁 components/LoadingSpinner.tsx — 공통 로딩 표시
 * ───────────────────────────────────────────────
 * 📌 역할: 시나리오 fetch·일기 로드 등 비동기 작업 시 일관된 로딩 UI.
 *
 * 🔗 사용처: VNPlayer (시나리오 로드 중) · DiaryModal (일기 fetch 중)
 *
 * 💡 초보자 안내:
 *   - fullscreen: true → 화면 전체 덮음 (오버레이)
 *   - 메시지 옵션 — "잠시만요..." 등 잔잔한 톤 (의도문서 정합)
 */
import { Box, CircularProgress, Typography } from '@mui/material'

interface Props {
  message?: string
  fullscreen?: boolean
  size?: number
}

export const LoadingSpinner = ({ message, fullscreen = false, size = 32 }: Props) => {
  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      <CircularProgress size={size} />
      {message && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {message}
        </Typography>
      )}
    </Box>
  )

  if (fullscreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(245,244,239,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    )
  }

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
      {content}
    </Box>
  )
}
