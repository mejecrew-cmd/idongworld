import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const MY_ISLAND_SECTIONS = [
  { id: 'hub', label: '허브', path: '/island' },
  { id: 'harbor', label: '항구', path: '/island/harbor' },
  { id: 'map', label: '전체 지도', path: '/island/full-map' },
  { id: 'myroom', label: '마이룸', path: '/island/lodge/myroom/info' },
] as const

type MyIslandSectionId = typeof MY_ISLAND_SECTIONS[number]['id']

function getActiveSection(pathname: string): MyIslandSectionId {
  if (pathname.startsWith('/island/harbor')) return 'harbor'
  if (pathname.startsWith('/island/full-map')) return 'map'
  if (pathname.startsWith('/island/lodge')) return 'myroom'
  return 'hub'
}

export const MyIslandToggle = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const activeSection = getActiveSection(location.pathname)

  return (
    <Box
      data-testid="my-island-toggle"
      sx={{
        width: '100%',
        maxWidth: GAME_STAGE_WIDTH,
        boxSizing: 'border-box',
        mx: 'auto',
        px: { xs: 1.5, sm: 2 },
        py: 1,
      }}
    >
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={activeSection}
        onChange={(_, nextSection: MyIslandSectionId | null) => {
          if (!nextSection || nextSection === activeSection) return
          const target = MY_ISLAND_SECTIONS.find((section) => section.id === nextSection)
          if (target) navigate(target.path)
        }}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          bgcolor: 'rgba(255,254,250,0.86)',
          border: '1px solid rgba(62,155,143,0.18)',
          borderRadius: 2,
          boxShadow: '0 10px 24px rgba(66,86,80,0.1)',
          overflow: 'hidden',
          '& .MuiToggleButtonGroup-grouped': {
            minWidth: 0,
            border: 0,
            borderRadius: 0,
            px: { xs: 0.5, sm: 1 },
            py: 0.8,
            color: 'text.secondary',
            fontSize: { xs: 11, sm: 13 },
            fontWeight: 800,
            whiteSpace: 'nowrap',
            '&.Mui-selected': {
              color: 'primary.contrastText',
              bgcolor: 'primary.main',
            },
            '&.Mui-selected:hover': {
              bgcolor: 'primary.dark',
            },
          },
        }}
      >
        {MY_ISLAND_SECTIONS.map((section) => (
          <ToggleButton key={section.id} value={section.id}>
            {section.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}
