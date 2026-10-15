import { MathUtils, type Vector3Tuple } from 'three'
import { easeInOutCubic } from '@/motion/easing'
import { ARRIVAL, DEPARTURE, GALLERY_END } from '@/motion/travel'
import { PALETTE } from '@/styles/palette'
import { visibleHalfExtent } from '../camera'

/*
 * The hall, in world units. The camera's eye line is y = 0 and it starts at
 * z = 6 looking down −z. Composed at 16:10: the prominent monolith off-centre
 * right, open space around the headline, smaller structures stepping back
 * into the dark, and a colonnade at the left edge that continues out of view.
 */

export const FLOOR_Y = -2.4

/**
 * Draw order. Faded surfaces are transparent, so order matters: the floor
 * first (outlines standing on it are clipped by it), the light pooled on it,
 * then the solid forms, then lines that must be hidden where they pass behind
 * those forms.
 */
export const RENDER_ORDER = { floor: -1, glow: -0.5, architecture: 0, outlines: 1, orbit: 2, dust: 3 } as const

/**
 * Lateral spread of the hall relative to the 16:10 composition: narrower on
 * portrait screens so structures stay in frame, a little wider on ultrawide.
 */
export function hallSpread(aspect: number) {
  return MathUtils.clamp(aspect / 1.6, 0.55, 1.2)
}

const MONOLITH = { z: -9, xFraction: 0.8, width: 1.7, thickness: 1.1, height: 15, yaw: 0.3 }

/**
 * The prominent form. Placed relative to the visible frame so it holds its
 * spot at any aspect ratio; on portrait screens it moves out to the edge,
 * partly cropped, so it doesn't crowd the headline.
 */
export function monolithLayout(aspect: number) {
  const { halfWidth } = visibleHalfExtent(MONOLITH.z, aspect)
  const scale = MathUtils.clamp(aspect / 1.6, 0.5, 1)
  const width = MONOLITH.width * scale
  const thickness = MONOLITH.thickness * scale
  const xFraction = aspect < 1 ? 0.92 : MONOLITH.xFraction
  return {
    position: [halfWidth * xFraction, FLOOR_Y + MONOLITH.height / 2, MONOLITH.z] as Vector3Tuple,
    size: [width, MONOLITH.height, thickness] as Vector3Tuple,
    yaw: MONOLITH.yaw,
    /** Radius of its footprint, so things can circle it without touching. */
    footprint: Math.hypot(width, thickness) / 2,
  }
}

interface SlabSpec {
  x: number
  z: number
  size: Vector3Tuple
  yaw: number
}

/**
 * A second, shorter monolith deeper on the right under its own downlight. It
 * takes over once the first has slid out of view during the travel.
 */
export const SECOND_MONOLITH: SlabSpec = { x: 10, z: -22, size: [1.3, 9, 1.1], yaw: -0.3 }

/** Smaller structures at other depths. x is multiplied by hallSpread. */
export const SLABS: readonly SlabSpec[] = [
  SECOND_MONOLITH,
  // A long, low plinth at the left edge
  { x: -12, z: -20, size: [6.5, 0.8, 2.2], yaw: 0.2 },
]

/**
 * The far end of the hall: two slabs either side of a narrow slit of light,
 * hidden in the dark at first and revealed in the second half of the travel.
 * x and the gap are multiplied by hallSpread.
 */
export const THRESHOLD_SLIT = {
  x: -2.6,
  z: -30,
  gap: 0.4,
  height: 11,
  slab: [3.2, 12, 0.9] as Vector3Tuple,
}

/** A colonnade along the left edge, receding into the dark. x is multiplied by hallSpread. */
export const PILLARS = {
  size: [0.55, 18, 0.55] as Vector3Tuple,
  positions: [
    [-11.5, -13],
    [-12.5, -22],
    [-13.5, -31],
  ] as const,
}

/** Warm white of the hall's lamps: tungsten rather than daylight, as in a darkened gallery. */
const TUNGSTEN = '#f4e3cc'

/**
 * Soft light sources: warm white lamps against deep shadow, a plum-tinted
 * ambient so the dark keeps some colour, and copper as a low, warm fill.
 * Intensities are tuned by eye (no tone mapping).
 */
export const LIGHTING = {
  ambient: { sky: '#43303f', ground: PALETTE.ink, intensity: 0.62 },
  /**
   * Key light high above the monolith and close to its face, so the light
   * grazes down it: bright at the top, falling away toward the floor.
   * Offset is relative to the monolith's base.
   */
  key: { color: TUNGSTEN, intensity: 150, offset: [1.4, 13, 2.6] as Vector3Tuple, angle: 0.38 },
  /**
   * A low copper ember on the left, grazing the colonnade and plinth. High
   * enough above the floor that its pool stays broad and soft. x is
   * multiplied by hallSpread.
   */
  ember: { color: PALETTE.copper, intensity: 16, position: [-9.5, FLOOR_Y + 4.5, -12] as Vector3Tuple },
  /** Gallery downlight on the second monolith. Offset is relative to its base. */
  downlight: { color: TUNGSTEN, intensity: 220, offset: [-1.6, 12, 3] as Vector3Tuple, angle: 0.34 },
  /** Gallery downlight in front of the threshold. x is multiplied by hallSpread. */
  threshold: {
    color: TUNGSTEN,
    intensity: 380,
    position: [-2.6, 11, -25] as Vector3Tuple,
    target: [-2.6, FLOOR_Y, -27.5] as Vector3Tuple,
    angle: 0.42,
  },
} as const

