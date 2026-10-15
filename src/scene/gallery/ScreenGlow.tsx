import { useEffect, useMemo } from 'react'
import { CustomBlending, OneFactor, ShaderMaterial, ZeroFactor } from 'three'
import { FLOOR_Y, RENDER_ORDER } from '../environment/layout'
import { VOID_FADE_GLSL, voidFade } from '../environment/voidFade'
import { MAX_SCREENS, screenLight } from './screenLight'

/*
 * Light from the website previews themselves: each lit screen casts a soft
 * pool of its own average colour onto the floor beneath and in front of it.
 * The previews belong to the hall instead of floating over it, and the
 * websites become the space's main source of colour.
 *
 * Drawn as one instanced pass of floor decals rather than added to the
 * floor's material: a pool costs a few operations on the pixels it covers,
 * where lighting every floor pixel measurably cost scroll smoothness on
 * low-end graphics.
 */

const vertexShader = /* glsl */ `
uniform vec3 uScreenPosition[${MAX_SCREENS}];
uniform vec3 uScreenNormal[${MAX_SCREENS}];
uniform vec3 uScreenColor[${MAX_SCREENS}];
uniform float uScreenReach[${MAX_SCREENS}];
varying vec2 vLocal;
varying vec3 vLight;
varying vec3 vWorld;

void main() {
  vec3 screen = uScreenPosition[gl_InstanceID];
  vec3 facing = uScreenNormal[gl_InstanceID];
  float reach = uScreenReach[gl_InstanceID];
  // On the floor below the screen, reaching out in front of it
  vec2 centre = screen.xz + facing.xz * reach * 0.5;
  float radius = reach * 1.8;
  // The quad's y runs along −z, so it lies face up
  vWorld = vec3(centre.x + position.x * 2.0 * radius, ${FLOOR_Y.toFixed(2)} + 0.01, centre.y - position.y * 2.0 * radius);
  vLocal = position.xy * 2.0;
  // A screen hung higher above the floor casts a fainter pool
  float height = max(screen.y - ${FLOOR_Y.toFixed(2)}, 0.3);
  vLight = uScreenColor[gl_InstanceID] / (1.0 + height * height / (reach * reach));
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}
`

const fragmentShader = /* glsl */ `
${VOID_FADE_GLSL}
varying vec2 vLocal;
varying vec3 vLight;
varying vec3 vWorld;

void main() {
  float falloff = max(1.0 - dot(vLocal, vLocal), 0.0);
  vec3 light = vLight * falloff * falloff * voidVisibility(vWorld);
  if (max(light.r, max(light.g, light.b)) < 0.002) discard;
  // Added to what's beneath; the alpha is left alone, so a pool never
  // darkens where the floor fades into the void
  gl_FragColor = vec4(light, 0.0);
}
`

interface ScreenGlowProps {
  /** Screens in use, at most MAX_SCREENS. */
  count: number
}

export function ScreenGlow({ count }: ScreenGlowProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { ...voidFade, ...screenLight },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneFactor,
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneFactor,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  return (
    <instancedMesh
      args={[undefined, undefined, Math.min(count, MAX_SCREENS)]}
      material={material}
      renderOrder={RENDER_ORDER.glow}
      // Placed in the shader, so the mesh's own bounds mean nothing
      frustumCulled={false}
    >
      <planeGeometry />
    </instancedMesh>
  )
}
