/**
 * packages/frontend/src/lib/storeFacades.ts
 * ------------------------------------------------------------
 * 역할: 단일 Zustand userStore를 유지하면서 모듈별 상태 접근 경계를 제공한다.
 * 연결: frontend UI, bootstrap, module action sync가 userStore 내부 구조에 직접 묶이지 않도록 얇은 facade를 둔다.
 * 주의: 새 runtime code는 가능하면 useUserStore를 직접 import하지 말고 이 파일의 module facade를 먼저 사용한다.
 */
import {
  useUserStore,
  type AidongCharacterId,
  type DynamicAidongZone,
  type MyIslandZoneSlot,
  type UserState,
} from '@/stores/userStore'

export {
  useVoyageSessionStore,
  voyageSessionFacade,
  type VoyageSession,
  type VoyageSessionLanding,
} from './voyageSessionStore'

type HostStatePatch = Partial<
  Pick<UserState, 'hostName' | 'coins' | 'diamonds' | 'gems' | 'diceCount' | 'inventory'>
>

type AccountStatePatch = Partial<
  Pick<UserState, 'firebaseUid' | 'isGuest' | 'nickname' | 'openingSeen' | 'onboardingComplete' | 'hostName'>
>

const getUserState = () => useUserStore.getState()

export const userStoreRuntimeFacade = {
  getState: () => getUserState(),
  getRecord: () => getUserState() as unknown as Record<string, unknown>,
  setState: (patch: Partial<UserState>) => useUserStore.setState(patch),
  subscribe: (listener: (state: UserState, prevState: UserState) => void) =>
    useUserStore.subscribe(listener),
}

export const accountStoreFacade = {
  useFirebaseUid: () => useUserStore((state) => state.firebaseUid),
  useNickname: () => useUserStore((state) => state.nickname),
  useIsGuest: () => useUserStore((state) => state.isGuest),
  useOnboardingComplete: () => useUserStore((state) => state.onboardingComplete),
  useOpeningSeen: () => useUserStore((state) => state.openingSeen),
  useHostName: () => useUserStore((state) => state.hostName),

  getAccountState: () => {
    const state = getUserState()
    return {
      firebaseUid: state.firebaseUid,
      isGuest: state.isGuest,
      nickname: state.nickname,
      openingSeen: state.openingSeen,
      onboardingComplete: state.onboardingComplete,
      hostName: state.hostName,
    }
  },
  getFirebaseUid: () => getUserState().firebaseUid,
  loginGuest: () => getUserState().loginGuest(),
  logout: () => getUserState().logout(),
  setNickname: (nickname: string) => useUserStore.setState({ nickname }),
  mergeAccountState: (patch: AccountStatePatch) => useUserStore.setState(patch),
  setOnboardingComplete: (onboardingComplete: boolean) =>
    useUserStore.setState({ onboardingComplete }),
  setOpeningSeen: (openingSeen: boolean) => useUserStore.setState({ openingSeen }),
  completeOnboarding: (hostName: string) => getUserState().completeOnboarding(hostName),
}

export const hostStoreFacade = {
  useCoins: () => useUserStore((state) => state.coins),
  useDiamonds: () => useUserStore((state) => state.diamonds),
  useGems: () => useUserStore((state) => state.gems),
  useDiceCount: () => useUserStore((state) => state.diceCount),
  useInventory: () => useUserStore((state) => state.inventory),

  getResources: () => {
    const state = getUserState()
    return {
      coins: state.coins,
      diamonds: state.diamonds,
      gems: state.gems,
      diceCount: state.diceCount,
      inventory: state.inventory,
    }
  },
  mergeHostState: (patch?: HostStatePatch) => {
    if (!patch) return
    useUserStore.setState(patch)
  },
  getCoins: () => getUserState().coins,
  getGems: () => getUserState().gems,
  getDiamonds: () => getUserState().diamonds,
  getDiceCount: () => getUserState().diceCount,
  getInventoryQty: (itemId: string) => getUserState().inventory[itemId] ?? 0,
  mutateCoins: (delta: number) =>
    useUserStore.setState((state) => ({ coins: state.coins + delta })),
  mutateGems: (delta: number) =>
    useUserStore.setState((state) => ({ gems: state.gems + delta })),
  mutateDiamonds: (delta: number) =>
    useUserStore.setState((state) => ({ diamonds: state.diamonds + delta })),
  mutateDiceCount: (delta: number) =>
    useUserStore.setState((state) => ({ diceCount: state.diceCount + delta })),
  mutateInventory: (itemId: string, delta: number) =>
    useUserStore.setState((state) => ({
      inventory: {
        ...state.inventory,
        [itemId]: Math.max(0, (state.inventory[itemId] ?? 0) + delta),
      },
    })),
  rewardCoins: (delta: number) => getUserState().rewardCoins(delta),
  rewardItem: (itemId: string, qty?: number) => getUserState().rewardItem(itemId, qty),
}

