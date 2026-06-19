/**
 * packages/frontend/src/screens/HarborScene.tsx
 * ------------------------------------------------------------
 * 역할: 항구에서 현재 배 상태, 선실/갑판 아이동 배치, 배 인벤토리, 배 종류 변경, 출항 메뉴를 보여준다.
 * 연결: ship module action API와 탭/창별 voyage session store를 사용한다.
 * 주의: 2026-06-08 기획 변경 이후 세관 UI는 기본 core UX에서 노출하지 않는다.
 *       배 인벤토리 이동은 후속 입항/비우기 action으로 정리하고, customs backend는 기술 자산으로만 유지한다.
 *       항구는 DB의 출항/정박 상태를 보지 않고 항상 정박 화면으로 렌더링한다.
 */
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
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ROUTE_CATALOG } from '@/data/board'
import { PHASE_COLOR, PHASE_LABEL, getZoneById, getZoneKindLabel } from '@/data/zones'
import { BoardIcon } from '@/components/AidongSprite'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { CustomsTransferDialog } from '@/components/CustomsTransferDialog'
import { api, type DecorItemConfig, type ShipTypeConfig } from '@/lib/api'
import { MyIslandToggle } from '@/components/MyIslandToggle'
import type { AidongCharacterId } from '@/stores/userStore'
import { applyActionApiResponse } from '@/lib/actionApiSync'
import {
  accountStoreFacade,
  hostStoreFacade,
  myAidongStoreFacade,
  shipStoreFacade,
  voyageSessionFacade,
} from '@/lib/storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'
const CUSTOMS_UI_ENABLED = import.meta.env.VITE_CUSTOMS_UI_ENABLED === 'true'
const HARBOR_ZONE = getZoneById('harbor')
const FALLBACK_CABIN_FURNITURE: DecorItemConfig[] = [
  { itemId: 'hammock', label: '해먹', cost: 0, defaultOwned: 1 },
  { itemId: 'lamp', label: '선실등', cost: 0, defaultOwned: 1 },
  { itemId: 'window', label: '둥근 창', cost: 35, defaultOwned: 0 },
  { itemId: 'rug', label: '작은 러그', cost: 45, defaultOwned: 0 },
]

const CABIN_FURNITURE_MARKS: Record<string, string> = {
  hammock: '해',
  lamp: '등',
  window: '창',
  rug: '깔',
}

interface ShipStateView {
  shipTypeId?: string
  shipInventory: Record<string, number>
  cargo: Record<string, number>
  cabinAssignments: Record<string, string>
  deckAssignments: Record<string, string>
  cabins: Record<string, { furniture: string[] }>
  cabinFurnitureInventory: Record<string, number>
}


function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function toNumberRecord(value: unknown): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(asRecord(value))) {
    const amount = Number(raw)
    if (Number.isFinite(amount) && amount > 0) result[key] = amount
  }
  return result
}

function toStringRecord(value: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(asRecord(value))) {
    if (typeof raw === 'string' && raw) result[key] = raw
  }
  return result
}

function toCabinsView(value: unknown): Pick<ShipStateView, 'cabins' | 'cabinFurnitureInventory'> {
  const cabins = asRecord(value)
  const result: Record<string, { furniture: string[] }> = {}
  for (const [slotId, rawCabin] of Object.entries(cabins)) {
    if (slotId === '__furnitureInventory') continue
    const cabin = asRecord(rawCabin)
    result[slotId] = {
      furniture: Array.isArray(cabin.furniture)
        ? cabin.furniture.filter((itemId): itemId is string => typeof itemId === 'string')
        : [],
    }
  }
  return {
    cabins: result,
    cabinFurnitureInventory: toNumberRecord(cabins.__furnitureInventory),
  }
}

function countPlacedCabinFurniture(cabins: Record<string, { furniture: string[] }>, itemId: string, exceptSlotId?: string): number {
  return Object.entries(cabins).reduce((total, [slotId, cabin]) => (
    slotId === exceptSlotId ? total : total + cabin.furniture.filter((entry) => entry === itemId).length
  ), 0)
}

function cabinFurnitureLabel(items: DecorItemConfig[], itemId: string): string {
  return items.find((item) => item.itemId === itemId)?.label ?? itemId
}

