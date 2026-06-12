/**
 * packages/modules/destination-shell-island/src/DestinationIslandPixiScene.tsx
 * ------------------------------------------------------------
 * 역할: destination island 화면의 장식/연출 전용 PixiJS scene wrapper다.
 * 연결: React 화면은 backend state와 버튼 overlay를 담당하고, 이 컴포넌트는
 *       배경, 물결, 안개, 입자, hotspot pulse, node 전환 flash만 담당한다.
 * 주의: backend API를 직접 호출하지 않는다. scene effect는 입력 props만 보고
 *       렌더링하며, gameplay 상태 변경은 상위 React container에서 처리한다.
 */
import { useEffect, useRef } from 'react'
import { Application, Container, Graphics } from 'pixi.js'

interface HotspotVisual {
  hotspotId: string
  interacted?: boolean
  left: string
  top: string
}

interface DestinationIslandPixiSceneProps {
  nodeId?: string
  hotspots: HotspotVisual[]
}

function percentToNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace('%', ''))
  return Number.isFinite(parsed) ? parsed / 100 : fallback
}

function drawIslandBase(layer: Container, width: number, height: number, nodeId?: string) {
  const sky = new Graphics()
    .rect(0, 0, width, height)
    .fill({ color: 0x14566f })
  layer.addChild(sky)

  const horizonGlow = new Graphics()
    .ellipse(width * 0.5, height * 0.5, width * 0.62, height * 0.22)
    .fill({ color: 0x7bd7cb, alpha: 0.16 })
  layer.addChild(horizonGlow)

  const farIslandColor = nodeId === 'old-shrine' ? 0x25425a : 0x1b6f69
  for (let i = 0; i < 3; i += 1) {
    const farIsland = new Graphics()
      .ellipse(width * (0.18 + i * 0.32), height * (0.53 + (i % 2) * 0.02), width * (0.12 + i * 0.02), height * 0.045)
      .fill({ color: farIslandColor, alpha: 0.28 })
    layer.addChild(farIsland)
  }

  const sea = new Graphics()
    .rect(0, height * 0.58, width, height * 0.42)
    .fill({ color: nodeId === 'beach-east' ? 0x3eb4a5 : 0x238f9f, alpha: 0.88 })
  layer.addChild(sea)

  const sand = new Graphics()
    .ellipse(width * 0.5, height * 0.86, width * 0.58, height * 0.28)
    .fill({ color: 0xe7c783 })
  layer.addChild(sand)

  const grove = new Graphics()
    .ellipse(width * 0.5, height * 0.18, width * 0.38, height * 0.2)
    .fill({ color: nodeId === 'grove-entrance' ? 0x1f8a62 : 0x226f5c, alpha: 0.78 })
  layer.addChild(grove)

  if (nodeId === 'old-shrine') {
    const shrine = new Graphics()
      .roundRect(width * 0.42, height * 0.2, width * 0.16, height * 0.18, 10)
      .fill({ color: 0x775f76 })
      .stroke({ color: 0xfff0c2, width: 2, alpha: 0.55 })
    layer.addChild(shrine)

    const shrineGlow = new Graphics()
      .ellipse(width * 0.5, height * 0.32, width * 0.18, height * 0.08)
      .fill({ color: 0xfff0c2, alpha: 0.14 })
    layer.addChild(shrineGlow)
  }
}

function drawWaves(layer: Container, width: number, height: number) {
  for (let i = 0; i < 9; i += 1) {
    const wave = new Graphics()
      .ellipse(0, 0, width * (0.055 + (i % 3) * 0.012), height * 0.012)
      .stroke({ color: 0xffffff, width: 2, alpha: 0.2 + (i % 3) * 0.08 })
    wave.x = width * (0.08 + i * 0.13)
    wave.y = height * (0.64 + (i % 3) * 0.055)
    wave.name = `wave:${i}`
    layer.addChild(wave)
  }
}

function drawHotspotPulses(layer: Container, hotspots: HotspotVisual[], width: number, height: number) {
  for (const hotspot of hotspots) {
    const x = percentToNumber(hotspot.left, 0.5) * width
    const y = percentToNumber(hotspot.top, 0.5) * height
    for (let i = 0; i < 3; i += 1) {
      const pulse = new Graphics()
        .circle(0, 0, hotspot.interacted ? 16 + i * 5 : 22 + i * 8)
        .stroke({
          color: hotspot.interacted ? 0x8bd1ff : 0xfff0a3,
          width: i === 0 ? 3 : 2,
          alpha: hotspot.interacted ? 0.18 + i * 0.05 : 0.26 + i * 0.18,
        })
      pulse.x = x
      pulse.y = y
      pulse.name = `hotspot:${hotspot.hotspotId}:${i}`
      layer.addChild(pulse)
    }
    const core = new Graphics()
      .circle(0, 0, 5)
      .fill({ color: hotspot.interacted ? 0x8bd1ff : 0xfff0a3, alpha: hotspot.interacted ? 0.4 : 0.74 })
    core.x = x
    core.y = y
    core.name = `hotspot-core:${hotspot.hotspotId}`
    layer.addChild(core)
  }
}

