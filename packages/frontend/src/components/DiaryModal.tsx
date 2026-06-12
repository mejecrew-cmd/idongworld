/**
 * 📁 components/DiaryModal.tsx — 일기 풀뷰어 모달
 * ───────────────────────────────────────────────
 * 📌 역할: 캐릭터별 1일치 일기 5 시간대 조각 (wake·morning·noon·evening·sleep)
 *           탭 전환으로 회독.
 *
 * 🔗 연결:
 *   - 시나리오: 기획/시나리오/diary_{character}_day{N}.json (fetch)
 *   - 사용처: HubHeartScene (영입 직후 자동 / 일기 버튼 클릭)
 *   - 기획 SoT: 모듈/일기.md v0.2 (5 시간대 5 조각 × 100일)
 *
 * 💡 초보자 안내:
 *   - useEffect로 모달 열릴 때마다 fetch
 *   - 5 슬롯 탭: 🌅 기상 / 🌤️ 아침 / ☀️ 점심 / 🌆 저녁 / 🌙 잠
 *   - whiteSpace: pre-line → JSON의 \n을 줄바꿈으로 표시
 */
import { useEffect, useState } from 'react'
import { Box, Modal, Typography, Button, Stack, CircularProgress } from '@mui/material'

interface DiaryFragment {
  slot: string
  text: string
  characterCount: number
}

interface Diary {
  id: string
  characterId: string
  day: number
  fragments: Record<string, DiaryFragment>
}

const SLOT_LABELS: Record<string, string> = {
  wake: '🌅 기상',
  morning: '🌤️ 아침',
  noon: '☀️ 점심',
  evening: '🌆 저녁',
  sleep: '🌙 잠',
}

interface DiaryModalProps {
  diaryId: string | null
  onClose: () => void
}

export const DiaryModal = ({ diaryId, onClose }: DiaryModalProps) => {
  const [diary, setDiary] = useState<Diary | null>(null)
  const [activeSlot, setActiveSlot] = useState('wake')

  useEffect(() => {
    if (!diaryId) return
    setDiary(null)
    fetch(`/scenarios/diary_${diaryId}.json`)
      .then((r) => r.json())
      .then((d: Diary) => setDiary(d))
      .catch(() => setDiary(null))
  }, [diaryId])

  if (!diaryId) return null

  return (
    <Modal open={!!diaryId} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          borderRadius: 2,
          width: '92%',
          maxWidth: 520,
          maxHeight: '85vh',
          outline: 'none',
          boxShadow: 24,
          overflow: 'hidden',
        }}
      >
        {!diary ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h2">{diary.characterId}의 일기</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Day {diary.day} · 5 시간대 5 조각
              </Typography>
            </Box>

            <Stack direction="row" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
              {Object.keys(SLOT_LABELS).map((slot) => (
                <Box
                  key={slot}
                  onClick={() => setActiveSlot(slot)}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderBottom: '2px solid',
                    borderColor: activeSlot === slot ? 'primary.main' : 'transparent',
                    bgcolor: activeSlot === slot ? 'action.hover' : 'transparent',
                    fontSize: 12,
                  }}
                >
                  {SLOT_LABELS[slot]}
                </Box>
              ))}
            </Stack>

            <Box sx={{ p: 3, maxHeight: '50vh', overflow: 'auto' }}>
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-line',
                  lineHeight: 1.9,
                  fontSize: 15,
                  color: 'text.primary',
                }}
              >
                {diary.fragments[activeSlot]?.text ?? '(미해금)'}
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="contained" onClick={onClose} fullWidth>
                닫기
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Modal>
  )
}
