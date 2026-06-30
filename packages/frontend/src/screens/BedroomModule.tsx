import { useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from '@/components/AidongSprite'
import type { AidongItemConfig, DecorItemConfig } from '@/lib/api'

type BedroomView = 'slots' | 'room' | 'decor' | 'outfit'
type BedroomItemKind = 'decor' | 'outfit'
type BedroomItem = {
  id: string
  name: string
  kind: BedroomItemKind
  category: string
  visual: string
  asset?: string
  price?: number
  description: string
}

interface BedroomModuleProps {
  open: boolean
  onClose: () => void
  recruitedAidongs: AidongCharacterId[]
  equippedOutfit: Record<string, string>
  equippedItems: Record<string, string[]>
  inventory: Record<string, number>
  furnitureItems: DecorItemConfig[]
  aidongItems: AidongItemConfig[]
  aidongLocations: Record<string, string>
  aidongLevels: Record<string, number>
}

const STAGE_WIDTH = 1180
const TOP_SAFE = 132
const ROOM_BG = '/assets/backgrounds/03_Home_05.png'
const ROOM_FALLBACK_BG = '/assets/backgrounds/03_Home_04.png'
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
  emptySlot: `${HOME_UI}/IdongListSlot02.png`,
  lockedSlot: `${HOME_UI}/IdongListSlot03.png`,
  itemSlot: `${HOME_UI}/ItemSlotList.png`,
  itemSlotSelected: `${HOME_UI}/ItemSlotListSelect.png`,
  popup: `${HOME_UI}/PopupBgItemInfo.png`,
} as const

const imageBackground = (src: string) => ({
  backgroundImage: `url(${src})`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
})

const DECOR_CATEGORIES = [
  { id: 'all', label: 'ALL', asset: `${HOME_UI}/Tap01_0` },
  { id: 'bed', label: '침대', asset: `${HOME_UI}/Tap01_1` },
  { id: 'chair', label: '의자', asset: `${HOME_UI}/Tap01_2` },
  { id: 'table', label: '탁자', asset: `${HOME_UI}/Tap01_3` },
  { id: 'wall', label: '벽', asset: `${HOME_UI}/Tap01_4` },
  { id: 'plant', label: '화분', asset: `${HOME_UI}/Tap01_5` },
]

