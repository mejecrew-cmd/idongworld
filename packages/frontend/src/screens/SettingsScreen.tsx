import { useState } from 'react'
import type { ReactNode } from 'react'
import { logout as accountLogout } from '@idongworld/account'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import {
  SOUND_VOLUME_MAX,
  SOUND_VOLUME_MIN,
  SOUND_VOLUME_STEP,
} from '@/data/settings'
import { settingsStoreFacade, voyageSessionFacade } from '@/lib/storeFacades'

const miscSettings = [
  '언어',
  '계정 관리',
  '고객센터',
  '이용약관',
  '개인정보 처리방침',
  '로그아웃',
] as const

export const SettingsScreen = () => {
  const navigate = useNavigate()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [activeDialog, setActiveDialog] = useState<(typeof miscSettings)[number] | null>(null)
  const soundSettings = settingsStoreFacade.useSoundSettings()

  const handleLogout = () => {
    if (!confirm('로그아웃하고 로그인 화면으로 돌아갈까요?')) return

    voyageSessionFacade.endSession()
    accountLogout()
    navigate('/login', { replace: true })
  }

  return (
    <Box sx={{ p: 0, pb: 14 }}>
      <ScreenHeader category="설정" title="환경 설정" subtitle="준비 중" />
      <GameStage stageSx={{ px: { xs: 2.5, sm: 3 }, pt: 3, pb: 5 }}>
        <Typography variant="h1" sx={{ fontSize: 22, mb: 3.5 }}>
          설정
        </Typography>

        <Stack spacing={2.75}>
          <SettingsSection title="사운드 설정">
            <VolumeControl
              label="BGM"
              value={soundSettings.bgmVolume}
              onChange={settingsStoreFacade.setBgmVolume}
            />
            <VolumeControl
              label="효과음"
              value={soundSettings.sfxVolume}
              onChange={settingsStoreFacade.setSfxVolume}
            />
          </SettingsSection>

          <SettingsSection title="알림 설정" flush>
            <SettingRowShell>
              <Typography
                sx={{
                  minWidth: 0,
                  flex: 1,
                  fontWeight: 800,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                푸시알림
              </Typography>
              <Switch
                checked={pushEnabled}
                onChange={(event) => setPushEnabled(event.target.checked)}
                sx={{ flex: '0 0 auto', mr: -1 }}
              />
            </SettingRowShell>
          </SettingsSection>

          <SettingsSection title="기타 설정" flush>
            <Stack divider={<Divider flexItem />}>
              {miscSettings.map((label) => (
                <Button
                  key={label}
                  fullWidth
                  onClick={() => {
                    if (label === '로그아웃') {
                      handleLogout()
                      return
                    }
                    setActiveDialog(label)
                  }}
                  sx={{
                    minHeight: 52,
                    px: 2.25,
                    minWidth: 0,
                    justifyContent: 'space-between',
                    borderRadius: 0,
                    color: label === '로그아웃' ? 'error.main' : 'text.primary',
                    gap: 1,
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      fontWeight: 800,
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      flex: '0 0 auto',
                      color: 'text.secondary',
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    &gt;
                  </Box>
                </Button>
              ))}
            </Stack>
          </SettingsSection>
        </Stack>
      </GameStage>

      <Dialog
        open={activeDialog !== null}
        onClose={() => setActiveDialog(null)}
        disableScrollLock
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeDialog}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            해당 기능은 준비 중입니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

const SettingsSection = ({
  title,
  children,
  flush = false,
}: {
  title: string
  children: ReactNode
  flush?: boolean
}) => (
  <Box component="section">
    <Typography
      variant="h2"
      sx={{
        fontSize: 16,
        mb: 1,
        px: 0.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </Typography>
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: flush ? 0 : 2.25,
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  </Box>
)

const SettingRowShell = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      minHeight: 52,
      px: 2.25,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    }}
  >
    {children}
  </Box>
)

const VolumeControl = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) => (
  <Box sx={{ py: 0.45 }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.15, gap: 1 }}>
      <Typography sx={{ minWidth: 0, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        {value}%
      </Typography>
    </Stack>
    <Slider
      value={value}
      min={SOUND_VOLUME_MIN}
      max={SOUND_VOLUME_MAX}
      step={SOUND_VOLUME_STEP}
      onChange={(_, nextValue) => onChange(Array.isArray(nextValue) ? nextValue[0] : nextValue)}
      aria-label={`${label} 음량`}
      sx={{ width: 'calc(100% - 12px)', mx: 0.75, py: 0.5 }}
    />
  </Box>
)
