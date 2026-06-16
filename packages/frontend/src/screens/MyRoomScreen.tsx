/**
 * packages/frontend/src/screens/MyRoomScreen.tsx
 * ------------------------------------------------------------
 * 역할: 숙소 안의 마이룸 shell을 렌더링하고 aggregation API 요약을 탭별로 보여준다.
 * 연결: backend `/api/modules/myroom/*`가 account, host, my-aidong, codex, lodge 상태를 읽어 조합한다.
 * 주의: M2~M3 단계에서는 myRoomStates 전용 저장소 없이 읽기 전용 화면으로 시작한다.
 */
import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, LinearProgress, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { AidongSprite } from '@/components/AidongSprite'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { api } from '@/lib/api'
import { accountStoreFacade, codexStoreFacade, hostStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'
import type { AidongCharacterId } from '@/stores/userStore'

type MyRoomTab = 'info' | 'aidong' | 'codex' | 'collection' | 'ledger'

type AidongCodexProgressSlot = {
  slotNo: number
  status: 'locked' | 'empty' | 'owned'
  quantity: number
  item?: {
    itemId: string
    name: string
    rarity: string
    sourceType: string
    sourceId: string
  }
}

type OwnedAidongCodexItem = {
  characterId: string
  itemId: string
  name: string
  slotNo: number
  rarity: string
  quantity: number
}

type PhotocardPlaceholder = {
  resultId: string
  characterId: string
  score: number
  grade: string
  generatedAt: number
  signature?: {
    name?: string
    emoji?: string
    zone?: string
  }
  photocardCandidate?: {
    candidateId?: string
    status?: string
    generationRouteCandidate?: string
    galleryRouteCandidate?: string
  }
}

const PHOTOCARD_PLACEHOLDER_STORAGE_KEY = 'idongworld-photocard-placeholders'

const TABS: Array<{ id: MyRoomTab; label: string; path: string }> = [
  { id: 'info', label: '정보', path: '/island/lodge/myroom/info' },
  { id: 'aidong', label: 'Aidong', path: '/island/lodge/myroom/aidong' },
  { id: 'codex', label: '도감', path: '/island/lodge/myroom/codex' },
  { id: 'collection', label: '콜렉션', path: '/island/lodge/myroom/collection' },
  { id: 'ledger', label: '장부', path: '/island/lodge/myroom/ledger' },
]

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function positiveEntries(value: unknown): Array<[string, number]> {
  return Object.entries(asRecord(value))
    .map(([key, raw]) => [key, Number(raw)] as [string, number])
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0)
}

function asProgressMap(value: unknown): Record<string, AidongCodexProgressSlot[]> {
  const source = asRecord(value)
  const result: Record<string, AidongCodexProgressSlot[]> = {}
  for (const [characterId, rawSlots] of Object.entries(source)) {
    result[characterId] = Array.isArray(rawSlots) ? rawSlots as AidongCodexProgressSlot[] : []
  }
  return result
}

function asOwnedCodexItems(value: unknown): OwnedAidongCodexItem[] {
  return Array.isArray(value) ? value as OwnedAidongCodexItem[] : []
}

function asPhotocardPlaceholders(value: unknown): PhotocardPlaceholder[] {
  return Array.isArray(value) ? value as PhotocardPlaceholder[] : []
}

