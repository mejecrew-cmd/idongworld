/**
 * packages/modules/aidong-island/src/routes.tsx
 * ------------------------------------------------------------
 * 역할: M22 아이동섬 frontend route shell을 제공한다.
 * 연결: frontend `moduleRoutes.tsx`가 이 route 묶음을 수집해 `/voyage/island/:id` 계열 화면으로 렌더한다.
 * 주의: 실제 영입, 편입, 고정맵 상호작용은 후속 단계에서 backend action API와 연결한다.
 */
import type { ModuleRoutes } from '@idongworld/core'
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import { useMemo, useState, type ReactNode } from 'react'
import { getHooks } from './config'

const DEFAULT_ISLAND_ID = 'first-aidong-island'
const PLACEHOLDER_CHARACTER_ID = '황금멍'
const PLACEHOLDER_HOTSPOT_ID = 'meet-hwanggumeong'

function getIslandId(rawId?: string): string {
  return rawId && rawId.trim() ? rawId : DEFAULT_ISLAND_ID
}

function AidongIslandFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const { id } = useParams<{ id: string }>()
  const islandId = getIslandId(id)

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        px: { xs: 2, sm: 4 },
        py: { xs: 3, sm: 5 },
        background: 'linear-gradient(180deg, #e9f8ff 0%, #fff7dc 54%, #f5ead5 100%)',
        color: '#26333a',
      }}
    >
      <Stack spacing={3} sx={{ maxWidth: 920, mx: 'auto' }}>
        <Stack spacing={1}>
          <Chip
            label={`M22 · ${islandId}`}
            size="small"
            sx={{ alignSelf: 'flex-start', bgcolor: '#ffffffcc', fontWeight: 700 }}
          />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 900, letterSpacing: 0 }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Stack>

        {children}
      </Stack>
    </Box>
  )
}

function AidongIslandMapShell() {
  const { id } = useParams<{ id: string }>()
  const islandId = getIslandId(id)

  return (
    <AidongIslandFrame
      title="아이동섬 발견"
      subtitle="항해 중 만난 Aidong 영입 섬입니다. 지금은 고정맵 POC shell만 표시합니다."
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: 360,
          border: '1px solid rgba(86, 112, 118, 0.22)',
          borderRadius: 3,
          background: 'radial-gradient(circle at 26% 34%, #fff9bf 0 9%, transparent 10%), radial-gradient(circle at 66% 46%, #8ed7b5 0 16%, transparent 17%), radial-gradient(circle at 46% 62%, #f6cda1 0 20%, transparent 21%), linear-gradient(145deg, #7ed4e6, #b7ecff)',
          boxShadow: '0 18px 46px rgba(45, 82, 95, 0.18)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 'auto 8% 9% 8%',
            height: 76,
            borderRadius: '50%',
            bgcolor: 'rgba(255, 255, 255, 0.42)',
            filter: 'blur(1px)',
          }}
        />
        <Stack
          spacing={1}
          sx={{
            position: 'absolute',
            left: { xs: 20, sm: 36 },
            bottom: { xs: 22, sm: 34 },
            maxWidth: 440,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            첫 만남의 섬
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(38, 51, 58, 0.78)' }}>
            잔잔한 선착장과 작은 숲 공터가 있는 임시 고정맵입니다.
          </Typography>
        </Stack>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button
          component={RouterLink}
          to={`/voyage/island/${encodeURIComponent(islandId)}/land`}
          variant="contained"
          sx={{ fontWeight: 800 }}
        >
          상륙하기
        </Button>
        <Button
          component={RouterLink}
          to={`/voyage/island/${encodeURIComponent(islandId)}/sub`}
          variant="outlined"
        >
          서브 구역 보기
        </Button>
        <Button component={RouterLink} to="/voyage/board" variant="text">
          항해 보드로
        </Button>
      </Stack>
    </AidongIslandFrame>
  )
}

