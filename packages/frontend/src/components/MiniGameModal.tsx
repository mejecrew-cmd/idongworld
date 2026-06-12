/**
 * components/MiniGameModal.tsx - 미니게임 4종 통합 진입 모달
 * ------------------------------------------------------------
 * 역할: 마이섬 풀맵에서 zone 클릭 시 해당 미니게임 컴포넌트를 모달로 표시한다.
 * 연결: 각 zone 모듈의 MiniGame 컴포넌트를 모달로 연결한다.
 * 주의: 2026-06-08 기획 변경 이후 세관 이탈 gate는 기본 core UX에서 비활성화한다.
 */
import { useState } from 'react'
import { Modal, Box } from '@mui/material'
import { GardenMiniGame } from '@idongworld/zone-garden'
import { OasisMiniGame } from '@idongworld/zone-oasis'
import { MemoryMiniGame } from '@idongworld/zone-memory'
import { MineMiniGame } from '@idongworld/zone-mine'
import { CustomsTransferDialog } from './CustomsTransferDialog'
import { api } from '@/lib/api'
import { accountStoreFacade } from '@/lib/storeFacades'

export type MiniGameId = 'garden' | 'oasis' | 'memory' | 'mine' | null
const CUSTOMS_EXIT_GATE_ENABLED = import.meta.env.VITE_CUSTOMS_EXIT_GATE_ENABLED === 'true'

const EXIT_CUSTOMS_SOURCE: Partial<Record<Exclude<MiniGameId, null>, string>> = {
  garden: 'zone-garden',
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function hasPositiveAmount(value: unknown): boolean {
  return Object.values(asRecord(value)).some((amount) => {
    const numeric = Number(amount)
    return Number.isFinite(numeric) && numeric > 0
  })
}

export const MiniGameModal = ({ game, onClose }: { game: MiniGameId; onClose: () => void }) => {
  const [customsOpen, setCustomsOpen] = useState(false)
  const sourceModule = game ? EXIT_CUSTOMS_SOURCE[game] : undefined

  const requestClose = async () => {
    if (CUSTOMS_EXIT_GATE_ENABLED && sourceModule) {
      const uid = accountStoreFacade.getFirebaseUid()
      if (!uid) {
        onClose()
        return
      }

      try {
        const response = await api.getModuleState(uid, sourceModule)
        if (hasPositiveAmount(asRecord(response.state).localResources)) {
          setCustomsOpen(true)
          return
        }
      } catch (error) {
        console.warn('[module-exit-customs] precheck failed', error)
        setCustomsOpen(true)
        return
      }

      onClose()
      return
    }
    onClose()
  }

  const leaveAfterCustoms = () => {
    setCustomsOpen(false)
    onClose()
  }

  return (
    <>
      <Modal open={!!game} onClose={requestClose}>
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
            overflow: 'auto',
          }}
        >
          {game === 'garden' && <GardenMiniGame onClose={requestClose} />}
          {game === 'oasis' && <OasisMiniGame onClose={requestClose} />}
          {game === 'memory' && <MemoryMiniGame onClose={requestClose} />}
          {game === 'mine' && <MineMiniGame onClose={requestClose} />}
        </Box>
      </Modal>

      {CUSTOMS_EXIT_GATE_ENABLED && sourceModule && (
        <CustomsTransferDialog
          open={customsOpen}
          sourceModule={sourceModule}
          exitMode
          destinationLabel="마이섬 풀맵"
          onClose={() => setCustomsOpen(false)}
          onLeave={leaveAfterCustoms}
        />
      )}
    </>
  )
}
