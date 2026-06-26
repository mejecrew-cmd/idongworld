/**
 * packages/backend/src/middleware/admin.ts
 * ------------------------------------------------------------
 * 역할: /api/admin/* 전용 관리자 권한 middleware와 helper를 제공한다.
 * 연결: authMiddleware가 먼저 req.user/uid를 채운 뒤, 이 파일이 adminUsers 문서를 조회해 운영 권한을 판단한다.
 * 주의: users 문서나 클라이언트 표시값이 아니라 adminUsers 컬렉션만 관리자 권한의 기준으로 삼는다.
 */
import type { NextFunction, Request, Response } from 'express'
import type { AdminRole, AdminUserDoc } from '../models/AdminUserModel.js'
import { getRequestUid, type AuthedRequest } from './auth.js'
import { getAdminRepository } from '../repositories/index.js'

const ADMIN_ROLE_LEVEL: Record<AdminRole, number> = {
  owner: 400,
  admin: 300,
  operator: 200,
  viewer: 100,
}

export interface AdminRequest extends AuthedRequest {
  adminUser?: AdminUserDoc
}

export interface AdminRequirement {
  role?: AdminRole
  permission?: string | string[]
}

function normalizePermissions(permission?: string | string[]): string[] {
  if (!permission) return []
  return Array.isArray(permission) ? permission : [permission]
}

export function getRequestAdminUser(req: Request): AdminUserDoc | undefined {
  return (req as AdminRequest).adminUser
}

export function adminHasRole(adminUser: AdminUserDoc | undefined, role: AdminRole): boolean {
  if (!adminUser?.enabled) return false
  return ADMIN_ROLE_LEVEL[adminUser.role] >= ADMIN_ROLE_LEVEL[role]
}

export function adminHasPermission(adminUser: AdminUserDoc | undefined, permission: string): boolean {
  if (!adminUser?.enabled) return false
  if (adminUser.role === 'owner') return true
  return adminUser.permissions.includes(permission)
}

export function adminHasEveryPermission(
  adminUser: AdminUserDoc | undefined,
  permissions: string[],
): boolean {
  return permissions.every((permission) => adminHasPermission(adminUser, permission))
}

export function requireAdmin(requirement: AdminRequirement = {}) {
  return async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
    const uid = getRequestUid(req)
    if (!uid) {
      res.status(401).json({ error: 'auth_required' })
      return
    }

    const adminUser = await getAdminRepository().getAdminUser(uid)
    if (!adminUser || adminUser.enabled !== true) {
      res.status(403).json({ error: 'admin_required' })
      return
    }

    if (requirement.role && !adminHasRole(adminUser, requirement.role)) {
      res.status(403).json({ error: 'admin_role_required', role: requirement.role })
      return
    }

    const permissions = normalizePermissions(requirement.permission)
    if (permissions.length > 0 && !adminHasEveryPermission(adminUser, permissions)) {
      res.status(403).json({ error: 'admin_permission_required', permissions })
      return
    }

    req.adminUser = adminUser
    next()
  }
}

export const adminMiddleware = requireAdmin()

export function requireAdminRole(role: AdminRole) {
  return requireAdmin({ role })
}

export function requireAdminPermission(permission: string | string[]) {
  return requireAdmin({ permission })
}
