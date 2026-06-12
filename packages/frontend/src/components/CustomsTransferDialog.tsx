import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { api, type CustomsRule } from '@/lib/api'
import { applyHostActionState } from '@/lib/actionApiSync'
import { accountStoreFacade } from '@/lib/storeFacades'

interface Props {
  open: boolean
  sourceModule: string
  onClose: () => void
  exitMode?: boolean
  destinationLabel?: string
  onLeave?: () => void
  allowDeckTransfer?: boolean
}

const INVENTORY_FIELD: Record<string, string> = {
  lodge: 'lodgeInventory',
  ship: 'shipInventory',
  'route-neighbor': 'localResources',
  'zone-garden': 'localResources',
  'zone-oasis': 'localResources',
  'zone-memory': 'localResources',
  'zone-mine': 'localResources',
  'destination-shell-island': 'localResources',
}

const MODULE_LABEL: Record<string, string> = {
  lodge: '숙소 인벤토리',
  ship: '배 인벤토리',
  'route-neighbor': '항해 보드 자원',
  'zone-garden': '정원 전용 자원',
  'zone-oasis': '오아시스 전용 자원',
  'zone-memory': '기억 구역 전용 자원',
  'zone-mine': '광산 전용 자원',
  'destination-shell-island': '조개빛 섬 전용 자원',
}

