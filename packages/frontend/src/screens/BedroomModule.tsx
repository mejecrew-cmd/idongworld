import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from '@/components/AidongSprite'
import type { AidongItemConfig, DecorItemConfig } from '@/lib/api'
import {
  BEDROOM_TEXT_IDS,
  createBedroomTextResolver,
  type BedroomTextTable,
} from '@/data/bedroomTexts'

type BedroomView = 'slots' | 'room' | 'decor' | 'outfit'
type BedroomItemKind = 'decor' | 'outfit'
type BedroomItem = {
  id: string
  name: string
  kind: BedroomItemKind
  category: string
  source: 'mock' | 'live'
  visual: string
  asset?: string
  price?: number
  description: string
}

type BedroomSlotConfig = {
  slotId: string
  requiredBedroomLevel: number
}

type TextBackedFields = {
  nameTextId?: string
  labelTextId?: string
  descriptionTextId?: string
  visualTextId?: string
}

type TextBackedDecorItemConfig = DecorItemConfig & TextBackedFields
type TextBackedAidongItemConfig = AidongItemConfig & TextBackedFields

type BedroomTextResolver = ReturnType<typeof createBedroomTextResolver>

const resolveIndexedText = (
  text: BedroomTextResolver,
  textId: string | undefined,
  fallback: string | undefined,
) => (textId ? text(textId) : (fallback ?? ''))

const createMockOutfitDataItems = (text: BedroomTextResolver): BedroomItem[] => [
  {
    id: 'temp-hoodie',
    name: text(BEDROOM_TEXT_IDS.outfitHoodieName),
    kind: 'outfit',
    category: 'top',
    source: 'mock',
    visual: text(BEDROOM_TEXT_IDS.outfitHoodieVisual),
    asset: '/assets/aidong/99_Resources/01_Clothes/00_Top/T_Top01.png',
    description: text(BEDROOM_TEXT_IDS.outfitMockDescription),
  },
  {
    id: 'temp-jeans',
    name: text(BEDROOM_TEXT_IDS.outfitJeansName),
    kind: 'outfit',
    category: 'bottom',
    source: 'mock',
    visual: text(BEDROOM_TEXT_IDS.outfitJeansVisual),
    asset: '/assets/aidong/99_Resources/01_Clothes/01_Bottom/B_Pants01.png',
    description: text(BEDROOM_TEXT_IDS.outfitMockDescription),
  },
  {
    id: 'none',
    name: text(BEDROOM_TEXT_IDS.outfitNoneName),
    kind: 'outfit',
    category: 'all',
    source: 'live',
    visual: text(BEDROOM_TEXT_IDS.outfitNoneVisual),
    description: text(BEDROOM_TEXT_IDS.outfitNoneDescription),
  },
]

interface BedroomModuleProps {
  open: boolean
  onClose: () => void
  recruitedAidongs: AidongCharacterId[]
  equippedOutfit: Record<string, string>
  equippedItems: Record<string, string[]>
  inventory: Record<string, number>
  furnitureItems: TextBackedDecorItemConfig[]
  aidongItems: TextBackedAidongItemConfig[]
  aidongLocations: Record<string, string>
  aidongLevels: Record<string, number>
  bedroomLevel?: number
  textTable?: BedroomTextTable
}

const STAGE_WIDTH = 1180
const TOP_SAFE = 132
const ROOM_BG = '/assets/backgrounds/03_Home_04.png'
const ROOM_FALLBACK_BG = '/assets/backgrounds/03_Home_05.png'
const HOME_UI = '/assets/ui/home'
const COMMON_UI = '/assets/ui/common'

const BEDROOM_ASSETS = {
  back: `${COMMON_UI}/BtnBack.png`,
  close: `${COMMON_UI}/BtnPopupClose.png`,
  priceBox: `${COMMON_UI}/PriceBox01.png`,
  camera: `${HOME_UI}/BtnCamera.png`,
  gold: '/assets/ui/main/IconGold.png',
  levelTag: `${HOME_UI}/TagLevel.png`,
  aidongSlot: `${HOME_UI}/IdongListSlot01.png`,
  itemSlot: `${HOME_UI}/ItemSlotList.png`,
  itemSlotSelected: `${HOME_UI}/ItemSlotListSelect.png`,
  popup: `${HOME_UI}/PopupBgItemInfo.png`,
  idongListPopup: `${HOME_UI}/PopupBgIdongList.png`,
} as const

