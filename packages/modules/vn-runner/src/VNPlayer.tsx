/**
 * 📁 vn-runner/src/VNPlayer.tsx — 비주얼노벨 시나리오 재생기
 * ───────────────────────────────────────────────
 * 📌 역할: JSON 시나리오 파일을 fetch해서 화면에 컷 단위로 재생.
 *           배경·BGM·캐릭터·표정·텍스트(줄 단위 페이드)·선택지·trigger 처리.
 *
 * 🔗 연결:
 *   - 시나리오: 기획/시나리오/{recruit·settle·cutscene}*.json (fetch)
 *   - types.ts → 타입
 *   - template.ts → {{변수}} 치환
 *   - trigger.ts → 효과 적용
 *   - config.ts → renderCharacter 주입 (frontend AidongSprite 등)
 *
 * 💡 초보자 안내:
 *   - 클릭(탭) → 다음 줄 → 마지막 줄 → 다음 scene 또는 선택지 표시
 *   - context: templating 변수 (가챠 결과 등 런타임 값 주입)
 *   - onComplete: 시나리오 종료 콜백 (다음 단계로 이동)
 *   - 특수 토큰:
 *     · `__END__`: onComplete 호출
 *     · `__SCENARIO_RECRUIT__`: context.result.scenarioId로 영입 시나리오 재진입
 *
 *   주요 동작:
 *   1. useEffect로 시나리오 JSON 로드 → templating 적용 → state 저장
 *   2. handleAdvance: 화면 클릭/탭 시 다음 줄·다음 scene·선택지 분기
 *   3. goNext: 선택지 trigger 처리 + 다음 scene 이동
 */
