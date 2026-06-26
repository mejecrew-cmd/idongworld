/**
 * packages/frontend/src/screens/DebutStageScene.tsx
 * ------------------------------------------------------------
 * 역할: Aidong의 데뷔 공연 placeholder를 진행하고 결과 payload와 포토카드 후보를 만든다.
 * 연결: `/stage/debut/:id` route, `StageScreen`, `MyRoomScreen` 콜렉션 placeholder 흐름이 이 화면을 통과한다.
 * 주의: M4에서는 실제 backend 결과 저장, 이미지 생성, SUNO, 고품질 포토카드 제작을 하지 않는다.
 */
import { useState } from 'react'
import { Box, Typography, Button, Stack, Chip, LinearProgress, Fade } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from '@/components/AidongSprite'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SIGNATURES } from '@/data/signatures'
import { hostStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'

const PHOTOCARD_PLACEHOLDER_STORAGE_KEY = 'idongworld-photocard-placeholders'

const STEPS = [
  { id: 'practice', label: '연습', emoji: '📚' },
  { id: 'pose', label: '포즈', emoji: '💃' },
  { id: 'rehearsal', label: '리허설', emoji: '🎭' },
  { id: 'makeup', label: '메이크업', emoji: '💄' },
  { id: 'stage', label: '무대', emoji: '🎤' },
]

const BG_BY_ZONE: Record<string, string> = {
  sunny_meadow: '03_Home_01.png',
  moonlit_stage: '03_Home_05.png',
  workshop_honey: '03_Home_02.png',
  maple_grove_dawn: '03_Home_04.png',
  red_dusk_stage: '03_Home_03.png',
}

type DebutGrade = 'S' | 'A' | 'B' | 'C'

type DebutResultPayload = {
  resultId: string
  characterId: AidongCharacterId
  stageRoute: string
  score: number
  grade: DebutGrade
  affinityDelta: number
  coinReward: number
  signature: {
    itemId: string
    name: string
    emoji: string
    bonus: number
    zone: string
  }
  photocardCandidate: {
    candidateId: string
    status: 'placeholder'
    generationRouteCandidate: '/island/lodge/myroom/collection/photocard/new'
    galleryRouteCandidate: '/island/lodge/myroom/collection/photocard'
  }
  generatedAt: number
}

function gradeFromScore(score: number): DebutGrade {
  if (score >= 20) return 'S'
  if (score >= 15) return 'A'
  if (score >= 10) return 'B'
  return 'C'
}

function readStoredPhotocardPlaceholders(): DebutResultPayload[] {
  try {
    const raw = window.sessionStorage.getItem(PHOTOCARD_PLACEHOLDER_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as DebutResultPayload[] : []
  } catch {
    return []
  }
}

function storePhotocardPlaceholder(result: DebutResultPayload) {
  const existing = readStoredPhotocardPlaceholders()
  const next = [result, ...existing.filter((item) => item.resultId !== result.resultId)].slice(0, 20)
  window.sessionStorage.setItem(PHOTOCARD_PLACEHOLDER_STORAGE_KEY, JSON.stringify(next))
}

export const DebutStageScene = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const equippedOutfit = myAidongStoreFacade.useEquippedOutfit()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [score, setScore] = useState(0)
  const [resultPayload, setResultPayload] = useState<DebutResultPayload | null>(null)

  const characterId = id as AidongCharacterId
  if (!characterId || !recruitedAidongs.includes(characterId)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>아직 영입하지 않은 친구의 데뷔는 진행할 수 없어요.</Typography>
        <Button onClick={() => navigate('/stage')} sx={{ mt: 2 }}>대표 무대로</Button>
      </Box>
    )
  }
  const sig = SIGNATURES[characterId]
  const bg = BG_BY_ZONE[sig.zone] ?? '01_TitleBG.png'

  const buildResultPayload = (finalScore: number): DebutResultPayload => {
    const generatedAt = Date.now()
    const resultId = `debut-${characterId}-${generatedAt}`
    return {
      resultId,
      characterId,
      stageRoute: `/stage/debut/${characterId}`,
      score: finalScore,
      grade: gradeFromScore(finalScore),
      affinityDelta: 5,
      coinReward: finalScore * 5,
      signature: {
        itemId: sig.itemId,
        name: sig.name,
        emoji: sig.emoji,
        bonus: sig.bonus,
        zone: sig.zone,
      },
      photocardCandidate: {
        candidateId: `photocard-${resultId}`,
        status: 'placeholder',
        generationRouteCandidate: '/island/lodge/myroom/collection/photocard/new',
        galleryRouteCandidate: '/island/lodge/myroom/collection/photocard',
      },
      generatedAt,
    }
  }

  const onTap = () => {
    if (done) return
    if (step < STEPS.length - 1) {
      const stepScore = 1 + Math.floor(Math.random() * 3)
      setScore((s) => s + stepScore)
      setStep(step + 1)
    } else {
      const finalScore = score + sig.bonus
      const result = buildResultPayload(finalScore)
      myAidongStoreFacade.addAffinity(characterId, result.affinityDelta)
      hostStoreFacade.rewardCoins(result.coinReward)
      setScore(finalScore)
      setResultPayload(result)
      setDone(true)
    }
  }

  const moveToCollection = () => {
    if (resultPayload) storePhotocardPlaceholder(resultPayload)
    navigate('/island/lodge/myroom/collection', {
      state: {
        focus: 'photocard-placeholder',
        debutResult: resultPayload,
      },
    })
  }

  return (
    <Box
      onClick={onTap}
      sx={{
        minHeight: '100vh',
        backgroundImage: `url(/assets/backgrounds/${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        cursor: done ? 'default' : 'pointer',
      }}
    >
      <ScreenHeader category="데뷔 스테이지" title={characterId} subtitle={sig.zone} overlay />
      <Box sx={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Chip label={`데뷔 스테이지 · ${sig.zone}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.9)' }} />
        <Button size="small" variant="contained" color="inherit" onClick={(e) => { e.stopPropagation(); navigate('/stage') }}>
          대표 무대
        </Button>
      </Box>

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

      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          bgcolor: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          p: 3,
          maxWidth: 660,
          mx: 'auto',
        }}
        onClick={(event) => event.stopPropagation()}
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
                {step === 4 && '무대 위로! 탭하면 시그니처가 발화됩니다.'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                점수 {score} · 시그니처: {sig.emoji} {sig.name} · 보정 +{sig.bonus}
              </Typography>
              <Button variant="contained" fullWidth onClick={onTap} sx={{ mt: 2 }}>
                {step < STEPS.length - 1 ? '다음 단계' : '시그니처 발화'}
              </Button>
            </Box>
          </Fade>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" sx={{ fontSize: 22, mb: 1 }}>데뷔 완료</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>{characterId}</strong>의 {sig.name}이(가) 빛났어요.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip color="primary" label={`등급 ${resultPayload?.grade ?? gradeFromScore(score)}`} />
              <Chip label={`점수 ${score}`} />
              <Chip label={`친밀도 +${resultPayload?.affinityDelta ?? 5}`} />
              <Chip label={`코인 +${resultPayload?.coinReward ?? score * 5}`} />
            </Stack>
            <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5, mb: 2, textAlign: 'left' }}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>포토카드 placeholder 후보</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                후보 ID: {resultPayload?.photocardCandidate.candidateId ?? 'pending'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                정식 이미지 생성과 고품질 카드 제작은 6월 컷라인 밖으로 두고, 지금은 콜렉션에 후보만 표시합니다.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button variant="contained" onClick={moveToCollection} sx={{ flex: '1 1 180px' }}>
                포토카드 후보 보기
              </Button>
              <Button variant="outlined" onClick={() => navigate('/stage')} sx={{ flex: '1 1 160px' }}>
                대표 무대
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  )
}
