/** Brand colours for WebGL materials. Mirrors the palette in tokens.css. */
export const PALETTE = {
  ink: '#0e0b0d',
  charcoal: '#1f1a1d',
  plum: '#3b2232',
  burgundy: '#5e1c2c',
  copper: '#d48b4f',
  violet: '#4a4170',
  paper: '#f3ebdd',
  red: '#f25c43',
  screen: '#161114',
  chrome: '#221b1f',
} as const

export type Tone = keyof typeof PALETTE