const BEDROOM_SLOT_CONFIGS: BedroomSlotConfig[] = [
  { slotId: 'bedroom-slot-1', requiredBedroomLevel: 1 },
  { slotId: 'bedroom-slot-2', requiredBedroomLevel: 1 },
  { slotId: 'bedroom-slot-3', requiredBedroomLevel: 2 },
  { slotId: 'bedroom-slot-4', requiredBedroomLevel: 3 },
  { slotId: 'bedroom-slot-5', requiredBedroomLevel: 4 },
  { slotId: 'bedroom-slot-6', requiredBedroomLevel: 5 },
]

const imageBackground = (src: string) => ({
  backgroundImage: `url(${src})`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
})

const DECOR_CATEGORIES = [
  { id: 'all', labelTextId: BEDROOM_TEXT_IDS.categoryAll, asset: `${HOME_UI}/Tap01_0` },
  { id: 'bed', labelTextId: BEDROOM_TEXT_IDS.categoryBed, asset: `${HOME_UI}/Tap01_1` },
  { id: 'chair', labelTextId: BEDROOM_TEXT_IDS.categoryChair, asset: `${HOME_UI}/Tap01_2` },
  { id: 'table', labelTextId: BEDROOM_TEXT_IDS.categoryTable, asset: `${HOME_UI}/Tap01_3` },
  { id: 'wall', labelTextId: BEDROOM_TEXT_IDS.categoryWall, asset: `${HOME_UI}/Tap01_4` },
  { id: 'plant', labelTextId: BEDROOM_TEXT_IDS.categoryPlant, asset: `${HOME_UI}/Tap01_5` },
]

const OUTFIT_CATEGORIES = [
  { id: 'all', labelTextId: BEDROOM_TEXT_IDS.categoryAll, asset: `${HOME_UI}/Tap02_0` },
  { id: 'top', labelTextId: BEDROOM_TEXT_IDS.categoryTop, asset: `${HOME_UI}/Tap02_1` },
  { id: 'bottom', labelTextId: BEDROOM_TEXT_IDS.categoryBottom, asset: `${HOME_UI}/Tap02_2` },
  { id: 'hat', labelTextId: BEDROOM_TEXT_IDS.categoryHat, asset: `${HOME_UI}/Tap02_3` },
  { id: 'shoes', labelTextId: BEDROOM_TEXT_IDS.categoryShoes, asset: `${HOME_UI}/Tap02_4` },
]

const toPublicAssetPath = (assetPath?: string) => {
  const trimmed = assetPath?.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('/')) return trimmed
  return `/${trimmed}`
}

const categoryFromDecor = (item: DecorItemConfig) => {
  if (item.category) return item.category
  if (item.itemId.includes('bed')) return 'bed'
  if (item.itemId.includes('chair')) return 'chair'
  if (item.itemId.includes('plant')) return 'plant'
  if (item.itemId.includes('rug')) return 'table'
  return 'table'
}

const categoryFromAidongItem = (item: AidongItemConfig) => {
  if (item.category && OUTFIT_CATEGORIES.some((category) => category.id === item.category)) return item.category
  if (item.itemId.includes('bottom') || item.itemId.includes('pants')) return 'bottom'
  if (item.itemId.includes('shoe')) return 'shoes'
  if (item.itemId.includes('hat') || item.itemId.includes('ribbon')) return 'hat'
  return 'top'
}

const ItemVisual = ({ item, large = false }: { item: BedroomItem; large?: boolean }) => {
  const [missing, setMissing] = useState(false)
  if (item.asset && !missing) {
    return (
      <Box
        component="img"
        src={item.asset}
        alt=""
        onError={() => setMissing(true)}
        sx={{ maxWidth: large ? '86%' : '88%', maxHeight: large ? '86%' : '88%', objectFit: 'contain' }}
      />
    )
  }
  return <>{item.visual}</>
}

