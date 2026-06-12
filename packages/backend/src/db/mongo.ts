/**
 * packages/backend/src/db/mongo.ts
 * ------------------------------------------------------------
 * 역할: MongoDB connection lifecycle을 관리한다.
 * 연결: repository 초기화 전에 공통 Mongo 연결 상태를 만들고 health status로 노출한다.
 * 주의: Atlas 전환은 repository 코드를 바꾸지 않고 MONGO_URI/옵션으로 처리한다.
 */
import mongoose from 'mongoose'

export interface MongoStatus {
  enabled: boolean
  connected: boolean
  uri?: string
  dbName?: string
  reason?: string
}

let status: MongoStatus = {
  enabled: false,
  connected: false,
  reason: 'not_initialized',
}

function maskMongoUri(uri: string): string {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@')
}

export function getMongoStatus(): MongoStatus {
  return status
}

export async function connectMongo(): Promise<MongoStatus> {
  const uri = process.env.MONGO_URI?.trim()
  const connectRequired = process.env.MONGO_CONNECT_REQUIRED === 'true'

  if (!uri) {
    status = {
      enabled: false,
      connected: false,
      reason: 'MONGO_URI_missing_memory_fallback',
    }
    console.warn('[mongo] MONGO_URI missing. Using memory store fallback.')
    return status
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 5000),
    })

    status = {
      enabled: true,
      connected: true,
      uri: maskMongoUri(uri),
      dbName: mongoose.connection.db?.databaseName,
    }
    console.info(`[mongo] connected ${status.uri}`)
    return status
  } catch (error) {
    status = {
      enabled: true,
      connected: false,
      uri: maskMongoUri(uri),
      reason: error instanceof Error ? error.message : String(error),
    }

    if (connectRequired) {
      throw error
    }

    console.warn('[mongo] connect failed. Using memory store fallback.', status.reason)
    return status
  }
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 0) return
  await mongoose.disconnect()
  status = {
    enabled: Boolean(process.env.MONGO_URI),
    connected: false,
    reason: 'disconnected',
  }
}






