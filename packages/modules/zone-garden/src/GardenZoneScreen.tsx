/**
 * 📁 zone-garden/src/GardenZoneScreen.tsx — 정원 zone 진입 화면 (자율 등록 라우트)
 * ───────────────────────────────────────────────
 * 📌 역할: /island/garden 진입 시 GardenMiniGame 표시.
 *           모듈 routes.tsx 가 본 컴포넌트를 등록.
 *           i18n: 'zone-garden' namespace 사용 (작가 다국어 정착).
 *
 * 🔗 연결:
 *   - GardenMiniGame (본 모듈)
 *   - i18n/{ko,en}.json (namespace 'zone-garden')
 *   - my-island.isZoneUnlocked (Phase 2)
 */
import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GardenMiniGame } from './GardenMiniGame.tsx'

export const GardenZoneScreen = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('zone-garden')
  return (
    <Box sx={{ minHeight: '100vh', p: 2 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Button size="small" onClick={() => navigate('/island/full-map')}>
          {t('back_to_full_map')}
        </Button>
        <Typography variant="h2" sx={{ fontSize: 18, ml: 2 }}>
          {t('title')}
        </Typography>
      </Stack>
      <GardenMiniGame onClose={() => navigate('/island')} />
    </Box>
  )
}
