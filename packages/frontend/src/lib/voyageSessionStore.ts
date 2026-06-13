/**
 * packages/frontend/src/lib/voyageSessionStore.ts
 * ------------------------------------------------------------
 * 역할: 현재 탭/창에서만 살아 있는 항해 진행 상태를 보관한다.
 * 연결: 항구와 항해 보드가 현재 route, 현재 칸, landing 후보를 읽고 쓴다.
 * 주의: 이 store는 `idongworld-user` localStorage persist에 들어가면 안 된다.
 *       항해 세션은 브라우저 탭/창별 `sessionStorage`에만 저장하고,
 *       DB에는 주사위 소모와 보상 지급 같은 영속 결과만 남긴다.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const STORAGE_KEY = 'idongworld-voyage-session'
const DEFAULT_BOARD_SIZE = 30

export interface VoyageSessionLanding {
  landingId: string
  routeId?: string
  boardPosition?: number
  action?: string
  slotType?: string
  label?: string
  targetWorldScope?: string
  landingModuleId?: string
  screenPath?: string
  status?: string
  mission?: {
    missionId: string
    rewards?: Array<Record<string, unknown>>
  }
}

export interface VoyageSession {
  sessionId: string
  routeId: string
  boardPosition: number
  lastRoll?: number
  landing?: VoyageSessionLanding
  startedAt: number
  updatedAt: number
}

interface VoyageSessionState {
  activeSession?: VoyageSession
  startSession: (routeId: string) => VoyageSession
  applyRollResult: (input: {
    steps: number
    boardSize?: number
    landing?: VoyageSessionLanding
    boardPosition?: number
  }) => VoyageSession | undefined
  movePosition: (steps: number, boardSize?: number) => VoyageSession | undefined
  setLanding: (landing?: VoyageSessionLanding) => void
  clearLanding: () => void
  endSession: () => void
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `voyage-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeBoardPosition(value: number, boardSize: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(boardSize) || boardSize <= 0) return 0
  return ((Math.floor(value) % boardSize) + boardSize) % boardSize
}

function sessionStorageProvider(): Storage {
  if (typeof window === 'undefined') {
    return {
      length: 0,
      clear: () => undefined,
      getItem: () => null,
      key: () => null,
      removeItem: () => undefined,
      setItem: () => undefined,
    }
  }
  return window.sessionStorage
}

export const useVoyageSessionStore = create<VoyageSessionState>()(
  persist(
    (set, get) => ({
      activeSession: undefined,

      startSession: (routeId) => {
        const now = Date.now()
        const session: VoyageSession = {
          sessionId: createSessionId(),
          routeId,
          boardPosition: 0,
          startedAt: now,
          updatedAt: now,
        }
        set({ activeSession: session })
        return session
      },

      applyRollResult: ({ steps, boardSize = DEFAULT_BOARD_SIZE, landing, boardPosition }) => {
        const current = get().activeSession
        if (!current) return undefined
        const nextPosition = typeof boardPosition === 'number'
          ? normalizeBoardPosition(boardPosition, boardSize)
          : normalizeBoardPosition(current.boardPosition + steps, boardSize)
        const next: VoyageSession = {
          ...current,
          boardPosition: nextPosition,
          lastRoll: steps,
          landing,
          updatedAt: Date.now(),
        }
        set({ activeSession: next })
        return next
      },

      movePosition: (steps, boardSize = DEFAULT_BOARD_SIZE) => {
        const current = get().activeSession
        if (!current) return undefined
        const next: VoyageSession = {
          ...current,
          boardPosition: normalizeBoardPosition(current.boardPosition + steps, boardSize),
          updatedAt: Date.now(),
        }
        set({ activeSession: next })
        return next
      },

      setLanding: (landing) => {
        const current = get().activeSession
        if (!current) return
        set({
          activeSession: {
            ...current,
            landing,
            updatedAt: Date.now(),
          },
        })
      },

      clearLanding: () => {
        const current = get().activeSession
        if (!current) return
        const { landing: _landing, ...rest } = current
        set({
          activeSession: {
            ...rest,
            updatedAt: Date.now(),
          },
        })
      },

      endSession: () => set({ activeSession: undefined }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(sessionStorageProvider),
      partialize: (state) => ({ activeSession: state.activeSession }),
    },
  ),
)

export const voyageSessionFacade = {
  useSession: () => useVoyageSessionStore((state) => state.activeSession),
  useCurrentRoute: () => useVoyageSessionStore((state) => state.activeSession?.routeId),
  useBoardPosition: () => useVoyageSessionStore((state) => state.activeSession?.boardPosition ?? 0),
  useLanding: () => useVoyageSessionStore((state) => state.activeSession?.landing),

  getSession: () => useVoyageSessionStore.getState().activeSession,
  getCurrentRoute: () => useVoyageSessionStore.getState().activeSession?.routeId,
  getBoardPosition: () => useVoyageSessionStore.getState().activeSession?.boardPosition ?? 0,
  getLanding: () => useVoyageSessionStore.getState().activeSession?.landing,

  startSession: (routeId: string) => useVoyageSessionStore.getState().startSession(routeId),
  applyRollResult: (input: Parameters<VoyageSessionState['applyRollResult']>[0]) =>
    useVoyageSessionStore.getState().applyRollResult(input),
  movePosition: (steps: number, boardSize?: number) =>
    useVoyageSessionStore.getState().movePosition(steps, boardSize),
  setLanding: (landing?: VoyageSessionLanding) => useVoyageSessionStore.getState().setLanding(landing),
  clearLanding: () => useVoyageSessionStore.getState().clearLanding(),
  endSession: () => useVoyageSessionStore.getState().endSession(),
}
