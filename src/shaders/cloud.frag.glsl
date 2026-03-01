// Puffy cloud layer: Worley + FBM, gradient-based 3D lighting

uniform float uTime;
uniform float uNoiseScale;
uniform float uWorleyScale;
uniform float uThreshold;
uniform float uSoftness;
uniform float uAlpha;
uniform float uAbsorption;
uniform float uRimStrength;
uniform vec3 uLightDir;
uniform float uInnerRadius;
uniform float uOuterRadius;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p / 49.0);
  vec4 x_ = floor(j / 7.0);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = (x_ *2.0 + 1.0)/7.0 - 1.0;
  vec4 y = (y_ *2.0 + 1.0)/7.0 - 1.0;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 hash33(vec3 p) {
  vec3 q = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p + 1.0, vec3(269.5, 183.3, 123.4)),
    dot(p + 2.0, vec3(419.2, 371.9, 257.1))
  );
  return fract(sin(q) * 43758.5453);
}

float worley3D(vec3 p) {
  vec3 id = floor(p);
  vec3 u = fract(p);
  float F1 = 1.0;
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 offset = vec3(float(x), float(y), float(z));
        vec3 cellId = id + offset;
        vec3 fp = hash33(cellId);
        float d = length(u - offset - fp);
        F1 = min(F1, d);
      }
    }
  }
  return F1;
}

float fbm(vec3 p) {
  float total = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 4; i++) {
    total += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return total;
}

float densityAt(vec3 p) {
  float h = length(p);
  float shell = smoothstep(uInnerRadius, uOuterRadius, h);
  float worleyF1 = worley3D(p * uWorleyScale);
  float puff = 1.0 - smoothstep(0.12, 0.82, worleyF1);
  vec3 wind = vec3(0.1, 0.0, 0.05);
  float noise = fbm(p * uNoiseScale + uTime * wind);
  float detail = smoothstep(uThreshold, uThreshold + uSoftness, noise);
  return puff * detail * shell;
}

void main() {
  float height = length(vWorldPos);
  float shell = smoothstep(uInnerRadius, uOuterRadius, height);
  vec3 wind = vec3(0.1, 0.0, 0.05);
  vec3 pos = vWorldPos * uNoiseScale + uTime * wind;

  float worleyF1 = worley3D(vWorldPos * uWorleyScale);
  float puff = 1.0 - smoothstep(0.12, 0.82, worleyF1);
  float noise = fbm(pos);
  float detail = smoothstep(uThreshold, uThreshold + uSoftness, noise);
  float density = puff * detail * shell;

  const float eps = 0.015;
  float dx = densityAt(vWorldPos + vec3(eps, 0.0, 0.0)) - densityAt(vWorldPos - vec3(eps, 0.0, 0.0));
  float dy = densityAt(vWorldPos + vec3(0.0, eps, 0.0)) - densityAt(vWorldPos - vec3(0.0, eps, 0.0));
  float dz = densityAt(vWorldPos + vec3(0.0, 0.0, eps)) - densityAt(vWorldPos - vec3(0.0, 0.0, eps));
  vec3 grad = vec3(dx, dy, dz);
  float gradLen = length(grad);
  vec3 cloudNormal = gradLen > 0.001 ? normalize(grad) : normalize(vWorldPos);
  cloudNormal = -cloudNormal;
  float lightFactor = dot(cloudNormal, normalize(uLightDir));
  lightFactor = lightFactor * 0.5 + 0.5;
  float absorption = exp(-density * uAbsorption);
  float lighting = mix(lightFactor, 1.0, absorption);
  float fresnel = pow(1.0 - dot(cloudNormal, normalize(vViewDir)), 3.0);

  vec3 shadowColor = vec3(0.72, 0.72, 0.75);
  vec3 lightColor = vec3(1.0);
  vec3 rimColor = vec3(0.92, 0.93, 0.95);
  vec3 cloudColor = mix(shadowColor, lightColor, lighting);
  cloudColor += fresnel * uRimStrength * rimColor;
  float alpha = density * uAlpha;

  gl_FragColor = vec4(cloudColor, alpha);
}
