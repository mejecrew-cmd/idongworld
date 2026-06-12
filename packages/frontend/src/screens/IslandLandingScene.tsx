/**
 * 📁 screens/IslandLandingScene.tsx — 11 섬 상륙 (캐릭터 영입)
 * ───────────────────────────────────────────────
 * 📌 역할: 부루마블 보드의 캐릭터 칸 도착 시 진입.
 *           recruit_X → settle_X 시나리오 재생 → 보드 복귀.
 *
 * 🔗 연결:
 *   - URL 파라미터: /voyage/island/{캐릭터}/landing
 *   - @idongworld/vn-runner (VNPlayer)
 *   - 시나리오: recruit_{x}.json + settle_{x}.json
 *   - 다음: /voyage/board (보드 복귀)
 *
 * 💡 초보자 안내:
 *   - useParams로 URL의 :id 추출 (예: '황금멍')
 *   - getScenarioId 가 풀 외 ID 를 undefined 반환 → 가드 분기로 안전
 *   - stage 'recruit' → 'settle' 전환 (onComplete 콜백)
 */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { VNPlayer } from '@idongworld/vn-runner'
import { getScenarioId } from '@idongworld/gacha'
import { Box, Typography, Button } from '@mui/material'
import { ScreenHeader } from '@/components/ScreenHeader'

export const IslandLandingScene = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [stage, setStage] = useState<'recruit' | 'settle' | 'done'>('recruit')

  // 풀 외 캐릭터·미해석 ID 방어 — gacha 풀(getScenarioId)이 단일 진실 소스
  const scenarioBase = id ? getScenarioId(id) : undefined
  if (!scenarioBase) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>알 수 없는 섬</Typography>
        <Button onClick={() => navigate('/voyage/board')}>보드로</Button>
      </Box>
    )
  }

  const stageLabel = stage === 'recruit' ? '영입 시나리오' : '정착 컷'
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <ScreenHeader category="항해 · 섬 상륙" title={stageLabel} subtitle={id} overlay />
      {stage === 'recruit' && (
        <VNPlayer
          scenarioId={`recruit_${scenarioBase}`}
          onComplete={() => setStage('settle')}
        />
      )}
      {stage === 'settle' && (
        <VNPlayer
          scenarioId={`settle_${scenarioBase}`}
          onComplete={() => navigate('/voyage/board')}
        />
      )}
    </Box>
  )
}
