/**
 * 📁 components/CustomsConfirmModal.tsx — customs 변환 확인 모달 (MUI)
 * ───────────────────────────────────────────────
 * 📌 역할: customs.confirmUI 가 호출되면 글로벌 모달 표시.
 *           헌법 §3.2 — 자원 변환은 명시적 UI 확인 강제.
 *
 * 🔗 연결:
 *   - lib/customsModal.ts (subscribe·resolveCustomsConfirm)
 *   - App.tsx 에서 글로벌 마운트 (모든 화면 위)
 *
 * 💡 사용:
 *   - 모듈에서 customs.apply() 호출 → confirmUI 훅 → confirmCustoms(sim)
 *   - 본 모달이 자동 표시 → OK/취소 → Promise resolve
 */
import { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Stack, Chip } from '@mui/material'
import { subscribeCustomsConfirm, resolveCustomsConfirm, type PendingConfirm } from '@/lib/customsModal'

export const CustomsConfirmModal = () => {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  useEffect(() => subscribeCustomsConfirm(setPending), [])

  const onApprove = () => resolveCustomsConfirm(true)
  const onReject = () => resolveCustomsConfirm(false)

  if (!pending) return null
  const { sim } = pending
  const r = sim.rule

  return (
    <Dialog open onClose={onReject} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        🚢 {r.label}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          자원을 변환하시겠어요?
        </Typography>

        {/* 변환 미리보기 */}
        <Box sx={{
          bgcolor: 'background.default',
          borderRadius: 2,
          p: 2,
          mb: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack alignItems="center" spacing={0.5}>
              <Chip label={`-${sim.fromAmount}`} color="warning" />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {r.fromResource}
              </Typography>
            </Stack>
            <Typography variant="h5" sx={{ color: 'text.secondary' }}>→</Typography>
            <Stack alignItems="center" spacing={0.5}>
              <Chip label={`+${sim.toAmount}`} color="success" />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {r.toResource}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {sim.remainder > 0 && (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', textAlign: 'center' }}>
            잔량: {sim.remainder} {r.fromResource} (변환되지 않음)
          </Typography>
        )}

        {r.description && (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 2, fontStyle: 'italic' }}>
            {r.description}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onReject} variant="text">취소</Button>
        <Button onClick={onApprove} variant="contained" autoFocus>변환하기</Button>
      </DialogActions>
    </Dialog>
  )
}
