/**
 * 📁 data/audio.ts — BGM·SFX 카탈로그
 * ───────────────────────────────────────────────
 * 📌 역할: 시나리오·화면에서 사용하는 BGM/SFX ID 통합 카탈로그.
 *           실 파일은 Week 6~7 (Kenney·Pixabay 큐레이션) 후 /assets/audio/에 배치.
 *
 * 🔗 연결:
 *   - 시나리오 JSON `bgm` `sfx` 필드
 *   - @idongworld/vn-runner (VNPlayer 재생 placeholder, Howler.js 활성은 Phase 1.5)
 *   - 기획 SoT: 매뉴얼/리소스/R04_사운드.md
 *
 * 💡 초보자 안내:
 *   - 현재 placeholder ID만 정의. 실 음원 X.
 *   - Phase 1.5에 Howler.js + 실 파일 연결 → 자동 재생.
 *   - 라이선스: Kenney.nl (CC0) 또는 Pixabay 무료.
 */

export interface AudioAsset {
  id: string
  category: 'bgm' | 'sfx'
  scene: string  // 사용처
  mood?: string  // 톤 가이드 (큐레이션용)
  source?: string  // 실 음원 출처 (Phase 1.5에 채움)
}

export const BGM: AudioAsset[] = [
  { id: 'bgm_recruit_warm',          category: 'bgm', scene: '황금멍 영입', mood: '따뜻·햇살·다정' },
  { id: 'bgm_recruit_mystic',        category: 'bgm', scene: '춤냥 영입',  mood: '신비·달빛·고요' },
  { id: 'bgm_recruit_warm_workshop', category: 'bgm', scene: '양털곰 영입', mood: '꿀향·작업실·통통' },
  { id: 'bgm_recruit_classical',     category: 'bgm', scene: '단풍볼 영입', mood: '단풍·새벽·클래식' },
  { id: 'bgm_recruit_intense',       category: 'bgm', scene: '날카여우 영입', mood: '강렬·노을·매혹' },

  { id: 'bgm_settle_warm',      category: 'bgm', scene: '황금멍 정착',  mood: '따뜻 정착' },
  { id: 'bgm_settle_mystic',    category: 'bgm', scene: '춤냥 정착',   mood: '달빛 정착' },
  { id: 'bgm_settle_intense',   category: 'bgm', scene: '날카여우 정착', mood: '노을 정착' },
  { id: 'bgm_settle_classical', category: 'bgm', scene: '단풍볼 정착',  mood: '클래식 정착' },

  { id: 'bgm_island_warm',         category: 'bgm', scene: '마이섬 (낮)',  mood: '잔잔·일상' },
  { id: 'bgm_island_mystic',       category: 'bgm', scene: '마이섬 (밤)',  mood: '고요한 밤' },
  { id: 'bgm_island_warm_workshop',category: 'bgm', scene: '마이섬 (공방)', mood: '꿀향 공방' },
  { id: 'bgm_island_classical',    category: 'bgm', scene: '마이섬 (새벽)', mood: '클래식 새벽' },
  { id: 'bgm_island_intense',      category: 'bgm', scene: '마이섬 (노을)', mood: '강렬 노을' },

  { id: 'bgm_gacha_anticipation',  category: 'bgm', scene: '가챠 진입',    mood: '기대·긴장' },
  { id: 'bgm_gacha_reveal',        category: 'bgm', scene: '가챠 결과',    mood: '환희·발견' },
]

export const SFX: AudioAsset[] = [
  { id: 'sfx_bark_friendly',  category: 'sfx', scene: '황금멍 등장',     mood: '친근 짖음' },
  { id: 'sfx_happy_wag',      category: 'sfx', scene: '꼬리 흔듦',       mood: '기쁨' },
  { id: 'sfx_arrive_warm',    category: 'sfx', scene: '정착 도착',       mood: '따뜻 종소리' },
  { id: 'sfx_unlock_chime',   category: 'sfx', scene: '해금·완료',       mood: '맑은 종' },
  { id: 'sfx_soft_step',      category: 'sfx', scene: '춤냥 등장',       mood: '사뿐 발걸음' },
  { id: 'sfx_paper_rustle',   category: 'sfx', scene: '양털곰 등장',     mood: '종이 소리' },
  { id: 'sfx_classical_note', category: 'sfx', scene: '단풍볼 등장',     mood: '클래식 한 음' },
  { id: 'sfx_dance_swish',    category: 'sfx', scene: '날카여우 춤',     mood: '바람 가르는' },
  { id: 'sfx_sharp_step',     category: 'sfx', scene: '날카여우 등장',   mood: '날카로운 발걸음' },
  { id: 'sfx_arrive_soft',    category: 'sfx', scene: '춤냥/단풍볼 정착', mood: '부드러운 도착' },
  { id: 'sfx_arrive_sharp',   category: 'sfx', scene: '날카여우 정착',   mood: '강렬한 도착' },
  { id: 'sfx_gacha_buildup',  category: 'sfx', scene: '가챠 빌드업',     mood: '에너지 차오름' },
  { id: 'sfx_gacha_chime',    category: 'sfx', scene: '가챠 발현',       mood: '맑은 결정' },
  { id: 'sfx_light_burst',    category: 'sfx', scene: '가챠 광 폭발',    mood: '환한 빛' },
]

/**
 * Phase 1.5에 실 음원 연결 시 호출 (Howler.js)
 * @example play('bgm_recruit_warm') → BGM 페이드 인 재생
 */
export function play(_id: string) {
  // Phase 1: no-op
  // Phase 1.5: Howler.js 인스턴스로 재생
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[audio]', _id, '(Phase 1: no-op)')
  }
}
