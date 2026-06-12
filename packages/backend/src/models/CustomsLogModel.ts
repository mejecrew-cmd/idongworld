/**
 * packages/backend/src/models/CustomsLogModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { ResourceRef } from '../resources/index.js'

export interface CustomsLogDoc {
  uid: string
  ruleId: string
  status: 'success' | 'failure'
  from?: ResourceRef
  to?: ResourceRef
  debitAmount?: number
  creditAmount?: number
  multiplier?: number
  idempotencyKey?: string
  error?: string
  createdAt: number
}

const ResourceRefSchema = new Schema<ResourceRef>(
  {
    scope: { type: String, required: true },
    moduleId: String,
    resource: { type: String, required: true },
  },
  {
    _id: false,
    versionKey: false,
  },
)

const CustomsLogSchema = new Schema<CustomsLogDoc>(
  {
    uid: { type: String, required: true, index: true },
    ruleId: { type: String, required: true, index: true },
    status: { type: String, required: true, index: true },
    from: ResourceRefSchema,
    to: ResourceRefSchema,
    debitAmount: Number,
    creditAmount: Number,
    multiplier: Number,
    idempotencyKey: { type: String, index: true },
    error: String,
    createdAt: { type: Number, required: true, index: true },
  },
  {
    collection: 'customsLogs',
    minimize: false,
    versionKey: false,
  },
)

CustomsLogSchema.index(
  { uid: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
)

export const CustomsLogModel =
  mongoose.models.CustomsLog ?? mongoose.model<CustomsLogDoc>('CustomsLog', CustomsLogSchema)






