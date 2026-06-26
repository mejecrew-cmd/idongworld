import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'
import {
  api,
  type AdminHostResource,
  type AdminHostSummary,
  type AdminRole,
  type AdminUserContext,
  type AdminUserDetail,
  type AdminUserSummary,
} from '@/lib/api'

const ADMIN_ROLES: AdminRole[] = ['owner', 'admin', 'operator', 'viewer']
const HOST_RESOURCES: AdminHostResource[] = ['coins', 'diamonds', 'diceCount']
const ROLE_PERMISSION_DESCRIPTIONS: Record<AdminRole, string> = {
  viewer: '유저 정보와 DB 관리 정보를 열람할 수 있습니다.',
  operator: '유저 정보와 DB 관리 정보를 열람/수정할 수 있지만 관리자 권한은 부여할 수 없습니다.',
  admin: 'owner와 동일하게 모든 정보를 열람/수정하고 관리자 권한을 부여할 수 있습니다.',
  owner: '모든 정보를 열람/수정하고 관리자 권한을 부여할 수 있습니다.',
}

function formatDate(value?: number) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function boolText(value?: boolean) {
  if (value === undefined) return '-'
  return value ? '예' : '아니오'
}

export const AdminScreen = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminUser, setAdminUser] = useState<AdminUserContext | null>(null)
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUid, setSelectedUid] = useState('')
  const [detail, setDetail] = useState<{ user: AdminUserDetail; host: AdminHostSummary } | null>(null)
  const [grantResource, setGrantResource] = useState<AdminHostResource>('coins')
  const [grantDelta, setGrantDelta] = useState('100')
  const [accountPatch, setAccountPatch] = useState({
    nickname: '',
    hostName: '',
    sooksoName: '',
  })
  const [targetRole, setTargetRole] = useState<AdminRole>('viewer')
  const [targetEnabled, setTargetEnabled] = useState(true)

  const canManageAdmins = adminUser?.role === 'owner' || adminUser?.permissions.includes('adminUsers.write')

  const permissionText = useMemo(() => {
    if (!adminUser) return ''
    if (adminUser.role === 'owner') return ROLE_PERMISSION_DESCRIPTIONS.owner
    if (adminUser.role === 'admin') return ROLE_PERMISSION_DESCRIPTIONS.admin
    return adminUser.permissions.length ? adminUser.permissions.join(', ') : '별도 permission 없음'
  }, [adminUser])

  const loadUsers = async (query = searchQuery) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setUsers([])
      setSelectedUid('')
      setDetail(null)
      return
    }
    const response = await api.adminListUsers(100, trimmed)
    setUsers(response.users)
    if (!response.users.some((user) => user.uid === selectedUid)) {
      setSelectedUid(response.users[0]?.uid ?? '')
      if (!response.users[0]) setDetail(null)
    }
  }

  const loadDetail = async (uid: string) => {
    if (!uid) return
    const response = await api.adminGetUser(uid)
    setDetail(response)
    setAccountPatch({
      nickname: response.user.nickname ?? '',
      hostName: response.user.hostName ?? '',
      sooksoName: response.user.sooksoName ?? '',
    })
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    void api.adminMe()
      .then(async (response) => {
        if (!mounted) return
        setAdminUser(response.adminUser)
      })
      .catch((caught: unknown) => {
        if (!mounted) return
        setError(caught instanceof Error ? caught.message : String(caught))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedUid || !adminUser) return
    setError(null)
    void loadDetail(selectedUid).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : String(caught))
    })
  }, [selectedUid, adminUser])

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await loadUsers()
      if (selectedUid) await loadDetail(selectedUid)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  const handleGrantResource = () => {
    if (!selectedUid) return
    const delta = Number(grantDelta)
    if (!Number.isFinite(delta) || delta === 0) {
      alert('지급/차감 수량을 숫자로 입력해 주세요.')
      return
    }
    if (!confirm(`${selectedUid}에게 ${grantResource} ${delta}를 적용할까요?`)) return
    void runAction(async () => {
      await api.adminGrantResource(selectedUid, grantResource, Math.trunc(delta))
    })
  }

  const handleReset = () => {
    if (!selectedUid) return
    if (!confirm(`${selectedUid} 계정을 초기화할까요? 이 작업은 되돌리기 어렵습니다.`)) return
    void runAction(async () => {
      await api.adminResetUser(selectedUid)
    })
  }

  const handlePatchAccount = () => {
    if (!selectedUid) return
    if (!confirm(`${selectedUid} 계정 정보를 수정할까요?`)) return
    void runAction(async () => {
      await api.adminPatchUserAccount(selectedUid, {
        nickname: accountPatch.nickname || null,
        hostName: accountPatch.hostName || null,
        sooksoName: accountPatch.sooksoName || null,
      })
    })
  }

  const handleGrantAdmin = () => {
    if (!selectedUid) return
    if (!confirm(`${selectedUid}에게 ${targetRole} 관리자 권한을 부여/수정할까요?`)) return
    void runAction(async () => {
      await api.adminUpsertAdminUser(selectedUid, {
        role: targetRole,
        enabled: targetEnabled,
      })
    })
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', px: 2.5, py: 3 }}>
      <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
        <ScreenHeader category="관리자" title="Admin Console" subtitle="운영 기능" showBack />

        {loading ? (
          <Paper sx={{ mt: 3, p: 4, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <CircularProgress size={22} />
              <Typography>관리자 권한을 확인하는 중입니다.</Typography>
            </Stack>
          </Paper>
        ) : !adminUser ? (
          <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
            <Stack spacing={2}>
              <Alert severity="error">관리자 권한이 없어 접근할 수 없습니다.</Alert>
              {error && <Typography variant="body2">{error}</Typography>}
              <Button variant="outlined" onClick={() => navigate('/island')}>
                마이섬으로 돌아가기
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Stack spacing={2.5} sx={{ mt: 3 }}>
            {error && <Alert severity="warning">{error}</Alert>}

            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Chip label={adminUser.role} color={canManageAdmins ? 'primary' : 'default'} sx={{ alignSelf: 'flex-start' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h1" sx={{ fontSize: 22 }}>
                    {adminUser.uid}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {permissionText}
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={() => void runAction(() => loadUsers())} disabled={busy}>
                  새로고침
                </Button>
              </Stack>
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' }, gap: 2.5 }}>
              <Paper sx={{ p: 2, borderRadius: 2, overflow: 'hidden' }}>
                <Typography variant="h2" sx={{ fontSize: 18, mb: 1.5 }}>
                  유저 검색
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="UID, 메일 주소, 닉네임, ID 검색"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void runAction(() => loadUsers(searchQuery))
                    }}
                  />
                  <Button variant="contained" onClick={() => void runAction(() => loadUsers(searchQuery))} disabled={busy}>
                    검색
                  </Button>
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>UID</TableCell>
                        <TableCell>닉네임</TableCell>
                        <TableCell>Provider</TableCell>
                        <TableCell>숙소청소</TableCell>
                        <TableCell>수정일</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow
                          key={user.uid}
                          hover
                          selected={selectedUid === user.uid}
                          onClick={() => setSelectedUid(user.uid)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.uid}
                          </TableCell>
                          <TableCell>{user.nickname ?? '-'}</TableCell>
                          <TableCell>{user.authProvider ?? '-'}</TableCell>
                          <TableCell>{boolText(user.sooksoClean)}</TableCell>
                          <TableCell>{formatDate(user.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
                {searchQuery.trim() && users.length === 0 && (
                  <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                    검색 결과가 없습니다.
                  </Typography>
                )}
                {!searchQuery.trim() && (
                  <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                    UID, 메일 주소, 닉네임, ID 중 하나를 입력해 검색하세요.
                  </Typography>
                )}
              </Paper>

              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h2" sx={{ fontSize: 18 }}>
                  유저 상세
                </Typography>
                {!detail ? (
                  <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                    유저를 선택하면 상세 정보가 표시됩니다.
                  </Typography>
                ) : (
                  <Stack spacing={1.25} sx={{ mt: 2 }}>
                    <Typography variant="body2">UID: {detail.user.uid}</Typography>
                    <Typography variant="body2">닉네임: {detail.user.nickname ?? '-'}</Typography>
                    <Typography variant="body2">이메일: {detail.user.email ?? '-'}</Typography>
                    <Typography variant="body2">숙소 이름: {detail.user.sooksoName ?? '-'}</Typography>
                    <Divider />
                    <Typography variant="body2">코인: {detail.host.coins}</Typography>
                    <Typography variant="body2">다이아: {detail.host.diamonds}</Typography>
                    <Typography variant="body2">주사위: {detail.host.diceCount}</Typography>
                    <Typography variant="body2">인벤토리 항목: {Object.keys(detail.host.inventory ?? {}).length}</Typography>
                  </Stack>
                )}
              </Paper>
            </Box>

            {detail && (
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="h2" sx={{ fontSize: 18, mb: 2 }}>
                  운영 액션
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">자원 지급/차감</Typography>
                    <TextField select size="small" label="자원" value={grantResource} onChange={(event) => setGrantResource(event.target.value as AdminHostResource)}>
                      {HOST_RESOURCES.map((resource) => (
                        <MenuItem key={resource} value={resource}>{resource}</MenuItem>
                      ))}
                    </TextField>
                    <TextField size="small" label="수량" value={grantDelta} onChange={(event) => setGrantDelta(event.target.value)} />
                    <Button variant="contained" onClick={handleGrantResource} disabled={busy}>
                      적용
                    </Button>
                  </Stack>

                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">Account 수정</Typography>
                    <TextField size="small" label="닉네임" value={accountPatch.nickname} onChange={(event) => setAccountPatch((prev) => ({ ...prev, nickname: event.target.value }))} />
                    <TextField size="small" label="섬 이름" value={accountPatch.hostName} onChange={(event) => setAccountPatch((prev) => ({ ...prev, hostName: event.target.value }))} />
                    <TextField size="small" label="숙소 이름" value={accountPatch.sooksoName} onChange={(event) => setAccountPatch((prev) => ({ ...prev, sooksoName: event.target.value }))} />
                    <Button variant="outlined" onClick={handlePatchAccount} disabled={busy}>
                      저장
                    </Button>
                  </Stack>

                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">계정 초기화</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                      테스트 계정의 진행 상태와 주요 모듈 상태를 기본값으로 되돌립니다.
                    </Typography>
                    <Button color="warning" variant="outlined" onClick={handleReset} disabled={busy}>
                      유저 리셋
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            )}

            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="h2" sx={{ fontSize: 18, mb: 1 }}>
                DB 관리
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                DB 관리 메뉴 자리입니다. 실제 조회/수정 기능은 별도 API 경계가 정해진 뒤 연결합니다.
              </Typography>
            </Paper>

            {detail && canManageAdmins && (
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="h2" sx={{ fontSize: 18, mb: 2 }}>
                  관리자 권한 부여
                </Typography>
                <Stack spacing={1.5}>
                  <TextField select size="small" label="Role" value={targetRole} onChange={(event) => setTargetRole(event.target.value as AdminRole)}>
                    {ADMIN_ROLES.map((role) => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </TextField>
                  <Alert severity="info">{ROLE_PERMISSION_DESCRIPTIONS[targetRole]}</Alert>
                  <TextField select size="small" label="Enabled" value={targetEnabled ? 'true' : 'false'} onChange={(event) => setTargetEnabled(event.target.value === 'true')}>
                    <MenuItem value="true">true</MenuItem>
                    <MenuItem value="false">false</MenuItem>
                  </TextField>
                  <Button variant="contained" onClick={handleGrantAdmin} disabled={busy}>
                    관리자 권한 저장
                  </Button>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  )
}
