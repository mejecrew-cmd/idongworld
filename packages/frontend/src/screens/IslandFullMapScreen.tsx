/**
 * 📁 screens/IslandFullMapScreen.tsx — 마이섬 전체 지도 (15구역 풀맵)
 * ───────────────────────────────────────────────
 * 📌 역할: 의도문서 §5의 청소년 정서 풍경 15구역을 그리드로 표시.
 *           Phase 1 6구역 해금·Phase 2/3 9구역 잠김 시각화.
 *
 * 🔗 연결:
 *   - data/zones.ts → 15구역 SoT
 *   - components/MiniGameModal.tsx → garden/oasis/forest/cliff zone 클릭 시 미니게임
 *
 * 💡 초보자 안내:
 *   - ZONE_TO_GAME: zone id → 미니게임 매핑 (4종)
 *   - PHASE_COLOR: 단계별 색 (1=주황 / 2=파랑 / 3=보라 / 4=초록)
 *   - zone 클릭 → 정보 모달 → 미니게임 시작 또는 해당 화면 이동
 */
import { useState, useMemo } from 'react'
import { Box, Typography, Modal, Button, Chip, Stack, LinearProgress, Divider } from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ZONES, PHASE_LABEL, PHASE_COLOR, type Zone } from '@/data/zones'
import { MiniGameModal, type MiniGameId } from '@/components/MiniGameModal'
import { ScreenHeader } from '@/components/ScreenHeader'
import { api } from '@/lib/api'
import { accountStoreFacade, myAidongStoreFacade, myIslandStoreFacade } from '@/lib/storeFacades'
import type { AidongCharacterId, MyIslandZoneSlot } from '@/stores/userStore'

const ZONE_TO_GAME: Record<string, MiniGameId> = {
  'growth-garden': 'garden',
  oasis: 'oasis',
  'memory-forest': 'memory',
  'challenge-cliff': 'mine',
}

const TOUR_STORAGE = 'opening:tourVisited'
const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

