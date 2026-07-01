import type { AidongCharacterId } from '@/stores/userStore'

// Frontend adapter for the future Aidong master table.
// Replace this source with table rows when the real data layer is connected.
export type AidongCatalogEntry = {
  id: AidongCharacterId
  defaultDisplayName: string
  sourceIndex: number
}

export const AIDONG_CATALOG = [
  { id: '황금멍', defaultDisplayName: '황금멍', sourceIndex: 1 },
  { id: '춤냥', defaultDisplayName: '춤냥', sourceIndex: 2 },
  { id: '양털곰', defaultDisplayName: '양털곰', sourceIndex: 3 },
  { id: '단풍볼', defaultDisplayName: '단풍볼', sourceIndex: 4 },
  { id: '날카여우', defaultDisplayName: '날카여우', sourceIndex: 5 },
] as const satisfies readonly AidongCatalogEntry[]

export const AIDONG_IDS = AIDONG_CATALOG.map((row) => row.id)
export const AIDONG_CATALOG_COUNT = AIDONG_CATALOG.length

export const isAidongId = (id: string): id is AidongCharacterId => (
  AIDONG_IDS.includes(id as AidongCharacterId)
)

export const getAidongDefaultDisplayName = (id: AidongCharacterId) => (
  AIDONG_CATALOG.find((row) => row.id === id)?.defaultDisplayName ?? id
)
