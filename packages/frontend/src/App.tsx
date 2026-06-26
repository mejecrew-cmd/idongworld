/**
 * 📁 App.tsx — 화면 라우터 (앱 전체 화면 지도)
 * ───────────────────────────────────────────────
 * 📌 역할: URL 경로(/login, /island ...)에 따라 어떤 화면을 보여줄지 정한다.
 *           화면 그룹별로 공통 레이아웃(HUD·하단네비 유무)을 씌운다.
 *
 * 🔗 연결:
 *   - 기획 SoT: 매뉴얼/시스템/S07_화면라우팅.md (13 화면 카탈로그)
 *   - components/Layouts.tsx → 3종 레이아웃 (FullScreen·MyIsland·Voyage)
 *   - screens/* → 각 화면 컴포넌트
 *   - stores/userStore.ts → 로그인·온보딩 진행도 (EntryGuard 분기 기준)
 *
 * 💡 초보자 안내:
 *   - <Routes>: 여러 <Route> 중 URL과 일치하는 것을 골라 element 렌더.
 *   - <Outlet>: 부모 Layout 안에 자식 Route 화면이 끼워지는 자리 (Layouts.tsx 참고).
 *   - EntryGuard: "/" 진입 시 사용자 상태 보고 알맞은 곳으로 보내는 자동 분기.
 *     ① 미로그인 → /login
 *     ② 로그인+미온보딩 → /title
 *     ③ 로그인+온보딩완료 → /island (마이섬 본 게임)
 *   - "*" Route: 위에서 어디에도 매칭 안 되면 "/"로 되돌림 (404 방지).
 */
import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { usePageTracking } from './lib/usePageTracking'

import { LoginScreen } from './screens/LoginScreen'
import { SignupScreen } from './screens/SignupScreen'
import { TitleScreen } from './screens/TitleScreen'
import { OpeningScreen } from './screens/OpeningScreen'
import { OpeningPart2Screen } from './screens/OpeningPart2Screen'
import { FirstMeetingScreen } from './screens/FirstMeetingScreen'
import { HeartIslandFirstScreen } from './screens/HeartIslandFirstScreen'
import { CleaningLoopScreen } from './screens/CleaningLoopScreen'
import { NamingToHeartScreen } from './screens/NamingToHeartScreen'
import { HubHeartScene } from './screens/HubHeartScene'
import { JournalScreen } from './screens/JournalScreen'
import { HarborScene } from './screens/HarborScene'
import { NavigationBoardScene } from './screens/NavigationBoardScene'
import { LodgeScene } from './screens/LodgeScene'
import { MyRoomScreen } from './screens/MyRoomScreen'
import { IslandAreaPlaceholderScene } from './screens/IslandAreaPlaceholderScene'
import { DebutStageScene } from './screens/DebutStageScene'
import { StageScreen } from './screens/StageScreen'
import { AssetCatalogScreen } from './screens/dev/AssetCatalogScreen'
import { CodexScreen } from './screens/CodexScreen'
import { ShopScreen } from './screens/ShopScreen'
import { SettingsScreen } from './screens/SettingsScreen'

import { MyIslandLayout, VoyageLayout, FullScreenLayout } from './components/Layouts'
import { DebugPanel } from './components/DebugPanel'
import { CustomsConfirmModal } from './components/CustomsConfirmModal'
import { renderModuleRoutes } from './lib/moduleRoutes'
import { accountStoreFacade } from './lib/storeFacades'
import { isFirebaseEnabled, onFirebaseAuthChanged } from './lib/firebase'
import { hydrateSplitState } from './lib/syncStore'
import { api, hasPasswordSessionToken } from './lib/api'

const CUSTOMS_UI_ENABLED = import.meta.env.VITE_CUSTOMS_UI_ENABLED === 'true'
const LegacyDebutRedirect = () => {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={id ? `/stage/debut/${id}` : '/stage'} replace />
}

/**
 * 진입 가드(EntryGuard)
 * "/"로 들어왔을 때 사용자 상태에 따라 적절한 화면으로 자동 이동시킨다.
 */
