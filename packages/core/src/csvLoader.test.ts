/**
 * 📁 core/src/csvLoader.test.ts — balance CSV 파서 테스트
 */
import { describe, it, expect } from 'vitest'
import { parseBalanceCsv, getBalanceValue } from './csvLoader.ts'

describe('parseBalanceCsv', () => {
  it('헤더 + 1 행', () => {
    const csv = 'paramId,value,type,description,phase\ncoins,100,number,start,Phase 1'
    const map = parseBalanceCsv(csv)
    expect(map.coins).toBe(100)
  })

  it('주석·빈 줄 무시', () => {
    const csv = '# comment\n\npar,42,number\n# another'
    // 헤더가 'par,42,number' 로 잡혀서 데이터 행 X (1행밖에 없음)
    expect(Object.keys(parseBalanceCsv(csv))).toHaveLength(0)
  })

  it('정상 — 주석 + 헤더 + 다중 행', () => {
    const csv = `# 주석
paramId,value,type,description
a,10,number,설명
b,hello,string,텍스트
c,true,boolean,플래그`
    const m = parseBalanceCsv(csv)
    expect(m.a).toBe(10)
    expect(m.b).toBe('hello')
    expect(m.c).toBe(true)
  })

  it('number 변환 실패 → 0', () => {
    const csv = 'paramId,value,type\nbad,not_a_number,number'
    expect(parseBalanceCsv(csv).bad).toBe(0)
  })

  it('boolean — false/0/no → false', () => {
    const csv = 'paramId,value,type\nx,false,boolean\ny,0,boolean\nz,no,boolean'
    const m = parseBalanceCsv(csv)
    expect(m.x).toBe(false)
    expect(m.y).toBe(false)
    expect(m.z).toBe(false)
  })
})

describe('getBalanceValue', () => {
  const m = { coins: 100, name: 'host', flag: true }

  it('일치 — 값 반환', () => {
    expect(getBalanceValue(m, 'coins', 0)).toBe(100)
    expect(getBalanceValue(m, 'name', '')).toBe('host')
    expect(getBalanceValue(m, 'flag', false)).toBe(true)
  })

  it('타입 불일치 — fallback', () => {
    expect(getBalanceValue(m, 'coins', 'default')).toBe('default')
  })

  it('없는 키 — fallback', () => {
    expect(getBalanceValue(m, 'missing', 999)).toBe(999)
  })
})
