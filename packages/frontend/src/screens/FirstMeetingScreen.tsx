/**
 * 📁 screens/FirstMeetingScreen.tsx — 03 첫 만남 (가챠 → 영입 → 정착)
 * ───────────────────────────────────────────────
 * 📌 역할: 본진 5명 중 1명 가챠 픽 후, 영입 시나리오 → 정착 컷까지 통합.
 *           내부 stage 전환 (intro → cutscene → recruit → settle → 다음 화면).
 *
 * 🔗 연결:
 *   - 기획 SoT: 모듈/가챠.md v0.2 (1회 무료 + BM)
 *   - @idongworld/gacha (firstGachaPick · FIRST_GACHA_POOL)
 *   - @idongworld/vn-runner (VNPlayer)
 *   - 시나리오: cutscene_first_gacha → recruit_X → settle_X
 *   - 다음: /heart-island/first (회색→하트섬 도착)
 *
 * 💡 초보자 안내:
 *   - 가챠 풀·픽 로직은 @idongworld/gacha 시스템 모듈 소관 (헌법 §6.2)
 *   - 단계별 VNPlayer 렌더 (onComplete로 다음 단계 전환)
 *   - 영입 정착 후 → 04 하트섬 도착 (회색→하트 변환 시퀀스)
 */
import { useState } from 'react'
import { Box, Typography, Button, Fade } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { VNPlayer } from '@idongworld/vn-runner'
import { firstGachaPick, type GachaResult } from '@idongworld/gacha'
import type { AidongCharacterId } from '@/stores/userStore'
import { ScreenHeader } from '@/components/ScreenHeader'

type Stage = 'intro' | 'cutscene' | 'recruit'

export const FirstMeetingScreen = () => {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('intro')
  const [picked, setPicked] = useState<GachaResult | null>(null)

  const startGacha = () => {
    // 가챠 시스템 모듈에 픽 위임 — 시도 카운트는 gachaBootstrap onAttempt 가 처리
    setPicked(firstGachaPick())
    setStage('cutscene')
  }

  const onGachaComplete = () => {
    setStage('recruit')
  }

  const onRecruitComplete = () => {
    // 2026-05-13 흐름 재구성: settle 컷 스킵 → /opening/part2 (배·상륙·폐허·숙소 유도)
    // settle_X 시나리오는 파일 보존 (PM 결정 후 마이섬 첫 진입 등 다른 위치에 재배치 예정)
    navigate('/opening/part2')
  }

  const stageLabel = stage === 'intro'
    ? '구해주기 직후'
    : stage === 'cutscene'
      ? '드러나는 1명'
      : '영입 시나리오'

  if ((stage === 'cutscene' || stage === 'recruit') && picked) {
    return (
      <Box sx={{ position: 'relative', minHeight: '100vh' }}>
        <ScreenHeader category="첫 만남" title={stageLabel} subtitle={picked.characterId} overlay />
        {stage === 'cutscene' && (
          <VNPlayer
            scenarioId="cutscene_first_gacha"
            context={{
              result: {
                characterId: picked.characterId as AidongCharacterId,
                scenarioId: picked.scenarioId,
              },
            }}
            onComplete={onGachaComplete}
          />
        )}
        {stage === 'recruit' && (
          <VNPlayer scenarioId={`recruit_${picked.scenarioId}`} onComplete={onRecruitComplete} />
        )}
      </Box>
    )
  }

  // intro
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(/assets/배경/ocean_dusk.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <ScreenHeader category="첫 만남" title="구해주기 직후" overlay />
      <Fade in timeout={1200}>
        <Box
          sx={{
            bgcolor: 'rgba(0,0,0,0.6)',
            color: 'white',
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
            maxWidth: 480,
            mx: 2,
          }}
        >
          <Typography variant="h2" sx={{ mb: 1 }}>어푸어푸…</Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, mb: 3, lineHeight: 1.8 }}>
            가까이 다가가 보니
            <br />
            작은 친구 하나가 파도 사이에 있어요.
          </Typography>
          <Button variant="contained" size="large" onClick={startGacha}>
            구해주기
          </Button>
        </Box>
      </Fade>
    </Box>
  )
}
