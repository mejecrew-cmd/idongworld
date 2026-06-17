import { getSoundGain, type SoundChannel } from '@/data/settings'
import { userStoreRuntimeFacade } from './storeFacades'

interface PlayAudioOptions {
  id: string
  channel: SoundChannel
  src?: string
  loop?: boolean
}

let bootstrapped = false
let activeBgm: HTMLAudioElement | null = null
const activeSfx = new Set<HTMLAudioElement>()

function getChannelGain(channel: SoundChannel): number {
  const settings = userStoreRuntimeFacade.getState().soundSettings
  return getSoundGain(channel === 'bgm' ? settings.bgmVolume : settings.sfxVolume)
}

function applyCurrentVolumes() {
  if (activeBgm) activeBgm.volume = getChannelGain('bgm')
  for (const audio of activeSfx) {
    audio.volume = getChannelGain('sfx')
  }
}

export function bootstrapAudioManager() {
  if (bootstrapped) return
  bootstrapped = true
  applyCurrentVolumes()

  userStoreRuntimeFacade.subscribe((state, prev) => {
    if (state.soundSettings === prev.soundSettings) return
    applyCurrentVolumes()
  })
}

export function stopBgm() {
  if (!activeBgm) return
  activeBgm.pause()
  activeBgm.currentTime = 0
  activeBgm = null
}

export function playManagedAudio({ id, channel, src, loop = false }: PlayAudioOptions): boolean {
  if (!src) {
    if (import.meta.env.DEV) {
      console.log(`[audio] ${id}: resource not connected yet`)
    }
    return false
  }

  const audio = new Audio(src)
  audio.loop = loop
  audio.volume = getChannelGain(channel)

  if (channel === 'bgm') {
    stopBgm()
    activeBgm = audio
  } else {
    activeSfx.add(audio)
    audio.addEventListener('ended', () => activeSfx.delete(audio), { once: true })
    audio.addEventListener('error', () => activeSfx.delete(audio), { once: true })
  }

  void audio.play().catch((error) => {
    if (import.meta.env.DEV) {
      console.warn(`[audio] ${id}: play failed`, error)
    }
    if (channel === 'bgm' && activeBgm === audio) activeBgm = null
    activeSfx.delete(audio)
  })

  return true
}
