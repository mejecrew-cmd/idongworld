/**
 * 📁 components/CareModal.tsx — 캐릭터 케어 메뉴 모달
 * ───────────────────────────────────────────────
 * 📌 역할: 캐릭터 탭 시 열리는 14 케어 액션 메뉴.
 *           6 욕구 게이지·기분·표정 자동 계산·시간대 한정 잠금·쿨다운 표시.
 *
 * 🔗 연결:
 *   - data/careActions.ts → 14 액션 카탈로그
 *   - data/needs.ts → mood_score 계산
 *   - stores/userStore.ts → applyCareAction 호출
 *   - components/DiaryFragmentToast.tsx → 기본 케어 후 일기 자동 노출
 *   - 사용처: HubHeartScene (캐릭터 풀샷 탭) / LodgeScene (방 케어 메뉴)
 *
 * 💡 초보자 안내:
 *   - useEffect로 모달 열리는 순간 시퀀스 진입 감지 → 욕구 -1
 *   - 탭: basic (시간대 한정) / free (쿨다운·캡)
 *   - 액션 클릭 → applyCareAction → 결과 chip 피드백 + 일기 토스트
 *   - 시간대 안 맞으면 disabled (zones에 현재 zone이 없을 때)
 */
import { useState, useEffect } from 'react'
import { Box, Modal, Typography, Button, Chip, LinearProgress, Tabs, Tab } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from './AidongSprite'
import { DiaryFragmentToast } from './DiaryFragmentToast'
import { CARE_ACTIONS, ZONE_LABELS } from '@/data/careActions'
import { CARE_SURFACE_KEYS, CARE_SURFACE_LABELS, calcCareSurface, calcMoodScore, moodFromScore, moodToExpression, INITIAL_NEEDS } from '@/data/needs'
import { getCurrentZone } from '@/data/schedZone'
import { api } from '@/lib/api'
import { applyActionApiResponse } from '@/lib/actionApiSync'
import { accountStoreFacade, hostStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'

interface CareModalProps {
  character: AidongCharacterId | null
  onClose: () => void
}

export const CareModal = ({ character, onClose }: CareModalProps) => {
  const needs = myAidongStoreFacade.useNeeds()
  const affinities = myAidongStoreFacade.useAffinities()
  const coins = hostStoreFacade.useCoins()

  const [tab, setTab] = useState<'basic' | 'free'>('basic')
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [diaryTrigger, setDiaryTrigger] = useState<{ character: AidongCharacterId; key: number } | null>(null)
  const [applyingActionId, setApplyingActionId] = useState<string | null>(null)

  // 시퀀스 진입 시 욕구 감소
  useEffect(() => {
    if (character) myAidongStoreFacade.tickSequenceDecay(character)
  }, [character])

  if (!character) return null

  const charNeeds = needs[character] ?? INITIAL_NEEDS
  const score = calcMoodScore(charNeeds)
  const curZone = getCurrentZone()
  const mood = moodFromScore(score, curZone === 4)
  const exp = moodToExpression(mood)
  const aff = affinities[character] ?? { score: 0, level: 0 }
  const careSurface = calcCareSurface(charNeeds, score)

  const visibleActions = CARE_ACTIONS.filter((a) => a.category === tab)

  const onAction = async (actionId: string) => {
    const action = CARE_ACTIONS.find((a) => a.id === actionId)
    setApplyingActionId(actionId)

    try {
      if (import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true') {
        const uid = accountStoreFacade.getFirebaseUid()
        if (!uid) throw new Error('로그인 정보가 없어 케어할 수 없어요.')
        const response = await api.applyAidongCare(uid, character, actionId)
        applyActionApiResponse(response)
        const result = response.result ?? {}
        setFeedback({ kind: 'ok', text: `+${Number(result.affinityDelta ?? action?.affinity ?? 0)} 친밀도 · 케어 완료` })
      } else {
        const result = myAidongStoreFacade.applyCareAction(character, actionId)
        if (!result.ok) {
          const reason = {
            wrong_zone: '지금 시간대엔 안 돼요.',
            cooldown: '아직 쉬어야 해요.',
            cap: '오늘 충분해요.',
            no_coins: '코인이 부족해요.',
            no_char: '오류',
          }[result.reason ?? 'no_char']
          setFeedback({ kind: 'err', text: reason })
          return
        }
        setFeedback({ kind: 'ok', text: `+${result.affinityDelta} 친밀도 · 욕구 회복` })
      }

      // 시간대 일기 조각 자동 노출 (다마고치코어 §9-2: 메인 케어 직후)
      // basic 카테고리만 트리거 (자유 케어는 너무 빈번해서 제외)
      if (action?.category === 'basic') {
        setDiaryTrigger({ character, key: Date.now() })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '케어 처리 중 오류가 발생했어요.'
      setFeedback({ kind: 'err', text: message.includes('care_daily_cap') ? '오늘 충분해요.' : message })
    } finally {
      setApplyingActionId(null)
      setTimeout(() => setFeedback(null), 2000)
    }
  }

  return (
    <Modal open={!!character} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          borderRadius: 2,
          width: '95%',
          maxWidth: 480,
          maxHeight: '90vh',
          outline: 'none',
          boxShadow: 24,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 헤더 */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 100, height: 100 }}>
              <AidongSprite character={character} expression={exp} size={100} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h2" sx={{ fontSize: 18 }}>{character}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                친밀도 Lv {aff.level} · {aff.score}점 · 기분 {mood}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                {ZONE_LABELS[curZone]} · 🪙 {coins}
              </Typography>
            </Box>
          </Box>

          {/* 4파라미터 표면 게이지: 내부 저장은 6욕구, 숙소 표시는 Hunger/Clean/Mood/Energy로 압축 */}
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75 }}>
            {CARE_SURFACE_KEYS.map((k) => {
              const v = careSurface[k] ?? 0
              const pct = (v / 10) * 100
              const color = v < 3 ? 'error' : v < 5 ? 'warning' : 'success'
              return (
                <Box key={k}>
                  <Typography variant="caption" sx={{ fontSize: 10 }}>
                    {CARE_SURFACE_LABELS[k].emoji} {CARE_SURFACE_LABELS[k].ko} {v.toFixed(1)}
                  </Typography>
                  <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 4, borderRadius: 1 }} />
                </Box>
              )
            })}
          </Box>

          {/* 피드백 */}
          {feedback && (
            <Chip
              label={feedback.text}
              color={feedback.kind === 'ok' ? 'success' : 'default'}
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </Box>

        {/* 탭 */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="basic" label="기본 케어" />
          <Tab value="free" label="자유 케어" />
        </Tabs>

        {/* 액션 그리드 */}
        <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {visibleActions.map((a) => {
              const isWrongZone = a.zones && !a.zones.includes(curZone as never)
              const noCoin = coins < a.coinCost
              const disabled = isWrongZone || noCoin
              return (
                <Button
                  key={a.id}
                  variant="outlined"
                  onClick={() => onAction(a.id)}
                  disabled={disabled || applyingActionId === a.id}
                  sx={{
                    py: 1.5,
                    flexDirection: 'column',
                    textAlign: 'center',
                    minHeight: 80,
                  }}
                >
                  <Box sx={{ fontSize: 28 }}>{a.emoji}</Box>
                  <Box sx={{ fontSize: 12, fontWeight: 600 }}>{a.label}</Box>
                  <Box sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {a.coinCost > 0 && `🪙${a.coinCost}`} +{a.affinity}♡
                  </Box>
                </Button>
              )
            })}
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary', textAlign: 'center' }}>
            {tab === 'basic' ? '시간대에 맞는 케어만 활성됩니다' : '시간 무관·쿨다운·일일 캡 적용'}
          </Typography>
        </Box>

        {/* 닫기 */}
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="text" onClick={onClose} fullWidth>
            닫기
          </Button>
        </Box>

        <DiaryFragmentToast trigger={diaryTrigger} onClose={() => setDiaryTrigger(null)} />
      </Box>
    </Modal>
  )
}
