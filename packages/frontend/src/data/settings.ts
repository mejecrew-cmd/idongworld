export type SoundChannel = 'bgm' | 'sfx'

export interface SoundSettings {
  bgmVolume: number
  sfxVolume: number
}

export const SOUND_VOLUME_MIN = 0
export const SOUND_VOLUME_MAX = 100
export const SOUND_VOLUME_STEP = 1

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  bgmVolume: 100,
  sfxVolume: 100,
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return SOUND_VOLUME_MIN
  return Math.max(SOUND_VOLUME_MIN, Math.min(SOUND_VOLUME_MAX, Math.round(value)))
}

export function getSoundGain(value: number): number {
  return clampVolume(value) / SOUND_VOLUME_MAX
}
