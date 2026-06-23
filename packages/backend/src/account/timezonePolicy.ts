/**
 * packages/backend/src/account/timezonePolicy.ts
 * ------------------------------------------------------------
 * 역할: 가입/계정 설정에서 저장하는 IANA timezone 값을 검증하고 정규화한다.
 * 연결: account route의 timezone 저장 API가 같은 검증 결과를 사용한다.
 * 주의: timezone 목록 UI는 frontend가 담당하고, backend는 저장 가능한 값인지 최종 검증한다.
 */

export type TimezoneRejectReason =
  | 'empty'
  | 'invalid_timezone'
  | 'invalid_detected_timezone'
  | 'invalid_utc_offset'

const MAX_ABSOLUTE_UTC_OFFSET_MINUTES = 14 * 60

function normalizeTimezone(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidIanaTimeZone(value: string): boolean {
  if (!value) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0)
    return true
  } catch {
    return false
  }
}

function readUtcOffsetMinutes(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined
  if (Math.abs(value) > MAX_ABSOLUTE_UTC_OFFSET_MINUTES) return undefined
  return value
}

export function validateTimezonePayload(value: unknown): {
  timeZone: string
  detectedTimeZone?: string
  utcOffsetMinutes?: number
  reasons: TimezoneRejectReason[]
} {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
  const timeZone = normalizeTimezone(source.timeZone)
  const detectedTimeZone = normalizeTimezone(source.detectedTimeZone)
  const utcOffsetMinutes = readUtcOffsetMinutes(source.utcOffsetMinutes)
  const reasons: TimezoneRejectReason[] = []

  if (!timeZone) reasons.push('empty')
  else if (!isValidIanaTimeZone(timeZone)) reasons.push('invalid_timezone')

  if (detectedTimeZone && !isValidIanaTimeZone(detectedTimeZone)) {
    reasons.push('invalid_detected_timezone')
  }

  if (
    source.utcOffsetMinutes !== undefined &&
    source.utcOffsetMinutes !== null &&
    source.utcOffsetMinutes !== '' &&
    utcOffsetMinutes === undefined
  ) {
    reasons.push('invalid_utc_offset')
  }

  return {
    timeZone,
    detectedTimeZone: detectedTimeZone || undefined,
    utcOffsetMinutes,
    reasons,
  }
}
