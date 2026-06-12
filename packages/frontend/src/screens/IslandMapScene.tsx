/**
 * 📁 screens/IslandMapScene.tsx — 10 섬 맵 (예비 — Phase 2)
 * ───────────────────────────────────────────────
 * 📌 역할: 항해 보드 칸 도착 시 섬 맵 보기 (구름 로딩 패턴).
 *           1주차 placeholder. Phase 2에서 Hero of Kingdom 줌인 패턴 적용.
 *
 * 🔗 연결:
 *   - 기획 SoT: 모듈/섬지도.md v0.1
 *   - 와이어프레임: 10_island_map.html
 *
 * 💡 초보자 안내:
 *   - 현재 placeholder. recruit 시 11 IslandLandingScene 직행이라 미사용.
 *   - Phase 2에 자원섬·아이동섬 줌인 인터랙션 구현 예정.
 */
import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'

export const IslandMapScene = () => {
  const { id } = useParams()
  return (
  <Box sx={{ p: 4, textAlign: 'center' }}>
    <ScreenHeader category="항해" title="섬 맵" subtitle={id ?? ''} />
    <Typography variant="h1" sx={{ mb: 2, mt: 6 }}>10 섬 맵</Typography>
    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
      placeholder · Phase 2에서 Hero of Kingdom 줌인 패턴 구현 예정
    </Typography>
  </Box>
  )
}
