import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import cloudVert from './shaders/cloud.vert.glsl?raw'
import cloudFrag from './shaders/cloud.frag.glsl?raw'
import atmosphereFrag from './shaders/atmosphere.frag.glsl?raw'

let scene, camera, controls, renderer, timer, cloudMesh, cloudMaterial, atmosphereMesh, planet, stars, sun, gui;

export function init (container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);

    camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);

    controls = new OrbitControls(camera, container);
    controls.enablePan = false;
    // Clamp zoom: don't go inside the planet, don't go past the star field
    controls.minDistance = 1.5;   // just outside atmosphere (planet r=1, atmosphere ~1.07)
    controls.maxDistance = 50;   // star field extends to ~350, keep camera inside it

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    timer = new THREE.Timer();

    // Starfield
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
    stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    }));
    scene.add(stars);

    // Planet with texture (optional: add public/planet.jpg to use your own image)
    const planetGeo = new THREE.SphereGeometry(1, 64, 64);
    const planetMaterial = new THREE.MeshStandardMaterial({
      map: null,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
    });
    planet = new THREE.Mesh(planetGeo, planetMaterial);
    new THREE.TextureLoader().load('/src/assets/planet.png', (tex) => {
      planetMaterial.map = tex;
      scene.add(planet);
    },
    undefined,
    (err) => {
      planetMaterial.color.set(0x3a5a3a);
      scene.add(planet);
      console.log('Error loading planet texture; using default color:', err);
    }
  );

    // Light
    sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Atmosphere glow: thin shell, limb brightening (drawn first, behind clouds)
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
    atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    // Cloud layer: puffy Worley + FBM (drawn on top of atmosphere)
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
    cloudMaterial = new THREE.ShaderMaterial({
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      uniforms: cloudUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudMesh);

    // lil-gui: tweak shader uniforms (lives in #lil-gui-container, positioned over scene via CSS)
    gui = new GUI({ title: 'Shaders', container: document.getElementById('lil-gui-container') });
    const cloudFolder = gui.addFolder('Cloud');
    cloudFolder.add(cloudUniforms.uNoiseScale, 'value', 0.5, 4, 0.01).name('Noise scale');
    cloudFolder.add(cloudUniforms.uWorleyScale, 'value', 1, 10, 0.1).name('Worley scale');
    cloudFolder.add(cloudUniforms.uThreshold, 'value', -0.2, 0.5, 0.01).name('Threshold');
    cloudFolder.add(cloudUniforms.uSoftness, 'value', 0.05, 1, 0.01).name('Softness');
    cloudFolder.add(cloudUniforms.uAlpha, 'value', 0.1, 1, 0.01).name('Alpha');
    cloudFolder.add(cloudUniforms.uAbsorption, 'value', 0.5, 5, 0.1).name('Absorption');
    cloudFolder.add(cloudUniforms.uRimStrength, 'value', 0, 2, 0.01).name('Rim strength');
    cloudFolder.open();

    const atmosphereFolder = gui.addFolder('Atmosphere');
    atmosphereFolder.add(atmosphereUniforms.uPower, 'value', 0.5, 5, 0.1).name('Power');
    atmosphereFolder.add(atmosphereUniforms.uCoverage, 'value', 0, 1, 0.01).name('Coverage');
    const atmosphereColor = { color: '#88bbff' };
    atmosphereFolder.addColor(atmosphereColor, 'color').name('Color').onChange((hex) => {
      atmosphereUniforms.uAtmosphereColor.value.set(hex);
    });
    atmosphereFolder.open();
}

export function setAnimationLoop() {
  renderer.setAnimationLoop(animate);
}

function animate(timestamp) {
  timer.update(timestamp);
  const elapsed = timer.getElapsed();
  if (cloudMaterial && cloudMaterial.uniforms.uTime) {
    cloudMaterial.uniforms.uTime.value = elapsed/2.0;
  } 
  if (planet) {
    planet.rotation.y = elapsed/100.0;
  }
  
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