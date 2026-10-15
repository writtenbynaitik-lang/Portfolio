import { MathUtils, type Vector3, type Vector3Tuple } from 'three'
import { DEPARTURE, FINALE_TIMING, GALLERY_END } from '@/motion/travel'
import { contactLayout, hallSpread, PASSAGE, THRESHOLD_SLIT } from './environment/layout'
import { Keyframes } from './keyframes'

export const CAMERA = {
  fov: 45,
  /** Resting distance once the intro has settled. */
  restZ: 6,
  /** Where the intro dolly starts, further back. */
  introZ: 9.5,
  /** Maximum pointer parallax offset, in world units: enough to sense depth, too little to notice as movement. */
  parallax: { x: 0.26, y: 0.15 },
} as const

/**
 * The scroll journey through the hall: where the camera stands and where it
 * looks, from the opening view (first key) to the gathering of the gallery
 * at the far end (last), keyed by progress through the gallery (0–1). It
 * enters leaning toward the monolith, then walks slowly down the hall while
 * the gallery comes to it, and ends facing the threshold. Lateral drift and a
 * slowly swinging aim give the change in perspective; there's no roll and no
 * sudden turn. x is multiplied by hallSpread.
 */
export const TRAVEL_PATH: readonly { at: number; position: Vector3Tuple; target: Vector3Tuple }[] = [
  { at: 0, position: [0, 0, 6], target: [0, 0, -4] },
  { at: 0.2, position: [0.8, -0.15, 1.5], target: [1, -0.2, -12] },
  { at: 0.4, position: [1, -0.3, -2.5], target: [0.8, -0.3, -16] },
  { at: 0.6, position: [0.5, -0.4, -6.5], target: [-0.2, -0.35, -20] },
  { at: 0.8, position: [-0.2, -0.45, -10.5], target: [-1.4, -0.4, -25] },
  { at: 1, position: [-0.9, -0.5, -14], target: [-2.6, -0.4, -30] },
]

export interface TravelPath {
  /** Camera position and aim at scroll position `at`, in viewport heights. */
  at(at: number, position: Vector3, target: Vector3): void
}

/**
 * The whole journey for the current screen shape: the gallery path above,
 * then the finale. From the gathering the camera drifts on a moment, heads
 * for the threshold, passes through its opening (lined up with it, so the
 * slabs part around it) and comes to rest facing the slit in the contact
 * room, slowing to a stop as it arrives.
 */
export function createTravelPath(aspect: number): TravelPath {
  const spread = hallSpread(aspect)
  const scaled = (x: number, y: number, z: number, tx: number, ty: number, tz: number) => [
    x * spread,
    y,
    z,
    tx * spread,
    ty,
    tz,
  ]
  const slitX = THRESHOLD_SLIT.x * spread
  const room = contactLayout(aspect)
  const [restX, restY, restZ] = room.camera.position
  const [aimX, aimY, aimZ] = room.camera.target

  const keys: Array<[number, number[]]> = [
    ...TRAVEL_PATH.map(({ at, position: [x, y, z], target: [tx, ty, tz] }): [number, number[]] => [
      at * GALLERY_END,
      scaled(x, y, z, tx, ty, tz),
    ]),
    [DEPARTURE, scaled(-1, -0.5, -14.6, -2.6, -0.4, -30)],
    [DEPARTURE + 0.8, [slitX * 0.9, -0.35, -22.5, slitX, -0.25, -36]],
    [PASSAGE.through, [slitX, -0.25, -30.2, (slitX + aimX) / 2, (aimY - 0.25) / 2, -46]],
    [DEPARTURE + FINALE_TIMING.passage, [restX, restY, restZ, aimX, aimY, aimZ]],
  ]
  const path = new Keyframes(
    keys.map(([at]) => at),
    keys.map(([, values]) => values),
  )
  const values: number[] = []
  return {
    at(at, position, target) {
      const [x = 0, y = 0, z = 0, tx = 0, ty = 0, tz = 0] = path.evaluate(at, values)
      position.set(x, y, z)
      target.set(tx, ty, tz)
    },
  }
}

/** Half the visible height of the frustum at `distance` in front of the camera. */
export const visibleHalfHeight = (distance: number) => Math.tan(MathUtils.degToRad(CAMERA.fov / 2)) * distance

/**
 * Half the visible width and height of the frustum at world depth `z`,
 * measured from the resting camera so layouts don't shift during the intro.
 */
export function visibleHalfExtent(z: number, aspect: number) {
  const halfHeight = visibleHalfHeight(CAMERA.restZ - z)
  return { halfWidth: halfHeight * aspect, halfHeight }
}
