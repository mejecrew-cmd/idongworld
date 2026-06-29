/**
 * packages/backend/src/repositories/adminRepository.ts
 * ------------------------------------------------------------
 * 역할: 관리자 권한과 감사 로그 저장소 접근을 캡슐화한다.
 * 연결: admin middleware, admin route, 초기 owner 생성 스크립트가 이 인터페이스를 사용한다.
 * 주의: 관리자 권한은 users 문서가 아니라 adminUsers 문서만 기준으로 판단한다.
 */
import type { AdminAuditLogDoc } from '../models/AdminAuditLogModel.js'
import type { AdminRole, AdminUserDoc } from '../models/AdminUserModel.js'

export interface AdminUserInput {
  uid: string
  role: AdminRole
  permissions?: string[]
  enabled?: boolean
}

export interface AdminAuditLogInput {
  adminUid: string
  action: string
  targetUid?: string
  payloadSummary?: Record<string, unknown>
  ip?: string
}

export interface AdminAuditLogQuery {
  adminUid?: string
  action?: string
  targetUid?: string
  limit?: number
}

export interface AdminRepository {
  getAdminUser(uid: string): Promise<AdminUserDoc | undefined>
  upsertAdminUser(input: AdminUserInput): Promise<AdminUserDoc>
  setAdminEnabled(uid: string, enabled: boolean): Promise<AdminUserDoc | undefined>
  writeAdminAuditLog(input: AdminAuditLogInput): Promise<AdminAuditLogDoc>
  listAdminAuditLogs(query?: AdminAuditLogQuery): Promise<AdminAuditLogDoc[]>
}
