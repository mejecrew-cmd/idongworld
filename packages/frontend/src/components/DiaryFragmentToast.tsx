/**
 * 📁 components/DiaryFragmentToast.tsx — 케어 직후 일기 조각 토스트
 * ───────────────────────────────────────────────
 * 📌 역할: 기본 케어 액션 (밥주기·재우기 등) 직후 시간대에 맞는
 *           일기 한 조각을 화면 상단에 6초 토스트로 노출.
 *
 * 🔗 연결:
 *   - 다마고치코어 §9-2: 메인 케어 직후 → 시간대 일기 5 조각 자동 노출
 *   - components/CareModal.tsx → 호출
 *   - 시나리오: 기획/시나리오/diary_{캐릭터}_day1.json
 *
 * 💡 초보자 안내:
 *   - SLOT_BY_ZONE: 현재 zone → 일기 슬롯 매핑
 *     · zone 1 (아침) → morning
 *     · zone 2 (점심) → noon
 *     · zone 3 (저녁) → evening
 *     · zone 4 (잠) → sleep
 *     · zone 0 (휴식) → wake (대체)
 *   - trigger.key: Date.now() — 같은 캐릭터라도 재트리거 시 useEffect 재실행
 *   - 자유 케어는 너무 빈번 → 트리거 X (basic만)
 */
import { useEffect, useState } from 'react'
import { Box, Snackbar, IconButton, Typography, Slide } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'
import { getCurrentZone } from '@/data/schedZone'

const SLOT_BY_ZONE: Record<number, string> = {
  1: 'morning',  // 아침
  2: 'noon',     // 점심
  3: 'evening',  // 저녁
  4: 'sleep',    // 잠
  0: 'wake',     // 휴식 (대체)
}

const SLOT_LABEL: Record<string, string> = {
  wake: '🌅 기상',
  morning: '🌤️ 아침',
  noon: '☀️ 점심',
  evening: '🌆 저녁',
  sleep: '🌙 잠',
}

const CHAR_TO_DIARY_ID: Record<AidongCharacterId, string> = {
  황금멍: 'hwanggumeong_day1',
  춤냥: 'chumnyang_day1',
  양털곰: 'yangteolgom_day1',
  단풍볼: 'danpungbol_day1',
  날카여우: 'nalkayeou_day1',
}

interface FragmentData {
  fragments: Record<string, { slot: string; text: string }>
}

interface DiaryFragmentToastProps {
  trigger: { character: AidongCharacterId; key: number } | null
  onClose: () => void
}

export const DiaryFragmentToast = ({ trigger, onClose }: DiaryFragmentToastProps) => {
  const [data, setData] = useState<FragmentData | null>(null)
  const [shownKey, setShownKey] = useState<number | null>(null)

  useEffect(() => {
    if (!trigger) return
    if (trigger.key === shownKey) return
    setShownKey(trigger.key)
    const diaryId = CHAR_TO_DIARY_ID[trigger.character]
    fetch(`/scenarios/diary_${diaryId}.json`)
      .then((r) => r.json())
      .then((d: FragmentData) => setData(d))
      .catch(() => setData(null))
  }, [trigger, shownKey])

  if (!trigger || !data) return null

  const zone = getCurrentZone()
  const slot = SLOT_BY_ZONE[zone] ?? 'wake'
  const fragment = data.fragments[slot]
  if (!fragment) return null

  return (
    <Snackbar
      open={!!trigger}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      autoHideDuration={6000}
      TransitionComponent={Slide}
    >
      <Box
        sx={{
          bgcolor: 'rgba(50,50,50,0.95)',
          color: 'white',
          borderRadius: 2,
          p: 2,
          maxWidth: 360,
          minWidth: 280,
          boxShadow: 6,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ flex: 1, color: 'rgba(255,255,255,0.7)' }}>
            📔 {trigger.character} · {SLOT_LABEL[slot]}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: 'white', p: 0.3 }}>
            ✕
          </IconButton>
        </Box>
        <Typography
          variant="body2"
          sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: 13 }}
        >
          {fragment.text}
        </Typography>
      </Box>
    </Snackbar>
  )
}
