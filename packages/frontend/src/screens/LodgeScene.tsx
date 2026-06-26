/**
 * packages/frontend/src/screens/LodgeScene.tsx
 * ------------------------------------------------------------
 * 역할: 내 섬 숙소 화면을 렌더링하고, 숙소 방 꾸미기와 Aidong 관리 메뉴를 연결한다.
 *
 * 숙소의 방 꾸미기는 lodge module backend가 권위 상태를 가진다.
 * 이 화면은 /api/modules/lodge/config에서 가구 catalog를 읽고,
 * 가구 구매와 방별 배치/해제는 lodge 전용 API로 처리한다.
 *
 * 방 꾸미기는 빈 방과 Aidong의 방 모두에서 가능하다.
 * 다만 항구 지원 배치 중인 Aidong은 방 자체를 꾸밀 수는 있지만,
 * 밥주기, 케어, 옷입히기 같은 Aidong 상태 변경 액션은 막는다.
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite, OUTFIT_OPTIONS } from '@/components/AidongSprite'
import { CareModal } from '@/components/CareModal'
import { CustomsTransferDialog } from '@/components/CustomsTransferDialog'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { PHASE_COLOR, PHASE_LABEL, getZoneById, getZoneKindLabel } from '@/data/zones'
import { INITIAL_NEEDS, calcMoodScore, moodFromScore, moodToExpression } from '@/data/needs'
import { getCurrentZone } from '@/data/schedZone'
import { api, type DecorItemConfig } from '@/lib/api'
import { applyActionApiResponse, applyModuleActionState } from '@/lib/actionApiSync'
import { accountStoreFacade, hostStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'
const CUSTOMS_UI_ENABLED = import.meta.env.VITE_CUSTOMS_UI_ENABLED === 'true'
const LODGE_ZONE = getZoneById('lodge')

const EMPTY_ROOMS = [
  { roomId: 'empty-room-1', label: '빈 방 1' },
  { roomId: 'empty-room-2', label: '빈 방 2' },
]

const FALLBACK_FURNITURE: DecorItemConfig[] = [
  { itemId: 'bed', label: '침대', cost: 0, defaultOwned: 1 },
  { itemId: 'desk', label: '책상', cost: 0, defaultOwned: 1 },
  { itemId: 'plant', label: '화분', cost: 30, defaultOwned: 0 },
  { itemId: 'rug', label: '카펫', cost: 50, defaultOwned: 0 },
]

const FURNITURE_MARKS: Record<string, string> = {
  bed: '침',
  desk: '책',
  plant: '화',
  rug: '깔',
}

const FOODS = [
  { id: 'rice', mark: '밥', label: '밥', cost: 15 },
  { id: 'bread', mark: '빵', label: '빵', cost: 10 },
  { id: 'fruit', mark: '과', label: '과일', cost: 8 },
  { id: 'cake', mark: '케', label: '케이크', cost: 25 },
]

const AIDONG_ITEMS = [
  { id: 'aidong-ribbon', mark: '리', label: 'Aidong 리본' },
]

// top/left: 집 이미지(03_Home_04.png) 위에서 각 버튼이 놓일 위치(%). 위치 미세조정은 이 값만 바꾸면 됩니다.
const LODGE_SECTIONS: Array<{ id: LodgeSection; label: string; description: string; top: string; left: string }> = [
  { id: 'rooms', label: '방', description: '적극 육성 슬롯', top: '27%', left: '50%' },
  { id: 'decor', label: '꾸미기', description: '방과 빈 방 가구', top: '49%', left: '30%' },
  { id: 'practice', label: '연습실', description: '후속 육성 공간', top: '49%', left: '70%' },
  { id: 'myroom', label: '마이룸', description: '정보/도감/콜렉션', top: '69%', left: '36%' },
  { id: 'debut', label: '데뷔 회의실', description: '후속 목표 관리', top: '69%', left: '66%' },
  { id: 'yard', label: '마당', description: '보유/대기 Aidong', top: '90%', left: '50%' },
]

const CLEANING_SPOTS = LODGE_SECTIONS.filter((section) => section.id !== 'yard')

const RESOURCE_LABELS: Record<string, string> = {
  acorn: '도토리',
  flower: '꽃',
  ore: '광석',
  sailcloth: '돛천',
  'deck-cargo': '갑판 화물',
  rest_token: '휴식권',
  memory_piece: '기억 조각',
  'shell-fragment': '조개 조각',
  'aidong-ribbon': '아이동 리본',
}

type LodgeRoomState = { furniture: string[] }
type LodgeSection = 'yard' | 'rooms' | 'decor' | 'practice' | 'debut' | 'myroom'
type RoomOption = {
  roomId: string
  label: string
  characterId?: AidongCharacterId
  empty?: boolean
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

function toRoomFurnitureRecord(value: unknown): Record<string, LodgeRoomState> {
  const result: Record<string, LodgeRoomState> = {}
  for (const [roomId, rawRoom] of Object.entries(asRecord(value))) {
    const room = asRecord(rawRoom)
    result[roomId] = {
      furniture: Array.isArray(room.furniture)
        ? room.furniture.filter((itemId): itemId is string => typeof itemId === 'string')
        : [],
    }
  }
  return result
}

function countPlacedFurniture(
  rooms: Record<string, LodgeRoomState>,
  itemId: string,
  exceptRoomId?: string,
): number {
  return Object.entries(rooms).reduce((total, [roomId, room]) => (
    roomId === exceptRoomId ? total : total + room.furniture.filter((entry) => entry === itemId).length
  ), 0)
}

function getFurnitureLabel(furnitureItems: DecorItemConfig[], itemId: string): string {
  return furnitureItems.find((item) => item.itemId === itemId)?.label ?? itemId
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

function LodgeCleaningScene() {
  const navigate = useNavigate()
  const uid = accountStoreFacade.useFirebaseUid()
  const [cleanedSpots, setCleanedSpots] = useState<Set<LodgeSection>>(() => new Set())
  const [namingOpen, setNamingOpen] = useState(false)
  const [lodgeName, setLodgeName] = useState('')
  const [saving, setSaving] = useState(false)

  const cleanedCount = cleanedSpots.size
  const allCleaned = cleanedCount >= CLEANING_SPOTS.length
  const trimmedName = lodgeName.trim()
  const nameValid = trimmedName.length >= 2 && trimmedName.length <= 10

  const onCleanSpot = (spotId: LodgeSection) => {
    setCleanedSpots((prev) => {
      const next = new Set(prev)
      next.add(spotId)
      return next
    })
  }

  const onComplete = async () => {
    if (!nameValid || saving) return
    setSaving(true)
    accountStoreFacade.setSooksoName(trimmedName)
    accountStoreFacade.setSooksoClean(true)
    accountStoreFacade.setOnboardingComplete(true)
    if (uid) {
      try {
        await api.patchAccountState(uid, {
          sooksoName: trimmedName,
          sooksoClean: true,
          onboardingComplete: true,
        })
      } catch (error) {
        console.warn('[lodge] failed to persist sooksoClean', error)
      }
    }
    navigate('/island')
  }

  return (
    <Box sx={{ p: 0 }}>
      <ScreenHeader
        category="마이섬"
        title="숙소"
        subtitle="반짝이는 곳을 정리해서 숙소를 깨워요."
        showBack
      />

      <GameStage>
        <Box
          sx={{
            position: 'relative',
            width: { xs: 'min(82vw, calc(52dvh * 3 / 4))', sm: '100%' },
            maxWidth: 560,
            mx: 'auto',
            aspectRatio: '3 / 4',
            backgroundImage: 'url(/assets/backgrounds/03_Home_04.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 14,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(88%, 420px)',
              bgcolor: 'rgba(255,255,255,0.94)',
              border: '1px solid rgba(255,211,112,0.9)',
              borderRadius: 3,
              px: 2,
              py: 1.25,
              textAlign: 'center',
              boxShadow: '0 12px 30px rgba(80,57,30,0.18)',
              cursor: allCleaned && !namingOpen ? 'pointer' : 'default',
              zIndex: 3,
            }}
            onClick={() => {
              if (allCleaned && !namingOpen) setNamingOpen(true)
            }}
          >
            {allCleaned ? (
              <Typography sx={{ fontWeight: 900, whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                {'숙소가 아주 깨끗해져서 너무 좋다!\n예쁜 숙소에 이름을 지어보자~!'}
              </Typography>
            ) : (
              <>
                <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                  숙소 청소하기
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  반짝이는 곳을 탭해서 주변을 정리하세요
                </Typography>
                <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 0.75 }}>
                  {CLEANING_SPOTS.map((spot, index) => (
                    <Typography
                      key={spot.id}
                      sx={{
                        fontSize: 22,
                        lineHeight: 1,
                        color: index < cleanedCount ? '#f2b632' : 'rgba(120,104,86,0.28)',
                        textShadow: index < cleanedCount ? '0 2px 8px rgba(242,182,50,0.45)' : 'none',
                      }}
                    >
                      ★
                    </Typography>
                  ))}
                </Stack>
              </>
            )}
          </Box>

          {!allCleaned && CLEANING_SPOTS.map((spot) => {
            const cleaned = cleanedSpots.has(spot.id)
            if (cleaned) return null
            return (
              <Button
                key={spot.id}
                aria-label={`${spot.label} 청소`}
                onClick={() => onCleanSpot(spot.id)}
                sx={{
                  position: 'absolute',
                  top: spot.top,
                  left: spot.left,
                  transform: 'translate(-50%, -50%)',
                  minWidth: 0,
                  width: { xs: 42, sm: 52 },
                  height: { xs: 42, sm: 52 },
                  borderRadius: '50%',
                  fontSize: { xs: 24, sm: 30 },
                  color: '#fff7c7',
                  bgcolor: 'rgba(255, 197, 73, 0.28)',
                  border: '1px solid rgba(255,255,255,0.75)',
                  boxShadow: '0 0 18px rgba(255,211,92,0.9), 0 8px 20px rgba(80,57,30,0.18)',
                  textShadow: '0 0 10px rgba(255,255,255,0.95)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 211, 92, 0.42)',
                    boxShadow: '0 0 24px rgba(255,226,120,0.95), 0 8px 20px rgba(80,57,30,0.2)',
                  },
                }}
              >
                ✦
              </Button>
            )
          })}

          {namingOpen && (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                bottom: 18,
                transform: 'translateX(-50%)',
                width: 'min(88%, 420px)',
                bgcolor: 'rgba(255,255,255,0.96)',
                border: '1px solid rgba(62,155,143,0.28)',
                borderRadius: 3,
                p: 2,
                boxShadow: '0 14px 34px rgba(66,86,80,0.2)',
                zIndex: 4,
              }}
            >
              <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
                숙소 이름 짓기
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 1.5 }}>
                새롭게 태어난 숙소에 따뜻한 이름을 선물해주세요.
              </Typography>
              <TextField
                value={lodgeName}
                onChange={(event) => setLodgeName(event.target.value.slice(0, 10))}
                placeholder="2~10자"
                size="small"
                fullWidth
                inputProps={{ minLength: 2, maxLength: 10 }}
                error={lodgeName.length > 0 && !nameValid}
                helperText="숙소 이름은 추후 변경이 가능해요."
              />
              <Button
                variant="contained"
                fullWidth
                disabled={!nameValid || saving}
                onClick={onComplete}
                sx={{ mt: 1.5 }}
              >
                완료
              </Button>
            </Box>
          )}
        </Box>
      </GameStage>
    </Box>
  )
}

export const LodgeScene = () => {
  const navigate = useNavigate()
  const uid = accountStoreFacade.useFirebaseUid()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const sooksoName = accountStoreFacade.useSooksoName()
  const sooksoClean = accountStoreFacade.useSooksoClean()
  const needs = myAidongStoreFacade.useNeeds()
  const coins = hostStoreFacade.useCoins()
  const inventory = hostStoreFacade.useInventory()
  const equippedOutfit = myAidongStoreFacade.useEquippedOutfit()
  const equippedItems = myAidongStoreFacade.useEquippedItems()
  const [section, setSection] = useState<LodgeSection>('yard')
  const [tab, setTab] = useState<'rooms' | 'outfit' | 'food'>('rooms')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [careTarget, setCareTarget] = useState<AidongCharacterId | null>(null)
  const [sailingAidongs, setSailingAidongs] = useState<Set<string>>(new Set())
  const [harborAidongs, setHarborAidongs] = useState<Set<string>>(new Set())
  const [furnitureItems, setFurnitureItems] = useState<DecorItemConfig[]>(FALLBACK_FURNITURE)
  const [lodgeInventory, setLodgeInventory] = useState<Record<string, number>>({})
  const [lodgeFurniture, setLodgeFurniture] = useState<Record<string, number>>({})
  const [lodgeRooms, setLodgeRooms] = useState<Record<string, LodgeRoomState>>({})
  const [lodgeDecorLoading, setLodgeDecorLoading] = useState(false)
  const [lodgeStateLoading, setLodgeStateLoading] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [lodgeCustomsOpen, setLodgeCustomsOpen] = useState(false)

  const curZone = getCurrentZone()
  const unavailableAidongs = useMemo(
    () => new Set([...sailingAidongs, ...harborAidongs]),
    [harborAidongs, sailingAidongs],
  )
  const homeAidongs = useMemo(
    () => recruitedAidongs.filter((id) => !unavailableAidongs.has(id)),
    [recruitedAidongs, unavailableAidongs],
  )
  const awayAidongs = useMemo(
    () => recruitedAidongs.filter((id) => unavailableAidongs.has(id)),
    [recruitedAidongs, unavailableAidongs],
  )

  const roomOptions = useMemo<RoomOption[]>(() => [
    ...recruitedAidongs.map((characterId) => ({
      roomId: characterId,
      label: `${characterId}의 방`,
      characterId,
    })),
    ...EMPTY_ROOMS.map((room) => ({ ...room, empty: true })),
  ], [recruitedAidongs])

  const selectedRoom = roomOptions.find((room) => room.roomId === selectedRoomId) ?? roomOptions[0] ?? null
  const selectedChar = selectedRoom?.characterId ?? null
  const selectedRoomFurniture = selectedRoom ? lodgeRooms[selectedRoom.roomId]?.furniture ?? [] : []
  const selectedUnavailable = selectedChar ? unavailableAidongs.has(selectedChar) : false
  const selectedNeeds = selectedChar ? needs[selectedChar] ?? INITIAL_NEEDS : null
  const selectedMoodScore = selectedNeeds ? calcMoodScore(selectedNeeds) : 0
  const selectedMood = selectedNeeds ? moodFromScore(selectedMoodScore, curZone === 4) : null
  const selectedExpression = selectedMood ? moodToExpression(selectedMood) : undefined
  const hasLodgeInventory = Object.values(lodgeInventory).some((amount) => amount > 0)

  useEffect(() => {
    if (!selectedRoomId && roomOptions.length > 0) {
      setSelectedRoomId(roomOptions[0].roomId)
      return
    }
    if (selectedRoomId && roomOptions.length > 0 && !roomOptions.some((room) => room.roomId === selectedRoomId)) {
      setSelectedRoomId(roomOptions[0].roomId)
    }
  }, [roomOptions, selectedRoomId])

  useEffect(() => {
    if (!uid) return
    let cancelled = false

    const loadHarborSupportCrew = async () => {
      try {
        const shipResponse = await api.getModuleState(uid, 'ship')
        if (cancelled) return

        const shipState = asRecord(shipResponse.state)
        const harborAssignedChars = Array.isArray(shipState.harborAssignedChars)
          ? shipState.harborAssignedChars.filter((id): id is string => typeof id === 'string' && id.length > 0)
          : []

        setHarborAidongs(new Set(harborAssignedChars))
        setSailingAidongs(new Set())
      } catch (error) {
        console.warn('[lodge] failed to load harbor support crew state', error)
      }
    }

    void loadHarborSupportCrew()

    return () => {
      cancelled = true
    }
  }, [uid])

  const loadLodgeState = async () => {
    if (!uid) return
    setLodgeStateLoading(true)
    try {
      const [configResponse, stateResponse] = await Promise.all([
        api.getLodgeConfig(),
        api.getModuleState(uid, 'lodge'),
      ])

      if (Array.isArray(configResponse.furnitureItems) && configResponse.furnitureItems.length > 0) {
        setFurnitureItems(configResponse.furnitureItems)
      }

      const state = asRecord(stateResponse.state)
      setLodgeInventory(toNumberRecord(state.lodgeInventory))
      setLodgeFurniture(toNumberRecord(state.furniture))
      setLodgeRooms(toRoomFurnitureRecord(state.rooms))
    } catch (error) {
      console.warn('[lodge] failed to load lodge state', error)
    } finally {
      setLodgeStateLoading(false)
    }
  }

  useEffect(() => {
    void loadLodgeState()
  }, [uid])

  useEffect(() => {
    if ((!selectedChar || selectedUnavailable) && tab !== 'rooms') {
      setTab('rooms')
    }
  }, [selectedChar, selectedUnavailable, tab])

  const purchaseFurniture = async (itemId: string) => {
    const currentUid = accountStoreFacade.getFirebaseUid()
    if (!currentUid || lodgeDecorLoading) return
    setLodgeDecorLoading(true)
    try {
      const response = await api.purchaseLodgeFurniture(currentUid, itemId)
      const state = asRecord(response.state)
      setLodgeFurniture(toNumberRecord(state.furniture))
      setLodgeRooms(toRoomFurnitureRecord(state.rooms))
      applyActionApiResponse(response)
    } catch (error) {
      console.warn('[lodge] furniture purchase failed', error)
      alert('가구를 구매하지 못했어요.')
    } finally {
      setLodgeDecorLoading(false)
    }
  }

  const toggleRoomFurniture = async (roomId: string, itemId: string) => {
    const currentUid = accountStoreFacade.getFirebaseUid()
    if (!currentUid || lodgeDecorLoading) return
    setLodgeDecorLoading(true)
    try {
      const response = await api.toggleLodgeRoomFurniture(currentUid, roomId, itemId)
      const state = asRecord(response.state)
      setLodgeFurniture(toNumberRecord(state.furniture))
      setLodgeRooms(toRoomFurnitureRecord(state.rooms))
      applyActionApiResponse(response)
    } catch (error) {
      console.warn('[lodge] room furniture toggle failed', error)
      alert('가구를 배치하지 못했어요.')
    } finally {
      setLodgeDecorLoading(false)
    }
  }

  const onFeed = (charId: AidongCharacterId, food: typeof FOODS[number]) => {
    if (unavailableAidongs.has(charId)) {
      alert('숙소에 없는 Aidong에게는 밥을 줄 수 없어요.')
      return
    }
    if (coins < food.cost) {
      alert('코인이 부족해요.')
      return
    }

    hostStoreFacade.rewardCoins(-food.cost)
    const actionId = curZone === 1 ? 'breakfast' : curZone === 2 ? 'lunch' : curZone === 3 ? 'dinner' : 'snack'
    myAidongStoreFacade.applyCareAction(charId, actionId)
  }

  const onToggleAidongItem = (charId: AidongCharacterId, itemId: string) => {
    if (unavailableAidongs.has(charId)) {
      alert('숙소에 없는 Aidong은 착용 아이템을 바꿀 수 없어요.')
      return
    }
    if (!MODULE_ACTION_API_SYNC) {
      if ((inventory[itemId] ?? 0) <= 0) {
        alert('전역 보관소에 아이템이 없어요.')
        return
      }
      myAidongStoreFacade.toggleEquippedItemLocal(charId, itemId)
      return
    }

    const currentUid = accountStoreFacade.getFirebaseUid()
    if (!currentUid) return
    void api.toggleAidongEquippedItem(currentUid, charId, itemId)
      .then((response) => applyModuleActionState(response.state))
      .catch((error) => {
        console.warn('[my-aidong] equipped item action api failed', error)
        alert('아이템을 착용하지 못했어요.')
      })
  }

  const onSetOutfit = (charId: AidongCharacterId, outfitId: string) => {
    if (unavailableAidongs.has(charId)) {
      alert('숙소에 없는 Aidong은 옷을 갈아입힐 수 없어요.')
      return
    }

    myAidongStoreFacade.setOutfit(charId, outfitId)
    if (!MODULE_ACTION_API_SYNC) return

    const currentUid = accountStoreFacade.getFirebaseUid()
    if (!currentUid) return
    void api.setAidongOutfit(currentUid, charId, outfitId)
      .then((response) => applyModuleActionState(response.state))
      .catch((error) => console.warn('[my-aidong] outfit action api failed', error))
  }

  if (!sooksoClean) {
    return <LodgeCleaningScene />
  }

  return (
    <Box sx={{ p: 0 }}>
      <ScreenHeader
        category="마이섬"
        title="숙소"
        subtitle={LODGE_ZONE ? `${LODGE_ZONE.areaNo} · ${getZoneKindLabel(LODGE_ZONE)}` : '방을 꾸미고 쉬는 Aidong을 돌봐요.'}
        showBack
      />

      <GameStage>
        <Box
          sx={{
            position: 'relative',
            // 모바일: 화면 높이(dvh) 기준으로 제한해 집 전체와 아래 콘텐츠가 한 화면에 보이도록.
            width: { xs: 'min(82vw, calc(52dvh * 3 / 4))', sm: '100%' },
            maxWidth: 560,
            mx: 'auto',
            aspectRatio: '3 / 4',
            backgroundImage: 'url(/assets/backgrounds/03_Home_04.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              bgcolor: 'rgba(255,255,255,0.92)',
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              boxShadow: '0 10px 24px rgba(80, 57, 30, 0.16)',
            }}
          >
            {LODGE_ZONE && (
              <Stack direction="row" spacing={0.5} sx={{ mb: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip label={LODGE_ZONE.areaNo} size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
                <Chip label={getZoneKindLabel(LODGE_ZONE)} size="small" color="warning" sx={{ height: 20, fontSize: 10 }} />
                <Chip label={PHASE_LABEL[LODGE_ZONE.phase]} size="small" sx={{ height: 20, fontSize: 10, bgcolor: PHASE_COLOR[LODGE_ZONE.phase] }} />
              </Stack>
            )}
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {sooksoName ? `${sooksoName}` : 'Aidong 숙소'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              보유 코인 {coins}
            </Typography>
            <Button size="small" variant="outlined" sx={{ mt: 0.75 }} onClick={() => setInventoryOpen(true)}>
              숙소 인벤토리
            </Button>
          </Box>

          {LODGE_SECTIONS.map((item) => (
            <Button
              key={item.id}
              size="small"
              variant={section === item.id ? 'contained' : 'outlined'}
              onClick={() => {
                setSection(item.id)
                if (item.id === 'decor') setTab('rooms')
              }}
              sx={{
                position: 'absolute',
                top: item.top,
                left: item.left,
                transform: 'translate(-50%, -50%)',
                minWidth: 0,
                px: 1.25,
                py: 0.5,
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: 'nowrap',
                borderRadius: 999,
                color: section === item.id ? 'primary.contrastText' : '#5b4636',
                bgcolor: section === item.id ? 'primary.main' : 'rgba(255,254,250,0.92)',
                boxShadow: '0 6px 16px rgba(80,57,30,0.24)',
                '&:hover': {
                  bgcolor: section === item.id ? 'primary.dark' : 'rgba(255,255,255,0.98)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </GameStage>

      <GameStage stageSx={{ px: 2, py: 2 }}>
        {lodgeStateLoading && <LinearProgress sx={{ mb: 2 }} />}
        {harborAidongs.size > 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            항구 지원 배치 중인 Aidong의 방은 꾸밀 수 있지만,
            밥주기, 케어, 옷입히기는 숙소에 있을 때만 가능해요.
          </Alert>
        ) : null}

        {section === 'yard' && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="h2" sx={{ fontSize: 17 }}>마당</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  숙소에 머무는 Aidong과 외부 활동 중인 Aidong을 구분해 보여줘요.
                </Typography>
              </Box>
              <Chip label={`숙소 ${homeAidongs.length} / 외부 ${awayAidongs.length}`} size="small" color="primary" variant="outlined" />
            </Stack>

            {recruitedAidongs.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography sx={{ mb: 1 }}>아직 숙소에 온 Aidong이 없어요.</Typography>
                <Button size="small" variant="contained" onClick={() => navigate('/voyage/board')}>
                  항해로 만나러 가기
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1.5 }}>
                {recruitedAidongs.map((characterId) => {
                  const isAway = unavailableAidongs.has(characterId)
                  const charNeeds = needs[characterId] ?? INITIAL_NEEDS
                  const mood = moodFromScore(calcMoodScore(charNeeds), curZone === 4)
                  return (
                    <Box
                      key={characterId}
                      sx={{
                        border: '1px solid',
                        borderColor: isAway ? 'warning.main' : 'divider',
                        borderRadius: 2,
                        p: 1.25,
                        textAlign: 'center',
                        bgcolor: isAway ? 'rgba(255, 248, 225, 0.72)' : 'background.default',
                      }}
                    >
                      <AidongSprite
                        character={characterId}
                        expression={moodToExpression(mood)}
                        outfit={equippedOutfit[characterId]}
                        size={108}
                      />
                      <Typography sx={{ fontWeight: 800 }}>{characterId}</Typography>
                      <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip label={mood} size="small" sx={{ fontSize: 10 }} />
                        <Chip
                          label={isAway ? (sailingAidongs.has(characterId) ? '항해 중' : '항구 지원') : '숙소 대기'}
                          size="small"
                          color={isAway ? 'warning' : 'success'}
                          variant={isAway ? 'filled' : 'outlined'}
                          sx={{ fontSize: 10 }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setSelectedRoomId(characterId)
                            setSection('rooms')
                            setTab('rooms')
                          }}
                        >
                          방
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={isAway}
                          onClick={() => setCareTarget(characterId)}
                        >
                          케어
                        </Button>
                      </Stack>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Box>
        )}

        {section === 'practice' && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 3, mb: 2 }}>
            <Typography variant="h2" sx={{ fontSize: 17, mb: 1 }}>연습실</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              연습, 스케줄, 능력치 성장은 후속 기획에서 연결할 예정입니다. 지금은 숙소 허브 메뉴 안의 예약된 공간으로 둡니다.
            </Typography>
          </Box>
        )}

        {section === 'debut' && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 3, mb: 2 }}>
            <Typography variant="h2" sx={{ fontSize: 17, mb: 1 }}>데뷔 회의실</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              데뷔 목표와 팀 편성은 후속 기획에서 확장합니다. 지금은 대표 무대 placeholder로 이동해 데뷔 route 흐름을 확인할 수 있어요.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button variant="contained" onClick={() => navigate('/stage')}>대표 무대 열기</Button>
              <Button variant="outlined" onClick={() => navigate('/island/lodge/myroom/collection')}>마이룸 콜렉션</Button>
            </Stack>
          </Box>
        )}

        {section === 'myroom' && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 3, mb: 2 }}>
            <Typography variant="h2" sx={{ fontSize: 17, mb: 1 }}>마이룸</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              유저 정보, Aidong 목록, 도감, 콜렉션, 장부를 모아 보는 공간입니다. 9번 작업에서 route와 aggregation shell을 연결합니다.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/island/lodge/myroom/info')}>마이룸 열기</Button>
          </Box>
        )}

        {(section === 'rooms' || section === 'decor') && (
          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 2, mb: 2 }}>
          {roomOptions.map((room) => {
            const isSelected = selectedRoom?.roomId === room.roomId
            const roomUnavailable = room.characterId ? unavailableAidongs.has(room.characterId) : false
            const charNeeds = room.characterId ? needs[room.characterId] ?? INITIAL_NEEDS : null
            const score = charNeeds ? calcMoodScore(charNeeds) : 0
            const mood = charNeeds ? moodFromScore(score, curZone === 4) : null
            const exp = mood ? moodToExpression(mood) : undefined

            return (
              <Box
                key={room.roomId}
                onClick={() => setSelectedRoomId(room.roomId)}
                sx={{
                  minWidth: 156,
                  bgcolor: isSelected ? 'action.selected' : 'background.paper',
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 1,
                  textAlign: 'center',
                  cursor: 'pointer',
                  flex: '0 0 auto',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700 }}>
                  {room.label}
                </Typography>
                {room.characterId ? (
                  <>
                    <AidongSprite
                      character={room.characterId}
                      expression={exp}
                      outfit={equippedOutfit[room.characterId]}
                      size={112}
                    />
                    {mood && <Chip label={mood} size="small" sx={{ mt: 0.5, fontSize: 10 }} />}
                    {roomUnavailable && (
                      <Chip
                        label={sailingAidongs.has(room.characterId) ? '항해 중' : '항구 지원'}
                        size="small"
                        color="warning"
                        sx={{ mt: 0.5, ml: 0.5, fontSize: 10 }}
                      />
                    )}
                  </>
                ) : (
                  <Box
                    sx={{
                      height: 124,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 247, 232, 0.85)',
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      비어 있음
                    </Typography>
                  </Box>
                )}
              </Box>
            )
          })}
        </Stack>
        )}

        {(section === 'rooms' || section === 'decor') && (!selectedRoom ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ mb: 2 }}>아직 열 수 있는 방이 없어요.</Typography>
            <Button onClick={() => navigate('/island/harbor')} variant="contained">
              항구로 가기
            </Button>
          </Box>
        ) : (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 2 }}>
            {selectedUnavailable && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedChar}은 지금 {selectedChar && sailingAidongs.has(selectedChar) ? '항해 중' : '항구 지원 배치 중'}이라
                이 방은 꾸밀 수 있지만 Aidong 관리 액션은 사용할 수 없어요.
              </Alert>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="h2" sx={{ fontSize: 17 }}>
                  {selectedRoom.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  배치된 가구 {selectedRoomFurniture.length}개
                </Typography>
              </Box>
              <Button
                size="small"
                variant="contained"
                disabled={!selectedChar || selectedUnavailable}
                onClick={() => selectedChar && setCareTarget(selectedChar)}
              >
                케어 메뉴
              </Button>
            </Stack>

            {section === 'rooms' && (
              <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 1 }}>
                <Tab value="rooms" label="방" />
                <Tab value="outfit" label="옷" disabled={!selectedChar || selectedUnavailable} />
                <Tab value="food" label="밥" disabled={!selectedChar || selectedUnavailable} />
              </Tabs>
            )}

            {section === 'decor' && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                빈 방과 Aidong의 방 모두 꾸밀 수 있어요. 가구 구매와 배치는 lodge 전용 API로 저장됩니다.
              </Typography>
            )}

            {section === 'rooms' && tab === 'rooms' && selectedChar && (
              <Box>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', gap: 2 }}>
                  <AidongSprite
                    character={selectedChar}
                    expression={selectedExpression}
                    outfit={equippedOutfit[selectedChar]}
                    size={132}
                  />
                  <Box sx={{ flex: '1 1 240px' }}>
                    <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{selectedChar} 육성 슬롯</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      이 방은 밥주기, 케어, 옷입히기 같은 적극 육성 액션을 모아두는 곳입니다.
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {selectedMood && <Chip label={`기분 ${selectedMood}`} size="small" color="primary" variant="outlined" />}
                      {selectedNeeds && Object.entries(selectedNeeds).map(([key, value]) => (
                        <Chip key={key} label={`${key} ${value}`} size="small" />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            )}

            {section === 'rooms' && tab === 'rooms' && !selectedChar && (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography>빈 방은 꾸미기 메뉴에서 가구를 배치할 수 있어요.</Typography>
              </Box>
            )}

            {section === 'decor' && (
              <Box>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {selectedRoomFurniture.length > 0 ? selectedRoomFurniture.map((itemId) => (
                    <Chip key={itemId} label={getFurnitureLabel(furnitureItems, itemId)} size="small" />
                  )) : (
                    <Chip label="아직 배치된 가구가 없어요" size="small" variant="outlined" />
                  )}
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(108px, 1fr))', gap: 1 }}>
                  {furnitureItems.map((item) => {
                    const placed = selectedRoomFurniture.includes(item.itemId)
                    const owned = (lodgeFurniture[item.itemId] ?? 0) + item.defaultOwned
                    const available = owned - countPlacedFurniture(lodgeRooms, item.itemId, selectedRoom.roomId)
                    const canBuy = item.cost > 0 && coins >= item.cost

                    return (
                      <Box
                        key={item.itemId}
                        sx={{
                          textAlign: 'center',
                          p: 1,
                          border: '1px solid',
                          borderColor: placed ? 'primary.main' : 'divider',
                          borderRadius: 1.5,
                          bgcolor: placed ? 'rgba(255, 247, 232, 0.8)' : 'background.default',
                        }}
                      >
                        <Box
                          sx={{
                            mx: 'auto',
                            mb: 0.75,
                            width: 42,
                            height: 42,
                            borderRadius: 2,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: 'rgba(255, 230, 190, 0.85)',
                            fontWeight: 800,
                          }}
                        >
                          {FURNITURE_MARKS[item.itemId] ?? item.label.slice(0, 1)}
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.75 }}>
                          보유 {owned} / 여유 {Math.max(available, 0)}
                        </Typography>
                        {placed ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={lodgeDecorLoading}
                            onClick={() => toggleRoomFurniture(selectedRoom.roomId, item.itemId)}
                          >
                            해제
                          </Button>
                        ) : owned <= 0 ? (
                          <Button
                            size="small"
                            disabled={lodgeDecorLoading || !canBuy}
                            onClick={() => purchaseFurniture(item.itemId)}
                          >
                            {item.cost}코인 구매
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={lodgeDecorLoading || available <= 0}
                            onClick={() => toggleRoomFurniture(selectedRoom.roomId, item.itemId)}
                          >
                            배치
                          </Button>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )}

            {tab === 'outfit' && selectedChar && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                  착용 아이템은 전역 보관소에서 사용해요.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 1 }}>
                  {OUTFIT_OPTIONS.map((option) => {
                    const isOn = (equippedOutfit[selectedChar] ?? 'none') === option.id
                    return (
                      <Button
                        key={option.id}
                        variant={isOn ? 'contained' : 'outlined'}
                        onClick={() => onSetOutfit(selectedChar, option.id)}
                        sx={{ flexDirection: 'column', py: 1 }}
                      >
                        <Box sx={{ fontSize: 24 }}>{option.emoji}</Box>
                        <Typography variant="caption" sx={{ fontSize: 11 }}>{option.label}</Typography>
                      </Button>
                    )
                  })}
                </Box>

                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 2, mb: 1 }}>
                  전역 보관소 아이템
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(108px, 1fr))', gap: 1 }}>
                  {AIDONG_ITEMS.map((item) => {
                    const owned = inventory[item.id] ?? 0
                    const isEquipped = (equippedItems[selectedChar] ?? []).includes(item.id)
                    return (
                      <Button
                        key={item.id}
                        variant={isEquipped ? 'contained' : 'outlined'}
                        onClick={() => onToggleAidongItem(selectedChar, item.id)}
                        disabled={!isEquipped && owned <= 0}
                        sx={{ flexDirection: 'column', py: 1 }}
                      >
                        <Box sx={{ fontSize: 24 }}>{item.mark}</Box>
                        <Typography variant="caption" sx={{ fontSize: 11 }}>{item.label}</Typography>
                        <Typography variant="caption" sx={{ fontSize: 10 }}>보유 {owned}</Typography>
                      </Button>
                    )
                  })}
                </Box>
              </Box>
            )}

            {tab === 'food' && selectedChar && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                  보유 코인 {coins} / 현재 시간대 {['휴식', '아침', '점심', '저녁', '밤'][curZone]}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 1 }}>
                  {FOODS.map((food) => (
                    <Button
                      key={food.id}
                      variant="outlined"
                      onClick={() => onFeed(selectedChar, food)}
                      disabled={coins < food.cost}
                      sx={{ flexDirection: 'column', py: 1 }}
                    >
                      <Box sx={{ fontSize: 24 }}>{food.mark}</Box>
                      <Typography variant="caption">{food.label}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 10 }}>{food.cost}코인</Typography>
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        ))}
      </GameStage>

      <Dialog
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        PaperProps={{
          sx: {
            width: 'min(560px, calc(100vw - 32px))',
            m: 2,
          },
        }}
      >
        <DialogTitle>숙소 인벤토리</DialogTitle>
        <DialogContent sx={{ maxHeight: 'min(62vh, 520px)', overflowY: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>보관 중인 자원</Typography>
          <Box sx={{ mb: 2 }}>{renderInventoryList(lodgeInventory)}</Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            배에서 내린 자원과 숙소 보관 대상 아이템이 여기에 모입니다.
            Phase 1에서는 세관 없이 통 인벤토리와 전용 action API 중심으로 정리할 예정입니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          {CUSTOMS_UI_ENABLED && hasLodgeInventory && (
            <Button
              variant="contained"
              onClick={() => {
                setInventoryOpen(false)
                setLodgeCustomsOpen(true)
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
          open={lodgeCustomsOpen}
          sourceModule="lodge"
          onClose={() => {
            setLodgeCustomsOpen(false)
            void loadLodgeState()
          }}
        />
      )}

      <CareModal character={careTarget} onClose={() => setCareTarget(null)} />
    </Box>
  )
}
