/**
 * packages/modules/zone-oasis/src/OasisMiniGame.tsx
 * ------------------------------------------------------------
 * 역할: 오아시스 zone의 짧은 휴식 미니게임 UI를 제공한다.
 * 연결: 주입된 hook으로 완료 결과를 backend zone action API에 전달한다.
 * 주의: frontend store/api를 직접 import하지 않고 config hook만 호출한다.
 */
import { useEffect, useRef, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { getHooks } from './config.ts'

function createActionKey(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

export const OasisMiniGame = ({ onClose }: { onClose: () => void }) => {
  const [given, setGiven] = useState(false)
  const clearKeyRef = useRef(createActionKey('zone-oasis:oasis-rest'))

  useEffect(() => {
    const timer = setTimeout(() => {
      getHooks().onComplete?.({
        resources: { rest_token: 1 },
        clearId: 'oasis-rest',
        idempotencyKey: clearKeyRef.current,
      })
      setGiven(true)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h2" sx={{ mb: 2 }}>Rest Oasis</Typography>
      <Box sx={{ fontSize: 100, mb: 2 }}>~</Box>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1, lineHeight: 1.8 }}>
        Take a short rest by the water.
      </Typography>
      {given && (
        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, mb: 2 }}>
          Rest token +1 / coins +10
        </Typography>
      )}
      <Button variant="contained" onClick={onClose}>Done</Button>
    </Box>
  )
}
