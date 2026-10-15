import { MathUtils, Vector3 } from 'three'
import type { Project } from '@/content/projects'
import { DEPARTURE, GALLERY_END, GALLERY_TIMING, momentAt } from '@/motion/travel'
import { visibleHalfHeight, type TravelPath } from '../camera'
import { FLOOR_Y } from '../environment/layout'
import { Keyframes } from '../keyframes'

/*
 * The gallery's choreography. Projects flow through the hall in one
 * direction: each arrives out of the depth on the right, takes the centre for
 * its moment, then steps back to the left and dissolves into the dark. In the
 * finale they all rematerialise around the threshold at the far end.
 *
 *   emerge   far off to the right, invisible
 *   wait     a small, dim hint during the previous project's moment
 *   feature  its moment: large, central, nearly face-on, lit, captioned
 *   recede   small and dim, back to the left, during the next moment
 *   dissolve fades into the dark where it stands, out of the way
 *   final    comes forward out of the dark into its place in the gathering
 *            around the threshold
 *   recede   as the camera leaves for the threshold, drifts outward and
 *            back into the dark, one after another
 *
 * So at any moment there is one clear subject and at most two quiet
 * neighbours. Each stage is a pose seen from wherever the camera is at that
 * point of the scroll, converted to world space and joined by smooth
 * keyframes, so every frame follows one authored path, forward or back.
 *
 * Angles are offsets from facing the camera, applied as the camera moves
 * (see Gallery), so a frame never drifts into an awkward angle between keys.
 */

interface Pose {
  /** Position as a fraction (−1…1) of the visible half-width / half-height at `depth`. */
  x: number
  y: number
  /** Distance in front of the camera. */
  depth: number
  /** Height of the screenshot as a fraction of the visible height at `depth`. */
  size: number
  /** Turn away from facing the camera, in radians: positive turns its face to the right. */
  yaw: number
  /** Brightness: dim in the distance, fully lit at its moment. */
  light: number
  opacity: number
}

type Placement = Pick<Pose, 'x' | 'y'> & Partial<Pose>

interface Choreography {
  wait: Placement
  feature: Placement
  recede: Placement
}

/** One per project, reused in turn if there are more projects than choreographies. */
type Choreographies = readonly [Choreography, ...Choreography[]]

interface Stages {
  emerge: Omit<Pose, 'x' | 'y'>
  wait: Omit<Pose, 'x' | 'y'>
  feature: Omit<Pose, 'x' | 'y'>
  recede: Omit<Pose, 'x' | 'y'>
  final: Pick<Pose, 'light' | 'opacity'>
}

/** Landscape screens: a calm frontal moment, with neighbours small and to the sides. */
const WIDE_STAGES: Stages = {
  emerge: { depth: 18, size: 0.12, yaw: -0.2, light: 0.2, opacity: 0 },
  wait: { depth: 15, size: 0.14, yaw: -0.12, light: 0.3, opacity: 0.85 },
  feature: { depth: 5.8, size: 0.47, yaw: 0, light: 1, opacity: 1 },
  recede: { depth: 13, size: 0.17, yaw: 0.16, light: 0.34, opacity: 0.9 },
  final: { light: 0.78, opacity: 1 },
}

/**
 * Per project: where it waits, holds its moment and recedes, varied in height
 * so the hints never line up, and its place in the finale. The finale is an
 * asymmetric hang either side of the threshold, larger nearer the viewer.
 */
const WIDE: Choreographies = [
  {
    // The first arrival comes up the open centre of the hall, clear of the monolith
    wait: { x: 0.3, y: 0, depth: 18 },
    feature: { x: -0.02, y: 0.05, yaw: 0.04 },
    recede: { x: -0.74, y: 0.3 },
  },
  {
    wait: { x: 0.7, y: 0.22 },
    feature: { x: 0.02, y: 0.04, yaw: -0.04 },
    recede: { x: -0.74, y: 0 },
  },
  {
    wait: { x: 0.7, y: -0.04 },
    feature: { x: -0.02, y: 0.03, yaw: 0.04 },
    recede: { x: -0.74, y: 0.3 },
  },
  {
    wait: { x: 0.7, y: 0.24 },
    feature: { x: 0.02, y: 0.04, yaw: -0.04 },
    recede: { x: -0.74, y: 0 },
  },
  {
    // Nearer than the others: the second monolith stands where they wait at this point
    wait: { x: 0.7, y: 0.04, depth: 12 },
    feature: { x: -0.02, y: 0.04, yaw: 0.04 },
    recede: { x: -0.74, y: 0.3 },
  },
]

