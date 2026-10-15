import { Color, Vector3 } from 'three'

/*
 * Each lit screen's light, as uniforms shared by the gallery (which writes
 * them every frame) and the pools of light on the floor (see ScreenGlow).
 */

/** Screens that can cast light. */
export const MAX_SCREENS = 8

/** Written by the gallery each frame, read by the pools. */
export const screenLight = {
  uScreenPosition: { value: Array.from({ length: MAX_SCREENS }, () => new Vector3()) },
  uScreenNormal: { value: Array.from({ length: MAX_SCREENS }, () => new Vector3(0, 0, 1)) },
  /** Colour × intensity; black for a screen that's off or out of view. */
  uScreenColor: { value: Array.from({ length: MAX_SCREENS }, () => new Color(0, 0, 0)) },
  /** The screen's width: sets the size of its pool. */
  uScreenReach: { value: new Array<number>(MAX_SCREENS).fill(1) },
}
