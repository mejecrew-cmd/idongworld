/**
 * packages/modules/zone-mine/src/MineMiniGame.tsx
 * ------------------------------------------------------------
 * 역할: 광산 zone의 채굴 미니게임 UI를 제공한다.
 * 연결: 주입된 hook으로 채굴/완료 결과를 backend zone action API에 전달한다.
 * 주의: frontend store/api를 직접 import하지 않고 config hook만 호출한다.
 */
import { useRef, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { getHooks } from './config.ts'

const SIZE = 5
const ORE_COUNT = 6

function createActionKey(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

interface Tile {
  dug: boolean
  hasOre: boolean
}

function generate(): Tile[] {
  const tiles = Array.from({ length: SIZE * SIZE }, () => ({ dug: false, hasOre: false }))
  const oreIndices = new Set<number>()
  while (oreIndices.size < ORE_COUNT) {
    oreIndices.add(Math.floor(Math.random() * SIZE * SIZE))
  }
  oreIndices.forEach((index) => {
    tiles[index]!.hasOre = true
  })
  return tiles
}

export const MineMiniGame = ({ onClose }: { onClose: () => void }) => {
  const [tiles, setTiles] = useState<Tile[]>(generate)
  const [picks, setPicks] = useState(8)
  const [oreFound, setOreFound] = useState(0)
  const clearKeyRef = useRef(createActionKey('zone-mine:mine-dig'))

  const done = picks <= 0 || oreFound === ORE_COUNT

  const onDig = (index: number) => {
    if (done || tiles[index]!.dug) return

    const next = [...tiles]
    next[index] = { ...next[index]!, dug: true }
    setTiles(next)
    setPicks((value) => value - 1)

    if (next[index]!.hasOre) {
      setOreFound((value) => value + 1)
      getHooks().onCollect?.({ resources: { ore: 1 } })
    }
  }

  const onFinish = () => {
    getHooks().onComplete?.({
      clearId: 'mine-dig',
      result: { oreFound },
      idempotencyKey: clearKeyRef.current,
    })
    onClose()
  }

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h2" sx={{ mb: 1 }}>Mine Cliff</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Picks {picks}/8 / ore {oreFound}/{ORE_COUNT}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 0.5, maxWidth: 320, mx: 'auto', mb: 2 }}>
        {tiles.map((tile, index) => (
          <Box
            key={index}
            onClick={() => onDig(index)}
            sx={{
              aspectRatio: '1',
              bgcolor: tile.dug ? (tile.hasOre ? '#FFD700' : '#8B7355') : '#5C4030',
              border: '1px solid #3A2820',
              borderRadius: 0.5,
              cursor: tile.dug || done ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              userSelect: 'none',
            }}
          >
            {tile.dug ? (tile.hasOre ? 'Ore' : '-') : '?'}
          </Box>
        ))}
      </Box>
      {done && (
        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, mb: 1 }}>
          Ore {oreFound} / coins +{oreFound * 10}
        </Typography>
      )}
      <Button variant="contained" onClick={done ? onFinish : onClose}>
        {done ? 'Finish' : 'Close'}
      </Button>
    </Box>
  )
}
