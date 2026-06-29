import { describe, expect, it } from 'vitest'
import { parseStaticTableCsvText } from './csv.js'
import { validateStaticTables } from './validation.js'

describe('static table validation engine', () => {
  it('accepts valid required columns, primary keys, and dependency references', () => {
    const currency = parseStaticTableCsvText('currency_id,display_name\ncoin,Coin\ndiamond,Diamond\n', {
      fileName: 'X-ECO-00_currency_master.csv',
    })
    const boardSet = parseStaticTableCsvText('board_set_id,display_name\nneighbor,Neighbor\n', {
      fileName: 'X-CFG-01_board_set_master.csv',
    })
    const boardSlots = parseStaticTableCsvText(
      'board_set_id,slot_no,reward_currency_id,reward_item_id\nneighbor,1,coin,\nneighbor,2,diamond,\n',
      {
        fileName: 'M05-MAP-02_board_slot.csv',
      },
    )

    const result = validateStaticTables([currency, boardSet, boardSlots])

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.summaries).toEqual([
      expect.objectContaining({ tableCode: 'X-ECO-00', rowCount: 2, ok: true }),
      expect.objectContaining({ tableCode: 'X-CFG-01', rowCount: 1, ok: true }),
      expect.objectContaining({ tableCode: 'M05-MAP-02', rowCount: 2, ok: true }),
    ])
  })

  it('reports missing required columns and values', () => {
    const table = parseStaticTableCsvText('display_name\nCoin\n', {
      fileName: 'X-ECO-00_currency_master.csv',
    })
    const result = validateStaticTables([table])

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      expect.objectContaining({
        level: 'error',
        code: 'required_column_missing',
        column: 'currencyId',
      }),
      expect.objectContaining({
        level: 'error',
        code: 'primary_key_column_missing',
        column: 'currencyId',
      }),
    ])

    const missingValue = parseStaticTableCsvText('currency_id,display_name\n,Empty\n', {
      fileName: 'X-ECO-00_currency_master.csv',
    })
    expect(validateStaticTables([missingValue]).errors).toEqual([
      expect.objectContaining({
        level: 'error',
        code: 'required_value_missing',
        rowNo: 2,
        column: 'currencyId',
      }),
    ])
  })

  it('reports duplicate primary keys', () => {
    const table = parseStaticTableCsvText('currency_id,display_name\ncoin,Coin\ncoin,Coin again\n', {
      fileName: 'X-ECO-00_currency_master.csv',
    })
    const result = validateStaticTables([table])

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      expect.objectContaining({
        level: 'error',
        code: 'duplicate_primary_key',
        rowNo: 3,
      }),
    ])
  })

  it('validates dependency values and reports missing dependency tables', () => {
    const boardSlots = parseStaticTableCsvText(
      'board_set_id,slot_no,reward_currency_id,reward_item_id\nneighbor,1,coin,\n',
      {
        fileName: 'M05-MAP-02_board_slot.csv',
      },
    )
    const missingTables = validateStaticTables([boardSlots])
    expect(missingTables.ok).toBe(false)
    expect(missingTables.errors).toEqual([
      expect.objectContaining({
        level: 'error',
        code: 'dependency_table_missing',
        column: 'boardSetId',
      }),
      expect.objectContaining({
        level: 'warning',
        code: 'dependency_table_missing',
        column: 'rewardCurrencyId',
      }),
    ])

    const currency = parseStaticTableCsvText('currency_id,display_name\ndiamond,Diamond\n', {
      fileName: 'X-ECO-00_currency_master.csv',
    })
    const boardSet = parseStaticTableCsvText('board_set_id,display_name\nneighbor,Neighbor\n', {
      fileName: 'X-CFG-01_board_set_master.csv',
    })
    const badValue = validateStaticTables([currency, boardSet, boardSlots])
    expect(badValue.ok).toBe(true)
    expect(badValue.errors).toEqual([
      expect.objectContaining({
        level: 'warning',
        code: 'dependency_value_not_found',
        column: 'rewardCurrencyId',
      }),
    ])
  })

  it('blocks excluded dynamic tables during commit but allows inspection during dry-run', () => {
    const userCurrency = parseStaticTableCsvText('uid,currency_id,balance\nu1,coin,100\n', {
      fileName: 'M17-ECO-01_user_currency_balance.csv',
    })

    expect(validateStaticTables([userCurrency], { mode: 'commit' })).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          level: 'error',
          code: 'excluded_table_commit_blocked',
        }),
      ],
    })

    expect(validateStaticTables([userCurrency], { mode: 'dryRun' })).toMatchObject({
      ok: true,
      errors: [],
    })
  })

  it('carries parser issues and supports table-specific custom validators', () => {
    const table = parseStaticTableCsvText('currency_id,currencyId\ncoin,diamond\n', {
      fileName: 'X-ECO-00_currency_master.csv',
    })
    const result = validateStaticTables([table], {
      customValidators: {
        'X-ECO-00': () => [
          {
            level: 'warning',
            code: 'custom_warning',
            message: 'custom warning',
          },
        ],
      },
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      expect.objectContaining({
        level: 'error',
        code: 'duplicate_column_name',
        column: 'currencyId',
      }),
      expect.objectContaining({
        level: 'warning',
        code: 'custom_warning',
      }),
    ])
  })
})