import { useEffect, useState, useCallback } from 'react'
import { Box, Typography, Button, Stack, Fade, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { Scenario, Scene, SceneChoice, VNContext } from './types.ts'
import { applyTemplateToScene } from './template.ts'
import { handleTriggers } from './trigger.ts'
import { getHooks } from './config.ts'

interface VNPlayerProps {
  scenarioId: string
  context?: VNContext
  onComplete?: () => void
}

/** config.fetchScenario 가 없을 때 사용하는 기본 fetch. */
async function defaultFetchScenario(scenarioId: string): Promise<Scenario> {
  const r = await fetch(`/scenarios/${scenarioId}.json`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<Scenario>
}

export const VNPlayer = ({ scenarioId, context = {}, onComplete }: VNPlayerProps) => {
  const navigate = useNavigate()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [currentSceneId, setCurrentSceneId] = useState<string>('')
  const [lineIndex, setLineIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadScenario = useCallback(
    async (id: string, ctx: VNContext): Promise<void> => {
      const fetcher = getHooks().fetchScenario ?? defaultFetchScenario
      const raw = await fetcher(id)
      const resolved = applyTemplateToScene<Scenario>(raw, ctx)
      setScenario(resolved)
      setCurrentSceneId(resolved.startScene)
      setLineIndex(0)
    },
    [],
  )

  // Scenario 로드
  useEffect(() => {
    let cancel = false
    setScenario(null)
    setError(null)
    loadScenario(scenarioId, context)
      .then(() => {
        if (cancel) return
      })
      .catch((e) => {
        if (!cancel) setError(String(e))
      })
    return () => {
      cancel = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, JSON.stringify(context)])

  const scene: Scene | undefined = scenario?.scenes[currentSceneId]
  const lines = scene?.text?.lines ?? []
  const speaker = scene?.text?.speaker ?? ''

  const goNext = useCallback(
    async (nextSceneId: string, choice?: SceneChoice) => {
      // trigger 처리
      if (choice?.trigger) {
        const result = await handleTriggers(choice.trigger)
        if (result.navigate) {
          if (result.navigate.startsWith('/')) {
            navigate(result.navigate)
            return
          }
          // 다른 시나리오로 진입
          await loadScenario(result.navigate, context).catch((e) => setError(String(e)))
          return
        }
      }
      if (nextSceneId === '__END__') {
        onComplete?.()
        return
      }
      if (nextSceneId === '__SCENARIO_RECRUIT__') {
        const charId = (context.result as { scenarioId?: string })?.scenarioId
        if (charId) {
          await loadScenario(`recruit_${charId}`, context).catch((e) => setError(String(e)))
        }
        return
      }
      setCurrentSceneId(nextSceneId)
      setLineIndex(0)
    },
    [navigate, context, onComplete, loadScenario],
  )

  const handleAdvance = useCallback(async () => {
    if (!scene) return
    if (lineIndex < lines.length - 1) {
      setLineIndex(lineIndex + 1)
      return
    }
    if (scene.choices && scene.choices.length > 0) {
      // 선택지 있음 — 대기
      return
    }
    if (scene.next) {
      goNext(scene.next)
    } else {
      onComplete?.()
    }
  }, [scene, lineIndex, lines.length, goNext, onComplete])

  if (error) {
    return (
      <Box sx={{ p: 4, color: 'error.main' }}>
        <Typography>시나리오 로드 실패: {error}</Typography>
        <Button onClick={() => navigate('/island')}>마이섬으로</Button>
      </Box>
    )
  }

  if (!scenario || !scene) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  const allLinesShown = lineIndex >= lines.length - 1
  const showChoices = allLinesShown && scene.choices && scene.choices.length > 0
  const renderCharacter = getHooks().renderCharacter

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: '#000',
        backgroundImage: scene.background ? `url(/assets/배경/${scene.background}.png)` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.6s',
        cursor: showChoices ? 'default' : 'pointer',
        userSelect: 'none',
      }}
      onClick={showChoices ? undefined : handleAdvance}
    >
      {/* 캐릭터 — frontend가 configure로 주입한 renderCharacter 사용 */}
      {scene.character?.id && renderCharacter && (
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: '15%',
            transform: 'translateX(-50%)',
            width: 'min(60vw, 360px)',
            aspectRatio: '1',
          }}
        >
          <Fade in key={`${scene.character.id}-${scene.character.expression}`} timeout={400}>
            <Box>
              {renderCharacter({
                id: scene.character.id,
                expression: scene.character.expression ?? 'normal',
                size: 360,
              })}
            </Box>
          </Fade>
        </Box>
      )}

      {/* 텍스트 박스 */}
      {scene.text && (
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: showChoices ? 'unset' : 16,
            top: showChoices ? '40%' : 'unset',
            bgcolor: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
            p: 3,
            boxShadow: 4,
            maxWidth: 720,
            mx: 'auto',
          }}
        >
          {speaker !== 'narrator' && (
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}
            >
              {speaker}
            </Typography>
          )}
          <Fade in key={`${currentSceneId}-${lineIndex}`} timeout={400}>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-line',
                fontStyle: speaker === 'narrator' ? 'italic' : 'normal',
                color: speaker === 'narrator' ? 'text.secondary' : 'text.primary',
                fontSize: 16,
                lineHeight: 1.8,
                minHeight: 56,
              }}
            >
              {lines[lineIndex] ?? ''}
            </Typography>
          </Fade>
          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'right', color: 'text.secondary', mt: 1 }}
          >
            {lineIndex + 1} / {lines.length}  ·  탭하여 진행
          </Typography>
        </Box>
      )}

      {/* 선택지 */}
      {showChoices && scene.choices && (
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Stack direction="column" spacing={1.5} sx={{ width: '100%', maxWidth: 480 }}>
            {scene.choices.map((c, i) => (
              <Button
                key={i}
                variant="contained"
                size="large"
                onClick={() => goNext(c.next, c)}
                sx={{ py: 1.5 }}
              >
                {c.label}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      {/* 하단 진행 정보 */}
      {!scene.text && !showChoices && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          <Typography variant="caption">탭하여 진행</Typography>
        </Box>
      )}
    </Box>
  )
}
