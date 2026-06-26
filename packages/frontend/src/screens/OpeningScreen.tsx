/**
 * 📁 screens/OpeningScreen.tsx — 02 오프닝 (잠·빛·흔들림·망망대해·선택)
 * ───────────────────────────────────────────────
 * 📌 역할: 브리핑_프롤로그 산문 4단을 시퀀스로 재현.
 *           1~3단계는 클릭으로 진행, 4단계는 [구해주기]/[그냥 지나가기] 선택지.
 *
 * 🔗 연결:
 *   - 기획 SoT: 브리핑_프롤로그.md (I·II·III·IV) + 모듈/오프닝.md v0.2
 *   - [구해주기] → /first-meeting (최초 아이동 지급 = cutscene_first_gacha → recruit → settle)
 *   - [그냥 지나가기] → III. 망망대해 회귀 (소프트 강제, 첫 의식 한 번)
 *
 * 💡 초보자 안내:
 *   - 4단계: light_window → swaying → apuapu → choice
 *   - choice 단계는 클릭 진행 X. 두 선택지 중 하나 명시적 선택 필수.
 *   - PM 의도: "그냥 지나가기"는 결국 다시 어푸어푸로 — 의식의 일회성 보장.
 */
import { useEffect, useState } from 'react'
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
}

const STAGES: Stage[] = [
  {
    id: 'light_window',
    text:
      '문득 잠에서 깨었을 때,\n어둠 속에서 여전히 나를 바라보고 미소 짓던 그 빛.\n\n유리창의 빛보석들이\n어쩌면 바다의 윤슬 같다고 느끼며…\n\n다시 스르르 잠들며.',
    bg: '01_TitleBG.png',
  },
  {
    id: 'swaying',
    text:
      '기분 좋은 흔들림이 느껴졌어요.\n\n가만히 뜬 눈에 여전히 반짝이는 빛조각들.\n그리고 바다.\n\n바다!!!',
    bg: '04_Sea.png',
  },
  {
    id: 'apuapu',
    text:
      '바다 냄새!\n파도에 반짝이는 빛조각!\n사방이 망망대해!\n\n거기에 — 저기 어푸어푸거리는 건 뭐야?',
    bg: '04_Sea.png',
  },
  {
    id: 'choice',
    text: '',
    bg: '04_Sea.png',
  },
]

export const OpeningScreen = () => {
  const navigate = useNavigate()
  const firebaseUid = accountStoreFacade.useFirebaseUid()
  const openingSeen = accountStoreFacade.useOpeningSeen()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const [stage, setStage] = useState(0)
  const [bypassedOnce, setBypassedOnce] = useState(false)

  useEffect(() => {
    if (!firebaseUid || openingSeen || onboardingComplete) return
    void api.patchAccountState(firebaseUid, { openingSeen: true })
      .catch((error) => console.warn('[opening] failed to mark opening as seen', error))
  }, [firebaseUid, onboardingComplete, openingSeen])

  if (onboardingComplete || openingSeen) {
    return <Navigate to="/island" replace />
  }

  const cur = STAGES[stage]!
  const isChoice = cur.id === 'choice'

  const handleNext = () => {
    if (isChoice) return // choice 에선 클릭 진행 X
    if (stage < STAGES.length - 1) setStage(stage + 1)
  }

  const handleRescue = () => {
    // 구해주기 — 최초 아이동 지급 (cutscene_first_gacha → recruit → settle)
    navigate('/first-meeting')
  }

  const handleBypass = () => {
    // 그냥 지나가기 — III. 망망대해 회귀
    setBypassedOnce(true)
    setStage(2) // apuapu
  }

  return (
    <Box
      onClick={handleNext}
      sx={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(/assets/backgrounds/${cur.bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        cursor: isChoice ? 'default' : 'pointer',
        transition: 'background-image 1s',
      }}
    >
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
          {isChoice ? (
            <>
              {bypassedOnce && (
                <Typography variant="body1" sx={{ mb: 3, opacity: 0.85, fontStyle: 'italic' }}>
                  물결이 다시 가까이 다가왔어요…
                </Typography>
              )}
              <Typography variant="h4" sx={{ mb: 4, lineHeight: 1.6 }}>
                구해줄까?
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  onClick={(e) => { e.stopPropagation(); handleRescue() }}
                >
                  구해주기
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}
                  onClick={(e) => { e.stopPropagation(); handleBypass() }}
                >
                  그냥 지나가기
                </Button>
              </Stack>
              <Typography variant="body2" sx={{ opacity: 0.6, mt: 3 }}>
                02 오프닝 · 선택
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h4" sx={{ whiteSpace: 'pre-line', mb: 3, lineHeight: 1.8 }}>
                {cur.text}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
                02 오프닝 · {stage + 1} / {STAGES.length}
              </Typography>
              <Button variant="contained" onClick={(e) => { e.stopPropagation(); handleNext() }}>
                다음
              </Button>
            </>
          )}
        </Box>
      </Fade>
    </Box>
  )
}
