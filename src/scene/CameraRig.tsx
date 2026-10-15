import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { easeOutCubic, segment } from '@/motion/easing'
import { INTRO } from '@/motion/intro'
import { TRAVEL_VIEWPORTS } from '@/motion/travel'
import { CAMERA, createTravelPath } from './camera'
import type { IntroClockRef } from './useIntroClock'
import type { PointerDriftRef } from './usePointerDrift'
import type { TravelRef } from './useScrollTravel'

interface CameraRigProps {
  intro: IntroClockRef
  travel: TravelRef
  /** The pointer's slow influence (still on touch screens and with reduced motion). */
  drift: PointerDriftRef
}

// Scratch objects reused every frame
const position = new Vector3()
const target = new Vector3()

/**
 * The only thing that moves the camera. Three layers, added together:
 * the scroll journey along TRAVEL_PATH, the intro's push-in from further
 * back, and a restrained parallax that follows the pointer (see usePointerDrift).
 */
export function CameraRig({ intro, travel, drift }: CameraRigProps) {
  const aspect = useThree((state) => state.viewport.aspect)
  const path = useMemo(() => createTravelPath(aspect), [aspect])

  useFrame(({ camera }) => {
    path.at(travel.current.eased * TRAVEL_VIEWPORTS, position, target)

    const { start, duration } = INTRO.scene.dolly
    const dolly = easeOutCubic(segment(intro.current.elapsed, start, duration))
    position.z += (CAMERA.introZ - CAMERA.restZ) * (1 - dolly)

    const { x, y } = drift.current
    camera.position.set(position.x + x * CAMERA.parallax.x, position.y + y * CAMERA.parallax.y, position.z)
    camera.lookAt(target)
  })

  return null
}
