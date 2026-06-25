/**
 * packages/backend/src/index.ts
 * ------------------------------------------------------------
 * 역할: Express backend entrypoint. Mongo 연결, repository 초기화, 공통 middleware, API route mount를 담당한다.
 * 연결: 단일 서버 안에서 account/host/module/customs API를 mount해 모듈별 backend 경계를 만든다.
 * 주의: 신규 모듈 API는 여기 직접 흩뿌리지 말고 modules/index.ts 또는 해당 module route에서 mount한다.
 */
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { gachaRouter } from './routes/gacha.js'
import { careRouter } from './routes/care.js'
import { assetsRouter } from './routes/assets.js'
import { modulesRouter } from './routes/modules.js'
import { accountRouter, authRouter } from './modules/account/routes.js'
import { hostRouter } from './modules/host/routes.js'
import { customsRouter } from './modules/customs/routes.js'
import { backendModuleRouter } from './modules/index.js'
import { connectMongo, disconnectMongo, getMongoStatus } from './db/mongo.js'
import { getRepositoryStatus, initializeRepositories } from './repositories/index.js'
import { assertAuthRuntimeReady, authMiddleware, getAuthRuntimeStatus } from './middleware/auth.js'

dotenv.config({ path: '.env.local' })
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT ?? 4000)
const DEV_ORIGIN_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+$/
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const WORKSPACE_ROOT = path.resolve(__dirname, '../../..')

function resolveStaticRoot(envName: 'ASSET_ROOT' | 'SCENARIO_ROOT', fallback: string) {
  const configured = process.env[envName]
  const root = configured
    ? path.resolve(configured)
    : path.resolve(WORKSPACE_ROOT, fallback)
  const exists = fs.existsSync(root) && fs.statSync(root).isDirectory()
  return { root, exists, source: configured ? 'env' : 'default' }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || DEV_ORIGIN_PATTERN.test(origin) || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true)
      return
    }
    callback(new Error(`cors_origin_not_allowed:${origin}`))
  },
  credentials: true,
}))
app.use(express.json())
app.use('/api', authMiddleware)

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'idongworld-backend',
    version: '0.1.0',
    mongo: getMongoStatus(),
    auth: getAuthRuntimeStatus(),
    migration: {
      legacyStateApiRemoved: true,
      repositories: getRepositoryStatus(),
    },
  })
})

const ASSET_STATIC = resolveStaticRoot('ASSET_ROOT', 'resources')
const SCENARIO_STATIC = resolveStaticRoot('SCENARIO_ROOT', 'resources/cutscenes/public')

if (ASSET_STATIC.exists) {
  app.use('/assets', express.static(ASSET_STATIC.root))
}
if (SCENARIO_STATIC.exists) {
  app.use('/scenarios', express.static(SCENARIO_STATIC.root))
}

app.use('/api/auth', authRouter)
app.use('/api/account', accountRouter)
app.use('/api/gacha', gachaRouter)
app.use('/api/care', careRouter)
app.use('/api/assets', assetsRouter)
app.use('/api/modules', backendModuleRouter)
app.use('/api/modules', modulesRouter)
app.use('/api/host', hostRouter)
app.use('/api/customs', customsRouter)

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path })
})

async function main() {
  assertAuthRuntimeReady()
  await connectMongo()
  initializeRepositories()

  const server = app.listen(PORT, () => {
    console.log(`backend up on http://localhost:${PORT}`)
    console.log(`  - assets:    ${ASSET_STATIC.exists ? ASSET_STATIC.root : `not mounted (${ASSET_STATIC.root})`}`)
    console.log(`  - scenarios: ${SCENARIO_STATIC.exists ? SCENARIO_STATIC.root : `not mounted (${SCENARIO_STATIC.root})`}`)
  })

  const shutdown = async (signal: NodeJS.Signals) => {
    console.log(`[backend] ${signal} received. Shutting down...`)
    server.close(async () => {
      await disconnectMongo()
      process.exit(0)
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

void main().catch((error) => {
  console.error('[backend] failed to start', error)
  process.exit(1)
})








