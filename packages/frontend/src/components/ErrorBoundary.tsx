/**
 * 📁 components/ErrorBoundary.tsx — 에러 바운더리 (앱 전체 보호)
 * ───────────────────────────────────────────────
 * 📌 역할: 컴포넌트 트리 안 예외를 캐치해 앱 전체 화이트스크린 방지.
 *           폴백 UI + 새로고침 안내.
 *
 * 🔗 연결: main.tsx — App을 wrap
 *
 * 💡 초보자 안내:
 *   - React 클래스 컴포넌트 (componentDidCatch는 hook 미지원)
 *   - 개발 모드: 에러 상세 표시
 *   - 프로덕션: 친절한 폴백 메시지 (Phase 1.5에 Sentry 연동)
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Box, Typography, Button } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
    // Phase 1.5: Sentry.captureException(error, { extra: info })
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: 64 }}>🌧️</Typography>
          <Typography variant="h2">잠시 문제가 생겼어요</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 400 }}>
            게임을 계속하려면 새로고침해 주세요.
            <br />문제가 반복되면 디스코드·트위터로 알려주세요.
          </Typography>
          {import.meta.env.DEV && this.state.error && (
            <Box
              sx={{
                bgcolor: 'rgba(255,0,0,0.05)',
                border: '1px solid',
                borderColor: 'error.light',
                borderRadius: 1,
                p: 2,
                fontFamily: 'monospace',
                fontSize: 12,
                maxWidth: 600,
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error.toString()}
              {'\n\n'}
              {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
            </Box>
          )}
          <Button variant="contained" onClick={() => window.location.href = '/'}>
            🏠 시작 화면으로
          </Button>
          <Button variant="text" size="small" onClick={this.reset}>
            다시 시도
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}
