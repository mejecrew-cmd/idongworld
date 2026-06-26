import { useEffect, useState } from 'react'
import { Alert, Box, LinearProgress, Stack, Typography } from '@mui/material'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { api } from '@/lib/api'
import {
  accountStoreFacade,
  hostStoreFacade,
  myAidongStoreFacade,
} from '@/lib/storeFacades'

const HOME_UI = '/assets/ui/home'
const MAIN_UI = '/assets/ui/main'
const MS_PER_DAY = 1000 * 60 * 60 * 24

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

// 디버그 패널·일정표·HUD와 동일 기준(gameStartedAt)으로 현재 Day를 계산한다.
function getDayCount(startedAt?: number): number {
  if (!startedAt) return 1
  return Math.max(1, Math.floor((Date.now() - startedAt) / MS_PER_DAY) + 1)
}

// HUD의 레벨 산정과 동일한 규칙.
function getLevelLabel(recruitedCount: number, onboardingComplete: boolean): string {
  if (recruitedCount >= 5) return 'Lv.4'
  if (recruitedCount >= 3) return 'Lv.3'
  if (recruitedCount >= 1) return 'Lv.2'
  if (onboardingComplete) return 'Lv.1'
  return 'Lv.0'
}

/** 핑크 레벨 태그 */
const LevelTag = ({ label }: { label: string }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      height: 24,
      px: 1.25,
      borderRadius: 1.5,
      bgcolor: '#f08a90',
      color: '#fffefa',
      fontWeight: 900,
      fontSize: 12,
      lineHeight: 1,
    }}
  >
    {label}
  </Box>
)

/** 섹션 헤더 바 */
const SectionBar = ({ title }: { title: string }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minHeight: 40,
      px: 2,
      mb: 1.25,
      borderRadius: 2,
      bgcolor: '#4a3b35',
      boxShadow: '0 4px 10px rgba(74,59,53,0.18)',
    }}
  >
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f3c35c' }} />
    <Typography sx={{ fontWeight: 900, fontSize: 15, color: '#fffefa', letterSpacing: 0.5 }}>
      {title}
    </Typography>
  </Box>
)

/** 정보 행 (베이지 알약) */
const InfoRow = ({
  label,
  value,
  iconSrc,
}: {
  label: string
  value: string | number
  iconSrc?: string
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      minHeight: 48,
      px: 2,
      borderRadius: 999,
      bgcolor: '#e7dccd',
    }}
  >
    {iconSrc && (
      <Box component="img" src={iconSrc} alt="" aria-hidden sx={{ width: 24, height: 24, objectFit: 'contain' }} />
    )}
    <Typography sx={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#6b5440' }}>
      {label}
    </Typography>
    <Typography sx={{ fontWeight: 900, fontSize: 15, color: '#5b4636', fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
  </Box>
)

export const MyRoomScreen = () => {
  const uid = accountStoreFacade.useFirebaseUid()
  const nickname = accountStoreFacade.useNickname()
  const hostName = accountStoreFacade.useHostName()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const gameStartedAt = accountStoreFacade.useGameStartedAt()
  const coins = hostStoreFacade.useCoins()
  const diamonds = hostStoreFacade.useDiamonds()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const affinities = myAidongStoreFacade.useAffinities()
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        if (!cancelled) setError('서버 정보를 불러오지 못해 로컬 정보로 표시합니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  const account = asRecord(summary?.account)
  const host = asRecord(summary?.host)
  const aidongs = asRecord(summary?.aidongs)
  const displayName = String(account.nickname ?? nickname ?? account.hostName ?? hostName ?? '내 정보')
  const displayCoins = Number(host.coins ?? coins)
  const displayDiamonds = Number(host.diamonds ?? diamonds)
  const displayAidongs = Array.isArray(aidongs.recruitedAidongs)
    ? aidongs.recruitedAidongs as string[]
    : recruitedAidongs
  const dayCount = getDayCount(gameStartedAt)
  const levelLabel = getLevelLabel(displayAidongs.length, onboardingComplete)

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="마이룸" title="내 정보" subtitle={displayName} showBack />

      <GameStage
        stageSx={{
          px: { xs: 2, sm: 2.5 },
          py: 3,
          backgroundImage: `url(${HOME_UI}/BgDeco.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        {/* 프로필 헤더 (ProfileBg) */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 460,
            mx: 'auto',
            aspectRatio: '498 / 188',
            mb: 2.5,
            backgroundImage: `url(${MAIN_UI}/ProfileBg.png)`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <Typography
            sx={{
              position: 'absolute',
              left: '38%',
              top: '34%',
              width: '56%',
              transform: 'translateY(-50%)',
              color: '#5c3f3f',
              fontSize: { xs: 15, sm: 18 },
              fontWeight: 900,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayName}
          </Typography>
          <Typography
            sx={{
              position: 'absolute',
              left: '38%',
              top: '58%',
              width: '56%',
              transform: 'translateY(-50%)',
              color: '#9a7b6b',
              fontSize: { xs: 11, sm: 13 },
              fontWeight: 800,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            Day {dayCount}
          </Typography>
          <Typography
            sx={{
              position: 'absolute',
              left: '19%',
              top: '85%',
              transform: 'translate(-50%, -50%)',
              display: 'inline-block',
              maxWidth: '32%',
              color: '#fffefa',
              fontSize: { xs: 11, sm: 13 },
              fontWeight: 900,
              lineHeight: 1,
              textAlign: 'center',
              textShadow: '0 1px 1px rgba(84,54,54,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            {levelLabel}
          </Typography>
        </Box>

        {/* 보유 재화 */}
        <SectionBar title="보유 재화" />
        <Stack spacing={1} sx={{ mb: 3 }}>
          <InfoRow label="코인" value={displayCoins} iconSrc={`${MAIN_UI}/IconGold.png`} />
          <InfoRow label="다이아" value={displayDiamonds} iconSrc={`${MAIN_UI}/IconDia.png`} />
        </Stack>

        {/* 함께하는 아이동 */}
        <SectionBar title={`함께하는 아이동 (${displayAidongs.length})`} />
        {displayAidongs.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', px: 1 }}>
            아직 함께하는 아이동이 없습니다.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {displayAidongs.map((id) => {
              const affinity = affinities[id]
              return (
                <Box
                  key={id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    minHeight: 48,
                    px: 2,
                    borderRadius: 999,
                    bgcolor: '#e7dccd',
                  }}
                >
                  <Typography sx={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#6b5440' }}>
                    {id}
                  </Typography>
                  {affinity && <LevelTag label={`Lv.${affinity.level}`} />}
                </Box>
              )
            })}
          </Stack>
        )}
      </GameStage>
    </Box>
  )
}
