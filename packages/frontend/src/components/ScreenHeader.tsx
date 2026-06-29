import { Box, IconButton, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const COMMON_UI_ASSET = '/assets/ui/common'

interface ScreenHeaderProps {
  category: string
  title: string
  subtitle?: string
  overlay?: boolean
  showBack?: boolean
  backTo?: string
}

export const ScreenHeader = ({
  category,
  title,
  subtitle,
  overlay = false,
  showBack = false,
  backTo = '/island',
}: ScreenHeaderProps) => {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(backTo)
  }

  return (
    <Box
      sx={{
        position: overlay ? 'absolute' : 'sticky',
        top: 0,
        width: '100%',
        maxWidth: GAME_STAGE_WIDTH,
        mx: 'auto',
        zIndex: 10,
        px: { xs: 1.5, sm: 2 },
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
        pointerEvents: 'none',
      }}
    >
      {showBack && (
        <IconButton
          aria-label="뒤로가기"
          size="small"
          onClick={goBack}
          sx={{
            width: 42,
            height: 42,
            flex: '0 0 auto',
            color: 'transparent',
            bgcolor: 'transparent',
            backgroundImage: `url(${COMMON_UI_ASSET}/BtnBack.png)`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            border: 0,
            pointerEvents: 'auto',
            '&:hover': {
              bgcolor: 'transparent',
              transform: 'translateX(-1px)',
            },
          }}
        >
          back
        </IconButton>
      )}

      <Box
        sx={{
          minWidth: 0,
          maxWidth: { xs: 'calc(100% - 52px)', sm: 520 },
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          bgcolor: overlay ? 'rgba(76,55,41,0.36)' : 'rgba(255,252,241,0.78)',
          border: '1px solid rgba(255,255,255,0.74)',
          boxShadow: overlay ? '0 8px 22px rgba(35,26,20,0.18)' : '0 10px 24px rgba(91,70,54,0.12)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography
          sx={{
            color: overlay ? '#fffefa' : '#8e6a4d',
            fontSize: 11,
            fontWeight: 900,
            lineHeight: 1,
            mb: 0.35,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {category}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
          <Typography
            sx={{
              color: overlay ? '#fffefa' : '#45372e',
              fontWeight: 900,
              fontSize: { xs: 15, sm: 17 },
              lineHeight: 1.1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                color: overlay ? 'rgba(255,254,250,0.78)' : '#8c7b68',
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}
