/**
 * packages/backend/src/models/AdminAuditLogModel.ts
 * ------------------------------------------------------------
 * 역할: 관리자 작업 감사 로그의 MongoDB schema와 타입을 정의한다.
 * 연결: /api/admin/* 변경 API는 성공/실패 여부와 관계없이 중요한 운영 작업을 이 컬렉션에 남긴다.
 * 주의: 민감정보 원문을 그대로 저장하지 말고 payloadSummary에는 필요한 요약만 남긴다.
 */
import mongoose, { Schema } from 'mongoose'

export interface AdminAuditLogDoc {
  adminUid: string
  action: string
  targetUid?: string
  payloadSummary?: Record<string, unknown>
  ip?: string
  createdAt: number
}

const AdminAuditLogSchema = new Schema<AdminAuditLogDoc>(
  {
    adminUid: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    targetUid: { type: String, index: true },
    payloadSummary: { type: Schema.Types.Mixed, default: {} },
    ip: String,
    createdAt: { type: Number, required: true, index: true },
  },
  {
    collection: 'adminAuditLogs',
    minimize: false,
    versionKey: false,
  },
)

AdminAuditLogSchema.index({ adminUid: 1, createdAt: -1 })
AdminAuditLogSchema.index({ targetUid: 1, createdAt: -1 })

export const AdminAuditLogModel =
  mongoose.models.AdminAuditLog ??
  mongoose.model<AdminAuditLogDoc>('AdminAuditLog', AdminAuditLogSchema)
