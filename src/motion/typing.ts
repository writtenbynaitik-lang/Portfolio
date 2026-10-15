/**
 * Rhythm of the opening headline's typing, in seconds. Close to a quick,
 * confident typist: about 19 characters a second, slightly uneven, pausing
 * briefly between words and a little longer before a new line.
 */
export const TYPING = {
  /** Average time per character. */
  character: 0.052,
  /** How uneven the keystrokes are, as a fraction of `character`. */
  unevenness: 0.45,
  /** Extra pause after a space. */
  word: 0.04,
  /** Extra pause before a new line begins. */
  line: 0.16,
  /** How long the caret blinks at the start before the first keystroke. */
  lead: 0.45,
} as const

export interface Keystroke {
  /** When the character appears, from the start of the typing. */
  at: number
  /** How long until the next character appears (the caret waits after this one). */
  hold: number
}

/**
 * When each character appears. `lines` are the headline's lines as plain
 * text. Deterministic: the same headline always types the same way.
 */
export function typeOut(lines: readonly string[]) {
  const keystrokes: Keystroke[][] = []
  let time = 0
  let count = 0
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) time += TYPING.line
    const row: Keystroke[] = []
    for (const character of line) {
      // A fixed pseudo-random spread around the average pace
      const noise = fract(Math.sin(++count * 12.9898) * 43758.5453) - 0.5
      time += TYPING.character * (1 + noise * TYPING.unevenness)
      row.push({ at: time, hold: 0 })
      if (character === ' ') time += TYPING.word
    }
    keystrokes.push(row)
  })
  const flat = keystrokes.flat()
  flat.forEach((keystroke, index) => {
    keystroke.hold = (flat[index + 1]?.at ?? keystroke.at) - keystroke.at
  })
  return { keystrokes, end: time }
}

const fract = (value: number) => value - Math.floor(value)
