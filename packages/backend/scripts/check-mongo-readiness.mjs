/**
 * 📌 packages/backend/scripts/check-mongo-readiness.mjs — backend split 안내
 * ────────────────────────────────────────────────────────────
 * 🎯 역할: Backend migration/check script. userStore.ts 중심 legacy 저장 흐름이 Mongo repository, module document, customs API로 분리됐는지 실행 단계에서 확인한다.
 *
 * 🔗 userStore.ts와의 연결:
 *   - frontend의 packages/frontend/src/stores/userStore.ts는 auth, host resource,
 *     Aidong, island/codex, voyage 상태를 한 Zustand store에 담는다.
 *   - backend split 이후 이 파일은 그 통합 상태 중 일부를 users, hostStates,
 *     moduleStates, 전용 module state, customsLogs 중 어디에 저장할지
 *     결정하거나 실행한다.
 *
 * 🧭 작업 안내:
 *   - 신규 기능은 account, host, module, customs, action API를 우선 사용한다.
 *   - account/host/module/customs/action API와 repository/service 경계를 우선 사용한다.
 *   - 다른 모듈 document를 직접 수정하지 않는다.
 *   - cross-module resource 이동은 customs와 resource adapter를 통한다.
 */
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config({ path: '.env.local' })
dotenv.config()

function maskMongoUri(uri) {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@')
}

function supportsTransactions(hello) {
  return Boolean(hello.setName || hello.msg === 'isdbgrid')
}

async function main() {
  const uri = process.env.MONGO_URI?.trim()
  const transactionsEnabled = process.env.MONGO_TRANSACTIONS_ENABLED === 'true'
  const connectRequired = process.env.MONGO_CONNECT_REQUIRED === 'true'

  if (!uri) {
    if (connectRequired) {
      throw new Error('MONGO_URI is missing but MONGO_CONNECT_REQUIRED=true')
    }
    console.log(JSON.stringify({
      ok: true,
      connected: false,
      memoryFallback: true,
      transactionsEnabled,
      transactionsSupported: false,
      reason: 'MONGO_URI_missing_memory_fallback',
    }, null, 2))
    return
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 5000),
  })

  try {
    const db = mongoose.connection.db
    if (!db) throw new Error('mongo db handle unavailable')

    const hello = await db.admin().command({ hello: 1 })
    const transactionsSupported = supportsTransactions(hello)

    if (transactionsEnabled && !transactionsSupported) {
      throw new Error('MONGO_TRANSACTIONS_ENABLED=true but MongoDB topology does not support transactions')
    }

    console.log(JSON.stringify({
      ok: true,
      connected: true,
      uri: maskMongoUri(uri),
      dbName: db.databaseName,
      transactionsEnabled,
      transactionsSupported,
      topology: {
        setName: hello.setName,
        msg: hello.msg,
        isWritablePrimary: hello.isWritablePrimary,
      },
      atlasReady: transactionsSupported,
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



