import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'
import { accountStoreFacade } from '@/lib/storeFacades'

const MAIN_UI_ASSET = '/assets/ui/main'

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
  const sooksoClean = accountStoreFacade.useSooksoClean()
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
          if (!sooksoClean && (nextSection === 'harbor' || nextSection === 'map')) return
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
            py: 0,
            minHeight: { xs: 44, sm: 52 },
            color: 'text.secondary',
            fontSize: { xs: 11, sm: 13 },
            fontWeight: 800,
            whiteSpace: 'nowrap',
            backgroundImage: `url(${MAIN_UI_ASSET}/BtnPlaceOff.png)`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            bgcolor: 'transparent',
            '&.Mui-selected': {
              color: '#6b3f43',
              backgroundImage: `url(${MAIN_UI_ASSET}/BtnPlaceOn.png)`,
              bgcolor: 'transparent',
            },
            '&.Mui-selected:hover': {
              bgcolor: 'transparent',
            },
          },
        }}
      >
        {MY_ISLAND_SECTIONS.map((section) => {
          const locked = !sooksoClean && (section.id === 'harbor' || section.id === 'map')
          return (
            <ToggleButton key={section.id} value={section.id} disabled={locked}>
              {locked ? `${section.label} 잠김` : section.label}
            </ToggleButton>
          )
        })}
      </ToggleButtonGroup>
    </Box>
  )
}
