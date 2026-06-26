/**
 * 📁 screens/CleaningLoopScreen.tsx — 청소 의식 (24h 게이지 + 같이 돕기 + 14구역 둘러보기)
 * ───────────────────────────────────────────────
 * 📌 역할: 폐허 숙소터 청소. 아이동이 알아서 청소하며 시간을 보낸다.
 *           PM 결정 (2026-05-13):
 *           - 혼자 청소: 24h (실시간 24시간 / 개발 30초)
 *           - 같이 돕기: 4h (실시간 4시간 / 개발 30초)
 *           - 게이지 진행 동안 호스트는 14구역 둘러보기 (= /island/full-map)
 *           - 게이지 완료 후 → /heart-island/naming (SOOKSO 이름)
 *
 * 🔗 연결:
 *   - 기획 SoT: 모듈/오프닝.md §5 (4시간 통과의례) — 의미 재해석
 *   - 이전: /heart-island/first (폐허 숙소터 도착)
 *   - 다음: /heart-island/naming (게이지 완료 후)
 *   - 측면: /island/full-map?tour=opening (둘러보기 — 14구역 퀘스트)
 *
 * 💡 초보자 안내:
 *   - 게이지는 localStorage 의 cleaningStartedAt 로 영속 (새로고침해도 진행)
 *   - 개발 30초 = 환경 변수 또는 const DEV_MODE 로 분기
 *   - "같이 돕기" 클릭 시 startedAt 4h 앞으로 당기기 (즉 4h 단축 효과)
 */
import { useState, useEffect } from 'react'
import { Box, Typography, Button, LinearProgress, Stack, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { AidongCharacterId } from '@/stores/userStore'
import { ScreenHeader } from '@/components/ScreenHeader'
import { accountStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'
import { api } from '@/lib/api'

// 개발 모드: 30초로 단축 / 베타: 실시간 24h·4h
const DEV_SHORTENED = true
const TOTAL_MS = DEV_SHORTENED ? 30_000 : 24 * 60 * 60 * 1000
const HELP_SHORTCUT_MS = DEV_SHORTENED ? 0 : 20 * 60 * 60 * 1000  // 같이 돕기 = 20h 단축 → 4h 남음
const HELP_DEV_REMAINING_MS = DEV_SHORTENED ? 30_000 : 4 * 60 * 60 * 1000

const STORAGE_KEY = 'cleaningStartedAt'

export const CleaningLoopScreen = () => {
  const navigate = useNavigate()
  const recruited = myAidongStoreFacade.useRecruitedAidongs()
  const firstAidong = recruited[0] as AidongCharacterId | undefined

  const [startedAt, setStartedAt] = useState<number | null>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return stored ? Number(stored) : null
  })
  const [now, setNow] = useState(Date.now())
  const [helped, setHelped] = useState(false)

  // 시작 시점 락 (첫 진입 시 자동 시작)
  useEffect(() => {
    if (startedAt === null) {
      const t0 = Date.now()
      setStartedAt(t0)
      localStorage.setItem(STORAGE_KEY, String(t0))
    }
  }, [startedAt])

  // 1초마다 now 갱신
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  if (startedAt === null) return null

  const elapsedMs = now - startedAt
  const totalMs = helped ? HELP_DEV_REMAINING_MS : TOTAL_MS
  const effectiveElapsed = helped ? elapsedMs : elapsedMs  // helped 시 totalMs 작아짐 → 비율 빨라짐
  const ratio = Math.min(1, effectiveElapsed / totalMs)
  const remainingMs = Math.max(0, totalMs - effectiveElapsed)
  const isDone = ratio >= 1

  const onHelp = () => {
    if (helped) return
    // 같이 돕기 — 게이지를 4h 남는 시점으로 점프 (베타) / 개발은 30초 새로 시작
    if (DEV_SHORTENED) {
      const t0 = Date.now()
      setStartedAt(t0)
      localStorage.setItem(STORAGE_KEY, String(t0))
    } else {
      const shifted = startedAt - HELP_SHORTCUT_MS
      setStartedAt(shifted)
      localStorage.setItem(STORAGE_KEY, String(shifted))
    }
    setHelped(true)
  }

  const onComplete = () => {
    const uid = accountStoreFacade.getFirebaseUid()
    accountStoreFacade.setSooksoClean(true)
    if (uid) {
      void api.patchAccountState(uid, { sooksoClean: true }).catch((error) => {
        console.warn('[cleaning] failed to persist sooksoClean', error)
      })
    }
    localStorage.removeItem(STORAGE_KEY)
    navigate('/heart-island/naming')
  }

  const fmtRemaining = () => {
    if (DEV_SHORTENED) return `${Math.ceil(remainingMs / 1000)}초`
    const h = Math.floor(remainingMs / 3_600_000)
    const m = Math.floor((remainingMs % 3_600_000) / 60_000)
    return `${h}시간 ${m}분`
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        backgroundImage: 'url(/assets/backgrounds/03_Home_01.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'grayscale(80%) brightness(0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ScreenHeader
        category="회색섬→하트섬"
        title="2단계 청소"
        subtitle={DEV_SHORTENED ? '개발 30초' : helped ? '4시간 남음' : '24시간 남음'}
        overlay
      />
      <Box
        sx={{
          bgcolor: 'rgba(255,255,255,0.94)',
          p: 4,
          borderRadius: 2,
          textAlign: 'center',
          maxWidth: 520,
          mx: 2,
        }}
      >
        <Typography sx={{ fontSize: 56, mb: 1 }}>🧹</Typography>
        <Typography variant="h2" sx={{ mb: 1 }}>
          {firstAidong ?? '친구'}: "내가 청소하고 있을게."
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {isDone
            ? '청소가 끝났어요. 이제 이 자리에 이름을 지어요.'
            : helped
              ? '같이 청소를 시작했어요.\n빨리 끝날 거예요.'
              : '혼자 청소하면 하루가 걸려요.\n같이 도울 수도 있어요.'}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={ratio * 100}
          sx={{ mb: 2, height: 12, borderRadius: 6 }}
        />
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
          <Chip size="small" label={`남은 시간 · ${fmtRemaining()}`} />
          <Chip size="small" color="primary" label={`${Math.floor(ratio * 100)}%`} />
        </Stack>

        {isDone ? (
          <Button variant="contained" size="large" onClick={onComplete} fullWidth>
            이름 짓기로
          </Button>
        ) : (
          <Stack spacing={1.5}>
            {!helped && (
              <Button variant="contained" size="large" onClick={onHelp}>
                같이 청소 돕기 (4시간 단축)
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => navigate('/island/full-map?tour=opening')}
            >
              그동안 섬 둘러보기 (14구역)
            </Button>
          </Stack>
        )}

        <Typography variant="caption" sx={{ display: 'block', mt: 3, color: 'text.secondary' }}>
          {DEV_SHORTENED
            ? '(개발 모드: 24h → 30초 / 4h → 30초 단축. 베타에선 실시간.)'
            : '베타: 4시간 뒤 다시 접속해 주세요.'}
        </Typography>
      </Box>
    </Box>
  )
}
