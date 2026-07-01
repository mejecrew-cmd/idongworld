export const BEDROOM_TEXT_IDS = {
  outfitHoodieName: 'BDR_UI_0001',
  outfitHoodieVisual: 'BDR_UI_0002',
  outfitJeansName: 'BDR_UI_0003',
  outfitJeansVisual: 'BDR_UI_0004',
  outfitMockDescription: 'BDR_UI_0005',
  outfitNoneName: 'BDR_UI_0006',
  outfitNoneDescription: 'BDR_UI_0007',
  outfitNoneVisual: 'BDR_UI_0008',
  categoryAll: 'BDR_UI_0009',
  categoryBed: 'BDR_UI_0010',
  categoryChair: 'BDR_UI_0011',
  categoryTable: 'BDR_UI_0012',
  categoryWall: 'BDR_UI_0013',
  categoryPlant: 'BDR_UI_0014',
  categoryTop: 'BDR_UI_0015',
  categoryBottom: 'BDR_UI_0016',
  categoryHat: 'BDR_UI_0017',
  categoryShoes: 'BDR_UI_0018',
  actionBack: 'BDR_UI_0019',
  actionClose: 'BDR_UI_0020',
  actionCloseGlyph: 'BDR_UI_0021',
  actionPlace: 'BDR_UI_0022',
  actionChangeAidong: 'BDR_UI_0023',
  actionDecorateRoom: 'BDR_UI_0024',
  actionDressAidong: 'BDR_UI_0025',
  actionCamera: 'BDR_UI_0026',
  actionUndress: 'BDR_UI_0027',
  actionEquip: 'BDR_UI_0028',
  cameraMobileOnly: 'BDR_UI_0029',
  aidongNamePlaceholder: 'BDR_UI_0030',
  aidongRoomTitle: 'BDR_UI_0031',
  ownedAidongListTitle: 'BDR_UI_0035',
  yardLocation: 'BDR_UI_0036',
  placementPrompt: 'BDR_UI_0037',
  itemEquippedBy: 'BDR_UI_0038',
  itemEquippedWarning: 'BDR_UI_0039',
  levelLabel: 'BDR_UI_0040',
  noAvailableAidong: 'BDR_UI_0041',
} as const

export type BedroomTextId = typeof BEDROOM_TEXT_IDS[keyof typeof BEDROOM_TEXT_IDS]
export type BedroomTextTable = Partial<Record<string, string>>

export const BEDROOM_TEXT_FALLBACKS: Record<string, string> = {
  BDR_UI_0001: '후드티',
  BDR_UI_0002: '후드',
  BDR_UI_0003: '청바지',
  BDR_UI_0004: '청바지',
  BDR_UI_0005: '임시 데이터입니다.',
  BDR_UI_0006: '벗기',
  BDR_UI_0007: '기본 미착용 상태로 되돌립니다.',
  BDR_UI_0008: 'OFF',
  BDR_UI_0009: 'ALL',
  BDR_UI_0010: '침대',
  BDR_UI_0011: '의자',
  BDR_UI_0012: '탁자',
  BDR_UI_0013: '벽',
  BDR_UI_0014: '화분',
  BDR_UI_0015: '상의',
  BDR_UI_0016: '하의',
  BDR_UI_0017: '모자',
  BDR_UI_0018: '신발',
  BDR_UI_0019: '뒤로가기',
  BDR_UI_0020: '닫기',
  BDR_UI_0021: '×',
  BDR_UI_0022: '배치',
  BDR_UI_0023: '아이동 교체',
  BDR_UI_0024: '방 꾸미기',
  BDR_UI_0025: '옷 입히기',
  BDR_UI_0026: '사진 촬영',
  BDR_UI_0027: '벗기',
  BDR_UI_0028: '입히기',
  BDR_UI_0029: '사진 촬영은 모바일에서만 사용할 수 있어요.',
  BDR_UI_0030: '아이동이름',
  BDR_UI_0031: '{{name}}의 방',
  BDR_UI_0035: '보유 아이동 리스트',
  BDR_UI_0036: '마당',
  BDR_UI_0037: '방에 배치할 아이동을 선택해 주세요.',
  BDR_UI_0038: '{{name}}이 사용 중이에요.',
  BDR_UI_0039: '*착용 해제 후 착용할 수 있어요!',
  BDR_UI_0040: 'Lv.{{level}}',
  BDR_UI_0041: '배치 가능한 아이동이 없어요.',
}

export function createBedroomTextResolver(table: BedroomTextTable = {}) {
  return (textId: string, vars?: Record<string, string | number>) => {
    let value = table[textId] ?? BEDROOM_TEXT_FALLBACKS[textId] ?? textId
    if (!vars) return value
    for (const [key, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{{${key}}}`, String(replacement))
    }
    return value
  }
}
