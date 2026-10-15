/** Indexed read; every index used here is in range by construction. */
const read = (array: Float64Array, index: number) => array[index] ?? 0

/**
 * Smooth interpolation through authored keyframes, for motion that has to be
 * exactly reversible: the result depends only on `t`, never on time or on the
 * previous frame.
 *
 * Each channel is a monotone cubic (Fritsch–Butland): it passes through every
 * keyframe, has continuous velocity, and never overshoots between two values,
 * so a frame easing into place doesn't bounce past it. Velocity is zero at the
 * first and last keyframes, so motion eases out of its start and into its end.
 */
export class Keyframes {
  private readonly times: Float64Array
  /** Channel values, keyframe after keyframe. */
  private readonly values: Float64Array
  private readonly tangents: Float64Array
  private readonly channels: number

  /** `values[i]` holds every channel at `times[i]`. Times must increase. */
  constructor(times: readonly number[], values: readonly (readonly number[])[]) {
    const channels = values[0]?.length ?? 0
    this.channels = channels
    this.times = Float64Array.from(times)
    this.values = Float64Array.from(values.flat())
    this.tangents = new Float64Array(this.values.length)

    for (let i = 1; i < times.length - 1; i++) {
      const before = read(this.times, i) - read(this.times, i - 1)
      const after = read(this.times, i + 1) - read(this.times, i)
      for (let channel = 0; channel < channels; channel++) {
        const value = (key: number) => read(this.values, key * channels + channel)
        const slopeBefore = (value(i) - value(i - 1)) / before
        const slopeAfter = (value(i + 1) - value(i)) / after
        // Turning points stay put; elsewhere a weighted harmonic mean keeps it monotone
        if (slopeBefore * slopeAfter <= 0) continue
        this.tangents[i * channels + channel] =
          (3 * (before + after)) / ((2 * after + before) / slopeBefore + (after + 2 * before) / slopeAfter)
      }
    }
  }

  /** Every channel at `t`, written into `out`. Holds the end values outside the keyframes. */
  evaluate(t: number, out: number[]): number[] {
    const { times, values, tangents, channels } = this
    const last = times.length - 1
    if (last < 0) return out

    let i = 0
    if (t >= read(times, last)) i = last
    else if (t > read(times, 0)) while (t > read(times, i + 1)) i++
    if (i === last || t <= read(times, 0)) {
      for (let channel = 0; channel < channels; channel++) out[channel] = read(values, i * channels + channel)
      return out
    }

    const span = read(times, i + 1) - read(times, i)
    const s = (t - read(times, i)) / span
    const s2 = s * s
    const s3 = s2 * s
    const h00 = 2 * s3 - 3 * s2 + 1
    const h10 = s3 - 2 * s2 + s
    const h01 = -2 * s3 + 3 * s2
    const h11 = s3 - s2

    const from = i * channels
    const to = from + channels
    for (let channel = 0; channel < channels; channel++) {
      out[channel] =
        h00 * read(values, from + channel) +
        h10 * span * read(tangents, from + channel) +
        h01 * read(values, to + channel) +
        h11 * span * read(tangents, to + channel)
    }
    return out
  }
}
