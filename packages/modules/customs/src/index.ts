/**
 * 📁 customs/src/index.ts — @idongworld/customs 공개 표면
 *
 * 사용 예 (frontend):
 *   import { registerRule, simulate, apply, configure } from '@idongworld/customs'
 */
export type * from './types.ts'
export {
  registerRule,
  registerCsv,
  getRule,
  listRules,
  simulate,
  apply,
} from './engine.ts'
export {
  configure,
  getHooks,
} from './config.ts'
export type { CustomsHooks } from './config.ts'
