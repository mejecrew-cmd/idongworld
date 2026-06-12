/**
 * packages/backend/scripts/check-mongo-atlas-readiness.mjs
 * ------------------------------------------------------------
 * 역할: Atlas 전환 직전에 MONGO_URI와 topology가 운영 전환 기준을 만족하는지 확인한다.
 * 연결: repository/service 코드를 바꾸지 않고 MONGO_URI 교체만으로 Atlas 전환 가능한지 검증한다.
 * 주의: 실제 Atlas credential이 필요하므로 local 개발 기본 검증에서는 실행하지 않는다.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config({ path: '.env.local' })
dotenv.config()

function maskMongoUri(uri) {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@')
}

function assertAtlasUri(uri) {
  if (!uri) throw new Error('MONGO_URI is required for Atlas readiness check')
  if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
    throw new Error('MONGO_URI points to local MongoDB, not Atlas')
  }
  if (!uri.startsWith('mongodb+srv://')) {
    throw new Error('Atlas readiness check expects mongodb+srv:// URI')
  }
}

function supportsTransactions(hello) {
  return Boolean(hello.setName || hello.msg === 'isdbgrid')
}

async function main() {
  const uri = process.env.MONGO_URI?.trim()
  assertAtlasUri(uri)

  if (process.env.MONGO_CONNECT_REQUIRED !== 'true') {
    throw new Error('MONGO_CONNECT_REQUIRED must be true for Atlas/staging/production readiness')
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 5000),
  })

  try {
    const db = mongoose.connection.db
    if (!db) throw new Error('mongo db handle unavailable')

    const hello = await db.admin().command({ hello: 1 })
    const transactionsSupported = supportsTransactions(hello)
    const transactionsEnabled = process.env.MONGO_TRANSACTIONS_ENABLED === 'true'

    if (transactionsEnabled && !transactionsSupported) {
      throw new Error('MONGO_TRANSACTIONS_ENABLED=true but Atlas topology does not support transactions')
    }

    console.log(JSON.stringify({
      ok: true,
      atlasReady: true,
      connected: true,
      uri: maskMongoUri(uri),
      dbName: db.databaseName,
      connectRequired: true,
      transactionsEnabled,
      transactionsSupported,
      topology: {
        setName: hello.setName,
        msg: hello.msg,
        isWritablePrimary: hello.isWritablePrimary,
      },
    }, null, 2))
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(async (error) => {
  await mongoose.disconnect().catch(() => undefined)
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
