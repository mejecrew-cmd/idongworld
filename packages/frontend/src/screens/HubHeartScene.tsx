/**
 * 📁 screens/HubHeartScene.tsx — 07 마이섬 허브 (게임 본 화면)
 * ───────────────────────────────────────────────
 * 📌 역할: 영입한 캐릭터들이 floating 애니메이션으로 등장하는 풀샷 화면.
 *           캐릭터 탭 → 케어 메뉴 / 항구·풀맵·숙소·일기·데뷔 진입 허브.
 *
 * 🔗 연결:
 *   - 모든 마이섬 활동의 출발점
 *   - components/CareModal.tsx · DiaryModal.tsx
 *   - 영입 직후 첫 일기 자동 노출 (useEffect로 트리거)
 *
 * 💡 초보자 안내:
 *   - 캐릭터 표정: 욕구 mood_score 기반 자동 (happy/normal/worried/sleepy)
 *   - float 애니메이션: 3종 (-6/-4/-8px) 순환 → 자연스러운 호흡감
 *   - "🛠️ 디버그" 영역: 개발 중 보조 (주사위 +6 / 리셋)
 */
import { useEffect, useState } from 'react'
import { Box, Typography, Button, Stack, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from '@/components/AidongSprite'
import { CareModal } from '@/components/CareModal'
import { DiaryModal } from '@/components/DiaryModal'
import { ScreenHeader } from '@/components/ScreenHeader'
import { calcMoodScore, moodFromScore, moodToExpression, INITIAL_NEEDS } from '@/data/needs'
import { getCurrentZone } from '@/data/schedZone'
import {
  accountStoreFacade,
  codexStoreFacade,
  hostStoreFacade,
  myAidongStoreFacade,
} from '@/lib/storeFacades'

const ALL_AIDONGS: AidongCharacterId[] = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']

const CHAR_TO_DIARY_ID: Record<AidongCharacterId, string> = {
  황금멍: 'hwanggumeong_day1',
  춤냥: 'chumnyang_day1',
  양털곰: 'yangteolgom_day1',
  단풍볼: 'danpungbol_day1',
  날카여우: 'nalkayeou_day1',
}

export const HubHeartScene = () => {
  const navigate = useNavigate()
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const affinities = myAidongStoreFacade.useAffinities()
  const hostName = accountStoreFacade.useHostName()
  const unlockedDiaries = codexStoreFacade.useUnlockedDiaries()
  const needs = myAidongStoreFacade.useNeeds()
  const equippedOutfit = myAidongStoreFacade.useEquippedOutfit()
  const curZone = getCurrentZone()

  const [careTarget, setCareTarget] = useState<AidongCharacterId | null>(null)
  const [diaryTarget, setDiaryTarget] = useState<string | null>(null)
  const [autoDiaryShown, setAutoDiaryShown] = useState(false)

  // 영입 직후 첫 일기 자동 노출
  useEffect(() => {
    if (autoDiaryShown) return
    if (recruitedAidongs.length > 0 && unlockedDiaries.length > 0) {
      const first = recruitedAidongs[0]!
      const diaryId = CHAR_TO_DIARY_ID[first]
      if (unlockedDiaries.includes(`${first}_day1`)) {
        const t = setTimeout(() => {
          setDiaryTarget(diaryId)
          setAutoDiaryShown(true)
        }, 1200)
        return () => clearTimeout(t)
      }
    }
  }, [recruitedAidongs, unlockedDiaries, autoDiaryShown])

  return (
    <Box sx={{ minHeight: '100%', pb: 6 }}>
      <ScreenHeader category="마이섬" title="허브" subtitle={hostName ? `${hostName}의 SOOKSO` : undefined} />
      {/* 마이섬 풀샷 (배경 + 캐릭터들) */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          maxHeight: '60vh',
          backgroundImage: 'url(/assets/배경/myisland_harbor_warm.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mb: 2,
        }}
      >
        {/* 환영 메시지 */}
        <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.85)',
              p: 1.5,
              borderRadius: 2,
              display: 'inline-block',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {hostName ? `${hostName}의 마이섬` : '마이섬'} · {recruitedAidongs.length}/5
            </Typography>
          </Box>
        </Box>

        {/* 캐릭터 풀샷 — 바닥선 정렬 */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '4%',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-evenly',
            alignItems: 'flex-end',
            px: 2,
          }}
        >
          {recruitedAidongs.length === 0 ? (
            <Typography
              sx={{
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.7)',
                bgcolor: 'rgba(0,0,0,0.4)',
                p: 1.5,
                borderRadius: 1,
                fontSize: 14,
              }}
            >
              아직 친구가 없어요. 항해를 떠나보세요.
            </Typography>
          ) : (
            recruitedAidongs.map((id, idx) => {
              const charNeeds = needs[id] ?? INITIAL_NEEDS
              const score = calcMoodScore(charNeeds)
              const mood = moodFromScore(score, curZone === 4)
              const expression = moodToExpression(mood)
              const size = Math.min(160, Math.floor((window.innerWidth - 64) / recruitedAidongs.length))
              void affinities  // suppress unused warning if no affinity used here
              return (
                <Box
                  key={id}
                  sx={{
                    cursor: 'pointer',
                    animation: `float-${idx % 3} 4s ease-in-out infinite`,
                    '@keyframes float-0': {
                      '0%, 100%': { transform: 'translateY(0)' },
                      '50%': { transform: 'translateY(-6px)' },
                    },
                    '@keyframes float-1': {
                      '0%, 100%': { transform: 'translateY(0)' },
                      '50%': { transform: 'translateY(-4px)' },
                    },
                    '@keyframes float-2': {
                      '0%, 100%': { transform: 'translateY(0)' },
                      '50%': { transform: 'translateY(-8px)' },
                    },
                    transition: 'transform 0.3s',
                    '&:hover': { filter: 'brightness(1.1)' },
                  }}
                  onClick={() => setCareTarget(id)}
                >
                  <AidongSprite character={id} expression={expression} outfit={equippedOutfit[id]} size={size} />
                  <Typography
                    sx={{
                      textAlign: 'center',
                      color: 'white',
                      textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                      fontSize: 13,
                      fontWeight: 600,
                      mt: -1,
                    }}
                  >
                    {id}
                  </Typography>
                </Box>
              )
            })
          )}
        </Box>
      </Box>

      {/* 영입 진행도 */}
      <Box sx={{ px: 3 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {ALL_AIDONGS.map((id) => {
            const recruited = recruitedAidongs.includes(id)
            const aff = affinities[id]
            return (
              <Chip
                key={id}
                label={`${id}${aff ? ` Lv${aff.level}` : ''}`}
                size="small"
                color={recruited ? 'primary' : 'default'}
                variant={recruited ? 'filled' : 'outlined'}
                onClick={recruited ? () => setCareTarget(id) : undefined}
              />
            )
          })}
        </Stack>

        {/* 메인 액션 */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Button variant="contained" onClick={() => navigate('/island/harbor')}>
            ⛵ 항구로 가기
          </Button>
          <Button variant="outlined" onClick={() => navigate('/island/full-map')}>
            🗺️ 마이섬 전체 지도 (15구역)
          </Button>
          <Button variant="outlined" onClick={() => navigate('/island/lodge')}>
            🏠 숙소
          </Button>
        </Stack>

        {/* 영입된 캐릭터 일기 */}
        {recruitedAidongs.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h2" sx={{ fontSize: 16, mb: 1 }}>📔 일기</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {recruitedAidongs.map((id) => (
                <Button
                  key={id}
                  size="small"
                  variant="outlined"
                  onClick={() => setDiaryTarget(CHAR_TO_DIARY_ID[id])}
                >
                  {id} day 1
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* 데뷔 스테이지 */}
        {recruitedAidongs.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h2" sx={{ fontSize: 16, mb: 1 }}>🎤 데뷔 스테이지</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {recruitedAidongs.map((id) => (
                <Button
                  key={id}
                  size="small"
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate(`/debut/${id}`)}
                >
                  ✨ {id} 데뷔
                </Button>
              ))}
            </Stack>
          </Box>
        )}

        {/* 디버그 (개발 중 보조) */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            🛠️ 디버그 (개발 중) — 본진 영입은 항구→이웃섬 항로 보드에서.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => hostStoreFacade.mutateDiceCount(6)}
            >
              🎲 +6 주사위
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/dev/catalog')}
            >
              📚 에셋 카탈로그
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => {
                if (confirm('진행 상태 초기화 (게스트 + 영입 캐릭터 모두 리셋)?')) {
                  accountStoreFacade.logout()
                  navigate('/login')
                }
              }}
            >
              ↺ 리셋
            </Button>
          </Stack>
        </Box>
      </Box>

      <CareModal character={careTarget} onClose={() => setCareTarget(null)} />
      <DiaryModal diaryId={diaryTarget} onClose={() => setDiaryTarget(null)} />
    </Box>
  )
}
