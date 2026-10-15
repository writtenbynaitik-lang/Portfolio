import { useEffect, useRef } from 'react'
import { CanvasTexture, Color, SRGBColorSpace, Texture } from 'three'
import type { Project, ProjectPreview } from '@/content/projects'
import { PALETTE } from '@/styles/palette'

export interface PreviewSlot {
  /** Null until the image (or its placeholder) is ready. */
  texture: Texture | null
  /** Sent to the GPU yet. The gallery does this itself, one per frame, when it won't be noticed. */
  uploaded: boolean
  /** The image's average colour (linear): the light the screen casts into the hall. */
  tint: Color
}

/** Light cast by a screen without an image yet, or by a placeholder: a dim, neutral glow. */
const NEUTRAL_TINT = new Color('#3a3b42')

/**
 * Loads every project's preview in gallery order, one at a time, so the first
 * project is ready first and the network is never flooded. Each is the
 * smallest size at least `pixelWidth` wide: larger would cost download, GPU
 * memory and upload time for detail the screen can't show. Images are fetched
 * at low priority and decoded off the main thread. A project without a
 * screenshot, or whose screenshot can't be loaded, gets a plain placeholder
 * surface labelled with its title instead.
 */
export function useProjectPreviews(projects: readonly Project[], pixelWidth: number) {
  const slots = useRef<PreviewSlot[]>([])

  useEffect(() => {
    const controller = new AbortController()
    const created: Texture[] = []
    slots.current = projects.map(() => ({ texture: null, uploaded: false, tint: NEUTRAL_TINT }))

    const load = async () => {
      for (const [index, project] of projects.entries()) {
        let texture: Texture
        try {
          texture = project.preview
            ? await loadScreenshot(pickSource(project.preview, pixelWidth), controller.signal)
            : await createPlaceholder(project.title, 'Preview coming soon')
        } catch (error) {
          if (controller.signal.aborted) return
          console.warn(`Preview for "${project.title}" could not be loaded; showing a placeholder.`, error)
          texture = await createPlaceholder(project.title, 'Preview unavailable')
        }
        if (controller.signal.aborted) {
          disposeTexture(texture)
          return
        }
        created.push(texture)
        slots.current[index] = { texture, uploaded: false, tint: averageColour(texture) ?? NEUTRAL_TINT }
      }
    }
    void load()

    return () => {
      controller.abort()
      created.forEach(disposeTexture)
    }
  }, [projects, pixelWidth])

  return slots
}

function pickSource(preview: ProjectPreview, pixelWidth: number) {
  const fitting = preview.sources.find((source) => source.width >= pixelWidth)
  return (fitting ?? preview.sources.at(-1))?.src ?? ''
}

async function loadScreenshot(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, priority: 'low' })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const bitmap = await createImageBitmap(await response.blob())
  const texture = new Texture(bitmap)
  return prepare(texture)
}

/**
 * Average colour of an image, found by drawing it a few pixels across. Its
 * brightness is evened out part of the way, so dark sites still light the
 * floor a little and bright ones don't flood it.
 */
function averageColour(texture: Texture) {
  const image: unknown = texture.image
  if (!(image instanceof ImageBitmap || image instanceof HTMLCanvasElement)) return null
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 10
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < data.length; i += 4) {
    r += data[i] ?? 0
    g += data[i + 1] ?? 0
    b += data[i + 2] ?? 0
  }
  const pixels = data.length / 4
  const colour = new Color().setRGB(r / pixels / 255, g / pixels / 255, b / pixels / 255, SRGBColorSpace)
  const luminance = 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b
  return luminance > 0 ? colour.multiplyScalar(Math.sqrt(0.18 / luminance)) : null
}

/** Placeholder surface: the project's title and a short note, in the portfolio's own type. */
async function createPlaceholder(title: string, note: string) {
  const width = 1024
  const height = 640
  await Promise.all([
    document.fonts.load('condensed 860 150px "Archivo Variable"'),
    document.fonts.load('500 20px "Geist Variable"'),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas unavailable')

  const glow = context.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, width * 0.6)
  glow.addColorStop(0, '#1d1b18')
  glow.addColorStop(1, '#100f0d')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)

  // Faint drafting grid, so it reads as a surface waiting for content
  context.strokeStyle = 'rgb(243 235 221 / 0.035)'
  context.lineWidth = 1
  for (let x = 64; x < width; x += 64) {
    context.beginPath()
    context.moveTo(x + 0.5, 0)
    context.lineTo(x + 0.5, height)
    context.stroke()
  }
  for (let y = 64; y < height; y += 64) {
    context.beginPath()
    context.moveTo(0, y + 0.5)
    context.lineTo(width, y + 0.5)
    context.stroke()
  }

  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = PALETTE.paper
  context.font = 'condensed 860 150px "Archivo Variable", sans-serif'
  context.fillText(title.toUpperCase(), width / 2, height * 0.54, width * 0.84)

  context.fillStyle = PALETTE.red
  context.fillRect(width / 2 - 24, height * 0.62, 48, 2)

  context.fillStyle = 'rgb(243 235 221 / 0.64)'
  context.font = '500 20px "Geist Variable", sans-serif'
  context.letterSpacing = '4px'
  context.fillText(note.toUpperCase(), width / 2 + 2, height * 0.71)

  return prepare(new CanvasTexture(canvas))
}

/** Shared settings: sRGB colour, stored top row first (flipped in the shader), mipmapped. */
function prepare(texture: Texture) {
  texture.colorSpace = SRGBColorSpace
  texture.flipY = false
  // Frames are often seen at an angle; this keeps them sharp there
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function disposeTexture(texture: Texture) {
  texture.dispose()
  const image: unknown = texture.image
  if (image instanceof ImageBitmap) image.close()
}
