import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Object3D, type HemisphereLight, type PointLight, type SpotLight, type Vector3Tuple } from 'three'
import { easeInOutCubic, segment } from '@/motion/easing'
import { INTRO } from '@/motion/intro'
import { TRAVEL_VIEWPORTS } from '@/motion/travel'
import type { IntroClockRef } from '../useIntroClock'
import type { PointerDriftRef } from '../usePointerDrift'
import type { TravelRef } from '../useScrollTravel'
import { FLOOR_Y, hallSpread, journeyLighting, LIGHT_DRIFT, LIGHTING, monolithLayout, SECOND_MONOLITH } from './layout'

interface LightsProps {
  intro: IntroClockRef
  travel: TravelRef
  drift: PointerDriftRef
  aspect: number
}

/**
 * Soft, placed light, exhibition-style: a warm key washing the monolith, a
 * low red ember on the left, and warm gallery downlights on the second
 * monolith and the far threshold. No shadow maps. All of it comes up during
 * the intro, then follows the journey (see journeyLighting), and shifts
 * gently with the pointer (see LIGHT_DRIFT).
 */
export function Lights({ intro, travel, drift, aspect }: LightsProps) {
  const ambient = useRef<HemisphereLight>(null)
  const key = useRef<SpotLight>(null)
  const ember = useRef<PointLight>(null)
  const downlight = useRef<SpotLight>(null)
  const threshold = useRef<SpotLight>(null)
  const keyTarget = useMemo(() => new Object3D(), [])
  const downlightTarget = useMemo(() => new Object3D(), [])
  const thresholdTarget = useMemo(() => new Object3D(), [])

  const spread = hallSpread(aspect)
  const [monolithX, , monolithZ] = monolithLayout(aspect).position
  const along = ([x, y, z]: Vector3Tuple): Vector3Tuple => [x * spread, y, z]

  const [offsetX, offsetY, offsetZ] = LIGHTING.key.offset
  const secondX = SECOND_MONOLITH.x * spread
  const [downX, downY, downZ] = LIGHTING.downlight.offset
  // Where each light rests; the pointer moves them a little from here
  const keyAt: Vector3Tuple = [monolithX + offsetX, FLOOR_Y + offsetY, monolithZ + offsetZ]
  const emberAt = along(LIGHTING.ember.position)
  const downlightAim: Vector3Tuple = [secondX, FLOOR_Y + 1, SECOND_MONOLITH.z + 0.8]
  const thresholdAim = along(LIGHTING.threshold.target)

  useFrame(() => {
    const { start, duration } = INTRO.scene.reveal
    const level = easeInOutCubic(segment(intro.current.elapsed, start, duration))
    const journey = journeyLighting(travel.current.eased * TRAVEL_VIEWPORTS)
    if (ambient.current) ambient.current.intensity = LIGHTING.ambient.intensity * level
    if (key.current) key.current.intensity = LIGHTING.key.intensity * level * journey.accent
    if (ember.current) ember.current.intensity = LIGHTING.ember.intensity * level * journey.accent
    if (downlight.current) downlight.current.intensity = LIGHTING.downlight.intensity * level * journey.downlight
    if (threshold.current) threshold.current.intensity = LIGHTING.threshold.intensity * level * journey.threshold

    const { x, y } = drift.current
    key.current?.position.set(keyAt[0] + x * LIGHT_DRIFT.key[0], keyAt[1] + y * LIGHT_DRIFT.key[1], keyAt[2])
    ember.current?.position.set(emberAt[0] + x * LIGHT_DRIFT.ember[0], emberAt[1] + y * LIGHT_DRIFT.ember[1], emberAt[2])
    downlight.current?.target.position.setX(downlightAim[0] + x * LIGHT_DRIFT.aim)
    threshold.current?.target.position.setX(thresholdAim[0] + x * LIGHT_DRIFT.aim)
  })

  return (
    <>
      <hemisphereLight ref={ambient} args={[LIGHTING.ambient.sky, LIGHTING.ambient.ground, 0]} />

      <primitive object={keyTarget} position={[monolithX, FLOOR_Y + 1, monolithZ]} />
      <spotLight
        ref={key}
        color={LIGHTING.key.color}
        intensity={0}
        position={keyAt}
        // Narrower on narrow screens, so its pool doesn't flood the floor
        angle={Math.atan(Math.tan(LIGHTING.key.angle) * spread)}
        penumbra={1}
        decay={2}
        target={keyTarget}
      />

      <pointLight ref={ember} color={LIGHTING.ember.color} intensity={0} position={emberAt} decay={2} />

      <primitive object={downlightTarget} position={downlightAim} />
      <spotLight
        ref={downlight}
        color={LIGHTING.downlight.color}
        intensity={0}
        position={[secondX + downX, FLOOR_Y + downY, SECOND_MONOLITH.z + downZ]}
        angle={LIGHTING.downlight.angle}
        penumbra={1}
        decay={2}
        target={downlightTarget}
      />

      <primitive object={thresholdTarget} position={thresholdAim} />
      <spotLight
        ref={threshold}
        color={LIGHTING.threshold.color}
        intensity={0}
        position={along(LIGHTING.threshold.position)}
        angle={LIGHTING.threshold.angle}
        penumbra={1}
        decay={2}
        target={thresholdTarget}
      />
    </>
  )
}
