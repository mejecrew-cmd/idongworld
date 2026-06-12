/**
 * packages/backend/src/db/transaction.ts
 * ------------------------------------------------------------
 * 역할: Mongo transaction 실행 여부와 session wrapping을 관리한다.
 * 연결: customs처럼 여러 document를 함께 바꾸는 작업에서 사용한다.
 * 주의: local standalone Mongo에서는 transaction disabled fallback 동작을 고려한다.
 */
import mongoose, { type ClientSession } from 'mongoose'
import { getMongoStatus } from './mongo.js'

export interface TransactionContext {
  session?: ClientSession
  transactional: boolean
}

export async function withMongoTransaction<T>(
  fn: (ctx: TransactionContext) => Promise<T>,
): Promise<T> {
  const transactionsEnabled = process.env.MONGO_TRANSACTIONS_ENABLED === 'true'
  const mongo = getMongoStatus()

  if (!transactionsEnabled || !mongo.connected) {
    return await fn({ transactional: false })
  }

  const session = await mongoose.startSession()
  try {
    let result: T | undefined
    await session.withTransaction(async () => {
      result = await fn({ session, transactional: true })
    })
    return result as T
  } finally {
    await session.endSession()
  }
}






