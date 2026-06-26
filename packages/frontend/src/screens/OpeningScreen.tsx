/**
 * 📁 screens/OpeningScreen.tsx — 02 오프닝 (잠·빛·흔들림·망망대해·선택)
 * ───────────────────────────────────────────────
 * 📌 역할: 브리핑_프롤로그 산문 4단을 선택지 시퀀스로 재현.
 *           각 단계마다 선택지 2개를 보여주고, 선택 내용은 임시 state에만 기록한다.
 *
 * 🔗 연결:
 *   - 기획 SoT: 브리핑_프롤로그.md (I·II·III·IV) + 모듈/오프닝.md v0.2
 *   - 완료/skip → /title
 *
 * 💡 초보자 안내:
 *   - 4단계: light_window → swaying → apuapu → choice
 *   - 현재 선택 기록은 DB에 저장하지 않는다. 다음 화면으로 넘어가면 사라져도 된다.
 */
import { useRef, useState } from 'react'
import { Box, Typography, Button, Fade, Stack } from '@mui/material'
import { Navigate, useNavigate } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { accountStoreFacade } from '@/lib/storeFacades'
import { api } from '@/lib/api'

const STAGE_LABELS: Record<string, string> = {
  light_window: '1부 · 잠과 빛의 경계',
  swaying: '2부 · 흔들림',
  apuapu: '3부 · 망망대해',
  choice: '4부 · 선택',
}

type StageId = 'light_window' | 'swaying' | 'apuapu' | 'choice'

interface Stage {
  id: StageId
  text: string
  bg: string
  choices: Array<{
    id: string
    label: string
  }>
}

const STAGES: Stage[] = [
  {
    id: 'light_window',
    text:
      '문득 잠에서 깨었을 때,\n어둠 속에서 여전히 나를 바라보고 미소 짓던 그 빛.\n\n유리창의 빛보석들이\n어쩌면 바다의 윤슬 같다고 느끼며…\n\n다시 스르르 잠들며.',
    bg: 'ocean_dawn_warm.png',
    choices: [
      { id: 'watch_light', label: '빛을 조금 더 바라본다' },
      { id: 'close_eyes', label: '눈을 감고 다시 숨을 고른다' },
    ],
  },
  {
    id: 'swaying',
    text:
      '기분 좋은 흔들림이 느껴졌어요.\n\n가만히 뜬 눈에 여전히 반짝이는 빛조각들.\n그리고 바다.\n\n바다!!!',
    bg: 'ocean_dusk.png',
    choices: [
      { id: 'stand_up', label: '벌떡 일어나 주변을 본다' },
      { id: 'hold_edge', label: '흔들림을 붙잡고 버틴다' },
    ],
  },
  {
    id: 'apuapu',
    text:
      '바다 냄새!\n파도에 반짝이는 빛조각!\n사방이 망망대해!\n\n거기에 — 저기 어푸어푸거리는 건 뭐야?',
    bg: 'ocean_dusk_glow.png',
    choices: [
      { id: 'call_out', label: '소리쳐 불러본다' },
      { id: 'look_closer', label: '눈을 가늘게 뜨고 살핀다' },
    ],
  },
  {
    id: 'choice',
    text:
      '파도 사이에서 작은 손짓이 보였어요.\n\n아직 이름도 모르는 누군가가\n이쪽을 향해 반짝이는 눈으로 바라보고 있었죠.',
    bg: 'ocean_dusk_glow.png',
    choices: [
      { id: 'reach_out', label: '손을 뻗는다' },
      { id: 'throw_rope', label: '줄을 던져 끌어올린다' },
    ],
  },
]

interface OpeningChoiceLog {
  stageId: StageId
  choiceId: string
}

export const OpeningScreen = () => {
  const navigate = useNavigate()
  const firebaseUid = accountStoreFacade.useFirebaseUid()
  const openingSeen = accountStoreFacade.useOpeningSeen()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const [stage, setStage] = useState(0)
  const choiceLogRef = useRef<OpeningChoiceLog[]>([])

  if (onboardingComplete || openingSeen) {
    return <Navigate to="/title" replace />
  }

  const cur = STAGES[stage]!

  const completeOpening = () => {
    // 지금은 choiceLog를 DB에 저장하지 않는다.
    // 추후 성향/튜토리얼 분기 등에 사용할 때 이 지점에서 저장 API를 추가한다.
    void choiceLogRef.current
    accountStoreFacade.setOpeningSeen(true)
    if (firebaseUid) {
      void api.patchAccountState(firebaseUid, { openingSeen: true })
        .catch((error) => console.warn('[opening] failed to mark opening as seen', error))
    }
    navigate('/title', { replace: true })
  }

  const handleChoice = (choiceId: string) => {
    const nextLog = [...choiceLogRef.current, { stageId: cur.id, choiceId }]
    choiceLogRef.current = nextLog
    if (stage < STAGES.length - 1) {
      setStage(stage + 1)
      return
    }
    completeOpening()
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(/assets/배경/${cur.bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 1s',
      }}
    >
      <Button
        variant="outlined"
        onClick={completeOpening}
        sx={{
          position: 'absolute',
          top: 18,
          right: 18,
          zIndex: 3,
          bgcolor: 'rgba(255,255,255,0.88)',
        }}
      >
        skip
      </Button>
      <ScreenHeader
        category="오프닝"
        title={STAGE_LABELS[cur.id] ?? cur.id}
        subtitle={`${stage + 1} / ${STAGES.length}`}
        overlay
      />
      <Fade in key={cur.id} timeout={1200}>
        <Box
          sx={{
            bgcolor: 'rgba(0,0,0,0.55)',
            color: 'white',
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
            maxWidth: 520,
            mx: 2,
          }}
        >
          <Typography variant="h4" sx={{ whiteSpace: 'pre-line', mb: 3, lineHeight: 1.8 }}>
            {cur.text}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
            02 오프닝 · {stage + 1} / {STAGES.length}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            {cur.choices.map((choice) => (
              <Button
                key={choice.id}
                variant={choice.id === cur.choices[0]?.id ? 'contained' : 'outlined'}
                size="large"
                sx={{
                  color: choice.id === cur.choices[0]?.id ? undefined : 'white',
                  borderColor: choice.id === cur.choices[0]?.id ? undefined : 'rgba(255,255,255,0.6)',
                }}
                onClick={(e) => { e.stopPropagation(); handleChoice(choice.id) }}
              >
                {choice.label}
              </Button>
            ))}
          </Stack>
        </Box>
      </Fade>
    </Box>
  )
}
