/**
 * packages/backend/src/utils/scheduler.ts
 * ------------------------------------------------------------
 * 역할: VVNS에서 옮겨온 5구간 시간대 스케줄 판정 helper다.
 * 연결: 케어/시퀀스 로직에서 현재 시간대가 기상, 식사, 수면, 야간, idle 중 어디인지 판단한다.
 * 주의: backend persistence 분리와 직접 관련된 저장소가 아니므로 DB 상태를 여기서 수정하지 않는다.
 */
// 5구간 시간대 판정:
// - zone 1: 05:00~12:00, morning/breakfast
// - zone 2: 13:00~16:00, lunch
// - zone 3: 17:00~20:00, dinner
// - zone 4: 22:00~04:00, sleep/night
// - zone 0: 그 외 idle
export type SchedKind = 'WakeUp' | 'Eat' | 'Idle' | 'Sleep' | 'Night'
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | undefined

export interface ScheduleResult {
  sched: SchedKind
  mealType: MealType
}

export type ZoneIdx = 0 | 1 | 2 | 3 | 4

export function getSchedIdx(hours: number): ZoneIdx {
  if (hours >= 5 && hours < 12) return 1
  if (hours >= 13 && hours < 16) return 2
  if (hours >= 17 && hours < 20) return 3
  if ((hours >= 22 && hours < 24) || (hours >= 0 && hours < 4)) return 4
  return 0
}

interface GetScheduleArgs {
  prevDate: Date
  tempDate?: Date | null
  clearTempDate?: () => void
  now?: () => Date
}

// 현재 시간대와 마지막 시퀀스 진입 시간을 비교해 다음 스케줄 상태를 결정한다.
// prevDate는 마지막 진입 시간, tempDate는 특정 분기에서 사용하는 임시 시간 마커다.
export function getSchedule({
  prevDate,
  tempDate,
  clearTempDate,
  now = () => new Date(),
}: GetScheduleArgs): ScheduleResult {
  const cd = now()
  const cdIdx = getSchedIdx(cd.getHours())
  const prevIdx = getSchedIdx(prevDate.getHours())

  const sameDay =
    cd.getDate() === prevDate.getDate() &&
    cd.getMonth() === prevDate.getMonth() &&
    cd.getFullYear() === prevDate.getFullYear()

  if (cdIdx !== prevIdx || !sameDay) {
    if (cdIdx === 1) {
      if (tempDate) {
        const tempSameDay =
          tempDate.getDate() === cd.getDate() &&
          tempDate.getMonth() === cd.getMonth() &&
          tempDate.getFullYear() === cd.getFullYear()

        if (tempSameDay) {
          return cd.getHours() >= 8 && cd.getHours() < 12
            ? { sched: 'Eat', mealType: 'Breakfast' }
            : { sched: 'Idle', mealType: undefined }
        }
        clearTempDate?.()
        return cd.getHours() >= 5 && cd.getHours() < 10
          ? { sched: 'WakeUp', mealType: undefined }
          : { sched: 'Eat', mealType: 'Breakfast' }
      }
      return cd.getHours() >= 5 && cd.getHours() < 10
        ? { sched: 'WakeUp', mealType: undefined }
        : { sched: 'Eat', mealType: 'Breakfast' }
    }

    if (cdIdx === 0) {
      return cd.getHours() >= 4 && cd.getHours() < 5
        ? { sched: 'Night', mealType: undefined }
        : { sched: 'Idle', mealType: undefined }
    }

    if (cdIdx === 2) return { sched: 'Eat', mealType: 'Lunch' }
    if (cdIdx === 3) return { sched: 'Eat', mealType: 'Dinner' }

    if (cdIdx === 4) {
      const isLateNight =
        prevDate.getHours() >= 22 &&
        prevDate.getHours() < 24 &&
        cd.getHours() >= 0 &&
        cd.getHours() < 4 &&
        cd.getTime() - prevDate.getTime() < 1000 * 60 * 60 * 6
      return isLateNight
        ? { sched: 'Night', mealType: undefined }
        : { sched: 'Sleep', mealType: undefined }
    }
  }

  if (cdIdx === 4) {
    const isPostMidnight =
      prevDate.getHours() >= 0 &&
      prevDate.getHours() < 4 &&
      cd.getHours() >= 22 &&
      cd.getHours() < 24
    return isPostMidnight
      ? { sched: 'Sleep', mealType: undefined }
      : { sched: 'Night', mealType: undefined }
  }

  return { sched: 'Idle', mealType: undefined }
}








