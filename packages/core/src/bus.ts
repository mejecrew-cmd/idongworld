/**
 * 📁 core/bus.ts — 모듈 간 이벤트 버스
 * ───────────────────────────────────────────────
 * 📌 역할: 모듈끼리 직접 import 없이 이벤트로 통신할 수 있는 pub/sub 채널.
 *           순환 의존을 막고 모듈 분리를 단순화.
 *
 * 🔗 연결:
 *   - 모든 모듈 (이벤트 발행·구독)
 *   - 모듈분리작업계획_v1_260510.md §6.5 (이벤트 버스 표준)
 *
 * 💡 사용 예:
 *   - bus.emit('voyage:landed', { id: 'island-3' })
 *   - bus.on('aidong:recruited', (p) => { ... })
 *
 * 💡 초보자 안내:
 *   - 외부 라이브러리(mitt 등) 없이 가벼운 자체 구현 — 1주차 의존성 최소화.
 *   - 이벤트 이름은 'domain:action' 컨벤션 권장 (예: 'voyage:landed').
 *   - 타입 안전: BusEventMap 인터페이스에 이벤트 추가하면 자동 추론.
 */

/**
 * 이벤트 맵 — 모듈 간 통신 표준 카탈로그.
 *
 * 💡 컨벤션:
 *   - 키: 'domain:action' (예: 'aidong:recruited')
 *   - payload: 직렬화 가능한 객체 (Date·function 금지)
 *   - 동사: 과거형 (이미 일어난 사건만 — 명령 X)
 *
 * 💡 확장:
 *   - 모듈 자체 이벤트는 declare module augmentation 으로 추가:
 *       declare module '@idongworld/core/bus' {
 *         interface BusEventMap { 'my:event': { foo: string } }
 *       }
 */
export interface BusEventMap {
  // ─── 🐾 캐릭터 도메인 ───
  /** 캐릭터 영입 직후 (recruit_X 시나리오 종료). */
  'aidong:recruited': { characterId: string }
  /** 캐릭터 정착 컷 종료. */
  'aidong:settled': { characterId: string }
  /** 친밀도 변경 (양수·음수 모두). */
  'aidong:affinity-changed': { characterId: string; delta: number; newScore: number }
  /** 케어 액션 적용 성공. */
  'aidong:care-applied': { characterId: string; actionId: string }

  // ─── 🎰 가챠 도메인 ───
  /** 가챠 픽 결과 (자동 카운트). */
  'gacha:picked': { characterId: string; scenarioId: string; poolId: string }
  /** 명시적 재추첨 (시나리오 trigger). */
  'gacha:retry': { poolId: string }

  // ─── 🗺️ 마이섬 도메인 ───
  /** zone 해금 (튜토리얼·이전 zone 클리어 등). */
  'zone:unlocked': { zoneId: string }
  /** zone 클리어 (미니게임 1회 완료 등). */
  'zone:cleared': { zoneId: string }
  /** 튜토리얼 완료 (하트섬·SOOKSO 명명 종료). */
  'tutorial:complete': Record<string, never>

  // ─── 📔 도감·일기 도메인 ───
  /** 일기 해금 (친밀도 임계 도달 등). */
  'codex:diary-unlocked': { diaryId: string }
  /** 도감 entry 해금 (placeholder). */
  'codex:slot-unlocked': { entryId: string }
  /** 도감 entry 본 등재 (첫 케어 등). */
  'codex:fully-registered': { entryId: string }

  // ─── 🚢 세관·자원 도메인 ───
  /** 자원 변환 적용 성공. */
  'customs:applied': { ruleId: string; fromAmount: number; toAmount: number }

  // ─── 🎬 컷신 도메인 ───
  /** 컷신 발화 종료 (markWatched 직후). */
  'cutscene:played': { callSiteId: string; scenarioId: string }
}

type Listener<T> = (payload: T) => void
type AnyListener = Listener<unknown>

const _channels = new Map<string, Set<AnyListener>>()

/** 이벤트 구독. unsubscribe 함수 반환. */
export function on<K extends keyof BusEventMap & string>(
  event: K,
  listener: Listener<BusEventMap[K]>,
): () => void
export function on(event: string, listener: Listener<unknown>): () => void
export function on(event: string, listener: AnyListener): () => void {
  let set = _channels.get(event)
  if (!set) {
    set = new Set()
    _channels.set(event, set)
  }
  set.add(listener)
  return () => off(event, listener)
}

/** 1회만 수신 후 자동 해제. */
export function once<K extends keyof BusEventMap & string>(
  event: K,
  listener: Listener<BusEventMap[K]>,
): () => void
export function once(event: string, listener: Listener<unknown>): () => void
export function once(event: string, listener: AnyListener): () => void {
  const wrapper: AnyListener = (p) => {
    off(event, wrapper)
    listener(p)
  }
  return on(event, wrapper)
}

/** 구독 해제. */
export function off(event: string, listener: AnyListener): void {
  _channels.get(event)?.delete(listener)
}

/** 이벤트 발행. 동기 dispatch (각 listener는 try/catch로 격리). */
export function emit<K extends keyof BusEventMap & string>(event: K, payload: BusEventMap[K]): void
export function emit(event: string, payload: unknown): void
export function emit(event: string, payload: unknown): void {
  const set = _channels.get(event)
  if (!set) return
  for (const fn of set) {
    try {
      fn(payload)
    } catch (err) {
      // 한 listener 의 예외가 다른 listener를 막지 않게 격리
      console.error(`[bus] listener error for "${event}":`, err)
    }
  }
}

/** 테스트·HMR 용 전체 초기화. */
export function _resetForTest(): void {
  _channels.clear()
}
