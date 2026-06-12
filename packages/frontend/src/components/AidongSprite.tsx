/**
 * 📁 components/AidongSprite.tsx — 캐릭터 PNG 합성 컴포넌트
 * ───────────────────────────────────────────────
 * 📌 역할: 본체 PNG + 표정 오버레이 + 옷 색감 필터를 z-order로 합성.
 *           Phase 1 PNG 정책의 핵심 렌더 컴포넌트.
 *
 * 🔗 연결:
 *   - 기획 SoT: 매뉴얼/시스템/S08_AidongSprite.md
 *   - 자산: 와이어프레임/assets-dummy/캐릭터/{종}_{이름}/*.png (symlink)
 *   - 사용처: HubHeartScene·LodgeScene·CareModal·DebutStageScene + @idongworld/vn-runner (DI renderCharacter)
 *
 * 💡 초보자 안내:
 *   - 캐릭터 ID → 종 매핑 (SPECIES_MAP)
 *   - 5표정 (normal·happy·surprised·worried·sleepy)
 *   - 옷은 Phase 1에선 CSS hue-rotate 필터로 단순 색감 변경
 *   - z-order: 1=body, 9=face_overlay (normal일 때는 body만 표시)
 *   - BoardIcon: 부루마블 보드 칸·항구 배치용 작은 아이콘 (256×256)
 *
 *   사용 예:
 *     <AidongSprite character="황금멍" expression="happy" outfit="casual" size={120} />
 */
import { Box } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'

export type { AidongCharacterId } from '@/stores/userStore'
export type ExpressionId = 'normal' | 'happy' | 'surprised' | 'worried' | 'sleepy'

const SPECIES_MAP: Record<AidongCharacterId, string> = {
  황금멍: '강아지',
  춤냥: '고양이',
  양털곰: '곰돌이',
  단풍볼: '햄스터',
  날카여우: '여우',
}

// Phase 1 단순 옷 시스템 — CSS filter overlay (실 PNG 의상은 Phase 2)
export const OUTFIT_FILTERS: Record<string, string> = {
  none: 'none',
  casual: 'hue-rotate(0deg)',
  sporty: 'hue-rotate(-50deg) saturate(1.2)',
  formal: 'hue-rotate(180deg) saturate(0.6) brightness(0.85)',
  fancy: 'hue-rotate(80deg) saturate(1.5) brightness(1.1)',
}

export const OUTFIT_OPTIONS = [
  { id: 'none', emoji: '🚫', label: '맨몸' },
  { id: 'casual', emoji: '👕', label: '캐주얼' },
  { id: 'sporty', emoji: '🩳', label: '스포티' },
  { id: 'formal', emoji: '👔', label: '포멀' },
  { id: 'fancy', emoji: '👗', label: '파티' },
]

interface AidongSpriteProps {
  character: AidongCharacterId
  expression?: ExpressionId
  outfit?: string | null
  size?: number
  onClick?: () => void
}

export const AidongSprite = ({
  character,
  expression = 'normal',
  outfit,
  size = 240,
  onClick,
}: AidongSpriteProps) => {
  const species = SPECIES_MAP[character]
  const folder = `${species}_${character}`
  const basePath = `/assets/캐릭터/${folder}`
  const outfitFilter = outfit && OUTFIT_FILTERS[outfit] ? OUTFIT_FILTERS[outfit] : 'none'

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <img
        src={`${basePath}/body.png`}
        alt={character}
        style={{
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
      {expression !== 'normal' && (
        <img
          src={`${basePath}/face_${expression}.png`}
          alt={expression}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            zIndex: 9,
            transition: 'opacity 0.3s',
          }}
        />
      )}
    </Box>
  )
}

export const BoardIcon = ({ character, size = 48 }: { character: AidongCharacterId; size?: number }) => {
  const species = SPECIES_MAP[character]
  return (
    <img
      src={`/assets/캐릭터/${species}_${character}/board_icon.png`}
      alt={character}
      style={{ width: size, height: size, borderRadius: '50%' }}
    />
  )
}
