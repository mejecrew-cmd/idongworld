/**
 * 📁 screens/dev/AssetCatalogScreen.tsx — 개발자·디자이너용 에셋 카탈로그
 * ───────────────────────────────────────────────
 * 📌 역할: 게임에 등장하는 모든 시각 객체·데이터·텍스트를 카테고리별로 한 페이지에 모음.
 *           디자이너가 실 PNG 작화 전 위치·사이즈·연결을 한눈에 보고,
 *           나중에 실 자산 도착 시 어디 끼울지 결정.
 *
 * 🔗 연결:
 *   - 모든 data/* 파일 (zones·board·needs·careActions·signatures)
 *   - 모든 components/screens (사용처 명시)
 *   - 기획 SoT (모듈·매뉴얼) 경로 명시
 *
 * 💡 초보자 안내:
 *   - 16 카테고리 (캐릭터·배경·HUD 등)
 *   - 각 항목: 시각 + 설명 + 사용처 + 데이터 연결 + Phase 단계
 *   - 진입: /dev/catalog (개발 빌드만, production 시 차단 권장)
 */
import { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Chip, Stack, Paper, Divider
} from '@mui/material'
import { AidongSprite, BoardIcon, OUTFIT_OPTIONS, type AidongCharacterId } from '@/components/AidongSprite'
import { ZONES, PHASE_LABEL, PHASE_COLOR } from '@/data/zones'
import { CARE_ACTIONS, ZONE_LABELS } from '@/data/careActions'
import { NEED_KEYS, NEED_LABELS } from '@/data/needs'
import { SIGNATURES } from '@/data/signatures'
import { ROUTE_CATALOG, SLOT_TYPE_COLOR } from '@/data/board'
import { listAll as listAllModules } from '@idongworld/core'
import { ScreenHeader } from '@/components/ScreenHeader'

