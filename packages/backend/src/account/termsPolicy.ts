/**
 * packages/backend/src/account/termsPolicy.ts
 * ------------------------------------------------------------
 * 역할: 가입/계정 약관의 현재 버전과 동의 payload 검증을 담당한다.
 * 연결: account route의 current terms 조회와 terms agree API가 같은 config를 사용한다.
 * 주의: 선택 약관은 동의하지 않아도 반드시 false로 저장해 이후 철회/버전 변경 판단에 사용한다.
 */
import type { TermsAgreementState } from '../store/memoryStore.js'

export type TermsRejectReason =
  | 'invalid_payload'
  | 'service_terms_required'
  | 'privacy_policy_required'
  | 'service_terms_version_mismatch'
  | 'privacy_policy_version_mismatch'
  | 'marketing_terms_version_mismatch'
  | 'marketing_accepted_required_boolean'
  | 'age_confirmed_required'

export interface CurrentTermsConfig {
  serviceTermsVersion: string
  privacyPolicyVersion: string
  marketingTermsVersion: string
  ageGateVersion: string
  required: Array<'service' | 'privacy' | 'age'>
  optional: Array<'marketing'>
}

export const CURRENT_TERMS: CurrentTermsConfig = {
  serviceTermsVersion: 'service-2026-06-15',
  privacyPolicyVersion: 'privacy-2026-06-15',
  marketingTermsVersion: 'marketing-2026-06-15',
  ageGateVersion: 'age-2026-06-15',
  required: ['service', 'privacy', 'age'],
  optional: ['marketing'],
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function getCurrentTermsConfig(): CurrentTermsConfig {
  return CURRENT_TERMS
}

export function validateTermsAgreementPayload(value: unknown, now = Date.now()): {
  agreement?: TermsAgreementState
  reasons: TermsRejectReason[]
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { reasons: ['invalid_payload'] }
  }

  const source = value as Record<string, unknown>
  const serviceTermsVersion = readString(source.serviceTermsVersion)
  const privacyPolicyVersion = readString(source.privacyPolicyVersion)
  const marketingTermsVersion = readString(source.marketingTermsVersion)
  const ageGateVersion = readString(source.ageGateVersion)
  const marketingAccepted = source.marketingAccepted
  const ageConfirmed = source.ageConfirmed
  const reasons: TermsRejectReason[] = []

  if (!serviceTermsVersion) reasons.push('service_terms_required')
  else if (serviceTermsVersion !== CURRENT_TERMS.serviceTermsVersion) {
    reasons.push('service_terms_version_mismatch')
  }

  if (!privacyPolicyVersion) reasons.push('privacy_policy_required')
  else if (privacyPolicyVersion !== CURRENT_TERMS.privacyPolicyVersion) {
    reasons.push('privacy_policy_version_mismatch')
  }

  if (
    marketingTermsVersion !== undefined &&
    marketingTermsVersion !== CURRENT_TERMS.marketingTermsVersion
  ) {
    reasons.push('marketing_terms_version_mismatch')
  }

  if (typeof marketingAccepted !== 'boolean') {
    reasons.push('marketing_accepted_required_boolean')
  }

  if (ageConfirmed !== true || ageGateVersion !== CURRENT_TERMS.ageGateVersion) {
    reasons.push('age_confirmed_required')
  }

  if (reasons.length) return { reasons }

  const marketingAcceptedValue = marketingAccepted === true

  return {
    reasons,
    agreement: {
      serviceTermsVersion,
      privacyPolicyVersion,
      marketingTermsVersion: marketingTermsVersion ?? CURRENT_TERMS.marketingTermsVersion,
      marketingAccepted: marketingAcceptedValue,
      ageConfirmed: true,
      ageGateVersion: CURRENT_TERMS.ageGateVersion,
      agreedAt: now,
    },
  }
}
