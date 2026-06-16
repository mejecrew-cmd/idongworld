/**
 * 📁 screens/CodexScreen.tsx — 도감 (S03)
 * ───────────────────────────────────────────────
 * 📌 역할: 영입 캐릭터·자재·트로피 3 트랙 도감.
 *           Phase 1 단순 카탈로그 + 등재 상태 표시.
 *
 * 🔗 연결:
 *   - 기획 SoT: 매뉴얼/시스템/S03_도감.md (3 트랙)
 *   - data/materials.ts → 자재 카탈로그
 *   - stores/userStore.ts (recruitedAidongs·codexFullyRegistered·inventory)
 *   - 진입: 하단 네비 "📖 도감" 탭 (BottomNav.tsx)
 *
 * 💡 초보자 안내:
 *   - 친구 트랙: 5명 (정착 = placeholder, 첫 케어 = 본 등재)
 *   - 자재 트랙: data/materials.ts 풀 (보유 수량 표시)
 *   - 트로피 트랙: 데뷔·이벤트 보상 (Phase 1.5 활성)
 */
import { useState } from 'react'
import { Box, Typography, Tabs, Tab, Chip } from '@mui/material'
import type { AidongCharacterId } from '@/stores/userStore'
import { AidongSprite } from '@/components/AidongSprite'
import { GameStage } from '@/components/GameStage'
import { ScreenHeader } from '@/components/ScreenHeader'
import { MATERIAL_LIST } from '@/data/materials'
import { codexStoreFacade, hostStoreFacade, myAidongStoreFacade } from '@/lib/storeFacades'

const ALL_AIDONGS: AidongCharacterId[] = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']

export const CodexScreen = () => {
  const [tab, setTab] = useState<'character' | 'item' | 'trophy'>('character')
  const recruitedAidongs = myAidongStoreFacade.useRecruitedAidongs()
  const codexFullyRegistered = codexStoreFacade.useCodexFullyRegistered()
  const inventory = hostStoreFacade.useInventory()

  return (
    <Box sx={{ p: 0, pb: 12 }}>
      <ScreenHeader category="도감" title="친구·자재·트로피" />
      <GameStage stageSx={{ px: 3, py: 3 }}>
        <Typography variant="h1" sx={{ fontSize: 22, mb: 2 }}>📖 도감</Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="character" label={`친구 (${codexFullyRegistered.length}/5)`} />
          <Tab value="item" label={`자재 (${Object.values(inventory).filter((q) => q > 0).length})`} />
          <Tab value="trophy" label="트로피" />
        </Tabs>

        {tab === 'character' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
            {ALL_AIDONGS.map((id) => {
              const recruited = recruitedAidongs.includes(id)
              const fullyRegistered = codexFullyRegistered.includes(id)
              return (
                <Box
                  key={id}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: fullyRegistered ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    textAlign: 'center',
                    opacity: !recruited ? 0.4 : 1,
                    bgcolor: 'background.paper',
                  }}
                >
                  {recruited ? (
                    <AidongSprite
                      character={id}
                      expression={fullyRegistered ? 'happy' : 'normal'}
                      size={120}
                    />
                  ) : (
                    <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                      🔒
                    </Box>
                  )}
                  <Typography sx={{ fontWeight: 600, mt: 1 }}>{recruited ? id : '???'}</Typography>
                  <Chip
                    label={
                      fullyRegistered ? '✅ 본 등재' :
                      recruited ? '⏳ 첫 케어 대기' :
                      '🔒 미영입'
                    }
                    size="small"
                    sx={{ mt: 0.5, fontSize: 10 }}
                    color={fullyRegistered ? 'primary' : 'default'}
                  />
                </Box>
              )
            })}
          </Box>
        )}

        {tab === 'item' && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5 }}>
            {MATERIAL_LIST.map((m) => {
              const qty = inventory[m.id] ?? 0
              const has = qty > 0
              return (
                <Box
                  key={m.id}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: has ? 'success.main' : 'divider',
                    borderRadius: 2,
                    textAlign: 'center',
                    opacity: has ? 1 : 0.5,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ fontSize: 36 }}>{has ? m.emoji : '❓'}</Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                    {has ? m.name : '???'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    {has ? `보유 ${qty}` : '미발견'}
                  </Typography>
                  {has && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: 10, mt: 0.5 }}>
                      {m.source}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>
        )}

        {tab === 'trophy' && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 64, mb: 2 }}>🏆</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              트로피 트랙은 Phase 1.5에 활성됩니다.
              <br />데뷔 완료·시즌 이벤트 보상 등이 등재될 예정.
            </Typography>
          </Box>
        )}

        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 4, textAlign: 'center' }}>
          도감 v0.1 · S03 SoT 정합 · 친구는 첫 케어 시 본 등재
        </Typography>
      </GameStage>
    </Box>
  )
}
