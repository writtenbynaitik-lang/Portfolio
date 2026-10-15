import { Color, ShaderMaterial, Vector2, type Texture } from 'three'
import { PALETTE } from '@/styles/palette'
import { VOID_FADE_GLSL, voidFade } from '../environment/voidFade'

/*
 * A website preview as one quad: a slim browser bar (three dots and an empty
 * address field, no URL) over the screenshot, with softly rounded corners and
 * no outline: the site itself defines the surface. A focused project (hover,
 * keyboard, tap) gains a fine red rim. Everything is drawn in the
 * shader, so edges stay crisp at any distance and each frame is a single draw
 * call.
 *
 * Screens are self-lit: brightness comes from uLight (dim in the distance,
 * full at the project's moment), not from the hall's lights. Surfaces dissolve
 * into the void like the rest of the hall.
 *
 * A frame only needs blending while it fades. Fully visible, it's drawn as
 * opaque (see setFrameSolid): it then hides the hall behind it from the GPU
 * instead of being blended over it, which measurably keeps scrolling smooth
 * on low-end graphics.
 */

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vVoidWorld;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vVoidWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
${VOID_FADE_GLSL}
uniform sampler2D uMap;
uniform float uMapReady;
uniform vec2 uSize;
uniform float uBar;
uniform float uRadius;
uniform float uLight;
uniform float uOpacity;
uniform float uSolid;
uniform float uFocus;
uniform vec3 uSurface;
uniform vec3 uChrome;
uniform vec3 uMark;
uniform vec3 uRim;
varying vec2 vUv;
varying vec3 vVoidWorld;

float roundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

// 1 inside a shape (distance < 0), antialiased over one pixel
float fill(float distance) {
  float aa = fwidth(distance);
  return 1.0 - smoothstep(-aa, aa, distance);
}

void main() {
  // Position on the frame in world units, centred
  vec2 p = (vUv - 0.5) * uSize;
  float outline = roundedBox(p, uSize * 0.5, uRadius);
  float barBottom = uSize.y * 0.5 - uBar;

  // Screenshot below the bar. Images are stored top row first.
  float imageY = (p.y + uSize.y * 0.5) / (uSize.y - uBar);
  vec3 image = texture2D(uMap, vec2(vUv.x, 1.0 - imageY)).rgb;
  vec3 color = mix(uSurface, image, uMapReady);

  // The bar: three dots at the left, an empty address field in the middle
  vec3 chrome = uChrome;
  vec2 barCentre = vec2(0.0, barBottom + uBar * 0.5);
  float dots = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 dotCentre = vec2(-uSize.x * 0.5 + uBar * (0.9 + float(i) * 0.62), barCentre.y);
    dots = max(dots, fill(length(p - dotCentre) - uBar * 0.15));
  }
  chrome = mix(chrome, uMark, dots * 0.45);
  float field = roundedBox(p - barCentre, vec2(uSize.x * 0.17, uBar * 0.23), uBar * 0.23);
  chrome = mix(chrome, uMark, fill(field) * 0.07);
  color = mix(color, chrome, fill(barBottom - p.y));

  // Dim in the distance; a touch brighter toward the top, as if lit from above
  color *= (0.2 + 0.8 * uLight) * mix(0.9, 1.0, vUv.y);

  // Focus rim, just inside the edge
  float aa = fwidth(outline);
  float rim = 1.0 - smoothstep(0.0, aa * 1.6, abs(outline + aa * 0.9));
  color = mix(color, uRim, rim * uFocus * 0.6);

  float alpha = fill(outline) * uOpacity * voidVisibility(vVoidWorld);
  // Drawn solid, the rounded corners are cut out rather than blended
  if (alpha < mix(0.002, 0.5, uSolid)) discard;
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
`

function createUniforms() {
  return {
    ...voidFade,
    uMap: { value: null as Texture | null },
    uMapReady: { value: 0 },
    uSize: { value: new Vector2(1, 1) },
    uBar: { value: 0.03 },
    uRadius: { value: 0.01 },
    uLight: { value: 0 },
    uOpacity: { value: 0 },
    uSolid: { value: 0 },
    uFocus: { value: 0 },
    uSurface: { value: new Color(PALETTE.screen) },
    uChrome: { value: new Color(PALETTE.chrome) },
    uMark: { value: new Color(PALETTE.paper) },
    uRim: { value: new Color(PALETTE.red) },
  }
}

export type FrameMaterial = ShaderMaterial & { uniforms: ReturnType<typeof createUniforms> }

export function createFrameMaterial(): FrameMaterial {
  return new ShaderMaterial({
    uniforms: createUniforms(),
    vertexShader,
    fragmentShader,
    transparent: true,
  }) as FrameMaterial
}

/** Opaque while fully visible, blended while fading. Each mode has its own shader program. */
export function setFrameSolid(material: FrameMaterial, solid: boolean) {
  material.transparent = !solid
  material.uniforms.uSolid.value = solid ? 1 : 0
}