export const IslandFullMapScreen = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isOpeningTour = params.get('tour') === 'opening'

  const unlockedZones = myIslandStoreFacade.useUnlockedZones()
  const zoneSlots = myIslandStoreFacade.useZoneSlots()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const [selected, setSelected] = useState<Zone | null>(null)
  const [activeMiniGame, setActiveMiniGame] = useState<MiniGameId>(null)
  const [selectedIncorporationAidong, setSelectedIncorporationAidong] = useState<AidongCharacterId | ''>('')
  const [incorporatingAreaNo, setIncorporatingAreaNo] = useState<string | null>(null)
  const [incorporationMessage, setIncorporationMessage] = useState<string | null>(null)
  const [incorporationError, setIncorporationError] = useState<string | null>(null)
  const [tourVisited, setTourVisited] = useState<Set<string>>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(TOUR_STORAGE) : null
    return new Set(stored ? JSON.parse(stored) : [])
  })

  // 오프닝 둘러보기 모드: 항구·숙소만 "현재 갈 수 있음", 나머지는 잠금 (상징·의미 미리 보기)
  // 일반 모드 (마이섬에서 진입): Phase 1 6구역 해금
  const isUnlocked = (z: Zone) => {
    if (isOpeningTour) return z.id === 'harbor' || z.id === 'lodge'
    return z.defaultUnlocked || unlockedZones.includes(z.id) || z.phase === 1
  }

  // 둘러보기 대상: 15 - 현 위치(숙소부지 1) = 14
  const tourTargets = useMemo(() => ZONES.filter((z) => z.id !== 'lodge'), [])
  const tourComplete = tourTargets.every((z) => tourVisited.has(z.id))
  const fillableZones = useMemo(() => ZONES.filter((z) => z.kind === 'fillable'), [])
  const filledSlotCount = useMemo(
    () => fillableZones.filter((z) => Boolean(zoneSlots[z.areaNo]?.occupantAidongId)).length,
    [fillableZones, zoneSlots],
  )
  const assignedAidongIds = useMemo(() => (
    new Set(
      Object.values(zoneSlots)
        .map((slot) => slot.occupantAidongId)
        .filter((id): id is AidongCharacterId => Boolean(id)),
    )
  ), [zoneSlots])
  const unassignedAidongs = useMemo(
    () => recruitedAidongs.filter((id) => !assignedAidongIds.has(id)),
    [assignedAidongIds, recruitedAidongs],
  )
  const activeIncorporationAidong = selectedIncorporationAidong || unassignedAidongs[0]

  const getSlot = (zone: Zone): MyIslandZoneSlot => (
    zoneSlots[zone.areaNo] ?? {
      areaNo: zone.areaNo,
      areaId: zone.id,
      kind: zone.kind,
      state: zone.kind === 'anchor' ? 'locked' : 'empty',
      source: 'default',
    }
  )

  const markVisited = (zoneId: string) => {
    if (!isOpeningTour) return
    if (tourVisited.has(zoneId)) return
    const next = new Set(tourVisited)
    next.add(zoneId)
    setTourVisited(next)
    localStorage.setItem(TOUR_STORAGE, JSON.stringify(Array.from(next)))
  }

  const onSelect = (z: Zone) => {
    setSelected(z)
    markVisited(z.id)
  }

  const incorporateAidongToSlot = async (zone: Zone) => {
    const characterId = activeIncorporationAidong
    const slot = getSlot(zone)

    setIncorporationMessage(null)
    setIncorporationError(null)

    if (!characterId) {
      setIncorporationError('편입 대기 중인 Aidong이 없어요.')
      return
    }
    if (slot.kind !== 'fillable') {
      setIncorporationError('항구와 숙소는 편입 슬롯이 아니에요.')
      return
    }
    if (slot.occupantAidongId) {
      setIncorporationError(`${zone.areaNo}에는 이미 ${slot.occupantAidongId}이(가) 편입되어 있어요.`)
      return
    }

    setIncorporatingAreaNo(zone.areaNo)
    try {
      if (MODULE_ACTION_API_SYNC) {
        const uid = accountStoreFacade.getFirebaseUid()
        if (!uid) throw new Error('로그인 정보가 없어 편입할 수 없어요.')
        const response = await api.incorporateMyIslandSlot(uid, zone.areaNo, characterId)
        if (response.zoneSlots) {
          myIslandStoreFacade.setZoneSlots(response.zoneSlots)
        } else if (
          response.state
          && typeof response.state === 'object'
          && 'zoneSlots' in response.state
        ) {
          const nextSlots = (response.state as { zoneSlots?: Record<string, MyIslandZoneSlot> }).zoneSlots
          if (nextSlots) myIslandStoreFacade.setZoneSlots(nextSlots)
        }
      } else {
        myIslandStoreFacade.setZoneSlots({
          ...zoneSlots,
          [zone.areaNo]: {
            ...slot,
            state: 'filled',
            occupantAidongId: characterId,
            source: 'incorporation',
            incorporatedAt: Date.now(),
            updatedAt: Date.now(),
          },
        })
      }
      setSelectedIncorporationAidong('')
      setIncorporationMessage(`${characterId}을(를) ${zone.areaNo} ${zone.name}에 편입했어요.`)
    } catch (error) {
      setIncorporationError(error instanceof Error ? error.message : '편입 처리 중 오류가 발생했어요.')
    } finally {
      setIncorporatingAreaNo(null)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', pb: 12 }}>
      <ScreenHeader
        category={isOpeningTour ? '회색섬→하트섬' : '마이섬'}
        title={isOpeningTour ? '둘러보기 (14구역)' : '풀맵 (15구역)'}
        subtitle={isOpeningTour ? `${tourVisited.size} / ${tourTargets.length}` : undefined}
      />
      <Typography variant="h1" sx={{ mb: 1, mt: 2 }}>
        {isOpeningTour ? '청소가 끝나는 동안, 섬을 둘러봐요' : '마이섬 전체 지도'}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {isOpeningTour
          ? `각 구역을 클릭하면 상징과 의미를 들려줄게요. 14곳을 모두 둘러보면 청소 자리로 돌아가요.`
          : '15구역 · 청소년의 정서·고민·희망의 풍경 (의도문서 §5 / 마이섬.md §4)'}
      </Typography>

      {/* 둘러보기 진행도 (오프닝 모드 전용) */}
      {isOpeningTour && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={(tourVisited.size / tourTargets.length) * 100}
            sx={{ height: 8, borderRadius: 4, mb: 1 }}
          />
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {tourComplete ? '모든 구역을 둘러봤어요.' : `${tourTargets.length - tourVisited.size}곳 남음`}
            </Typography>
            <Button
              size="small"
              variant={tourComplete ? 'contained' : 'outlined'}
              onClick={() => navigate('/heart-island/cleaning')}
            >
              {tourComplete ? '청소 자리로 돌아가기' : '청소 자리로'}
            </Button>
          </Stack>
        </Box>
      )}

      {/* 범례 */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        {([1, 2, 3, 4] as const).map((p) => (
          <Chip
            key={p}
            label={PHASE_LABEL[p]}
            size="small"
            sx={{ bgcolor: PHASE_COLOR[p], fontSize: 12 }}
          />
        ))}
        <Chip label="🔒 잠김" size="small" variant="outlined" sx={{ fontSize: 12 }} />
        <Chip label="✨ 해금" size="small" color="primary" sx={{ fontSize: 12 }} />
      </Stack>

      {/* 15구역 그리드 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 2,
        }}
      >
        {ZONES.map((z) => {
          const unlocked = isUnlocked(z)
          const visited = tourVisited.has(z.id)
          const slot = getSlot(z)
          const occupied = Boolean(slot.occupantAidongId)
          return (
            <Box
              key={z.id}
              onClick={() => onSelect(z)}
              sx={{
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: unlocked ? PHASE_COLOR[z.phase] : 'divider',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                opacity: unlocked ? 1 : 0.55,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                position: 'relative',
              }}
            >
              <Typography sx={{ fontSize: 36, mb: 0.5 }}>
                {unlocked ? z.emoji : '🔒'}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                {z.areaNo}. {z.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                {z.emotion}
              </Typography>
              <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip
                  size="small"
                  label={z.kind === 'anchor' ? 'anchor' : occupied ? '편입됨' : '빈 슬롯'}
                  color={z.kind === 'anchor' ? 'warning' : occupied ? 'primary' : 'default'}
                  variant={occupied || z.kind === 'anchor' ? 'filled' : 'outlined'}
                  sx={{ fontSize: 10, height: 20 }}
                />
              </Stack>
              <Box
                sx={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: PHASE_COLOR[z.phase],
                }}
              />
              {isOpeningTour && visited && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 6,
                    right: 6,
                    fontSize: 14,
                    color: 'success.main',
                  }}
                >
                  ✓
                </Box>
              )}
              {isOpeningTour && z.id === 'lodge' && (
                <Chip
                  size="small"
                  label="현 위치"
                  color="warning"
                  sx={{ position: 'absolute', top: 4, left: 4, fontSize: 10, height: 18 }}
                />
              )}
            </Box>
          )
        })}
      </Box>

      {!isOpeningTour && (
        <Box sx={{ mt: 4 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h2" sx={{ fontSize: 18 }}>
              13 편입 슬롯 관리
            </Typography>
            <Chip label={`${filledSlotCount} / ${fillableZones.length}`} size="small" color="primary" variant="outlined" />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            항해에서 영입한 Aidong은 anchor 구역을 제외한 13개 슬롯 중 하나에 편입됩니다.
            AREA-02 항구와 AREA-13 숙소는 기능 anchor라 편입 대상이 아닙니다.
          </Typography>

          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              mb: 2,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>편입 대기 Aidong</Typography>
              {unassignedAidongs.length > 0 && (
                <Chip label={`${unassignedAidongs.length}명 대기`} size="small" color="primary" variant="outlined" />
              )}
            </Stack>
            {unassignedAidongs.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                편입할 수 있는 대기 Aidong이 없어요. 항해에서 Aidong을 영입하면 여기에 표시됩니다.
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {unassignedAidongs.map((id) => (
                  <Chip
                    key={id}
                    label={id}
                    clickable
                    color={activeIncorporationAidong === id ? 'primary' : 'default'}
                    variant={activeIncorporationAidong === id ? 'filled' : 'outlined'}
                    onClick={() => setSelectedIncorporationAidong(id)}
                  />
                ))}
              </Stack>
            )}
            {incorporationMessage && (
              <Typography variant="body2" sx={{ color: 'success.main', mt: 1.5 }}>
                {incorporationMessage}
              </Typography>
            )}
            {incorporationError && (
              <Typography variant="body2" sx={{ color: 'error.main', mt: 1.5 }}>
                {incorporationError}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 2,
            }}
          >
            {fillableZones.map((zone) => {
              const slot = getSlot(zone)
              const occupied = Boolean(slot.occupantAidongId)
              return (
                <Box
                  key={zone.areaNo}
                  sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: occupied ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 800, flex: 1 }}>
                      {zone.areaNo}
                    </Typography>
                    <Chip
                      label={occupied ? '편입됨' : '빈 슬롯'}
                      size="small"
                      color={occupied ? 'primary' : 'default'}
                      variant={occupied ? 'filled' : 'outlined'}
                    />
                  </Stack>
                  <Typography sx={{ fontWeight: 700 }}>
                    {zone.emoji} {zone.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                    {zone.activity}
                  </Typography>
                  <Divider sx={{ my: 1.25 }} />
                  {occupied ? (
                    <Typography variant="body2">
                      {slot.occupantAidongId} 편입 중
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      비어 있음
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Button size="small" variant="outlined" onClick={() => setSelected(zone)}>
                      상세
                    </Button>
                    <Button
                      size="small"
                      variant={occupied ? 'outlined' : 'contained'}
                      disabled={occupied || !activeIncorporationAidong || incorporatingAreaNo === zone.areaNo}
                      onClick={() => incorporateAidongToSlot(zone)}
                    >
                      {occupied
                        ? '편입됨'
                        : incorporatingAreaNo === zone.areaNo
                          ? '편입 중'
                          : '여기에 편입'}
                    </Button>
                  </Stack>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* 정보 모달 */}
      <Modal open={!!selected} onClose={() => setSelected(null)}>
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
            maxWidth: 480,
            outline: 'none',
            boxShadow: 24,
          }}
        >
          {selected && (
            <>
              <Typography sx={{ fontSize: 56, textAlign: 'center', mb: 1 }}>
                {isUnlocked(selected) ? selected.emoji : '🔒'}
              </Typography>
              <Typography variant="h2" sx={{ textAlign: 'center', mb: 1 }}>
                {selected.areaNo}. {selected.name}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label={PHASE_LABEL[selected.phase]}
                  size="small"
                  sx={{ bgcolor: PHASE_COLOR[selected.phase] }}
                />
                <Chip
                  label={selected.kind === 'anchor' ? 'anchor 구역' : '편입 슬롯'}
                  size="small"
                  color={selected.kind === 'anchor' ? 'warning' : 'primary'}
                  variant="outlined"
                />
              </Stack>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                  정서 상징
                </Typography>
                <Typography variant="body1">{selected.emotion}</Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                  활동
                </Typography>
                <Typography variant="body1">{selected.activity}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {isOpeningTour ? (
                  <Button variant="contained" fullWidth onClick={() => setSelected(null)}>
                    들었어요
                  </Button>
                ) : isUnlocked(selected) && ZONE_TO_GAME[selected.id] ? (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => {
                      setActiveMiniGame(ZONE_TO_GAME[selected.id]!)
                      setSelected(null)
                    }}
                  >
                    🎮 미니게임 시작
                  </Button>
                ) : isUnlocked(selected) && selected.route ? (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => {
                      setSelected(null)
                      navigate(selected.route!)
                    }}
                  >
                    이동
                  </Button>
                ) : (
                  <Button variant="outlined" fullWidth disabled>
                    {isUnlocked(selected) ? '활동 미정 (Phase 진행 필요)' : '아직 잠겨있어요'}
                  </Button>
                )}
                {!isOpeningTour && (
                  <Button variant="outlined" onClick={() => setSelected(null)}>닫기</Button>
                )}
              </Stack>
            </>
          )}
        </Box>
      </Modal>

      <MiniGameModal game={activeMiniGame} onClose={() => setActiveMiniGame(null)} />
    </Box>
  )
}