export const settingsStoreFacade = {
  useSoundSettings: () => useUserStore((state) => state.soundSettings),
  getSoundSettings: () => getUserState().soundSettings,
  setBgmVolume: (volume: number) => getUserState().setSoundVolume('bgm', volume),
  setSfxVolume: (volume: number) => getUserState().setSoundVolume('sfx', volume),
}

export const myAidongStoreFacade = {
  useRecruitedAidongs: () => useUserStore((state) => state.recruitedAidongs),
  useFirstGachaCandidate: () => useUserStore((state) => state.firstGachaCandidate),
  useFirstGachaAttempts: () => useUserStore((state) => state.firstGachaAttempts),
  useAffinities: () => useUserStore((state) => state.affinities),
  useNeeds: () => useUserStore((state) => state.needs),
  useCareLog: () => useUserStore((state) => state.careLog),
  useEquippedOutfit: () => useUserStore((state) => state.equippedOutfit),
  useEquippedItems: () => useUserStore((state) => state.equippedItems),

  getAidongState: () => {
    const state = getUserState()
    return {
      recruitedAidongs: state.recruitedAidongs,
      firstGachaCandidate: state.firstGachaCandidate,
      firstGachaAttempts: state.firstGachaAttempts,
      affinities: state.affinities,
      needs: state.needs,
      careLog: state.careLog,
      equippedOutfit: state.equippedOutfit,
      equippedItems: state.equippedItems,
    }
  },
  recruitAidong: (id: AidongCharacterId) => getUserState().recruitAidong(id),
  addAffinity: (id: AidongCharacterId, delta: number) => getUserState().addAffinity(id, delta),
  decreaseAffinityScore: (id: AidongCharacterId, delta: number) =>
    useUserStore.setState((state) => ({
      affinities: {
        ...state.affinities,
        [id]: {
          ...(state.affinities[id] ?? { score: 0, level: 0 }),
          score: Math.max(0, (state.affinities[id]?.score ?? 0) + delta),
        },
      },
    })),
  tickSequenceDecay: (id: AidongCharacterId) => getUserState().tickSequenceDecay(id),
  applyCareAction: (id: AidongCharacterId, actionId: string) =>
    getUserState().applyCareAction(id, actionId),
  setOutfit: (id: AidongCharacterId, outfitId: string) =>
    getUserState().setOutfit(id, outfitId),
  toggleEquippedItemLocal: (id: AidongCharacterId, itemId: string) =>
    useUserStore.setState((state) => {
      const current = state.equippedItems[id] ?? []
      const next = current.includes(itemId)
        ? current.filter((value) => value !== itemId)
        : [...current, itemId]
      return {
        equippedItems: {
          ...state.equippedItems,
          [id]: next,
        },
      }
    }),
  incrementFirstGachaAttempts: () =>
    useUserStore.setState((state) => ({
      firstGachaAttempts: state.firstGachaAttempts + 1,
    })),
}