/**
 * Portrait screens: one project at a time, centred and as wide as the screen
 * allows; the next waits small at the upper right and the previous recedes to
 * the upper left, both clear of the caption below. The finale lines them up
 * in two staggered columns either side of the threshold.
 */
const NARROW_STAGES: Stages = {
  emerge: { depth: 28, size: 0.04, yaw: -0.15, light: 0.2, opacity: 0 },
  wait: { depth: 14, size: 0.06, yaw: -0.1, light: 0.3, opacity: 0.85 },
  feature: { depth: 5.8, size: 0.5, yaw: 0, light: 1, opacity: 1 },
  recede: { depth: 12, size: 0.065, yaw: 0.1, light: 0.32, opacity: 0.9 },
  final: { light: 0.78, opacity: 1 },
}

const NARROW: Choreographies = [
  {
    wait: { x: 0.4, y: 0.68 },
    feature: { x: 0, y: 0.04, yaw: 0.03 },
    recede: { x: -0.48, y: 0.66 },
  },
  {
    wait: { x: 0.42, y: 0.7 },
    feature: { x: 0, y: 0.04, yaw: -0.03 },
    recede: { x: -0.46, y: 0.68 },
  },
  {
    wait: { x: 0.4, y: 0.68 },
    feature: { x: 0, y: 0.04, yaw: 0.03 },
    recede: { x: -0.48, y: 0.66 },
  },
  {
    wait: { x: 0.42, y: 0.7 },
    feature: { x: 0, y: 0.04, yaw: -0.03 },
    recede: { x: -0.46, y: 0.68 },
  },
  {
    wait: { x: 0.4, y: 0.68 },
    feature: { x: 0, y: 0.04, yaw: 0.03 },
    recede: { x: -0.48, y: 0.66 },
  },
]

/**
 * Each project's place in the finale, the gathering around the threshold,
 * laid out for however many projects there are. Landscape: an asymmetric
 * hang either side of the threshold, alternating sides, staggered in height
 * and depth, nearer and larger toward the edges; an odd one out hangs small
 * and far, by the threshold itself. Portrait: two staggered columns, one
 * project per row, alternating sides.
 */
function finalePose(index: number, count: number, narrow: boolean): Placement & Pick<Pose, 'depth' | 'size' | 'yaw'> {
  if (narrow) {
    const t = count > 1 ? index / (count - 1) : 0.5
    const left = index % 2 === 0
    return {
      x: left ? -0.47 : 0.47,
      // Kept clear of the floor, which would otherwise lift the lowest frame into the one above
      y: 0.74 - t * 1.2,
      depth: 8 - (index % 3) * 0.6,
      size: Math.min(0.115, 0.58 / count),
      yaw: left ? 0.2 : -0.2,
    }
  }
  const oddOneOut = count % 2 === 1 && index === count - 1
  if (oddOneOut) return { x: 0.16, y: 0.04, depth: 11, size: 0.095, yaw: -0.08 }
  const rows = Math.max(1, Math.floor(count / 2))
  const row = Math.floor(index / 2)
  const left = index % 2 === 0
  const t = rows > 1 ? row / (rows - 1) : 0
  const crowded = rows > 2
  // Alternate rows step inward, so a caption never sits right above the next frame on its side
  const stagger = crowded ? row % 2 : ([0, 1, 0.35, 0.8][row % 4] ?? 0)
  return {
    x: left ? -0.66 + stagger * (crowded ? 0.32 : 0.24) : 0.46 + stagger * (crowded ? 0.24 : 0.12),
    y: (left ? 0.54 : 0.6) - t * (crowded ? 1.2 : 0.64),
    depth: (left ? 9.5 : 10.5) - stagger * (crowded ? 0.5 : 1.6),
    size: crowded ? 0.108 : 0.185,
    yaw: left ? 0.22 : -0.22,
  }
}

