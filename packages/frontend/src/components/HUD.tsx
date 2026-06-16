import { Box, Chip, Typography } from '@mui/material'
import { getCurrentZone } from '@/data/schedZone'
import { hostStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const ZONE_LABEL = ['휴식', '아침', '정오', '저녁', '밤']
const ZONE_TONE = ['#9d8150', '#67bda4', '#e0a742', '#f27f75', '#5c7890']

export const HUD = () => {
  const coins = hostStoreFacade.useCoins()
  const diamonds = hostStoreFacade.useDiamonds()
  const gems = hostStoreFacade.useGems()
  const diceCount = hostStoreFacade.useDiceCount()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const zone = getCurrentZone()

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: { xs: 8, sm: 12 },
        left: '50%',
        width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 24px)' },
        maxWidth: GAME_STAGE_WIDTH,
        transform: 'translateX(-50%)',
        minHeight: 52,
        px: { xs: 1, sm: 1.5 },
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 },
        overflow: 'hidden',
        color: 'text.primary',
        bgcolor: 'rgba(255,254,250,0.9)',
        border: '1px solid rgba(62,155,143,0.18)',
        borderRadius: 2,
        boxShadow: '0 12px 28px rgba(66,86,80,0.12)',
        backdropFilter: 'blur(16px) saturate(1.18)',
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flex: { xs: '0 1 86px', sm: '0 0 auto' },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            color: '#fffefa',
            fontWeight: 900,
            backgroundImage: 'linear-gradient(135deg, #67bda4 0%, #f27f75 100%)',
            boxShadow: '0 7px 14px rgba(62,155,143,0.2)',
          }}
        >
          동
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 900, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            아이동월드
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            오늘의 섬
          </Typography>
        </Box>
      </Box>

      <Chip
        label={ZONE_LABEL[zone] ?? '시간'}
        size="small"
        sx={{
          height: 24,
          px: 0.25,
          color: '#fffefa',
          bgcolor: ZONE_TONE[zone] ?? 'primary.main',
          fontSize: 11,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)',
        }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }} />

      <HudItem label="코인" value={coins} tone="#e0a742" />
      <HudItem label="젬" value={gems} tone="#67bda4" />
      <HudItem label="다이아" value={diamonds} tone="#f27f75" />
      <HudItem label="주사위" value={diceCount} tone="#5c7890" compact />
      <HudItem label="아이동" value={recruitedAidongs.length} tone="#6daa62" compact />
    </Box>
  )
}

const HudItem = ({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string
  value: number
  tone: string
  compact?: boolean
}) => (
  <Box
    sx={{
      height: 32,
      minWidth: { xs: compact ? 38 : 42, sm: compact ? 44 : 56 },
      px: { xs: 0.45, sm: compact ? 0.7 : 0.9 },
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      borderRadius: 1.5,
      bgcolor: 'rgba(255,255,255,0.72)',
      border: `1px solid ${tone}33`,
      overflow: 'hidden',
    }}
  >
    <Typography sx={{ fontSize: { xs: 8, sm: 9 }, color: 'text.secondary', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
)
