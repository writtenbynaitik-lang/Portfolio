import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { MathUtils, Raycaster, Vector2, Vector3, type Camera, type Mesh } from 'three'
import { projects } from '@/content/projects'
import type { QualityTier } from '@/hooks/useQualityTier'
import { INTRO } from '@/motion/intro'
import { TRAVEL_VIEWPORTS } from '@/motion/travel'
import { createTravelPath } from '../camera'
import { RENDER_ORDER } from '../environment/layout'
import { voidFade } from '../environment/voidFade'
import type { IntroClockRef } from '../useIntroClock'
import type { TravelRef } from '../useScrollTravel'
import { BAR_HEIGHT, composeGallery, focusRoom, widestFrame, type FrameState } from './composition'
import { createFrameMaterial, setFrameSolid } from './frameMaterial'
import type { GalleryInteraction } from './interaction'
import { useProjectPreviews } from './previews'
import { ScreenGlow } from './ScreenGlow'
import { MAX_SCREENS, screenLight } from './screenLight'

interface GalleryProps {
  intro: IntroClockRef
  /** Phones and tablets skip the floor glow beneath the screens. */
  quality: QualityTier
  travel: TravelRef
  /** Caption elements in the page, one per project, positioned under their frames. */
  captions: RefObject<Array<HTMLElement | null>>
  interaction: GalleryInteraction
}

/** Seconds for a preview to fade in over its plain surface once it arrives. */
const ARRIVAL_FADE = 0.6

/** Seconds between GPU uploads while nothing needs them yet, so each lands in a quiet frame. */
const UPLOAD_INTERVAL = 0.35

/** Below this height (CSS px) finale captions show titles only. */
const SHORT_SCREEN = 560

/** Gap between a frame's lower edge and its caption, in CSS pixels. */
const CAPTION_OFFSET = 14

/** A focused project: how much nearer it comes (fraction of its distance), how much larger, how fast. */
const FOCUS = { approach: 0.06, scale: 0.03, rate: 7 }

/** Seconds a hovered project stays focused after the pointer slips off it. */
const HOVER_GRACE = 0.2

/** Idle float: fraction of the frame's height it rises and falls, and its sway in radians. */
const FLOAT = { lift: 0.012, sway: 0.015 }

/** How strongly a fully lit screen lights the floor around it. */
const SCREEN_GLOW = 1.1

/** A touch counts as a tap within this distance (CSS px) and time (ms). */
const TAP = { distance: 10, time: 600 }

// Scratch objects reused every frame
const frameState: FrameState = { x: 0, y: 0, z: 0, yaw: 0, width: 0, light: 0, opacity: 0, label: 0, detail: true }
const anchor = new Vector3()
const cameraOnPath = new Vector3()
const aimOnPath = new Vector3()
const toCamera = new Vector3()
const raycaster = new Raycaster()
const pointerNdc = new Vector2()

interface CaptionState {
  x: number
  y: number
  opacity: number
  detail: boolean
  /** Visibility of the "Visit website" link, 0–1. */
  action: number
  /** Rendered size in CSS pixels; measured when first needed, width −1 until then. */
  width: number
  height: number
}

const unplacedCaption = (): CaptionState => ({ x: -1, y: -1, opacity: -1, detail: true, action: -1, width: -1, height: 0 })

/**
 * The project gallery: website previews floating in the hall, each following
 * its authored path (./composition.ts) as the visitor scrolls. One frame loop
 * drives everything, in layers: the scroll pose, a gentle idle float, and the
 * focus of a project the visitor is pointing at, has tabbed to or tapped.
 * Because focus is layered on the scroll pose, never in place of it, hover and
 * scrolling can't fight, and scrolling back still retraces every step.
 */
