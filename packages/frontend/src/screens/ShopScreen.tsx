import { useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'

const previewItems = [
  { name: '골드 팩', price: '준비 중', icon: '/assets/ui/main/IconGold.png' },
  { name: '다이아 팩', price: '준비 중', icon: '/assets/ui/main/IconDia.png' },
  { name: '꾸미기 박스', price: '준비 중', icon: '/assets/ui/home/BtnPopupItemInfo.png' },
]

export const ShopScreen = () => {
  const navigate = useNavigate()
  const [noticeOpen, setNoticeOpen] = useState(true)

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="상점" title="아이동 상점" subtitle="준비 중" showBack />

      <GameStage stageSx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Box
          sx={{
            position: 'relative',
            mx: 'auto',
            width: 'min(100%, 760px)',
            minHeight: { xs: 520, sm: 560 },
            borderRadius: 2,
            overflow: 'hidden',
            backgroundImage: 'url(/assets/backgrounds/03_Home_01.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(255,255,255,0.72)',
            boxShadow: '0 18px 48px rgba(85,67,46,0.16)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(255,252,241,0.14), rgba(255,246,226,0.62))',
            }}
          />

          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              width: 'min(92%, 520px)',
              mx: 'auto',
              mt: { xs: 5, sm: 7 },
              aspectRatio: '640 / 330',
              backgroundImage: 'url(/assets/ui/main/InfoBox01.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              px: { xs: 4, sm: 5 },
              py: { xs: 4, sm: 5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography sx={{ color: '#563f32', fontWeight: 900, fontSize: { xs: 22, sm: 28 }, lineHeight: 1.1 }}>
              상점 준비 중
            </Typography>
            <Typography sx={{ color: '#8a715d', fontWeight: 800, fontSize: { xs: 13, sm: 14 }, mt: 1 }}>
              구매와 교환 기능은 아직 대기 상태예요. UI 흐름만 먼저 연결해두었습니다.
            </Typography>
          </Box>

          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              width: 'min(92%, 620px)',
              mx: 'auto',
              mt: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.2,
            }}
          >
            {previewItems.map((item) => (
              <Box
                key={item.name}
                sx={{
                  minHeight: 126,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,252,241,0.86)',
                  border: '1px solid rgba(255,255,255,0.76)',
                  boxShadow: '0 10px 22px rgba(91,70,54,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <Box component="img" src={item.icon} alt="" aria-hidden sx={{ width: 42, height: 42, objectFit: 'contain', mb: 1 }} />
                <Typography sx={{ color: '#4d3d33', fontWeight: 900 }}>{item.name}</Typography>
                <Typography sx={{ color: '#9a826d', fontWeight: 800, fontSize: 12 }}>{item.price}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </GameStage>

      <Dialog open={noticeOpen} onClose={() => setNoticeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>상점 준비 중</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            현재 구매와 교환 기능은 아직 열리지 않았습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => navigate('/island')}>마이섬으로</Button>
            <Button variant="contained" onClick={() => navigate('/island/lodge/myroom/info')}>
              마이룸 보기
            </Button>
            <Button onClick={() => setNoticeOpen(false)}>닫기</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
