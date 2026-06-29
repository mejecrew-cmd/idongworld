/**
 * packages/backend/src/models/SooksoStateModel.ts
 * ------------------------------------------------------------
 * 역할: sooksoStates collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { SooksoStateDoc } from '../repositories/sooksoRepository.js'

const SooksoStateSchema = new Schema<SooksoStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    sooksoName: String,
    sooksoClean: { type: Boolean, required: true, default: false },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'sooksoStates',
    minimize: false,
    versionKey: false,
  },
)

export const SooksoStateModel =
  mongoose.models.SooksoState ?? mongoose.model<SooksoStateDoc>('SooksoState', SooksoStateSchema)
