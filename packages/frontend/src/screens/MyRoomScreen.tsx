import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { api } from '@/lib/api'
import { accountStoreFacade } from '@/lib/storeFacades'
import { GAME_STAGE_WIDTH } from '@/theme/gameStage'

const MY_INFO_UI = '/assets/ui/myinfo'
const HOME_UI = '/assets/ui/home'
const MS_PER_DAY = 1000 * 60 * 60 * 24

// ── 백엔드 연동 예정 (현재는 프론트 더미값) ──────────────────────────
const PROFILE_LEVEL = 99
const PROFILE_XP = 1234
const PROFILE_XP_MAX = 5678
const BADGE_COUNT = { owned: 9, total: 99 }
const PHOTOCARD_COUNT = { owned: 10, total: 99 }
// 마이 아이템: 백엔드 구현 예정. 지금은 임시 3개.
const TEMP_ITEMS = [
  { id: 'temp-1', name: '아이템이름' },
  { id: 'temp-2', name: '아이템이름' },
  { id: 'temp-3', name: '아이템이름' },
]

function getDayCount(startedAt?: number): number {
  if (!startedAt) return 1
  return Math.max(1, Math.floor((Date.now() - startedAt) / MS_PER_DAY) + 1)
}

/** 뱃지 / 포토카드 카운트 카드 (BtnBadge / BtnPhoto 위에 라벨·개수 오버레이) */
const CountCard = ({ asset, label, owned, total }: { asset: string; label: string; owned: number; total: number }) => (
  <Box
    sx={{
      position: 'relative',
      width: '100%',
      aspectRatio: '394 / 204',
      backgroundImage: `url(${asset})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
    }}
  >
    <Typography
      sx={{
        position: 'absolute',
        left: '67%',
        top: '33%',
        transform: 'translate(-50%, -50%)',
        color: '#5b4636',
        fontSize: { xs: 16, sm: 18 },
        fontWeight: 900,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        position: 'absolute',
        left: '67%',
        top: '63%',
        transform: 'translate(-50%, -50%)',
        color: '#a99a88',
        fontSize: { xs: 13, sm: 15 },
        fontWeight: 900,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <Box component="span" sx={{ color: '#5b4636' }}>{owned}</Box> /{total}
    </Typography>
  </Box>
)

export const MyRoomScreen = () => {
  const uid = accountStoreFacade.useFirebaseUid()
  const nickname = accountStoreFacade.useNickname()
  const hostName = accountStoreFacade.useHostName()
  const gameStartedAt = accountStoreFacade.useGameStartedAt()

  const displayName = nickname || hostName || '게스트'
  const dayCount = getDayCount(gameStartedAt)
  const xpPercent = Math.max(0, Math.min(100, (PROFILE_XP / PROFILE_XP_MAX) * 100))

  const [editOpen, setEditOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const openEdit = () => {
    setDraftName(displayName === '게스트' ? '' : displayName)
    setEditOpen(true)
  }

  const trimmed = draftName.trim()
  const nameValid = trimmed.length >= 2 && trimmed.length <= 12

  const saveName = async () => {
    if (!nameValid) return
    accountStoreFacade.setNickname(trimmed)
    setEditOpen(false)
    if (uid) {
      try {
        await api.patchAccountState(uid, { nickname: trimmed })
      } catch (error) {
        console.warn('[myroom] failed to persist nickname', error)
      }
    }
  }

  // 프로필 이미지 변경 / 더보기 — 구현 예정 (팝업으로 구현 예정)
  const notImplemented = () => setToast('준비 중입니다.')

  return (
    <Box sx={{ position: 'relative', p: 0, pb: 6, minHeight: 'calc(100dvh - 176px)' }}>
      {/* 배경 프레임(레이아웃 폭) 전체를 크림으로 감쌈 — 전역 배경과 동일 영역 */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `min(100vw, ${GAME_STAGE_WIDTH}px)`,
          height: '100dvh',
          bgcolor: '#f6ecda',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
      <ScreenHeader category="숙소" title="내 정보" showBack />

      <GameStage
        sx={{ mt: { xs: '32px', sm: '50px', md: '58px' } }}
        stageSx={{
          px: { xs: 2, sm: 2.5 },
          pt: 3,
          pb: 5,
        }}
      >
        <Box sx={{ width: 'min(100%, 520px)', mx: 'auto' }}>
          {/* ── 프로필 ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2.5 }}>
            {/* 아바타 + 변경 버튼 + DAY 리본 */}
            <Box sx={{ position: 'relative', width: { xs: 150, sm: 168 }, aspectRatio: '1 / 1', mb: 3 }}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${MY_INFO_UI}/ProfileBox.png)`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: '10%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                }}
              >
                {/* 프로필 사진 미구현 → 상단 프로필(ProfileBg)의 기본 캐릭터를 디폴트로 사용 */}
                <Box
                  component="img"
                  src="/assets/ui/main/ProfileBg.png"
                  alt=""
                  aria-hidden
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left center', transform: 'scale(1.2)' }}
                />
              </Box>

              {/* 프로필 이미지 변경 (구현 예정) */}
              <Box
                component="button"
                type="button"
                aria-label="프로필 이미지 변경"
                onClick={notImplemented}
                sx={{
                  position: 'absolute',
                  top: '2%',
                  right: '2%',
                  width: { xs: 30, sm: 34 },
                  height: { xs: 30, sm: 34 },
                  p: 0,
                  border: 0,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  backgroundImage: `url(${MY_INFO_UI}/BtnProfileImgChange.png)`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
              />

              {/* DAY 리본 */}
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '-7%',
                  transform: 'translateX(-50%)',
                  width: '74%',
                  aspectRatio: '269 / 82',
                  backgroundImage: `url(${MY_INFO_UI}/DayCountBg.png)`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                <Typography
                  sx={{
                    position: 'absolute',
                    left: '72%',
                    top: '44%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fffefa',
                    fontSize: { xs: 15, sm: 17 },
                    fontWeight: 900,
                    lineHeight: 1,
                    textShadow: '0 1px 2px rgba(150,70,75,0.4)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {dayCount}
                </Typography>
              </Box>
            </Box>

            {/* 닉네임 + 편집 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
              <Typography sx={{ fontSize: { xs: 20, sm: 23 }, fontWeight: 900, color: '#5b4636', letterSpacing: 0.3 }}>
                {displayName}
              </Typography>
              <Box
                component="button"
                type="button"
                aria-label="닉네임 변경"
                onClick={openEdit}
                sx={{
                  width: 24,
                  height: 24,
                  p: 0,
                  border: 0,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  flex: '0 0 auto',
                  backgroundImage: `url(${MY_INFO_UI}/BtnNicknameEdit.png)`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
              />
            </Box>

            {/* 레벨 바 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '92%' }}>
              <Typography sx={{ color: '#f08a90', fontWeight: 900, fontSize: { xs: 13, sm: 15 }, flex: '0 0 auto' }}>
                Lv.{PROFILE_LEVEL}
              </Typography>
              <Box sx={{ flex: 1, height: { xs: 9, sm: 11 }, borderRadius: 999, bgcolor: '#e7dccd', overflow: 'hidden' }}>
                <Box sx={{ width: `${xpPercent}%`, height: '100%', borderRadius: 999, bgcolor: '#f08a90' }} />
              </Box>
              <Typography sx={{ color: '#a18876', fontSize: { xs: 11, sm: 12.5 }, fontWeight: 800, flex: '0 0 auto', fontVariantNumeric: 'tabular-nums' }}>
                {PROFILE_XP.toLocaleString()} /{PROFILE_XP_MAX.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          {/* ── 뱃지 / 포토카드 ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3 }}>
            <CountCard asset={`${MY_INFO_UI}/BtnBadge.png`} label="뱃지" owned={BADGE_COUNT.owned} total={BADGE_COUNT.total} />
            <CountCard asset={`${MY_INFO_UI}/BtnPhoto.png`} label="포토카드" owned={PHOTOCARD_COUNT.owned} total={PHOTOCARD_COUNT.total} />
          </Box>

          {/* ── 마이 아이템 ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <Box component="img" src={`${MY_INFO_UI}/IconMyItem.png`} alt="" aria-hidden sx={{ width: 22, height: 22, mr: 1, objectFit: 'contain' }} />
            <Typography sx={{ flex: 1, fontWeight: 900, fontSize: { xs: 16, sm: 18 }, color: '#5b4636' }}>
              마이 아이템
            </Typography>
            {/* 더보기 — 팝업으로 구현 예정 */}
            <Box
              component="button"
              type="button"
              onClick={notImplemented}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, border: 0, bgcolor: 'transparent', cursor: 'pointer', p: 0 }}
            >
              <Typography sx={{ color: '#a18876', fontSize: { xs: 13, sm: 14 }, fontWeight: 800 }}>더보기</Typography>
              <Typography sx={{ color: '#a18876', fontSize: 16, fontWeight: 900, lineHeight: 1 }}>›</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
            {TEMP_ITEMS.map((item) => (
              <Box key={item.id} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    backgroundImage: `url(${HOME_UI}/ItemSlotList.png)`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {/* 아이템 이미지 — 백엔드 구현 예정 (현재 placeholder) */}
                  <Box sx={{ width: '54%', height: '54%', borderRadius: 2, bgcolor: 'rgba(120,95,75,0.07)' }} />
                </Box>
                <Typography sx={{ mt: 0.75, fontSize: { xs: 11.5, sm: 13 }, fontWeight: 800, color: '#6b5440' }}>
                  {item.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </GameStage>

      {/* 닉네임 변경 다이얼로그 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth disableScrollLock>
        <DialogTitle>닉네임 변경</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="2~12자"
            inputProps={{ maxLength: 12 }}
            error={draftName.length > 0 && !nameValid}
            helperText={draftName.length > 0 && !nameValid ? '2~12자로 입력해 주세요.' : ' '}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>취소</Button>
          <Button variant="contained" disabled={!nameValid} onClick={() => { void saveName() }}>저장</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={1600}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 9, sm: 10 } }}
      >
        <Alert severity="info" variant="filled" sx={{ borderRadius: 1.5 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
