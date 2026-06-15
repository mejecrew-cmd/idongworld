/**
 * 📁 components/DebugPanel.tsx — 개발자·테스터 디버그 패널
 * ───────────────────────────────────────────────
 * 📌 역할: 게임 상태 빠르게 조작·점프할 수 있는 fixed 패널.
 *           우측 하단 토글 버튼으로 열고 닫음.
 *
 * 🔗 연결: 모든 화면에서 접근 가능 (App.tsx에 wrap)
 *
 * 💡 초보자 안내:
 *   - import.meta.env.DEV 인 경우만 노출 (production 자동 숨김)
 *   - 5명 빠른 영입·자원 +·시간 시뮬·화면 점프
 *   - 1주차 PD·테스터 친구 사용
 */
import { useState } from 'react'
import { Box, IconButton, Drawer, Typography, Button, Stack, Chip, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { AidongCharacterId } from '@/stores/userStore'
import {
  accountStoreFacade,
  hostStoreFacade,
  myAidongStoreFacade,
  voyageSessionFacade,
} from '@/lib/storeFacades'

const ALL_AIDONGS: AidongCharacterId[] = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']

const QUICK_ROUTES = [
  { path: '/login', label: '00 로그인' },
  { path: '/title', label: '01 타이틀' },
  { path: '/opening', label: '02 오프닝' },
  { path: '/first-meeting', label: '03 첫만남' },
  { path: '/heart-island/first', label: '04 하트섬' },
  { path: '/heart-island/cleaning', label: '05 청소' },
  { path: '/heart-island/naming', label: '06 SOOKSO' },
  { path: '/island', label: '07 마이섬' },
  { path: '/island/full-map', label: '풀맵' },
  { path: '/island/harbor', label: '08 항구' },
  { path: '/voyage/board?route=neighbor', label: '09 보드' },
  { path: '/island/lodge', label: '12 숙소' },
  { path: '/dev/catalog', label: '📚 카탈로그' },
]

export const DebugPanel = () => {
  // production 빌드에선 자동 숨김
  if (!import.meta.env.DEV) return null

  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const navigate = useNavigate()
  const firebaseUid = accountStoreFacade.useFirebaseUid()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()

  const recruitAll = () => ALL_AIDONGS.forEach((id) => myAidongStoreFacade.recruitAidong(id))

  const resetAllProgress = async () => {
    if (resetting) return
    if (!confirm('상태 완전 초기화? 배, 숙소, 선실, 인벤토리, 가구 배치까지 모두 초기화됩니다.')) return

    setResetting(true)
    try {
      const uid = accountStoreFacade.getFirebaseUid()
      if (uid) await api.debugReset(uid)
      voyageSessionFacade.endSession()
      accountStoreFacade.logout()
      navigate('/login', { replace: true })
      setOpen(false)
    } catch (error) {
      console.warn('[debug] reset failed', error)
      alert('전체 리셋에 실패했어요. 서버 연결과 로그인 상태를 확인해 주세요.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 80,
          bgcolor: 'rgba(74,124,220,0.9)',
          color: 'white',
          zIndex: 1300,
          '&:hover': { bgcolor: 'primary.dark' },
        }}
        size="small"
        title="디버그 패널"
      >
        🛠️
      </IconButton>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 320, p: 2 }}>
          <Typography variant="h2" sx={{ fontSize: 18, mb: 1 }}>🛠️ 디버그 패널</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
            uid: {firebaseUid?.slice(0, 24) ?? 'none'}
          </Typography>

          {/* 자원 조작 */}
          <Typography variant="caption" sx={{ fontWeight: 600 }}>💰 자원</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2, mt: 0.5 }}>
            <Button size="small" variant="outlined" onClick={() => hostStoreFacade.rewardCoins(50)}>🪙 +50</Button>
            <Button size="small" variant="outlined" onClick={() => hostStoreFacade.mutateGems(50)}>❤️ +50</Button>
            <Button size="small" variant="outlined" onClick={() => hostStoreFacade.mutateDiceCount(6)}>🎲 +6</Button>
          </Stack>

          <Divider sx={{ my: 1 }} />

          {/* 캐릭터 */}
          <Typography variant="caption" sx={{ fontWeight: 600 }}>🐾 영입 ({recruitedAidongs.length}/5)</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
            {ALL_AIDONGS.map((id) => (
              <Chip
                key={id}
                label={id}
                size="small"
                color={recruitedAidongs.includes(id) ? 'primary' : 'default'}
                onClick={() => myAidongStoreFacade.recruitAidong(id)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" variant="contained" onClick={recruitAll}>5명 모두 영입</Button>
            <Button size="small" variant="outlined" onClick={() => accountStoreFacade.completeOnboarding('PD')}>온보딩 완료</Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 화면 점프 */}
          <Typography variant="caption" sx={{ fontWeight: 600 }}>🚀 빠른 이동</Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {QUICK_ROUTES.map((r) => (
              <Button
                key={r.path}
                size="small"
                variant="text"
                onClick={() => { navigate(r.path); setOpen(false) }}
                sx={{ fontSize: 11, py: 0.25 }}
              >
                {r.label}
              </Button>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 친밀도 */}
          <Typography variant="caption" sx={{ fontWeight: 600 }}>❤️ 친밀도 +50 (테스트)</Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {recruitedAidongs.map((id) => (
              <Button key={id} size="small" variant="text" onClick={() => myAidongStoreFacade.addAffinity(id, 50)}>
                {id} +50
              </Button>
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 모바일 프리뷰 토글 */}
          <Button
            size="small"
            variant="outlined"
            fullWidth
            sx={{ mb: 1 }}
            onClick={() => {
              const cur = localStorage.getItem('idongworld-mobile-preview') === 'true'
              localStorage.setItem('idongworld-mobile-preview', String(!cur))
              window.dispatchEvent(new Event('idongworld:preview-toggle'))
              setOpen(false)
            }}
          >
            📱 모바일 프리뷰 토글 (375×812)
          </Button>

          {/* 위험 */}
          <Button
            size="small"
            variant="outlined"
            color="warning"
            fullWidth
            disabled={resetting}
            onClick={() => { void resetAllProgress() }}
          >
            {resetting ? '리셋 중...' : '↺ 전체 리셋'}
          </Button>
        </Box>
      </Drawer>
    </>
  )
}
