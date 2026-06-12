import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useNavigate } from 'react-router-dom'
import { DestinationIslandPixiScene } from './DestinationIslandPixiScene.tsx'
import {
  DestinationIslandRiveLayer,
  type DestinationIslandReaction,
} from './DestinationIslandRiveLayer.tsx'

const MODULE_ID = 'destination-shell-island'
const API_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:4000'
const RIVE_REACTION_SRC = (import.meta as { env?: { VITE_DESTINATION_ISLAND_RIVE_SRC?: string } })
  .env?.VITE_DESTINATION_ISLAND_RIVE_SRC
const DESTINATION_CUSTOMS_GATE_ENABLED =
  (import.meta as { env?: { VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED?: string } })
    .env?.VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED === 'true'

type Direction = 'north' | 'south' | 'west' | 'east'

interface DestinationNodeConfig {
  nodeId: string
  name: string
  exits: Partial<Record<Direction, string>>
}

interface DestinationReward {
  bucket: 'localResources' | 'localInventory'
  id: string
  amount: number
}

interface DestinationHotspotConfig {
  hotspotId: string
  nodeId: string
  kind: 'decorative' | 'collect' | 'mission'
  once: boolean
  missionId?: string
  rewards: DestinationReward[]
}

interface DestinationMissionConfig {
  missionId: string
  nodeId: string
  requiredResources: Record<string, number>
  rewards: DestinationReward[]
}

interface DestinationIslandConfig {
  moduleId: string
  initialNodeId: string
  nodes: DestinationNodeConfig[]
  hotspots: DestinationHotspotConfig[]
  missions: DestinationMissionConfig[]
}

interface DestinationIslandState {
  uid: string
  moduleId: string
  currentNodeId: string
  visitedNodeIds: string[]
  clearedMissionIds: string[]
  localResources: Record<string, number>
  localInventory: Record<string, number>
  hotspotStates: Record<string, { interacted: boolean; count?: number }>
}

interface ResourceRef {
  scope: 'host' | 'module'
  moduleId?: string
  resource: string
}

interface CustomsRule {
  ruleId: string
  from: ResourceRef
  to: ResourceRef
  debitAmount: number
  creditAmount: number
  minMultiplier?: number
  maxMultiplier?: number
  label?: string
  description?: string
}

const DIRECTION_LABELS: Record<Direction, string> = {
  north: '북쪽',
  south: '남쪽',
  west: '서쪽',
  east: '동쪽',
}

const HOTSPOT_LABELS: Record<string, string> = {
  'shell-rock': '조개 바위',
  'tide-pool': '조수 웅덩이',
  'old-shrine-door': '오래된 사당 문',
  'wind-shell': '바람 조개',
}

const RESOURCE_LABELS: Record<string, string> = {
  'shell-fragment': '조개 조각',
  'pearl-dust': '진주 가루',
  coins: '코인',
}

const HOTSPOT_POSITIONS: Record<string, { left: string; top: string }> = {
  'shell-rock': { left: '22%', top: '58%' },
  'tide-pool': { left: '68%', top: '66%' },
  'old-shrine-door': { left: '52%', top: '30%' },
  'wind-shell': { left: '46%', top: '45%' },
}

function readPersistedUid(): string | undefined {
  const raw = window.localStorage.getItem('idongworld-user')
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw) as { state?: { firebaseUid?: string } }
    return parsed.state?.firebaseUid
  } catch {
    return undefined
  }
}

async function islandFetch<T>(path: string, uid: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Uid': uid,
      ...init.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `API ${response.status}`)
  }
  return response.json()
}

function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource
}

function formatCountMap(values: Record<string, number>): string {
  const entries = Object.entries(values).filter(([, amount]) => amount > 0)
  if (entries.length === 0) return '비어 있음'
  return entries.map(([id, amount]) => `${resourceLabel(id)} ${amount}`).join(' · ')
}

function positiveEntries(values: Record<string, number>): Array<[string, number]> {
  return Object.entries(values).filter(([, amount]) => Number(amount) > 0)
}

function maxConvertibleMultiplier(rule: CustomsRule, owned: number): number {
  const byOwned = Math.floor(owned / rule.debitAmount)
  const max = rule.maxMultiplier ?? Number.MAX_SAFE_INTEGER
  return Math.max(0, Math.min(byOwned, max))
}