/** Which choreography each project uses, by its place in the gallery. */
const REUSE = [0, 1, 2, 3, 4, 4, 2, 3]

/** Below this aspect ratio the portrait choreography is used. */
const NARROW_ASPECT = 0.9

/** Widest a frame may be, as a fraction of the visible width at its depth. */
const MAX_WIDTH = { wide: 0.5, narrow: 0.88 }

/** The widest any frame gets on screen, as a fraction of the screen's width. */
export const widestFrame = (aspect: number) => (aspect < NARROW_ASPECT ? MAX_WIDTH.narrow : MAX_WIDTH.wide)

/**
 * How much room a focused frame has to come forward: on portrait screens the
 * featured frame already spans nearly the full width, so focus there is
 * mostly light, rim and caption.
 */
export const focusRoom = (aspect: number) => (aspect < NARROW_ASPECT ? 0.2 : 1)

/** Height of the browser bar above the screenshot, as a fraction of the frame's width. */
export const BAR_HEIGHT = 0.026

/** Least clearance between a frame's lower edge and the floor. */
const FLOOR_CLEARANCE = 0.15

/** Where a frame is and how it looks at one scroll position. */
export interface FrameState {
  x: number
  y: number
  z: number
  /** Turn away from facing the camera (radians); the facing itself is added as the camera moves. */
  yaw: number
  /** World width; the height follows from the screenshot's proportions. */
  width: number
  light: number
  opacity: number
  /** Visibility of its caption. */
  label: number
  /** Whether the caption shows its category under the title. */
  detail: boolean
}

export interface FramePath {
  /** Width ÷ height of the screenshot area. */
  imageAspect: number
  /** Scroll position (viewport heights) of this project's moment. */
  moment: number
  /** The frame's state at scroll position `at` (in viewport heights), written into `state`. */
  sample(at: number, state: FrameState): FrameState
}

/**
 * Builds every project's path through the hall for the current screen shape.
 * Deterministic: the same scroll position always gives the same picture.
 */
