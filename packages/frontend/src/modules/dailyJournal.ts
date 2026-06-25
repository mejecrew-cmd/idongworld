const CYCLE_DAYS = 28
const DAY_MS = 24 * 60 * 60 * 1000

export interface DailyScheduleItem {
  id: string
  label: string
}

export interface DailyJournalState {
  cycleStartedAt: number
  completedScheduleKeys: string[]
  claimedRewardDays: number[]
}

export const DAILY_SCHEDULE: DailyScheduleItem[] = [
  { id: 'wake', label: '아이동 깨우기' },
  { id: 'breakfast', label: '아침밥' },
  { id: 'lunch', label: '점심밥' },
  { id: 'dinner', label: '저녁밥' },
  { id: 'sleep', label: '재우기' },
]

export const REWARD_DAYS = [7, 14, 21, 28] as const

function storageKey(uid?: string): string {
  return `idongworld-daily-journal:${uid ?? 'local'}`
}

function createInitialState(now = Date.now()): DailyJournalState {
  return {
    cycleStartedAt: now,
    completedScheduleKeys: [],
    claimedRewardDays: [],
  }
}

export function getScheduleKey(day: number, scheduleId: string): string {
  return `${day}:${scheduleId}`
}

function isValidScheduleKey(key: string): boolean {
  const [dayText, scheduleId] = key.split(':')
  const day = Number(dayText)
  return (
    Number.isInteger(day) &&
    day >= 1 &&
    day <= CYCLE_DAYS &&
    DAILY_SCHEDULE.some((item) => item.id === scheduleId)
  )
}

function normalizeState(state: DailyJournalState, now = Date.now()): DailyJournalState {
  const elapsedDays = Math.floor((now - state.cycleStartedAt) / DAY_MS)
  if (elapsedDays >= CYCLE_DAYS) return createInitialState(now)

  return {
    cycleStartedAt: state.cycleStartedAt,
    completedScheduleKeys: Array.from(new Set(state.completedScheduleKeys))
      .filter(isValidScheduleKey)
      .sort(),
    claimedRewardDays: Array.from(new Set(state.claimedRewardDays))
      .filter((day) => REWARD_DAYS.includes(day as typeof REWARD_DAYS[number]))
      .sort((left, right) => left - right),
  }
}

export function readDailyJournalState(uid?: string, now = Date.now()): DailyJournalState {
  try {
    const raw = window.localStorage.getItem(storageKey(uid))
    if (!raw) return createInitialState(now)
    const parsed = JSON.parse(raw) as Partial<DailyJournalState>
    if (typeof parsed.cycleStartedAt !== 'number') return createInitialState(now)

    return normalizeState({
      cycleStartedAt: parsed.cycleStartedAt,
      completedScheduleKeys: Array.isArray(parsed.completedScheduleKeys)
        ? parsed.completedScheduleKeys
        : [],
      claimedRewardDays: Array.isArray(parsed.claimedRewardDays)
        ? parsed.claimedRewardDays
        : [],
    }, now)
  } catch {
    return createInitialState(now)
  }
}

export function writeDailyJournalState(state: DailyJournalState, uid?: string): void {
  window.localStorage.setItem(storageKey(uid), JSON.stringify(state))
}

export function isScheduleComplete(state: DailyJournalState, day: number, scheduleId: string): boolean {
  return state.completedScheduleKeys.includes(getScheduleKey(day, scheduleId))
}

export function isDayComplete(state: DailyJournalState, day: number): boolean {
  return DAILY_SCHEDULE.every((item) => isScheduleComplete(state, day, item.id))
}

export function toggleScheduleComplete(
  state: DailyJournalState,
  day: number,
  scheduleId: string,
): DailyJournalState {
  const key = getScheduleKey(day, scheduleId)
  const completed = new Set(state.completedScheduleKeys)
  if (completed.has(key)) completed.delete(key)
  else completed.add(key)
  return {
    ...state,
    completedScheduleKeys: Array.from(completed).filter(isValidScheduleKey).sort(),
  }
}

export function claimReward(state: DailyJournalState, rewardDay: number): DailyJournalState {
  if (!REWARD_DAYS.includes(rewardDay as typeof REWARD_DAYS[number])) return state
  if (state.claimedRewardDays.includes(rewardDay)) return state
  return {
    ...state,
    claimedRewardDays: [...state.claimedRewardDays, rewardDay].sort((left, right) => left - right),
  }
}

export function getCompletedStarDays(state: DailyJournalState): number[] {
  return Array.from({ length: CYCLE_DAYS }, (_, index) => index + 1)
    .filter((day) => isDayComplete(state, day))
}

export function getDailyJournalProgress(state: DailyJournalState, now = Date.now()) {
  const elapsedDays = Math.max(0, Math.floor((now - state.cycleStartedAt) / DAY_MS))
  const cycleDay = Math.min(CYCLE_DAYS, elapsedDays + 1)
  const remainingDays = Math.max(0, CYCLE_DAYS - elapsedDays)
  const completedStarDays = getCompletedStarDays(state)
  const completedStars = completedStarDays.length

  return {
    cycleDay,
    remainingDays,
    completedStars,
    completedStarDays,
    totalStars: CYCLE_DAYS,
    percent: Math.round((completedStars / CYCLE_DAYS) * 100),
  }
}
