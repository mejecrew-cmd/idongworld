/**
 * packages/backend/src/models/AdminUserModel.ts
 * ------------------------------------------------------------
 * 역할: 관리자 권한 문서의 MongoDB schema와 타입을 정의한다.
 * 연결: /api/admin/* 전용 middleware와 repository가 이 문서를 기준으로 권한을 판단한다.
 * 주의: 일반 users 문서에 관리자 권한을 섞지 않고, 운영 권한은 adminUsers 컬렉션에서만 관리한다.
 */
import mongoose, { Schema } from 'mongoose'

export type AdminRole = 'owner' | 'admin' | 'operator' | 'viewer'

export interface AdminUserDoc {
  uid: string
  role: AdminRole
  permissions: string[]
  enabled: boolean
  createdAt: number
  updatedAt: number
}

const ADMIN_ROLES: AdminRole[] = ['owner', 'admin', 'operator', 'viewer']

const AdminUserSchema = new Schema<AdminUserDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      required: true,
      enum: ADMIN_ROLES,
      default: 'viewer',
      index: true,
    },
    permissions: { type: [String], required: true, default: [] },
    enabled: { type: Boolean, required: true, default: true, index: true },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'adminUsers',
    minimize: false,
    versionKey: false,
  },
)

export const AdminUserModel =
  mongoose.models.AdminUser ?? mongoose.model<AdminUserDoc>('AdminUser', AdminUserSchema)
