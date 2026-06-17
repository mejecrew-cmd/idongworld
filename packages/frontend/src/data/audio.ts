import { playManagedAudio } from '@/lib/audioManager'

export interface AudioAsset {
  id: string
  category: 'bgm' | 'sfx'
  scene: string
  mood?: string
  src?: string
  source?: string
}

export const BGM: AudioAsset[] = [
  { id: 'bgm_recruit_warm', category: 'bgm', scene: '황금멍 영입', mood: '따뜻, 햇살, 다정' },
  { id: 'bgm_recruit_mystic', category: 'bgm', scene: '춤냥 영입', mood: '신비, 달빛, 고요' },
  { id: 'bgm_recruit_warm_workshop', category: 'bgm', scene: '양털곰 영입', mood: '꿀향, 작업실, 통통' },
  { id: 'bgm_recruit_classical', category: 'bgm', scene: '단풍볼 영입', mood: '단풍, 새벽, 클래식' },
  { id: 'bgm_recruit_intense', category: 'bgm', scene: '날카여우 영입', mood: '강렬, 노을, 매혹' },
  { id: 'bgm_settle_warm', category: 'bgm', scene: '황금멍 정착', mood: '따뜻 정착' },
  { id: 'bgm_settle_mystic', category: 'bgm', scene: '춤냥 정착', mood: '달빛 정착' },
  { id: 'bgm_settle_intense', category: 'bgm', scene: '날카여우 정착', mood: '노을 정착' },
  { id: 'bgm_settle_classical', category: 'bgm', scene: '단풍볼 정착', mood: '클래식 정착' },
  { id: 'bgm_island_warm', category: 'bgm', scene: '마이섬 낮', mood: '잔잔, 일상' },
  { id: 'bgm_island_mystic', category: 'bgm', scene: '마이섬 밤', mood: '고요한 밤' },
  { id: 'bgm_island_warm_workshop', category: 'bgm', scene: '마이섬 공방', mood: '꿀향 공방' },
  { id: 'bgm_island_classical', category: 'bgm', scene: '마이섬 새벽', mood: '클래식 새벽' },
  { id: 'bgm_island_intense', category: 'bgm', scene: '마이섬 노을', mood: '강렬 노을' },
  { id: 'bgm_gacha_anticipation', category: 'bgm', scene: '가챠 진입', mood: '기대, 긴장' },
  { id: 'bgm_gacha_reveal', category: 'bgm', scene: '가챠 결과', mood: '환희, 발견' },
]

export const SFX: AudioAsset[] = [
  { id: 'sfx_bark_friendly', category: 'sfx', scene: '황금멍 등장', mood: '친근 짖음' },
  { id: 'sfx_happy_wag', category: 'sfx', scene: '꼬리 흔듦', mood: '기쁨' },
  { id: 'sfx_arrive_warm', category: 'sfx', scene: '정착 도착', mood: '따뜻 종소리' },
  { id: 'sfx_unlock_chime', category: 'sfx', scene: '해금, 완료', mood: '맑은 종' },
  { id: 'sfx_soft_step', category: 'sfx', scene: '춤냥 등장', mood: '가벼운 발걸음' },
  { id: 'sfx_paper_rustle', category: 'sfx', scene: '양털곰 등장', mood: '종이 소리' },
  { id: 'sfx_classical_note', category: 'sfx', scene: '단풍볼 등장', mood: '클래식 음' },
  { id: 'sfx_dance_swish', category: 'sfx', scene: '날카여우 춤', mood: '바람 가르는' },
  { id: 'sfx_sharp_step', category: 'sfx', scene: '날카여우 등장', mood: '날카로운 발걸음' },
  { id: 'sfx_arrive_soft', category: 'sfx', scene: '춤냥/단풍볼 정착', mood: '부드러운 도착' },
  { id: 'sfx_arrive_sharp', category: 'sfx', scene: '날카여우 정착', mood: '강렬한 도착' },
  { id: 'sfx_gacha_buildup', category: 'sfx', scene: '가챠 빌드업', mood: '에너지 차오름' },
  { id: 'sfx_gacha_chime', category: 'sfx', scene: '가챠 발현', mood: '맑은 결정' },
  { id: 'sfx_light_burst', category: 'sfx', scene: '가챠 광원 폭발', mood: '환한 빛' },
]

export function findAudioAsset(id: string): AudioAsset | undefined {
  return [...BGM, ...SFX].find((asset) => asset.id === id)
}

export function play(id: string): boolean {
  const asset = findAudioAsset(id)
  if (!asset) {
    if (import.meta.env.DEV) {
      console.log('[audio]', id, '(unknown asset)')
    }
    return false
  }

  return playManagedAudio({
    id,
    channel: asset.category === 'bgm' ? 'bgm' : 'sfx',
    src: asset.src,
    loop: asset.category === 'bgm',
  })
}