function mergePhotocardPlaceholders(items: PhotocardPlaceholder[]): PhotocardPlaceholder[] {
  const seen = new Set<string>()
  const merged: PhotocardPlaceholder[] = []
  for (const item of items) {
    const key = item.resultId || item.photocardCandidate?.candidateId || `${item.characterId}-${item.generatedAt}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged.slice(0, 20)
}

function readStoredPhotocardPlaceholders(): PhotocardPlaceholder[] {
  try {
    const raw = window.sessionStorage.getItem(PHOTOCARD_PLACEHOLDER_STORAGE_KEY)
    if (!raw) return []
    return asPhotocardPlaceholders(JSON.parse(raw))
  } catch {
    return []
  }
}

export const MyRoomScreen = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const uid = accountStoreFacade.useFirebaseUid()
  const hostName = accountStoreFacade.useHostName()
  const nickname = accountStoreFacade.useNickname()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const affinities = myAidongStoreFacade.useAffinities()
  const inventory = hostStoreFacade.useInventory()
  const coins = hostStoreFacade.useCoins()
  const gems = hostStoreFacade.useGems()
  const diamonds = hostStoreFacade.useDiamonds()
  const codexFullyRegistered = codexStoreFacade.useCodexFullyRegistered()
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [localPhotocardPlaceholders, setLocalPhotocardPlaceholders] = useState<PhotocardPlaceholder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tab = useMemo<MyRoomTab>(() => {
    const segment = location.pathname.split('/').filter(Boolean).at(-1)
    return TABS.some((item) => item.id === segment) ? segment as MyRoomTab : 'info'
  }, [location.pathname])

  useEffect(() => {
    const stored = readStoredPhotocardPlaceholders()
    const navigationState = asRecord(location.state)
    const debutResult = asRecord(navigationState.debutResult)
    const routePlaceholder = typeof debutResult.characterId === 'string'
      ? debutResult as unknown as PhotocardPlaceholder
      : null
    setLocalPhotocardPlaceholders(mergePhotocardPlaceholders([
      ...(routePlaceholder ? [routePlaceholder] : []),
      ...stored,
    ]))
  }, [location.state])
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void api.getMyRoomSummary(uid)
      .then((response) => {
        if (!cancelled) setSummary(response)
      })
      .catch((err) => {
        console.warn('[myroom] failed to load summary', err)
        if (!cancelled) setError('마이룸 정보를 불러오지 못했어요. 로컬 상태로 표시합니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  const backendAccount = asRecord(summary?.account)
  const backendHost = asRecord(summary?.host)
  const backendAidongs = asRecord(summary?.aidongs)
  const backendCodex = asRecord(summary?.codex)
  const backendCollection = asRecord(summary?.collection)
  const displayName = String(backendAccount.hostName ?? hostName ?? backendAccount.nickname ?? nickname ?? '마이룸')
  const displayCoins = Number(backendHost.coins ?? coins)
  const displayGems = Number(backendHost.gems ?? gems)
  const displayDiamonds = Number(backendHost.diamonds ?? diamonds)
  const displayAidongs = Array.isArray(backendAidongs.recruitedAidongs)
    ? backendAidongs.recruitedAidongs as AidongCharacterId[]
    : recruitedAidongs
  const displayCodexRegistered = Array.isArray(backendCodex.codexFullyRegistered)
    ? backendCodex.codexFullyRegistered as string[]
    : codexFullyRegistered
  const aidongCodexProgress = asProgressMap(backendCodex.aidongCodexProgress)
  const ownedAidongCodexItems = asOwnedCodexItems(backendCollection.aidongCodexItems)
  const displayPhotocardPlaceholders = mergePhotocardPlaceholders([
    ...asPhotocardPlaceholders(backendCollection.photocardPlaceholders),
    ...localPhotocardPlaceholders,
  ])
  const displayInventory = Object.keys(asRecord(backendHost.inventory)).length
    ? backendHost.inventory
    : inventory
  const collectionEntries = [
    ...positiveEntries(displayInventory),
    ...positiveEntries(backendCollection.lodgeInventory).map(([id, qty]) => [`lodge:${id}`, qty] as [string, number]),
    ...positiveEntries(backendCollection.lodgeFurniture).map(([id, qty]) => [`furniture:${id}`, qty] as [string, number]),
  ]

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="숙소" title="마이룸" subtitle="정보·Aidong·도감·콜렉션·장부" />
      <GameStage stageSx={{ px: 3, py: 3 }}>
        <Typography variant="h1" sx={{ mb: 1 }}>마이룸</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          여러 모듈에 흩어진 상태를 한 곳에서 읽어 보는 aggregation shell입니다.
        </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, value) => navigate(TABS.find((item) => item.id === value)?.path ?? '/island/lodge/myroom/info')} sx={{ mb: 2 }}>
        {TABS.map((item) => <Tab key={item.id} value={item.id} label={item.label} />)}
      </Tabs>

      {tab === 'info' && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
          <Typography variant="h2" sx={{ fontSize: 18, mb: 1 }}>{displayName}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`코인 ${displayCoins}`} />
            <Chip label={`젬 ${displayGems}`} />
            <Chip label={`다이아 ${displayDiamonds}`} />
            <Chip label={`Aidong ${displayAidongs.length}`} color="primary" variant="outlined" />
          </Stack>
        </Box>
      )}

      {tab === 'aidong' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1.5 }}>
          {displayAidongs.length === 0 ? (
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 3, textAlign: 'center' }}>
              <Typography sx={{ mb: 1 }}>아직 영입한 Aidong이 없어요.</Typography>
              <Button variant="contained" onClick={() => navigate('/voyage/board')}>항해로 만나러 가기</Button>
            </Box>
          ) : displayAidongs.map((id) => {
            const affinity = asRecord(asRecord(backendAidongs.affinities)[id])
            const localAffinity = affinities[id]
            return (
              <Box key={id} sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, textAlign: 'center' }}>
                <AidongSprite character={id} size={116} />
                <Typography sx={{ fontWeight: 800 }}>{id}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  친밀도 Lv {Number(affinity.level ?? localAffinity?.level ?? 0)} · {Number(affinity.score ?? localAffinity?.score ?? 0)}점
                </Typography>
              </Box>
            )
          })}
        </Box>
      )}

      {tab === 'codex' && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
          <Typography variant="h2" sx={{ fontSize: 18, mb: 1 }}>도감 요약</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip label={`본 등재 ${displayCodexRegistered.length}`} color="primary" />
            <Chip label={`해금 일기 ${(Array.isArray(backendCodex.unlockedDiaries) ? backendCodex.unlockedDiaries : []).length}`} />
            <Chip label={`해금 슬롯 ${(Array.isArray(backendCodex.unlockedCodexEntries) ? backendCodex.unlockedCodexEntries : []).length}`} />
          </Stack>
          {Object.keys(aidongCodexProgress).length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>아직 표시할 Aidong 도감 progress가 없어요.</Typography>
          ) : Object.entries(aidongCodexProgress).map(([characterId, slots]) => {
            const ownedCount = slots.filter((slot) => slot.status === 'owned').length
            const openCount = slots.filter((slot) => slot.status !== 'locked').length
            return (
              <Box key={characterId} sx={{ mt: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Typography sx={{ fontWeight: 800 }}>{characterId}</Typography>
                  <Chip size="small" label={`${ownedCount}/${openCount || 25} 획득`} color={ownedCount > 0 ? 'primary' : 'default'} />
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 1 }}>
                  {slots.map((slot) => (
                    <Box key={`${characterId}-${slot.slotNo}`} sx={{ border: '1px solid', borderColor: slot.status === 'owned' ? 'primary.main' : 'divider', borderRadius: 1, p: 1, minHeight: 74, bgcolor: slot.status === 'locked' ? 'action.hover' : 'background.default' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>#{slot.slotNo}</Typography>
                      <Typography variant="body2" sx={{ fontSize: 12, mt: 0.5 }}>
                        {slot.item?.name ?? '미정 슬롯'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: slot.status === 'owned' ? 'primary.main' : 'text.secondary' }}>
                        {slot.status === 'owned' ? `${slot.quantity}개 보유` : slot.status === 'empty' ? '미획득' : '잠김'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )
          })}
          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/codex')}>도감 화면 열기</Button>
        </Box>
      )}

      {tab === 'collection' && (
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
          <Typography variant="h2" sx={{ fontSize: 18, mb: 1 }}>콜렉션</Typography>
          {displayPhotocardPlaceholders.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>포토카드 placeholder</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1 }}>
                {displayPhotocardPlaceholders.map((item) => (
                  <Box key={item.resultId} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, bgcolor: 'background.default' }}>
                    <Typography sx={{ fontWeight: 900 }}>{item.characterId}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      등급 {item.grade} · 점수 {item.score}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      {item.signature?.emoji ?? '카'} {item.signature?.name ?? '데뷔 포토카드 후보'}
                    </Typography>
                    <Chip size="small" sx={{ mt: 1 }} label={item.photocardCandidate?.status ?? 'placeholder'} color="primary" variant="outlined" />
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
                정식 생성 route 후보: /island/lodge/myroom/collection/photocard/new · 갤러리 후보: /island/lodge/myroom/collection/photocard
              </Typography>
            </Box>
          )}
          {ownedAidongCodexItems.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>Aidong 도감템</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {ownedAidongCodexItems.map((item) => (
                  <Chip key={`${item.characterId}-${item.itemId}`} color="primary" variant="outlined" label={`${item.characterId} · ${item.name} x${item.quantity}`} />
                ))}
              </Stack>
            </Box>
          )}
          <Typography sx={{ fontWeight: 800, mb: 1 }}>전역/숙소 보유품</Typography>
          {collectionEntries.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>표시할 보유 아이템이 없어요.</Typography>
          ) : (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {collectionEntries.map(([id, qty]) => <Chip key={id} label={`${id} ${qty}`} />)}
            </Stack>
          )}
        </Box>
      )}

        {tab === 'ledger' && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
            <Typography variant="h2" sx={{ fontSize: 18, mb: 1 }}>장부</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              현재는 전용 ledger collection 없이 기존 account, host, my-aidong, codex, lodge state를 읽어 생성한 요약입니다.
            </Typography>
            <Chip sx={{ mt: 1 }} label={`생성 시각 ${new Date(Number(asRecord(summary?.ledger).generatedAt ?? Date.now())).toLocaleString()}`} />
          </Box>
        )}
      </GameStage>
    </Box>
  )
}