const RESOURCE_LABEL: Record<string, string> = {
  acorn: '도토리',
  flower: '꽃',
  'rest-token': '휴식권',
  rest_token: '휴식권',
  'memory-piece': '기억 조각',
  memory_piece: '기억 조각',
  ore: '광석',
  sailcloth: '돛천',
  'deck-cargo': '갑판 화물',
  'shell-fragment': '조개 조각',
  'pearl-dust': '진주 가루',
  'aidong-ribbon': '아이동 리본',
  coins: '코인',
  gems: '젬',
  diamonds: '다이아',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function toInventory(value: unknown): Record<string, number> {
  const record = asRecord(value)
  const inventory: Record<string, number> = {}
  for (const [key, qty] of Object.entries(record)) {
    const amount = Number(qty)
    if (Number.isFinite(amount) && amount > 0) inventory[key] = amount
  }
  return inventory
}

function resourceLabel(resource: string): string {
  return RESOURCE_LABEL[resource] ?? resource
}

function moduleLabel(moduleId?: string): string {
  if (!moduleId) return '모듈'
  return MODULE_LABEL[moduleId] ?? moduleId
}

function targetLabel(rule: CustomsRule): string {
  const scope = rule.to.scope === 'host' ? '전역 보관소' : moduleLabel(rule.to.moduleId)
  return `${scope} / ${resourceLabel(rule.to.resource)}`
}

function maxConvertibleMultiplier(rule: CustomsRule, owned: number): number {
  const byOwned = Math.floor(owned / rule.debitAmount)
  const max = rule.maxMultiplier ?? Number.MAX_SAFE_INTEGER
  return Math.max(0, Math.min(byOwned, max))
}

export const CustomsTransferDialog = ({
  open,
  sourceModule,
  onClose,
  exitMode = false,
  destinationLabel = '모듈 바깥',
  onLeave,
  allowDeckTransfer = false,
}: Props) => {
  const uid = accountStoreFacade.useFirebaseUid()
  const [rules, setRules] = useState<CustomsRule[]>([])
  const [inventory, setInventory] = useState<Record<string, number>>({})
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [applyingRuleId, setApplyingRuleId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sourceRules = useMemo(
    () => rules.filter((rule) => {
      if (rule.from.scope !== 'module' || rule.from.moduleId !== sourceModule) return false
      if (allowDeckTransfer) return true
      return !(rule.to.scope === 'module' && rule.to.resource === 'deck-cargo')
    }),
    [allowDeckTransfer, rules, sourceModule],
  )

  const inventoryItems = useMemo(
    () => Object.entries(inventory)
      .filter(([, qty]) => qty > 0)
      .sort(([a], [b]) => resourceLabel(a).localeCompare(resourceLabel(b), 'ko')),
    [inventory],
  )

  const selectedRules = useMemo(
    () => sourceRules.filter((rule) => rule.from.resource === selectedItem),
    [sourceRules, selectedItem],
  )

  const blockingItems = exitMode ? inventoryItems : []
  const hasUnconvertibleBlockingItem = blockingItems.some(
    ([itemId]) => !sourceRules.some((rule) => rule.from.resource === itemId),
  )
  const canLeave = !loading && !applyingRuleId && blockingItems.length === 0

  const load = async () => {
    if (!uid) return
    setLoading(true)
    setError(null)
    try {
      const [ruleResponse, moduleResponse] = await Promise.all([
        api.listCustomsRules(),
        api.getModuleState(uid, sourceModule),
      ])
      const state = asRecord(moduleResponse.state)
      const inventoryField = INVENTORY_FIELD[sourceModule] ?? 'resources'
      setRules(ruleResponse.rules)
      setInventory(toInventory(state[inventoryField]))
    } catch (loadError) {
      console.warn('[customs-ui] load failed', loadError)
      setError('세관 정보를 불러오지 못했어요.')
      setLoading(false)
      return
    }

    try {
      const hostResponse = await api.getHostState(uid)
      applyHostActionState(hostResponse.state)
    } catch (hostError) {
      console.warn('[customs-ui] host sync skipped', hostError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setSelectedItem(null)
    setMessage(null)
    setError(null)
    void load()
  }, [open, sourceModule, uid])

  useEffect(() => {
    if (selectedItem && inventory[selectedItem] > 0) return
    setSelectedItem(inventoryItems[0]?.[0] ?? null)
  }, [inventoryItems, selectedItem])

  const applyRule = async (
    rule: CustomsRule,
    multiplier: number,
    options: { reloadAfter?: boolean } = {},
  ): Promise<boolean> => {
    if (!uid || multiplier <= 0) return false
    const { reloadAfter = true } = options
    setApplyingRuleId(rule.ruleId)
    setMessage(null)
    setError(null)
    try {
      await api.applyCustoms(uid, {
        ruleId: rule.ruleId,
        multiplier,
        idempotencyKey: `${rule.ruleId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      })
      setMessage(`${resourceLabel(rule.from.resource)} ${rule.debitAmount * multiplier}개를 ${targetLabel(rule)}로 보냈어요.`)
      if (reloadAfter) await load()
      return true
    } catch (applyError) {
      console.warn('[customs-ui] apply failed', applyError)
      setError('변환하지 못했어요. 수량, 화물 적재 한도, 세관 rule을 확인해 주세요.')
      return false
    } finally {
      setApplyingRuleId(null)
    }
  }

  const applyAllForRule = async (rule: CustomsRule) => {
    const owned = inventory[rule.from.resource] ?? 0
    const multiplier = maxConvertibleMultiplier(rule, owned)
    if (multiplier <= 0) {
      setError('변환 가능한 수량이 없어요.')
      return
    }
    await applyRule(rule, multiplier)
  }

  const applyFirstAvailableSelected = async () => {
    for (const rule of selectedRules) {
      const multiplier = maxConvertibleMultiplier(rule, inventory[rule.from.resource] ?? 0)
      if (multiplier > 0) {
        await applyRule(rule, multiplier)
        return
      }
    }
    setError('선택한 아이템에 변환 가능한 수량이 없어요.')
  }

  const applyAllInventory = async () => {
    let appliedCount = 0
    for (const [itemId] of inventoryItems) {
      const rule = sourceRules.find((candidate) => candidate.from.resource === itemId)
      if (!rule) continue
      const multiplier = maxConvertibleMultiplier(rule, inventory[itemId] ?? 0)
      if (multiplier > 0) {
        const applied = await applyRule(rule, multiplier, { reloadAfter: false })
        if (applied) appliedCount += 1
      }
    }
    if (appliedCount > 0) {
      setMessage(`${appliedCount}종류의 전용 아이템을 변환했어요.`)
      await load()
      return
    }
    setError('현재 변환 가능한 아이템이 없어요.')
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid rgba(62,155,143,0.18)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {exitMode ? '떠나기 전 세관' : '세관 변환'}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {exitMode
            ? `${moduleLabel(sourceModule)}에 남은 전용 자원은 ${destinationLabel}에서 바로 쓸 수 없어요. 떠나기 전에 변환해 주세요.`
            : `위쪽에서 ${moduleLabel(sourceModule)}의 아이템을 고르면 아래쪽에 변환 가능한 목적지가 표시돼요.`}
        </Typography>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {exitMode && blockingItems.length > 0 && (
          <Alert severity={hasUnconvertibleBlockingItem ? 'error' : 'info'} sx={{ mb: 2 }}>
            {hasUnconvertibleBlockingItem
              ? '세관 rule이 없는 전용 자원이 남아 있어요. rule을 추가해야 모듈을 떠날 수 있습니다.'
              : '전용 자원이 남아 있어 아직 떠날 수 없어요.'}
          </Alert>
        )}

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            p: 1.5,
            mb: 2,
            bgcolor: 'rgba(255,255,255,0.56)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
            <Box>
              <Typography variant="subtitle2">{moduleLabel(sourceModule)}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                변환할 아이템을 선택하세요.
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={applyAllInventory}
              disabled={inventoryItems.length === 0 || Boolean(applyingRuleId)}
            >
              모두 변환
            </Button>
          </Stack>

          {inventoryItems.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              변환할 전용 아이템이 없어요.
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {inventoryItems.map(([itemId, qty]) => {
                const hasRule = sourceRules.some((rule) => rule.from.resource === itemId)
                return (
                  <Button
                    key={itemId}
                    variant={selectedItem === itemId ? 'contained' : 'outlined'}
                    onClick={() => setSelectedItem(itemId)}
                    disabled={!hasRule}
                    sx={{ minWidth: 120, justifyContent: 'space-between' }}
                  >
                    <span>{resourceLabel(itemId)}</span>
                    <Chip size="small" label={qty} sx={{ ml: 1, height: 20 }} />
                  </Button>
                )
              })}
            </Stack>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="subtitle2">변환 가능한 목적지</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              선택한 아이템을 어디로 보낼지 고르세요.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={applyFirstAvailableSelected}
            disabled={!selectedRules.length || Boolean(applyingRuleId)}
          >
            선택 아이템 모두 변환
          </Button>
        </Stack>

        {!selectedItem ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            먼저 아이템을 선택해 주세요.
          </Typography>
        ) : selectedRules.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {resourceLabel(selectedItem)}에 연결된 세관 rule이 없어요.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {selectedRules.map((rule) => {
              const owned = inventory[rule.from.resource] ?? 0
              const maxMultiplier = maxConvertibleMultiplier(rule, owned)
              const oneDisabled = maxMultiplier < (rule.minMultiplier ?? 1) || Boolean(applyingRuleId)
              const allDisabled = maxMultiplier <= 0 || Boolean(applyingRuleId)
              return (
                <Box
                  key={rule.ruleId}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    p: 1.5,
                    bgcolor: 'rgba(255,254,250,0.72)',
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>{rule.label ?? rule.ruleId}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {rule.debitAmount} {resourceLabel(rule.from.resource)} {'->'} {rule.creditAmount} {targetLabel(rule)}
                        </Typography>
                      </Box>
                      <Chip label={`최대 ${maxMultiplier}회`} size="small" />
                    </Stack>
                    {rule.description && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {rule.description}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={oneDisabled}
                        onClick={() => applyRule(rule, rule.minMultiplier ?? 1)}
                      >
                        1회 변환
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={allDisabled}
                        onClick={() => applyAllForRule(rule)}
                      >
                        모두 변환
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{exitMode ? '계속 머물기' : '닫기'}</Button>
        {exitMode && (
          <Button variant="contained" disabled={!canLeave} onClick={onLeave}>
            떠나기
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
