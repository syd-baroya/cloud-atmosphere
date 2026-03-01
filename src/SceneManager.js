import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import cloudVert from './shaders/cloud.vert.glsl?raw'
import cloudFrag from './shaders/cloud.frag.glsl?raw'

let scene, camera, controls, renderer, timer, cloudMesh, cloudMaterial, noiseTexture;

export function init (container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa8c8e0); // soft sky blue so cloud reads clearly

    camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 3;

    // controls = new OrbitControls(camera, container);

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

    // Ray-marched cloud fullscreen quad (camera passed as uniform so shader compiles)
    const cloudGeometry = new THREE.PlaneGeometry(10, 10);
    const cloudUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uNoiseTexture: { value: new THREE.Uniform(null) },
    };
    cloudMaterial = new THREE.ShaderMaterial({
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      uniforms: cloudUniforms,
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloudMesh.position.z = 2;
    scene.add(cloudMesh);
}

export function setAnimationLoop() {
  renderer.setAnimationLoop(animate);
}

function animate(timestamp) {
  timer.update(timestamp); // Update internal state
  const delta = timer.getDelta(); // Time since last frame
  const elapsed = timer.getElapsed(); // Total time

  cloudMaterial.uniforms.uTime.value = elapsed/5.0;
  cloudMaterial.uniforms.uResolution.value.set(renderer.domElement.width*window.devicePixelRatio, renderer.domElement.height*window.devicePixelRatio);
  cloudMaterial.uniforms.uNoiseTexture.value = noiseTexture;
  
  renderer.render(scene, camera);
  // controls.update();
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