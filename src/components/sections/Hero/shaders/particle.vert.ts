/**
 * Vertex shader — particle sphere.
 *
 * Color is computed in-shader: each particle stores a single float
 * `aGradient` (0..1) representing its position bottom→top, and the
 * shader interpolates between REST and HOVER gradient stops in real
 * time via `u_hover` (0..1).
 *
 * Other dynamics in the shader: radial breathing (per-particle phase),
 * depth-attenuated point size, edge-fade alpha, and a cursor-driven
 * outward displacement near the cursor's projected 3D position.
 *
 * Stored as a TS template literal because no .glsl loader is wired.
 * The "glsl" annotation hints highlighters that understand it.
 */
export const particleVertexShader = /* glsl */ `
  uniform float u_time;
  uniform float u_size;
  uniform float u_breathing;
  uniform float u_hover;
  uniform vec3 u_cursorPos;
  uniform float u_cursorForce;

  uniform vec3 u_colorHot_rest;
  uniform vec3 u_colorMid_rest;
  uniform vec3 u_colorDeep_rest;
  uniform vec3 u_colorHot_hover;
  uniform vec3 u_colorMid_hover;
  uniform vec3 u_colorDeep_hover;

  attribute float aGradient;
  attribute float aRandom;

  varying vec3 vColor;
  varying float vAlpha;

  vec3 sampleGradient(float t, vec3 deep, vec3 mid, vec3 hot) {
    // Two-stop gradient: deep at 0, mid at 0.5, hot at 1
    if (t < 0.5) {
      return mix(deep, mid, t * 2.0);
    } else {
      return mix(mid, hot, (t - 0.5) * 2.0);
    }
  }

  void main() {
    // Interpolate the three gradient stops between rest and hover.
    vec3 deep = mix(u_colorDeep_rest, u_colorDeep_hover, u_hover);
    vec3 mid  = mix(u_colorMid_rest,  u_colorMid_hover,  u_hover);
    vec3 hot  = mix(u_colorHot_rest,  u_colorHot_hover,  u_hover);
    vColor = sampleGradient(aGradient, deep, mid, hot);

    // Per-particle radial breathing — phase offset by aRandom so each
    // particle drifts independently.
    vec3 pos = position;
    float breath = sin(u_time * 0.5 + aRandom * 6.2831853) * 0.5 + 0.5;
    pos += normalize(position) * breath * u_breathing;

    // Cursor disturbance — particles near the cursor's projected 3D
    // position get pushed outward radially. Distance computed in
    // object space (u_cursorPos is supplied in object space).
    float distToCursor = length(pos - u_cursorPos);
    float disturbance = exp(-distToCursor * 1.5) * u_cursorForce;
    pos += normalize(position) * disturbance * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size with depth attenuation.
    gl_PointSize = u_size * (1.0 / -mvPosition.z) * (0.7 + aRandom * 0.6);

    // Back-facing particles still visible at 30% so the sphere reads
    // as volumetric, not a hollow shell.
    vec3 viewDir = normalize(-mvPosition.xyz);
    vec3 normalDir = normalize(pos);
    float facing = max(0.0, dot(normalDir, viewDir));
    vAlpha = mix(0.3, 1.0, facing);
  }
`
