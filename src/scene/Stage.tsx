import { Canvas } from '@react-three/fiber'
import { Suspense, type RefObject } from 'react'
import { CAMERA } from './camera'
import { SceneErrorBoundary } from './SceneErrorBoundary'
import { World, type WorldProps } from './World'

interface StageProps extends WorldProps {
  /** Element that receives pointer input for the scene, since the UI sits on top of the canvas. */
  eventSource: RefObject<HTMLElement | null>
  /** Called if the scene can't start at all (no WebGL, blocked context). */
  onFailure: () => void
}

/**
 * Owns the WebGL canvas: a fixed, full-viewport, transparent layer between
 * the CSS backdrop and the UI. Everything inside the 3D space lives under <World />.
 */
export function Stage({ eventSource, onFailure, ...world }: StageProps) {
  return (
    <SceneErrorBoundary onError={onFailure}>
      <Canvas
        aria-hidden="true"
        // No tone mapping: brand colours (and, later, site screenshots) render exactly
        flat
        // Phones get a lower pixel-ratio ceiling: the scene is soft, sharpness costs more than it shows
        dpr={[1, world.quality === 'low' ? 1.5 : 2]}
        // With reduced motion nothing animates, so only render when something changes
        frameloop={world.reducedMotion ? 'demand' : 'always'}
        camera={{ fov: CAMERA.fov, near: 0.1, far: 100, position: [0, 0, CAMERA.introZ] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        eventSource={eventSource}
        eventPrefix="client"
        // The canvas is fixed, so scrolling never changes its size or position
        resize={{ scroll: false }}
        style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-scene)' }}
      >
        <Suspense fallback={null}>
          <World {...world} />
        </Suspense>
      </Canvas>
    </SceneErrorBoundary>
  )
}
