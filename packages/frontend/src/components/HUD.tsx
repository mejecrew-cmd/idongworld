import { useMemo, useState } from 'react'
import { Alert, Box, IconButton, Snackbar, Tooltip, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  accountStoreFacade,
  hostStoreFacade,
  myAidongStoreFacade,
} from '@/lib/storeFacades'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

type HudCurrency = {
  label: string
  value: number
  mark: string
  tone: string
  description: string
}

type InventoryCurrencyRule = {
  match: string
  itemId: string
  label: string
  mark: string
  tone: string
}

const MODULE_CURRENCY_BY_PATH: InventoryCurrencyRule[] = [
  { match: '/island/garden', itemId: 'acorn', label: '도토리', mark: 'D', tone: '#6daa62' },
  { match: '/island/mine', itemId: 'ore', label: '광석', mark: 'O', tone: '#5c7890' },
  { match: '/island/memory', itemId: 'memory_piece', label: '기억', mark: 'M', tone: '#8b70b8' },
  { match: '/island/oasis', itemId: 'rest_token', label: '휴식권', mark: 'R', tone: '#67bda4' },
]

function getDayCount(startedAt?: number): number {
  if (!startedAt) return 1
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.max(1, Math.floor((Date.now() - startedAt) / msPerDay) + 1)
}

function getProfileLevelName(recruitedCount: number, onboardingComplete: boolean): string {
  if (recruitedCount >= 5) return 'Lv.4 하트섬 리더'
  if (recruitedCount >= 3) return 'Lv.3 아이동 메이트'
  if (recruitedCount >= 1) return 'Lv.2 섬지기'
  if (onboardingComplete) return 'Lv.1 새싹 호스트'
  return 'Lv.0 첫 방문'
}

function getModuleCurrency(
  pathname: string,
  inventory: Record<string, number>,
  coins: number,
  diceCount: number,
): HudCurrency {
  if (pathname.startsWith('/voyage/board') || pathname.startsWith('/voyage/neighbor')) {
    return {
      label: '주사위',
      value: diceCount,
      mark: '🎲',
      tone: '#5c7890',
      description: '항해 보드에서 이동할 때 1개씩 사용합니다.',
    }
  }

  const moduleCurrency = MODULE_CURRENCY_BY_PATH.find((rule) => pathname.startsWith(rule.match))

  if (moduleCurrency) {
    return {
      label: moduleCurrency.label,
      value: inventory[moduleCurrency.itemId] ?? 0,
      mark: moduleCurrency.mark,
      tone: moduleCurrency.tone,
      description: `${moduleCurrency.label} 모듈에서 얻고 사용하는 전용 재화입니다.`,
    }
  }

  return {
    label: '코인',
    value: coins,
    mark: 'C',
    tone: '#e0a742',
    description: '마이섬의 구매와 케어에 사용하는 기본 재화입니다.',
  }
}