export function Gallery({ intro, quality, travel, captions, interaction }: GalleryProps) {
  const aspect = useThree((state) => state.viewport.aspect)
  const shortScreen = useThree((state) => state.size.height < SHORT_SCREEN)
  const gl = useThree((state) => state.gl)
  const path = useMemo(() => createTravelPath(aspect), [aspect])
  const frames = useMemo(() => composeGallery(projects, path, aspect, shortScreen), [path, aspect, shortScreen])
  // Sharp at the largest a frame appears, in device pixels; stepped so small resizes don't reload
  const screenPixels = useThree((state) => state.size.width * state.viewport.dpr)
  const textureWidth = Math.ceil((screenPixels * widestFrame(aspect)) / 160) * 160
  const previews = useProjectPreviews(projects, textureWidth)
  const meshes = useRef<Array<Mesh | null>>([])
  const nextUploadAt = useRef(0)
  const captionsMeasuredAt = useRef(0)
  const captionStates = useRef<CaptionState[]>(projects.map(unplacedCaption))

  // Interaction, all read and eased in the frame loop below
  const focus = useRef<number[]>(projects.map(() => 0))
  const pickable = useRef<boolean[]>(projects.map(() => false))
  const pointer = useRef({ x: 0, y: 0, over: false, movedAt: 0 })
  const hovered = useRef(-1)
  const hoverLostAt = useRef(0)
  const tapped = useRef({ index: -1, at: 0 })
  const scrollMovedAt = useRef(0)
  const lastScrolled = useRef(0)
  const idleTime = useRef(0)

  const materials = useMemo(() => projects.map(() => createFrameMaterial()), [])
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])

  // Compile both variants up front (even for frames out of view), so neither the
  // first appearance nor the first switch to solid stalls mid-scroll
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    for (const solid of [true, false]) {
      materials.forEach((material) => setFrameSolid(material, solid))
      gl.compile(scene, camera)
    }
  }, [gl, scene, camera, materials])

  // Pointer, click and tap input. Listened for on the window, because the page
  // sits over the canvas; anything the page itself handles (links, buttons) is
  // left to it, so no layer can swallow a click or fake one.
  useEffect(() => {
    const pick = (clientX: number, clientY: number) =>
      pickUnder(clientX, clientY, camera, meshes.current, pickable.current, {
        width: window.innerWidth,
        height: window.innerHeight,
      })
    /** Opens a project's site through its caption link, which carries target and rel. */
    const open = (index: number) => {
      if (!projects[index]?.url) return
      captions.current[index]?.querySelector<HTMLAnchorElement>('a[href]')?.click()
    }
    const handledByPage = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest('a, button, input, select, textarea, label')

    let touch: { x: number; y: number; time: number } | null = null
    let lastTouchAt = 0

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      Object.assign(pointer.current, { x: event.clientX, y: event.clientY, over: true, movedAt: performance.now() })
    }
    const onPointerOut = (event: PointerEvent) => {
      // Left the window altogether
      if (!event.relatedTarget) pointer.current.over = false
    }
    const onBlur = () => {
      pointer.current.over = false
    }
    const onClick = (event: MouseEvent) => {
      // A tap also produces a click; taps are handled when the finger lifts
      if (performance.now() - lastTouchAt < 800 || handledByPage(event.target)) return
      open(pick(event.clientX, event.clientY))
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') touch = { x: event.clientX, y: event.clientY, time: performance.now() }
    }
    const onPointerCancel = () => {
      touch = null
    }
    // Touch: a first tap focuses a project (its title and link appear), a second opens it
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !touch) return
      const isTap =
        Math.hypot(event.clientX - touch.x, event.clientY - touch.y) < TAP.distance &&
        performance.now() - touch.time < TAP.time
      touch = null
      lastTouchAt = performance.now()
      if (!isTap || handledByPage(event.target)) return
      const index = pick(event.clientX, event.clientY)
      if (index >= 0 && index === tapped.current.index) open(index)
      else tapped.current = { index, at: travel.current.eased * TRAVEL_VIEWPORTS }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerout', onPointerOut, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, { passive: true })
    window.addEventListener('click', onClick)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('click', onClick)
      window.removeEventListener('blur', onBlur)
      document.body.style.removeProperty('cursor')
    }
  }, [camera, captions, travel])

  useFrame(({ camera, size, clock }, delta) => {
    const now = performance.now()
    const at = travel.current.eased * TRAVEL_VIEWPORTS
    // Nothing of the gallery shows until the opening copy has gone
    const presence = MathUtils.smoothstep(at, 0.2, 0.75)
    // GPU uploads wait until the intro has fully played, then go one at a time with
    // pauses between, unless the visitor is already on the way and needs them now
    const travelling = at > 0.02
    const introDone = intro.current.elapsed > INTRO.scene.dust.start + INTRO.scene.dust.duration
    let uploadBudget = (travelling || introDone) && clock.elapsedTime >= nextUploadAt.current ? 1 : 0
    const gutter = MathUtils.clamp(8.8 + size.width * 0.026, 20, 48)
    // Caption type is fluid, so widths change with the screen
    if (captionsMeasuredAt.current !== size.width) {
      captionStates.current.forEach((caption) => (caption.width = -1))
      captionsMeasuredAt.current = size.width
    }
    camera.updateMatrixWorld()

    // What's being interacted with. A project passing under a resting pointer
    // while the page scrolls doesn't take focus: only pointing at one does.
    const { scrolled, eased } = travel.current
    if (Math.abs(scrolled - lastScrolled.current) > 1e-5 || Math.abs(eased - scrolled) > 0.0015) scrollMovedAt.current = now
    lastScrolled.current = scrolled
    const { keyboard, caption: captionHover } = interaction
    if (pointer.current.over) {
      const hit = pickUnder(pointer.current.x, pointer.current.y, camera, meshes.current, pickable.current, size)
      if (hit === hovered.current) hoverLostAt.current = 0
      else if (hit >= 0 && pointer.current.movedAt >= scrollMovedAt.current) {
        hovered.current = hit
        hoverLostAt.current = 0
      } else if (hovered.current >= 0 && captionHover !== hovered.current) {
        hoverLostAt.current ||= now
        if (now - hoverLostAt.current > HOVER_GRACE * 1000) hovered.current = -1
      }
    } else hovered.current = -1
    // A tapped project lets go once the visitor scrolls on
    if (tapped.current.index >= 0 && Math.abs(at - tapped.current.at) > 0.3) tapped.current.index = -1

    const cursor = hovered.current >= 0 && projects[hovered.current]?.url ? 'pointer' : ''
    if (document.body.style.cursor !== cursor) document.body.style.cursor = cursor

    // Automatic motion holds still while the visitor engages with a project
    interaction.settle([hovered.current, keyboard, captionHover, tapped.current.index].some((index) => index >= 0), delta)
    idleTime.current += delta * (1 - interaction.engaged)

    // Frames face the camera as it walks its path (pointer parallax aside)
    path.at(eased * TRAVEL_VIEWPORTS, cameraOnPath, aimOnPath)

    frames.forEach((frame, index) => {
      const mesh = meshes.current[index]
      const material = materials[index]
      const caption = captionStates.current[index]
      const project = projects[index]
      if (!mesh || !material || !caption || !project) return
      const uniforms = material.uniforms

      const engagedHere = [hovered.current, keyboard, captionHover, tapped.current.index].includes(index)
      const focused = MathUtils.damp(focus.current[index] ?? 0, engagedHere ? 1 : 0, FOCUS.rate, delta)
      focus.current[index] = focused

      const pose = frame.sample(at, frameState)
      const forward = focused * focusRoom(aspect)
      const width = pose.width * (1 + FOCUS.scale * forward)
      const bar = width * BAR_HEIGHT
      const height = width / frame.imageAspect + bar
      const phase = index * 1.9
      mesh.position.set(pose.x, pose.y + Math.sin(idleTime.current * 0.55 + phase) * height * FLOAT.lift, pose.z)
      // Focus: nearer, and facing the viewer squarely
      mesh.position.add(toCamera.subVectors(cameraOnPath, mesh.position).multiplyScalar(FOCUS.approach * forward))
      const facing = Math.atan2(cameraOnPath.x - mesh.position.x, cameraOnPath.z - mesh.position.z)
      const sway = Math.sin(idleTime.current * 0.37 + phase) * FLOAT.sway
      mesh.rotation.set(0, facing + (pose.yaw + sway) * (1 - focused), 0)
      mesh.scale.set(width, height, 1)

      const light = MathUtils.lerp(pose.light, 1, focused)
      const opacity = pose.opacity * presence
      uniforms.uSize.value.set(width, height)
      uniforms.uBar.value = bar
      uniforms.uRadius.value = width * 0.006
      uniforms.uLight.value = light
      uniforms.uFocus.value = focused
      uniforms.uOpacity.value = opacity
      pickable.current[index] = opacity > 0.5
      // Solid when nothing about it is fading: fully present and wholly nearer than the void
      const reach = mesh.position.distanceTo(camera.position) + width * 0.6
      const solid = opacity > 0.999 && reach < voidFade.uVoidNear.value
      if (solid === material.transparent) setFrameSolid(material, solid)

      // Previews arrive in the background; the first sighting fades in rather than pops
      const slot = previews.current[index]
      if (slot?.texture && !slot.uploaded && uploadBudget > 0) {
        gl.initTexture(slot.texture)
        slot.uploaded = true
        uploadBudget--
        nextUploadAt.current = clock.elapsedTime + (travelling ? 0 : UPLOAD_INTERVAL)
        uniforms.uMap.value = slot.texture
      }
      if (slot?.uploaded && uniforms.uMapReady.value < 1) {
        uniforms.uMapReady.value = Math.min(uniforms.uMapReady.value + delta / ARRIVAL_FADE, 1)
      }

      // The screen lights the floor around it, in the website's own colour
      if (index < MAX_SCREENS) {
        const colour = screenLight.uScreenColor.value[index]
        if (colour && slot) colour.copy(slot.tint).multiplyScalar(light * light * opacity * uniforms.uMapReady.value * SCREEN_GLOW)
        screenLight.uScreenPosition.value[index]?.copy(mesh.position)
        screenLight.uScreenNormal.value[index]?.set(Math.sin(mesh.rotation.y), 0, Math.cos(mesh.rotation.y))
        screenLight.uScreenReach.value[index] = width * 0.9
      }

      const element = captions.current[index]
      if (element) {
        const detail = pose.detail || focused > 0.5
        if (detail !== caption.detail) {
          element.dataset.detail = String(detail)
          caption.detail = detail
          caption.width = -1
        }
        // Focus reveals the caption (and its link) wherever the frame is
        const shown = Math.max(pose.label * presence, opacity > 0.3 ? focused : 0)
        placeCaption(element, caption, mesh, camera, size, gutter, shown)
        // A readable caption is part of its project's hover area (so the pointer can
        // travel from the frame to its link); a faded one never catches the pointer
        const visible = String(shown > 0.5)
        if (element.dataset.visible !== visible) element.dataset.visible = visible
        // Reveals "Visit website", or for a project without a live site, the note saying so
        const action = focused
        if (Math.abs(action - caption.action) > 0.01 || (action === 0 && caption.action !== 0)) {
          element.style.setProperty('--action', action.toFixed(2))
          element.dataset.active = String(action > 0.5)
          caption.action = action
        }
      }
    })
  })

  return (
    <>
      {projects.map((project, index) => (
        <mesh
          key={project.id}
          ref={(mesh) => {
            meshes.current[index] = mesh
          }}
          material={materials[index]}
          renderOrder={RENDER_ORDER.architecture}
        >
          <planeGeometry />
        </mesh>
      ))}
      {quality === 'high' && <ScreenGlow count={projects.length} />}
    </>
  )
}

