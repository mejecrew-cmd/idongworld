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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { buildNeighborRoute, SLOT_TYPE_COLOR, type BoardSlot } from '@/data/board'
import { BoardIcon } from '@/components/AidongSprite'
import { CareModal } from '@/components/CareModal'
import { CustomsTransferDialog } from '@/components/CustomsTransferDialog'
import { ScreenHeader } from '@/components/ScreenHeader'
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
    <Box sx={{ p: 2, pb: 4 }}>
      <ScreenHeader category="항해" title="이웃섬 보드" subtitle={route.name} />
      {/* 헤더 */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, mt: 1 }}>
        <Button
          size="small"
          onClick={() => navigate('/island/harbor')}
        >
          ← 항구
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h2" sx={{ fontSize: 18 }}>{route.name}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{route.subtitle}</Typography>
        </Box>
        <Chip label={`🎲 ${diceCount}`} size="small" />
        <Chip label={`📍 ${boardPosition}/${route.slotsCount - 1}`} size="small" color="primary" />
      </Stack>

      {/* 보드 그리드 6×5 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 0.5,
          mb: 3,
          p: 1,
          bgcolor: 'rgba(74, 124, 220, 0.08)',
          borderRadius: 2,
        }}
      >
        {route.slots.map((slot) => {
          const isCurrent = slot.index === boardPosition
          return (
            <Box
              key={slot.index}
              sx={{
                aspectRatio: '1',
                bgcolor: SLOT_TYPE_COLOR[slot.type],
                border: isCurrent ? '3px solid' : '1px solid',
                borderColor: isCurrent ? 'primary.main' : 'rgba(0,0,0,0.1)',
                borderRadius: 1,
                p: 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                fontSize: 10,
                textAlign: 'center',
                transform: isCurrent ? 'scale(1.05)' : 'none',
                transition: 'all 0.3s',
                boxShadow: isCurrent ? '0 0 12px rgba(74,124,220,0.6)' : 'none',
              }}
            >
              {slot.type === 'character' && slot.characterId ? (
                <Box sx={{ width: 36, height: 36 }}>
                  <BoardIcon character={slot.characterId} size={36} />
                </Box>
              ) : (
                <Box sx={{ fontSize: 22 }}>{slot.emoji}</Box>
              )}
              <Box sx={{ fontSize: 9, mt: 0.3, fontWeight: isCurrent ? 600 : 400, color: 'rgba(0,0,0,0.7)' }}>
                {slot.index === 0 ? '시작' : slot.type === 'character' ? slot.characterId : ''}
              </Box>
              {isCurrent && (
                <Box sx={{ position: 'absolute', top: -6, right: -6, fontSize: 16 }}>⛵</Box>
              )}
            </Box>
          )
        })}
      </Box>

      {/* 컨트롤 */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h2" sx={{ fontSize: 48, mb: 1 }}>
          {lastRoll !== null ? lastRoll : '🎲'}
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center">
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
            {returningToHarbor ? '복귀 중...' : '마이섬 복귀'}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, mb: 3 }}>
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
      </Box>

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
                {arrivedSlot.type === 'home' && '한 바퀴 돌아 마이섬에 돌아왔어요!'}
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
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
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