// ──────────────────────────────────────────────
// 카테고리 정의
// ──────────────────────────────────────────────
const CATEGORIES = [
  { id: 'character', label: '🐾 캐릭터' },
  { id: 'background', label: '🏞️ 배경' },
  { id: 'hud', label: '⚙️ HUD' },
  { id: 'nav', label: '🧭 네비' },
  { id: 'button', label: '🔘 버튼·모달' },
  { id: 'boardSlot', label: '🎲 보드 칸' },
  { id: 'zone', label: '🗺️ 마이섬 15구역' },
  { id: 'signature', label: '✨ 시그니처' },
  { id: 'outfit', label: '👗 의상' },
  { id: 'minigame', label: '🎮 미니게임' },
  { id: 'careAction', label: '💝 케어 액션' },
  { id: 'expression', label: '🎭 표정' },
  { id: 'need', label: '📊 6 욕구' },
  { id: 'scenario', label: '📜 시나리오' },
  { id: 'diary', label: '📔 일기 슬롯' },
  { id: 'trigger', label: '⚡ Trigger 카탈로그' },
  { id: 'modules', label: '🧩 모듈 (분리 현황)' },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

// ──────────────────────────────────────────────
// 본진 5명 데이터 (소스: 기획/모듈/본진5명선정.md v0.3)
// ──────────────────────────────────────────────
const HEROES: Array<{
  id: AidongCharacterId
  species: string
  personaId: number
  color: string
  signature: string
  zoneInRoute: number
}> = [
  { id: '황금멍', species: '강아지', personaId: 56, color: '#D4A056', signature: '황금 마이크',  zoneInRoute: 4 },
  { id: '춤냥',   species: '고양이', personaId: 75, color: '#2A2A2A', signature: '실버 발레 슈즈', zoneInRoute: 10 },
  { id: '양털곰',  species: '곰돌이', personaId: 24, color: '#F5E6CB', signature: '작은 덤벨',    zoneInRoute: 17 },
  { id: '단풍볼',  species: '햄스터', personaId: 7,  color: '#722F37', signature: '와인 마이크',    zoneInRoute: 23 },
  { id: '날카여우', species: '여우',   personaId: 19, color: '#E63946', signature: '댄스 슈즈',     zoneInRoute: 4 /* 동적 */ },
]

const EXPRESSIONS = [
  { id: 'normal' as const, label: '평온', emoji: '😐', desc: '기본·중립. 페르소나 파츠 그대로.' },
  { id: 'happy' as const, label: '기쁨', emoji: '😊', desc: '눈 살짝 감김(^_^), 큰 미소, 양 볼 살짝 분홍.' },
  { id: 'surprised' as const, label: '놀람', emoji: '😮', desc: '눈 동그래짐(110%), 입 작은 ㅇ, 눈썹 들림.' },
  { id: 'worried' as const, label: '걱정', emoji: '😟', desc: '눈 가늘게, 입 살짝 처짐, 눈썹 처지고 가까이.' },
  { id: 'sleepy' as const, label: '졸림', emoji: '😴', desc: '눈 반쯤 감김 또는 닫힘, 입 살짝 벌림.' },
]

const BACKGROUND_LIST = [
  { id: '00_Splash',  label: 'Splash',  use: 'LoginScreen', phase: 1 },
  { id: '01_TitleBG', label: 'Title',   use: 'TitleScreen, OpeningScreen', phase: 1 },
  { id: '02_MainBG',  label: 'Main',    use: 'App shell background', phase: 1 },
  { id: '03_Home_00', label: 'Home 00', use: 'Heart island first, naming', phase: 1 },
  { id: '03_Home_01', label: 'Home 01', use: 'Hub, cleaning, sunny debut', phase: 1 },
  { id: '03_Home_02', label: 'Home 02', use: 'Lodge, workshop debut', phase: 1 },
  { id: '03_Home_03', label: 'Home 03', use: 'Red dusk debut', phase: 1 },
  { id: '03_Home_04', label: 'Home 04', use: 'Harbor, maple debut', phase: 1 },
  { id: '03_Home_05', label: 'Home 05', use: 'Stage, moonlit debut', phase: 1 },
  { id: '04_Sea',     label: 'Sea',     use: 'Opening sea, first meeting, voyage', phase: 1 },
]

const HUD_ICONS = [
  { id: 'coin',     emoji: '🪙', label: '코인',    desc: '기본 통화. 케어·구매·미니게임 보상에 쓰임.' },
  { id: 'diamond',  emoji: '💎', label: '다이아', desc: '프리미엄 통화 (Phase 1.5+ 활성).' },
  { id: 'gem',      emoji: '❤️', label: '보석',    desc: '가챠 재시도 BM 통화.' },
  { id: 'dice',     emoji: '🎲', label: '주사위', desc: '항해 1d6. 항구 친구 배치 시 시간당 1d6 충전.' },
  { id: 'time',     emoji: '🕐', label: '시간대', desc: '5존 (☁️ 휴식·🌅 아침·☀️ 점심·🌆 저녁·🌙 밤).' },
  { id: 'affinity', emoji: '❤️', label: '친밀도', desc: '캐릭터별 score·Lv (Lv 0~10).' },
  { id: 'recruit',  emoji: '👥', label: '영입수', desc: '본진 5명 중 영입한 수.' },
]

const NAV_TABS = [
  { id: 'island', label: '마이섬', emoji: '🏝️', path: '/island', desc: '본 게임 화면 (HubHeartScene).' },
  { id: 'voyage', label: '항해',   emoji: '⛵', path: '/voyage/board', desc: '부루마블 보드 (NavigationBoardScene).' },
  { id: 'codex',  label: '도감',   emoji: '📖', path: '/codex', desc: 'Phase 1.5 placeholder.' },
  { id: 'shop',   label: '상점',   emoji: '🛍️', path: '/shop', desc: 'BM 상점 (Phase 2).' },
  { id: 'setting',label: '설정',   emoji: '⚙️', path: '/setting', desc: '계정·옵션 (Phase 1.5).' },
]

const BUTTON_TYPES = [
  { id: 'btn_primary',   label: '주 버튼 (확인)',   color: '#FF6B6B', desc: 'CTA·다음·확인. 진하고 둥근 모서리.' },
  { id: 'btn_secondary', label: '보조 버튼 (취소)', color: '#C0C0C0', desc: '취소·뒤로·옵션.' },
  { id: 'btn_close',     label: '닫기 X',          color: '#E0E0E0', desc: '모달·팝업 닫기 (작은 원형).' },
  { id: 'modal_frame',   label: '모달 프레임',      color: '#FFFFFF', desc: '범용 모달 컨테이너.' },
]

const BOARD_SLOT_TYPES = [
  { id: 'home',      emoji: '⚓', label: '항구',       desc: '시작·도착 칸. 한 바퀴 돌아오면 항구 복귀.', color: SLOT_TYPE_COLOR.home },
  { id: 'character', emoji: '🐾', label: '이웃 친구섬', desc: '본진 4명 중 1명. 도착 시 영입 시나리오 진입.', color: SLOT_TYPE_COLOR.character },
  { id: 'treasure',  emoji: '💎', label: '보물',       desc: '도착 시 코인 +30~60.', color: SLOT_TYPE_COLOR.treasure },
  { id: 'storm',     emoji: '🌀', label: '폭풍',       desc: '도착 시 코인 -10. 페널티 약함.', color: SLOT_TYPE_COLOR.storm },
  { id: 'resource',  emoji: '🌴', label: '자원섬',     desc: '음식 1 + 기억조각 1 획득.', color: SLOT_TYPE_COLOR.resource },
  { id: 'empty',     emoji: '🌊', label: '빈 바다',     desc: '잔잔한 휴식. 코인 +2.', color: SLOT_TYPE_COLOR.empty },
]

const MINIGAME_LIST = [
  { id: 'garden', emoji: '🌱', label: '재배',     zone: 'garden (성장의 정원)', mechanic: '씨앗 심기 → 30s → 수확',     reward: '음식 +2, 코인 +15' },
  { id: 'oasis',  emoji: '🌊', label: '방치',     zone: 'oasis (휴식의 오아시스)', mechanic: '진입 자체로 자동 보상',          reward: '휴식토큰 +1, 코인 +10' },
  { id: 'memory', emoji: '🌳', label: '신경쇠약', zone: 'forest (기억의 숲)',     mechanic: '4쌍 8 카드 매칭',              reward: '기억조각 +1, 코인 +20~60' },
  { id: 'mine',   emoji: '⛰️', label: '광산',     zone: 'cliff (도전의 절벽)',    mechanic: '5×5 타일·곡괭이 8회·광물 6',  reward: '광물 +N, 코인 +N×10' },
]

const SCENARIO_LIST = [
  { type: '🎰 가챠 컷씬', count: 1, files: ['cutscene_first_gacha.json'] },
  { type: '🤝 영입',      count: 5, files: ['recruit_hwanggumeong', 'recruit_chumnyang', 'recruit_yangteolgom', 'recruit_danpungbol', 'recruit_nalkayeou'] },
  { type: '🏝️ 정착',      count: 5, files: ['settle_hwanggumeong', 'settle_chumnyang', 'settle_yangteolgom', 'settle_danpungbol', 'settle_nalkayeou'] },
  { type: '📔 일기 day1', count: 2, files: ['diary_hwanggumeong_day1', 'diary_chumnyang_day1'] },
]

const DIARY_SLOTS = [
  { id: 'wake',    emoji: '🌅', label: '기상', length: '50~150자',  trigger: 'zone 1 진입 시 자동' },
  { id: 'morning', emoji: '🌤️', label: '아침', length: '100~300자', trigger: '아침밥 케어 후' },
  { id: 'noon',    emoji: '☀️', label: '점심', length: '100~300자', trigger: '점심밥 케어 후' },
  { id: 'evening', emoji: '🌆', label: '저녁', length: '100~300자', trigger: '저녁밥 케어 후' },
  { id: 'sleep',   emoji: '🌙', label: '잠',   length: '100~300자', trigger: '재우기 케어 후' },
]

const TRIGGERS = [
  { id: 'affinity_+N:char',   handler: 'addAffinity',       use: '시나리오 분기 차등 (+3 적극 / +2 소극)' },
  { id: 'unlock_aidong:char', handler: 'recruitAidong',     use: '영입 시나리오 종료 시' },
  { id: 'unlock_diary:id',    handler: 'unlockDiary',       use: '영입 정착 시 day1 슬롯 활성' },
  { id: 'unlock_codex_slot:char',  handler: 'unlockCodexSlot',     use: '정착 시 도감 placeholder' },
  { id: 'unlock_codex_full:char',  handler: 'fullyRegisterCodex',  use: '첫 케어 액션 시 본 등재' },
  { id: 'give_material:id',   handler: 'inventory[id] -1', use: '자재 건넴 분기 (require 검증)' },
  { id: 'gacha_retry',        handler: 'firstGachaAttempts +1', use: '가챠 재시도' },
  { id: 'deduct_gems:N',      handler: 'gems -N',          use: '보석 BM 차감' },
  { id: 'navigate:path',      handler: 'react-router push', use: '시나리오 종료 후 이동' },
]

// ──────────────────────────────────────────────
// 공통 카드 컴포넌트
// ──────────────────────────────────────────────
const InfoCard = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <Paper
    sx={{
      p: 2,
      border: '1px solid',
      borderColor: 'divider',
      borderLeft: color ? `4px solid ${color}` : undefined,
      bgcolor: 'background.paper',
    }}
  >
    {children}
  </Paper>
)

