/**
 * packages/modules/zone-memory/src/MemoryMiniGame.tsx
 * ------------------------------------------------------------
 * 역할: 기억의 숲 zone의 카드 매칭 미니게임 UI를 제공한다.
 * 연결: 주입된 hook으로 완료 결과를 backend zone action API에 전달한다.
 * 주의: frontend store/api를 직접 import하지 않고 config hook만 호출한다.
 */
import { useEffect, useRef, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { getHooks } from './config.ts'

const ICONS = ['A', 'B', 'C', 'D']

function createActionKey(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

interface Card {
  idx: number
  label: string
  flipped: boolean
  matched: boolean
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j]!, next[i]!]
  }
  return next
}

export const MemoryMiniGame = ({ onClose }: { onClose: () => void }) => {
  const [cards, setCards] = useState<Card[]>(() => {
    const doubled = [...ICONS, ...ICONS]
    return shuffle(doubled).map((label, idx) => ({ idx, label, flipped: false, matched: false }))
  })
  const [first, setFirst] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [moves, setMoves] = useState(0)
  const [rewarded, setRewarded] = useState(false)
  const clearKeyRef = useRef(createActionKey('zone-memory:memory-match'))
  const allMatched = cards.every((card) => card.matched)

  useEffect(() => {
    if (allMatched && cards.length > 0 && !rewarded) {
      getHooks().onComplete?.({
        resources: { memory_piece: 1 },
        clearId: 'memory-match',
        result: { moves },
        idempotencyKey: clearKeyRef.current,
      })
      setRewarded(true)
    }
  }, [allMatched, cards.length, moves, rewarded])

  const onFlip = (idx: number) => {
    if (busy) return
    const card = cards[idx]!
    if (card.flipped || card.matched) return

    const next = [...cards]
    next[idx] = { ...card, flipped: true }
    setCards(next)

    if (first === null) {
      setFirst(idx)
      return
    }

    setBusy(true)
    setMoves((value) => value + 1)
    setTimeout(() => {
      if (next[first]!.label === card.label) {
        next[first] = { ...next[first]!, matched: true }
        next[idx] = { ...card, flipped: true, matched: true }
      } else {
        next[first] = { ...next[first]!, flipped: false }
        next[idx] = { ...card, flipped: false }
      }
      setCards(next)
      setFirst(null)
      setBusy(false)
    }, 700)
  }

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h2" sx={{ mb: 1 }}>Memory Forest</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Match the pairs. Moves: {moves}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, maxWidth: 320, mx: 'auto', mb: 2 }}>
        {cards.map((card, i) => (
          <Box
            key={card.idx}
            onClick={() => onFlip(i)}
            sx={{
              aspectRatio: '1',
              bgcolor: card.matched ? 'success.light' : card.flipped ? 'background.paper' : 'primary.light',
              border: '2px solid',
              borderColor: card.matched ? 'success.main' : 'primary.main',
              borderRadius: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              userSelect: 'none',
            }}
          >
            {card.flipped || card.matched ? card.label : '?'}
          </Box>
        ))}
      </Box>
      {allMatched && (
        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, mb: 2 }}>
          Memory piece +1
        </Typography>
      )}
      <Button variant="contained" onClick={onClose}>Close</Button>
    </Box>
  )
}
