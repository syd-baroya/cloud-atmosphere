import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import cloudVert from './shaders/cloud.vert.glsl?raw'
import cloudFrag from './shaders/cloud.frag.glsl?raw'

let scene, camera, controls, renderer, timer, cloudMesh, cloudMaterial, noiseTexture;

export function init (container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa8c8e0);

    camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 3);

    controls = new OrbitControls(camera, container);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    timer = new THREE.Timer();

    noiseTexture = new THREE.TextureLoader().load('/src/assets/noise3.png');
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    noiseTexture.magFilter = THREE.NearestMipmapLinearFilter;
    noiseTexture.minFilter = THREE.NearestMipmapLinearFilter;

    // Planet
    const planetGeo = new THREE.SphereGeometry(1, 128, 128);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x223344,
      roughness: 1.0,
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    scene.add(planet);

    // Light
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Cloud layer: thicker shell (1.0–1.07) for more 3D volume
    const cloudGeometry = new THREE.SphereGeometry(1.07, 128, 128);
    const cloudUniforms = {
      uTime: { value: 0 },
      uNoiseScale: { value: 1.5 },
      uWorleyScale: { value: 3.5 },
      uThreshold: { value: 0.2 },
      uSoftness: { value: 0.25 },
      uAlpha: { value: 0.55 },
      uAbsorption: { value: 2.0 },
      uRimStrength: { value: 0.9 },
      uLightDir: { value: new THREE.Vector3(1, 0.5, 1).normalize() },
      uInnerRadius: { value: 1.0 },
      uOuterRadius: { value: 1.07 }
    };
    cloudMaterial = new THREE.ShaderMaterial({
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      uniforms: cloudUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudMesh);
}

export function setAnimationLoop() {
  renderer.setAnimationLoop(animate);
}

function animate(timestamp) {
  timer.update(timestamp); // Update internal state
  const delta = timer.getDelta(); // Time since last frame
  const elapsed = timer.getElapsed(); // Total time

  cloudMaterial.uniforms.uTime.value = elapsed;
  controls.update();
  renderer.render(scene, camera);
}


export function resize (container) {
  if (!container) {return;}
  const { clientWidth, clientHeight } = container;
  if (clientWidth === 0 || clientHeight === 0) {return;}

  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight);
}

export function dispose(container) {
  if (cloudMesh) {
    cloudMesh.geometry.dispose();
    cloudMaterial.dispose();
  }
  renderer.dispose();
  if (container.contains(renderer.domElement)) {
    container.removeChild(renderer.domElement);
  }
}