import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, type ShaderMaterial } from 'three'
import type { QualityTier } from '@/hooks/useQualityTier'
import { easeInOutCubic, segment } from '@/motion/easing'
import { INTRO } from '@/motion/intro'
import { TRAVEL_VIEWPORTS } from '@/motion/travel'
import type { IntroClockRef } from '../useIntroClock'
import type { TravelRef } from '../useScrollTravel'
import { FLOOR_Y, hallSpread, journeyLighting, LIGHTING, monolithLayout, RENDER_ORDER } from './layout'
import { VOID_FADE_GLSL, voidFade } from './voidFade'

/** Motes per light pool. */
const COUNT: Record<QualityTier, number> = { high: 22, low: 10 }

const vertexShader = /* glsl */ `
${VOID_FADE_GLSL}
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute vec4 aSeed;   // x, y: drift phases · z: size · w: height of the mote's column
attribute vec3 aTint;
varying vec3 vTint;
varying float vAlpha;

void main() {
  vec3 p = position;
  // Rise slowly through the light, wrapping back to the floor
  float rise = fract(aSeed.x + uTime * (0.004 + aSeed.y * 0.008));
  p.y += rise * aSeed.w;
  p.x += sin(uTime * 0.12 + aSeed.x * 6.2831) * 0.2;
  p.z += cos(uTime * 0.1 + aSeed.y * 6.2831) * 0.2;

  vec4 world = modelMatrix * vec4(p, 1.0);
  vec4 view = viewMatrix * world;
  // Fade in and out at the ends of each rise, so wrapping never pops
  vAlpha = sin(rise * 3.14159) * voidVisibility(world.xyz);
  vTint = aTint;
  gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed.z) / -view.z;
  gl_Position = projectionMatrix * view;
}
`

const fragmentShader = /* glsl */ `
uniform float uOpacity;
varying vec3 vTint;
varying float vAlpha;

void main() {
  float alpha = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5)) * vAlpha * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(vTint, alpha);
  #include <colorspace_fragment>
}
`

function createUniforms() {
  return {
    ...voidFade,
    uTime: { value: 0 },
    uSize: { value: 26 },
    uPixelRatio: { value: 1 },
    uOpacity: { value: 0 },
  }
}

type DustMaterial = ShaderMaterial & { uniforms: ReturnType<typeof createUniforms> }

interface DustProps {
  intro: IntroClockRef
  travel: TravelRef
  reducedMotion: boolean
  quality: QualityTier
  aspect: number
}

/**
 * Sparse dust, only inside the pools of light and tinted by them, as in a
 * dark gallery. It's what makes the light read as volume rather than paint.
 */
export function Dust({ intro, travel, reducedMotion, quality, aspect }: DustProps) {
  const pixelRatio = useThree((state) => state.viewport.dpr)

  const { positions, seeds, tints } = useMemo(() => {
    const spread = hallSpread(aspect)
    const [monolithX, , monolithZ] = monolithLayout(aspect).position
    // Each pool: centre on the floor, radius, column height, colour
    const pools = [
      { x: monolithX - 0.8, z: monolithZ + 2, radius: 3, height: 9, color: LIGHTING.key.color },
      { x: LIGHTING.threshold.target[0] * spread, z: LIGHTING.threshold.target[2], radius: 3.2, height: 10, color: LIGHTING.threshold.color },
      { x: LIGHTING.ember.position[0] * spread, z: LIGHTING.ember.position[2], radius: 2.6, height: 4, color: LIGHTING.ember.color },
    ]
    const count = COUNT[quality] * pools.length
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 4)
    const tints = new Float32Array(count * 3)

    // Seeded, so the composition is the same on every visit
    let state = 0x51f15e
    const random = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32

    pools.forEach((pool, poolIndex) => {
      const tint = new Color(pool.color)
      for (let i = 0; i < COUNT[quality]; i++) {
        const index = poolIndex * COUNT[quality] + i
        const angle = random() * Math.PI * 2
        const distance = Math.sqrt(random()) * pool.radius
        positions.set([pool.x + Math.cos(angle) * distance, FLOOR_Y, pool.z + Math.sin(angle) * distance], index * 3)
        seeds.set([random(), random(), random(), pool.height * (0.5 + random() * 0.5)], index * 4)
        tints.set([tint.r, tint.g, tint.b], index * 3)
      }
    })
    return { positions, seeds, tints }
  }, [aspect, quality])

  const material = useRef<DustMaterial>(null)
  const uniforms = useMemo(() => createUniforms(), [])

  useFrame((state) => {
    if (!material.current) return
    const { uTime, uPixelRatio, uOpacity } = material.current.uniforms
    const { start, duration } = INTRO.scene.dust
    uTime.value = reducedMotion ? 0 : state.clock.elapsedTime
    uPixelRatio.value = pixelRatio
    // Settles out of the air as the hall goes quiet in the finale
    const { activity } = journeyLighting(travel.current.eased * TRAVEL_VIEWPORTS)
    uOpacity.value = 0.35 * easeInOutCubic(segment(intro.current.elapsed, start, duration)) * activity
  })

  return (
    <points renderOrder={RENDER_ORDER.dust} frustumCulled={false}>
      <bufferGeometry key={positions.length}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 4]} />
        <bufferAttribute attach="attributes-aTint" args={[tints, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  )
}
