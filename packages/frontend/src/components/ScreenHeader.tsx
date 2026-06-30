import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'
import { api } from '@/lib/api'
import { accountStoreFacade } from '@/lib/storeFacades'

const COMMON_UI_ASSET = '/assets/ui/common'
const MY_INFO_UI_ASSET = '/assets/ui/myinfo'
const HEADER_HEIGHT = 42
const BACK_BUTTON_SIZE = 42

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
  const location = useLocation()
  const lodgeName = accountStoreFacade.useSooksoName()
  const uid = accountStoreFacade.useFirebaseUid()
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)

  const isLodgeHeader = location.pathname === '/island/lodge'
  const effectiveOverlay = overlay || isLodgeHeader
  const displayCategory = isLodgeHeader ? undefined : category
  const displayTitle = isLodgeHeader ? (lodgeName ?? '내 숙소') : title
  const displaySubtitle = isLodgeHeader ? undefined : subtitle
  const trimmedEditName = editName.trim()
  const editNameValid = trimmedEditName.length >= 2 && trimmedEditName.length <= 10

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(backTo)
  }

  const openLodgeNameEdit = () => {
    setEditName(lodgeName ?? '')
    setEditOpen(true)
  }

  const saveLodgeName = async () => {
    if (!editNameValid || savingName) return
    setSavingName(true)
    accountStoreFacade.setSooksoName(trimmedEditName)
    try {
      if (uid) await api.patchAccountState(uid, { sooksoName: trimmedEditName })
      setEditOpen(false)
    } catch (error) {
      console.warn('[header] failed to persist lodge name', error)
    } finally {
      setSavingName(false)
    }
  }

  return (
    <>
      <Box
        sx={{
          position: effectiveOverlay ? 'absolute' : 'sticky',
          top: effectiveOverlay ? { xs: '72px', sm: '102px', md: '118px' } : 0,
          left: effectiveOverlay ? '50%' : 'auto',
          width: effectiveOverlay ? `min(100%, ${GAME_STAGE_WIDTH}px)` : '100%',
          maxWidth: effectiveOverlay ? 'none' : GAME_STAGE_WIDTH,
          mx: effectiveOverlay ? 0 : 'auto',
          transform: effectiveOverlay ? 'translateX(-50%)' : 'none',
          zIndex: 10,
          px: { xs: 1.5, sm: 2 },
          py: 1,
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
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
              width: BACK_BUTTON_SIZE,
              height: HEADER_HEIGHT,
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
            width: 'fit-content',
            maxWidth: { xs: `calc(100% - ${showBack ? BACK_BUTTON_SIZE : 0}px)`, sm: 520 },
            minHeight: HEADER_HEIGHT,
            ml: showBack ? '-1px' : 0,
            px: 1.5,
            py: 0.65,
            borderRadius: showBack ? '0 8px 8px 0' : 2,
            bgcolor: 'rgba(255,252,241,0.78)',
            border: '1px solid rgba(255,255,255,0.74)',
            boxShadow: '0 10px 24px rgba(91,70,54,0.12)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {displayCategory && (
            <Typography
              sx={{
                color: '#8e6a4d',
                fontSize: 11,
                fontWeight: 900,
                lineHeight: 1,
                mb: 0.35,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayCategory}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Typography
              sx={{
                color: '#45372e',
                fontWeight: 900,
                fontSize: { xs: 15, sm: 17 },
                lineHeight: 1.1,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayTitle}
            </Typography>
            {isLodgeHeader && (
              <IconButton
                aria-label="숙소 이름 변경"
                size="small"
                onClick={openLodgeNameEdit}
                sx={{
                  width: 24,
                  height: 24,
                  flex: '0 0 auto',
                  p: 0,
                  color: 'transparent',
                  bgcolor: 'transparent',
                  backgroundImage: `url(${MY_INFO_UI_ASSET}/BtnNicknameEdit.png)`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  pointerEvents: 'auto',
                  '&:hover': {
                    bgcolor: 'transparent',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                edit
              </IconButton>
            )}
            {displaySubtitle && (
              <Typography
                sx={{
                  color: '#8c7b68',
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displaySubtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth disableScrollLock>
        <DialogTitle>숙소 이름 변경</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            size="small"
            fullWidth
            value={editName}
            onChange={(event) => setEditName(event.target.value.slice(0, 10))}
            placeholder="2~10자"
            inputProps={{ minLength: 2, maxLength: 10 }}
            error={editName.length > 0 && !editNameValid}
            helperText="숙소 이름은 2~10자로 입력해주세요."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>취소</Button>
          <Button variant="contained" disabled={!editNameValid || savingName} onClick={saveLodgeName}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