/** The project under a point on screen, if it's present enough to interact with; otherwise −1. */
function pickUnder(
  clientX: number,
  clientY: number,
  camera: Camera,
  meshes: Array<Mesh | null>,
  pickable: boolean[],
  size: { width: number; height: number },
) {
  pointerNdc.set((clientX / size.width) * 2 - 1, -(clientY / size.height) * 2 + 1)
  raycaster.setFromCamera(pointerNdc, camera)
  const targets = meshes.filter((mesh, index): mesh is Mesh => !!mesh && !!pickable[index])
  const hit = raycaster.intersectObjects(targets, false)[0]
  return hit ? meshes.indexOf(hit.object as Mesh) : -1
}

/**
 * Pins a caption under its frame: aligned with the lower-left corner, below
 * whichever lower corner is nearer the bottom of the screen (frames are often
 * turned), and kept inside the screen's margins.
 */
function placeCaption(
  label: HTMLElement,
  caption: CaptionState,
  mesh: Mesh,
  camera: Camera,
  size: { width: number; height: number },
  gutter: number,
  visibility: number,
) {
  mesh.updateMatrixWorld()
  anchor.set(0.5, -0.5, 0).applyMatrix4(mesh.matrixWorld).project(camera)
  const rightEdge = anchor.y
  anchor.set(-0.5, -0.5, 0).applyMatrix4(mesh.matrixWorld).project(camera)
  // Behind the camera, the projection is meaningless
  const opacity = anchor.z < 1 ? visibility : 0
  // Measured as it first shows, and again after a resize or a change of detail
  if (opacity > 0.005 && caption.width < 0) {
    caption.width = label.offsetWidth
    caption.height = label.offsetHeight
  }
  const x = MathUtils.clamp(((anchor.x + 1) / 2) * size.width, gutter, size.width - gutter - caption.width)
  const lowest = Math.min(anchor.y, rightEdge)
  const y = Math.min(((1 - lowest) / 2) * size.height + CAPTION_OFFSET, size.height - gutter / 2 - caption.height)

  // Writes only on change: transform and opacity, which need no layout
  if (Math.abs(opacity - caption.opacity) > 0.005) {
    label.style.opacity = opacity.toFixed(3)
    caption.opacity = opacity
  }
  if (opacity > 0.005 && (Math.abs(x - caption.x) > 0.25 || Math.abs(y - caption.y) > 0.25)) {
    label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    caption.x = x
    caption.y = y
  }
}
