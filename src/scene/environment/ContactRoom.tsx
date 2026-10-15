import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, CustomBlending, OneFactor, ShaderMaterial, Vector2, ZeroFactor, type Group } from 'three'
import { TRAVEL_VIEWPORTS } from '@/motion/travel'
import { PALETTE } from '@/styles/palette'
import type { PointerDriftRef } from '../usePointerDrift'
import type { TravelRef } from '../useScrollTravel'
import { CONTACT_ROOM, contactLayout, FLOOR_Y, journeyLighting, LIGHT_DRIFT, PASSAGE, RENDER_ORDER } from './layout'
import { VOID_FADE_GLSL, voidFade } from './voidFade'

/*
 * The contact room, beyond the threshold: one monumental wall with a single
 * slit of light cut through it. The slit is white-hot at its core and red at
 * its edges (the portfolio's one accent colour, here as light); it glows
 * faintly on the wall around it and throws a long beam across the floor
 * toward the viewer. Nothing else: the room is mostly dark, negative space
 * for the type.
 *
 * Everything here fades into the void like the rest of the hall, so the room
 * is out of sight until the camera nears the threshold, and its light comes
 * up as the camera passes through (see journeyLighting). Until the camera
 * starts toward it, it isn't drawn at all. Its light is drawn, not cast: a
 * real light would add its cost to every lit surface in the hall, all the way
 * through the gallery, and the wall is shaded by its own simple shader rather
 * than the hall's lighting (measured: a lit wall this size cost a sixth of
 * the frame rate on low-end graphics).
 */

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

/** Shared by the light's three parts: colours, brightness, and the void fade. */
const lightHeader = /* glsl */ `
${VOID_FADE_GLSL}
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uLevel;
varying vec2 vUv;
varying vec3 vWorld;
`

/** The slit itself: white-hot along its centre, red toward its edges, crisp at the sides. */
const slitFragment = /* glsl */ `
${lightHeader}
void main() {
  float across = abs(vUv.x - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.0, 0.75, across);
  vec3 color = mix(uEdge, uCore, core * core) * (1.0 + core);
  // Soft only where it meets the floor and toward the top, where the wall dissolves
  float ends = smoothstep(0.0, 0.015, vUv.y);
  float alpha = (1.0 - smoothstep(0.9, 1.0, across)) * ends * voidVisibility(vWorld) * uLevel;
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(color * alpha, 0.0);
  #include <colorspace_fragment>
}
`

/** A narrow bloom hugging the slit: falls away within a short distance, so it never forms a shape of its own. */
const haloFragment = /* glsl */ `
${lightHeader}
void main() {
  vec2 p = vUv - vec2(0.5, 0.45);
  float glow = exp(-abs(p.x) * 26.0) * 0.7 + exp(-abs(p.x) * 9.0) * 0.12;
  glow *= 1.0 - smoothstep(0.32, 0.5, abs(p.y));
  float strength = glow * voidVisibility(vWorld) * uLevel * 0.4;
  if (strength < 0.002) discard;
  gl_FragColor = vec4(uEdge * strength, 0.0);
  #include <colorspace_fragment>
}
`

/**
 * The beam across the floor: narrow and bright where it leaves the slit,
 * widening and fading toward the viewer, with a paler core.
 */
const beamFragment = /* glsl */ `
${lightHeader}
void main() {
  // vUv.y runs from the wall (1) toward the viewer (0)
  float fromWall = 1.0 - vUv.y;
  float halfWidth = mix(0.03, 0.38, pow(fromWall, 0.85));
  float across = abs(vUv.x - 0.5) / halfWidth;
  float shape = exp(-across * across * 2.2);
  float reach = pow(1.0 - fromWall, 1.6);
  vec3 color = mix(uEdge, uCore, exp(-across * across * 9.0) * reach * 0.6);
  float strength = shape * reach * voidVisibility(vWorld) * uLevel * 0.55;
  if (strength < 0.002) discard;
  gl_FragColor = vec4(color * strength, 0.0);
  #include <colorspace_fragment>
}
`

/**
 * The wall: a dark, warm tone, with the slit's red light falling across it,
 * strongest beside the slit and low down, fading with distance and toward
 * the top. Dithered, since the dark gradient would otherwise band.
 */
