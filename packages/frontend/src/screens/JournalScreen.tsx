import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'
import { accountStoreFacade, hostStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'
import {
  DAILY_SCHEDULE,
  REWARD_DAYS,
  claimReward,
  getDailyJournalProgress,
  getScheduleKey,
  isDayComplete,
  isScheduleComplete,
  readDailyJournalState,
  writeDailyJournalState,
  type DailyJournalState,
} from '@/modules/dailyJournal'

const DIARY_UI = '/assets/ui/diary'
const COMMON_UI = '/assets/ui/common'
const JOURNAL_DAYS = 28
const CATCH_UP_DIAMOND_COST = 3

const SCHEDULE_LABELS = ['아이동 깨우기', '아침밥', '점심밥', '저녁밥', '재우기'] as const
const SCHEDULE_TIMES = ['AM 5 ~ 8', 'AM 8 ~ 11', 'PM 1 ~ 3', 'PM 5 ~ 7', 'PM 9 ~ 10'] as const
const SCHEDULE_END_HOURS = [8, 11, 15, 19, 22] as const

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function dayActAsset(index: number, complete: boolean): string {
  const assetNo = Math.min(index + 1, 5).toString().padStart(2, '0')
  return `${DIARY_UI}/DayAct${assetNo}${complete ? 'On' : 'Off'}.png`
}

function timelineX(day: number): string {
  return `${4 + (Math.max(0, Math.min(28, day)) / 28) * 92}%`
}

function isActivityUnlocked(journal: DailyJournalState, day: number, scheduleId: string): boolean {
  return isScheduleComplete(journal, day, scheduleId)
}

function getDayStatusLabel(day: number, currentDay: number): string {
  if (day === currentDay) return '오늘'
  if (day < currentDay) return '지난 기록'
  return '예정'
}

function isCatchUpAvailable(day: number, scheduleIndex: number, currentDay: number, now: number): boolean {
  if (day < currentDay) return true
  if (day > currentDay) return false
  return new Date(now).getHours() >= SCHEDULE_END_HOURS[scheduleIndex]
}

export const JournalScreen = () => {
  const uid = accountStoreFacade.useFirebaseUid()
  const gameStartedAt = accountStoreFacade.useGameStartedAt()
  const diamonds = hostStoreFacade.useDiamonds()
  const careLog = myAidongStoreFacade.useCareLog()
  const [now, setNow] = useState(() => Date.now())
  const [journal, setJournal] = useState<DailyJournalState>(() => readDailyJournalState(uid))

  useEffect(() => {
    setJournal(readDailyJournalState(uid))
  }, [uid])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const progress = getDailyJournalProgress(journal, now, gameStartedAt)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      document
        .getElementById(`journal-day-${progress.cycleDay}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [progress.cycleDay])

  useEffect(() => {
    const today = todayKey()
    const completedToday = new Set<string>()

    Object.values(careLog).forEach((characterLog) => {
      DAILY_SCHEDULE.forEach((item) => {
        const log = characterLog[item.id]
        if (log?.lastDay === today && log.todayCount > 0) completedToday.add(item.id)
      })
    })

    if (completedToday.size === 0) return

    const nextKeys = new Set(journal.completedScheduleKeys)
    completedToday.forEach((scheduleId) => {
      nextKeys.add(getScheduleKey(progress.cycleDay, scheduleId))
    })

    if (nextKeys.size === journal.completedScheduleKeys.length) return

    const nextState = {
      ...journal,
      completedScheduleKeys: Array.from(nextKeys).sort(),
    }
    setJournal(nextState)
    writeDailyJournalState(nextState, uid)
  }, [careLog, journal, progress.cycleDay, uid])

  const persist = (nextState: DailyJournalState) => {
    setJournal(nextState)
    writeDailyJournalState(nextState, uid)
  }

  const handleClaimReward = (rewardDay: number) => {
    persist(claimReward(journal, rewardDay))
  }

  const handleCatchUp = (day: number, scheduleId: string) => {
    if (diamonds < CATCH_UP_DIAMOND_COST) return
    const key = getScheduleKey(day, scheduleId)
    if (journal.completedScheduleKeys.includes(key)) return

    hostStoreFacade.mutateDiamonds(-CATCH_UP_DIAMOND_COST)
    persist({
      ...journal,
      completedScheduleKeys: [...journal.completedScheduleKeys, key].sort(),
    })
  }

  const filledX = timelineX(progress.completedStars)

  return (
    <Box sx={{ position: 'relative', p: 0, pb: 0, minHeight: 'calc(100dvh - 176px)' }}>
      {/* 화면 최하단까지 크림 캔버스가 깔리도록 고정 레이어 (스크롤 영향 없음) */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          width: `min(100%, ${GAME_STAGE_WIDTH}px)`,
          height: { xs: 170, sm: 200 },
          background: 'linear-gradient(180deg, rgba(246,236,218,0) 0%, rgba(246,236,218,0.96) 42%, rgba(246,236,218,0.96) 100%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <ScreenHeader category="숙소" title="일기" showBack />

      <GameStage
        stageSx={{
          px: { xs: 0.75, sm: 2.5 },
          pt: 2,
          pb: 2,
          background: 'linear-gradient(180deg, rgba(246,236,218,0) 0px, rgba(246,236,218,0.96) 150px, rgba(246,236,218,0.96) 300px)',
        }}
      >
        <Box sx={{ width: 'min(100%, 860px)', mx: 'auto' }}>
          <Box
            sx={{
              position: 'relative',
              height: { xs: 112, sm: 132 },
              mb: 1.2,
              borderBottom: '1px solid rgba(91,70,54,0.08)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: { xs: 8, sm: 12 },
                top: { xs: 10, sm: 14 },
                width: { xs: 64, sm: 74 },
                height: { xs: 34, sm: 38 },
                backgroundImage: `url(${DIARY_UI}/BoxStarRewardCount1.png)`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
            >
              <Typography
                sx={{
                  position: 'absolute',
                  left: '66%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#fff7d5',
                  fontSize: { xs: 15, sm: 17 },
                  fontWeight: 900,
                  textShadow: '0 1px 2px rgba(65,43,35,0.45)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {progress.completedStars}
              </Typography>
            </Box>

            <Box
              sx={{
                position: 'absolute',
                left: '4%',
                right: '4%',
                top: { xs: 56, sm: 66 },
                height: { xs: 7, sm: 8 },
                borderRadius: 999,
                bgcolor: 'rgba(198,184,166,0.56)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                left: '4%',
                top: { xs: 56, sm: 66 },
                width: `calc(${filledX} - 4%)`,
                height: { xs: 7, sm: 8 },
                borderRadius: 999,
                bgcolor: '#f38f98',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
              }}
            />

            <Box
              sx={{
                position: 'absolute',
                left: '4%',
                top: { xs: 59.5, sm: 70 },
                transform: 'translate(-50%, -50%)',
                width: { xs: 18, sm: 22 },
                height: { xs: 18, sm: 22 },
                borderRadius: '50%',
                bgcolor: '#fff',
                border: '2px solid rgba(198,184,166,0.72)',
              }}
            />

            {REWARD_DAYS.map((rewardDay) => {
              const available = progress.completedStars >= rewardDay
              const claimed = journal.claimedRewardDays.includes(rewardDay)
              const x = timelineX(rewardDay)
              return (
                <Box
                  key={rewardDay}
                  sx={{
                    position: 'absolute',
                    left: x,
                    top: { xs: 38, sm: 47 },
                    transform: 'translateX(-50%)',
                    width: { xs: 58, sm: 70 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    zIndex: 2,
                  }}
                >
                  <Button
                    size="small"
                    disabled={!available || claimed}
                    onClick={() => handleClaimReward(rewardDay)}
                    sx={{
                      minWidth: 0,
                      width: { xs: 42, sm: 50 },
                      height: { xs: 42, sm: 50 },
                      p: 0,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      top: '1px',
                      bgcolor: claimed ? 'rgba(255,252,241,0.92)' : 'transparent',
                      boxShadow: claimed ? '0 3px 8px rgba(91,70,54,0.16)' : 'none',
                      '&:hover': { bgcolor: claimed ? 'rgba(255,252,241,0.96)' : 'transparent' },
                    }}
                  >
                    {/* 받은 보상은 체크, 그 외엔 선물(받기 가능 On / 잠김 Off) — 원형 배경 안 상하좌우 중앙 */}
                    {claimed ? (
                      <Box
                        component="img"
                        src={`${COMMON_UI}/IconCheck.png`}
                        alt=""
                        aria-hidden
                        sx={{ width: '52%', height: '52%', objectFit: 'contain', display: 'block' }}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={`${DIARY_UI}/${available ? 'BtnRewardGetOn' : 'BtnRewardGetOff'}.png`}
                        alt=""
                        aria-hidden
                        sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    )}
                  </Button>
                  <Box
                    sx={{
                      position: 'relative',
                      width: { xs: 48, sm: 58 },
                      height: { xs: 22, sm: 26 },
                      mx: 'auto',
                      mt: 0.3,
                      backgroundImage: `url(${DIARY_UI}/BoxStarRewardCount2.png)`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    <Typography
                      sx={{
                        position: 'absolute',
                        left: '66%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#7a5649',
                        fontSize: { xs: 10, sm: 12 },
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {rewardDay}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: { xs: 0.8, sm: 1 } }}>
            {Array.from({ length: JOURNAL_DAYS }, (_, index) => {
              const day = index + 1
              const dayComplete = isDayComplete(journal, day)
              const currentDay = day === progress.cycleDay
              const visibleSchedule = DAILY_SCHEDULE.slice(0, 5)
              const completedCount = visibleSchedule.filter((item) => isActivityUnlocked(journal, day, item.id)).length
              const statusLabel = getDayStatusLabel(day, progress.cycleDay)

              return (
                <Box
                  key={day}
                  id={`journal-day-${day}`}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1016 / 295',
                    backgroundImage: `url(${DIARY_UI}/DiarylistSlot.png)`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: currentDay ? 'drop-shadow(0 8px 18px rgba(242,127,117,0.18))' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  <Typography
                    sx={{
                      position: 'absolute',
                      left: { xs: '20.1%', sm: '19.4%' },
                      top: '15%',
                      transform: 'translate(-50%, -50%)',
                      minWidth: 34,
                      color: '#6b3f43',
                      fontSize: { xs: 19, sm: 27 },
                      fontWeight: 900,
                      lineHeight: 1,
                      textAlign: 'center',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {day}
                  </Typography>
                  <Typography
                    sx={{
                      position: 'absolute',
                      left: { xs: '29.5%', sm: '28.5%' },
                      top: '15%',
                      transform: 'translateY(-50%)',
                      color: currentDay ? '#f08a90' : day < progress.cycleDay ? '#8a796a' : '#b7aa9b',
                      fontSize: { xs: 8.5, sm: 12 },
                      fontWeight: 900,
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusLabel}
                  </Typography>

                  <Typography
                    sx={{
                      position: 'absolute',
                      top: '15%',
                      left: '94.5%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1,
                      color: '#fff7d5',
                      fontSize: { xs: 15, sm: 20 },
                      fontWeight: 900,
                      lineHeight: 1,
                      textAlign: 'center',
                      textShadow: '0 1px 2px rgba(65,43,35,0.45)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {dayComplete ? 5 : completedCount}
                  </Typography>
                  <Typography
                    sx={{
                      position: 'absolute',
                      top: '15%',
                      right: { xs: '14.5%', sm: '13.5%' },
                      transform: 'translateY(-50%)',
                      zIndex: 1,
                      color: '#5c4038',
                      fontSize: { xs: 12, sm: 17 },
                      fontWeight: 900,
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    기록 완료 보상
                  </Typography>

                  <Box
                    sx={{
                      position: 'absolute',
                      left: '3%',
                      right: '2.5%',
                      top: '30%',
                      bottom: '8%',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                      columnGap: { xs: 0.35, sm: 0.75 },
                    }}
                  >
                    {visibleSchedule.map((item, scheduleIndex) => {
                      const complete = isActivityUnlocked(journal, day, item.id)
                      const canCatchUp = !complete && isCatchUpAvailable(day, scheduleIndex, progress.cycleDay, now)
                      return (
                        <Box
                          key={item.id}
                          sx={{
                            position: 'relative',
                            minWidth: 0,
                            textAlign: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          <Typography
                            sx={{
                              position: 'absolute',
                              left: '8%',
                              right: '8%',
                              top: '7%',
                              transform: 'translateY(-50%)',
                              color: '#a18876',
                              fontSize: { xs: 7.4, sm: 10 },
                              fontWeight: 900,
                              lineHeight: 1.05,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              textAlign: 'center',
                            }}
                          >
                            {SCHEDULE_TIMES[scheduleIndex]}
                          </Typography>
                          <Box
                            component="img"
                            src={dayActAsset(scheduleIndex, complete)}
                            alt=""
                            aria-hidden
                            sx={{
                              position: 'absolute',
                              left: '50%',
                              top: '60%',
                              transform: 'translate(-50%, -50%)',
                              width: { xs: 'min(12vw, 54px)', sm: 72 },
                              height: { xs: 'min(12vw, 54px)', sm: 72 },
                              objectFit: 'contain',
                            }}
                          />
                          {complete ? (
                            <Box
                              component="img"
                              src={`${COMMON_UI}/IconCheck.png`}
                              alt=""
                              aria-hidden
                              sx={{
                                position: 'absolute',
                                left: '50%',
                                bottom: { xs: '3%', sm: '4%' },
                                transform: 'translateX(-50%)',
                                width: { xs: 17, sm: 23 },
                                height: { xs: 17, sm: 23 },
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 2px 3px rgba(79,54,45,0.22))',
                              }}
                            />
                          ) : canCatchUp ? (
                            <Box
                              component="button"
                              type="button"
                              onClick={() => handleCatchUp(day, item.id)}
                              aria-label={`${SCHEDULE_LABELS[scheduleIndex] ?? item.label} 다이아로 완료`}
                              sx={{
                                position: 'absolute',
                                left: '50%',
                                top: '82%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 2,
                                width: { xs: 'min(18vw, 86px)', sm: 106 },
                                height: { xs: 'min(9vw, 43px)', sm: 52 },
                                display: 'block',
                                border: 0,
                                backgroundImage: `url(${DIARY_UI}/BtnDayActOn.png)`,
                                backgroundSize: '100% 100%',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                bgcolor: 'transparent',
                                filter: 'none',
                                cursor: 'pointer',
                                p: 0,
                                '&:hover': {
                                  bgcolor: 'transparent',
                                  filter: 'brightness(1.03)',
                                },
                              }}
                            >
                              <Typography
                                sx={{
                                  position: 'absolute',
                                  left: '68.5%',
                                  top: '38%',
                                  transform: 'translate(-50%, -50%)',
                                  color: '#fffefa',
                                  fontSize: { xs: 18, sm: 24 },
                                  fontWeight: 900,
                                  lineHeight: 1,
                                  textShadow: '0 1px 2px rgba(129,59,76,0.45)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {CATCH_UP_DIAMOND_COST}
                              </Typography>
                            </Box>
                          ) : null}
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      </GameStage>
    </Box>
  )
}
