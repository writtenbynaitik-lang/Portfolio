export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2

/**
 * Linear 0→1 progress through one segment of a timeline. `elapsed` may be
 * Infinity (reduced motion), which resolves straight to the end state.
 */
export function segment(elapsed: number, start: number, duration: number) {
  return Math.min(Math.max((elapsed - start) / duration, 0), 1)
}
