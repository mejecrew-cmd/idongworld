import { useState } from 'react'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from '@/components/AidongSprite'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { AIDONG_CATALOG, AIDONG_CATALOG_COUNT, getAidongDefaultDisplayName } from '@/data/aidongs'
import { INITIAL_NEEDS, calcCareSurface, calcMoodScore, moodFromScore, moodToExpression, type CareSurfaceKey } from '@/data/needs'
import { codexStoreFacade, myAidongStoreFacade, myIslandStoreFacade } from '@/lib/storeFacades'

const MY_IDONG_UI = '/assets/ui/myidong'
const MY_INFO_UI = '/assets/ui/myinfo'

const CARE_STATUS_ITEMS: Array<{ key: CareSurfaceKey; label: string; icon: string }> = [
  { key: 'hunger', label: '배고픔', icon: 'IconIdongElement01.png' },
  { key: 'clean', label: '청결(안락도)', icon: 'IconIdongElement02.png' },
  { key: 'mood', label: '기분', icon: 'IconIdongElement03.png' },
  { key: 'energy', label: '에너지', icon: 'IconIdongElement04.png' },
]

const CARE_STATUS_COLORS: Record<CareSurfaceKey, string> = {
  hunger: '#f2b85b',
  clean: '#73c5bf',
  mood: '#ef8da6',
  energy: '#76b86f',
}

const careStatusLevel = (value: number) => Math.max(1, Math.min(5, Math.ceil(value / 2)))