const SourceTag = ({ label }: { label: string }) => (
  <Chip
    label={label}
    size="small"
    sx={{ fontSize: 10, height: 18, fontFamily: 'monospace', bgcolor: 'rgba(74,124,220,0.1)' }}
  />
)

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────
export const AssetCatalogScreen = () => {
  const [tab, setTab] = useState<CategoryId>('character')

  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
      <ScreenHeader category="개발 도구" title="에셋 카탈로그" />
      <Typography variant="h1" sx={{ fontSize: 26, mb: 1, mt: 2 }}>📚 에셋 카탈로그</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        게임에 등장하는 모든 시각 객체·데이터·텍스트 카테고리별 정리.
        실 PNG 작화 시 위치·연결 참조용. 클릭 시 실 화면 진입.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <SourceTag label="개발 빌드 전용" />
        <SourceTag label="/dev/catalog" />
        <SourceTag label="2026-05-10" />
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons
        sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {CATEGORIES.map((c) => (
          <Tab key={c.id} value={c.id} label={c.label} />
        ))}
      </Tabs>

      {/* 1. 캐릭터 */}
      {tab === 'character' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>🐾 본진 5명 캐릭터</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="data: 기획/모듈/본진5명선정.md v0.3" />
            <SourceTag label="frontend: components/AidongSprite.tsx" />
            <SourceTag label="자산: 와이어프레임/assets-dummy/캐릭터/" />
            <SourceTag label="페르소나: [캐릭터메이킹엔진]/c_아이돌_페르소나/페르소나리스트.csv" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
            {HEROES.map((h) => (
              <InfoCard key={h.id} color={h.color}>
                <Box sx={{ textAlign: 'center', mb: 1 }}>
                  <AidongSprite character={h.id} expression="normal" size={140} />
                </Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{h.id}</Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  {h.species} · 페르소나 #{h.personaId}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                  시그니처: {h.signature}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  보드 칸: index {h.zoneInRoute} (이웃섬 항로)
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip size="small" label={`색 ${h.color}`} sx={{ fontSize: 9, height: 16 }} />
                </Box>
              </InfoCard>
            ))}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h2" sx={{ mb: 1 }}>🎯 보드 아이콘 (256×256)</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 2 }}>
            사용처: NavigationBoardScene 칸 표시 / HarborScene 항구 배치
          </Typography>
          <Stack direction="row" spacing={2}>
            {HEROES.map((h) => (
              <Box key={h.id} sx={{ textAlign: 'center' }}>
                <BoardIcon character={h.id} size={64} />
                <Typography variant="caption" sx={{ display: 'block' }}>{h.id}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* 2. 배경 */}
      {tab === 'background' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>🏞️ 배경 (1920×1080) 10종</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="자산: 와이어프레임/assets-dummy/배경/" />
            <SourceTag label="시나리오: 기획/시나리오/*.json" />
            <SourceTag label="화면: OpeningScreen·FirstMeetingScreen·HeartIslandFirstScreen·HubHeartScene·HarborScene·LodgeScene·DebutStageScene·NavigationBoardScene" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2 }}>
            {BACKGROUND_LIST.map((b) => (
              <InfoCard key={b.id}>
                <Box
                  sx={{
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundImage: `url(/assets/backgrounds/${b.id}.png)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: 1,
                    mb: 1,
                  }}
                />
                <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{b.label}</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>
                  {b.id}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                  사용: {b.use}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 3. HUD */}
      {tab === 'hud' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>⚙️ HUD 아이콘 (128×128)</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="컴포넌트: components/HUD.tsx" />
            <SourceTag label="자산: 와이어프레임/assets-dummy/UI/HUD/" />
            <SourceTag label="데이터: stores/userStore.ts (coins·diamonds·gems·diceCount)" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
            {HUD_ICONS.map((h) => (
              <InfoCard key={h.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ fontSize: 36 }}>{h.emoji}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{h.label}</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                      {h.id}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{h.desc}</Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 4. 네비 */}
      {tab === 'nav' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>🧭 하단 네비 (5탭)</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="컴포넌트: components/BottomNav.tsx" />
            <SourceTag label="자산: 와이어프레임/assets-dummy/UI/네비/" />
            <SourceTag label="라우터: App.tsx <MyIslandLayout>" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
            {NAV_TABS.map((n) => (
              <InfoCard key={n.id}>
                <Box sx={{ textAlign: 'center', mb: 1 }}>
                  <Box sx={{ fontSize: 36 }}>{n.emoji}</Box>
                  <Typography sx={{ fontWeight: 600 }}>{n.label}</Typography>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>
                  {n.path}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                  {n.desc}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 5. 버튼·모달 */}
      {tab === 'button' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>🔘 버튼·모달 4종</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="자산: 와이어프레임/assets-dummy/UI/버튼/" />
            <SourceTag label="현재: MUI Button (theme.ts)" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            {BUTTON_TYPES.map((b) => (
              <InfoCard key={b.id} color={b.color}>
                <Typography sx={{ fontWeight: 600 }}>{b.label}</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>
                  {b.id} · {b.color}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                  {b.desc}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 6. 보드 칸 */}
      {tab === 'boardSlot' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>🎲 부루마블 보드 칸 6종</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="data: data/board.ts (NEIGHBOR_SLOT_TEMPLATE)" />
            <SourceTag label="기획: 모듈/부루마블보드.md + 섬슬롯.md" />
            <SourceTag label="화면: NavigationBoardScene 그리드 6×5" />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            이웃섬 항로 30칸 분포: 마이섬 1 · 캐릭터 4 · 보물 4 · 폭풍 3 · 자원섬 4 · 빈바다 14
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
            {BOARD_SLOT_TYPES.map((b) => (
              <InfoCard key={b.id} color={b.color}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ fontSize: 36 }}>{b.emoji}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{b.label}</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                      {b.id}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{b.desc}</Typography>
              </InfoCard>
            ))}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h2" sx={{ mb: 1 }}>🗺️ 항로 카탈로그</Typography>
          <Stack direction="column" spacing={1}>
            {ROUTE_CATALOG.map((r) => (
              <InfoCard key={r.id}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ fontSize: 28 }}>{r.unlocked ? '🗺️' : '🔒'}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{r.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {r.subtitle} · {r.description}
                    </Typography>
                  </Box>
                  {r.comingSoon && <Chip label="Coming Soon" size="small" />}
                </Stack>
              </InfoCard>
            ))}
          </Stack>
        </Box>
      )}

      {/* 7. zones */}
      {tab === 'zone' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>🗺️ 마이섬 15구역</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="data: data/zones.ts" />
            <SourceTag label="기획: 모듈/마이섬.md §4 + 의도문서.md §5" />
            <SourceTag label="화면: IslandFullMapScreen" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            {ZONES.map((z) => (
              <InfoCard key={z.id} color={PHASE_COLOR[z.phase]}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ fontSize: 28 }}>{z.emoji}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                      {z.num}. {z.name}
                    </Typography>
                    <Chip
                      label={PHASE_LABEL[z.phase]}
                      size="small"
                      sx={{ bgcolor: PHASE_COLOR[z.phase], fontSize: 9, height: 16 }}
                    />
                  </Box>
                </Stack>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  💗 {z.emotion}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  🎮 {z.activity}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 8. 시그니처 */}
      {tab === 'signature' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>✨ 시그니처 아이템 5종</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="data: data/signatures.ts" />
            <SourceTag label="e 시트: [캐릭터메이킹엔진]/e_아이동캐릭터/{종}/*.md §6-3" />
            <SourceTag label="화면: DebutStageScene" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
            {Object.values(SIGNATURES).map((s) => (
              <InfoCard key={s.id}>
                <Box sx={{ textAlign: 'center', fontSize: 64, mb: 1 }}>{s.emoji}</Box>
                <Typography sx={{ fontWeight: 600 }}>{s.name}</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>
                  {s.itemId}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                  소유자: {s.characterId} · zone: {s.zone} · 데뷔 보정 +{s.bonus}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 9. 의상 */}
      {tab === 'outfit' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>👗 의상 5종 (Phase 1: CSS 색감 토글)</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="컴포넌트: components/AidongSprite.tsx (OUTFIT_OPTIONS·OUTFIT_FILTERS)" />
            <SourceTag label="store: stores/userStore.ts (equippedOutfit[charId])" />
            <SourceTag label="화면: LodgeScene 옷 탭" />
            <SourceTag label="Phase 2: 실 PNG 의상 (R07 사양서)" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
            {OUTFIT_OPTIONS.map((o) => (
              <InfoCard key={o.id}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontSize: 48 }}>{o.emoji}</Box>
                  <Typography sx={{ fontWeight: 600 }}>{o.label}</Typography>
                  <AidongSprite character="황금멍" expression="happy" outfit={o.id} size={100} />
                </Box>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>
                  outfit ID: {o.id}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 10. 미니게임 */}
      {tab === 'minigame' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>🎮 미니게임 4종</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="컴포넌트: @idongworld/zone-garden (모듈 이전) + screens/minigames/{Oasis,Memory,Mine}.tsx" />
            <SourceTag label="모달: components/MiniGameModal.tsx" />
            <SourceTag label="진입: IslandFullMapScreen ZONE_TO_GAME" />
            <SourceTag label="zone unlock: @idongworld/my-island (build phase + condition DSL)" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {MINIGAME_LIST.map((m) => (
              <InfoCard key={m.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ fontSize: 36 }}>{m.emoji}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{m.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{m.zone}</Typography>
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  메카닉: {m.mechanic}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  보상: {m.reward}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 11. 케어 액션 */}
      {tab === 'careAction' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>💝 14 케어 액션</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="data: data/careActions.ts (CARE_ACTIONS)" />
            <SourceTag label="기획: 모듈/다마고치코어.md §6" />
            <SourceTag label="화면: CareModal.tsx" />
            <SourceTag label="실행: stores/userStore.ts applyCareAction" />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            기본(시간대 한정): 깨우기·아침/점심/저녁/밥·재우기·산책 (6) · 자유(시간 무관): 8종
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
            {CARE_ACTIONS.map((a) => (
              <InfoCard key={a.id}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Box sx={{ fontSize: 28 }}>{a.emoji}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{a.label}</Typography>
                    <Chip
                      label={a.category}
                      size="small"
                      sx={{ fontSize: 9, height: 16 }}
                      color={a.category === 'basic' ? 'primary' : 'default'}
                    />
                  </Box>
                </Stack>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  욕구: {Object.entries(a.needsRecover).map(([k, v]) => `${k} ${v! > 0 ? '+' : ''}${v}`).join(', ')}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  +{a.affinity} 친밀도 / 🪙 {a.coinCost}
                </Typography>
                {a.zones && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    시간대: {a.zones.map((z) => ZONE_LABELS[z]).join(', ')}
                  </Typography>
                )}
                {a.cooldownMin && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    쿨다운: {a.cooldownMin}분 / 캡 {a.dailyCap}/일
                  </Typography>
                )}
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 12. 표정 */}
      {tab === 'expression' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>🎭 표정 5종</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="data: data/needs.ts (ExpressionId)" />
            <SourceTag label="기획: 모듈/표정카탈로그.md" />
            <SourceTag label="자산: face_{id}.png × 5명 = 25 PNG" />
            <SourceTag label="자동: mood_score → moodToExpression" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
            {EXPRESSIONS.map((e) => (
              <InfoCard key={e.id}>
                <Box sx={{ textAlign: 'center' }}>
                  <AidongSprite character="황금멍" expression={e.id} size={120} />
                  <Typography sx={{ fontWeight: 600, mt: 1 }}>
                    {e.emoji} {e.label}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>
                    face_{e.id}.png
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
                  {e.desc}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 13. 6 욕구 */}
      {tab === 'need' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>📊 6 욕구 모델</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="data: data/needs.ts (NeedKey·NEED_LABELS·INITIAL_NEEDS)" />
            <SourceTag label="기획: 모듈/다마고치코어.md §5" />
            <SourceTag label="UI: components/CareModal.tsx (LinearProgress 6 게이지)" />
            <SourceTag label="감소: stores/userStore.ts tickSequenceDecay" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
            {NEED_KEYS.map((k) => (
              <InfoCard key={k}>
                <Box sx={{ textAlign: 'center', mb: 1 }}>
                  <Box sx={{ fontSize: 48 }}>{NEED_LABELS[k].emoji}</Box>
                  <Typography sx={{ fontWeight: 600 }}>{NEED_LABELS[k].ko}</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {k}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  범위: 0~10 · 시퀀스 진입 시 -1 · 케어로 회복
                </Typography>
              </InfoCard>
            ))}
          </Box>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h2" sx={{ mb: 1 }}>5존 시간대</Typography>
          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto' }}>
            {[0, 1, 2, 3, 4].map((z) => (
              <Chip key={z} label={ZONE_LABELS[z as 0 | 1 | 2 | 3 | 4]} sx={{ flexShrink: 0 }} />
            ))}
          </Stack>
        </Box>
      )}

      {/* 14. 시나리오 */}
      {tab === 'scenario' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>📜 시나리오 13편</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="자산: 기획/시나리오/*.json (symlink)" />
            <SourceTag label="스키마: @idongworld/vn-runner/types (S09_VN_Runner.md)" />
            <SourceTag label="재생: @idongworld/vn-runner/VNPlayer" />
            <SourceTag label="영감원 검수: §8.4 grep 0 매치" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {SCENARIO_LIST.map((s) => (
              <InfoCard key={s.type}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>
                  {s.type} · {s.count}편
                </Typography>
                {s.files.map((f) => (
                  <Typography key={f} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>
                    {f}
                  </Typography>
                ))}
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 15. 일기 */}
      {tab === 'diary' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>📔 일기 5 시간대 슬롯</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="자산: 기획/시나리오/diary_{캐릭터}_day{N}.json" />
            <SourceTag label="기획: 모듈/일기.md (5×5 = 25 슬롯/일/캐릭터)" />
            <SourceTag label="UI: components/DiaryModal.tsx + DiaryFragmentToast.tsx" />
            <SourceTag label="현재: 황금멍·춤냥 day1만 작성" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
            {DIARY_SLOTS.map((d) => (
              <InfoCard key={d.id}>
                <Box sx={{ textAlign: 'center', fontSize: 32, mb: 1 }}>{d.emoji}</Box>
                <Typography sx={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>{d.label}</Typography>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', fontFamily: 'monospace', color: 'text.secondary' }}>
                  {d.id}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
                  길이: {d.length}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  트리거: {d.trigger}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {/* 16. Trigger */}
      {tab === 'trigger' && (
        <Box>
          <Typography variant="h2" sx={{ mb: 1 }}>⚡ VN Trigger 카탈로그</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SourceTag label="구현: @idongworld/vn-runner/trigger" />
            <SourceTag label="스키마: @idongworld/vn-runner/types" />
            <SourceTag label="기획: 매뉴얼/시스템/S09_VN_Runner.md §1.4" />
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {TRIGGERS.map((t) => (
              <InfoCard key={t.id}>
                <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>
                  {t.id}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                  핸들러: {t.handler}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  사용: {t.use}
                </Typography>
              </InfoCard>
            ))}
          </Box>
        </Box>
      )}

      {tab === 'modules' && <ModulesPanel />}

      <Divider sx={{ my: 4 }} />
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', textAlign: 'center' }}>
        에셋 카탈로그 v0.2 · 2026-05-10 · 개발 빌드 전용
        <br />
        실 PNG/WebP 자산 도착 시 이 카탈로그 보고 어디 들어갈지 결정
      </Typography>
    </Box>
  )
}

// ──────────────────────────────────────────────
// 🧩 모듈 분리 현황 패널 (registry 라이브 조회)
// ──────────────────────────────────────────────
const KIND_LABEL: Record<string, string> = {
  global: '🌐 광역',
  system: '🏗️ 시스템',
  content: '📦 콘텐츠',
  asset: '🎨 자산',
  shared: '📊 공유데이터',
}

const KIND_ORDER: Array<'global' | 'system' | 'content'> = ['global', 'system', 'content']

const ModulesPanel = () => {
  // 부팅 시 registerModules 호출됨 → core listAll 즉시 사용 가능
  const all = listAllModules()
  // 분류별 카운트
  const counts = all.reduce((acc, m) => {
    acc[m.kind] = (acc[m.kind] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 5분류별 그룹화 — 순서: 광역 → 시스템 → 콘텐츠
  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    modules: all.filter((m) => m.kind === kind),
  })).filter((g) => g.modules.length > 0)

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 1 }}>🧩 모듈 분리 현황 ({all.length} 등록)</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <SourceTag label="SoT: 모듈분리작업계획_v1_260510.md v1.9.1" />
        <SourceTag label="registry: @idongworld/core" />
        <SourceTag label="bootstrap: src/lib/moduleRegistry.ts" />
        <SourceTag label={`5 분류: 🌐 ${counts.global ?? 0} · 🏗️ ${counts.system ?? 0} · 📦 ${counts.content ?? 0} · 🎨 ${counts.asset ?? 0} · 📊 ${counts.shared ?? 0}`} />
      </Stack>

      {grouped.map((group) => (
        <Box key={group.kind} sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 1, fontSize: 16, fontWeight: 600 }}>
            {group.label} ({group.modules.length})
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 2 }}>
            {group.modules.map((m) => (
              <InfoCard key={m.id}>
                <Typography sx={{ fontWeight: 600 }}>
                  {m.name}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary', mt: 0.5 }}>
                  {m.id} v{m.version}
                </Typography>
                {m.description && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5, lineHeight: 1.5 }}>
                    {m.description}
                  </Typography>
                )}
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {'requires' in m && m.requires && m.requires.length > 0 && (
                    <Chip size="small" variant="outlined" label={`requires: ${m.requires.join(', ')}`} sx={{ fontSize: 10 }} />
                  )}
                  {'route' in m && m.route && (
                    <Chip size="small" color="primary" variant="outlined" label={`route: ${m.route}`} sx={{ fontSize: 10, fontFamily: 'monospace' }} />
                  )}
                  {'storeSlice' in m && m.storeSlice && (
                    <Chip size="small" color="secondary" variant="outlined" label={`store: ${m.storeSlice}`} sx={{ fontSize: 10, fontFamily: 'monospace' }} />
                  )}
                  {'i18nNamespace' in m && m.i18nNamespace && (
                    <Chip size="small" variant="outlined" label={`i18n: ${m.i18nNamespace}`} sx={{ fontSize: 10 }} />
                  )}
                  {'customs' in m && m.customs && (
                    <Chip size="small" color="warning" variant="outlined" label={`customs: ${m.customs}`} sx={{ fontSize: 10 }} />
                  )}
                  {'balance' in m && m.balance && (
                    <Chip size="small" color="info" variant="outlined" label={`balance: ${m.balance}`} sx={{ fontSize: 10 }} />
                  )}
                  {'api' in m && m.api && (
                    <Chip size="small" color="success" variant="outlined" label={`api: ${m.api}`} sx={{ fontSize: 10, fontFamily: 'monospace' }} />
                  )}
                  {'tech' in m && m.tech && m.tech !== 'react' && (
                    <Chip size="small" color="default" label={`tech: ${m.tech}`} sx={{ fontSize: 10 }} />
                  )}
                </Stack>
                {'exports' in m && m.exports && m.exports.length > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1, fontSize: 10 }}>
                    exports: <span style={{ fontFamily: 'monospace' }}>{m.exports.slice(0, 6).join(', ')}{m.exports.length > 6 ? `, +${m.exports.length - 6}` : ''}</span>
                  </Typography>
                )}
              </InfoCard>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
