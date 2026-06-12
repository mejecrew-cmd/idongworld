/**
 * 📁 vn-runner/src/index.ts — @idongworld/vn-runner 공개 표면
 * ───────────────────────────────────────────────
 * 📌 역할: VN Runner 시스템 모듈의 단일 import 진입점.
 * 🔗 연결: types·template·trigger·config·VNPlayer
 *
 * 사용 예 (frontend):
 *   import { VNPlayer, configure, registerTriggerHandler } from '@idongworld/vn-runner'
 */
export type * from './types.ts'
export * from './template.ts'
export * from './trigger.ts'
export * from './config.ts'
export { VNPlayer } from './VNPlayer.tsx'
