import { useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'

export const ShopScreen = () => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="상점" title="상점" subtitle="준비중" showBack />
      <GameStage stageSx={{ px: 3, py: 3 }}>
        <Typography variant="h1" sx={{ fontSize: 22, mb: 1 }}>
          상점
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          현재 상점은 제작중입니다.
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={() => setOpen(true)}>
          상태 보기
        </Button>
      </GameStage>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>상점 준비중</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            구매와 교환 기능은 아직 제작중입니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/island')}>마이섬으로</Button>
          <Button variant="contained" onClick={() => setOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