export const myIslandStoreFacade = {
  useUnlockedZones: () => useUserStore((state) => state.unlockedZones),
  useZoneSlots: () => useUserStore((state) => state.zoneSlots),
  useDynamicAidongZones: () => useUserStore((state) => state.dynamicAidongZones),
  useVisibleDynamicAidongZones: () => useUserStore((state) => (
    Object.values(state.dynamicAidongZones)
      .filter((zone) => zone.status === 'active')
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.displayOrder - b.displayOrder)
  )),

  getUserProgress: () => {
    const state = getUserState()
    return {
      tutorialComplete: state.onboardingComplete,
      recruitedCount: state.recruitedAidongs.length,
      clearedZones: [] as string[],
      unlockedZones: state.unlockedZones,
      zoneSlots: state.zoneSlots,
      dynamicAidongZones: state.dynamicAidongZones,
    }
  },
  getUnlockedZones: () => getUserState().unlockedZones,
  getZoneSlots: () => getUserState().zoneSlots,
  getDynamicAidongZones: () => getUserState().dynamicAidongZones,
  listVisibleDynamicAidongZones: () => (
    Object.values(getUserState().dynamicAidongZones)
      .filter((zone) => zone.status === 'active')
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.displayOrder - b.displayOrder)
  ),
  unlockZone: (zone: string) => getUserState().unlockZone(zone),
  setZoneSlots: (zoneSlots: Record<string, MyIslandZoneSlot>) =>
    getUserState().setZoneSlots(zoneSlots),
  upsertDynamicAidongZone: (zone: DynamicAidongZone) =>
    getUserState().upsertDynamicAidongZone(zone),
  updateDynamicAidongZoneLocal: (
    zoneId: string,
    patch: Partial<Pick<DynamicAidongZone, 'status' | 'displayOrder' | 'pinned'>>,
  ) => getUserState().updateDynamicAidongZoneLocal(zoneId, patch),
}

export const codexStoreFacade = {
  useUnlockedDiaries: () => useUserStore((state) => state.unlockedDiaries),
  useUnlockedCodexEntries: () => useUserStore((state) => state.unlockedCodexEntries),
  useCodexFullyRegistered: () => useUserStore((state) => state.codexFullyRegistered),

  getCodexState: () => {
    const state = getUserState()
    return {
      unlockedDiaries: state.unlockedDiaries,
      unlockedCodexEntries: state.unlockedCodexEntries,
      codexFullyRegistered: state.codexFullyRegistered,
    }
  },
  unlockDiary: (id: string) => getUserState().unlockDiary(id),
  unlockCodexSlot: (id: AidongCharacterId) => getUserState().unlockCodexSlot(id),
  fullyRegisterCodex: (id: AidongCharacterId) => getUserState().fullyRegisterCodex(id),
}

// Legacy facade: currentRoute/boardPosition은 더 이상 DB나 localStorage 권위 상태가 아니다.
// 신규 항해 화면은 voyageSessionFacade를 사용한다.
export const routeNeighborStoreFacade = {
  useCurrentRoute: () => useUserStore((state) => state.currentRoute),
  useBoardPosition: () => useUserStore((state) => state.boardPosition),
  getBoardPosition: () => getUserState().boardPosition,

  getRouteState: () => {
    const state = getUserState()
    return {
      currentRoute: state.currentRoute,
      boardPosition: state.boardPosition,
    }
  },
  startVoyage: (routeId: string) => getUserState().startVoyage(routeId),
  rollDice: () => getUserState().rollDice(),
  movePosition: (steps: number) => getUserState().movePosition(steps),
  endVoyage: () => getUserState().endVoyage(),
}

export const shipStoreFacade = {
  useHarborAssignedChars: () => useUserStore((state) => state.harborAssignedChars),
  useHarborLastChargedAt: () => useUserStore((state) => state.harborLastChargedAt),

  getShipState: () => {
    const state = getUserState()
    return {
      harborAssignedChars: state.harborAssignedChars,
      harborLastChargedAt: state.harborLastChargedAt,
    }
  },
  toggleHarborAssign: (id: AidongCharacterId) => getUserState().toggleHarborAssign(id),
  chargeDiceFromHarbor: () => getUserState().chargeDiceFromHarbor(),
}
