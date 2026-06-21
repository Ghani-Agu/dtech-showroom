/**
 * Fragment shader — particle sphere.
 *
 * Each gl_Point is rendered as a soft circular disc (discard outside
 * radius 0.5) with a center-weighted glow ramp. Combined with the
 * material's AdditiveBlending this gives the cumulative bloom-ready
 * glow per particle.
 *
 * u_emission is a brightness multiplier driven by the JS side (1.0 at
 * rest, ~1.25 on hover). u_hover gives an additional warm boost on
 * top of the rest→hover color interpolation done in the vertex shader.
 *
 * Stored as a TS template literal because no .glsl loader is wired.
 */
export const particleFragmentShader = /* glsl */ `
  precision highp float;

  uniform float u_emission;
  uniform float u_hover;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Soft circular particle — discard the square corners.
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float falloff = smoothstep(0.5, 0.0, d);

    // Color × emission multiplier.
    vec3 col = vColor * u_emission;

    // Center brightening — tuned down to 0.15 so each particle reads
    // more uniform; multiplied by emission so hover lifts the cores.
    col += vec3(0.15) * pow(falloff, 4.0) * u_emission;

    // Hover boost — particles glow brighter on hover (40% lift at
    // u_hover=1, no effect at u_hover=0).
    col *= mix(1.0, 1.4, u_hover);

    // Overall alpha multiplier 0.65 so additive blending doesn't
    // oversaturate when nearby particles overlap.
    gl_FragColor = vec4(col, falloff * vAlpha * 0.65);
  }
`