/**
 * The finale's passage, in viewport heights of scroll: the threshold's slabs
 * part and its light gives way as the camera approaches; the camera is in the
 * opening at `through`.
 */
export const PASSAGE = {
  /** The slabs begin to part, and finish. */
  opening: [DEPARTURE + 0.4, DEPARTURE + 1.2] as const,
  /** The camera passes through the opening. */
  through: DEPARTURE + 1.45,
  /** How wide the opening becomes (multiplied by hallSpread, at least wide enough to pass through). */
  openGap: 2.6,
}

/**
 * The contact room beyond the threshold: one monumental wall with a single
 * slit of light cut through it, red at its edges, white-hot at its core,
 * throwing a long beam across the floor toward the viewer. Out of sight
 * (beyond the void) until the camera comes through the threshold.
 */
export const CONTACT_ROOM = {
  wallZ: -52,
  wall: [90, 34] as const,
  slit: { width: 0.34, height: 10.5 },
  /** Length of the beam of light thrown across the floor. */
  beam: 15,
}

/**
 * Where the camera comes to rest in the contact room, and where the slit
 * stands and its size: on landscape screens, full height to the right of the
 * headline; on portrait ones, a short, fine shaft low in the screen, seen
 * from above with its beam spreading toward the viewer, while the type holds
 * the screen above it.
 */
export function contactLayout(aspect: number) {
  const spread = hallSpread(aspect)
  if (aspect < 0.9) {
    // Raised and set back, looking almost level: a short, fine shaft stands
    // in the bottom quarter of the screen (about 75%–95% of its height),
    // below even a long column of type
    return {
      slitX: 0.4,
      slitWidth: 0.2,
      slitHeight: 2.6,
      camera: { position: [0, FLOOR_Y + 6.6, -36.7] as Vector3Tuple, target: [0.25, FLOOR_Y + 5.8, -52] as Vector3Tuple },
    }
  }
  return {
    slitX: 3.7 * spread,
    slitWidth: CONTACT_ROOM.slit.width,
    slitHeight: CONTACT_ROOM.slit.height,
    camera: { position: [-1.2 * spread, -0.3, -39.5] as Vector3Tuple, target: [0.6 * spread, -0.45, -52] as Vector3Tuple },
  }
}

/**
 * How far the lights move with the pointer, in world units, at its furthest
 * from the centre of the screen (see usePointerDrift). The key light and the
 * ember shift their sources, so their pools and the light on the monolith
 * slide a little; the gallery downlights shift their aim. Small enough to
 * read as the room being alive, never as a light following the cursor.
 */
export const LIGHT_DRIFT = {
  key: [0.9, 0.5] as const,
  ember: [0.7, 0.3] as const,
  aim: 0.35,
  /** The contact room's glow on the wall, sideways. */
  wall: 0.35,
}

/**
 * How the hall's own lights respond to the journey (`at`, in viewport heights
 * scrolled). The opening is lit as designed; once the gallery begins the
 * coloured accents ease down so the websites carry the colour, and the
 * threshold light comes up again for the gathering in front of it. In the
 * finale the hall goes quiet: its lights fall away as the camera nears the
 * threshold, and the contact room's light comes up as it passes through.
 */
export function journeyLighting(at: number) {
  const gallery = MathUtils.smoothstep(at, 0.4, 1.3)
  const gathering = MathUtils.smoothstep(at, GALLERY_END - 0.6, GALLERY_END)
  // The hall dims as the camera heads for the threshold
  const quiet = 1 - MathUtils.smoothstep(at, DEPARTURE, PASSAGE.through)
  return {
    /** Key light and red ember. */
    accent: (1 - 0.55 * gallery) * quiet,
    downlight: (1 - 0.3 * gallery) * quiet,
    threshold: (1 - 0.65 * gallery * (1 - gathering)) * (1 - MathUtils.smoothstep(at, PASSAGE.opening[1], PASSAGE.through + 0.2)),
    /** Dust and other small motion in the hall. */
    activity: quiet,
    /** The threshold's slit of light, which splits and dissolves as the slabs begin to part. */
    slit: 1 - MathUtils.smoothstep(at, PASSAGE.opening[0], PASSAGE.opening[0] + 0.45),
    /** How far the threshold has opened (0–1). */
    opening: easeInOutCubic(MathUtils.smoothstep(at, PASSAGE.opening[0], PASSAGE.opening[1])),
    /** The contact room's light. */
    contact: MathUtils.smoothstep(at, PASSAGE.opening[0] + 0.2, ARRIVAL - 0.15),
  }
}
