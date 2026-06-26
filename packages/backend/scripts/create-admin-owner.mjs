/**
 * packages/backend/scripts/create-admin-owner.mjs
 * ------------------------------------------------------------
 * 역할: 운영 콘솔에서 최초 관리자 계정을 adminUsers 컬렉션에 직접 등록한다.
 * 사용: pnpm --filter backend admin:create-owner -- --uid <firebase-or-password-uid>
 * 주의: 클라이언트/API에서 owner를 만들지 않기 위해 서버 쉘에서만 실행하는 스크립트다.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { AdminAuditLogModel } from '../dist/models/AdminAuditLogModel.js'
import { AdminUserModel } from '../dist/models/AdminUserModel.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`)
  if (index < 0) return undefined
  const value = process.argv[index + 1]
  return value && !value.startsWith('--') ? value : undefined
}

function printUsageAndExit() {
  console.error([
    'Usage:',
    '  pnpm --filter backend admin:create-owner -- --uid <uid>',
    '  pnpm admin:create-owner -- --uid <uid>',
    '',
    'Options:',
    '  --uid <uid>                    최초 owner 권한을 부여할 로그인 uid',
  ].join('\n'))
  process.exit(1)
}

async function main() {
  const uid = readArg('uid')
  const mongoUri = process.env.MONGO_URI?.trim()

  if (!uid || !mongoUri) {
    if (!mongoUri) console.error('[admin:create-owner] MONGO_URI가 필요합니다.')
    printUsageAndExit()
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 5000),
  })

  const now = Date.now()
  const doc = await AdminUserModel.findOneAndUpdate(
    { uid },
    {
      $set: {
        role: 'owner',
        permissions: [],
        enabled: true,
        updatedAt: now,
      },
      $setOnInsert: {
        uid,
        createdAt: now,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean()

  await AdminAuditLogModel.create({
    adminUid: 'system:console',
    action: 'adminUsers.bootstrapOwner',
    targetUid: uid,
    payloadSummary: {
      role: 'owner',
      enabled: true,
      source: 'admin:create-owner',
    },
    createdAt: Date.now(),
  })

  await mongoose.disconnect()

  console.info('[admin:create-owner] 관리자 계정 등록 완료')
  console.info(JSON.stringify({
    uid: doc.uid,
    role: doc.role,
    permissions: doc.permissions,
    enabled: doc.enabled,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }, null, 2))
}

main().catch(async (error) => {
  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect failure during fatal exit
  }
  console.error('[admin:create-owner] 실패:', error instanceof Error ? error.message : error)
  process.exit(1)
})
