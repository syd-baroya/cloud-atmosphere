varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vNormalView;

void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vNormalView = normalize(normalMatrix * vViewDir);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
}