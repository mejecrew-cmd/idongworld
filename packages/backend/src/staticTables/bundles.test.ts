import { describe, expect, it } from 'vitest'
import { parseStaticTableCsvText } from './csv.js'
import { buildStaticTableBundles } from './bundles.js'

describe('static table JSON bundle builders', () => {
  const context = { version: 'v1', importBatchId: 'batch-1', now: 1234 }

  it('builds board set bundles from board master and slots', () => {
    const boardSet = parseStaticTableCsvText('board_set_id,display_name\nneighbor,Neighbor\n', {
      fileName: 'X-CFG-01_board_set_master.csv',
    })
    const slots = parseStaticTableCsvText(
      'board_set_id,slot_no,slot_type,reward_currency_id\nneighbor,2,sea,coin\nneighbor,1,start,\n',
      {
        fileName: 'M05-MAP-02_board_slot.csv',
      },
    )

    const result = buildStaticTableBundles([boardSet, slots], context)
    expect(result).toEqual([
      {
        collectionName: 'staticBoardSets',
        bundles: [
          expect.objectContaining({
            bundleId: 'neighbor',
            version: 'v1',
            sourceTableCodes: ['X-CFG-01', 'M05-MAP-02'],
            data: {
              boardSetId: 'neighbor',
              boardSet: expect.objectContaining({ boardSetId: 'neighbor' }),
              slots: [
                expect.objectContaining({ slotNo: 1 }),
                expect.objectContaining({ slotNo: 2 }),
              ],
            },
          }),
        ],
      },
    ])
  })

  it('builds sookso rule bundles from house and placement slots', () => {
    const houses = parseStaticTableCsvText('house_id,display_name\nbasic,Basic\n', {
      fileName: 'M04-MAP-02_house_master.csv',
    })
    const slots = parseStaticTableCsvText('house_id,placement_slot_id,slot_no\nbasic,wall,2\nbasic,floor,1\n', {
      fileName: 'M04-MAP-03_room_placement_slot.csv',
    })

    const [result] = buildStaticTableBundles([houses, slots], context)
    expect(result.collectionName).toBe('staticSooksoRuleSets')
    expect(result.bundles[0]).toMatchObject({
      bundleId: 'basic',
      data: {
        houseId: 'basic',
        placementSlots: [
          expect.objectContaining({ placementSlotId: 'floor' }),
          expect.objectContaining({ placementSlotId: 'wall' }),
        ],
      },
    })
  })

  it('builds string packs by namespace and locale', () => {
    const strings = parseStaticTableCsvText(
      'namespace,locale,string_key,text\nlogin,ko,title,어서와\nlogin,ko,start,시작\nlogin,en,title,Welcome\n',
      {
        fileName: 'G-STR-01_M01-DEV-LOGIN_string_table.csv',
      },
    )

    const [result] = buildStaticTableBundles([strings], context)
    expect(result.collectionName).toBe('staticStringPacks')
    expect(result.bundles).toEqual([
      expect.objectContaining({
        bundleId: 'login:ko',
        data: expect.objectContaining({
          namespace: 'login',
          locale: 'ko',
          strings: {
            title: '어서와',
            start: '시작',
          },
        }),
      }),
      expect.objectContaining({
        bundleId: 'login:en',
        data: expect.objectContaining({
          strings: {
            title: 'Welcome',
          },
        }),
      }),
    ])
  })

  it('builds story bundles with episodes and sorted lines', () => {
    const master = parseStaticTableCsvText('story_id,aidong_id,title\nstory-1,A0019,Hello\n', {
      fileName: 'M10-STY-01_aidong_personal_story_master.csv',
    })
    const episodes = parseStaticTableCsvText('story_id,episode_id,title\nstory-1,ep-1,Episode\n', {
      fileName: 'M10-STY-02_aidong_personal_story_episode.csv',
    })
    const lines = parseStaticTableCsvText('story_id,episode_id,line_no,text\nstory-1,ep-1,2,second\nstory-1,ep-1,1,first\n', {
      fileName: 'M10-STY-04_aidong_personal_story_line.csv',
    })

    const [result] = buildStaticTableBundles([master, episodes, lines], context)
    expect(result.collectionName).toBe('staticStoryBundles')
    expect(result.bundles[0]).toMatchObject({
      bundleId: 'story-1',
      data: {
        storyId: 'story-1',
        episodes: [
          expect.objectContaining({
            episodeId: 'ep-1',
            lines: [
              expect.objectContaining({ lineNo: 1, text: 'first' }),
              expect.objectContaining({ lineNo: 2, text: 'second' }),
            ],
          }),
        ],
      },
    })
  })

  it('builds dialogue packs for global and aidong-specific dialogue tables', () => {
    const global = parseStaticTableCsvText('dialogue_id,locale,text\nd1,ko,global\n', {
      fileName: 'X-DLG-00_phase1_daily_dialogue.csv',
    })
    const aidong = parseStaticTableCsvText('dialogue_id,aidong_id,locale,text\nd2,A0019,ko,aidong\n', {
      fileName: 'X-DLG-AIDONG-0019_daily_dialogue.csv',
    })

    const [result] = buildStaticTableBundles([global, aidong], context)
    expect(result.collectionName).toBe('staticDialoguePacks')
    expect(result.bundles).toEqual([
      expect.objectContaining({ bundleId: 'global:ko' }),
      expect.objectContaining({ bundleId: 'A0019:ko' }),
    ])
  })

  it('builds aidong island graph bundles', () => {
    const island = parseStaticTableCsvText('island_id,aidong_id,name\nisl-1,A0019,Island\n', {
      fileName: 'M22-MAP-01_aidong_island_master.csv',
    })
    const page = parseStaticTableCsvText('island_id,page_id,name\nisl-1,page-1,Page\n', {
      fileName: 'M22-MAP-02_aidong_island_page_master.csv',
    })
    const hotspot = parseStaticTableCsvText('island_id,page_id,hotspot_id\nisl-1,page-1,hotspot-1\n', {
      fileName: 'M22-MAP-03_aidong_island_hotspot_master.csv',
    })
    const script = parseStaticTableCsvText('island_id,script_id,text\nisl-1,script-1,Hello\n', {
      fileName: 'M22-SCR-01_aidong_island_script_master.csv',
    })

    const [result] = buildStaticTableBundles([island, page, hotspot, script], context)
    expect(result.collectionName).toBe('staticAidongIslandBundles')
    expect(result.bundles[0]).toMatchObject({
      bundleId: 'isl-1',
      data: {
        islandId: 'isl-1',
        pages: [expect.objectContaining({ pageId: 'page-1' })],
        hotspots: [expect.objectContaining({ hotspotId: 'hotspot-1' })],
        scripts: [expect.objectContaining({ scriptId: 'script-1' })],
      },
    })
  })

  it('builds cosmetic rule bundles from persona slot masters and defaults', () => {
    const slots = parseStaticTableCsvText('part_slot_id,display_name\nhead,Head\nbody,Body\n', {
      fileName: 'X-CHR-05_aidong_persona_part_slot_master.csv',
    })
    const defaults = parseStaticTableCsvText('aidong_id,part_slot_id,part_id\nA0019,head,A0019-head\n', {
      fileName: 'X-CHR-06_aidong_persona_part_default.csv',
    })

    const [result] = buildStaticTableBundles([slots, defaults], context)
    expect(result).toMatchObject({
      collectionName: 'staticCosmeticRuleSets',
      bundles: [
        {
          bundleId: 'persona-parts',
          data: {
            personaPartSlots: [
              expect.objectContaining({ partSlotId: 'body' }),
              expect.objectContaining({ partSlotId: 'head' }),
            ],
            personaPartDefaults: [
              expect.objectContaining({ aidongId: 'A0019', partSlotId: 'head' }),
            ],
          },
        },
      ],
    })
  })
})
