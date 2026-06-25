/**
 * 📁 screens/NavigationBoardScene.tsx — 09 부루마블 보드 (항해 핵심)
 * ───────────────────────────────────────────────
 * 📌 역할: 30칸 보드 (6×5 그리드) + 1d6 주사위 + 한 칸씩 이동 + 칸 도착 모달.
 *           이웃섬 항로의 캐릭터 칸 4곳에 영입 안 된 4명 동적 매핑.
 *
 * 🔗 연결:
 *   - 기획 SoT: 모듈/부루마블보드.md v0.2 + 섬슬롯.md
 *   - data/board.ts → buildNeighborRoute (런타임 캐릭터 매핑)
 *   - screens/IslandLandingScene.tsx → 캐릭터 칸 도착 시 영입
 *
 * 💡 초보자 안내:
 *   - phase 4단계: idle (대기) → rolling (주사위) → moving (이동) → arrived (도착)
 *   - 주사위 굴리기: 8회 깜빡 → 결정 → 한 칸씩 300ms 간격 이동
 *   - 칸별 보상:
 *     · 보물 +30~60 코인 / 자원섬 음식+1 기억조각+1
 *     · 폭풍 -10 코인 / 빈 바다 +2 코인
 *     · 캐릭터 → 영입 시나리오 / 마이섬 → 한 바퀴 복귀
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Typography,
  Button,
  Stack,
  Modal,
  Chip,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { buildNeighborRoute, SLOT_TYPE_COLOR, type BoardSlot } from '@/data/board'
import { PHASE_LABEL, getZoneById, getZoneKindLabel } from '@/data/zones'
import { BoardIcon } from '@/components/AidongSprite'
import { CareModal } from '@/components/CareModal'
import { CustomsTransferDialog } from '@/components/CustomsTransferDialog'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { VOYAGE_BOARD_STAGE_WIDTH } from '@/theme/gameStage'
import * as host from '@idongworld/host'
import { api, type DecorItemConfig, type ShipTypeConfig } from '@/lib/api'
import type { AidongCharacterId } from '@/stores/userStore'
import { applyActionApiResponse } from '@/lib/actionApiSync'
import {
  accountStoreFacade,
  hostStoreFacade,
  myAidongStoreFacade,
  voyageSessionFacade,
} from '@/lib/storeFacades'

type Phase = 'idle' | 'rolling' | 'moving' | 'arrived'
interface RouteLandingCandidate {
  landingId: string
  routeId?: string
  boardPosition?: number
  action: string
  slotType: string
  label?: string
  targetWorldScope?: string
  landingModuleId?: string
  screenPath?: string
  status?: string
  mission?: {
    missionId: string
    rewards?: Array<Record<string, unknown>>
  }
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
const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'
const CUSTOMS_UI_ENABLED = import.meta.env.VITE_CUSTOMS_UI_ENABLED === 'true'
const ROUTE_ALIASES: Record<string, 'neighbor'> = {
  neighbor: 'neighbor',
  'route-neighbor': 'neighbor',
}
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

const SHIP_FOODS = [
  { id: 'bread', emoji: '🥐', label: '빵', cost: 10, actionId: 'snack' },
  { id: 'fruit', emoji: '🍎', label: '과일', cost: 8, actionId: 'snack' },
  { id: 'rice', emoji: '🍚', label: '밥', cost: 15, actionId: 'lunch' },
]

const RESOURCE_LABELS: Record<string, string> = {
  acorn: '도토리',
  flower: '꽃',
  ore: '광석',
  sailcloth: '돛천',
  'deck-cargo': '갑판 화물',
  rest_token: '휴식권',
  memory_piece: '기억 조각',
  'shell-fragment': '조개 조각',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function toStringRecord(value: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, raw] of Object.entries(asRecord(value))) {
    if (typeof raw === 'string' && raw) result[key] = raw
  }
  return result
}

function toNumberRecord(value: unknown): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(asRecord(value))) {
    const amount = Number(raw)
    if (Number.isFinite(amount) && amount > 0) result[key] = amount
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

function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource
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

function normalizeRouteId(routeId: string | undefined): 'neighbor' | undefined {
  return routeId ? ROUTE_ALIASES[routeId] : undefined
}

function getSlotByLanding(route: ReturnType<typeof buildNeighborRoute>, landing: RouteLandingCandidate): BoardSlot | null {
  if (typeof landing.boardPosition === 'number') {
    return route.slots[landing.boardPosition] ?? null
  }
  const [, rawPosition] = landing.landingId.split(':')
  const position = Number(rawPosition)
  return Number.isInteger(position) ? route.slots[position] ?? null : null
}

function landingMatchesSlot(route: ReturnType<typeof buildNeighborRoute>, landing: RouteLandingCandidate, slot: BoardSlot): boolean {
  const landingSlot = getSlotByLanding(route, landing)
  return !!landingSlot && landingSlot.index === slot.index && landing.slotType === slot.type
}

function InfoChip({
  label,
  color,
}: {
  label: string
  title?: string
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
}) {
  return <Chip label={label} size="small" color={color} />
}

const BOARD_COLUMNS = 9
const BOARD_ROWS = 8

function getPerimeterCell(index: number): { gridColumn: number; gridRow: number } {
  if (index < BOARD_COLUMNS) return { gridColumn: index + 1, gridRow: 1 }
  if (index < BOARD_COLUMNS + BOARD_ROWS - 2) return { gridColumn: BOARD_COLUMNS, gridRow: index - BOARD_COLUMNS + 2 }
  if (index < BOARD_COLUMNS * 2 + BOARD_ROWS - 2) {
    return {
      gridColumn: BOARD_COLUMNS - (index - (BOARD_COLUMNS + BOARD_ROWS - 2)),
      gridRow: BOARD_ROWS,
    }
  }
  return {
    gridColumn: 1,
    gridRow: BOARD_ROWS - 1 - (index - (BOARD_COLUMNS * 2 + BOARD_ROWS - 2)),
  }
}

function getSlotCaption(slot: BoardSlot): string {
  if (slot.index === 0) return '항구'
  if (slot.type === 'character') return slot.characterId ?? '친구섬'
  return slot.label
}

function getPhaseLabel(phase: Phase): string {
  if (phase === 'rolling') return '굴리는 중'
  if (phase === 'moving') return '이동 중'
  if (phase === 'arrived') return '도착'
  return '대기'
}

function getSlotTypeLabel(slot: BoardSlot): string {
  if (slot.index === 0 || slot.type === 'home') return '항구'
  if (slot.type === 'character') return '이웃 아이동'
  if (slot.type === 'treasure') return '보물'
  if (slot.type === 'storm') return '폭풍'
  if (slot.type === 'resource') return '자원'
  return '빈 바다'
}

function getSlotEffect(slot: BoardSlot): string {
  if (slot.index === 0 || slot.type === 'home') return '도착하면 항구로 복귀합니다.'
  if (slot.type === 'character') {
    return slot.characterId
      ? `${slot.characterId}을 만날 수 있는 섬으로 이동합니다.`
      : '만날 아이동이 없으면 빈 바다처럼 지나갑니다.'
  }
  if (slot.type === 'treasure') return '도착하면 코인 보상을 받을 수 있습니다.'
  if (slot.type === 'storm') return '도착하면 항해 페널티가 발생할 수 있습니다.'
  if (slot.type === 'resource') return '도착하면 항해 중 발견한 자원을 얻을 수 있습니다.'
  return '도착하면 소량의 안전 보상을 받을 수 있습니다.'
}

function getSlotTooltip(slot: BoardSlot): string {
  return `${slot.index}번 칸 · ${getSlotTypeLabel(slot)}: ${getSlotEffect(slot)}`
}

export const NavigationBoardScene = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const rawRouteId = params.get('route') ?? 'neighbor'
  const routeId = normalizeRouteId(rawRouteId)
  const uid = accountStoreFacade.useFirebaseUid()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const activeSession = voyageSessionFacade.useSession()
  const boardPosition = activeSession?.boardPosition ?? 0
  const diceCount = hostStoreFacade.useDiceCount()
  const coins = hostStoreFacade.useCoins()
  const currentRoute = normalizeRouteId(activeSession?.routeId)

  const route = useMemo(() => buildNeighborRoute(recruitedAidongs), [recruitedAidongs])
  const [phase, setPhase] = useState<Phase>('idle')
  const [lastRoll, setLastRoll] = useState<number | null>(null)
  const [arrivedSlot, setArrivedSlot] = useState<BoardSlot | null>(null)
  const [arrivedLanding, setArrivedLanding] = useState<RouteLandingCandidate | null>(null)
  const [returningToHarbor, setReturningToHarbor] = useState(false)
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
  const [shipLoading, setShipLoading] = useState(false)
  const [shipError, setShipError] = useState<string | null>(null)
  const [selectedAidong, setSelectedAidong] = useState<string | null>(null)
  const [selectedCabinSlot, setSelectedCabinSlot] = useState<string | null>(null)
  const [shipInventoryOpen, setShipInventoryOpen] = useState(false)
  const [shipCustomsOpen, setShipCustomsOpen] = useState(false)
  const [careTarget, setCareTarget] = useState<AidongCharacterId | null>(null)
  const [inspectedSlot, setInspectedSlot] = useState<BoardSlot | null>(null)

  const currentShipType = useMemo(
    () => shipTypes.find((shipType) => shipType.shipTypeId === shipState.shipTypeId)
      ?? shipTypes.find((shipType) => shipType.isDefault)
      ?? shipTypes[0],
    [shipState.shipTypeId, shipTypes],
  )
  const sailingAidongs = useMemo(
    () => Array.from(new Set([
      ...Object.values(shipState.cabinAssignments),
      ...Object.values(shipState.deckAssignments),
    ])),
    [shipState.cabinAssignments, shipState.deckAssignments],
  )
  const cabinAidongs = useMemo(
    () => new Set(Object.values(shipState.cabinAssignments)),
    [shipState.cabinAssignments],
  )
  const cabinSlotCount = Math.max(currentShipType?.cabinSlots ?? 0, maxSlotIndex(shipState.cabinAssignments, 'cabin'))
  const deckSlotCount = Math.max(currentShipType?.deckSlots ?? 0, maxSlotIndex(shipState.deckAssignments, 'deck'))
  const hasShipInventory = Object.values(shipState.shipInventory).some((amount) => amount > 0)
  const selectedCabinAidong = selectedCabinSlot ? shipState.cabinAssignments[selectedCabinSlot] : undefined
  const selectedCabinFurniture = selectedCabinSlot ? shipState.cabins[selectedCabinSlot]?.furniture ?? [] : []
  const currentBoardSlot = route.slots[boardPosition] ?? route.slots[0]

  useEffect(() => {
    if (routeId !== 'neighbor') return
    if (!activeSession) {
      navigate('/island/harbor', { replace: true })
      return
    }
    if (currentRoute && currentRoute !== routeId) {
      navigate(`/voyage/board?route=${encodeURIComponent(currentRoute)}`, { replace: true })
    }
  }, [activeSession, currentRoute, navigate, routeId])

  useEffect(() => {
    const landing = activeSession?.landing as RouteLandingCandidate | undefined
    if (!currentRoute || !landing || landing.status === 'cleared') return
    const slot = getSlotByLanding(route, landing)
    if (!slot || slot.index !== boardPosition || landing.slotType !== slot.type) {
      setArrivedLanding(null)
      voyageSessionFacade.clearLanding()
      return
    }
    setArrivedLanding(landing)
    setArrivedSlot(slot)
    setPhase('arrived')
  }, [activeSession?.landing, boardPosition, currentRoute, route])

  const loadShipMenu = async () => {
    if (!uid || !currentRoute) return
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
      console.warn('[ship] voyage ship menu load failed', error)
      setShipError('배 정보를 불러오지 못했어요.')
    } finally {
      setShipLoading(false)
    }
  }

  useEffect(() => {
    void loadShipMenu()
  }, [currentRoute, uid])

  if (routeId !== 'neighbor') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>지원되지 않는 항로</Typography>
        <Button onClick={() => navigate('/island/harbor')}>항구로</Button>
      </Box>
    )
  }


  if (!currentRoute) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>현재 진행 중인 항해가 없습니다.</Typography>
        <Button onClick={() => navigate('/island/harbor')} sx={{ mt: 2 }}>항구로</Button>
      </Box>
    )
  }

  const returnToHarbor = async () => {
    if (returningToHarbor) return
    setReturningToHarbor(true)
    setArrivedLanding(null)
    setArrivedSlot(null)
    setPhase('idle')
    voyageSessionFacade.endSession()
    navigate('/island/harbor', { replace: true })
    setReturningToHarbor(false)
  }

  const handleRoll = () => {
    if (diceCount <= 0) {
      alert('주사위가 부족해요. 친구를 항구에 배치하면 시간당 1d6 충전 (후속).')
      return
    }
    setPhase('rolling')
    setArrivedLanding(null)
    voyageSessionFacade.clearLanding()
    let count = 0
    const tick = setInterval(() => {
      setLastRoll(Math.floor(Math.random() * 6) + 1)
      count++
      if (count > 8) {
        clearInterval(tick)
        const finalRoll = Math.floor(Math.random() * 6) + 1
        hostStoreFacade.mutateDiceCount(-1)

        setLastRoll(finalRoll)
        setPhase('moving')
        // 칸 이동 애니메이션 (한 칸씩). 현재 위치는 탭/창별 voyage session에만 저장한다.
        let step = 0
        const moveTick = setInterval(() => {
          step++
          const movedSession = voyageSessionFacade.movePosition(1, route.slotsCount)
          if (step >= finalRoll) {
            clearInterval(moveTick)
            // 도착 처리
            setTimeout(() => {
              const newPos = movedSession?.boardPosition ?? voyageSessionFacade.getBoardPosition()
              const slot = route.slots[newPos]!
              setArrivedSlot(slot)
              setPhase('arrived')
              if (MODULE_ACTION_API_SYNC) {
                const uid = accountStoreFacade.getFirebaseUid()
                if (uid) {
                  void api.rollRouteNeighbor(uid, finalRoll, { routeId: currentRoute, boardPosition: newPos })
                    .then((response) => {
                      applyActionApiResponse(response)
                      const landing = (response as { landing?: RouteLandingCandidate }).landing
                      setArrivedLanding(landing ?? null)
                      voyageSessionFacade.setLanding(landing)
                    })
                    .catch((error) => console.warn('[route-neighbor] roll action api failed', error))
                }
              }
            }, 200)
          }
        }, 300)
      }
    }, 80)
  }

  const handleSlotAction = async () => {
    if (!arrivedSlot) return

    const landingForSlot = arrivedLanding && landingMatchesSlot(route, arrivedLanding, arrivedSlot) ? arrivedLanding : null

    // 캐릭터·home 분기 (라우터 navigate)
    // 도착섬 입장은 실제로 발견 가능한 아이동이 배치된 character 칸에서만 허용한다.
    if (arrivedSlot.type === 'character' && arrivedSlot.characterId) {
      navigate(`/voyage/island/${arrivedSlot.characterId}/landing`)
      return
    }
    if (arrivedSlot.type === 'home') {
      void returnToHarbor()
      return
    }

    if (MODULE_ACTION_API_SYNC && (arrivedSlot.type === 'resource' || arrivedSlot.type === 'treasure')) {
      const uid = accountStoreFacade.getFirebaseUid()
      if (uid) {
        void api.clearRouteLanding(uid, landingForSlot?.landingId, { routeId: landingForSlot?.routeId, boardPosition: landingForSlot?.boardPosition })
          .then((response) => applyActionApiResponse(response))
          .catch((error) => console.warn('[route-neighbor] landing clear action api failed', error))
          .finally(() => {
            setArrivedLanding(null)
            setArrivedSlot(null)
            voyageSessionFacade.clearLanding()
            setPhase('idle')
          })
        return
      }
    }

    // 자원·보상 처리 — host 모듈 actions 위임 (정착 완료)
    // route-neighbor 모듈의 processLanding 시그니처와 정합:
    //   treasure → host.rewardCoins
    //   resource → host.addMaterial (basic_food·memory_piece — 더미)
    //   storm    → host.spendCoins (음수 보상 = 비용)
    //   empty    → host.rewardCoins (2)
    if (arrivedSlot.type === 'treasure') {
      const coin = 30 + Math.floor(Math.random() * 30)
      host.rewardCoins(coin)
    } else if (arrivedSlot.type === 'resource') {
      host.addMaterial('basic_food', 1)
      host.addMaterial('memory_piece', 1)
    } else if (arrivedSlot.type === 'storm') {
      host.spendCoins(10)
    } else if (arrivedSlot.type === 'empty') {
      host.rewardCoins(2)
    }
    setArrivedLanding(null)
    setArrivedSlot(null)
    voyageSessionFacade.clearLanding()
    setPhase('idle')
  }

  const canEnterAidongIsland = arrivedSlot?.type === 'character' && !!arrivedSlot.characterId

  const assignShipSlot = async (kind: 'cabin' | 'deck', slotId: string, current?: string) => {
    if (!uid || shipLoading) return
    const characterId = current ? undefined : selectedAidong ?? undefined
    if (!current && !characterId) return
    if (characterId && !sailingAidongs.includes(characterId)) {
      setShipError('항해 중 배 메뉴에는 현재 배에 탄 아이동만 배치할 수 있어요.')
      return
    }

    setShipLoading(true)
    setShipError(null)
    try {
      const response = kind === 'cabin'
        ? await api.assignShipCabin(uid, slotId, characterId, 'voyage')
        : await api.assignShipDeck(uid, slotId, characterId, 'voyage')
      setShipState(toShipStateView(response.state))
      applyActionApiResponse(response)
      if (characterId) setSelectedAidong(null)
    } catch (error) {
      console.warn('[ship] voyage slot assign failed', error)
      setShipError('항해 중 배치를 변경하지 못했어요.')
    } finally {
      setShipLoading(false)
    }
  }

  const feedCabinAidong = (characterId: AidongCharacterId, food: typeof SHIP_FOODS[number]) => {
    if (coins < food.cost) {
      alert('코인이 부족해요.')
      return
    }
    hostStoreFacade.rewardCoins(-food.cost)
    myAidongStoreFacade.applyCareAction(characterId, food.actionId)
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

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="항해" title="이웃섬 보드" subtitle={route.name} showBack backTo="/island/harbor" />
      {/* 헤더 */}
      <GameStage sx={{ mb: 2 }} stageSx={{ px: 3, py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h2" sx={{ fontSize: 18 }}>{route.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{route.subtitle}</Typography>
          </Box>
          <InfoChip
            label={`🎲 ${diceCount}`}
            title="주사위: 항해 보드에서 이동할 때 1개씩 사용하는 항해 전용 재화입니다."
          />
          <InfoChip
            label={`📍 ${boardPosition}/${route.slotsCount - 1}`}
            title="현재 위치: 항해 보드의 현재 칸 번호입니다."
            color="primary"
          />
        </Stack>
      </GameStage>

      {HARBOR_ZONE && (
        <GameStage
          stageWidth={VOYAGE_BOARD_STAGE_WIDTH}
          sx={{ mb: 2 }}
          stageSx={{
            p: 1.5,
            border: '2px solid #9d8150',
            bgcolor: 'rgba(255,244,203,0.94)',
            borderRadius: 1,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr auto' },
            gap: 1,
            alignItems: { xs: 'flex-start', sm: 'center' },
            boxShadow: '0 10px 22px rgba(157,129,80,0.16)',
          }}
        >
          <Box sx={{ fontSize: 32, lineHeight: 1 }}>{HARBOR_ZONE.emoji}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 900, lineHeight: 1.15 }}>
              {HARBOR_ZONE.areaNo} · {HARBOR_ZONE.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              항해 보드는 이 anchor 구역에서 출항하고, 한 바퀴 후 같은 항구로 귀항합니다.
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label={getZoneKindLabel(HARBOR_ZONE)} size="small" color="warning" />
            <Chip label={PHASE_LABEL[HARBOR_ZONE.phase]} size="small" />
          </Stack>
        </GameStage>
      )}

      {/* 외곽 보드 + 중앙 상태창 */}
      <GameStage
        stageWidth={VOYAGE_BOARD_STAGE_WIDTH}
        sx={{ mb: 3 }}
        stageSx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_COLUMNS}, 1fr)`,
          gridTemplateRows: {
            xs: `repeat(${BOARD_ROWS}, clamp(38px, 10vw, 50px))`,
            sm: `repeat(${BOARD_ROWS}, 62px)`,
          },
          gap: { xs: 0.35, sm: 0.75 },
          p: { xs: 0.65, sm: 1.25 },
          bgcolor: 'rgba(20, 92, 112, 0.08)',
          border: '1px solid rgba(62,155,143,0.18)',
          borderRadius: 2,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.65), 0 14px 30px rgba(66,86,80,0.12)',
        }}
      >
        <Box
          sx={{
            gridColumn: '2 / 9',
            gridRow: '2 / 8',
            minHeight: { xs: 214, sm: 330 },
            p: { xs: 1, sm: 2 },
            borderRadius: 1.5,
            bgcolor: 'rgba(255,254,250,0.92)',
            border: '1px solid rgba(62,155,143,0.2)',
            boxShadow: '0 12px 28px rgba(66,86,80,0.12)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: { xs: 0.75, sm: 1.5 },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <InfoChip
              label={getPhaseLabel(phase)}
              title="항해 상태: 대기, 주사위 굴림, 이동, 도착 상태를 표시합니다."
              color={phase === 'idle' ? 'default' : 'primary'}
            />
            {HARBOR_ZONE && (
              <Chip
                label={`${HARBOR_ZONE.areaNo} 출발 anchor`}
                color="warning"
                size="small"
                variant={currentBoardSlot.type === 'home' ? 'filled' : 'outlined'}
              />
            )}
          </Stack>

          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              현재 칸
            </Typography>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 0.75 }}>
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  display: { xs: 'none', sm: 'grid' },
                  borderRadius: 1.5,
                  placeItems: 'center',
                  fontSize: 28,
                  bgcolor: SLOT_TYPE_COLOR[currentBoardSlot.type],
                  border: '1px solid rgba(0,0,0,0.12)',
                }}
              >
                {currentBoardSlot.type === 'character' && currentBoardSlot.characterId ? '🐾' : currentBoardSlot.emoji}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h2" sx={{ fontSize: { xs: 16, sm: 22 }, lineHeight: 1.15 }}>
                  {getSlotCaption(currentBoardSlot)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {route.name} · {route.subtitle}
                </Typography>
                {currentBoardSlot.type === 'home' && HARBOR_ZONE && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip label={HARBOR_ZONE.areaNo} size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
                    <Chip label={getZoneKindLabel(HARBOR_ZONE)} size="small" color="warning" sx={{ height: 20, fontSize: 10 }} />
                    <Chip label={PHASE_LABEL[HARBOR_ZONE.phase]} size="small" sx={{ height: 20, fontSize: 10 }} />
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 34, sm: 58 },
                lineHeight: 1,
                mb: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {lastRoll !== null ? lastRoll : '🎲'}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                onClick={handleRoll}
                disabled={phase !== 'idle' || diceCount <= 0}
              >
                {phase === 'idle' ? '주사위 굴리기' : phase === 'rolling' ? '굴리는 중...' : '이동 중...'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => { void returnToHarbor() }}
                disabled={returningToHarbor}
              >
                {returningToHarbor ? '항구로 복귀 중...' : '항구 복귀'}
              </Button>
            </Stack>
          </Box>

          {diceCount <= 0 && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              주사위가 부족합니다. 항구 지원 배치로 충전할 수 있어요.
            </Alert>
          )}
        </Box>

        {route.slots.map((slot) => {
          const isCurrent = slot.index === boardPosition
          const cell = getPerimeterCell(slot.index)
          return (
            <Tooltip key={slot.index} title={getSlotTooltip(slot)}>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => setInspectedSlot(slot)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setInspectedSlot(slot)
                }
              }}
              sx={{
                gridColumn: cell.gridColumn,
                gridRow: cell.gridRow,
                minWidth: 0,
                minHeight: { xs: 'clamp(38px, 10vw, 50px)', sm: 62 },
                bgcolor: SLOT_TYPE_COLOR[slot.type],
                border: isCurrent ? '2px solid' : '1px solid',
                borderColor: isCurrent ? '#246b6f' : 'rgba(0,0,0,0.12)',
                borderRadius: 1,
                p: { xs: 0.25, sm: 0.5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                textAlign: 'center',
                transform: isCurrent ? 'translateY(-2px)' : 'none',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                boxShadow: isCurrent ? '0 10px 18px rgba(36,107,111,0.24)' : '0 2px 5px rgba(66,86,80,0.08)',
                cursor: 'help',
                outline: 'none',
                '&:hover, &:focus-visible': {
                  borderColor: '#246b6f',
                  boxShadow: '0 10px 18px rgba(36,107,111,0.2)',
                },
              }}
            >
              {slot.type === 'character' && slot.characterId ? (
                <Box sx={{ width: { xs: 24, sm: 34 }, height: { xs: 24, sm: 34 }, overflow: 'hidden' }}>
                  <Box sx={{ transform: { xs: 'scale(0.72)', sm: 'none' }, transformOrigin: 'top left' }}>
                    <BoardIcon character={slot.characterId} size={34} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ fontSize: { xs: 16, sm: 23 }, lineHeight: 1 }}>{slot.emoji}</Box>
              )}
              <Box
                sx={{
                  mt: 0.25,
                  maxWidth: '100%',
                  fontSize: { xs: 7, sm: 9 },
                  lineHeight: 1.05,
                  fontWeight: isCurrent ? 800 : 600,
                  color: 'rgba(0,0,0,0.72)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {slot.index === 0 ? '항구' : slot.type === 'character' ? slot.characterId : slot.index}
              </Box>
              {slot.index === 0 && HARBOR_ZONE && (
                <Box
                  sx={{
                    mt: 0.25,
                    px: 0.4,
                    borderRadius: 0.75,
                    bgcolor: 'rgba(255,254,250,0.76)',
                    color: '#7b5b1d',
                    fontSize: 8,
                    fontWeight: 900,
                    lineHeight: 1.25,
                  }}
                >
                  {HARBOR_ZONE.areaNo}
                </Box>
              )}
              {isCurrent && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -16,
                    right: -10,
                    width: { xs: 22, sm: 30 },
                    height: { xs: 22, sm: 30 },
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: '#fffefa',
                    border: '2px solid #246b6f',
                    boxShadow: '0 6px 12px rgba(36,107,111,0.24)',
                    fontSize: { xs: 13, sm: 18 },
                  }}
                >
                  ⛵
                </Box>
              )}
            </Box>
            </Tooltip>
          )
        })}
      </GameStage>

      <Dialog open={!!inspectedSlot} onClose={() => setInspectedSlot(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {inspectedSlot ? `${inspectedSlot.index}번 칸 · ${getSlotTypeLabel(inspectedSlot)}` : '칸 정보'}
        </DialogTitle>
        <DialogContent dividers>
          {inspectedSlot && (
            <Stack spacing={1.25}>
              <Typography variant="h2" sx={{ fontSize: 18 }}>
                {getSlotCaption(inspectedSlot)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {getSlotEffect(inspectedSlot)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip label={`타입 ${getSlotTypeLabel(inspectedSlot)}`} size="small" />
                <Chip label={`위치 ${inspectedSlot.index}/${route.slotsCount - 1}`} size="small" />
                {inspectedSlot.characterId && (
                  <Chip label={`아이동 ${inspectedSlot.characterId}`} size="small" color="primary" />
                )}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInspectedSlot(null)}>닫기</Button>
        </DialogActions>
      </Dialog>

      <GameStage sx={{ mb: 3 }} stageSx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h2" sx={{ fontSize: 18 }}>항해 중 배 메뉴</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {currentShipType?.name ?? '현재 배'} · 선실 {currentShipType?.cabinSlots ?? 0} · 갑판 {currentShipType?.deckSlots ?? 0}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" variant="outlined" onClick={() => setShipInventoryOpen(true)}>
              배 인벤토리
            </Button>
            <Chip label="항해 중" color="primary" size="small" />
          </Stack>
        </Stack>

        {shipError && <Alert severity="warning" sx={{ mb: 2 }}>{shipError}</Alert>}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>갑판에서 선실로 옮길 아이동</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {sailingAidongs.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              현재 배에 탄 아이동이 없습니다.
            </Typography>
          ) : (
            sailingAidongs.map((id) => {
              const inCabin = cabinAidongs.has(id)
              return (
                <Button
                  key={id}
                  size="small"
                  variant={selectedAidong === id ? 'contained' : 'outlined'}
                  disabled={shipLoading || inCabin}
                  onClick={() => setSelectedAidong(selectedAidong === id ? null : id)}
                >
                  {id}{inCabin ? ' · 선실 중' : ' · 갑판'}
                </Button>
              )
            })
          )}
        </Stack>

        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>선실</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 1 }}>
              {Array.from({ length: cabinSlotCount }, (_, index) => {
                const slotId = `cabin${index + 1}`
                const assigned = shipState.cabinAssignments[slotId]
                return (
                  <Box
                    key={slotId}
                    sx={{
                      border: '1px solid',
                      borderColor: assigned ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      p: 1,
                      textAlign: 'center',
                      bgcolor: assigned ? 'action.selected' : 'background.paper',
                    }}
                  >
                    <Button size="small" fullWidth onClick={() => setSelectedCabinSlot(slotId)}>
                      선실 {index + 1}
                    </Button>
                    {assigned ? (
                      <>
                        <BoardIcon character={assigned as AidongCharacterId} size={44} />
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>{assigned}</Typography>
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>빈 선실</Typography>
                    )}
                    <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!selectedAidong || shipLoading}
                        onClick={() => assignShipSlot('cabin', slotId)}
                      >
                        배치
                      </Button>
                      <Button
                        size="small"
                        disabled={!assigned || shipLoading}
                        onClick={() => assignShipSlot('cabin', slotId, assigned)}
                      >
                        갑판으로
                      </Button>
                    </Stack>
                  </Box>
                )
              })}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>갑판</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))', gap: 1 }}>
              {Array.from({ length: deckSlotCount }, (_, index) => {
                const slotId = `deck${index + 1}`
                const assigned = shipState.deckAssignments[slotId]
                return (
                  <Box
                    key={slotId}
                    sx={{
                      border: '1px solid',
                      borderColor: assigned ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      p: 1,
                      textAlign: 'center',
                      bgcolor: assigned ? 'action.selected' : 'background.paper',
                    }}
                  >
                    <Typography variant="caption" sx={{ display: 'block' }}>갑판 {index + 1}</Typography>
                    {assigned ? (
                      <>
                        <BoardIcon character={assigned as AidongCharacterId} size={44} />
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>{assigned}</Typography>
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>빈 갑판</Typography>
                    )}
                    {assigned && (
                      <Chip
                        label="항해 중 하선 불가"
                        size="small"
                        color="warning"
                        sx={{ mt: 1, height: 20, fontSize: 10 }}
                      />
                    )}
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Stack>
      </GameStage>

      {/* 칸 도착 모달 */}
      <Modal open={phase === 'arrived' && !!arrivedSlot} onClose={() => {}}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            borderRadius: 2,
            p: 4,
            width: '90%',
            maxWidth: 400,
            outline: 'none',
            textAlign: 'center',
            boxShadow: 24,
          }}
        >
          {arrivedSlot && (
            <>
              <Typography sx={{ fontSize: 56, mb: 1 }}>
                {arrivedSlot.type === 'character' && arrivedSlot.characterId ? '🐾' : arrivedSlot.emoji}
              </Typography>
              <Typography variant="h2" sx={{ mb: 1 }}>
                {arrivedSlot.type === 'character' && arrivedSlot.characterId
                  ? `${arrivedSlot.characterId}의 섬!`
                  : arrivedSlot.label}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                {arrivedSlot.type === 'character' && '이 섬에 누가 살고 있어요. 만나러 갈까요?'}
                {arrivedSlot.type === 'treasure' && '🪙 30~60 코인을 발견했어요!'}
                {arrivedSlot.type === 'storm' && '폭풍을 만났지만 무사히 빠져나왔어요. (🪙 -10)'}
                {arrivedSlot.type === 'resource' && '자원이 풍부한 섬이에요. (🥐 음식 1·💎 기억조각 1)'}
                {arrivedSlot.type === 'empty' && '잔잔한 바다. (🪙 +2)'}
                {arrivedSlot.type === 'home' && '한 바퀴 돌아 항구에 도착했어요!'}
              </Typography>
              <Button variant="contained" size="large" onClick={handleSlotAction} fullWidth>
                {canEnterAidongIsland ? '도착 섬으로 들어가기' : '계속'}
              </Button>
            </>
          )}
        </Box>
      </Modal>

      <Dialog open={shipInventoryOpen} onClose={() => setShipInventoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>배 인벤토리</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>인벤토리</Typography>
          <Box sx={{ mb: 2 }}>{renderInventoryList(shipState.shipInventory)}</Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>항해 화물</Typography>
          <Box sx={{ mb: 2 }}>{renderInventoryList(shipState.cargo)}</Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            항해 중 얻은 공통 화물은 입항 후 비우기 action으로 전역 보관소에 정리할 예정입니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          {CUSTOMS_UI_ENABLED && hasShipInventory && (
            <Button
              variant="contained"
              onClick={() => {
                setShipInventoryOpen(false)
                setShipCustomsOpen(true)
              }}
            >
              세관
            </Button>
          )}
          <Button onClick={() => setShipInventoryOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {CUSTOMS_UI_ENABLED && (
        <CustomsTransferDialog
          open={shipCustomsOpen}
          sourceModule="ship"
          onClose={() => {
            setShipCustomsOpen(false)
            void loadShipMenu()
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
                    항해 중 선실에서 쉴 수 있어요.
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

            {selectedCabinAidong && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>밥</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {SHIP_FOODS.map((food) => (
                    <Button
                      key={food.id}
                      variant="outlined"
                      disabled={coins < food.cost}
                      onClick={() => feedCabinAidong(selectedCabinAidong as AidongCharacterId, food)}
                      sx={{ flexDirection: 'column', py: 1 }}
                    >
                      <Box sx={{ fontSize: 24 }}>{food.emoji}</Box>
                      <Typography variant="caption">{food.label}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 10 }}>🪙{food.cost}</Typography>
                    </Button>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {selectedCabinAidong && (
            <Button onClick={() => setCareTarget(selectedCabinAidong as AidongCharacterId)}>
              케어 메뉴
            </Button>
          )}
          <Button onClick={() => setSelectedCabinSlot(null)}>닫기</Button>
        </DialogActions>
      </Dialog>

      <CareModal character={careTarget} onClose={() => setCareTarget(null)} />
    </Box>
  )
}
