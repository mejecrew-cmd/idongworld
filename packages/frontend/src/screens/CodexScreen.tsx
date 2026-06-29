import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from '@/components/AidongSprite'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { INITIAL_NEEDS, NEED_KEYS, calcMoodScore, moodFromScore, moodToExpression } from '@/data/needs'
import { codexStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'

const MY_IDONG_UI = '/assets/ui/myidong'
const ALL_AIDONGS: AidongCharacterId[] = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']

const NEED_LABELS: Record<string, string> = {
  hunger: '배고픔',
  energy: '체력',
  social: '교감',
  hygiene: '청결',
  fun: '즐거움',
  health: '건강',
}

const ELEMENT_ICONS = [
  'IconIdongElement01.png',
  'IconIdongElement02.png',
  'IconIdongElement03.png',
  'IconIdongElement04.png',
] as const

export const CodexScreen = () => {
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const affinities = myAidongStoreFacade.useAffinities()
  const needs = myAidongStoreFacade.useNeeds()
  const codexFullyRegistered = codexStoreFacade.useCodexFullyRegistered()

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="숙소" title="아이동 정보" showBack />

      <GameStage
        stageSx={{
          px: { xs: 2, sm: 3 },
          py: 3,
          backgroundImage: `url(${MY_IDONG_UI}/BgDeco.png)`,
          backgroundSize: '100% auto',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            width: 'min(100%, 840px)',
            mx: 'auto',
            mb: 1.5,
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box
            sx={{
              minWidth: 138,
              minHeight: 42,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: `url(${MY_IDONG_UI}/BoxIdongCount.png)`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <Typography sx={{ color: '#6b3f43', fontSize: 13, fontWeight: 900 }}>
              {recruitedAidongs.length} / {ALL_AIDONGS.length}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.75}>
            {ELEMENT_ICONS.map((icon) => (
              <Box key={icon} component="img" src={`${MY_IDONG_UI}/${icon}`} alt="" aria-hidden sx={{ width: 34, height: 34, objectFit: 'contain' }} />
            ))}
          </Stack>
        </Stack>

        <Box
          sx={{
            width: 'min(100%, 840px)',
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 1.25,
          }}
        >
          {ALL_AIDONGS.map((id) => {
            const recruited = recruitedAidongs.includes(id)
            const registered = codexFullyRegistered.includes(id)
            const affinity = affinities[id] ?? { score: 0, level: 0 }
            const currentNeeds = needs[id] ?? INITIAL_NEEDS
            const mood = moodFromScore(calcMoodScore(currentNeeds))
            const expression = recruited ? moodToExpression(mood) : 'normal'

            return (
              <Box
                key={id}
                sx={{
                  position: 'relative',
                  minHeight: { xs: 190, sm: 176 },
                  p: { xs: 1.5, sm: 2 },
                  backgroundImage: `url(${MY_IDONG_UI}/SlotIdongList.png)`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  opacity: recruited ? 1 : 0.58,
                  overflow: 'hidden',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ height: '100%', minWidth: 0 }}>
                  <Box
                    sx={{
                      position: 'relative',
                      flex: '0 0 auto',
                      width: { xs: 112, sm: 132 },
                      height: { xs: 112, sm: 132 },
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {recruited ? (
                      <AidongSprite character={id} expression={expression} size={126} />
                    ) : (
                      <Typography sx={{ fontSize: 44, fontWeight: 900, color: '#9a9187' }}>?</Typography>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75, minWidth: 0 }}>
                      <Typography
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          color: '#4d3d33',
                          fontWeight: 900,
                          fontSize: { xs: 18, sm: 21 },
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {recruited ? id : '미영입 아이동'}
                      </Typography>
                      {recruited && <Chip size="small" label={`Lv.${affinity.level}`} color="primary" />}
                    </Stack>

                    <Stack direction="row" spacing={0.75} sx={{ mb: 1.1, flexWrap: 'wrap', gap: 0.75 }}>
                      <Chip
                        size="small"
                        label={registered ? '정보 등록' : recruited ? '관찰 중' : '미영입'}
                        variant={registered ? 'filled' : 'outlined'}
                        color={registered ? 'success' : 'default'}
                      />
                      {recruited && (
                        <Box
                          sx={{
                            minWidth: 112,
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
                          <Typography sx={{ color: '#6b3f43', fontSize: 12, fontWeight: 900 }}>
                            친밀도 {affinity.score}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {recruited ? (
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.65 }}>
                        {NEED_KEYS.map((key) => (
                          <Box key={key}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                              <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#6f6258' }}>
                                {NEED_LABELS[key]}
                              </Typography>
                              <Typography sx={{ fontSize: 11, fontWeight: 900, color: '#6f6258' }}>
                                {currentNeeds[key] ?? 0}
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.max(0, Math.min(100, (currentNeeds[key] ?? 0) * 10))}
                              sx={{
                                height: 6,
                                borderRadius: 999,
                                bgcolor: 'rgba(145,113,85,0.12)',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 999,
                                  background: 'linear-gradient(90deg, #f3c35c, #3e9b8f)',
                                },
                              }}
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography sx={{ color: '#6f6258', fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>
                        항해와 섬 활동에서 만나면 정보가 표시됩니다.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Box>
            )
          })}
        </Box>
      </GameStage>
    </Box>
  )
}
