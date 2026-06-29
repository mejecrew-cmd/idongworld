/**
 * packages/backend/src/repositories/userRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { UserDoc } from '../store/memoryStore.js'

export type AuthProviderCode = 'guest' | 'google' | 'twitter' | 'firebase' | 'password'

export interface ProviderAccountDoc {
  id: string
  uid: string
  providerCode: Exclude<AuthProviderCode, 'guest'> | string
  providerSubjectId: string
  email?: string
  emailNormalized?: string
  emailVerified?: boolean
  displayName?: string
  photoUrl?: string
  linkedAt: number
  lastLoginAt?: number
  status: 'active' | 'unlinked' | 'blocked' | string
  createdAt: number
  updatedAt: number
}

export interface AuthUserInput {
  uid: string
  provider: 'google' | 'twitter' | 'firebase'
  providerUid?: string
  email?: string
  emailNormalized?: string
  emailVerified?: boolean
  displayName?: string
  photoURL?: string
}

export interface PasswordUserInput {
  uid: string
  loginId: string
  loginIdNormalized: string
  passwordHash: string
}

export interface UserRepository {
  createGuestUser(): Promise<UserDoc>
  createOrUpdateAuthUser(input: AuthUserInput): Promise<UserDoc>
  createPasswordUser(input: PasswordUserInput): Promise<UserDoc>
  findByProviderAccount(
    providerCode: ProviderAccountDoc['providerCode'],
    providerSubjectId: string,
  ): Promise<UserDoc | undefined>
  listProviderAccounts(uid: string): Promise<ProviderAccountDoc[]>
  recordLogin(uid: string, provider: AuthProviderCode | string): Promise<UserDoc | undefined>
  findByLoginId(loginIdNormalized: string): Promise<UserDoc | undefined>
  getUser(uid: string): Promise<UserDoc | undefined>
  updateUser(uid: string, patch: Partial<UserDoc>): Promise<UserDoc | undefined>
  deleteUser(uid: string): Promise<boolean>
  listUsers(): Promise<UserDoc[]>
}