const wallFragment = /* glsl */ `
${VOID_FADE_GLSL}
uniform vec3 uBase;
uniform vec3 uEdge;
uniform vec3 uCopper;
uniform vec3 uDepth;
uniform vec2 uSlit;
uniform float uLevel;
uniform float uDrift;
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  // The glow's centre sways a little with the pointer; the slit itself stays put
  float across = abs(vWorld.x - uSlit.x - uDrift);
  float height = vWorld.y - ${FLOOR_Y.toFixed(2)};
  // Coral close to the slit, cooling to copper as it spreads across the wall
  float near = exp(-across * 3.2);
  float far = exp(-across * 0.9);
  float fall = 1.0 - smoothstep(uSlit.y * 0.35, uSlit.y * 1.25, height);
  vec3 glow = uEdge * near * 0.65 + uCopper * far * 0.28;
  // A trace of violet depth high on the wall, where it dissolves into the dark
  vec3 base = mix(uBase, uDepth, smoothstep(1.0, 9.0, height) * 0.5);
  vec3 color = base + glow * fall * uLevel * 0.26;
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  color += dither / 255.0;
  gl_FragColor = vec4(color, voidVisibility(vWorld));
  #include <colorspace_fragment>
}
`

/** Brightness of the room's light, shared by its materials and set each frame, and the glow's sway. */
const level = { slit: { value: 0 }, room: { value: 0 } }
const sway = { value: 0 }

function createLightMaterial(fragmentShader: string, brightness: { value: number }) {
  return new ShaderMaterial({
    uniforms: {
      ...voidFade,
      uCore: { value: new Color(PALETTE.paper) },
      uEdge: { value: new Color(PALETTE.red) },
      uLevel: brightness,
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    // Light is added to what's beneath; the canvas's alpha is left alone, so a
    // glow never makes the softly faded wall behind it opaque (which would
    // cut a darker shape out of it)
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
    depthWrite: false,
  })
}

interface ContactRoomProps {
  travel: TravelRef
  drift: PointerDriftRef
  aspect: number
}

export function ContactRoom({ travel, drift, aspect }: ContactRoomProps) {
  const { slitX, slitWidth, slitHeight } = contactLayout(aspect)
  const room = useRef<Group>(null)
  const materials = useMemo(
    () => ({
      wall: new ShaderMaterial({
        uniforms: {
          ...voidFade,
          uBase: { value: new Color('#140d11') },
          uEdge: { value: new Color(PALETTE.red) },
          uCopper: { value: new Color(PALETTE.copper) },
          uDepth: { value: new Color('#1a1626') },
          uSlit: { value: new Vector2(slitX, slitHeight) },
          uLevel: level.room,
          uDrift: sway,
        },
        vertexShader,
        fragmentShader: wallFragment,
        transparent: true,
      }),
      slit: createLightMaterial(slitFragment, level.slit),
      halo: createLightMaterial(haloFragment, level.room),
      beam: createLightMaterial(beamFragment, level.room),
    }),
    [slitX, slitHeight],
  )
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])

  useFrame(() => {
    const at = travel.current.eased * TRAVEL_VIEWPORTS
    const { contact } = journeyLighting(at)
    // Still far beyond the void when it starts being drawn, so it never pops in
    if (room.current) room.current.visible = at > PASSAGE.opening[0] - 0.3
    // The slit is lit before the rest, so it is the first thing seen through the opening
    level.slit.value = Math.min(contact * 2.5, 1)
    level.room.value = contact
    sway.value = drift.current.x * LIGHT_DRIFT.wall
  })

  const { wallZ, wall, beam } = CONTACT_ROOM
  return (
    <group ref={room} visible={false}>
      <mesh position={[0, FLOOR_Y + wall[1] / 2, wallZ]} material={materials.wall}>
        <planeGeometry args={wall} />
      </mesh>
      <mesh
        position={[slitX, FLOOR_Y + slitHeight / 2, wallZ + 0.02]}
        material={materials.slit}
        renderOrder={RENDER_ORDER.outlines}
      >
        <planeGeometry args={[slitWidth, slitHeight]} />
      </mesh>
      <mesh
        position={[slitX, FLOOR_Y + slitHeight * 0.55, wallZ + 0.04]}
        material={materials.halo}
        renderOrder={RENDER_ORDER.outlines}
      >
        <planeGeometry args={[9, slitHeight * 1.4]} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[slitX, FLOOR_Y + 0.015, wallZ + beam / 2]}
        material={materials.beam}
        renderOrder={RENDER_ORDER.glow}
      >
        <planeGeometry args={[5, beam]} />
      </mesh>
    </group>
  )
}
