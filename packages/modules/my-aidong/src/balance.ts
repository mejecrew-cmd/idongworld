/// <reference path="./csv.d.ts" />
/**
 * my-aidong/src/balance.ts
 * ------------------------------------------------------------
 * 역할: my-aidong/balance.csv를 core balance helper로 감싸 typed accessor를 제공한다.
 * 연결: 케어 쿨다운, 일일 cap, 욕구 감소량, 친밀도 threshold 같은 튜닝값을 코드에서 읽는다.
 * 주의: 밸런스 값은 CSV를 source of truth로 두고, 코드에는 fallback만 둔다.
 */
import balanceCsv from '../balance.csv?raw'
import { createBalance } from '@idongworld/core'

export const balance = createBalance(balanceCsv)

/** ?쇰컲 議고쉶 ??paramId 吏곸젒 (typed fallback). */
export function getBalance<T extends Parameters<typeof balance.get>[1]>(paramId: string, fallback: T): T {
  return balance.get(paramId, fallback) as T
}