const OUTFIT_CATEGORIES = [
  { id: 'all', label: 'ALL', asset: `${HOME_UI}/Tap02_0` },
  { id: 'top', label: '상의', asset: `${HOME_UI}/Tap02_1` },
  { id: 'bottom', label: '하의', asset: `${HOME_UI}/Tap02_2` },
  { id: 'hat', label: '모자', asset: `${HOME_UI}/Tap02_3` },
  { id: 'shoes', label: '신발', asset: `${HOME_UI}/Tap02_4` },
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

export const BedroomModule = ({ open, onClose, recruitedAidongs, equippedOutfit, equippedItems, inventory, furnitureItems, aidongItems, aidongLocations, aidongLevels }: BedroomModuleProps) => {
  const [view, setView] = useState<BedroomView>('slots')
  const [selectedAidong, setSelectedAidong] = useState<AidongCharacterId | null>(null)
  const [bedroomSlots, setBedroomSlots] = useState<Array<AidongCharacterId | null>>([null, null])
  const [placementSlot, setPlacementSlot] = useState<number | null>(null)
  const [decorCategory, setDecorCategory] = useState('all')
  const [outfitCategory, setOutfitCategory] = useState('all')
  const [itemDetail, setItemDetail] = useState<BedroomItem | null>(null)

  const placedAidongs = useMemo(() => new Set(bedroomSlots.filter(Boolean) as AidongCharacterId[]), [bedroomSlots])
  const availableAidongs = useMemo(
    () => recruitedAidongs.filter((characterId) => !placedAidongs.has(characterId)),
    [placedAidongs, recruitedAidongs],
  )
  const currentAidong = selectedAidong
  const decorItems = useMemo(() => furnitureItems.map((item): BedroomItem => ({
    id: item.itemId,
    name: item.label,
    kind: 'decor',
    category: categoryFromDecor(item),
    visual: item.label,
    asset: toPublicAssetPath(item.assetPath),
    price: item.cost > 0 ? item.cost : undefined,
    description: item.description ?? item.label,
  })).filter((item) => decorCategory === 'all' || item.category === decorCategory), [decorCategory, furnitureItems])
  const outfitItems = useMemo(() => aidongItems
    .filter((item) => item.kind === 'aidong-item' && item.scope === 'aidong-global')
    .filter((item) => (inventory[item.itemId] ?? 0) > 0 || recruitedAidongs.some((characterId) => (equippedItems[characterId] ?? []).includes(item.itemId)))
    .map((item): BedroomItem => ({
      id: item.itemId,
      name: item.name,
      kind: 'outfit',
      category: categoryFromAidongItem(item),
      visual: item.name,
      asset: toPublicAssetPath(item.assetPath),
      price: item.price && item.price > 0 ? item.price : undefined,
      description: item.description,
    }))
    .filter((item) => outfitCategory === 'all' || item.category === outfitCategory), [aidongItems, equippedItems, inventory, outfitCategory, recruitedAidongs])

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

  const levelLabel = (characterId: AidongCharacterId) => `Lv.${aidongLevels[characterId] ?? 1}`

  const getItemEquippedBy = (item: BedroomItem): AidongCharacterId | undefined => {
    if (item.kind === 'outfit') {
      return recruitedAidongs.find((characterId) => equippedOutfit[characterId] === item.id)
    }
    return recruitedAidongs.find((characterId) => (equippedItems[characterId] ?? []).includes(item.id))
  }

  const openPlacedAidong = (characterId: AidongCharacterId) => {
    setSelectedAidong(characterId)
    setView('room')
  }

  const renderBack = () => (
    <Button
      onClick={goBack}
      aria-label="뒤로가기"
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
        <Box sx={{ position: 'relative', height: kind === 'decor' ? '50%' : '52%', flex: '0 0 auto', backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: 'cover', backgroundPosition: 'center top', overflow: 'hidden' }}>
          {renderBack()}
          {renderFade(180)}
          {kind === 'outfit' && currentAidong && (
            <Box sx={{ position: 'absolute', left: '50%', bottom: -4, transform: 'translateX(-50%)', zIndex: 2 }}>
              <AidongSprite character={currentAidong} expression="happy" outfit={equippedOutfit[currentAidong]} size={222} />
            </Box>
          )}
        </Box>

        <Box sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', bgcolor: '#f1e1cb' }}>
          <Stack direction="row" spacing={1.1} sx={{ height: 68, alignItems: 'center', px: 1.1, borderBottom: '1px solid rgba(139,104,72,0.14)', bgcolor: 'rgba(250,238,220,0.96)', overflowX: 'auto', overflowY: 'hidden' }}>
            {categories.map((category) => {
              const active = activeCategory === category.id
              return (
                <Button
                  key={category.id}
                  aria-label={category.label}
                  onClick={() => (kind === 'decor' ? setDecorCategory(category.id) : setOutfitCategory(category.id))}
                  sx={{ flex: '0 0 auto', minWidth: 0, width: category.id === 'all' ? 58 : 48, height: 40, p: 0, borderRadius: 2, bgcolor: 'transparent', overflow: 'hidden', '&:hover': { filter: 'brightness(1.03)' } }}
                >
                  <Box component="img" src={`${category.asset}_${active ? 'On' : 'Off'}.png`} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </Button>
              )
            })}
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 148px))', justifyContent: 'center', columnGap: { xs: 1.2, sm: 2 }, rowGap: { xs: 2.4, sm: 3 }, p: { xs: 1.2, sm: 1.6 }, pb: 5, alignItems: 'start' }}>
            {items.map((item) => {
              const equippedBy = getItemEquippedBy(item)
              return (
                <Box key={item.id} component="button" type="button" onClick={() => setItemDetail(item)} sx={{ position: 'relative', border: 0, borderRadius: 2, bgcolor: 'transparent', aspectRatio: '1 / 1', width: '100%', p: 0, boxShadow: 'none', cursor: 'pointer', overflow: 'visible' }}>
                  <Box component="img" src={equippedBy ? BEDROOM_ASSETS.itemSlotSelected : BEDROOM_ASSETS.itemSlot} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                  {equippedBy && <Box sx={{ position: 'absolute', top: -7, right: -7 }}>{renderAidongBadge(equippedBy)}</Box>}
                  <Box sx={{ position: 'absolute', zIndex: 1, left: '14%', right: '14%', top: '14%', bottom: item.price ? '25%' : '16%', display: 'grid', placeItems: 'center', color: '#795f51', fontWeight: 900, fontSize: { xs: 18, sm: 22 }, overflow: 'hidden' }}>
                    <ItemVisual item={item} />
                  </Box>
                  {item.price ? (
                    <Box sx={{ position: 'absolute', zIndex: 2, left: '50%', bottom: { xs: -8, sm: -9 }, transform: 'translateX(-50%)', width: '76%', aspectRatio: '228 / 80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.35, color: '#5f5149', fontWeight: 900, fontSize: { xs: 11, sm: 13 }, lineHeight: 1 }}>
                      <Box component="img" src={BEDROOM_ASSETS.priceBox} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                      <Box component="img" src={BEDROOM_ASSETS.gold} alt="" sx={{ position: 'relative', zIndex: 1, width: { xs: 14, sm: 16 }, height: { xs: 14, sm: 16 }, flex: '0 0 auto' }} />
                      <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>{item.price.toLocaleString()}</Box>
                    </Box>
                  ) : null}
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
            <Box sx={{ position: 'relative', zIndex: 2, height: '100%', pt: { xs: 23, sm: 25 }, px: { xs: 2, sm: 6 }, overflowX: 'auto', overflowY: 'hidden' }}>
              <Stack direction="row" spacing={{ xs: 2, sm: 4 }} alignItems="flex-start" sx={{ width: 'max-content', minWidth: '100%' }}>
                {bedroomSlots.map((characterId, index) => (
                  <Box key={`slot-${index}`} sx={{ width: { xs: 190, sm: 220 }, flex: '0 0 auto' }}>
                    <Box
                      component={characterId ? 'button' : 'div'}
                      type={characterId ? 'button' : undefined}
                      onClick={() => characterId && openPlacedAidong(characterId)}
                      sx={{ position: 'relative', width: '100%', height: { xs: 240, sm: 278 }, border: 0, borderRadius: 5, bgcolor: 'transparent', overflow: 'hidden', p: 1.5, cursor: characterId ? 'pointer' : 'default', ...imageBackground(characterId ? BEDROOM_ASSETS.aidongSlot : BEDROOM_ASSETS.emptySlot) }}
                    >
                      {characterId ? (
                        <>
                          <Box sx={{ position: 'absolute', top: -2, right: 24, px: 1.6, py: 0.75, color: '#fff', fontWeight: 900, fontSize: 20, ...imageBackground(BEDROOM_ASSETS.levelTag) }}>
                            {levelLabel(characterId)}
                          </Box>
                          <Box sx={{ height: { xs: 162, sm: 190 }, mt: 0.2, borderRadius: 3, overflow: 'hidden', display: 'grid', placeItems: 'center', backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: '220%', backgroundPosition: 'center 16%' }}>
                            <AidongSprite character={characterId} expression="happy" outfit={equippedOutfit[characterId]} size={132} />
                          </Box>
                          <Typography sx={{ mt: 1.2, px: 1, color: '#5b4540', fontWeight: 900, fontSize: 22, lineHeight: 1.2, textAlign: 'center' }}>
                            아이동이름
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Box sx={{ height: { xs: 162, sm: 190 }, borderRadius: 3, bgcolor: '#d7c8b8' }} />
                          <Button variant="contained" onClick={() => setPlacementSlot(index)} sx={{ mt: 2.6, width: '78%', mx: 'auto', display: 'block', bgcolor: '#f27f86', borderRadius: 4, fontSize: 22, fontWeight: 900, '&:hover': { bgcolor: '#ec747d' } }}>
                            배치
                          </Button>
                        </>
                      )}
                    </Box>
                    {index === 0 && (
                      <Box sx={{ mt: 5, height: 230, border: 0, borderRadius: 5, bgcolor: 'transparent', display: 'grid', placeItems: 'center', textAlign: 'center', color: '#704b43', ...imageBackground(BEDROOM_ASSETS.lockedSlot) }}>
                        <Box>
                          <Typography sx={{ fontSize: 38, mb: 1 }}>잠금</Typography>
                          <Button variant="contained" sx={{ bgcolor: '#a66a55', borderRadius: 3, px: 4, '&:hover': { bgcolor: '#965f4d' } }}>
                            벽돌집
                          </Button>
                          <Typography sx={{ mt: 1, fontWeight: 900 }}>이 필요해요!</Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        )}

        {view === 'room' && currentAidong && (
          <Box sx={{ height: '100%', position: 'relative', overflow: 'hidden', backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,216,206,0.24) 0%, rgba(255,255,255,0) 42%, rgba(73,54,39,0.58) 100%)' }} />
            {renderFade(250)}
            {renderBack()}
            <Typography sx={{ position: 'absolute', top: TOP_SAFE + 12, left: 56, zIndex: 3, color: '#5a4640', fontWeight: 900, fontSize: 18 }}>
              아이동이름의 방
            </Typography>
            <Button onClick={() => setView('slots')} sx={{ position: 'absolute', top: TOP_SAFE - 2, right: 14, zIndex: 3, bgcolor: 'rgba(255,255,255,0.92)', color: '#9b5a55', borderRadius: 3, px: 2, py: 1, fontWeight: 900, '&:hover': { bgcolor: '#fff' } }}>
              아이동 교체
            </Button>
            <Box sx={{ position: 'absolute', left: '50%', top: '51%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
              <AidongSprite character={currentAidong} expression="happy" outfit={equippedOutfit[currentAidong]} size={210} />
            </Box>
            <Stack direction="row" spacing={2} sx={{ position: 'absolute', left: 54, right: 54, bottom: 124, zIndex: 3 }}>
              <Button fullWidth variant="contained" onClick={() => setView('decor')} sx={{ height: 64, bgcolor: '#f28288', borderRadius: 3, fontSize: 18, fontWeight: 900, '&:hover': { bgcolor: '#ec747d' } }}>
                방 꾸미기
              </Button>
              <Button fullWidth variant="contained" onClick={() => setView('outfit')} sx={{ height: 64, bgcolor: '#f28288', borderRadius: 3, fontSize: 18, fontWeight: 900, '&:hover': { bgcolor: '#ec747d' } }}>
                옷 입히기
              </Button>
            </Stack>
            <Button sx={{ position: 'absolute', left: '50%', bottom: 34, transform: 'translateX(-50%)', zIndex: 3, minWidth: 0, width: 74, height: 74, borderRadius: '50%', bgcolor: 'transparent', ...imageBackground(BEDROOM_ASSETS.camera), '&:hover': { filter: 'brightness(1.04)' } }} />
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
            m: 1,
            borderRadius: 3,
            overflow: 'visible',
            bgcolor: '#fffdfa',
            boxShadow: '0 18px 40px rgba(45,34,28,0.28)',
          },
        }}
      >
        <DialogContent sx={{ p: 0, overflow: 'visible' }}>
          <Typography sx={{ height: 58, display: 'grid', placeItems: 'center', color: '#51433f', fontWeight: 900, fontSize: 24, letterSpacing: 0 }}>
            보유 아이동 리스트
          </Typography>
          <Box
            sx={{
              mx: 1.1,
              height: 'min(492px, calc(100dvh - 298px))',
              minHeight: 278,
              overflowY: 'auto',
              bgcolor: '#d8c9b8',
              borderRadius: 2,
              p: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1.3,
              alignContent: 'start',
            }}
          >
            {availableAidongs.map((characterId) => {
              const locationLabel = aidongLocations[characterId] ?? '마당'
              const isYard = locationLabel === '마당'
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
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, px: 1.1, py: 0.35, borderRadius: '0 0 8px 8px', bgcolor: '#f3868d', color: '#fff', fontWeight: 900, fontSize: 13 }}>
                  {levelLabel(characterId)}
                </Box>
                <Box sx={{ height: 124, borderRadius: 1.6, bgcolor: '#efe0ce', overflow: 'hidden', display: 'grid', placeItems: 'center', backgroundImage: `url(${ROOM_BG}), url(${ROOM_FALLBACK_BG})`, backgroundSize: '220%', backgroundPosition: 'center 18%' }}>
                  <AidongSprite character={characterId} expression="happy" outfit={equippedOutfit[characterId]} size={118} />
                </Box>
                <Typography sx={{ mt: 0.9, color: '#51433f', fontWeight: 800, fontSize: 16, textAlign: 'center' }}>
                  아이동이름
                </Typography>
                <Box sx={{ mt: 0.8, mx: 'auto', width: '82%', height: 28, borderRadius: 99, display: 'grid', placeItems: 'center', bgcolor: isYard ? '#d8c5ad' : '#5a433d', color: isYard ? '#6e5b50' : '#fff', fontWeight: 900, fontSize: 13 }}>
                  {locationLabel}
                </Box>
              </Box>
              )
            })}
            {Array.from({ length: Math.max(0, 4 - availableAidongs.length) }).map((_, index) => (
              <Box key={`empty-owned-${index}`} sx={{ height: 216, borderRadius: 2.2, bgcolor: 'rgba(255,253,250,0.86)' }} />
            ))}
          </Box>
          <Box sx={{ height: 66, display: 'grid', placeItems: 'center', color: '#6d4f49', fontWeight: 800, fontSize: 15 }}>
            방에 배치할 아이동을 선택해 주세요.
          </Box>
          <Button
            onClick={() => setPlacementSlot(null)}
            aria-label="닫기"
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
            ×
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
            return (
          <>
            <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
              <Box sx={{ position: 'relative', mx: 'auto', width: 'min(260px, 78vw)', aspectRatio: '1 / 1', borderRadius: 3, bgcolor: '#f4ede7', display: 'grid', placeItems: 'center', color: '#6e574d', fontWeight: 900, fontSize: 42 }}>
                <ItemVisual item={itemDetail} large />
                {detailEquippedBy && <Box sx={{ position: 'absolute', top: 10, right: 10 }}>{renderAidongBadge(detailEquippedBy)}</Box>}
              </Box>
              <Typography sx={{ mt: 3, color: '#51433f', fontWeight: 900, fontSize: 24 }}>{itemDetail.name}</Typography>
              <Typography sx={{ mt: 2, color: '#51433f', fontSize: 16 }}>
                {detailEquippedBy ? `${detailEquippedBy}이 사용 중이에요.` : itemDetail.description}
              </Typography>
              {detailEquippedBy && (
                <Typography sx={{ mt: 3, color: '#c8423d', fontSize: 15, fontWeight: 800 }}>
                  *착용 해제 후 착용할 수 있어요!
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button onClick={() => setItemDetail(null)} aria-label="닫기" sx={{ minWidth: 56, height: 56, borderRadius: '50%', bgcolor: 'transparent', ...imageBackground(BEDROOM_ASSETS.close), '&:hover': { filter: 'brightness(1.04)' } }} />
            </DialogActions>
          </>
            )
          })()
        )}
      </Dialog>
    </Box>
  )
}
