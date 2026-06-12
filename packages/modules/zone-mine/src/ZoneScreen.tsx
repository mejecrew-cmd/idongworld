/**
 * 📁 zone-mine/src/ZoneScreen.tsx — 도전의 절벽 zone 진입 화면 (자율 등록 라우트)
 * ───────────────────────────────────────────────
 * 📌 역할: /island/mine 진입 시 zone 화면 표시.
 *           Phase 1.5 시점 — 미니게임 컴포넌트는 Phase 2 디자이너 발주 후 이전.
 *
 * 🔗 연결: routes.tsx (모듈 자율 등록) · i18n/{ko,en}.json
 *           my-island.isZoneUnlocked (Phase 2 gating)
 */
import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const ZoneScreen = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('zone-mine')
  return (
    <Box sx={{ minHeight: '100vh', p: 2 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Button size="small" onClick={() => navigate('/island/full-map')}>{t('back_to_full_map', '← 풀맵')}</Button>
        <Typography variant="h2" sx={{ fontSize: 18, ml: 2 }}>{t('title', '⛏️ 도전의 절벽')}</Typography>
      </Stack>
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body1">{t('placeholder', '미니게임 준비 중')}</Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
          {t('phase_note', 'Phase 2 디자이너 발주 후 활성')}
        </Typography>
      </Box>
    </Box>
  )
}