function AidongIslandLandShell() {
  const { id } = useParams<{ id: string }>()
  const islandId = getIslandId(id)

  return (
    <AidongIslandFrame
      title="잔잔한 선착장"
      subtitle="상륙 action 화면입니다. 다음 단계에서 backend land/interact/recruit API와 연결합니다."
    >
      <Stack spacing={2}>
        <Box
          sx={{
            border: '1px solid rgba(86, 112, 118, 0.22)',
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
            bgcolor: 'rgba(255, 255, 255, 0.72)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
            현재 node: landing-beach
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            북쪽 숲에서 Aidong을 만나는 hotspot이 열릴 예정입니다.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="contained" component={RouterLink} to={`/voyage/island/${encodeURIComponent(islandId)}/sub`}>
              북쪽 작은 숲으로
            </Button>
            <Button variant="outlined" disabled>
              조사하기 준비중
            </Button>
          </Stack>
        </Box>
        <Button component={RouterLink} to={`/voyage/island/${encodeURIComponent(islandId)}`} sx={{ alignSelf: 'flex-start' }}>
          섬 입구로 돌아가기
        </Button>
      </Stack>
    </AidongIslandFrame>
  )
}

function AidongIslandSubShell() {
  const { id } = useParams<{ id: string }>()
  const islandId = getIslandId(id)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const hooks = getHooks()
  const recruited = hooks.getRecruited?.() ?? []
  const alreadyRecruited = useMemo(
    () => recruited.includes(PLACEHOLDER_CHARACTER_ID),
    [recruited],
  )

  const recruitPlaceholderAidong = async () => {
    if (!hooks.onRecruitPlaceholder || status === 'loading') return
    setStatus('loading')
    setMessage('반짝이는 발자국을 따라가고 있어요.')
    try {
      const result = await hooks.onRecruitPlaceholder({
        islandId,
        characterId: PLACEHOLDER_CHARACTER_ID,
        hotspotId: PLACEHOLDER_HOTSPOT_ID,
      })
      setStatus(result.ok ? 'done' : 'error')
      setMessage(
        result.message ?? (
          result.ok
            ? `${result.characterId}이(가) 동료가 되었어요. 이제 편입 슬롯 선택으로 이어집니다.`
            : '영입을 완료하지 못했어요.'
        ),
      )
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '영입 중 알 수 없는 오류가 났어요.')
    }
  }

  return (
    <AidongIslandFrame
      title="작은 숲 공터"
      subtitle="아이동섬에서 Aidong 1명을 만나는 1컷 placeholder입니다."
    >
      <Box
        sx={{
          border: '1px solid rgba(86, 112, 118, 0.22)',
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          bgcolor: 'rgba(255, 255, 255, 0.72)',
        }}
      >
        <Stack spacing={2}>
          <Stack spacing={0.75}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              반짝이는 발자국
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              작은 숲 안쪽에서 황금빛 꼬리가 살짝 보입니다. 가까이 다가가면 황금멍이 조심스럽게 고개를 내밀어요.
            </Typography>
          </Stack>

          <Box
            sx={{
              borderRadius: 2,
              p: 2,
              bgcolor: 'rgba(255, 246, 196, 0.78)',
              border: '1px solid rgba(180, 141, 56, 0.18)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              황금멍
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(38, 51, 58, 0.82)' }}>
              “여기까지 찾아온 거야? 그럼 나도 같이 가볼래.”
            </Typography>
          </Box>

          {message && (
            <Typography
              variant="body2"
              sx={{
                color: status === 'error' ? 'error.main' : 'text.secondary',
                fontWeight: status === 'done' ? 800 : 500,
              }}
            >
              {message}
            </Typography>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="contained"
              onClick={recruitPlaceholderAidong}
              disabled={alreadyRecruited || status === 'loading' || !hooks.onRecruitPlaceholder}
            >
              {alreadyRecruited ? '이미 영입됨' : status === 'loading' ? '영입 중' : '황금멍 영입'}
            </Button>
            {status === 'done' && (
              <Button component={RouterLink} to="/island/full-map" variant="outlined">
                편입 슬롯 선택으로
              </Button>
            )}
            <Button component={RouterLink} to={`/voyage/island/${encodeURIComponent(islandId)}/land`} variant="text">
              선착장으로
            </Button>
          </Stack>
        </Stack>
      </Box>
    </AidongIslandFrame>
  )
}

function AidongIslandLandingAlias() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/voyage/island/${encodeURIComponent(getIslandId(id))}/land`} replace />
}

const routes: ModuleRoutes = {
  moduleId: 'aidong-island',
  prefix: '/voyage/island/:id',
  routes: [
    {
      path: '',
      Component: AidongIslandMapShell,
    },
    {
      path: 'land',
      Component: AidongIslandLandShell,
    },
    {
      path: 'sub',
      Component: AidongIslandSubShell,
    },
    {
      path: 'landing',
      Component: AidongIslandLandingAlias,
    },
  ],
}

export function AidongIslandRoutes() {
  return <AidongIslandMapShell />
}

export default routes