export const HUD = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [notificationOpen, setNotificationOpen] = useState(false)

  const hostName = accountStoreFacade.useHostName()
  const nickname = accountStoreFacade.useNickname()
  const gameStartedAt = accountStoreFacade.useGameStartedAt()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const coins = hostStoreFacade.useCoins()
  const diamonds = hostStoreFacade.useDiamonds()
  const diceCount = hostStoreFacade.useDiceCount()
  const inventory = hostStoreFacade.useInventory()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()

  const displayName = hostName || nickname || '게스트'
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase() || 'I'
  const levelName = getProfileLevelName(recruitedAidongs.length, onboardingComplete)
  const dayCount = getDayCount(gameStartedAt)
  const moduleCurrency = useMemo(
    () => getModuleCurrency(location.pathname, inventory, coins, diceCount),
    [location.pathname, inventory, coins, diceCount],
  )

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: { xs: 8, sm: 12 },
          left: '50%',
          width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 24px)' },
          maxWidth: GAME_STAGE_WIDTH,
          transform: 'translateX(-50%)',
          minHeight: 56,
          px: { xs: 0.75, sm: 1.25 },
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, sm: 0.9 },
          overflow: 'hidden',
          color: 'text.primary',
          bgcolor: 'rgba(255,254,250,0.92)',
          border: '1px solid rgba(62,155,143,0.18)',
          borderRadius: 2,
          boxShadow: '0 12px 28px rgba(66,86,80,0.12)',
          backdropFilter: 'blur(16px) saturate(1.18)',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            flex: '1 1 auto',
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.65, sm: 0.9 },
          }}
        >
          <Box
            sx={{
              width: { xs: 38, sm: 42 },
              height: { xs: 38, sm: 42 },
              flex: '0 0 auto',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: '#fffefa',
              fontSize: { xs: 17, sm: 19 },
              fontWeight: 900,
              background:
                'linear-gradient(135deg, #3e9b8f 0%, #67bda4 48%, #f27f75 100%)',
              boxShadow:
                'inset 0 0 0 2px rgba(255,255,255,0.72), 0 9px 18px rgba(62,155,143,0.22)',
            }}
          >
            {profileInitial}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: { xs: 12, sm: 13 },
                fontWeight: 900,
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </Typography>
            <Typography
              sx={{
                mt: 0.25,
                fontSize: { xs: 9.5, sm: 10.5 },
                color: 'text.secondary',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {levelName} · Day {dayCount}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: { xs: 0.45, sm: 0.6 },
          }}
        >
          <HudCurrencyItem
            label="다이아"
            value={diamonds}
            mark="◆"
            tone="#f27f75"
            description="전체 계정에 유지되는 프리미엄 재화입니다."
          />
          <HudCurrencyItem {...moduleCurrency} />

          <Tooltip title="알림">
            <IconButton
              aria-label="알림"
              size="small"
              onClick={() => setNotificationOpen(true)}
              sx={iconButtonSx}
            >
              !
            </IconButton>
          </Tooltip>

          <Tooltip title="설정">
            <IconButton
              aria-label="설정"
              size="small"
              onClick={() => navigate('/setting')}
              sx={iconButtonSx}
            >
              S
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Snackbar
        open={notificationOpen}
        autoHideDuration={1800}
        onClose={() => setNotificationOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" variant="filled" onClose={() => setNotificationOpen(false)}>
          알림 기능 구현중입니다.
        </Alert>
      </Snackbar>
    </>
  )
}

const iconButtonSx = {
  width: { xs: 30, sm: 32 },
  height: { xs: 30, sm: 32 },
  flex: '0 0 auto',
  borderRadius: 1.5,
  color: 'primary.main',
  bgcolor: 'rgba(62,155,143,0.08)',
  border: '1px solid rgba(62,155,143,0.16)',
  fontSize: 14,
  fontWeight: 900,
  '&:hover': {
    bgcolor: 'rgba(62,155,143,0.15)',
  },
} as const

const HudCurrencyItem = ({ label, value, mark, tone, description }: HudCurrency) => (
  <Tooltip title={`${label}: ${description}`}>
    <Box
      sx={{
        height: 34,
        minWidth: { xs: 48, sm: 60 },
        maxWidth: { xs: 64, sm: 76 },
        px: { xs: 0.55, sm: 0.75 },
        display: 'flex',
        alignItems: 'center',
        gap: 0.45,
        borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.74)',
        border: `1px solid ${tone}33`,
        overflow: 'hidden',
        cursor: 'help',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 18,
          height: 18,
          flex: '0 0 18px',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: tone,
          color: '#fffefa',
          fontSize: 9,
          fontWeight: 900,
        }}
      >
        {mark}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: { xs: 8, sm: 9 },
            color: 'text.secondary',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            color: tone,
            fontSize: { xs: 11, sm: 13 },
            fontWeight: 900,
            lineHeight: 1.2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  </Tooltip>
)
