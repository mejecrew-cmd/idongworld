/**
 * packages/backend/src/account/nicknamePolicy.ts
 * ------------------------------------------------------------
 * 역할: 회원가입 닉네임의 정규화, 길이, 형식, 금칙어 검사를 담당한다.
 * 연결: account route의 nickname check/profile completion API가 같은 검증 결과를 사용한다.
 * 주의: 중복 여부는 repository가 판단하고, 이 파일은 문자열 자체의 정책만 다룬다.
 */

export type NicknameRejectReason =
  | 'empty'
  | 'too_long'
  | 'invalid_format'
  | 'forbidden_word'
  | 'duplicate'

const MAX_NICKNAME_LENGTH = 8

const FORBIDDEN_NICKNAME_WORDS = [
  'admin',
  'administrator',
  'manager',
  'moderator',
  'official',
  'idongworld',
  '운영자',
  '관리자',
  '공식',
  '아이동월드',
]

function countVisibleChars(value: string): number {
  return Array.from(value).length
}

export function normalizeNickname(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, '')
    : ''
}

export function normalizeNicknameKey(value: string): string {
  return normalizeNickname(value).toLocaleLowerCase('ko-KR')
}

export function validateNicknameText(value: unknown): {
  normalizedNickname: string
  nicknameKey: string
  reasons: NicknameRejectReason[]
} {
  const normalizedNickname = normalizeNickname(value)
  const nicknameKey = normalizeNicknameKey(normalizedNickname)
  const reasons: NicknameRejectReason[] = []

  if (!normalizedNickname) reasons.push('empty')
  if (countVisibleChars(normalizedNickname) > MAX_NICKNAME_LENGTH) reasons.push('too_long')
  if (normalizedNickname && !/^[\p{L}\p{N}_]+$/u.test(normalizedNickname)) {
    reasons.push('invalid_format')
  }
  if (FORBIDDEN_NICKNAME_WORDS.some((word) => nicknameKey.includes(word.toLocaleLowerCase('ko-KR')))) {
    reasons.push('forbidden_word')
  }

  return {
    normalizedNickname,
    nicknameKey,
    reasons,
  }
}
