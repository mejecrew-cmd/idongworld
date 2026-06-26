/**
 * packages/backend/src/repositories/memoryAdminRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory 관리자 repository 구현이다.
 * 연결: Mongo가 연결되지 않은 환경에서도 admin middleware/API 계약을 검증할 수 있게 한다.
 * 주의: 서버 재시작 시 관리자 권한과 감사 로그가 사라지므로 운영 권위 저장소로 쓰지 않는다.
 */
import type { AdminAuditLogDoc } from '../models/AdminAuditLogModel.js'
import type { AdminUserDoc } from '../models/AdminUserModel.js'
import type { AdminRepository } from './adminRepository.js'

const adminUsers = new Map<string, AdminUserDoc>()
const auditLogs: AdminAuditLogDoc[] = []

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const memoryAdminRepository: AdminRepository = {
  async getAdminUser(uid) {
    const user = adminUsers.get(uid)
    return user ? clone(user) : undefined
  },

  async upsertAdminUser(input) {
    const now = Date.now()
    const existing = adminUsers.get(input.uid)
    const next: AdminUserDoc = {
      uid: input.uid,
      role: input.role,
      permissions: input.permissions ?? existing?.permissions ?? [],
      enabled: input.enabled ?? existing?.enabled ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    adminUsers.set(input.uid, next)
    return clone(next)
  },

  async setAdminEnabled(uid, enabled) {
    const existing = adminUsers.get(uid)
    if (!existing) return undefined
    const next = { ...existing, enabled, updatedAt: Date.now() }
    adminUsers.set(uid, next)
    return clone(next)
  },

  async writeAdminAuditLog(input) {
    const log: AdminAuditLogDoc = {
      adminUid: input.adminUid,
      action: input.action,
      targetUid: input.targetUid,
      payloadSummary: input.payloadSummary ?? {},
      ip: input.ip,
      createdAt: Date.now(),
    }
    auditLogs.unshift(log)
    return clone(log)
  },

  async listAdminAuditLogs(query = {}) {
    const limit = Math.max(1, Math.min(200, Math.floor(query.limit ?? 50)))
    return auditLogs
      .filter((log) => !query.adminUid || log.adminUid === query.adminUid)
      .filter((log) => !query.action || log.action === query.action)
      .filter((log) => !query.targetUid || log.targetUid === query.targetUid)
      .slice(0, limit)
      .map(clone)
  },
}