export const CodexScreen = () => {
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const aidongDisplayNames = myAidongStoreFacade.useAidongDisplayNames()
  const affinities = myAidongStoreFacade.useAffinities()
  const needs = myAidongStoreFacade.useNeeds()
  const zoneSlots = myIslandStoreFacade.useZoneSlots()
  const codexFullyRegistered = codexStoreFacade.useCodexFullyRegistered()
  const [displayNameTarget, setDisplayNameTarget] = useState<AidongCharacterId | null>(null)
  const [displayNameDraft, setDisplayNameDraft] = useState('')

  const openDisplayNameEditor = (id: AidongCharacterId) => {
    setDisplayNameTarget(id)
    setDisplayNameDraft(aidongDisplayNames[id] ?? getAidongDefaultDisplayName(id))
  }

  const closeDisplayNameEditor = () => {
    setDisplayNameTarget(null)
    setDisplayNameDraft('')
  }

  const saveDisplayName = () => {
    if (!displayNameTarget) return
    myAidongStoreFacade.setAidongDisplayName(displayNameTarget, displayNameDraft)
    closeDisplayNameEditor()
  }

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="숙소" title="아이동 정보" showBack />

      <GameStage
        stageSx={{
          position: 'relative',
          px: { xs: 2, sm: 3 },
          py: 3,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${MY_IDONG_UI}/BgDeco.png)`,
            backgroundSize: '118% auto',
            backgroundPosition: 'center -10px',
            backgroundRepeat: 'no-repeat',
            opacity: 0.18,
            pointerEvents: 'none',
          },
          '& > *': {
            position: 'relative',
            zIndex: 1,
          },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            width: 'min(100%, 840px)',
            mx: 'auto',
            mb: 1.25,
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box
            sx={{
              minWidth: 132,
              minHeight: 40,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              justifySelf: 'flex-end',
              borderRadius: 999,
              bgcolor: 'rgba(255, 250, 243, 0.9)',
              border: '1px solid rgba(118, 86, 68, 0.14)',
              boxShadow: '0 4px 10px rgba(91, 65, 49, 0.08)',
            }}
          >
            <Typography sx={{ color: '#6a4b3d', fontSize: 13, fontWeight: 900, lineHeight: 1 }}>
              {recruitedAidongs.length} / {AIDONG_CATALOG_COUNT}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            width: 'min(100%, 840px)',
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: { xs: 1, sm: 1.15 },
          }}
        >
          {AIDONG_CATALOG.map((aidong) => {
            const id = aidong.id
            const recruited = recruitedAidongs.includes(id)
            const registered = codexFullyRegistered.includes(id)
            const affinity = affinities[id] ?? { score: 0, level: 0 }
            const currentNeeds = needs[id] ?? INITIAL_NEEDS
            const moodScore = calcMoodScore(currentNeeds)
            const mood = moodFromScore(moodScore)
            const expression = recruited ? moodToExpression(mood) : 'normal'
            const careStatus = calcCareSurface(currentNeeds, moodScore)
            const placedInLodge = Object.values(zoneSlots).some((slot) => slot.occupantAidongId === id)
            const locationLabel = recruited ? (placedInLodge ? '숙소' : '마당') : '미영입'
            const defaultDisplayName = aidong.defaultDisplayName
            const displayName = recruited ? (aidongDisplayNames[id]?.trim() || defaultDisplayName) : '미영입 아이동'

            return (
              <Box
                key={id}
                sx={{
                  position: 'relative',
                  minHeight: { xs: 154, sm: 146 },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 1.4, sm: 1.5 },
                  borderRadius: 4,
                  bgcolor: 'rgba(255, 251, 246, 0.92)',
                  border: '1px solid rgba(116, 79, 62, 0.1)',
                  boxShadow: '0 6px 14px rgba(90, 64, 48, 0.08)',
                  opacity: recruited ? 1 : 0.58,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateColumns: { xs: '82px minmax(0, 1fr)', sm: '100px minmax(0, 1fr)' },
                    alignItems: 'center',
                    columnGap: { xs: 1.25, sm: 1.75 },
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      width: { xs: 82, sm: 100 },
                      height: { xs: 102, sm: 112 },
                      display: 'grid',
                      placeItems: 'center',
                      justifySelf: 'center',
                      transform: { xs: 'translateY(-5px)', sm: 'translateY(-7px)' },
                    }}
                  >
                    {recruited ? (
                      <AidongSprite character={id} expression={expression} size={102} />
                    ) : (
                      <Typography sx={{ fontSize: 40, fontWeight: 900, color: '#9a9187', lineHeight: 1 }}>?</Typography>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0, alignSelf: 'center' }}>
                    <Stack direction="row" spacing={0.65} alignItems="center" sx={{ mb: 0.45, minWidth: 0 }}>
                      <Box sx={{ minWidth: 0, maxWidth: { xs: '52%', sm: '62%' } }}>
                        <Typography
                          sx={{
                            color: '#4d3d33',
                            fontWeight: 900,
                            fontSize: { xs: 17, sm: 19 },
                            lineHeight: 1.1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {displayName}
                        </Typography>
                      </Box>
                      {recruited && (
                        <Box
                          component="button"
                          type="button"
                          aria-label={`${displayName} 이름 수정`}
                          onClick={() => openDisplayNameEditor(id)}
                          sx={{
                            ml: 'auto',
                            flex: '0 0 auto',
                            width: 24,
                            height: 24,
                            p: 0,
                            border: 0,
                            bgcolor: 'transparent',
                            cursor: 'pointer',
                            backgroundImage: `url(${MY_INFO_UI}/BtnNicknameEdit.png)`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundSize: 'contain',
                            '&:hover': { filter: 'brightness(1.04)' },
                          }}
                        />
                      )}
                      {recruited && <Chip size="small" label={`Lv.${affinity.level}`} sx={{ height: 22, bgcolor: '#f27f86', color: '#fff', fontWeight: 900, '& .MuiChip-label': { px: 0.9 } }} />}
                    </Stack>

                    <Stack direction="row" spacing={0.65} sx={{ mb: 0.8, alignItems: 'center', flexWrap: 'wrap', gap: 0.65 }}>
                      <Chip
                        size="small"
                        label={locationLabel}
                        variant={registered ? 'filled' : 'outlined'}
                        color={placedInLodge ? 'success' : 'default'}
                        sx={{ height: 22, fontWeight: 800, '& .MuiChip-label': { px: 0.9 } }}
                      />
                      {recruited && (
                        <Box
                          sx={{
                            width: 90,
                            height: 30,
                            px: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundImage: `url(${MY_IDONG_UI}/BoxAffection.png)`,
                            backgroundSize: '100% 100%',
                            backgroundRepeat: 'no-repeat',
                          }}
                        >
                          <Typography sx={{ color: '#6b3f43', fontSize: 11, fontWeight: 900, lineHeight: 1, pl: 1.4 }}>
                            친밀도 {affinity.score}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {recruited ? (
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, columnGap: 1, rowGap: 0.5 }}>
                        {CARE_STATUS_ITEMS.map((item) => (
                          <Stack key={item.key} direction="row" alignItems="center" spacing={0.55} sx={{ minWidth: 0, height: 20 }}>
                            <Box component="img" src={`${MY_IDONG_UI}/${item.icon}`} alt="" aria-hidden sx={{ width: 17, height: 17, objectFit: 'contain', flex: '0 0 auto' }} />
                            <Typography sx={{ width: { xs: 70, sm: 78 }, flex: '0 0 auto', fontSize: 10.5, fontWeight: 900, color: '#6f6258', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.label}
                            </Typography>
                            <Stack direction="row" spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                              {Array.from({ length: 5 }, (_, index) => {
                                const active = index < careStatusLevel(careStatus[item.key] ?? 0)
                                return (
                                  <Box
                                    key={index}
                                    sx={{
                                      width: { xs: 8, sm: 10 },
                                      height: 5,
                                      borderRadius: 999,
                                      bgcolor: active ? CARE_STATUS_COLORS[item.key] : 'rgba(130, 99, 76, 0.13)',
                                      opacity: active ? 1 : 0.55,
                                    }}
                                  />
                                )
                              })}
                            </Stack>
                          </Stack>
                        ))}
                      </Box>
                    ) : (
                      <Typography sx={{ color: '#6f6258', fontSize: { xs: 12.5, sm: 13 }, fontWeight: 800, lineHeight: 1.45 }}>
                        항해와 섬 활동에서 만나면 정보가 표시됩니다.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      </GameStage>

      <Dialog open={Boolean(displayNameTarget)} onClose={closeDisplayNameEditor} maxWidth="xs" fullWidth disableScrollLock>
        <DialogTitle sx={{ fontWeight: 900, color: '#5d4538' }}>아이동 이름</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="이름"
            value={displayNameDraft}
            onChange={(event) => setDisplayNameDraft(event.target.value.slice(0, 10))}
            placeholder={displayNameTarget ?? ''}
            helperText="비워두거나 기본 이름과 같으면 기본값으로 표시됩니다."
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDisplayNameEditor}>취소</Button>
          <Button variant="contained" onClick={saveDisplayName}>저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
