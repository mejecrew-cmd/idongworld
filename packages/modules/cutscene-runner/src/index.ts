/**
 * 📁 cutscene-runner/src/index.ts — @idongworld/cutscene-runner 공개 표면
 */
export type * from './types.ts'
export {
  register,
  registerAll,
  findFor,
  markWatched,
  watchedKeyOf,
  listAll,
} from './registry.ts'
export {
  configure,
  getHooks,
} from './config.ts'
export type { CutsceneRunnerHooks } from './config.ts'
export { CutscenePlayer } from './CutscenePlayer.tsx'