export function composeGallery(
  projects: readonly Project[],
  path: TravelPath,
  aspect: number,
  /** Little height to spare (landscape phones): finale captions show titles only. */
  shortScreen: boolean,
): FramePath[] {
  const narrow = aspect < NARROW_ASPECT
  // More than two rows a side in the gathering
  const crowdedFinale = Math.floor(projects.length / 2) > 2
  const choreographies = narrow ? NARROW : WIDE
  const stages = narrow ? NARROW_STAGES : WIDE_STAGES
  // On squarer landscape screens the featured frame takes more of the width,
  // so its neighbours shrink to keep their distance
  const neighbourScale = narrow ? 1 : Math.min(1, aspect / 1.6)
  const maxWidth = narrow ? MAX_WIDTH.narrow : MAX_WIDTH.wide
  const { spacing, hold } = GALLERY_TIMING
  const lastIndex = projects.length - 1
  const settled = GALLERY_END - 0.12

  const camera = new Vector3()
  const target = new Vector3()
  const forward = new Vector3()
  const right = new Vector3()
  const up = new Vector3()
  const center = new Vector3()
  const worldUp = new Vector3(0, 1, 0)

  return projects.map((project, index) => {
    const imageAspect = project.preview ? project.preview.width / project.preview.height : 16 / 10
    // The first choreography is the opening arrival up the centre of the hall;
    // beyond the last, the others are reused in an order that suits where the
    // camera is by then (clear of the hall's structures at that depth)
    const moves = choreographies[REUSE[index] ?? 1 + ((index - 1) % (choreographies.length - 1))] ?? choreographies[0]
    const moment = momentAt(index)

    /** A pose, seen from where the camera is at scroll position `at`, as world-space channels. */
    const place = (at: number, pose: Pose): number[] => {
      path.at(at, camera, target)
      forward.subVectors(target, camera).normalize()
      right.crossVectors(forward, worldUp).normalize()
      up.crossVectors(right, forward)

      const halfHeight = visibleHalfHeight(pose.depth)
      const halfWidth = halfHeight * aspect
      center
        .copy(camera)
        .addScaledVector(forward, pose.depth)
        .addScaledVector(right, pose.x * halfWidth)
        .addScaledVector(up, pose.y * halfHeight)

      const width = Math.min(pose.size * 2 * halfHeight * imageAspect, maxWidth * 2 * halfWidth)
      // Hang clear of the floor rather than sinking into it
      const height = width / imageAspect + width * BAR_HEIGHT
      center.y = Math.max(center.y, FLOOR_Y + height / 2 + FLOOR_CLEARANCE)
      return [center.x, center.y, center.z, pose.yaw, width, pose.light, pose.opacity]
    }

    const keys: Array<[number, number[]]> = []
    const key = (at: number, pose: Pose) => {
      const channels = place(at, pose)
      keys.push([at, channels])
      return channels
    }

    // Arrive: out of the dark on the right, a pause at a distance, then forward into the moment
    const wait: Pose = { ...stages.wait, ...moves.wait }
    wait.size *= neighbourScale
    key(moment - 1.55 * spacing, { ...stages.emerge, x: moves.wait.x + 0.06, y: moves.wait.y })
    key(moment - spacing, wait)
    key(moment - spacing + 0.42, { ...wait, depth: wait.depth - 1.5, x: wait.x - 0.03 })
    const feature: Pose = { ...stages.feature, ...moves.feature }
    key(moment - hold, feature)
    // The camera keeps walking forward during the hold, so the frame backs off a
    // little less than that: a slow push-in rather than a frozen picture
    key(moment + hold, { ...feature, depth: feature.depth - 0.45 })

    // Step back to the left soon after the moment, making room for the next
    // project before it arrives; stay as the quiet neighbour through the next
    // moment, then dissolve where it stands, before the next project steps
    // back into the same side. The last project has nothing to make room for.
    const final: Pose = { ...stages.final, ...finalePose(index, projects.length, narrow) }
    if (index < lastIndex) {
      const recede: Pose = { ...stages.recede, ...moves.recede }
      recede.size *= neighbourScale
      key(moment + 0.62, recede)
      const lingerUntil = moment + spacing + hold - 0.05
      key(lingerUntil, { ...recede, depth: recede.depth + 1, x: recede.x - 0.03 })
      key(lingerUntil + 0.25, { ...recede, depth: recede.depth + 2.5, x: recede.x - 0.08, opacity: 0, light: 0.2 })

      // Unseen, it moves behind its place in the finale, then comes forward
      // out of the dark into it: the gathering assembles without frames
      // crossing each other or sliding in from the edges
      key(settled - 0.5, { ...final, depth: final.depth + 5, opacity: 0, light: 0.3 })
    }
    key(settled, final)

    // The finale: as the camera leaves for the threshold the gathering
    // recedes, each frame drifting out toward the edge of view and back into
    // the dark, one after another, until none is left
    key(DEPARTURE, final)
    const recede = DEPARTURE + 0.55 + index * 0.07
    key(recede, {
      ...final,
      x: final.x * 1.6 + Math.sign(final.x || 1) * 0.2,
      depth: final.depth + 1.2,
      opacity: 0,
      light: 0.15,
    })

    const keyframes = new Keyframes(
      keys.map(([at]) => at),
      keys.map(([, channels]) => channels),
    )
    const values: number[] = []

    return {
      imageAspect,
      moment,
      sample(at, state) {
        const [x = 0, y = 0, z = 0, yaw = 0, width = 0, light = 0, opacity = 0] = keyframes.evaluate(at, values)
        // Captions only while a project is held still enough to read, and in the finale
        const atMoment = 1 - MathUtils.smoothstep(Math.abs(at - moment), hold, hold + 0.22)
        const inFinale =
          0.85 * MathUtils.smoothstep(at, settled - 0.2, settled + 0.08) * (1 - MathUtils.smoothstep(at, DEPARTURE, DEPARTURE + 0.25))
        const label = Math.max(atMoment, inFinale)
        // Finales on portrait or short screens, or with many projects, are tight: titles only
        const detail = !(narrow || shortScreen || crowdedFinale) || atMoment >= inFinale
        return Object.assign(state, { x, y, z, yaw, width, light, opacity, label, detail })
      },
    }
  })
}
