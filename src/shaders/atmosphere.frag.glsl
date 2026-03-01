// Realistic atmosphere glow: height-based density + limb brightening (fresnel)

uniform float uPower;
uniform float uCoverage;
uniform vec3 uAtmosphereColor;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vNormalView;

void main() {
  float intensity = pow( uCoverage - dot(vNormal, vNormalView), uPower );

  gl_FragColor = vec4(uAtmosphereColor*intensity, 1.0);
}
