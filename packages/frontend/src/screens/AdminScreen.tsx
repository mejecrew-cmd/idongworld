import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
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
  type AdminSplitSummary,
  type AdminStaticTableDefinition,
  type AdminStaticTableFileSummary,
  type AdminStaticTableImportBatch,
  type AdminStaticTableImportPreview,
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

function adminRoleText(role?: AdminRole, enabled?: boolean) {
  return enabled && role ? role : '유저'
}

function formatProviderAccounts(splitSummary?: AdminSplitSummary) {
  const accounts = splitSummary?.providerAccounts ?? []
  if (accounts.length === 0) return '-'
  return accounts
    .map((account) => `${account.providerCode}${account.status ? `(${account.status})` : ''}`)
    .join(', ')
}

function countValidationIssues(preview?: AdminStaticTableImportPreview | null) {
  const validation = preview?.validation
  if (!validation) return { errors: 0, warnings: 0 }
  const flatErrors = validation.errors?.length ?? 0
  const flatWarnings = validation.warnings?.length ?? 0
  const summaryErrors = validation.summaries?.reduce((sum, summary) => sum + (summary.errors?.length ?? 0), 0) ?? 0
  const summaryWarnings = validation.summaries?.reduce((sum, summary) => sum + (summary.warnings?.length ?? 0), 0) ?? 0
  const issueErrors = validation.issues?.filter((issue) => issue.level === 'error').length ?? 0
  const issueWarnings = validation.issues?.filter((issue) => issue.level === 'warning').length ?? 0
  return {
    errors: flatErrors + summaryErrors + issueErrors,
    warnings: flatWarnings + summaryWarnings + issueWarnings,
  }
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
  const [detail, setDetail] = useState<{ user: AdminUserDetail; host: AdminHostSummary; splitSummary?: AdminSplitSummary } | null>(null)
  const [grantResource, setGrantResource] = useState<AdminHostResource>('coins')
  const [grantDelta, setGrantDelta] = useState('100')
  const [accountPatch, setAccountPatch] = useState({
    nickname: '',
    hostName: '',
    sooksoName: '',
  })
  const [targetRole, setTargetRole] = useState<AdminRole | ''>('')
  const [staticDefinitions, setStaticDefinitions] = useState<AdminStaticTableDefinition[]>([])
  const [staticFiles, setStaticFiles] = useState<AdminStaticTableFileSummary[]>([])
  const [staticScanErrors, setStaticScanErrors] = useState<Array<{ fileName: string; code: string; message: string }>>([])
  const [staticImports, setStaticImports] = useState<AdminStaticTableImportBatch[]>([])
  const [staticPreview, setStaticPreview] = useState<AdminStaticTableImportPreview | null>(null)
  const [staticSelectedTableCodes, setStaticSelectedTableCodes] = useState<string[]>([])
  const [staticVersion, setStaticVersion] = useState('')
  const [staticImportBatchId, setStaticImportBatchId] = useState('')
  const [staticBusy, setStaticBusy] = useState(false)

  const canManageAdmins = adminUser?.role === 'owner' || adminUser?.permissions.includes('adminUsers.write')
  const canReadDb = Boolean(adminUser && (adminUser.role === 'owner' || adminUser.permissions.includes('db.read')))
  const canWriteDb = Boolean(adminUser && (adminUser.role === 'owner' || adminUser.permissions.includes('db.write')))
  const canActivateStaticImport = adminUser?.role === 'owner' || adminUser?.role === 'admin'
  const selectedStaticFileCount = staticFiles.filter((file) => staticSelectedTableCodes.includes(file.tableCode)).length
  const validationIssueCount = countValidationIssues(staticPreview)

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
    setTargetRole(response.user.adminEnabled ? response.user.adminRole ?? '' : '')
  }

  const loadStaticTables = async () => {
    const [registryResponse, filesResponse, importsResponse] = await Promise.all([
      api.adminStaticTableRegistry(),
      api.adminStaticTableFiles(),
      api.adminStaticTableImports(),
    ])
    setStaticDefinitions(registryResponse.definitions)
    setStaticFiles(filesResponse.files)
    setStaticScanErrors(filesResponse.errors)
    setStaticImports(importsResponse.imports)
    setStaticSelectedTableCodes((prev) => {
      const importableCodes = filesResponse.files
        .filter((file) => file.importable)
        .map((file) => file.tableCode)
      if (prev.length > 0) {
        const stillAvailable = prev.filter((tableCode) => importableCodes.includes(tableCode))
        if (stillAvailable.length > 0) return stillAvailable
      }
      return importableCodes
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
        if (response.adminUser.role === 'owner' || response.adminUser.permissions.includes('db.read')) {
          await loadStaticTables()
        }
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

  const runStaticAction = async (action: () => Promise<void>) => {
    setStaticBusy(true)
    setError(null)
    try {
      await action()
      await loadStaticTables()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setStaticBusy(false)
    }
  }

  const buildStaticRequest = () => ({
    ...(staticVersion.trim() ? { version: staticVersion.trim() } : {}),
    ...(staticImportBatchId.trim() ? { importBatchId: staticImportBatchId.trim() } : {}),
    ...(staticSelectedTableCodes.length ? { tableCodes: staticSelectedTableCodes } : {}),
  })

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
    const nextRole = targetRole || null
    const message = nextRole
      ? `${selectedUid}에게 ${nextRole} 관리자 권한을 부여/수정할까요?`
      : `${selectedUid}의 관리자 권한을 해제할까요?`
    if (!confirm(message)) return
    void runAction(async () => {
      await api.adminUpsertAdminUser(selectedUid, {
        role: nextRole,
      })
    })
  }

  const handleStaticTableSelect = (tableCode: string, checked: boolean) => {
    setStaticSelectedTableCodes((prev) => {
      if (checked) return [...new Set([...prev, tableCode])]
      return prev.filter((value) => value !== tableCode)
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
                    <Typography variant="body2">역할: {adminRoleText(detail.user.adminRole, detail.user.adminEnabled)}</Typography>
                    <Typography variant="body2">닉네임: {detail.user.nickname ?? '-'}</Typography>
                    <Typography variant="body2">이메일: {detail.user.email ?? '-'}</Typography>
                    <Typography variant="body2">숙소 이름: {detail.user.sooksoName ?? '-'}</Typography>
                    <Divider />
                    <Typography variant="body2">코인: {detail.host.coins}</Typography>
                    <Typography variant="body2">다이아: {detail.host.diamonds}</Typography>
                    <Typography variant="body2">주사위: {detail.host.diceCount}</Typography>
                    <Typography variant="body2">인벤토리 항목: {Object.keys(detail.host.inventory ?? {}).length}</Typography>
                    {detail.splitSummary && (
                      <>
                        <Divider />
                        <Typography variant="subtitle2">동적 스키마 요약</Typography>
                        <Typography variant="body2">연결 Provider: {formatProviderAccounts(detail.splitSummary)}</Typography>
                        <Typography variant="body2">
                          재화 문서: coin {detail.splitSummary.currencies.coin ?? 0} / diamond {detail.splitSummary.currencies.diamond ?? 0}
                        </Typography>
                        <Typography variant="body2">
                          주사위 문서: {detail.splitSummary.diceResource.diceQuantity} / {detail.splitSummary.diceResource.maxDiceQuantity}
                        </Typography>
                        <Typography variant="body2">
                          전역 인벤토리 row: {detail.splitSummary.inventory.count}개 · 총 {detail.splitSummary.inventory.totalQuantity}
                        </Typography>
                        <Typography variant="body2">
                          숙소: {boolText(detail.splitSummary.sookso.sooksoClean)} · 배정 {detail.splitSummary.sookso.assignedAidongCount} · 방 {detail.splitSummary.sookso.roomCount} · 가구 {detail.splitSummary.sookso.furniturePlacementCount}
                        </Typography>
                        <Typography variant="body2">
                          보유 Aidong: {detail.splitSummary.mydongs.count}개 · active {detail.splitSummary.mydongs.activeCount}개
                        </Typography>
                        <Typography variant="body2">
                          도감 row: {detail.splitSummary.pediaInventory.rowCount}개 · Aidong {detail.splitSummary.pediaInventory.aidongCount}명
                        </Typography>
                        <Typography variant="body2">
                          코스메틱: 보유 row {detail.splitSummary.cosmetics.inventoryRowCount} / 장착 {detail.splitSummary.cosmetics.loadoutCount} / 페르소나 {detail.splitSummary.cosmetics.personaPartStateCount}
                        </Typography>
                      </>
                    )}
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
              {!canReadDb ? (
                <Alert severity="warning">DB 관리 정보를 볼 권한이 없습니다.</Alert>
              ) : (
                <Stack spacing={2}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    정적 테이블 import/update 전용입니다. 유저 진행도처럼 계속 변하는 동적 데이터는 유저 상세와 전용 API에서만 확인/수정합니다.
                  </Typography>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Chip label={`registry ${staticDefinitions.length}`} size="small" />
                    <Chip label={`files ${staticFiles.length}`} size="small" />
                    <Chip label={`selected ${selectedStaticFileCount}`} size="small" color={selectedStaticFileCount > 0 ? 'primary' : 'default'} />
                    <Chip label={`history ${staticImports.length}`} size="small" />
                    <Box sx={{ flex: 1 }} />
                    <Button variant="outlined" onClick={() => void runStaticAction(loadStaticTables)} disabled={staticBusy}>
                      DB 관리 새로고침
                    </Button>
                  </Stack>

                  {staticScanErrors.length > 0 && (
                    <Alert severity="warning">
                      CSV scan 오류 {staticScanErrors.length}건: {staticScanErrors.slice(0, 3).map((item) => `${item.fileName}(${item.code})`).join(', ')}
                    </Alert>
                  )}

                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>선택</TableCell>
                          <TableCell>tableCode</TableCell>
                          <TableCell>파일명</TableCell>
                          <TableCell>row</TableCell>
                          <TableCell>kind</TableCell>
                          <TableCell>target</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {staticFiles.map((file) => (
                          <TableRow key={`${file.tableCode}:${file.fileName}`}>
                            <TableCell>
                              <Checkbox
                                size="small"
                                disabled={!file.importable || staticBusy}
                                checked={staticSelectedTableCodes.includes(file.tableCode)}
                                onChange={(event) => handleStaticTableSelect(file.tableCode, event.target.checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography variant="body2">{file.tableCode}</Typography>
                                {!file.importable && <Chip size="small" label="excluded" color="warning" />}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ minWidth: 220 }}>{file.fileName}</TableCell>
                            <TableCell>{file.rowCount}</TableCell>
                            <TableCell>{file.importKind ?? '-'}</TableCell>
                            <TableCell>{file.bundleCollection ?? file.targetCollection ?? '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                  {staticFiles.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      `resources/table`에서 읽힌 CSV 파일이 없습니다.
                    </Typography>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                    <TextField
                      size="small"
                      label="version 선택 입력"
                      value={staticVersion}
                      onChange={(event) => setStaticVersion(event.target.value)}
                      placeholder="비우면 서버가 자동 생성"
                    />
                    <TextField
                      size="small"
                      label="importBatchId 선택 입력"
                      value={staticImportBatchId}
                      onChange={(event) => setStaticImportBatchId(event.target.value)}
                      placeholder="비우면 서버가 자동 생성"
                    />
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      variant="outlined"
                      disabled={!canWriteDb || staticBusy || selectedStaticFileCount === 0}
                      onClick={() => void runStaticAction(async () => {
                        const response = await api.adminStaticTableValidate(buildStaticRequest())
                        setStaticPreview({
                          ok: response.ok,
                          version: response.version,
                          importBatchId: response.importBatchId,
                          sourceDir: response.sourceDir,
                          sourceFiles: response.files.map((file) => ({
                            fileName: file.fileName,
                            tableCode: file.tableCode,
                            sourceHash: file.sourceHash,
                            rowCount: file.rowCount,
                          })),
                          validation: response.validation,
                          tableRowCount: response.files.reduce((sum, file) => sum + file.rowCount, 0),
                          runtimeRowCounts: {},
                          bundleCounts: {},
                          scanErrors: response.scanErrors,
                        })
                      })}
                    >
                      validation 실행
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={!canWriteDb || staticBusy || selectedStaticFileCount === 0}
                      onClick={() => void runStaticAction(async () => {
                        const response = await api.adminStaticTableDryRun(buildStaticRequest())
                        setStaticPreview(response)
                      })}
                    >
                      dry-run 실행
                    </Button>
                    <Button
                      variant="contained"
                      disabled={!canWriteDb || staticBusy || selectedStaticFileCount === 0}
                      onClick={() => {
                        if (!confirm(`선택한 정적 테이블 ${selectedStaticFileCount}개를 commit할까요?`)) return
                        void runStaticAction(async () => {
                          const response = await api.adminStaticTableCommit(buildStaticRequest())
                          setStaticPreview(response)
                        })
                      }}
                    >
                      commit
                    </Button>
                  </Stack>
                  {!canWriteDb && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      viewer 권한은 조회만 가능합니다. validate/dry-run/commit은 operator 이상 권한이 필요합니다.
                    </Typography>
                  )}

                  {staticPreview && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                      <Stack spacing={1}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                          <Chip label={staticPreview.ok ? 'validation ok' : 'validation failed'} color={staticPreview.ok ? 'success' : 'error'} size="small" />
                          <Chip label={`version ${staticPreview.version}`} size="small" />
                          <Chip label={`batch ${staticPreview.importBatchId}`} size="small" />
                          <Chip label={`rows ${staticPreview.tableRowCount}`} size="small" />
                          <Chip label={`errors ${validationIssueCount.errors}`} size="small" color={validationIssueCount.errors > 0 ? 'error' : 'default'} />
                          <Chip label={`warnings ${validationIssueCount.warnings}`} size="small" color={validationIssueCount.warnings > 0 ? 'warning' : 'default'} />
                        </Stack>
                        <Typography variant="body2">
                          runtime rows: {Object.entries(staticPreview.runtimeRowCounts).map(([key, value]) => `${key} ${value}`).join(', ') || '-'}
                        </Typography>
                        <Typography variant="body2">
                          bundles: {Object.entries(staticPreview.bundleCounts).map(([key, value]) => `${key} ${value}`).join(', ') || '-'}
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            p: 1.5,
                            maxHeight: 260,
                            overflow: 'auto',
                            bgcolor: 'grey.100',
                            borderRadius: 1,
                            fontSize: 12,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {JSON.stringify({
                            sourceFiles: staticPreview.sourceFiles,
                            validation: staticPreview.validation,
                            bundles: staticPreview.bundles,
                          }, null, 2)}
                        </Box>
                      </Stack>
                    </Paper>
                  )}

                  <Divider />

                  <Typography variant="subtitle2">Import history</Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>batch</TableCell>
                          <TableCell>status</TableCell>
                          <TableCell>version</TableCell>
                          <TableCell>files</TableCell>
                          <TableCell>updated</TableCell>
                          <TableCell>activate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {staticImports.slice(0, 20).map((item) => (
                          <TableRow key={item.importBatchId}>
                            <TableCell sx={{ minWidth: 220 }}>{item.importBatchId}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={item.status}
                                color={item.status === 'activated' ? 'success' : item.status === 'failed' ? 'error' : 'default'}
                              />
                            </TableCell>
                            <TableCell>{item.version}</TableCell>
                            <TableCell>{item.sourceFiles.length}</TableCell>
                            <TableCell>{formatDate(item.updatedAt)}</TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!canActivateStaticImport || staticBusy || item.status === 'activated' || item.status === 'failed'}
                                onClick={() => {
                                  if (!confirm(`${item.importBatchId} import를 active 처리할까요?`)) return
                                  void runStaticAction(async () => {
                                    await api.adminStaticTableActivate(item.importBatchId)
                                  })
                                }}
                              >
                                activate
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                  {staticImports.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      import 이력이 없습니다.
                    </Typography>
                  )}
                </Stack>
              )}
            </Paper>

            {detail && canManageAdmins && (
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="h2" sx={{ fontSize: 18, mb: 2 }}>
                  관리자 권한 부여
                </Typography>
                <Stack spacing={1.5}>
                  <Box>
                    {ADMIN_ROLES.map((role) => (
                      <FormControlLabel
                        key={role}
                        control={
                          <Checkbox
                            checked={targetRole === role}
                            onChange={(event) => {
                              setTargetRole(event.target.checked ? role : '')
                            }}
                          />
                        }
                        label={role}
                      />
                    ))}
                  </Box>
                  <Alert severity="info">
                    {targetRole ? ROLE_PERMISSION_DESCRIPTIONS[targetRole] : '아무 역할도 선택하지 않으면 일반 유저로 저장됩니다.'}
                  </Alert>
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
