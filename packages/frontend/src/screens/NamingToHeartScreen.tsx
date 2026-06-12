/**
 * 📁 screens/NamingToHeartScreen.tsx — 06 SOOKSO 이름 짓기
 * ───────────────────────────────────────────────
 * 📌 역할: 호스트 이름 입력. 빈 값이면 "호스트" 기본.
 *           completeOnboarding 호출로 온보딩 완료 마킹 + 기본 zone 해금.
 *
 * 🔗 연결:
 *   - stores/userStore.ts → completeOnboarding(name)
 *   - 다음: /island (마이섬 본 게임)
 *   - 기획 SoT: 모듈/오프닝.md §6 · 모듈/마이섬.md §3-3
 *
 * 💡 초보자 안내:
 *   - maxLength 12자 제한 (UI 깨짐 방지)
 *   - Enter 키로 즉시 확인 가능
 *   - 입력 후 마이섬 진입 시 HUD에 "{호스트명}의 마이섬" 표시
 */
import { useState } from 'react'
import { Box, Typography, Button, TextField } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade } from '@/lib/storeFacades'

export const NamingToHeartScreen = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const onConfirm = () => {
    const trimmed = name.trim() || '호스트'
    accountStoreFacade.completeOnboarding(trimmed)
    navigate('/island')
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(/assets/배경/myisland_harbor_dawn.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <ScreenHeader category="회색섬→하트섬" title="3단계 이름 짓기" overlay />
      <Box
        sx={{
          bgcolor: 'rgba(255,255,255,0.95)',
          p: 4,
          borderRadius: 2,
          textAlign: 'center',
          maxWidth: 480,
          mx: 2,
        }}
      >
        <Typography variant="h2" sx={{ mb: 2 }}>SOOKSO에 이름을 지어주세요</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8 }}>
          이 섬에서 당신은 어떻게 불릴까요?<br />
          (비워두면 "호스트"로 시작해요.)
        </Typography>
        <TextField
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          placeholder="호스트"
          inputProps={{ maxLength: 12 }}
          sx={{ width: '100%', mb: 3 }}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
        />
        <Button variant="contained" size="large" onClick={onConfirm} fullWidth>
          확인
        </Button>
        <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
          06 SOOKSO 이름 · 마이섬 진입
        </Typography>
      </Box>
    </Box>
  )
}