function drawParticles(layer: Container, width: number, height: number) {
  for (let i = 0; i < 42; i += 1) {
    const particle = new Graphics()
      .circle(Math.random() * width, Math.random() * height * 0.72, 1.5 + Math.random() * 2.5)
      .fill({ color: i % 3 === 0 ? 0xfff0a3 : 0xd8f5ff, alpha: 0.38 + Math.random() * 0.28 })
    particle.name = 'particle'
    layer.addChild(particle)
  }
}

function drawForeground(layer: Container, width: number, height: number) {
  const leftRock = new Graphics()
    .ellipse(width * 0.08, height * 0.94, width * 0.18, height * 0.12)
    .fill({ color: 0x244953, alpha: 0.58 })
  layer.addChild(leftRock)

  const rightGrass = new Graphics()
    .ellipse(width * 0.86, height * 0.91, width * 0.2, height * 0.14)
    .fill({ color: 0x1f6d5f, alpha: 0.52 })
  layer.addChild(rightGrass)

  const vignetteTop = new Graphics()
    .rect(0, 0, width, height * 0.2)
    .fill({ color: 0x04131b, alpha: 0.18 })
  layer.addChild(vignetteTop)

  const vignetteBottom = new Graphics()
    .rect(0, height * 0.78, width, height * 0.22)
    .fill({ color: 0x04131b, alpha: 0.24 })
  layer.addChild(vignetteBottom)
}

function drawTransitionFlash(layer: Container, width: number, height: number) {
  const flash = new Graphics()
    .rect(0, 0, width, height)
    .fill({ color: 0xf5fbff, alpha: 0.36 })
  flash.name = 'node-transition-flash'
  layer.addChild(flash)
}

function destroyPixiApp(app: Application, initialized: boolean) {
  if (!initialized) return
  const appWithResize = app as Application & { _cancelResize?: () => void }
  if (typeof appWithResize._cancelResize !== 'function') {
    appWithResize._cancelResize = () => {}
  }
  app.canvas?.parentElement?.removeChild(app.canvas)
  try {
    app.destroy()
  } catch (error) {
    console.warn('[destination-pixi] destroy skipped', error)
  }
}

export function DestinationIslandPixiScene({ nodeId, hotspots }: DestinationIslandPixiSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const target = host

    let disposed = false
    let initialized = false
    let resizeObserver: ResizeObserver | undefined
    const app = new Application()
    const root = new Container()
    const foregroundLayer = new Container()
    const effectLayer = new Container()

    async function start() {
      const bounds = target.getBoundingClientRect()
      await app.init({
        width: Math.max(1, Math.floor(bounds.width || target.clientWidth || 640)),
        height: Math.max(1, Math.floor(bounds.height || target.clientHeight || 420)),
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
      })
      initialized = true
      if (disposed) {
        destroyPixiApp(app, initialized)
        return
      }

      target.appendChild(app.canvas)
      app.canvas.style.width = '100%'
      app.canvas.style.height = '100%'
      app.canvas.style.display = 'block'
      app.stage.addChild(root)
      app.stage.addChild(foregroundLayer)
      app.stage.addChild(effectLayer)

      const rebuild = () => {
        root.removeChildren()
        foregroundLayer.removeChildren()
        effectLayer.removeChildren()
        const width = Math.max(1, app.screen.width)
        const height = Math.max(1, app.screen.height)
        drawIslandBase(root, width, height, nodeId)
        drawWaves(root, width, height)
        drawForeground(foregroundLayer, width, height)
        drawHotspotPulses(effectLayer, hotspots, width, height)
        drawParticles(effectLayer, width, height)
        drawTransitionFlash(effectLayer, width, height)
      }

      rebuild()
      resizeObserver = new ResizeObserver(() => {
        const nextBounds = target.getBoundingClientRect()
        app.renderer.resize(
          Math.max(1, Math.floor(nextBounds.width || target.clientWidth || 640)),
          Math.max(1, Math.floor(nextBounds.height || target.clientHeight || 420)),
        )
        rebuild()
      })
      resizeObserver.observe(target)

      let t = 0
      app.ticker.add(() => {
        t += 0.016
        for (const child of root.children) {
          if (String(child.name).startsWith('wave:')) {
            child.x += 0.24
            child.alpha = 0.18 + Math.sin(t * 2.2 + child.y * 0.02) * 0.08
            if (child.x > app.screen.width + 80) child.x = -80
          }
        }
        for (const child of effectLayer.children) {
          if (child.name === 'particle') {
            child.y -= 0.18
            child.x += Math.sin(t + child.y * 0.02) * 0.08
            child.alpha = 0.42 + Math.sin(t * 2 + child.x * 0.01) * 0.18
            if (child.y < -8) child.y = app.screen.height * 0.72
          } else if (String(child.name).startsWith('hotspot:')) {
            const scale = 1 + Math.sin(t * 4 + child.x * 0.01) * 0.1
            child.scale.set(scale)
            child.alpha = 0.44 + Math.sin(t * 3 + child.y * 0.01) * 0.18
          } else if (String(child.name).startsWith('hotspot-core:')) {
            const scale = 1 + Math.sin(t * 5 + child.x * 0.01) * 0.18
            child.scale.set(scale)
          } else if (child.name === 'node-transition-flash') {
            child.alpha = Math.max(0, child.alpha - 0.025)
          }
        }
      })
    }

    void start()

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      destroyPixiApp(app, initialized)
    }
  }, [hotspots, nodeId])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  )
}
