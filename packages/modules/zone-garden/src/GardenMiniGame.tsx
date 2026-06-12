/**
 * 📁 zone-garden/src/GardenMiniGame.tsx — 🌱 성장의 정원 (재배)
 * ───────────────────────────────────────────────
 * 📌 역할: 씨앗 심기 → 30초 자라기 → 수확.
 *           Phase 1.5-9 콘텐츠 모듈 첫 시범 — 실 UI 가 모듈 폴더 안.
 *
 * 🔗 연결:
 *   - 주입된 hook — backend zone action API
 *   - 보상: 음식 +2, 코인 +15
 *
 * 💡 진행도에 따라 이모지 변화 (🌱→🌿→🌳→🌾).
 *     host 보상은 backend clear action이 지급한다.
 */
import { useRef, useState } from 'react'
import { Box, Typography, Button, Stack, LinearProgress } from '@mui/material'
import { getHooks } from './config.ts'

const GROW_MS = 30_000  // 30초 (1주차 단순화 — 실제는 분 단위)
const HARVEST_RESOURCES = { acorn: 5 }

function createActionKey(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

export const GardenMiniGame = ({ onClose }: { onClose: () => void }) => {
  const [planted, setPlanted] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const harvestKeyRef = useRef<string | null>(null)

  const onPlant = () => {
    setPlanted(Date.now())
    harvestKeyRef.current = createActionKey('zone-garden:garden-harvest')
    const start = Date.now()
    const tick = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / GROW_MS) * 100)
      setProgress(p)
      if (p >= 100) clearInterval(tick)
    }, 200)
  }

  const onHarvest = () => {
    getHooks().onHarvest?.({
      resources: HARVEST_RESOURCES,
      clearId: 'garden-harvest',
      idempotencyKey: harvestKeyRef.current ?? createActionKey('zone-garden:garden-harvest'),
    })
    setPlanted(null)
    harvestKeyRef.current = null
    setProgress(0)
  }

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h2" sx={{ mb: 2 }}>🌱 성장의 정원</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        씨앗을 심고 30초 기다리면 식물이 자라요.
      </Typography>

      <Box sx={{ fontSize: 100, mb: 2 }}>
        {progress < 30 ? '🌱' : progress < 70 ? '🌿' : progress < 100 ? '🌳' : '🌾'}
      </Box>

      {planted !== null && (
        <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 10, borderRadius: 5 }} />
      )}

      <Stack direction="row" spacing={1} justifyContent="center">
        {planted === null ? (
          <Button variant="contained" onClick={onPlant}>씨앗 심기</Button>
        ) : progress < 100 ? (
          <Button variant="outlined" disabled>자라는 중...</Button>
        ) : (
          <Button variant="contained" color="success" onClick={onHarvest}>수확하기 (🥐 +2 · 🪙 +15)</Button>
        )}
        <Button variant="outlined" onClick={onClose}>닫기</Button>
      </Stack>
    </Box>
  )
}
