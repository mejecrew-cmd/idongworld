import { useMemo, useState } from 'react'
import { Alert, Box, IconButton, Snackbar, Tooltip, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  accountStoreFacade,
  hostStoreFacade,
  myAidongStoreFacade,
} from '@/lib/storeFacades'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const MAIN_UI_ASSET = '/assets/ui/main'

type HudCurrency = {
  label: string
  value: number
  mark: string
  tone: string
  description: string
  iconSrc?: string
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

const VOYAGE_SHELL_ITEM_ID = 'voyage-shell'

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
): HudCurrency {
  if (pathname.startsWith('/voyage/board') || pathname.startsWith('/voyage/neighbor')) {
    return {
      label: '조개껍질',
      value: inventory[VOYAGE_SHELL_ITEM_ID] ?? 0,
      mark: 'S',
      tone: '#3e9b8f',
      description: '항해 모듈 전용 재화입니다. 개발 단계에서는 사용처와 수급처가 없습니다.',
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
    iconSrc: `${MAIN_UI_ASSET}/IconGold.png`,
  }
}

export const HUD = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [notificationOpen, setNotificationOpen] = useState(false)

  const hostName = accountStoreFacade.useHostName()
  const nickname = accountStoreFacade.useNickname()
  const onboardingComplete = accountStoreFacade.useOnboardingComplete()
  const coins = hostStoreFacade.useCoins()
  const diamonds = hostStoreFacade.useDiamonds()
  const inventory = hostStoreFacade.useInventory()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()

  const displayName = hostName || nickname || '게스트'
  const levelName = getProfileLevelName(recruitedAidongs.length, onboardingComplete)
  const profileLevelLabel = levelName.startsWith('Lv.0') ? '' : levelName
  const moduleCurrency = useMemo(
    () => getModuleCurrency(location.pathname, inventory, coins),
    [location.pathname, inventory, coins],
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
          justifyContent: 'space-between',
          gap: { xs: 0.5, sm: 0.9 },
          overflow: 'visible',
          color: 'text.primary',
          bgcolor: 'transparent',
          border: 0,
          borderRadius: 0,
          boxShadow: 'none',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            flex: '0 0 auto',
            display: 'block',
            position: 'relative',
            width: { xs: 132, sm: 196, md: 249 },
            aspectRatio: '498 / 188',
            backgroundImage: `url(${MAIN_UI_ASSET}/ProfileBg.png)`,
            backgroundSize: 'contain',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <Typography
            sx={{
              position: 'absolute',
              left: '34%',
              top: '38%',
              width: '48%',
              color: '#5c3f3f',
              fontSize: { xs: 8.5, sm: 12.5, md: 15 },
              fontWeight: 900,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pointerEvents: 'none',
            }}
          >
            {displayName}
          </Typography>
          <Typography
            sx={{
              position: 'absolute',
              left: '7%',
              bottom: '7%',
              width: '25%',
              color: '#fffefa',
              fontSize: { xs: 5.5, sm: 8, md: 10 },
              fontWeight: 900,
              lineHeight: 1,
              textAlign: 'center',
              textShadow: '0 1px 1px rgba(84,54,54,0.35)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              pointerEvents: 'none',
            }}
          >
            {profileLevelLabel}
          </Typography>
        </Box>

        <Box
          sx={{
            minWidth: 0,
            flex: '1 1 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: { xs: 0.25, sm: 0.6 },
            ml: 'auto',
          }}
        >
          <HudCurrencyItem
            label="다이아"
            value={diamonds}
            mark="◆"
            tone="#f27f75"
            description="전체 계정에 유지되는 프리미엄 재화입니다."
            iconSrc={`${MAIN_UI_ASSET}/IconDia.png`}
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
  width: { xs: 28, sm: 32 },
  height: { xs: 28, sm: 32 },
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

const HudCurrencyItem = ({ label, value, mark, tone, description, iconSrc }: HudCurrency) => (
  <Tooltip title={`${label}: ${description}`}>
    <Box
      sx={{
        height: { xs: 24, sm: 32 },
        width: { xs: 86, sm: 116 },
        pl: { xs: 1, sm: 1.35 },
        pr: { xs: 2.6, sm: 3.4 },
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'transparent',
        backgroundImage: `url(${MAIN_UI_ASSET}/ImgMoneySlot.png)`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        border: 0,
        overflow: 'hidden',
        cursor: 'help',
      }}
    >
      <Box
        component={iconSrc ? 'img' : 'span'}
        src={iconSrc}
        alt=""
        aria-hidden
        sx={{
          width: { xs: 15, sm: 20 },
          height: { xs: 15, sm: 20 },
          flex: { xs: '0 0 15px', sm: '0 0 20px' },
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: iconSrc ? 'transparent' : tone,
          color: '#fffefa',
          fontSize: { xs: 7, sm: 9 },
          fontWeight: 900,
          objectFit: 'contain',
          transform: 'translateY(-1px)',
        }}
      >
        {iconSrc ? null : mark}
      </Box>
      <Box
        sx={{
          minWidth: 0,
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          textAlign: 'right',
          pl: { xs: 0.4, sm: 0.65 },
        }}
      >
        <Typography
          sx={{
            color: '#6b5454',
            fontSize: { xs: 12, sm: 15 },
            fontWeight: 900,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            transform: 'translateY(-1px)',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  </Tooltip>
)
