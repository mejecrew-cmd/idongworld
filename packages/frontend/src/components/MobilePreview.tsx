/**
 * 📁 components/MobilePreview.tsx — 모바일 프리뷰 모드
 * ───────────────────────────────────────────────
 * 📌 역할: 데스크톱에서 모바일 화면 사이즈로 시뮬 (375×812 iPhone 기준).
 *           디버그 패널에서 토글.
 *
 * 🔗 연결:
 *   - main.tsx → App을 wrap (preview ON일 때 전체 화면을 모바일 박스로)
 *   - DebugPanel.tsx → 토글 버튼
 *   - localStorage('mobile-preview') 영속
 *
 * 💡 초보자 안내:
 *   - 02 기술스택 §1: 모바일 PWA 1순위 (320~480px)
 *   - 데스크톱 dev에서도 모바일 비율로 즉시 검증
 *   - production 빌드에서도 사용 가능 (DevTools 모바일 모드 대체)
 */
import { useEffect, useState } from 'react'
import { Box, Typography, IconButton } from '@mui/material'

const PREVIEW_KEY = 'idongworld-mobile-preview'

interface Props {
  children: React.ReactNode
}

export const useMobilePreview = () => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(PREVIEW_KEY) === 'true'
  })

  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev
      localStorage.setItem(PREVIEW_KEY, String(next))
      return next
    })
  }

  return { enabled, toggle }
}

export const MobilePreview = ({ children }: Props) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(PREVIEW_KEY) === 'true'
  })

  // localStorage 변경 감지 (다른 탭·DebugPanel 토글 반영)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREVIEW_KEY) setEnabled(e.newValue === 'true')
    }
    const onCustom = () => setEnabled(localStorage.getItem(PREVIEW_KEY) === 'true')
    window.addEventListener('storage', onStorage)
    window.addEventListener('idongworld:preview-toggle', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('idongworld:preview-toggle', onCustom)
    }
  }, [])

  if (!enabled) return <>{children}</>

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        zIndex: 1200,
      }}
    >
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
        📱 모바일 프리뷰 (375×812)
      </Typography>
      <Box
        sx={{
          width: 375,
          height: 812,
          maxHeight: '90vh',
          bgcolor: 'background.default',
          border: '4px solid #333',
          borderRadius: 4,
          overflowY: 'scroll',
          overflowX: 'hidden',
          scrollbarGutter: 'stable',
          position: 'relative',
        }}
      >
        {children}
      </Box>
      <IconButton
        onClick={() => {
          localStorage.setItem(PREVIEW_KEY, 'false')
          window.dispatchEvent(new Event('idongworld:preview-toggle'))
        }}
        sx={{ color: 'white' }}
        size="small"
      >
        ✕ 프리뷰 종료
      </IconButton>
    </Box>
  )
}
