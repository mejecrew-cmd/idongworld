/**
 * packages/modules/destination-shell-island/src/DestinationIslandRiveLayer.tsx
 * ------------------------------------------------------------
 * 역할: destination island 화면의 Rive 반응 animation 연결 지점이다.
 * 연결: 상위 React container가 hotspot, reward, mission 같은 gameplay 반응을
 *       props로 넘기면 Rive state machine input 또는 placeholder UI로 표현한다.
 * 주의: `.riv` 에셋이 아직 없을 수 있으므로 src가 없으면 lightweight fallback을
 *       보여준다. Rive는 backend API를 직접 호출하지 않는다.
 */
import { useEffect } from 'react'
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useStateMachineInput,
} from '@rive-app/react-canvas'

export type DestinationIslandReaction = 'idle' | 'hotspot' | 'reward' | 'mission' | 'error'

export const DESTINATION_ISLAND_RIVE_STATE_MACHINE = 'DestinationIslandReaction'

export const DESTINATION_ISLAND_RIVE_INPUTS = {
  hotspot: 'hotspot',
  reward: 'reward',
  mission: 'mission',
  error: 'error',
} as const

interface RiveReactionCanvasProps {
  src: string
  reaction: DestinationIslandReaction
  stateMachineName: string
}

interface DestinationIslandRiveLayerProps {
  reaction: DestinationIslandReaction
  src?: string
  stateMachineName?: string
}

const REACTION_LABELS: Record<DestinationIslandReaction, string> = {
  idle: '탐험 대기',
  hotspot: '조사 반응',
  reward: '보상 반짝임',
  mission: '미션 완료',
  error: '주의',
}

function RiveReactionCanvas({ src, reaction, stateMachineName }: RiveReactionCanvasProps) {
  /*
   * 실제 `.riv` asset 연결 계약:
   * - src는 DestinationIslandScreen에서 VITE_DESTINATION_ISLAND_RIVE_SRC로 주입한다.
   * - state machine 기본 이름은 DestinationIslandReaction이다.
   * - trigger input 이름은 hotspot, reward, mission, error를 유지한다.
   */
  const { rive, RiveComponent } = useRive({
    src,
    autoplay: true,
    stateMachines: stateMachineName,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  })
  const hotspotTrigger = useStateMachineInput(rive, stateMachineName, DESTINATION_ISLAND_RIVE_INPUTS.hotspot)
  const rewardTrigger = useStateMachineInput(rive, stateMachineName, DESTINATION_ISLAND_RIVE_INPUTS.reward)
  const missionTrigger = useStateMachineInput(rive, stateMachineName, DESTINATION_ISLAND_RIVE_INPUTS.mission)
  const errorTrigger = useStateMachineInput(rive, stateMachineName, DESTINATION_ISLAND_RIVE_INPUTS.error)

  useEffect(() => {
    if (reaction === 'hotspot') hotspotTrigger?.fire()
    if (reaction === 'reward') rewardTrigger?.fire()
    if (reaction === 'mission') missionTrigger?.fire()
    if (reaction === 'error') errorTrigger?.fire()
  }, [errorTrigger, hotspotTrigger, missionTrigger, reaction, rewardTrigger])

  return <RiveComponent />
}

export function DestinationIslandRiveLayer({
  reaction,
  src,
  stateMachineName = DESTINATION_ISLAND_RIVE_STATE_MACHINE,
}: DestinationIslandRiveLayerProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: 18,
        top: 18,
        width: 132,
        height: 132,
        pointerEvents: 'none',
      }}
    >
      {src ? (
        <RiveReactionCanvas src={src} reaction={reaction} stateMachineName={stateMachineName} />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 800,
            color: '#16333f',
            background:
              reaction === 'error'
                ? 'radial-gradient(circle, #ffd6d6 0%, #ff8a8a 68%, rgba(255,138,138,0.2) 100%)'
                : reaction === 'mission'
                  ? 'radial-gradient(circle, #fff3a6 0%, #ffc766 64%, rgba(255,199,102,0.16) 100%)'
                  : reaction === 'reward'
                    ? 'radial-gradient(circle, #e1fbff 0%, #7edcf0 66%, rgba(126,220,240,0.16) 100%)'
                    : 'radial-gradient(circle, #f5fff0 0%, #b7efce 64%, rgba(183,239,206,0.14) 100%)',
            boxShadow: '0 16px 42px rgba(0,0,0,0.28)',
            transform: reaction === 'idle' ? 'scale(0.92)' : 'scale(1)',
            transition: 'transform 180ms ease, background 180ms ease',
          }}
        >
          {REACTION_LABELS[reaction]}
        </div>
      )}
    </div>
  )
}
