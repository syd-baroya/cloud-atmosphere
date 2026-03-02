import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import cloudVert from './shaders/cloud.vert.glsl?raw'
import cloudFrag from './shaders/cloud.frag.glsl?raw'
import atmosphereFrag from './shaders/atmosphere.frag.glsl?raw'

let scene, camera, controls, renderer, timer, cloudMesh, atmosphereMesh, planet, stars, sun, gui;

/**
 * Initializes the scene, camera, controls, renderer, and GUI
 * @param {HTMLDivElement} container 
 */
export function init (container) {
    if (!container) {return;}

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);

    // Camera
    camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);

    // Controls
    controls = new OrbitControls(camera, container);
    controls.enablePan = false;
    // Clamp zoom: don't go inside the planet, don't go past the star field
    controls.minDistance = 1.5;   // just outside atmosphere (planet r=1, atmosphere ~1.07)
    controls.maxDistance = 50;   // star field extends to ~350, keep camera inside it

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Timer
    timer = new THREE.Timer();

    // debug shader GUI
    gui = new GUI({ title: 'Shaders', container: document.getElementById('lil-gui-container') });

    // Starfield
    stars = createStars();
    scene.add(stars);

    // Planet
    planet = createPlanet();
    scene.add(planet);

    // Light
    sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Atmosphere
    atmosphereMesh = createAtmosphere();
    scene.add(atmosphereMesh);

    // Clouds
    cloudMesh = createClouds();
    scene.add(cloudMesh);

}

/**
 * Creates a planet mesh with a texture or a default color if the texture fails to load
 * @returns {THREE.Mesh}
 */
function createPlanet() {
   const planetGeo = new THREE.SphereGeometry(1, 64, 64);
   const planetMaterial = new THREE.MeshStandardMaterial({
     map: null,
     color: 0xffffff,
     roughness: 0.9,
     metalness: 0.0,
   });
   const planet = new THREE.Mesh(planetGeo, planetMaterial);
   const textureLoader = new THREE.TextureLoader();
   textureLoader.load('/src/assets/planet.png', (tex) => {
      planet.material.map = tex;
      planet.material.needsUpdate = true;
    },
    undefined,
    (err) => {
      planet.material.color.set(0x3a5a3a);
      planet.material.needsUpdate = true;
      console.log('Error loading planet texture; using default color:', err);
    }
  );
 return planet;
}

/**
 * Creates an atmosphere mesh with a glowing shader material
 * @returns {THREE.Mesh}
 */
function createAtmosphere() {
 const atmosphereGeometry = new THREE.SphereGeometry(1.07, 64, 64);
 const atmosphereUniforms = {
   uPower: { value: 3.0 },
   uCoverage: { value: 1.0 },
   uAtmosphereColor: { value: new THREE.Color(0x88bbff) },
 };

 const atmosphereMaterial = new THREE.ShaderMaterial({
   vertexShader: cloudVert,
   fragmentShader: atmosphereFrag,
   uniforms: atmosphereUniforms,
   depthWrite: false,
   blending: THREE.AdditiveBlending,
 });

 if(gui) {
    const atmosphereFolder = gui.addFolder('Atmosphere');
    atmosphereFolder.add(atmosphereUniforms.uPower, 'value', 0.5, 5, 0.1).name('Power');
    atmosphereFolder.add(atmosphereUniforms.uCoverage, 'value', 0, 1, 0.01).name('Coverage');
    const atmosphereColor = { color: '#88bbff' };
    atmosphereFolder.addColor(atmosphereColor, 'color').name('Color').onChange((hex) => {
      atmosphereUniforms.uAtmosphereColor.value.set(hex);
    });
    atmosphereFolder.open();
  }
  return new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
}

/**
 * Creates a cloud mesh with a shader material
 * Cloud layer: puffy Worley + FBM (drawn on top of atmosphere)
 * @returns {THREE.Mesh}
 */
function createClouds() {
  const cloudGeometry = new THREE.SphereGeometry(1.02, 64, 64);
  const cloudUniforms = {
    uTime: { value: 0 },
    uNoiseScale: { value: 1.5 },
    uWorleyScale: { value: 4.0 },
    uThreshold: { value: -0.08 },
    uSoftness: { value: 0.35 },
    uAlpha: { value: 0.55 },
    uAbsorption: { value: 1.0 },
    uRimStrength: { value: 0.2 },
    uLightDir: { value: new THREE.Vector3(1, 0.5, 1).normalize() },
    uInnerRadius: { value: 1.0 },
    uOuterRadius: { value: 1.02 },
  };
  const cloudMaterial = new THREE.ShaderMaterial({
    vertexShader: cloudVert,
    fragmentShader: cloudFrag,
    uniforms: cloudUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  if(gui) {
    const cloudFolder = gui.addFolder('Cloud');
    cloudFolder.add(cloudUniforms.uNoiseScale, 'value', 0.5, 4, 0.01).name('Noise scale');
    cloudFolder.add(cloudUniforms.uWorleyScale, 'value', 1, 10, 0.1).name('Worley scale');
    cloudFolder.add(cloudUniforms.uThreshold, 'value', -0.2, 0.5, 0.01).name('Threshold');
    cloudFolder.add(cloudUniforms.uSoftness, 'value', 0.05, 1, 0.01).name('Softness');
    cloudFolder.add(cloudUniforms.uAlpha, 'value', 0.1, 1, 0.01).name('Alpha');
    cloudFolder.add(cloudUniforms.uAbsorption, 'value', 0.5, 5, 0.1).name('Absorption');
    cloudFolder.add(cloudUniforms.uRimStrength, 'value', 0, 2, 0.01).name('Rim strength');
    cloudFolder.open();
  }
  return new THREE.Mesh(cloudGeometry, cloudMaterial);
}

/**
 * Creates a starfield mesh with a points material
 * @returns {THREE.Points}
 */
function createStars() {
  const starCount = 4000;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 200 + Math.random() * 150;
    starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  return new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  }));
}

/**
 * Sets the animation loop
 */
export function setAnimationLoop() {
  renderer.setAnimationLoop(animate);
}

/**
 * Animates the scene
 * @param {number} timestamp 
 */
function animate(timestamp) {
  timer.update(timestamp);
  const elapsed = timer.getElapsed();
  if (cloudMesh && cloudMesh.material) {
    cloudMesh.material.uniforms.uTime.value = elapsed/2.0;
  } 
  if (planet) {
    planet.rotation.y = elapsed/100.0;
  }
  
  controls.update();
  renderer.render(scene, camera);
}


/**
 * Resizes the scene
 * @param {HTMLDivElement} container 
 */
export function resize (container) {
  if (!container) {return;}
  const { clientWidth, clientHeight } = container;
  if (clientWidth === 0 || clientHeight === 0) {return;}

  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight);
}

/**
 * Disposes the scene
 * @param {HTMLDivElement} container 
 */
export function dispose(container) {
  if (cloudMesh) {
    cloudMesh.geometry.dispose();
    cloudMesh.material.dispose();
  }
  if (atmosphereMesh) {
    atmosphereMesh.geometry.dispose();
    atmosphereMesh.material.dispose();
  }
  if (planet) {
    planet.geometry.dispose();
    planet.material.dispose();
  }
  if (stars) {
    stars.geometry.dispose();
    stars.material.dispose();
  }
  if (sun) {
    sun.dispose();
  }
  if (gui) {
    gui.destroy();
    gui = null;
  }
  renderer.dispose();
  if (container.contains(renderer.domElement)) {
    container.removeChild(renderer.domElement);
  }
}