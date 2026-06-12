/**
 * 📁 route-neighbor/src/ZoneScreen.tsx — 이웃섬 항로 진입 (모듈 자율 라우트 placeholder)
 * ───────────────────────────────────────────────
 * 📌 역할: 현재 NavigationBoardScene (frontend) 가 보드 실 UI 보유.
 *           본 화면은 모듈 라우트 등록 시범 — Phase 2 NavigationBoardScene 이전 시 대체.
 *
 * 🔗 연결: routes.tsx · i18n/{ko,en}.json
 */
import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export const ZoneScreen = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('route-neighbor')
  return (
    <Box sx={{ minHeight: '100vh', p: 2 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Button size="small" onClick={() => navigate('/island/harbor')}>
          {t('back_to_harbor', '← 항구')}
        </Button>
        <Typography variant="h2" sx={{ fontSize: 18, ml: 2 }}>
          {t('title', '🚢 이웃섬 항로')}
        </Typography>
      </Stack>
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body1">{t('placeholder', '항해 보드는 /voyage/board 에서')}</Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/voyage/board?route=neighbor')}>
          {t('cta_to_board', '보드로 진입')}
        </Button>
      </Box>
    </Box>
  )
}
