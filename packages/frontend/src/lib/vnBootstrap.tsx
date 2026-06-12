/**
 * 📁 lib/vnBootstrap.ts — vn-runner DI 부트스트랩
 * ───────────────────────────────────────────────
 * 📌 역할: 앱 시작 시 @idongworld/vn-runner 에 frontend 의존성을 주입.
 *           - renderCharacter: AidongSprite 컴포넌트
 *           - triggerHandlers: userStore 액션들
 *           - onPlaySfx: (Phase 1.5+) Howler 통합 placeholder
 *
 * 🔗 연결:
 *   - main.tsx → bootstrapVNRunner() 1회 호출 (앱 mount 직전)
 *   - components/AidongSprite.tsx (캐릭터 렌더 주입)
 *   - stores/userStore.ts (trigger → store 액션 dispatch)
 *
 * 💡 초보자 안내:
 *   - vn-runner 는 frontend store·sprite 를 모름 — 여기서 한 번만 연결.
 *   - 새 trigger verb 가 필요하면 registerTriggerHandler() 로 동적 추가 가능.
 *   - 모듈 분리 헌법: vn-runner 는 시스템 모듈, 본 파일은 frontend(소비자) 측.
 */
import { configure } from '@idongworld/vn-runner'
import * as host from '@idongworld/host'
import * as myAidong from '@idongworld/my-aidong'
import * as codex from '@idongworld/codex'
import { incrementRetryCount } from '@idongworld/gacha'
import { AidongSprite } from '@/components/AidongSprite'
import type { AidongCharacterId, ExpressionId } from '@/components/AidongSprite'

// useUserStore 의존 정착 완료 — 모든 trigger 가 host·myAidong·codex·gacha actions 위임

const AIDONG_IDS: AidongCharacterId[] = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']

const isAidongChar = (id: string): id is AidongCharacterId =>
  (AIDONG_IDS as string[]).includes(id)

/**
 * 앱 시작 시 1회 호출. main.tsx 의 bootstrapAuth 직후 권장.
 */
export function bootstrapVNRunner(): void {
  configure({
    renderCharacter: ({ id, expression, size }) => {
      if (!isAidongChar(id)) return null
      return (
        <AidongSprite
          character={id}
          expression={(expression as ExpressionId) ?? 'normal'}
          size={size ?? 360}
        />
      )
    },
    triggerHandlers: {
      // 친밀도·영입 — my-aidong 모듈 actions 위임 (정착)
      'affinity_+1': (charId) => {
        if (isAidongChar(charId)) myAidong.addAffinity(charId, 1)
      },
      'affinity_+2': (charId) => {
        if (isAidongChar(charId)) myAidong.addAffinity(charId, 2)
      },
      'affinity_+3': (charId) => {
        if (isAidongChar(charId)) myAidong.addAffinity(charId, 3)
      },
      unlock_aidong: (charId) => {
        if (isAidongChar(charId)) myAidong.recruit(charId)
      },
      // 도감·일기 — codex 광역 모듈 actions 위임 (정착 완료)
      unlock_diary: (id) => {
        codex.unlockDiary(id)
      },
      unlock_codex_slot: (charId) => {
        if (isAidongChar(charId)) codex.unlockCodexSlot(charId)
      },
      unlock_codex_full: (charId) => {
        if (isAidongChar(charId)) codex.fullyRegisterCodex(charId)
      },
      gacha_confirm: () => {
        // recruit 시나리오로 이동 — VNPlayer scene level에서 처리됨
      },
      gacha_retry: () => {
        // 명시적 retry — gacha 모듈 actions 위임 (정착 완료·useUserStore 의존 0)
        incrementRetryCount('first-meeting')
      },
      // 자원 변경 — host actions 위임 (정착)
      deduct_gems: (n) => {
        host.spendGems(Number(n))
      },
      give_material: (matId) => {
        // payload 가 자재 ID — 1개 사용 (시나리오에서 비용 차감 의미)
        host.consumeMaterial(matId as host.MaterialId, 1)
      },
    },
    onPlaySfx: () => {
      // TODO: Howler.js 연동 (Phase 1.5)
    },
  })
}
