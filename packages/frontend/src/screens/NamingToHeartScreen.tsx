import { useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@/components/ScreenHeader'
import { api } from '@/lib/api'
import { accountStoreFacade, myIslandStoreFacade } from '@/lib/storeFacades'

const DEFAULT_LODGE_NAME = '내 숙소'

export const NamingToHeartScreen = () => {
  const navigate = useNavigate()
  const uid = accountStoreFacade.useFirebaseUid()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const trimmedName = name.trim()
  const nameToSave = trimmedName || DEFAULT_LODGE_NAME
  const nameValid = trimmedName.length === 0 || (trimmedName.length >= 2 && trimmedName.length <= 10)

  const onConfirm = async () => {
    if (!nameValid || saving) return
    setSaving(true)

    accountStoreFacade.setSooksoName(nameToSave)
    accountStoreFacade.setSooksoClean(true)
    accountStoreFacade.setOnboardingComplete(true)
    myIslandStoreFacade.unlockZone('harbor')
    myIslandStoreFacade.unlockZone('lodge')

    if (uid) {
      try {
        await api.patchAccountState(uid, {
          sooksoName: nameToSave,
          sooksoClean: true,
          onboardingComplete: true,
        })
      } catch (error) {
        console.warn('[naming] failed to persist lodge name', error)
      }
    }

    navigate('/island/lodge', { replace: true })
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        backgroundImage: 'url(/assets/backgrounds/03_Home_00.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(91,62,48,0.18) 0%, rgba(253,239,218,0.58) 100%)',
        },
      }}
    >
      <ScreenHeader category="하트섬" title="숙소 이름 짓기" overlay showBack backTo="/heart-island/cleaning" />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: 'min(88vw, 420px)',
          bgcolor: 'rgba(255,255,255,0.96)',
          border: '1px solid rgba(255,255,255,0.82)',
          borderRadius: 4,
          boxShadow: '0 18px 44px rgba(83,64,50,0.24)',
          px: { xs: 3, sm: 4 },
          py: { xs: 3.5, sm: 4.5 },
          textAlign: 'center',
        }}
      >
        <Typography sx={{ color: '#45372e', fontSize: 24, fontWeight: 900, lineHeight: 1.25, mb: 1 }}>
          숙소 이름 짓기
        </Typography>
        <Typography sx={{ color: '#7d6c5e', fontSize: 14, fontWeight: 700, lineHeight: 1.6, mb: 2.5 }}>
          앞으로 사용할 숙소 이름을 정해주세요.
        </Typography>

        <TextField
          autoFocus
          fullWidth
          size="small"
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, 10))}
          placeholder={DEFAULT_LODGE_NAME}
          inputProps={{ minLength: 2, maxLength: 10 }}
          error={name.length > 0 && !nameValid}
          helperText={name.length > 0 && !nameValid ? '숙소 이름은 2~10자로 입력해주세요.' : '비워두면 기본 이름으로 시작해요.'}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void onConfirm()
          }}
          sx={{ mb: 2.5 }}
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!nameValid || saving}
          onClick={() => void onConfirm()}
          sx={{ fontWeight: 900 }}
        >
          {saving ? '저장 중' : '완료'}
        </Button>
      </Box>
    </Box>
  )
}