const EntryGuard = () => {
  const firebaseUid = accountStoreFacade.useFirebaseUid()
  const [target, setTarget] = useState<'login' | 'title' | null>(() => (firebaseUid ? 'title' : null))

  useEffect(() => {
    if (firebaseUid) {
      setTarget('title')
      return undefined
    }
    if (!isFirebaseEnabled) {
      setTarget('login')
      return undefined
    }

    return onFirebaseAuthChanged((user) => {
      setTarget(user ? 'title' : 'login')
    })
  }, [firebaseUid])

  if (target === 'title') return <Navigate to="/title" replace />
  if (target === 'login') return <Navigate to="/login" replace />
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f6fbf7',
        color: '#273333',
        fontWeight: 800,
      }}
    >
      로그인 세션 확인 중...
    </div>
  )
}

const LoginGuard = () => {
  const firebaseUid = accountStoreFacade.useFirebaseUid()
  if (firebaseUid) return <Navigate to="/title" replace />
  return <LoginScreen />
}

const IslandHydrationGate = () => {
  const firebaseUid = accountStoreFacade.useFirebaseUid()
  const [status, setStatus] = useState<'checking' | 'ready' | 'login'>('checking')

  useEffect(() => {
    let cancelled = false

    const finishReady = () => {
      if (!cancelled) setStatus('ready')
    }
    const finishLogin = () => {
      if (!cancelled) setStatus('login')
    }
    const hydrateUid = async (uid: string) => {
      await hydrateSplitState(uid)
      accountStoreFacade.mergeAccountState({ firebaseUid: uid, isGuest: false })
    }

    setStatus('checking')

    if (firebaseUid) {
      void hydrateUid(firebaseUid)
        .catch((error) => {
          console.warn('[island] failed to hydrate account state before route render', error)
        })
        .finally(finishReady)
      return () => {
        cancelled = true
      }
    }

    if (hasPasswordSessionToken()) {
      void api.authMe()
        .then((response) => {
          const uid = typeof response.user?.uid === 'string' ? response.user.uid : undefined
          if (!uid) throw new Error('password_session_user_missing_uid')
          return hydrateUid(uid)
        })
        .then(finishReady)
        .catch((error) => {
          console.warn('[island] failed to restore password session before route render', error)
          finishLogin()
        })
      return () => {
        cancelled = true
      }
    }

    if (!isFirebaseEnabled) {
      finishLogin()
      return () => {
        cancelled = true
      }
    }

    const unsubscribe = onFirebaseAuthChanged((user) => {
      if (!user) {
        finishLogin()
        return
      }
      void hydrateUid(user.uid)
        .catch((error) => {
          console.warn('[island] failed to restore Firebase session before route render', error)
        })
        .finally(finishReady)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [firebaseUid])

  if (status === 'login') return <Navigate to="/login" replace />
  if (status !== 'ready') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f6fbf7',
          color: '#273333',
          fontWeight: 800,
        }}
      >
        마이섬 상태 불러오는 중...
      </div>
    )
  }

  return <MyIslandLayout />
}

const HarborGate = () => {
  const sooksoClean = accountStoreFacade.useSooksoClean()
  if (!sooksoClean) return <Navigate to="/island" replace />
  return <HarborScene />
}

const HarborAreaRedirect = () => {
  const sooksoClean = accountStoreFacade.useSooksoClean()
  return <Navigate to={sooksoClean ? '/island/harbor' : '/island'} replace />
}

