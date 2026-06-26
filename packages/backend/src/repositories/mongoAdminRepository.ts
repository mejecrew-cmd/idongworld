/**
 * packages/backend/src/repositories/mongoAdminRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 관리자 repository 구현이다.
 * 연결: production admin middleware/API와 초기 owner 생성 스크립트가 이 구현을 사용한다.
 * 주의: 민감정보는 audit log payloadSummary에 원문 저장하지 않는다.
 */
import { AdminAuditLogModel, type AdminAuditLogDoc } from '../models/AdminAuditLogModel.js'
import { AdminUserModel, type AdminRole, type AdminUserDoc } from '../models/AdminUserModel.js'
import type { AdminRepository } from './adminRepository.js'

function toAdminUserDoc(doc: unknown): AdminUserDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as AdminUserDoc
}

function toAdminAuditLogDoc(doc: unknown): AdminAuditLogDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as AdminAuditLogDoc
}

export const mongoAdminRepository: AdminRepository = {
  async getAdminUser(uid) {
    const doc = await AdminUserModel.findOne({ uid }).lean()
    return doc ? toAdminUserDoc(doc) : undefined
  },

  async upsertAdminUser(input) {
    const now = Date.now()
    const updateSet: {
      role: AdminRole
      permissions?: string[]
      enabled?: boolean
      updatedAt: number
    } = {
      role: input.role,
      updatedAt: now,
    }

    if (input.permissions !== undefined) updateSet.permissions = input.permissions
    if (input.enabled !== undefined) updateSet.enabled = input.enabled

    const doc = await AdminUserModel.findOneAndUpdate(
      { uid: input.uid },
      {
        $set: updateSet,
        $setOnInsert: {
          uid: input.uid,
          permissions: input.permissions ?? [],
          enabled: input.enabled ?? true,
          createdAt: now,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean()
    return toAdminUserDoc(doc)
  },

  async setAdminEnabled(uid, enabled) {
    const doc = await AdminUserModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          enabled,
          updatedAt: Date.now(),
        },
      },
      { new: true },
    ).lean()
    return doc ? toAdminUserDoc(doc) : undefined
  },

  async writeAdminAuditLog(input) {
    const created = await AdminAuditLogModel.create({
      adminUid: input.adminUid,
      action: input.action,
      targetUid: input.targetUid,
      payloadSummary: input.payloadSummary ?? {},
      ip: input.ip,
      createdAt: Date.now(),
    })
    return toAdminAuditLogDoc(created.toObject())
  },

  async listAdminAuditLogs(query = {}) {
    const filter: Record<string, string> = {}
    if (query.adminUid) filter.adminUid = query.adminUid
    if (query.action) filter.action = query.action
    if (query.targetUid) filter.targetUid = query.targetUid
    const limit = Math.max(1, Math.min(200, Math.floor(query.limit ?? 50)))
    const docs = await AdminAuditLogModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
    return docs.map(toAdminAuditLogDoc)
  },
}
