/**
 * 📁 stores/userStore.ts — 사용자 상태 (Zustand) — 게임의 두뇌
 * ───────────────────────────────────────────────
 * 📌 역할: 게임의 모든 사용자 상태를 한 곳에 보관.
 *           - Auth (firebaseUid, isGuest, nickname)
 *           - 자원 (coins, diamonds, gems)
 *           - 진행 (onboardingComplete, hostName)
 *           - 캐릭터 (recruitedAidongs, affinities, needs, careLog)
 *           - 마이섬 (unlockedZones, unlockedDiaries, codex...)
 *           - 항해 보조 자원 (diceCount, harborAssignedChars)
 *           - 옷 (equippedOutfit)
 *
 * 🔗 연결:
 *   - localStorage 자동 저장 (zustand persist) — 새로고침해도 유지
 *   - lib/syncStore.ts → 5초 디바운스로 backend에 PATCH 동기화
 *   - 거의 모든 컴포넌트가 이 store를 read/write
 *
 * 💡 초보자 안내:
 *   - useUserStore() 훅으로 컴포넌트 안에서 사용
 *   - useUserStore.getState() 로 컴포넌트 밖에서 즉시 접근
 *   - useUserStore.setState({ key: value }) 로 직접 갱신 (디버그용)
 *   - 모든 액션은 함수로 정의 (recruitAidong, addAffinity, applyCareAction 등)
 *   - persist({ name: 'idongworld-user' }) → localStorage 키
 *
 *   상태 흐름 예 (영입):
 *   1. 가챠 결과 확인 → recruitAidong('황금멍')
 *   2. 자동: needs[황금멍] 초기화, careLog[황금멍] = {} 생성
 *   3. 케어 → applyCareAction → 욕구·친밀도·코인 업데이트
 *   4. 시퀀스 진입 → tickSequenceDecay → 욕구 -1
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { INITIAL_NEEDS, NEED_KEYS, type NeedKey } from '@/data/needs'
import { CARE_ACTIONS } from '@/data/careActions'
import { getCurrentZone } from '@/data/schedZone'
import {
  DEFAULT_SOUND_SETTINGS,
  clampVolume,
  type SoundChannel,
  type SoundSettings,
} from '@/data/settings'

export type AidongCharacterId = '황금멍' | '춤냥' | '양털곰' | '단풍볼' | '날카여우'

export interface CareLogEntry {
  lastUsedAt?: number  // ms timestamp
  todayCount: number
  lastDay?: string  // YYYY-MM-DD
}

export interface CareApplyResult {
  ok: boolean
  reason?: 'wrong_zone' | 'cooldown' | 'cap' | 'no_coins' | 'no_char'
  affinityDelta?: number
}

export interface DynamicAidongZone {
  zoneId: string
  characterId: string
  status: 'active' | 'hidden' | 'farewelled'
  displayOrder: number
  pinned: boolean
  openedAt: number
  source: 'voyage-encounter' | 'manual' | 'migration'
}

export interface MyIslandZoneSlot {
  areaNo: string
  areaId: string
  kind: 'anchor' | 'fillable'
  occupantAidongId?: string
  state: 'locked' | 'empty' | 'filled' | 'active' | 'standby'
  source?: 'default' | 'incorporation' | 'migration'
  incorporatedAt?: number
  updatedAt?: number
}

export interface UserState {
  // Auth
  firebaseUid?: string
  nickname?: string
  isGuest: boolean
  gameStartedAt?: number

  // 게임 자원
  coins: number
  diamonds: number
  gems: number

  // 진행
  openingSeen: boolean
  sooksoClean: boolean
  onboardingComplete: boolean
  hostName?: string
  sooksoName?: string

  // 캐릭터
  recruitedAidongs: AidongCharacterId[]
  firstGachaCandidate?: AidongCharacterId
  firstGachaAttempts: number
  affinities: Record<string, { score: number; level: number }>
  needs: Record<string, Record<NeedKey, number>>           // 6 욕구 0~10
  lastSequenceZone: Record<string, number>                  // 마지막 시퀀스 진입 zone
  lastSequenceAt: Record<string, number>                    // ms
  careLog: Record<string, Record<string, CareLogEntry>>     // [char][actionId]

  // 마이섬
  unlockedZones: string[]
  zoneSlots: Record<string, MyIslandZoneSlot>
  dynamicAidongZones: Record<string, DynamicAidongZone>
  unlockedDiaries: string[]
  unlockedCodexEntries: string[]
  codexFullyRegistered: string[]
  inventory: Record<string, number>

  // 항해 보조 자원
  // currentRoute와 boardPosition은 예전 localStorage 항해 구현의 legacy field다.
  // 신규 항해 진행 상태는 lib/voyageSessionStore.ts의 sessionStorage에만 둔다.
  currentRoute?: string
  boardPosition: number
  diceCount: number
  harborAssignedChars: AidongCharacterId[]   // 항구 배치 캐릭터
  harborLastChargedAt?: number                // 마지막 충전 ms

  // Actions
  loginGuest: () => void
  logout: () => void
  recruitAidong: (id: AidongCharacterId) => void
  addAffinity: (id: AidongCharacterId, delta: number) => void
  completeOnboarding: (hostName: string) => void
  setSooksoClean: (sooksoClean: boolean) => void
  setSooksoName: (sooksoName?: string) => void
  unlockZone: (zone: string) => void
  setZoneSlots: (zoneSlots: Record<string, MyIslandZoneSlot>) => void
  upsertDynamicAidongZone: (zone: DynamicAidongZone) => void
  updateDynamicAidongZoneLocal: (
    zoneId: string,
    patch: Partial<Pick<DynamicAidongZone, 'status' | 'displayOrder' | 'pinned'>>,
  ) => void
  unlockDiary: (id: string) => void
  unlockCodexSlot: (char: AidongCharacterId) => void
  fullyRegisterCodex: (char: AidongCharacterId) => void
  startVoyage: (routeId: string) => void
  rollDice: () => number
  movePosition: (steps: number) => void
  endVoyage: () => void

  applyCareAction: (char: AidongCharacterId, actionId: string) => CareApplyResult
  tickSequenceDecay: (char: AidongCharacterId) => void
  rewardCoins: (delta: number) => void
  rewardItem: (itemId: string, qty?: number) => void

  toggleHarborAssign: (char: AidongCharacterId) => void
  chargeDiceFromHarbor: () => number  // 충전 발생 시 +N

  // 옷 (Phase 1: 색상 토글)
  equippedOutfit: Record<string, string>   // [char] = outfitId
  equippedItems: Record<string, string[]>  // [char] = host inventory itemIds currently equipped
  soundSettings: SoundSettings
  setOutfit: (char: AidongCharacterId, outfitId: string) => void
  setSoundVolume: (channel: SoundChannel, volume: number) => void
}

const today = () => new Date().toISOString().slice(0, 10)

const initialUser = {
  isGuest: false,
  gameStartedAt: undefined as number | undefined,
  coins: 100,  // 시작 시 100 코인 (케어 액션 검증)
  diamonds: 0,
  gems: 0,
  openingSeen: true,
  sooksoClean: false,
  sooksoName: undefined as string | undefined,
  onboardingComplete: false,
  recruitedAidongs: [] as AidongCharacterId[],
  firstGachaAttempts: 0,
  affinities: {},
  needs: {} as Record<string, Record<NeedKey, number>>,
  lastSequenceZone: {} as Record<string, number>,
  lastSequenceAt: {} as Record<string, number>,
  careLog: {} as Record<string, Record<string, CareLogEntry>>,
  unlockedZones: [],
  zoneSlots: {} as Record<string, MyIslandZoneSlot>,
  dynamicAidongZones: {} as Record<string, DynamicAidongZone>,
  unlockedDiaries: [],
  unlockedCodexEntries: [],
  codexFullyRegistered: [],
  inventory: {},
  boardPosition: 0,
  diceCount: 6,
  harborAssignedChars: [] as AidongCharacterId[],
  equippedOutfit: {} as Record<string, string>,
  equippedItems: {} as Record<string, string[]>,
  soundSettings: DEFAULT_SOUND_SETTINGS,
}

const loggedOutUserPatch = {
  ...initialUser,
  firebaseUid: undefined,
  nickname: undefined,
  hostName: undefined,
  sooksoName: undefined,
  firstGachaCandidate: undefined,
  currentRoute: undefined,
  harborLastChargedAt: undefined,
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialUser,

      // 게스트 로그인 (backend 미동작 시 fallback) — 타임스탬프 기반 임시 uid
      loginGuest: () =>
        set((s) => ({
          isGuest: true,
          nickname: '게스트',
          openingSeen: false,
          firebaseUid: 'guest-' + Date.now(),
          gameStartedAt: s.gameStartedAt ?? Date.now(),
        })),

      // 전체 상태 초기화 (디버그 리셋 또는 Phase 1.5 진짜 logout)
      logout: () => set(loggedOutUserPatch),

      // 캐릭터 영입 — 자동 부수 효과:
      //   1) recruitedAidongs에 추가
      //   2) needs 초기화 (8/8/7/8/7/9 시작)
      //   3) lastSequenceZone·At 기록 (시퀀스 진입 첫 기준점)
      //   4) careLog 빈 객체 (액션별 사용 기록 추적용)
      recruitAidong: (id) =>
        set((s) => {
          if (s.recruitedAidongs.includes(id)) return {}  // 중복 방지
          return {
            recruitedAidongs: [...s.recruitedAidongs, id],
            needs: { ...s.needs, [id]: { ...INITIAL_NEEDS } },
            lastSequenceZone: { ...s.lastSequenceZone, [id]: getCurrentZone() },
            lastSequenceAt: { ...s.lastSequenceAt, [id]: Date.now() },
            careLog: { ...s.careLog, [id]: {} },
          }
        }),

      // 친밀도 점수·Lv 갱신
      // Lv 임계값 (능력치파라메터.md §3-7):
      //   Lv 0: 0~9 / Lv 1: 10~24 / Lv 2: 25~49 / Lv 3: 50~99
      //   ⚠️ Lv 4~10는 Phase 1.5에서 정의 (현재 50+ 모두 Lv 3로 단순화)
      addAffinity: (id, delta) =>
        set((s) => {
          const cur = s.affinities[id] ?? { score: 0, level: 0 }
          const newScore = cur.score + delta
          const newLevel =
            newScore >= 50 ? 3 : newScore >= 25 ? 2 : newScore >= 10 ? 1 : 0
          return {
            affinities: { ...s.affinities, [id]: { score: newScore, level: newLevel } },
          }
        }),

      // 온보딩 완료 처리 — SOOKSO 이름 + 항구·숙소 자동 해금
      completeOnboarding: (hostName) =>
        set({
          onboardingComplete: true,
          hostName,
          sooksoClean: true,
          unlockedZones: ['harbor', 'lodge'],
        }),

      setSooksoClean: (sooksoClean) => set({ sooksoClean }),

      setSooksoName: (sooksoName) => set({ sooksoName }),

      unlockZone: (zone) =>
        set((s) => ({
          unlockedZones: s.unlockedZones.includes(zone) ? s.unlockedZones : [...s.unlockedZones, zone],
        })),

      setZoneSlots: (zoneSlots) => set({ zoneSlots }),

      upsertDynamicAidongZone: (zone) =>
        set((s) => ({
          dynamicAidongZones: {
            ...s.dynamicAidongZones,
            [zone.zoneId]: zone,
          },
        })),

      updateDynamicAidongZoneLocal: (zoneId, patch) =>
        set((s) => {
          const current = s.dynamicAidongZones[zoneId]
          if (!current) return {}
          return {
            dynamicAidongZones: {
              ...s.dynamicAidongZones,
              [zoneId]: {
                ...current,
                ...patch,
              },
            },
          }
        }),

      unlockDiary: (id) =>
        set((s) => ({
          unlockedDiaries: s.unlockedDiaries.includes(id) ? s.unlockedDiaries : [...s.unlockedDiaries, id],
        })),

      // 도감 placeholder 슬롯 활성 (정착 컷 시 — 시각상 "등재"되어 보이지만 실 등재 X)
      unlockCodexSlot: (char) =>
        set((s) => ({
          unlockedCodexEntries: s.unlockedCodexEntries.includes(char)
            ? s.unlockedCodexEntries
            : [...s.unlockedCodexEntries, char],
        })),

      // 도감 본 등재 (첫 케어 액션 1회 후 — 다마고치코어 §6-0 정합)
      fullyRegisterCodex: (char) =>
        set((s) => ({
          codexFullyRegistered: s.codexFullyRegistered.includes(char)
            ? s.codexFullyRegistered
            : [...s.codexFullyRegistered, char],
        })),

      // legacy 항해 시작 — 신규 화면에서는 voyageSessionStore.startSession을 사용한다.
      startVoyage: (routeId) =>
        set({ currentRoute: routeId, boardPosition: 0 }),

      // 주사위 1d6 굴림 — 한 번에 1개 소비
      // ⚠️ 반환값(roll)은 호출 측에서 사용 (NavigationBoardScene에서 한 칸씩 이동에 활용)
      rollDice: () => {
        const roll = Math.floor(Math.random() * 6) + 1
        set((s) => ({ diceCount: Math.max(0, s.diceCount - 1) }))
        return roll
      },

      // legacy 보드 위치 이동 — 신규 화면에서는 voyageSessionStore.movePosition을 사용한다.
      movePosition: (steps) =>
        set((s) => ({ boardPosition: (s.boardPosition + steps) % 30 })),

      // legacy 항해 종료 — 신규 화면에서는 voyageSessionStore.endSession을 사용한다.
      endVoyage: () =>
        set({ currentRoute: undefined, boardPosition: 0 }),

      // 시퀀스 진입 감지 → 6 욕구 -1
      // 핵심 다마고치 메카닉 (§5 SoT)
      // 호출처: CareModal.tsx useEffect (모달 열릴 때)
      tickSequenceDecay: (char) =>
        set((s) => {
          const curZone = getCurrentZone()
          const lastZone = s.lastSequenceZone[char]
          if (lastZone === curZone) return {}  // 같은 zone에 머물면 감소 X
          // 새 시퀀스 진입 — 6 욕구 -1 (clamp 0)
          const cur = s.needs[char] ?? { ...INITIAL_NEEDS }
          const newNeeds: Record<NeedKey, number> = { ...cur }
          for (const k of NEED_KEYS) {
            newNeeds[k] = Math.max(0, (newNeeds[k] ?? 0) - 1)
          }
          return {
            needs: { ...s.needs, [char]: newNeeds },
            lastSequenceZone: { ...s.lastSequenceZone, [char]: curZone },
            lastSequenceAt: { ...s.lastSequenceAt, [char]: Date.now() },
          }
        }),

      // 코인 보상·차감 (음수 가능, 0 미만 clamp)
      rewardCoins: (delta) =>
        set((s) => ({ coins: Math.max(0, s.coins + delta) })),

      // 인벤토리 아이템 추가
      // 자재 ID 예: basic_food / rest_token / memory_piece / ore (Phase 1.5에 data/materials.ts 카탈로그)
      rewardItem: (itemId, qty = 1) =>
        set((s) => ({
          inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + qty },
        })),

      toggleHarborAssign: (char) =>
        set((s) => ({
          harborAssignedChars: s.harborAssignedChars.includes(char)
            ? s.harborAssignedChars.filter((c) => c !== char)
            : [...s.harborAssignedChars, char].slice(0, 5),  // 5 슬롯
        })),

      setOutfit: (char, outfitId) =>
        set((s) => ({
          equippedOutfit: { ...s.equippedOutfit, [char]: outfitId },
        })),

      setSoundVolume: (channel, volume) =>
        set((s) => ({
          soundSettings: {
            ...DEFAULT_SOUND_SETTINGS,
            ...s.soundSettings,
            [channel === 'bgm' ? 'bgmVolume' : 'sfxVolume']: clampVolume(volume),
          },
        })),

      chargeDiceFromHarbor: () => {
        const s = get()
        const now = Date.now()
        const last = s.harborLastChargedAt ?? now
        const elapsedMs = now - last
        const hours = Math.floor(elapsedMs / (1000 * 60 * 60))
        if (hours < 1 || s.harborAssignedChars.length === 0) return 0
        // 친구 1명당 시간당 1d6
        const charge = hours * s.harborAssignedChars.length
        set({
          diceCount: s.diceCount + charge,
          harborLastChargedAt: now,
        })
        return charge
      },

      applyCareAction: (char, actionId) => {
        const action = CARE_ACTIONS.find((a) => a.id === actionId)
        if (!action) return { ok: false, reason: 'no_char' }
        const state = get()
        if (!state.recruitedAidongs.includes(char)) return { ok: false, reason: 'no_char' }

        const curZone = getCurrentZone()
        if (action.zones && !action.zones.includes(curZone as never)) {
          return { ok: false, reason: 'wrong_zone' }
        }
        if (state.coins < action.coinCost) return { ok: false, reason: 'no_coins' }

        const log = state.careLog[char]?.[actionId] ?? { todayCount: 0 }
        const now = Date.now()
        const day = today()
        const todayCount = log.lastDay === day ? log.todayCount : 0
        if (action.dailyCap && todayCount >= action.dailyCap) {
          return { ok: false, reason: 'cap' }
        }
        if (action.cooldownMin && log.lastUsedAt) {
          const minSince = (now - log.lastUsedAt) / (1000 * 60)
          if (minSince < action.cooldownMin) return { ok: false, reason: 'cooldown' }
        }

        // 적용
        set((s) => {
          const cur = s.needs[char] ?? { ...INITIAL_NEEDS }
          const newNeeds: Record<NeedKey, number> = { ...cur }
          for (const [k, v] of Object.entries(action.needsRecover)) {
            newNeeds[k as NeedKey] = Math.max(0, Math.min(10, (newNeeds[k as NeedKey] ?? 0) + (v as number)))
          }
          const curAff = s.affinities[char] ?? { score: 0, level: 0 }
          const newScore = curAff.score + action.affinity
          const newLevel = newScore >= 100 ? 5 : newScore >= 50 ? 3 : newScore >= 25 ? 2 : newScore >= 10 ? 1 : 0
          const newCharLog = {
            ...(s.careLog[char] ?? {}),
            [actionId]: {
              lastUsedAt: now,
              todayCount: todayCount + 1,
              lastDay: day,
            },
          }
          return {
            needs: { ...s.needs, [char]: newNeeds },
            affinities: { ...s.affinities, [char]: { score: newScore, level: newLevel } },
            coins: Math.max(0, s.coins - action.coinCost),
            careLog: { ...s.careLog, [char]: newCharLog },
            // 첫 케어 시 도감 본 등재
            codexFullyRegistered: s.codexFullyRegistered.includes(char)
              ? s.codexFullyRegistered
              : [...s.codexFullyRegistered, char],
          }
        })

        return { ok: true, affinityDelta: action.affinity }
      },
    }),
    { name: 'idongworld-user' }
  )
)
