/**
 * 📁 cutscene-runner/src/CutscenePlayer.tsx — 컷신 자동 발화 컴포넌트
 * ───────────────────────────────────────────────
 * 📌 역할: callSiteId 만 주면 registry 조회 → vn-runner VNPlayer 위임 → 종료 시 markWatched.
 *           화면(consumer)은 어떤 시나리오를 재생할지 모름 — 그게 의도.
 *
 * 🔗 연결:
 *   - registry.ts (findFor·markWatched)
 *   - @idongworld/vn-runner (VNPlayer)
 *   - 사용 예:
 *       <CutscenePlayer callSiteId="after-recruit" context={{ result }} onComplete={...} />
 *
 * 💡 동작:
 *   - 발화할 컷신 없으면 onComplete() 즉시 호출 (no-op 통과)
 *   - 있으면 VNPlayer 렌더 + 종료 시 next 체이닝 또는 onComplete
 */
import { useEffect, useState } from 'react'
import { VNPlayer } from '@idongworld/vn-runner'
import type { VNContext } from '@idongworld/vn-runner'
import { bus } from '@idongworld/core'
import { findFor, markWatched } from './registry.ts'
import type { CutsceneRegistration } from './types.ts'

interface CutscenePlayerProps {
  /** 발화할 호출 지점 ID. */
  callSiteId: string
  /** vn-runner templating context (registration.context 와 병합). */
  context?: VNContext
  /** 발화 종료 또는 발화할 것이 없을 때 호출. */
  onComplete?: () => void
}

export const CutscenePlayer = ({ callSiteId, context, onComplete }: CutscenePlayerProps) => {
  const [active, setActive] = useState<CutsceneRegistration | null>(null)
  const [resolved, setResolved] = useState<boolean>(false)

  // 마운트 시 1회 lookup
  useEffect(() => {
    const found = findFor(callSiteId)
    if (!found) {
      setResolved(true)
      onComplete?.()
      return
    }
    setActive(found)
    setResolved(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callSiteId])

  if (!resolved) return null
  if (!active) return null  // onComplete 이미 호출됨

  const mergedContext: VNContext = { ...active.context, ...context }

  return (
    <VNPlayer
      scenarioId={active.scenarioId}
      context={mergedContext}
      onComplete={() => {
        markWatched(active)
        bus.emit('cutscene:played', { callSiteId: active.callSiteId, scenarioId: active.scenarioId })
        // next 체이닝 — 단순화: 호출부가 onComplete 받으면 직접 다음 callSiteId 결정 권장
        onComplete?.()
      }}
    />
  )
}
