/**
 * 📁 main.tsx — 프론트엔드 앱의 시작점 (Entry Point)
 * ───────────────────────────────────────────────
 * 📌 역할: 브라우저가 처음 페이지를 열 때 가장 먼저 실행되는 파일.
 *           React 앱을 #root DOM 노드에 그려넣고, 전역 환경(테마·라우터·번역·동기화)을
 *           감싸서 App 컴포넌트로 내려보냅니다.
 *
 * 🔗 부팅 순서:
 *   1. registerModules()       — 모든 모듈 manifest 등록·검증
 *   2. 광역 부트스트랩          — account·host·myAidong·myIsland·codex (다른 모듈이 actions 사용 가능)
 *   3. 시스템 부트스트랩        — vn-runner·gacha·customs·cutscene-runner
 *   4. backend sync             — bootstrapAuth → startSync
 *   5. React mount              — App·MobilePreview·ErrorBoundary 트리
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from './theme/theme'
import { App } from './App'
import './i18n'
import { startSync, bootstrapAuth } from './lib/syncStore'
import { startActionApiCrossTabSync } from './lib/actionApiSync'
import { bootstrapVNRunner } from './lib/vnBootstrap'
import { bootstrapGacha } from './lib/gachaBootstrap'
import { bootstrapHost } from './lib/hostBootstrap'
import { bootstrapAccount } from './lib/accountBootstrap'
import { bootstrapMyAidong } from './lib/myAidongBootstrap'
import { bootstrapMyIsland } from './lib/myIslandBootstrap'
import { bootstrapCodex } from './lib/codexBootstrap'
import { bootstrapZoneGarden } from './lib/zoneGardenBootstrap'
import { bootstrapAidongIsland } from './lib/aidongIslandBootstrap'
import { bootstrapZoneContent } from './lib/zoneContentBootstrap'
import { bootstrapCustoms } from './lib/customsBootstrap'
import { bootstrapCutsceneRunner } from './lib/cutsceneBootstrap'
import { registerModules } from './lib/moduleRegistry'
import { bootstrapAnalytics } from './lib/analytics'
import { bootstrapBusBridge } from './lib/busBridge'
import { bootstrapModuleListeners } from './lib/moduleListeners'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MobilePreview } from './components/MobilePreview'

// 0. GA4 활성 시 gtag.js 로드 (env 미설정 시 no-op) — PM Q1
bootstrapAnalytics()

// 0b. bus 이벤트 → DEV 콘솔 + GA4 trackEvent 브릿지 (모듈 텔레메트리)
bootstrapBusBridge()

// 0c. 모듈 간 자동 연결 (aidong:recruited → codex 자동 등재 등)
bootstrapModuleListeners()

// 1. 모듈 manifest 등록·의존성 검증 (실패 시 throw → ErrorBoundary)
registerModules()

// 2. 광역 모듈 먼저 (다른 모듈이 actions 사용 가능하도록)
bootstrapAccount()    // Firebase 활성 시 익명/Google/Twitter 로그인·미설정 시 로컬 게스트
bootstrapHost()       // 자원·재화·인벤토리 mutator
bootstrapMyAidong()   // 영입·친밀도·욕구·케어
bootstrapMyIsland()   // zone unlock 2-gate (build phase + condition DSL)
bootstrapCodex()      // 도감·일기 해금
bootstrapZoneGarden() // zone-garden harvest -> zone action API sync
bootstrapAidongIsland() // aidong-island recruit placeholder -> aidong-island/my-aidong action API sync
bootstrapZoneContent() // oasis/memory/mine -> zone action API sync

// 3. 시스템 모듈 DI 훅 주입 — 앱 mount 전 1회
bootstrapVNRunner()
bootstrapGacha()
bootstrapCustoms()         // host 사용 — bootstrapHost 이후
bootstrapCutsceneRunner()  // 시범 callSiteId 등록

// 3b. backend action 결과를 다른 탭의 local mirror에도 반영
startActionApiCrossTabSync()

// 4. 앱 시작 시점에 backend 인증 시도 → 실패해도 무시하고 진행
void bootstrapAuth().then(() => startSync())

// 5. React mount
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <MobilePreview>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MobilePreview>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
)
