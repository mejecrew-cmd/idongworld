import { describe, expect, it } from 'vitest'
import {
  calculateStaticTableFileHash,
  normalizeStaticTableValue,
  parseCsvRecords,
  parseStaticTableCsvText,
  toCamelCaseColumnName,
} from './csv.js'

describe('static table CSV parser', () => {
  it('parses quoted CSV cells, CRLF, BOM, and Korean text', () => {
    const csv = '\uFEFFitem_id,display_name,description,slot_no,is_enabled\r\n'
      + 'item-001,"반짝, 의자","쉼표가 있는 설명",3,Y\r\n'
      + 'item-002,"따뜻한 침대","줄바꿈 없는 설명",4,false\r\n'

    const result = parseStaticTableCsvText(csv, {
      fileName: 'G-ITM-01_item_catalog.csv',
    })

    expect(result.tableCode).toBe('G-ITM-01')
    expect(result.tableDefinition?.targetCollection).toBe('staticItemCatalogs')
    expect(result.sourceHash).toBe(calculateStaticTableFileHash(csv))
    expect(result.originalHeaders).toEqual(['item_id', 'display_name', 'description', 'slot_no', 'is_enabled'])
    expect(result.headers).toEqual(['itemId', 'displayName', 'description', 'slotNo', 'isEnabled'])
    expect(result.issues).toEqual([])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toMatchObject({
      rowNo: 2,
      original: {
        item_id: 'item-001',
        display_name: '반짝, 의자',
      },
      values: {
        itemId: 'item-001',
        displayName: '반짝, 의자',
        description: '쉼표가 있는 설명',
        slotNo: 3,
        isEnabled: true,
      },
    })
    expect(result.rows[1].values.isEnabled).toBe(false)
  })

  it('keeps id-like numeric strings as strings while normalizing numeric columns', () => {
    const csv = 'aidong_id,line_no,reward_amount,is_default\n0019,12,300,true\n'
    const result = parseStaticTableCsvText(csv, {
      fileName: 'G-CHR-01_aidong_master.csv',
    })

    expect(result.rows[0].values).toMatchObject({
      aidongId: '0019',
      lineNo: 12,
      rewardAmount: 300,
      isDefault: true,
    })
  })

  it('reports invalid and duplicate columns after camelCase conversion', () => {
    const csv = 'item_id,itemId,bad column\nitem-001,item-002,x\n'
    const result = parseStaticTableCsvText(csv, {
      fileName: 'G-ITM-01_item_catalog.csv',
    })

    expect(result.issues).toEqual([
      expect.objectContaining({
        level: 'error',
        code: 'invalid_column_name',
        column: 'bad column',
      }),
      expect.objectContaining({
        level: 'error',
        code: 'duplicate_column_name',
        column: 'itemId',
      }),
    ])
  })

  it('accepts planner metadata columns with a leading underscore', () => {
    const result = parseStaticTableCsvText('currency_id,_planner_note,_updated_at\ncoin,,2026-06-29\n', {
      fileName: 'X-ECO-00_currency_master.csv',
    })

    expect(result.headers).toEqual(['currencyId', '_plannerNote', '_updatedAt'])
    expect(result.issues).toEqual([])
  })

  it('repairs X-CHR-00 rows exported as quoted comma chunks', () => {
    const csv = [
      '"aidong_no,aidong_id,source_key,source_index_","ile,release_status,is_enabled",_source_csv',
      '"1,AIDONG-0001,key,/root/","detail.md,active,Y",X-CHR-00_aidong_index.csv',
    ].join('\n')

    const result = parseStaticTableCsvText(csv, {
      fileName: 'X-CHR-00_aidong_index.csv',
    })

    expect(result.headers).toEqual(['aidongNo', 'aidongId', 'sourceKey', 'sourceIndexFile', 'releaseStatus', 'isEnabled', '_sourceCsv'])
    expect(result.rows[0].values).toMatchObject({
      aidongNo: 1,
      aidongId: 'AIDONG-0001',
      sourceIndexFile: '/root/detail.md',
      releaseStatus: 'active',
      isEnabled: true,
    })
  })

  it('warns when a row has extra cells', () => {
    const result = parseStaticTableCsvText('currency_id,amount\ncoin,100,extra\n', {
      fileName: 'X-ECO-00_currency_master.csv',
    })

    expect(result.issues).toEqual([
      expect.objectContaining({
        level: 'warning',
        code: 'extra_csv_cells',
        rowNo: 2,
      }),
    ])
  })

  it('supports low-level helpers for future import services', () => {
    expect(parseCsvRecords('"a,b","c""d"\n1,2')).toEqual([
      ['a,b', 'c"d'],
      ['1', '2'],
    ])
    expect(toCamelCaseColumnName('reward_amount')).toBe('rewardAmount')
    expect(toCamelCaseColumnName('alreadyCamel')).toBe('alreadyCamel')
    expect(() => toCamelCaseColumnName('bad column')).toThrow('invalid_column_name')
    expect(normalizeStaticTableValue('isEnabled', 'N')).toBe(false)
    expect(normalizeStaticTableValue('rewardAmount', '12.5')).toBe(12.5)
    expect(normalizeStaticTableValue('aidongId', '0019')).toBe('0019')
    expect(normalizeStaticTableValue('description', '')).toBeUndefined()
  })
})
