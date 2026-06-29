/**
 * packages/backend/src/models/MydongPersonaPartStateModel.ts
 * ------------------------------------------------------------
 * 역할: mydongPersonaPartStates collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { MydongPersonaPartStateDoc } from '../repositories/mydongCosmeticRepository.js'

const MydongPersonaPartStateSchema = new Schema<MydongPersonaPartStateDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    mydongUid: { type: String, required: true, index: true },
    aidongId: { type: String, required: true, index: true },
    partType: { type: String, required: true },
    partId: { type: String, required: true },
    state: { type: String, required: true, default: 'active' },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'mydongPersonaPartStates',
    minimize: false,
    versionKey: false,
  },
)

MydongPersonaPartStateSchema.index({ uid: 1, mydongUid: 1, partType: 1 }, { unique: true })

export const MydongPersonaPartStateModel =
  mongoose.models.MydongPersonaPartState ??
  mongoose.model<MydongPersonaPartStateDoc>('MydongPersonaPartState', MydongPersonaPartStateSchema)