function maxSlotIndex(assignments: Record<string, string>, prefix: 'cabin' | 'deck'): number {
  return Object.keys(assignments).reduce((max, slotId) => {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(slotId)
    if (!match) return max
    return Math.max(max, Number(match[1]))
  }, 0)
}

function toShipStateView(value: unknown): ShipStateView {
  const state = asRecord(value)
  const cabins = toCabinsView(state.cabins)
  return {
    shipTypeId: typeof state.shipTypeId === 'string' ? state.shipTypeId : undefined,
    shipInventory: toNumberRecord(state.shipInventory),
    cargo: toNumberRecord(state.cargo),
    cabinAssignments: toStringRecord(state.cabinAssignments),
    deckAssignments: toStringRecord(state.deckAssignments),
    ...cabins,
  }
}


function resourceLabel(resource: string): string {
  const labels: Record<string, string> = {
    acorn: '도토리',
    flower: '꽃',
    ore: '광석',
    sailcloth: '돛천',
    'deck-cargo': '갑판 화물',
    rest_token: '휴식권',
    memory_piece: '기억 조각',
  }
  return labels[resource] ?? resource
}

function renderInventoryList(items: Record<string, number>) {
  const entries = Object.entries(items).filter(([, amount]) => amount > 0)
  if (!entries.length) {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }}>비어 있음</Typography>
  }
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {entries.map(([itemId, amount]) => (
        <Chip key={itemId} label={`${resourceLabel(itemId)} ${amount}`} />
      ))}
    </Stack>
  )
}

