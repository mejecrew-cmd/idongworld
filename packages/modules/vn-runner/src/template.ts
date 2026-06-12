/**
 * 📁 vn-runner/src/template.ts — 시나리오 동적 변수 치환
 * ───────────────────────────────────────────────
 * 📌 역할: 시나리오 JSON 안 `{{변수}}` 패턴을 런타임 값으로 치환.
 *           Mustache 호환 단순 문법.
 *
 * 🔗 연결:
 *   - types.ts → VNContext 타입
 *   - VNPlayer.tsx → 시나리오 로드 직후 호출
 *
 * 💡 초보자 안내:
 *   - 사용 예: `"{{result.characterId}} 입니다!"` → `"황금멍 입니다!"`
 *     (가챠 결과 등 런타임 결정값을 시나리오 텍스트에 주입)
 *   - applyTemplate: 단일 문자열 치환
 *   - applyTemplateToScene: scene 객체 전체를 재귀적으로 치환
 *   - 미해석 변수: 그대로 둠 (예: `{{unknown}}` 유지) → 개발 시 누락 발견 쉽게.
 */
import type { VNContext } from './types.ts'

export function applyTemplate(value: string, ctx: VNContext): string {
  return value.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
    const keys = path.trim().split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let v: any = ctx
    for (const k of keys) {
      v = v?.[k]
      if (v === undefined) return match
    }
    return String(v)
  })
}

// Scene 안 모든 string 필드 재귀적으로 치환
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyTemplateToScene<T = any>(scene: T, ctx: VNContext): T {
  if (typeof scene === 'string') {
    return applyTemplate(scene, ctx) as unknown as T
  }
  if (Array.isArray(scene)) {
    return scene.map((s) => applyTemplateToScene(s, ctx)) as unknown as T
  }
  if (scene && typeof scene === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(scene)) {
      out[k] = applyTemplateToScene(v, ctx)
    }
    return out as T
  }
  return scene
}
