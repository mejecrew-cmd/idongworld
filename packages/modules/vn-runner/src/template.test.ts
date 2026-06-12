/**
 * 📁 vn-runner/src/template.test.ts — VN 시나리오 템플릿 치환 테스트
 */
import { describe, it, expect } from 'vitest'
import { applyTemplate, applyTemplateToScene } from './template.ts'

describe('applyTemplate — 단일 문자열', () => {
  it('단순 치환', () => {
    const r = applyTemplate('{{name}} 입니다', { name: '황금멍' })
    expect(r).toBe('황금멍 입니다')
  })

  it('중첩 path', () => {
    const r = applyTemplate('{{result.characterId}}', { result: { characterId: '춤냥', scenarioId: 'chumnyang' } })
    expect(r).toBe('춤냥')
  })

  it('미해석 변수 — 그대로 보존', () => {
    const r = applyTemplate('{{missing}} 알 수 없음', {})
    expect(r).toBe('{{missing}} 알 수 없음')
  })

  it('여러 변수 동시 치환', () => {
    const r = applyTemplate('{{a}}+{{b}}={{c}}', { a: '1', b: '2', c: '3' })
    expect(r).toBe('1+2=3')
  })

  it('빈 문자열', () => {
    expect(applyTemplate('', {})).toBe('')
  })
})

describe('applyTemplateToScene — 객체·배열 재귀', () => {
  it('Scene 객체 안 lines 치환', () => {
    const scene = {
      text: { speaker: '{{result.characterId}}', lines: ['안녕 {{name}}', '나는 {{result.characterId}}'] },
    }
    const r = applyTemplateToScene(scene, { name: '플레이어', result: { characterId: '황금멍', scenarioId: 'x' } })
    expect(r.text.speaker).toBe('황금멍')
    expect(r.text.lines).toEqual(['안녕 플레이어', '나는 황금멍'])
  })

  it('배열 재귀 — 각 항목 치환', () => {
    const arr = ['{{a}}', '{{b}}', 'static']
    const r = applyTemplateToScene(arr, { a: 'A', b: 'B' })
    expect(r).toEqual(['A', 'B', 'static'])
  })

  it('숫자·boolean·null 보존', () => {
    const obj = { n: 42, b: true, x: null, s: '{{v}}' }
    const r = applyTemplateToScene(obj, { v: 'X' })
    expect(r).toEqual({ n: 42, b: true, x: null, s: 'X' })
  })
})
