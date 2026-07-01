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

// Aidong part layout rule from art:
// Head and body must overlap by exactly 47 source pixels at the neck.
// Every layered Aidong uses this same coordinate system.
const AIDONG_PART_LAYOUT = {
  headWidth: 1160,
  headHeight: 980,
  bodyWidth: 820,
  bodyHeight: 600,
  topWidth: 740,
  topHeight: 358,
  bottomWidth: 520,
  bottomHeight: 310,
  headBodyOverlapPx: 47,
} as const

const pct = (value: number, base: number) => `${(value / base) * 100}%`

const OUTFIT_PARTS: Record<string, { top?: string; bottom?: string }> = {
  none: {},
  casual: { top: 'T_Top01.png', bottom: 'B_Pants01.png' },
  sporty: { top: 'T_Top02.png', bottom: 'B_Pants02.png' },
  formal: { top: 'T_Top02.png', bottom: 'B_Pants01.png' },
  fancy: { top: 'T_Top01.png', bottom: 'B_Pants02.png' },
  smoke_outfit: { top: 'T_Top02.png', bottom: 'B_Pants02.png' },
  'temp-hoodie': { top: 'T_Top01.png' },
  'temp-jeans': { bottom: 'B_Pants01.png' },
}

const AIDONG_ASSET_CODES: Partial<Record<AidongCharacterId, string>> = {
  황금멍: 'AIDONG-0019',
  춤냥: 'AIDONG-0119',
}

const AIDONG_PART_VISIBLE_BOUNDS: Record<string, { headVisibleBottom: number; bodyVisibleTop: number }> = {
  'AIDONG-0019': { headVisibleBottom: 975, bodyVisibleTop: 40 },
  'AIDONG-0119': { headVisibleBottom: 979, bodyVisibleTop: 40 },
}

function getLayerLayout(assetCode?: string) {
  const bounds = assetCode ? AIDONG_PART_VISIBLE_BOUNDS[assetCode] : undefined
  const bodyTop = bounds
    ? bounds.headVisibleBottom - AIDONG_PART_LAYOUT.headBodyOverlapPx - bounds.bodyVisibleTop
    : AIDONG_PART_LAYOUT.headHeight - AIDONG_PART_LAYOUT.headBodyOverlapPx
  return {
    bodyTop,
    stageHeight: bodyTop + AIDONG_PART_LAYOUT.bodyHeight,
  }
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
  outfitItems?: string[]
  size?: number
  onClick?: () => void
}

function getAssetPath(character: AidongCharacterId, fileName: string): string {
  return `/assets/aidong/${encodeURIComponent(character)}/${fileName}`
}

function getClothesAssetPath(kind: 'top' | 'bottom', fileName: string): string {
  const dir = kind === 'top' ? '00_Top' : '01_Bottom'
  return `/assets/aidong/99_Resources/01_Clothes/${dir}/${fileName}`
}

function getPartAssetPath(character: AidongCharacterId, part: 'Head' | 'Body'): string {
  const code = AIDONG_ASSET_CODES[character]
  if (!code) return getAssetPath(character, part === 'Head' ? 'head.png' : 'body_part.png')
  return `/assets/aidong/99_Resources/00_Aidong/${code}_${part}.png`
}

function fallbackLabel(character: AidongCharacterId): string {
  return character.slice(0, 1)
}

export const AidongSprite = ({
  character,
  expression = 'normal',
  outfit,
  outfitItems,
  size = 240,
  onClick,
}: AidongSpriteProps) => {
  const [bodyMissing, setBodyMissing] = useState(false)
  const [faceMissing, setFaceMissing] = useState(false)
  const [headPartMissing, setHeadPartMissing] = useState(false)
  const [bodyPartMissing, setBodyPartMissing] = useState(false)
  const outfitFilter = outfit && OUTFIT_FILTERS[outfit] ? OUTFIT_FILTERS[outfit] : 'none'
  const outfitParts = (outfitItems?.length ? outfitItems : [outfit ?? 'none'])
    .reduce<{ top?: string; bottom?: string }>((parts, outfitId) => ({
      ...parts,
      ...OUTFIT_PARTS[outfitId],
    }), {})
  const useLayeredParts = !headPartMissing && !bodyPartMissing
  const assetCode = AIDONG_ASSET_CODES[character]
  const layerLayout = getLayerLayout(assetCode)
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
      {bodyMissing && !useLayeredParts && (
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

      {useLayeredParts && (
        <Box
          aria-hidden
          sx={{
            position: 'relative',
            width: size * (AIDONG_PART_LAYOUT.headWidth / layerLayout.stageHeight),
            height: size,
          }}
        >
          <Box
            component="img"
            src={getPartAssetPath(character, 'Body')}
            alt=""
            onError={() => setBodyPartMissing(true)}
            sx={{
              position: 'absolute',
              left: '50%',
              top: pct(layerLayout.bodyTop, layerLayout.stageHeight),
              width: pct(AIDONG_PART_LAYOUT.bodyWidth, AIDONG_PART_LAYOUT.headWidth),
              height: pct(AIDONG_PART_LAYOUT.bodyHeight, layerLayout.stageHeight),
              transform: 'translateX(-50%)',
              objectFit: 'fill',
              zIndex: 1,
            }}
          />
          {outfitParts.bottom && (
            <Box
              component="img"
              src={getClothesAssetPath('bottom', outfitParts.bottom)}
              alt=""
              sx={{
                position: 'absolute',
                left: '50%',
                top: pct(layerLayout.bodyTop + AIDONG_PART_LAYOUT.bodyHeight - AIDONG_PART_LAYOUT.bottomHeight, layerLayout.stageHeight),
                width: pct(AIDONG_PART_LAYOUT.bottomWidth, AIDONG_PART_LAYOUT.headWidth),
                height: pct(AIDONG_PART_LAYOUT.bottomHeight, layerLayout.stageHeight),
                transform: 'translateX(-50%)',
                objectFit: 'fill',
                zIndex: 2,
              }}
            />
          )}
          {outfitParts.top && (
            <Box
              component="img"
              src={getClothesAssetPath('top', outfitParts.top)}
              alt=""
              sx={{
                position: 'absolute',
                left: '50%',
                top: pct(layerLayout.bodyTop, layerLayout.stageHeight),
                width: pct(AIDONG_PART_LAYOUT.topWidth, AIDONG_PART_LAYOUT.headWidth),
                height: pct(AIDONG_PART_LAYOUT.topHeight, layerLayout.stageHeight),
                transform: 'translateX(-50%)',
                objectFit: 'fill',
                zIndex: 3,
              }}
            />
          )}
          <Box
            component="img"
            src={getPartAssetPath(character, 'Head')}
            alt={character}
            onError={() => setHeadPartMissing(true)}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: pct(AIDONG_PART_LAYOUT.headHeight, layerLayout.stageHeight),
              objectFit: 'fill',
              zIndex: 4,
            }}
          />
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
            opacity: useLayeredParts ? 0 : 1,
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
