import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto'

const HASH_ITERATIONS = 120_000
const HASH_KEY_LENGTH = 32
const HASH_DIGEST = 'sha256'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function getPasswordAuthSecret(): string {
  return process.env.AUTH_PASSWORD_SECRET
    ?? process.env.SESSION_SECRET
    ?? (process.env.NODE_ENV === 'production' ? '' : 'idongworld-dev-password-auth-secret')
}

export function assertPasswordAuthRuntimeReady(): void {
  if (process.env.NODE_ENV === 'production' && !getPasswordAuthSecret()) {
    throw new Error('password_auth_secret_required')
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url')
  const derived = pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST)
  return `pbkdf2:${HASH_DIGEST}:${HASH_ITERATIONS}:${salt}:${derived.toString('base64url')}`
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false
  const [scheme, digest, iterationsText, salt, hash] = storedHash.split(':')
  const iterations = Number(iterationsText)
  if (scheme !== 'pbkdf2' || digest !== HASH_DIGEST || !Number.isFinite(iterations) || !salt || !hash) {
    return false
  }
  const derived = pbkdf2Sync(password, salt, iterations, HASH_KEY_LENGTH, digest)
  const stored = Buffer.from(hash, 'base64url')
  return stored.length === derived.length && timingSafeEqual(stored, derived)
}

function sign(payload: string): string {
  return createHmac('sha256', getPasswordAuthSecret()).update(payload).digest('base64url')
}

export function issuePasswordSessionToken(uid: string): string {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const payload = base64UrlEncode(JSON.stringify({ uid, expiresAt }))
  return `${payload}.${sign(payload)}`
}

export function verifyPasswordSessionToken(token?: string): { uid: string } | undefined {
  if (!token || !getPasswordAuthSecret()) return undefined
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return undefined
  const expected = sign(payload)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return undefined
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as { uid?: unknown; expiresAt?: unknown }
    if (typeof parsed.uid !== 'string' || typeof parsed.expiresAt !== 'number') return undefined
    if (parsed.expiresAt < Date.now()) return undefined
    return { uid: parsed.uid }
  } catch {
    return undefined
  }
}
