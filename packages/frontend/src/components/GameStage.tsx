import { Box, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

interface GameStageProps {
  children: ReactNode
  stageWidth?: number
  sx?: SxProps<Theme>
  stageSx?: SxProps<Theme>
}

export const GameStage = ({
  children,
  stageWidth = GAME_STAGE_WIDTH,
  sx,
  stageSx,
}: GameStageProps) => (
  <Box sx={{ width: '100%', ...sx }}>
    <Box
      sx={{
        width: '100%',
        maxWidth: stageWidth,
        mx: 'auto',
        position: 'relative',
        ...stageSx,
      }}
    >
      {children}
    </Box>
  </Box>
)