function targetLabel(rule: CustomsRule): string {
  if (rule.to.scope === 'host') return `전역 보관소 / ${resourceLabel(rule.to.resource)}`
  if (rule.to.moduleId === 'ship') return `배 인벤토리 / ${resourceLabel(rule.to.resource)}`
  return `${rule.to.moduleId ?? '모듈'} / ${resourceLabel(rule.to.resource)}`
}

export function DestinationIslandScreen() {
  const navigate = useNavigate()
  const [uid, setUid] = useState<string>()
  const [config, setConfig] = useState<DestinationIslandConfig>()
  const [state, setState] = useState<DestinationIslandState>()
  const [rules, setRules] = useState<CustomsRule[]>([])
  const [customsOpen, setCustomsOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [customsBusy, setCustomsBusy] = useState(false)
  const [message, setMessage] = useState('섬 정보를 불러오는 중입니다.')
  const [error, setError] = useState<string>()
  const [customsError, setCustomsError] = useState<string>()
  const [customsMessage, setCustomsMessage] = useState<string>()
  const [reaction, setReaction] = useState<DestinationIslandReaction>('idle')

  const currentNode = useMemo(
    () => config?.nodes.find((node) => node.nodeId === state?.currentNodeId),
    [config?.nodes, state?.currentNodeId],
  )

  const currentHotspots = useMemo(
    () => config?.hotspots.filter((hotspot) => hotspot.nodeId === currentNode?.nodeId) ?? [],
    [config?.hotspots, currentNode?.nodeId],
  )

  const currentMission = useMemo(
    () => config?.missions.find((mission) => mission.nodeId === currentNode?.nodeId),
    [config?.missions, currentNode?.nodeId],
  )

  const pixiHotspots = useMemo(
    () => currentHotspots.map((hotspot) => {
      const position = HOTSPOT_POSITIONS[hotspot.hotspotId] ?? { left: '50%', top: '50%' }
      return {
        hotspotId: hotspot.hotspotId,
        interacted: state?.hotspotStates?.[hotspot.hotspotId]?.interacted,
        ...position,
      }
    }),
    [currentHotspots, state?.hotspotStates],
  )

  const localResources = state?.localResources ?? {}
  const resourceItems = useMemo(() => positiveEntries(localResources), [localResources])
  const hasLocalResources = resourceItems.length > 0

  const sourceRules = useMemo(
    () => rules.filter((rule) => (
      rule.from.scope === 'module'
      && rule.from.moduleId === MODULE_ID
      && (rule.to.scope === 'host' || rule.to.moduleId === 'ship')
    )),
    [rules],
  )

  const selectedRules = useMemo(
    () => sourceRules.filter((rule) => rule.from.resource === selectedResource),
    [selectedResource, sourceRules],
  )

  const hasUnconvertibleResource = resourceItems.some(
    ([resource]) => !sourceRules.some((rule) => rule.from.resource === resource),
  )

  const refresh = useCallback(async (currentUid: string) => {
    setLoading(true)
    setError(undefined)
    try {
      const [configResponse, stateResponse, rulesResponse] = await Promise.all([
        islandFetch<{ config: DestinationIslandConfig }>(
          `/api/modules/${MODULE_ID}/config`,
          currentUid,
        ),
        islandFetch<{ state: DestinationIslandState }>(
          `/api/modules/${MODULE_ID}/state?uid=${encodeURIComponent(currentUid)}`,
          currentUid,
        ),
        DESTINATION_CUSTOMS_GATE_ENABLED
          ? islandFetch<{ rules: CustomsRule[] }>('/api/customs/rules', currentUid)
          : Promise.resolve({ rules: [] }),
      ])
      setConfig(configResponse.config)
      setState(stateResponse.state)
      setRules(rulesResponse.rules)
      setMessage('조개빛 섬에 도착했습니다.')
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '섬 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const nextUid = readPersistedUid()
    setUid(nextUid)
    if (!nextUid) {
      setLoading(false)
      setError('로그인 정보가 없어 섬 상태를 불러올 수 없습니다.')
      return
    }
    void refresh(nextUid)
  }, [refresh])

  useEffect(() => {
    if (!customsOpen) return
    if (selectedResource && localResources[selectedResource] > 0) return
    setSelectedResource(resourceItems[0]?.[0] ?? null)
  }, [customsOpen, localResources, resourceItems, selectedResource])

  async function runAction<T extends {
    state?: DestinationIslandState
    rewards?: DestinationReward[]
    replayed?: boolean
  }>(
    action: () => Promise<T>,
    successMessage: (result: T) => string,
  ) {
    if (!uid) return
    setBusy(true)
    setError(undefined)
    try {
      const result = await action()
      if (result.state) setState(result.state)
      setMessage(successMessage(result))
      if (result.rewards?.length) {
        setReaction('reward')
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '요청을 처리하지 못했습니다.')
      setReaction('error')
    } finally {
      setBusy(false)
    }
  }

  const move = (direction: Direction) => runAction(
    () => islandFetch<{ state: DestinationIslandState }>(`/api/modules/${MODULE_ID}/move`, uid!, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    }),
    () => `${DIRECTION_LABELS[direction]}으로 이동했습니다.`,
  )

  const interactHotspot = (hotspot: DestinationHotspotConfig) => runAction(
    () => islandFetch<{
      state: DestinationIslandState
      rewards: DestinationReward[]
      replayed?: boolean
    }>(`/api/modules/${MODULE_ID}/hotspots/interact`, uid!, {
      method: 'POST',
      body: JSON.stringify({ hotspotId: hotspot.hotspotId }),
    }),
    (result) => {
      if (!result.rewards?.length) setReaction('hotspot')
      if (result.replayed) return '이미 조사한 지점입니다.'
      if (result.rewards?.length) return '섬 전용 자원을 얻었습니다.'
      return '주변을 살펴봤습니다.'
    },
  )

  const clearMission = (missionId: string) => runAction(
    () => islandFetch<{
      state: DestinationIslandState
      rewards: DestinationReward[]
      replayed?: boolean
    }>(`/api/modules/${MODULE_ID}/missions/clear`, uid!, {
      method: 'POST',
      body: JSON.stringify({ missionId }),
    }),
    (result) => {
      if (!result.replayed) setReaction('mission')
      return result.replayed ? '이미 완료한 미션입니다.' : '미션을 완료했습니다.'
    },
  )

  const requestLeave = () => {
    if (DESTINATION_CUSTOMS_GATE_ENABLED && hasLocalResources) {
      setCustomsMessage(undefined)
      setCustomsError(undefined)
      setCustomsOpen(true)
      return
    }
    navigate('/voyage/board')
  }

  const applyRule = async (rule: CustomsRule, multiplier: number): Promise<boolean> => {
    if (!uid || multiplier <= 0) return false
    setCustomsBusy(true)
    setCustomsError(undefined)
    setCustomsMessage(undefined)
    try {
      await islandFetch('/api/customs/apply', uid, {
        method: 'POST',
        body: JSON.stringify({
          ruleId: rule.ruleId,
          multiplier,
          idempotencyKey: `${rule.ruleId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        }),
      })
      const stateResponse = await islandFetch<{ state: DestinationIslandState }>(
        `/api/modules/${MODULE_ID}/state?uid=${encodeURIComponent(uid)}`,
        uid,
      )
      setState(stateResponse.state)
      setCustomsMessage(`${resourceLabel(rule.from.resource)} ${rule.debitAmount * multiplier}개를 ${targetLabel(rule)}로 보냈습니다.`)
      return true
    } catch (applyError) {
      setCustomsError(applyError instanceof Error ? applyError.message : '세관 처리를 완료하지 못했습니다.')
      return false
    } finally {
      setCustomsBusy(false)
    }
  }

  const applyAllForResource = async (rule: CustomsRule) => {
    const owned = localResources[rule.from.resource] ?? 0
    const multiplier = maxConvertibleMultiplier(rule, owned)
    if (multiplier <= 0) {
      setCustomsError('변환 가능한 수량이 없습니다.')
      return
    }
    await applyRule(rule, multiplier)
  }

  const applyAllToShip = async () => {
    const shipRules = sourceRules.filter((rule) => rule.to.scope === 'module' && rule.to.moduleId === 'ship')
    let applied = 0
    for (const [resource, amount] of resourceItems) {
      const rule = shipRules.find((candidate) => candidate.from.resource === resource)
      if (!rule) continue
      const multiplier = maxConvertibleMultiplier(rule, amount)
      if (multiplier <= 0) continue
      const ok = await applyRule(rule, multiplier)
      if (ok) applied += 1
    }
    if (applied === 0) setCustomsError('배에 실을 수 있는 자원이 없습니다.')
  }

  const leaveDisabled = customsBusy || hasLocalResources || hasUnconvertibleResource

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#071923', color: '#f8fbff', p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" variant="outlined" color="inherit" onClick={requestLeave}>
            항해 보드
          </Button>
          <Typography variant="h1" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 800 }}>
            조개빛 섬
          </Typography>
        </Stack>
        <Chip label="destination-island" size="small" sx={{ bgcolor: '#d8f5ff', color: '#11333f' }} />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.5fr) 360px' },
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        <Box
          sx={{
            minHeight: { xs: 460, md: 620 },
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 2,
            background: '#071923',
            boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
          }}
        >
          <DestinationIslandPixiScene nodeId={currentNode?.nodeId} hotspots={pixiHotspots} />
          <DestinationIslandRiveLayer reaction={reaction} src={RIVE_REACTION_SRC} />
          <Stack spacing={1} sx={{ position: 'absolute', left: 20, top: 18, maxWidth: 360 }}>
            <Typography variant="h2" sx={{ fontSize: 24, fontWeight: 800 }}>
              {currentNode?.name ?? '이름 없는 지점'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)' }}>
              {loading ? '섬의 빛을 맞추는 중입니다.' : message}
            </Typography>
          </Stack>

          {currentHotspots.map((hotspot) => {
            const position = HOTSPOT_POSITIONS[hotspot.hotspotId] ?? { left: '50%', top: '50%' }
            const interacted = state?.hotspotStates?.[hotspot.hotspotId]?.interacted
            return (
              <Button
                key={hotspot.hotspotId}
                variant="contained"
                disabled={busy || loading}
                onClick={() => interactHotspot(hotspot)}
                sx={{
                  position: 'absolute',
                  left: position.left,
                  top: position.top,
                  transform: 'translate(-50%, -50%)',
                  minWidth: { xs: 94, sm: 116 },
                  px: { xs: 1, sm: 2 },
                  py: { xs: 0.65, sm: 0.8 },
                  bgcolor: interacted ? '#314f58' : '#fff8cf',
                  color: interacted ? '#dcecf0' : '#173642',
                  border: '1px solid',
                  borderColor: interacted ? 'rgba(216,245,255,0.28)' : 'rgba(255,255,255,0.72)',
                  boxShadow: interacted
                    ? '0 8px 24px rgba(0,0,0,0.22)'
                    : '0 12px 34px rgba(255,240,163,0.26), 0 10px 30px rgba(0,0,0,0.28)',
                  transition: 'transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
                  '&:hover': {
                    bgcolor: interacted ? '#40636d' : '#ffffff',
                    transform: 'translate(-50%, -54%) scale(1.04)',
                    boxShadow: interacted
                      ? '0 12px 28px rgba(0,0,0,0.28)'
                      : '0 18px 42px rgba(255,240,163,0.34), 0 12px 34px rgba(0,0,0,0.3)',
                  },
                  '&:active': {
                    transform: 'translate(-50%, -50%) scale(0.98)',
                  },
                }}
              >
                {HOTSPOT_LABELS[hotspot.hotspotId] ?? hotspot.hotspotId}
              </Button>
            )
          })}

          <Box sx={{ position: 'absolute', insetInline: 0, bottom: 18, display: 'flex', justifyContent: 'center' }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
              {(['west', 'north', 'south', 'east'] as Direction[]).map((direction) => (
                <Button
                  key={direction}
                  variant="outlined"
                  color="inherit"
                  disabled={busy || loading || !currentNode?.exits[direction]}
                  onClick={() => move(direction)}
                  sx={{ bgcolor: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(8px)' }}
                >
                  {DIRECTION_LABELS[direction]}
                </Button>
              ))}
            </Stack>
          </Box>
        </Box>

        <Stack
          spacing={2}
          sx={{
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 2,
            p: 2,
            bgcolor: 'rgba(6,18,26,0.88)',
          }}
        >
          <Box>
            <Typography variant="h2" sx={{ fontSize: 17, fontWeight: 800, mb: 1 }}>
              탐험 상태
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.78)' }}>
              현재 위치: {currentNode?.name ?? '-'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.78)' }}>
              방문 지점: {state?.visitedNodeIds?.length ?? 0}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

          <Box>
            <Typography variant="h2" sx={{ fontSize: 17, fontWeight: 800, mb: 1 }}>
              섬 전용 자원
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.78)' }}>
              {formatCountMap(state?.localResources ?? {})}
            </Typography>
          </Box>

          <Box>
            <Typography variant="h2" sx={{ fontSize: 17, fontWeight: 800, mb: 1 }}>
              섬 전용 아이템
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.78)' }}>
              {formatCountMap(state?.localInventory ?? {})}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

          <Box>
            <Typography variant="h2" sx={{ fontSize: 17, fontWeight: 800, mb: 1 }}>
              현재 미션
            </Typography>
            {currentMission ? (
              <Stack spacing={1}>
                <Typography sx={{ color: 'rgba(255,255,255,0.78)' }}>
                  {currentMission.missionId}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.66)', fontSize: 13 }}>
                  필요: {formatCountMap(currentMission.requiredResources)}
                </Typography>
                <Button
                  variant="contained"
                  disabled={busy || state?.clearedMissionIds?.includes(currentMission.missionId)}
                  onClick={() => clearMission(currentMission.missionId)}
                >
                  미션 완료
                </Button>
              </Stack>
            ) : (
              <Typography sx={{ color: 'rgba(255,255,255,0.66)' }}>
                이 지점에는 진행 가능한 미션이 없습니다.
              </Typography>
            )}
          </Box>

          {error && (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(255,90,90,0.16)', color: '#ffdada' }}>
              {error}
            </Box>
          )}

          <Button variant="outlined" color="inherit" onClick={requestLeave}>
            섬 떠나기
          </Button>
        </Stack>
      </Box>

      {DESTINATION_CUSTOMS_GATE_ENABLED && (
      <Dialog open={customsOpen} onClose={() => setCustomsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>섬을 떠나기 전 세관</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            조개빛 섬의 전용 자원은 섬 밖에서 바로 쓸 수 없습니다. 항해를 계속하려면 배 인벤토리로 싣거나 전역 보관소 자원으로 정산해 주세요.
          </Typography>
          {customsBusy && <LinearProgress sx={{ mb: 2 }} />}
          {customsError && <Alert severity="warning" sx={{ mb: 2 }}>{customsError}</Alert>}
          {customsMessage && <Alert severity="success" sx={{ mb: 2 }}>{customsMessage}</Alert>}
          {hasUnconvertibleResource && (
            <Alert severity="error" sx={{ mb: 2 }}>
              세관 rule이 없는 전용 자원이 남아 있습니다. rule을 추가해야 섬을 떠날 수 있습니다.
            </Alert>
          )}

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">섬 전용 자원</Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={!resourceItems.length || customsBusy}
                onClick={applyAllToShip}
              >
                모두 배에 싣기
              </Button>
            </Stack>
            {resourceItems.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                남은 전용 자원이 없습니다.
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {resourceItems.map(([resource, amount]) => (
                  <Button
                    key={resource}
                    variant={selectedResource === resource ? 'contained' : 'outlined'}
                    onClick={() => setSelectedResource(resource)}
                    disabled={!sourceRules.some((rule) => rule.from.resource === resource)}
                    sx={{ minWidth: 124, justifyContent: 'space-between' }}
                  >
                    <span>{resourceLabel(resource)}</span>
                    <Chip size="small" label={amount} sx={{ ml: 1, height: 18 }} />
                  </Button>
                ))}
              </Stack>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>변환 가능한 목적지</Typography>
          {!selectedResource ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              먼저 전용 자원을 선택해 주세요.
            </Typography>
          ) : selectedRules.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {resourceLabel(selectedResource)}에 연결된 세관 rule이 없습니다.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {selectedRules.map((rule) => {
                const owned = localResources[rule.from.resource] ?? 0
                const maxMultiplier = maxConvertibleMultiplier(rule, owned)
                return (
                  <Box
                    key={rule.ruleId}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Box>
                          <Typography sx={{ fontWeight: 800 }}>{rule.label ?? rule.ruleId}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {rule.debitAmount} {resourceLabel(rule.from.resource)} {'->'} {rule.creditAmount} {targetLabel(rule)}
                          </Typography>
                        </Box>
                        <Chip size="small" label={`최대 ${maxMultiplier}회`} />
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
                          disabled={customsBusy || maxMultiplier <= 0}
                          onClick={() => applyRule(rule, rule.minMultiplier ?? 1)}
                        >
                          1회 변환
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={customsBusy || maxMultiplier <= 0}
                          onClick={() => applyAllForResource(rule)}
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
        <DialogActions>
          <Button onClick={() => setCustomsOpen(false)}>계속 머물기</Button>
          <Button variant="contained" disabled={leaveDisabled} onClick={() => navigate('/voyage/board')}>
            항해 보드로 나가기
          </Button>
        </DialogActions>
      </Dialog>
      )}
    </Box>
  )
}
