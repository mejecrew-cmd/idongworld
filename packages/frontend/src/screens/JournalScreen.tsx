import { useEffect, useState } from 'react'
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'
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

const JOURNAL_DAYS = 28
const MILESTONE_SIZE = 32
const MARKER_PADDING = MILESTONE_SIZE / 2

function getTrackPosition(day: number): string {
  return `${((day - 1) / (JOURNAL_DAYS - 1)) * 100}%`
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export const JournalScreen = () => {
  const uid = accountStoreFacade.useFirebaseUid()
  const careLog = myAidongStoreFacade.useCareLog()
  const [journal, setJournal] = useState<DailyJournalState>(() => readDailyJournalState(uid))

  useEffect(() => {
    setJournal(readDailyJournalState(uid))
  }, [uid])

  const progress = getDailyJournalProgress(journal)

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

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="일지" title="활동 일지" subtitle="28일 사이클" showBack />
      <GameStage stageSx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h1" sx={{ fontSize: 22, flex: 1, minWidth: 180 }}>
            28일 일정표
          </Typography>
          <Chip label={`★ ${progress.completedStars} / ${progress.totalStars}`} color="primary" variant="outlined" />
        </Stack>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          하루 5개 일정을 모두 완료하면 별 하나를 얻습니다. 완료 상태는 아이동 케어 기록에 따라 자동으로 반영됩니다.
        </Typography>

        <Box sx={{ mb: 2.5 }}>
          <Box
            sx={{
              position: 'relative',
              height: 56,
              px: `${MARKER_PADDING}px`,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: `${MARKER_PADDING}px`,
                right: `${MARKER_PADDING}px`,
                top: 32,
                zIndex: 1,
              }}
            >
              <LinearProgress
                variant="determinate"
                value={progress.percent}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            <Box
              sx={{
                position: 'absolute',
                left: `${MARKER_PADDING}px`,
                right: `${MARKER_PADDING}px`,
                top: 0,
                height: 56,
                zIndex: 3,
              }}
            >
              {REWARD_DAYS.map((rewardDay) => {
                const available = progress.completedStars >= rewardDay
                const claimed = journal.claimedRewardDays.includes(rewardDay)
                return (
                  <Box
                    component="button"
                    key={rewardDay}
                    disabled={!available || claimed}
                    onClick={() => handleClaimReward(rewardDay)}
                    sx={{
                      position: 'absolute',
                      left: getTrackPosition(rewardDay),
                      top: 36,
                      minWidth: MILESTONE_SIZE,
                      width: MILESTONE_SIZE,
                      height: MILESTONE_SIZE,
                      maxWidth: MILESTONE_SIZE,
                      maxHeight: MILESTONE_SIZE,
                      p: 0,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      border: '1px solid',
                      borderColor: available && !claimed ? 'primary.main' : 'divider',
                      fontSize: 12,
                      fontWeight: 900,
                      lineHeight: 1,
                      bgcolor: available && !claimed ? 'primary.main' : 'background.paper',
                      color: available && !claimed ? 'primary.contrastText' : 'text.secondary',
                      boxShadow: '0 4px 10px rgba(39,51,51,0.16)',
                      cursor: available && !claimed ? 'pointer' : 'default',
                      display: 'grid',
                      placeItems: 'center',
                      appearance: 'none',
                      boxSizing: 'border-box',
                      zIndex: 5,
                      '&:disabled': {
                        opacity: 1,
                      },
                    }}
                  >
                    {claimed ? '★' : rewardDay}
                  </Box>
                )
              })}

              <Box
                sx={{
                  position: 'absolute',
                  left: getTrackPosition(progress.cycleDay),
                  top: 36,
                  width: 22,
                  height: 22,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  zIndex: 4,
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  border: '2px solid #fffefa',
                  boxShadow: '0 4px 10px rgba(39,51,51,0.2)',
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                ★
              </Box>
            </Box>
          </Box>

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{
              mt: 0.75,
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              현재 위치: Day {progress.cycleDay}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              남은 기간 {progress.remainingDays}일
            </Typography>
          </Stack>
        </Box>

        <Stack spacing={1.25}>
          {Array.from({ length: JOURNAL_DAYS }, (_, index) => {
            const day = index + 1
            const dayComplete = isDayComplete(journal, day)
            const currentDay = day === progress.cycleDay
            return (
              <Box
                key={day}
                id={`journal-day-${day}`}
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: dayComplete ? 'primary.main' : currentDay ? 'secondary.main' : 'divider',
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 900, flex: 1 }}>
                    Day {day}
                  </Typography>
                  {currentDay && <Chip size="small" label="진행 중" color="secondary" variant="outlined" />}
                  {dayComplete && <Chip size="small" label="★ 완료" color="primary" />}
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gap: 0.75,
                  }}
                >
                  {DAILY_SCHEDULE.map((item) => {
                    const complete = isScheduleComplete(journal, day, item.id)
                    return (
                      <Box
                        key={item.id}
                        sx={{
                          minHeight: 48,
                          borderRadius: 1.25,
                          border: '1px solid',
                          borderColor: complete ? 'primary.main' : 'divider',
                          bgcolor: complete ? 'rgba(62,155,143,0.1)' : 'background.default',
                          p: 0.75,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.25,
                          cursor: 'default',
                          textAlign: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <Typography
                          sx={{
                            width: '100%',
                            minWidth: 0,
                            fontWeight: 800,
                            fontSize: 12,
                            lineHeight: 1.15,
                          }}
                        >
                          {item.label}
                        </Typography>
                        <Typography sx={{ color: complete ? 'primary.main' : 'transparent', fontWeight: 900, lineHeight: 1 }}>
                          ✓
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )
          })}
        </Stack>
      </GameStage>
    </Box>
  )
}
