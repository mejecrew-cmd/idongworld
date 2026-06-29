import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'

export type { AidongCharacterId } from '@/stores/userStore'
export type ExpressionId = 'normal' | 'happy' | 'surprised' | 'worried' | 'sleepy'

export const OUTFIT_FILTERS: Record<string, string> = {
  none: 'none',
  casual: 'hue-rotate(0deg)',
  sporty: 'hue-rotate(-50deg) saturate(1.2)',
  formal: 'hue-rotate(180deg) saturate(0.6) brightness(0.85)',
  fancy: 'hue-rotate(80deg) saturate(1.5) brightness(1.1)',
}

export const OUTFIT_OPTIONS = [
  { id: 'none', emoji: '기본', label: '기본' },
  { id: 'casual', emoji: 'C', label: '캐주얼' },
  { id: 'sporty', emoji: 'S', label: '스포티' },
  { id: 'formal', emoji: 'F', label: '포멀' },
  { id: 'fancy', emoji: 'P', label: '파티' },
]

interface AidongSpriteProps {
  character: AidongCharacterId
  expression?: ExpressionId
  outfit?: string | null
  size?: number
  onClick?: () => void
}

function getAssetPath(character: AidongCharacterId, fileName: string): string {
  return `/assets/aidong/${encodeURIComponent(character)}/${fileName}`
}

function fallbackLabel(character: AidongCharacterId): string {
  return character.slice(0, 1)
}

export const AidongSprite = ({
  character,
  expression = 'normal',
  outfit,
  size = 240,
  onClick,
}: AidongSpriteProps) => {
  const [bodyMissing, setBodyMissing] = useState(false)
  const [faceMissing, setFaceMissing] = useState(false)
  const outfitFilter = outfit && OUTFIT_FILTERS[outfit] ? OUTFIT_FILTERS[outfit] : 'none'
  const showFace = expression !== 'normal' && !faceMissing && !bodyMissing

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {bodyMissing && (
        <Box
          sx={{
            width: '82%',
            height: '82%',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(180deg, #fff4cd 0%, #f6b6ac 100%)',
            border: '2px solid rgba(255,255,255,0.78)',
            boxShadow: '0 10px 24px rgba(91,70,54,0.16)',
          }}
        >
          <Typography
            sx={{
              color: '#6b3f43',
              fontSize: Math.max(18, Math.round(size * 0.28)),
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {fallbackLabel(character)}
          </Typography>
        </Box>
      )}

      {!bodyMissing && (
        <Box
          component="img"
          src={getAssetPath(character, 'body.png')}
          alt={character}
          onError={() => setBodyMissing(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            zIndex: 1,
            filter: outfitFilter,
            transition: 'filter 0.4s',
          }}
        />
      )}

      {showFace && (
        <Box
          component="img"
          src={getAssetPath(character, `face_${expression}.png`)}
          alt=""
          aria-hidden
          onError={() => setFaceMissing(true)}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            zIndex: 2,
          }}
        />
      )}
    </Box>
  )
}

export const BoardIcon = ({ character, size = 48 }: { character: AidongCharacterId; size?: number }) => {
  const [missing, setMissing] = useState(false)

  if (missing) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#fff4cd',
          color: '#6b3f43',
          fontWeight: 900,
          border: '1px solid rgba(255,255,255,0.8)',
        }}
      >
        {fallbackLabel(character)}
      </Box>
    )
  }

  return (
    <Box
      component="img"
      src={getAssetPath(character, 'board_icon.png')}
      alt={character}
      onError={() => setMissing(true)}
      sx={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
    />
  )
}