export const HarborScene = () => {
  const navigate = useNavigate()
  const uid = accountStoreFacade.useFirebaseUid()
  const diceCount = hostStoreFacade.useDiceCount()
  const coins = hostStoreFacade.useCoins()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const harborAssignedChars = shipStoreFacade.useHarborAssignedChars()
  const [chargedToast, setChargedToast] = useState<number | null>(null)
  const [shipTypes, setShipTypes] = useState<ShipTypeConfig[]>([])
  const [cabinFurnitureItems, setCabinFurnitureItems] = useState<DecorItemConfig[]>(FALLBACK_CABIN_FURNITURE)
  const [shipState, setShipState] = useState<ShipStateView>({
    shipInventory: {},
    cargo: {},
    cabinAssignments: {},
    deckAssignments: {},
    cabins: {},
    cabinFurnitureInventory: {},
  })
  const [selectedAidong, setSelectedAidong] = useState<string | null>(null)
  const [shipLoading, setShipLoading] = useState(false)
  const [shipError, setShipError] = useState<string | null>(null)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [shipTypeOpen, setShipTypeOpen] = useState(false)
  const [shipCustomsOpen, setShipCustomsOpen] = useState(false)
  const [selectedCabinSlot, setSelectedCabinSlot] = useState<string | null>(null)

  const currentShipType = useMemo(
    () => shipTypes.find((shipType) => shipType.shipTypeId === shipState.shipTypeId)
      ?? shipTypes.find((shipType) => shipType.isDefault)
      ?? shipTypes[0],
    [shipState.shipTypeId, shipTypes],
  )

  const hasShipInventory = useMemo(
    () => Object.values(shipState.shipInventory).some((amount) => amount > 0),
    [shipState.shipInventory],
  )

  const shipAssignedAidongs = useMemo(
    () => new Set([
      ...Object.values(shipState.cabinAssignments),
      ...Object.values(shipState.deckAssignments),
    ]),
    [shipState.cabinAssignments, shipState.deckAssignments],
  )
  const canDepart = shipAssignedAidongs.size > 0
  const cabinSlotCount = Math.max(currentShipType?.cabinSlots ?? 0, maxSlotIndex(shipState.cabinAssignments, 'cabin'))
  const deckSlotCount = Math.max(currentShipType?.deckSlots ?? 0, maxSlotIndex(shipState.deckAssignments, 'deck'))
  const selectedCabinAidong = selectedCabinSlot ? shipState.cabinAssignments[selectedCabinSlot] : undefined
  const selectedCabinFurniture = selectedCabinSlot ? shipState.cabins[selectedCabinSlot]?.furniture ?? [] : []

  useEffect(() => {
    if (!selectedAidong) return
    if (harborAssignedChars.includes(selectedAidong as AidongCharacterId) || shipAssignedAidongs.has(selectedAidong)) {
      setSelectedAidong(null)
    }
  }, [harborAssignedChars, selectedAidong, shipAssignedAidongs])

  const loadShip = async () => {
    if (!uid) return
    setShipLoading(true)
    setShipError(null)
    try {
      const [configResponse, stateResponse] = await Promise.all([
        api.getShipConfig(),
        api.getModuleState(uid, 'ship'),
      ])
      setShipTypes(configResponse.shipTypes)
      if (Array.isArray(configResponse.cabinFurnitureItems) && configResponse.cabinFurnitureItems.length > 0) {
        setCabinFurnitureItems(configResponse.cabinFurnitureItems)
      }
      setShipState(toShipStateView(stateResponse.state))
    } catch (error) {
      console.warn('[ship] load failed', error)
      setShipError('배 정보를 불러오지 못했어요.')
    } finally {
      setShipLoading(false)
    }
  }

  useEffect(() => {
    const charge = shipStoreFacade.chargeDiceFromHarbor()
    if (MODULE_ACTION_API_SYNC) {
      const currentUid = accountStoreFacade.getFirebaseUid()
      if (currentUid) {
        void api.chargeHarborDice(currentUid)
          .then((response) => applyActionApiResponse(response))
          .catch((error) => console.warn('[ship] harbor charge action api failed', error))
      }
    }
    if (charge > 0) {
      setChargedToast(charge)
      setTimeout(() => setChargedToast(null), 3000)
    }
  }, [])

  useEffect(() => {
    void loadShip()
  }, [uid])

  const assignShipSlot = async (kind: 'cabin' | 'deck', slotId: string, current?: string) => {
    if (!uid || shipLoading) return
    const characterId = current ? undefined : selectedAidong ?? undefined
    if (!current && !characterId) return
    if (characterId && harborAssignedChars.includes(characterId as AidongCharacterId)) {
      setShipError('항구 지원 중인 아이동은 먼저 항구 지원 배치를 해제해 주세요.')
      setSelectedAidong(null)
      return
    }
    if (characterId && shipAssignedAidongs.has(characterId)) {
      setShipError('이미 배에 배치된 아이동입니다. 다른 슬롯으로 옮기려면 현재 슬롯을 먼저 비워 주세요.')
      setSelectedAidong(null)
      return
    }

    setShipLoading(true)
    setShipError(null)
    try {
      const response = kind === 'cabin'
        ? await api.assignShipCabin(uid, slotId, characterId)
        : await api.assignShipDeck(uid, slotId, characterId)
      setShipState(toShipStateView(response.state))
      applyActionApiResponse(response)
      if (characterId) setSelectedAidong(null)
    } catch (error) {
      console.warn('[ship] slot assign failed', error)
      setShipError('배치를 변경하지 못했어요.')
    } finally {
      setShipLoading(false)
    }
  }

  const changeShip = async (shipTypeId: string) => {
    if (!uid || shipLoading) return
    setShipLoading(true)
    setShipError(null)
    try {
      const response = await api.changeShipType(uid, shipTypeId)
      setShipState(toShipStateView(response.state))
      applyActionApiResponse(response)
      setShipTypeOpen(false)
    } catch (error) {
      console.warn('[ship] type change failed', error)
      setShipError('배를 변경하지 못했어요.')
    } finally {
      setShipLoading(false)
    }
  }

  const purchaseCabinFurniture = async (itemId: string) => {
    if (!uid || shipLoading) return
    setShipLoading(true)
    setShipError(null)
    try {
      const response = await api.purchaseCabinFurniture(uid, itemId)
      setShipState(toShipStateView(response.state))
      applyActionApiResponse(response)
    } catch (error) {
      console.warn('[ship] cabin furniture purchase failed', error)
      setShipError('선실 가구를 구매하지 못했어요.')
    } finally {
      setShipLoading(false)
    }
  }

  const toggleCabinFurniture = async (slotId: string, itemId: string) => {
    if (!uid || shipLoading) return
    setShipLoading(true)
    setShipError(null)
    try {
      const response = await api.toggleCabinFurniture(uid, slotId, itemId)
      setShipState(toShipStateView(response.state))
      applyActionApiResponse(response)
    } catch (error) {
      console.warn('[ship] cabin furniture toggle failed', error)
      setShipError('선실 가구를 배치하지 못했어요.')
    } finally {
      setShipLoading(false)
    }
  }

  const renderSlot = (kind: 'cabin' | 'deck', index: number, assigned?: string) => {
    const slotId = `${kind}${index}`
    return (
      <Box
        key={slotId}
        onClick={() => assignShipSlot(kind, slotId, assigned)}
        sx={{
          minHeight: 116,
          p: 1,
          border: '1px solid',
          borderColor: assigned ? 'primary.main' : 'divider',
          borderRadius: 1,
          bgcolor: assigned ? 'action.selected' : 'background.paper',
          cursor: assigned || selectedAidong ? 'pointer' : 'default',
          opacity: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5 }}>
          {kind === 'cabin' ? '선실' : '갑판'} {index}
        </Typography>
        {assigned ? (
          <>
            <BoardIcon character={assigned as AidongCharacterId} size={46} />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
              {assigned}
            </Typography>
            <Chip size="small" label="배치됨" sx={{ mt: 0.5, height: 18, fontSize: 10 }} />
          </>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            빈 슬롯
          </Typography>
        )}
        {kind === 'cabin' && (
          <Button
            size="small"
            variant="text"
            sx={{ mt: 0.75 }}
            onClick={(event) => {
              event.stopPropagation()
              setSelectedCabinSlot(slotId)
            }}
          >
            꾸미기
          </Button>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ p: 0 }}>
      <ScreenHeader
        category="마이섬"
        title="항구"
        subtitle={HARBOR_ZONE ? `${HARBOR_ZONE.areaNo} · ${getZoneKindLabel(HARBOR_ZONE)}` : '배 관리 · 아이동 배치 · 출항'}
      />
      <MyIslandToggle />

      <GameStage>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/7',
            backgroundImage: 'url(/assets/배경/myisland_harbor_evening.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              bgcolor: 'rgba(255,255,255,0.9)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {HARBOR_ZONE && (
              <Stack direction="row" spacing={0.5} sx={{ mb: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip label={HARBOR_ZONE.areaNo} size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
                <Chip label={getZoneKindLabel(HARBOR_ZONE)} size="small" color="warning" sx={{ height: 20, fontSize: 10 }} />
                <Chip label={PHASE_LABEL[HARBOR_ZONE.phase]} size="small" sx={{ height: 20, fontSize: 10, bgcolor: PHASE_COLOR[HARBOR_ZONE.phase] }} />
              </Stack>
            )}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              항구 · 출항 준비
            </Typography>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            <Typography variant="caption">주사위 보유 🎲 {diceCount}</Typography>
          </Box>
        </Box>
      </GameStage>

      <GameStage stageSx={{ px: 3, py: 3 }}>
        {chargedToast && (
          <Alert severity="success" sx={{ mb: 2 }}>
            🎲 +{chargedToast} 주사위 충전 (항구 친구 {harborAssignedChars.length}명)
          </Alert>
        )}
        {shipError && <Alert severity="warning" sx={{ mb: 2 }}>{shipError}</Alert>}

        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h2" sx={{ fontSize: 18, mb: 0.5 }}>
                    현재 배
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {currentShipType?.name ?? '기본 배'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    선실 {currentShipType?.cabinSlots ?? 0} · 갑판 {currentShipType?.deckSlots ?? 0} · 적재 {currentShipType?.cargoCapacity ?? 0}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => setInventoryOpen(true)}>
                    배 인벤토리
                  </Button>
                  <Button size="small" variant="contained" onClick={() => setShipTypeOpen(true)}>
                    배 변경
                  </Button>
                </Stack>
              </Stack>

              {shipLoading && <LinearProgress sx={{ mb: 2 }} />}

              <Typography variant="subtitle2" sx={{ mb: 1 }}>배치할 아이동</Typography>
              {recruitedAidongs.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  영입된 아이동이 없습니다.
                </Typography>
              ) : (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {recruitedAidongs.map((id) => {
                    const harborAssigned = harborAssignedChars.includes(id)
                    const shipAssigned = shipAssignedAidongs.has(id)
                    const unavailable = harborAssigned || shipAssigned
                    return (
                      <Button
                        key={id}
                        size="small"
                        variant={selectedAidong === id ? 'contained' : 'outlined'}
                        disabled={unavailable}
                        onClick={() => setSelectedAidong(selectedAidong === id ? null : id)}
                      >
                        {id}{harborAssigned ? ' · 항구 지원 중' : shipAssigned ? ' · 승선 중' : ''}
                      </Button>
                    )
                  })}
                </Stack>
              )}

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>선실</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))', gap: 1 }}>
                    {Array.from({ length: cabinSlotCount }, (_, index) =>
                      renderSlot('cabin', index + 1, shipState.cabinAssignments[`cabin${index + 1}`]),
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>갑판</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))', gap: 1 }}>
                    {Array.from({ length: deckSlotCount }, (_, index) =>
                      renderSlot('deck', index + 1, shipState.deckAssignments[`deck${index + 1}`]),
                    )}
                  </Box>
                </Box>
              </Stack>

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              항구 지원 배치
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              항구에 배치한 아이동은 시간 경과에 따라 주사위 충전에 기여합니다.
            </Typography>
            {recruitedAidongs.length === 0 ? (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                영입된 아이동이 없습니다.
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {recruitedAidongs.map((id) => {
                  const assigned = harborAssignedChars.includes(id)
                  const shipAssigned = shipAssignedAidongs.has(id)
                  return (
                    <Box
                      key={id}
                      onClick={() => {
                        if (!assigned && shipAssigned) {
                          setShipError('이미 배에 배치된 아이동은 항구 지원 배치에 동시에 넣을 수 없어요.')
                          return
                        }
                        shipStoreFacade.toggleHarborAssign(id)
                        if (!assigned && selectedAidong === id) setSelectedAidong(null)
                        if (MODULE_ACTION_API_SYNC) {
                          const currentUid = accountStoreFacade.getFirebaseUid()
                          if (currentUid) {
                            void api.toggleHarborAssign(currentUid, id)
                              .then((response) => applyActionApiResponse(response))
                              .catch((error) => console.warn('[ship] harbor assign action api failed', error))
                          }
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        p: 1,
                        border: '2px solid',
                        borderColor: assigned ? 'primary.main' : shipAssigned ? 'warning.main' : 'divider',
                        borderRadius: 1,
                        bgcolor: assigned ? 'action.selected' : shipAssigned ? 'action.hover' : 'background.paper',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        minWidth: 76,
                        opacity: !assigned && shipAssigned ? 0.55 : 1,
                      }}
                    >
                      <BoardIcon character={id} size={42} />
                      <Typography variant="caption" sx={{ display: 'block', fontSize: 11, fontWeight: assigned ? 600 : 400 }}>
                        {id}
                      </Typography>
                      <Chip
                        label={assigned ? '배치' : shipAssigned ? '승선 중' : '대기'}
                        size="small"
                        sx={{ fontSize: 10, height: 18 }}
                      />
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Box>
        </Box>

        <Typography variant="h2" sx={{ fontSize: 16, mb: 1 }}>출항 메뉴</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              항로를 선택해 항해 보드로 이동합니다.
            </Typography>
            {!canDepart && (
              <Alert severity="info" sx={{ mb: 2 }}>
                출항하려면 먼저 현재 배의 선실이나 갑판에 아이동을 1명 이상 배치해 주세요.
              </Alert>
            )}

            <Stack spacing={2}>
              {ROUTE_CATALOG.map((route) => (
                <Box
                  key={route.id}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: route.unlocked ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: route.unlocked ? 'background.paper' : 'action.hover',
                    opacity: route.unlocked ? 1 : 0.55,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ fontSize: 36 }}>{route.unlocked ? '🧭' : '🔒'}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700 }}>{route.name}</Typography>
                        {route.comingSoon && <Chip label="Coming Soon" size="small" />}
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {route.subtitle}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        {route.description}
                      </Typography>
                    </Box>
                    <Button
                      variant={route.unlocked ? 'contained' : 'outlined'}
                      disabled={!route.unlocked || !canDepart}
                      onClick={() => {
                        if (!canDepart) {
                          setShipError('출항하려면 먼저 선실이나 갑판에 아이동을 1명 이상 배치해야 해요.')
                          return
                        }
                        voyageSessionFacade.startSession(route.id)
                        navigate(`/voyage/board?route=${route.id}`)
                      }}
                    >
                      {route.unlocked ? '출항' : '잠김'}
                    </Button>
                  </Stack>
                </Box>
              ))}

              <Button variant="outlined" disabled sx={{ py: 2 }}>
                🎁 항로 구매하기 · Phase 2
              </Button>
            </Stack>
      </GameStage>

      <Dialog open={inventoryOpen} onClose={() => setInventoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>배 인벤토리</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>인벤토리</Typography>
          <Box sx={{ mb: 2 }}>{renderInventoryList(shipState.shipInventory)}</Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>항해 화물</Typography>
          {renderInventoryList(shipState.cargo)}
        </DialogContent>
        <DialogActions>
          {CUSTOMS_UI_ENABLED && hasShipInventory && (
            <Button
              variant="contained"
              onClick={() => {
                setInventoryOpen(false)
                setShipCustomsOpen(true)
              }}
            >
              세관
            </Button>
          )}
          <Button onClick={() => setInventoryOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {CUSTOMS_UI_ENABLED && (
        <CustomsTransferDialog
          open={shipCustomsOpen}
          sourceModule="ship"
          onClose={() => {
            setShipCustomsOpen(false)
            void loadShip()
          }}
        />
      )}

      <Dialog open={!!selectedCabinSlot} onClose={() => setSelectedCabinSlot(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedCabinSlot ? `선실 ${selectedCabinSlot.replace('cabin', '')}` : '선실'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {selectedCabinAidong ? (
              <Stack direction="row" spacing={2} alignItems="center">
                <BoardIcon character={selectedCabinAidong as AidongCharacterId} size={64} />
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{selectedCabinAidong}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    항구에서는 선실을 꾸밀 수 있지만 밥주기와 케어는 항해 중 선실 메뉴에서만 할 수 있어요.
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                빈 선실입니다. 아이동이 없어도 숙소 방처럼 선실을 꾸밀 수 있어요.
              </Typography>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>선실 꾸미기</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {selectedCabinFurniture.length > 0 ? selectedCabinFurniture.map((itemId) => (
                  <Chip key={itemId} label={cabinFurnitureLabel(cabinFurnitureItems, itemId)} size="small" />
                )) : (
                  <Chip label="아직 배치된 가구가 없어요" size="small" variant="outlined" />
                )}
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(94px, 1fr))', gap: 1 }}>
                {cabinFurnitureItems.map((item) => (
                  <Box key={item.itemId} sx={{ textAlign: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box
                      sx={{
                        mx: 'auto',
                        mb: 0.75,
                        width: 38,
                        height: 38,
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: 'rgba(218, 238, 255, 0.85)',
                        fontWeight: 800,
                      }}
                    >
                      {CABIN_FURNITURE_MARKS[item.itemId] ?? item.label.slice(0, 1)}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block' }}>{item.label}</Typography>
                    {(() => {
                      const slotId = selectedCabinSlot
                      const placed = selectedCabinFurniture.includes(item.itemId)
                      const owned = (shipState.cabinFurnitureInventory[item.itemId] ?? 0) + item.defaultOwned
                      const available = owned - countPlacedCabinFurniture(shipState.cabins, item.itemId, slotId ?? undefined)
                      if (placed && slotId) {
                        return (
                          <Button size="small" variant="contained" disabled={shipLoading} onClick={() => toggleCabinFurniture(slotId, item.itemId)}>
                            해제
                          </Button>
                        )
                      }
                      if (owned <= 0) {
                        return (
                          <Button size="small" disabled={shipLoading || coins < item.cost} onClick={() => purchaseCabinFurniture(item.itemId)}>
                            🪙{item.cost} 구매
                          </Button>
                        )
                      }
                      return (
                        <Button size="small" variant="outlined" disabled={!slotId || shipLoading || available <= 0} onClick={() => slotId && toggleCabinFurniture(slotId, item.itemId)}>
                          배치
                        </Button>
                      )
                    })()}
                  </Box>
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedCabinSlot(null)}>닫기</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={shipTypeOpen} onClose={() => setShipTypeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>배 변경</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {shipTypes.map((shipType) => {
              const selected = currentShipType?.shipTypeId === shipType.shipTypeId
              return (
                <Box
                  key={shipType.shipTypeId}
                  sx={{
                    border: '1px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{shipType.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        선실 {shipType.cabinSlots} · 갑판 {shipType.deckSlots} · 적재 {shipType.cargoCapacity} · 주사위 +{shipType.diceBonus}
                      </Typography>
                      {shipType.description && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                          {shipType.description}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant={selected ? 'outlined' : 'contained'}
                      disabled={selected || shipLoading}
                      onClick={() => changeShip(shipType.shipTypeId)}
                    >
                      {selected ? '사용 중' : '변경'}
                    </Button>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShipTypeOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
