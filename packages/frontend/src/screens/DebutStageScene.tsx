/**
 * 📁 screens/DebutStageScene.tsx — 데뷔 스테이지 (시그니처 발화)
 * ───────────────────────────────────────────────
 * 📌 역할: 캐릭터의 시그니처 아이템을 5단계 시퀀스로 발화.
 *           무대 zone에 맞는 배경 + 시그니처 이모지 bob 애니.
 *
 * 🔗 연결:
 *   - data/signatures.ts → 5명 시그니처 카탈로그
 *   - 능력치파라메터.md §데뷔 보정 (피지컬 + 페르소나 점수)
 *   - 진입: HubHeartScene "✨ {캐릭터} 데뷔" 버튼
 *
 * 💡 초보자 안내:
 *   - 5단계: 📚 연습 → 💃 포즈 → 🎭 리허설 → 💄 메이크업 → 🎤 무대
 *   - 각 단계 탭 → 점수 +1~3
 *   - 마지막 단계 → 시그니처 발화 → 친밀도 +5 / 코인 +(score×5)
 *   - BG_BY_ZONE: 시그니처 zone에 맞는 배경 PNG 매핑
 */
import { useState } from 'react'
import { Box, Typography, Button, Stack, Chip, LinearProgress, Fade } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from '@/components/AidongSprite'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SIGNATURES } from '@/data/signatures'
import { hostStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'

const STEPS = [
  { id: 'practice', label: '연습', emoji: '📚' },
  { id: 'pose', label: '포즈', emoji: '💃' },
  { id: 'rehearsal', label: '리허설', emoji: '🎭' },
  { id: 'makeup', label: '메이크업', emoji: '💄' },
  { id: 'stage', label: '무대', emoji: '🎤' },
]

const BG_BY_ZONE: Record<string, string> = {
  sunny_meadow: 'island_sunny_meadow.png',
  moonlit_stage: 'island_moonlit_stage.png',
  workshop_honey: 'island_workshop_honey.png',
  maple_grove_dawn: 'island_maple_grove_dawn.png',
  red_dusk_stage: 'island_red_dusk_stage.png',
}

export const DebutStageScene = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const equippedOutfit = myAidongStoreFacade.useEquippedOutfit()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [score, setScore] = useState(0)

  const characterId = id as AidongCharacterId
  if (!characterId || !recruitedAidongs.includes(characterId)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>아직 영입하지 않은 친구의 데뷔는 진행할 수 없어요.</Typography>
        <Button onClick={() => navigate('/island')} sx={{ mt: 2 }}>마이섬으로</Button>
      </Box>
    )
  }
  const sig = SIGNATURES[characterId]
  const bg = BG_BY_ZONE[sig.zone] ?? 'ocean_dawn_warm.png'

  const onTap = () => {
    if (done) return
    if (step < STEPS.length - 1) {
      // 각 단계 점수 (랜덤 +1~3)
      const stepScore = 1 + Math.floor(Math.random() * 3)
      setScore((s) => s + stepScore)
      setStep(step + 1)
    } else {
      // 무대 마지막 — 데뷔 완료
      const finalScore = score + sig.bonus
      myAidongStoreFacade.addAffinity(characterId, 5)
      hostStoreFacade.rewardCoins(finalScore * 5)
      setScore(finalScore)
      setDone(true)
    }
  }

  return (
    <Box
      onClick={onTap}
      sx={{
        minHeight: '100vh',
        backgroundImage: `url(/assets/배경/${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <ScreenHeader category="데뷔 스테이지" title={characterId} subtitle={sig.zone} overlay />
      {/* 헤더 */}
      <Box sx={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Chip label={`데뷔 스테이지 · ${sig.zone}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }} />
        <Button size="small" variant="contained" color="inherit" onClick={(e) => { e.stopPropagation(); navigate('/island') }}>
          나가기
        </Button>
      </Box>

      {/* 캐릭터 + 시그니처 */}
      <Box sx={{ position: 'absolute', bottom: '30%', left: '50%', transform: 'translateX(-50%)' }}>
        <AidongSprite
          character={characterId}
          expression={done ? 'happy' : 'surprised'}
          outfit={equippedOutfit[characterId]}
          size={280}
        />
        <Typography sx={{ textAlign: 'center', fontSize: 56, mt: -4, animation: 'bob 1.5s ease infinite', '@keyframes bob': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } } }}>
          {sig.emoji}
        </Typography>
      </Box>

      {/* 하단 패널 */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          bgcolor: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          p: 3,
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        {!done ? (
          <Fade in key={step}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ mb: 1, overflowX: 'auto' }}>
                {STEPS.map((s, i) => (
                  <Chip
                    key={s.id}
                    label={`${s.emoji} ${s.label}`}
                    size="small"
                    color={i === step ? 'primary' : i < step ? 'success' : 'default'}
                    variant={i === step ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
              <Typography variant="h2" sx={{ fontSize: 18, mb: 0.5 }}>
                {STEPS[step]!.emoji} {STEPS[step]!.label}
              </Typography>
              <LinearProgress variant="determinate" value={((step + 1) / STEPS.length) * 100} sx={{ mb: 2, height: 8, borderRadius: 4 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {step === 0 && '몇 마디 음을 잡아봐요.'}
                {step === 1 && '시그니처 동작을 잡아봐요.'}
                {step === 2 && '한 번 처음부터 끝까지.'}
                {step === 3 && '거울 앞에서 마지막 점검.'}
                {step === 4 && '무대 위로! (탭으로 시그니처 발화)'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                점수 {score} · 시그니처: {sig.emoji} {sig.name} · 보정 +{sig.bonus}
              </Typography>
              <Button variant="contained" fullWidth onClick={(e) => { e.stopPropagation(); onTap() }} sx={{ mt: 2 }}>
                {step < STEPS.length - 1 ? '다음 단계' : '🎤 시그니처 발화!'}
              </Button>
            </Box>
          </Fade>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" sx={{ fontSize: 22, mb: 1 }}>✨ 데뷔 완료!</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>{characterId}</strong>의 {sig.name}이(가) 빛났어요.
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              점수 {score} · 친밀도 +5 · 코인 +{score * 5}
            </Typography>
            <Button variant="contained" fullWidth onClick={(e) => { e.stopPropagation(); navigate('/island') }}>
              마이섬 복귀
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