export const BedroomModule = ({ open, onClose, recruitedAidongs, equippedOutfit, equippedItems, inventory, furnitureItems, aidongItems, aidongLocations, aidongLevels, bedroomLevel = 1, textTable }: BedroomModuleProps) => {
  const [view, setView] = useState<BedroomView>('slots')
  const [selectedAidong, setSelectedAidong] = useState<AidongCharacterId | null>(null)
  const [bedroomSlots, setBedroomSlots] = useState<Array<AidongCharacterId | null>>([null, null])
  const [placementSlot, setPlacementSlot] = useState<number | null>(null)
  const [decorCategory, setDecorCategory] = useState('all')
  const [outfitCategory, setOutfitCategory] = useState('all')
  const [itemDetail, setItemDetail] = useState<BedroomItem | null>(null)
  const [previewOutfitItems, setPreviewOutfitItems] = useState<Record<string, string[]>>({})
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const text = useMemo(() => createBedroomTextResolver(textTable), [textTable])

  const unlockedBedroomSlots = useMemo(
    () => BEDROOM_SLOT_CONFIGS.filter((slot) => slot.requiredBedroomLevel <= bedroomLevel),
    [bedroomLevel],
  )
  const unlockedSlotCount = Math.max(1, unlockedBedroomSlots.length)
  const mockOutfitDataItems = useMemo(() => createMockOutfitDataItems(text), [text])
  const placedAidongs = useMemo(
    () => new Set(bedroomSlots.slice(0, unlockedSlotCount).filter(Boolean) as AidongCharacterId[]),
    [bedroomSlots, unlockedSlotCount],
  )
  const availableAidongs = useMemo(
    () => recruitedAidongs.filter((characterId) => !placedAidongs.has(characterId)),
    [placedAidongs, recruitedAidongs],
  )
  const currentAidong = selectedAidong

  useEffect(() => {
    setBedroomSlots((prev) => {
      if (prev.length === unlockedSlotCount) return prev
      return Array.from({ length: unlockedSlotCount }, (_, index) => prev[index] ?? null)
    })
  }, [unlockedSlotCount])
  const decorItems = useMemo(() => furnitureItems.map((item): BedroomItem => {
    const name = resolveIndexedText(text, item.labelTextId ?? item.nameTextId, item.label)
    const description = resolveIndexedText(text, item.descriptionTextId, item.description ?? name)
    return {
      id: item.itemId,
      name,
      kind: 'decor',
      category: categoryFromDecor(item),
      source: 'live',
      visual: resolveIndexedText(text, item.visualTextId, name),
      asset: toPublicAssetPath(item.assetPath),
      price: item.cost > 0 ? item.cost : undefined,
      description,
    }
  }).filter((item) => decorCategory === 'all' || item.category === decorCategory), [decorCategory, furnitureItems, text])
  const outfitItems = useMemo(() => [
    ...mockOutfitDataItems,
    ...aidongItems
      .filter((item) => item.kind === 'aidong-item' && item.scope === 'aidong-global')
      .filter((item) => (inventory[item.itemId] ?? 0) > 0 || recruitedAidongs.some((characterId) => (equippedItems[characterId] ?? []).includes(item.itemId)))
      .map((item): BedroomItem => {
        const name = resolveIndexedText(text, item.nameTextId ?? item.labelTextId, item.name)
        return {
          id: item.itemId,
          name,
          kind: 'outfit',
          category: categoryFromAidongItem(item),
          source: 'live',
          visual: resolveIndexedText(text, item.visualTextId, name),
          asset: toPublicAssetPath(item.assetPath),
          price: item.price && item.price > 0 ? item.price : undefined,
          description: resolveIndexedText(text, item.descriptionTextId, item.description),
        }
      }),
  ].filter((item) => outfitCategory === 'all' || item.category === outfitCategory), [aidongItems, equippedItems, inventory, mockOutfitDataItems, outfitCategory, recruitedAidongs, text])

  if (!open) return null

  const goBack = () => {
    if (view === 'slots') onClose()
    else if (view === 'room') setView('slots')
    else setView('room')
  }

  const placeAidong = (characterId: AidongCharacterId) => {
    if (placementSlot === null) return
    setBedroomSlots((prev) => {
      const next = [...prev]
      next[placementSlot] = characterId
      return next
    })
    setPlacementSlot(null)
  }

  const levelLabel = (characterId: AidongCharacterId) => text(BEDROOM_TEXT_IDS.levelLabel, { level: aidongLevels[characterId] ?? 1 })

  const getItemEquippedBy = (item: BedroomItem): AidongCharacterId | undefined => {
    if (item.kind === 'outfit') {
      return recruitedAidongs.find((characterId) => getCurrentOutfitItems(characterId).includes(item.id))
    }
    return recruitedAidongs.find((characterId) => (equippedItems[characterId] ?? []).includes(item.id))
  }

  const getCurrentOutfitItems = (characterId: AidongCharacterId) => previewOutfitItems[characterId] ?? []

  const applyPreviewOutfit = (item: BedroomItem) => {
    if (!currentAidong || item.kind !== 'outfit') return
    setPreviewOutfitItems((prev) => {
      if (item.id === 'none') return { ...prev, [currentAidong]: [] }
      const currentItems = prev[currentAidong] ?? []
      const nextItems = [
        ...currentItems.filter((itemId) => {
          const existing = mockOutfitDataItems.find((entry) => entry.id === itemId)
          return existing?.category !== item.category
        }),
        item.id,
      ]
      return { ...prev, [currentAidong]: nextItems }
    })
    setItemDetail(null)
  }

  const openPlacedAidong = (characterId: AidongCharacterId) => {
    setSelectedAidong(characterId)
    setView('room')
  }

  const openMobileCamera = () => {
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    if (!isMobile) {
      alert(text(BEDROOM_TEXT_IDS.cameraMobileOnly))
      return
    }
    cameraInputRef.current?.click()
  }

  const renderBack = () => (
    <Button
      onClick={goBack}
      aria-label={text(BEDROOM_TEXT_IDS.actionBack)}
      sx={{
        position: 'absolute',
        top: TOP_SAFE,
        left: 0,
        zIndex: 20,
        minWidth: 0,
        width: 44,
        height: 54,
        borderRadius: '0 12px 12px 0',
        bgcolor: 'transparent',
        ...imageBackground(BEDROOM_ASSETS.back),
        '&:hover': { filter: 'brightness(1.03)' },
      }}
    />
  )

  const renderAidongBadge = (characterId: AidongCharacterId) => (
    <Box sx={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid #a98f76', bgcolor: '#fff', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <AidongSprite character={characterId} expression="happy" size={36} />
    </Box>
  )

  const renderFade = (height = 230) => (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        zIndex: 1,
        background: 'linear-gradient(180deg, rgba(246,236,218,0) 0%, rgba(246,236,218,0.92) 55%, rgba(246,236,218,0.98) 100%)',
        pointerEvents: 'none',
      }}
    />
  )

  const renderCatalog = (kind: BedroomItemKind) => {
    const categories = kind === 'decor' ? DECOR_CATEGORIES : OUTFIT_CATEGORIES
    const activeCategory = kind === 'decor' ? decorCategory : outfitCategory
    const items = kind === 'decor' ? decorItems : outfitItems

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f1e1cb' }}>
        <Box sx={{ position: 'relative', height: kind === 'decor' ? '34%' : '50%', flex: '0 0 auto', backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: 'cover', backgroundPosition: 'center top', overflow: 'hidden' }}>
          {renderBack()}
          {renderFade(kind === 'decor' ? 120 : 180)}
          {kind === 'outfit' && currentAidong && (
            <Box sx={{ position: 'absolute', left: '50%', bottom: -4, transform: 'translateX(-50%)', zIndex: 2 }}>
              <AidongSprite character={currentAidong} expression="happy" outfit={equippedOutfit[currentAidong]} outfitItems={getCurrentOutfitItems(currentAidong)} size={300} />
            </Box>
          )}
        </Box>

        <Box sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', bgcolor: '#f1e1cb' }}>
          <Stack direction="row" spacing={1} sx={{ height: 60, alignItems: 'center', justifyContent: 'center', px: 1.1, borderBottom: '1px solid rgba(139,104,72,0.14)', bgcolor: 'rgba(250,238,220,0.96)', overflowX: 'auto', overflowY: 'hidden' }}>
            {categories.map((category) => {
              const active = activeCategory === category.id
              const label = text(category.labelTextId)
              return (
                <Button
                  key={category.id}
                  aria-label={label}
                  onClick={() => (kind === 'decor' ? setDecorCategory(category.id) : setOutfitCategory(category.id))}
                  sx={{ flex: '0 0 auto', minWidth: 0, width: category.id === 'all' ? 58 : 48, height: 40, p: 0, borderRadius: 2, bgcolor: 'transparent', overflow: 'hidden', '&:hover': { filter: 'brightness(1.03)' } }}
                >
                  <Box component="img" src={`${category.asset}_${active ? 'On' : 'Off'}.png`} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </Button>
              )
            })}
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 136px))', justifyContent: 'center', columnGap: { xs: 1.1, sm: 1.5 }, rowGap: { xs: 2.1, sm: 2.4 }, p: { xs: 1.2, sm: 1.5 }, pb: 5, alignItems: 'start' }}>
            {items.map((item) => {
              const equippedBy = getItemEquippedBy(item)
              return (
                <Box key={item.id} component="button" type="button" onClick={() => setItemDetail(item)} sx={{ position: 'relative', border: 0, borderRadius: 2, bgcolor: 'transparent', aspectRatio: '1 / 1', width: '100%', p: 0, boxShadow: 'none', cursor: 'pointer', overflow: 'visible' }}>
                  <Box component="img" src={equippedBy ? BEDROOM_ASSETS.itemSlotSelected : BEDROOM_ASSETS.itemSlot} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                  {equippedBy && <Box sx={{ position: 'absolute', top: -7, right: -7 }}>{renderAidongBadge(equippedBy)}</Box>}
                  <Box sx={{ position: 'absolute', zIndex: 1, left: '14%', right: '14%', top: '14%', bottom: '25%', display: 'grid', placeItems: 'center', color: '#795f51', fontWeight: 900, fontSize: { xs: 18, sm: 22 }, overflow: 'hidden' }}>
                    <ItemVisual item={item} />
                  </Box>
                  {item.price ? (
                    <Box sx={{ position: 'absolute', zIndex: 2, left: '50%', bottom: { xs: -8, sm: -9 }, transform: 'translateX(-50%)', width: '76%', aspectRatio: '228 / 80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.35, color: '#5f5149', fontWeight: 900, fontSize: { xs: 11, sm: 13 }, lineHeight: 1 }}>
                      <Box component="img" src={BEDROOM_ASSETS.priceBox} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                      <Box component="img" src={BEDROOM_ASSETS.gold} alt="" sx={{ position: 'relative', zIndex: 1, width: { xs: 14, sm: 16 }, height: { xs: 14, sm: 16 }, flex: '0 0 auto' }} />
                      <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>{item.price.toLocaleString()}</Box>
                    </Box>
                  ) : (
                    <Box sx={{ position: 'absolute', zIndex: 2, left: '50%', bottom: { xs: -8, sm: -9 }, transform: 'translateX(-50%)', width: '76%', aspectRatio: '228 / 80', display: 'grid', placeItems: 'center', color: '#5f5149', fontWeight: 900, fontSize: { xs: 11, sm: 13 }, lineHeight: 1 }}>
                      <Box component="img" src={BEDROOM_ASSETS.priceBox} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                      <Box component="span" sx={{ position: 'relative', zIndex: 1, maxWidth: '78%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Box>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 220, width: '100vw', height: '100dvh', overflow: 'hidden', bgcolor: '#f3e4cf', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: `min(100vw, ${STAGE_WIDTH}px)`, height: '100dvh', position: 'relative', overflow: 'hidden', bgcolor: '#f3e4cf' }}>
        {view === 'slots' && (
          <Box sx={{ height: '100%', position: 'relative', overflow: 'hidden', bgcolor: '#f3e4cf' }}>
            <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.26 }} />
            {renderFade(360)}
            {renderBack()}
            <Box sx={{ position: 'relative', zIndex: 2, height: '100%', pt: { xs: 23, sm: 25 }, px: { xs: 2, sm: 6 }, overflowY: 'auto', overflowX: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 220px))', gridAutoRows: { xs: 240, sm: 278 }, justifyContent: 'center', alignItems: 'start', gap: { xs: 2, sm: 4 }, pb: 8 }}>
                {unlockedBedroomSlots.map((slot, index) => {
                  const characterId = bedroomSlots[index] ?? null
                  return (
                  <Box key={slot.slotId} sx={{ width: { xs: 190, sm: 220 } }}>
                    <Box
                      component={characterId ? 'button' : 'div'}
                      type={characterId ? 'button' : undefined}
                      onClick={() => characterId && openPlacedAidong(characterId)}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        height: { xs: 240, sm: 278 },
                        border: 0,
                        borderRadius: 5,
                        bgcolor: 'transparent',
                        overflow: 'hidden',
                        p: 0,
                        cursor: characterId ? 'pointer' : 'default',
                        ...imageBackground(BEDROOM_ASSETS.aidongSlot),
                      }}
                    >
                      {characterId ? (
                        <>
                          <Box sx={{ position: 'absolute', top: 2, right: 18, zIndex: 5, minWidth: 52, height: 28, px: 1.2, color: '#fff', fontWeight: 900, fontSize: 14, lineHeight: '28px', textAlign: 'center', letterSpacing: 0, ...imageBackground(BEDROOM_ASSETS.levelTag) }}>
                            {levelLabel(characterId)}
                          </Box>
                          <Box sx={{ position: 'absolute', left: '9.5%', right: '9.5%', top: { xs: 12, sm: 14 }, zIndex: 1, height: { xs: 160, sm: 186 }, borderRadius: 4, overflow: 'hidden', display: 'grid', placeItems: 'center', backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: '230%', backgroundPosition: 'center 18%' }}>
                            <AidongSprite character={characterId} expression="happy" outfit={equippedOutfit[characterId]} outfitItems={getCurrentOutfitItems(characterId)} size={150} />
                          </Box>
                          <Typography sx={{ position: 'absolute', left: '10%', right: '10%', bottom: { xs: 32, sm: 38 }, zIndex: 2, color: '#5b4540', fontWeight: 900, fontSize: { xs: 19, sm: 21 }, lineHeight: 1.15, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {text(BEDROOM_TEXT_IDS.aidongNamePlaceholder)}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Button variant="contained" onClick={() => setPlacementSlot(index)} sx={{ position: 'absolute', left: '50%', bottom: { xs: 26, sm: 30 }, zIndex: 2, transform: 'translateX(-50%)', width: '72%', height: { xs: 44, sm: 48 }, bgcolor: '#f27f86', borderRadius: 4, fontSize: { xs: 19, sm: 21 }, fontWeight: 900, boxShadow: '0 5px 10px rgba(137,73,78,0.2)', '&:hover': { bgcolor: '#ec747d' } }}>
                            {text(BEDROOM_TEXT_IDS.actionPlace)}
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>
                  )
                })}
              </Box>
            </Box>
          </Box>
        )}

        {view === 'room' && currentAidong && (
          <Box sx={{ height: '100%', position: 'relative', overflow: 'hidden', backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,216,206,0.24) 0%, rgba(255,255,255,0) 42%, rgba(73,54,39,0.58) 100%)' }} />
            {renderFade(250)}
            {renderBack()}
            <Typography sx={{ position: 'absolute', top: TOP_SAFE + 12, left: 56, zIndex: 3, color: '#5a4640', fontWeight: 900, fontSize: 18 }}>
              {text(BEDROOM_TEXT_IDS.aidongRoomTitle, { name: text(BEDROOM_TEXT_IDS.aidongNamePlaceholder) })}
            </Typography>
            <Button onClick={() => setView('slots')} sx={{ position: 'absolute', top: TOP_SAFE - 2, right: 14, zIndex: 3, bgcolor: 'rgba(255,255,255,0.92)', color: '#9b5a55', borderRadius: 3, px: 2, py: 1, fontWeight: 900, '&:hover': { bgcolor: '#fff' } }}>
              {text(BEDROOM_TEXT_IDS.actionChangeAidong)}
            </Button>
            <Box sx={{ position: 'absolute', left: '50%', top: '51%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
              <AidongSprite character={currentAidong} expression="happy" outfit={equippedOutfit[currentAidong]} outfitItems={getCurrentOutfitItems(currentAidong)} size={330} />
            </Box>
            <Stack direction="row" spacing={2} sx={{ position: 'absolute', left: 54, right: 54, bottom: 124, zIndex: 3 }}>
              <Button fullWidth variant="contained" onClick={() => setView('decor')} sx={{ height: 64, bgcolor: '#f28288', borderRadius: 3, fontSize: 18, fontWeight: 900, '&:hover': { bgcolor: '#ec747d' } }}>
                {text(BEDROOM_TEXT_IDS.actionDecorateRoom)}
              </Button>
              <Button fullWidth variant="contained" onClick={() => setView('outfit')} sx={{ height: 64, bgcolor: '#f28288', borderRadius: 3, fontSize: 18, fontWeight: 900, '&:hover': { bgcolor: '#ec747d' } }}>
                {text(BEDROOM_TEXT_IDS.actionDressAidong)}
              </Button>
            </Stack>
            <Button onClick={openMobileCamera} aria-label={text(BEDROOM_TEXT_IDS.actionCamera)} sx={{ position: 'absolute', left: '50%', bottom: 34, transform: 'translateX(-50%)', zIndex: 3, minWidth: 0, width: 74, height: 74, borderRadius: '50%', bgcolor: 'transparent', ...imageBackground(BEDROOM_ASSETS.camera), '&:hover': { filter: 'brightness(1.04)' } }} />
            <Box
              component="input"
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              sx={{ display: 'none' }}
            />
          </Box>
        )}

        {view === 'decor' && renderCatalog('decor')}
        {view === 'outfit' && renderCatalog('outfit')}
      </Box>

      <Dialog
        open={placementSlot !== null}
        onClose={() => setPlacementSlot(null)}
        maxWidth="xs"
        fullWidth
        disableScrollLock
        PaperProps={{
          sx: {
            width: 'min(484px, calc(100vw - 16px))',
            aspectRatio: '1054 / 1364',
            m: 1,
            overflow: 'visible',
            bgcolor: 'transparent',
            boxShadow: 'none',
            ...imageBackground(BEDROOM_ASSETS.idongListPopup),
          },
        }}
      >
        <DialogContent sx={{ p: 0, overflow: 'visible' }}>
          <Typography sx={{ height: 76, display: 'grid', placeItems: 'center', color: '#51433f', fontWeight: 900, fontSize: 24, letterSpacing: 0 }}>
            {text(BEDROOM_TEXT_IDS.ownedAidongListTitle)}
          </Typography>
          <Box
            sx={{
              mx: 3.2,
              height: 'min(492px, calc(100dvh - 318px))',
              minHeight: 278,
              overflowY: 'auto',
              bgcolor: 'rgba(216,201,184,0.72)',
              borderRadius: 2.4,
              p: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1.3,
              alignContent: 'start',
            }}
          >
            {availableAidongs.length === 0 ? (
              <Box sx={{ gridColumn: '1 / -1', height: 216, borderRadius: 2.2, bgcolor: 'rgba(255,253,250,0.86)', display: 'grid', placeItems: 'center', color: '#6d4f49', fontWeight: 900, textAlign: 'center', px: 2 }}>
                {text(BEDROOM_TEXT_IDS.noAvailableAidong)}
              </Box>
            ) : availableAidongs.map((characterId) => {
              const yardLocationLabel = text(BEDROOM_TEXT_IDS.yardLocation)
              const locationLabel = aidongLocations[characterId] ?? yardLocationLabel
              const isYard = locationLabel === yardLocationLabel
              return (
              <Box
                key={characterId}
                component="button"
                type="button"
                onClick={() => placeAidong(characterId)}
                sx={{
                  position: 'relative',
                  height: 216,
                  border: 0,
                  borderRadius: 2.2,
                  bgcolor: '#fffdfa',
                  p: 1,
                  boxShadow: '0 5px 10px rgba(78,58,46,0.18)',
                  cursor: 'pointer',
                  color: '#51433f',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 8, minWidth: 48, height: 24, px: 0.9, borderRadius: '0 0 8px 8px', bgcolor: '#f3868d', color: '#fff', fontWeight: 900, fontSize: 12, lineHeight: '24px', textAlign: 'center', letterSpacing: 0, boxShadow: '0 2px 6px rgba(78,58,46,0.24)' }}>
                  {levelLabel(characterId)}
                </Box>
                <Box sx={{ height: 148, borderRadius: 1.8, bgcolor: '#efe0ce', overflow: 'hidden', display: 'grid', placeItems: 'center', backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: '230%', backgroundPosition: 'center 18%' }}>
                  <AidongSprite character={characterId} expression="happy" outfit={equippedOutfit[characterId]} outfitItems={getCurrentOutfitItems(characterId)} size={138} />
                </Box>
                <Typography sx={{ mt: 0.65, color: '#51433f', fontWeight: 800, fontSize: 16, lineHeight: 1.15, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {text(BEDROOM_TEXT_IDS.aidongNamePlaceholder)}
                </Typography>
                <Box sx={{ mt: 0.55, mx: 'auto', width: '82%', height: 24, borderRadius: 99, display: 'grid', placeItems: 'center', bgcolor: isYard ? '#d8c5ad' : '#5a433d', color: isYard ? '#6e5b50' : '#fff', fontWeight: 900, fontSize: 12 }}>
                  {locationLabel}
                </Box>
              </Box>
              )
            })}
            {availableAidongs.length > 0 && Array.from({ length: Math.max(0, 4 - availableAidongs.length) }).map((_, index) => (
              <Box key={`empty-owned-${index}`} sx={{ height: 216, borderRadius: 2.2, bgcolor: 'rgba(255,253,250,0.86)' }} />
            ))}
          </Box>
          <Box sx={{ height: 66, display: 'grid', placeItems: 'center', color: '#6d4f49', fontWeight: 800, fontSize: 15 }}>
            {text(BEDROOM_TEXT_IDS.placementPrompt)}
          </Box>
          <Button
            onClick={() => setPlacementSlot(null)}
            aria-label={text(BEDROOM_TEXT_IDS.actionClose)}
            sx={{
              position: 'absolute',
              left: '50%',
              bottom: -62,
              transform: 'translateX(-50%)',
              minWidth: 0,
              width: 52,
              height: 52,
              borderRadius: 2,
              bgcolor: 'rgba(142,132,124,0.78)',
              color: '#fff',
              fontSize: 34,
              lineHeight: 1,
              '&:hover': { bgcolor: 'rgba(126,116,108,0.86)' },
            }}
          >
            {text(BEDROOM_TEXT_IDS.actionCloseGlyph)}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(itemDetail)}
        onClose={() => setItemDetail(null)}
        maxWidth="xs"
        fullWidth
        disableScrollLock
        PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', ...imageBackground(BEDROOM_ASSETS.popup) } }}
      >
        {itemDetail && (
          (() => {
            const detailEquippedBy = getItemEquippedBy(itemDetail)
            const isOutfitPreview = itemDetail.kind === 'outfit' && currentAidong
            const detailEquippedCharacter = isOutfitPreview ? undefined : detailEquippedBy
            return (
          <>
            <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
              <Box sx={{ position: 'relative', mx: 'auto', width: 'min(260px, 78vw)', aspectRatio: '1 / 1', borderRadius: isOutfitPreview ? 0 : 3, bgcolor: isOutfitPreview ? 'transparent' : '#f4ede7', display: 'grid', placeItems: 'center', color: '#6e574d', fontWeight: 900, fontSize: 42, overflow: 'hidden' }}>
                {isOutfitPreview ? (
                  <AidongSprite character={currentAidong} expression="happy" outfitItems={itemDetail.id === 'none' ? [] : [itemDetail.id]} size={238} />
                ) : (
                  <ItemVisual item={itemDetail} large />
                )}
                {detailEquippedCharacter && <Box sx={{ position: 'absolute', top: 10, right: 10 }}>{renderAidongBadge(detailEquippedCharacter)}</Box>}
              </Box>
              <Typography sx={{ mt: 3, color: '#51433f', fontWeight: 900, fontSize: 24 }}>{itemDetail.name}</Typography>
              <Typography sx={{ mt: 2, color: '#51433f', fontSize: 16 }}>
                {detailEquippedCharacter ? text(BEDROOM_TEXT_IDS.itemEquippedBy, { name: detailEquippedCharacter }) : itemDetail.description}
              </Typography>
              {detailEquippedCharacter && (
                <Typography sx={{ mt: 3, color: '#c8423d', fontSize: 15, fontWeight: 800 }}>
                  {text(BEDROOM_TEXT_IDS.itemEquippedWarning)}
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, pb: 3 }}>
              {itemDetail.kind === 'outfit' && currentAidong && (
                <Button variant="contained" onClick={() => applyPreviewOutfit(itemDetail)} sx={{ minWidth: 112 }}>
                  {itemDetail.id === 'none' ? text(BEDROOM_TEXT_IDS.actionUndress) : text(BEDROOM_TEXT_IDS.actionEquip)}
                </Button>
              )}
              <Button onClick={() => setItemDetail(null)} aria-label={text(BEDROOM_TEXT_IDS.actionClose)} sx={{ minWidth: 56, height: 56, borderRadius: '50%', bgcolor: 'transparent', ...imageBackground(BEDROOM_ASSETS.close), '&:hover': { filter: 'brightness(1.04)' } }} />
            </DialogActions>
          </>
            )
          })()
        )}
      </Dialog>
    </Box>
  )
}