export const App = () => {
  usePageTracking()  // GA4 SPA page view (env 미설정 시 no-op)
  return (
  <>
  <Routes>
    {/* "/" 루트 — 자동 분기 (EntryGuard) */}
    <Route path="/" element={<EntryGuard />} />

    {/* 인증 화면 — 레이아웃 없음 */}
    <Route path="/login" element={<LoginGuard />} />

    {/* 모듈이 제공하는 독립 라우트. 예: /voyage/island/shell */}
    {renderModuleRoutes()}

    {/* 온보딩 시퀀스 — 풀스크린 시네마틱 (HUD/네비 X) */}
    <Route element={<FullScreenLayout />}>
      <Route path="/signup" element={<SignupScreen />} />
      <Route path="/title" element={<TitleScreen />} />
      <Route path="/opening" element={<OpeningScreen />} />
      <Route path="/opening/part2" element={<OpeningPart2Screen />} />
      <Route path="/first-meeting" element={<FirstMeetingScreen />} />
      <Route path="/heart-island/first" element={<HeartIslandFirstScreen />} />
      <Route path="/heart-island/cleaning" element={<CleaningLoopScreen />} />
      <Route path="/heart-island/naming" element={<NamingToHeartScreen />} />
    </Route>

    {/* 마이섬 본 게임 — HUD + 하단 네비 */}
    <Route path="/island" element={<IslandHydrationGate />}>
      <Route index element={<HubHeartScene />} />              {/* /island */}
      <Route path="full-map" element={<Navigate to="/island" replace />} />
      <Route path="area/02" element={<HarborAreaRedirect />} />
      <Route path="area/03" element={<Navigate to="/island/memory" replace />} />
      <Route path="area/06" element={<Navigate to="/island/oasis" replace />} />
      <Route path="area/12" element={<Navigate to="/island/mine" replace />} />
      <Route path="area/13" element={<Navigate to="/island/lodge" replace />} />
      <Route path="area/14" element={<Navigate to="/island/garden" replace />} />
      <Route path="area/:areaNo" element={<IslandAreaPlaceholderScene />} />
      <Route path="harbor" element={<HarborGate />} />             {/* /island/harbor */}
      <Route path="lodge" element={<LodgeScene />} />               {/* /island/lodge */}
      <Route path="lodge/myroom" element={<Navigate to="/island/lodge/myroom/info" replace />} />
      <Route path="lodge/myroom/info" element={<MyRoomScreen />} />
      <Route path="lodge/myroom/aidong" element={<MyRoomScreen />} />
      <Route path="lodge/myroom/aidong/:id" element={<MyRoomScreen />} />
      <Route path="lodge/myroom/codex" element={<MyRoomScreen />} />
      <Route path="lodge/myroom/collection" element={<MyRoomScreen />} />
      <Route path="lodge/myroom/ledger" element={<MyRoomScreen />} />
    </Route>

    {/* 도감 — HUD + 하단 네비 (마이섬 레이아웃 재사용) */}
    <Route path="/codex" element={<IslandHydrationGate />}>
      <Route index element={<CodexScreen />} />
    </Route>

    <Route path="/journal" element={<IslandHydrationGate />}>
      <Route index element={<JournalScreen />} />
    </Route>

    {/* 상점/설정 — 기능 연결 전 placeholder */}
    <Route path="/shop" element={<IslandHydrationGate />}>
      <Route index element={<ShopScreen />} />
    </Route>
    <Route path="/setting" element={<IslandHydrationGate />}>
      <Route index element={<SettingsScreen />} />
    </Route>

    {/* 항해 — HUD만 (하단 네비 X, 항해 중단 방지) */}
    <Route path="/voyage" element={<VoyageLayout />}>
      <Route path="board" element={<NavigationBoardScene />} />            {/* 부루마블 보드 */}
    </Route>

    {/* 대표 무대 — 마이섬 레이아웃을 쓰는 stage 허브 */}
    <Route path="/stage" element={<IslandHydrationGate />}>
      <Route index element={<StageScreen />} />
    </Route>

    {/* 데뷔 공연 — 최신 route와 legacy compat */}
    <Route path="/stage/debut/:id" element={<DebutStageScene />} />
    <Route path="/debut/:id" element={<LegacyDebutRedirect />} />
    {/* 개발자·디자이너용 에셋 카탈로그 (개발 빌드만 권장) */}
    <Route path="/dev/catalog" element={<AssetCatalogScreen />} />

    {/* 그 외 모든 경로 → 루트로 되돌림 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
  {/* 모든 화면 위 — 개발 빌드에서만 표시 (production 자동 숨김) */}
  <DebugPanel />
  {/* customs 변환 확인 모달 — Phase 1 기본 UX에서는 비활성화 */}
  {CUSTOMS_UI_ENABLED && <CustomsConfirmModal />}
  </>
  )
}
