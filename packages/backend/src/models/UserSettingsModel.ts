/**
 * packages/backend/src/models/UserSettingsModel.ts
 * ------------------------------------------------------------
 * 역할: 유저별 설정/동의 현재값을 users 문서에서 분리해 저장한다.
 * 연결: UserSettingsRepository의 Mongo 구현이 사용한다.
 * 주의: 로그인 세션이나 운영 감사 로그가 아니라, 현재 설정 snapshot이다.
 */
import mongoose, { Schema } from 'mongoose'
import type { UserSettingsDoc } from '../repositories/userSettingsRepository.js'

const UserSettingsSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    locale: String,
    timeZone: String,
    detectedTimeZone: String,
    utcOffsetMinutes: Number,
    termsAccepted: { type: Boolean, required: true, default: false },
    termsVersion: String,
    termsAcceptedAt: Number,
    privacyAccepted: { type: Boolean, required: true, default: false },
    privacyVersion: String,
    privacyAcceptedAt: Number,
    marketingAccepted: { type: Boolean, required: true, default: false },
    pushNotificationAccepted: { type: Boolean, required: true, default: false },
    bgmVolume: { type: Number, required: true, default: 100 },
    sfxVolume: { type: Number, required: true, default: 100 },
    vibrationEnabled: Boolean,
    reduceMotionEnabled: Boolean,
    textSizeLevel: String,
    colorAssistMode: String,
    batterySaveEnabled: Boolean,
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'userSettings',
    minimize: false,
    versionKey: false,
  },
)

export const UserSettingsModel =
  mongoose.models.UserSettings
    ?? mongoose.model<UserSettingsDoc>('UserSettings', UserSettingsSchema)
