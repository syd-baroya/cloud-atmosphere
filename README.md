# Cloud Atmosphere

Interactive WebGL demo of a cloudy planet viewed from space, built with React and Three.js. It renders a textured planet, a glowing atmospheric rim, and a cloud layer driven by custom GLSL shaders.

## Features

- **Atmosphere**: Thin glowing shell with limb brightening around the planet.
- **Clouds**: Worley + FBM noise in a spherical shell, with lighting derived from the density field.
- **Shader adjustment controls**: `lil-gui` panel to tweak shader uniforms (density, softness, absorption, rim, etc.).
- **Orbit controls**: Smooth camera orbit with constrained zoom so you never clip through the planet or leave the starfield.
- **Responsive canvas**: Scene resizes automatically with the browser window.

## Tech stack

- **Framework**: React (Vite)
- **3D engine**: Three.js
- **UI controls**: lil-gui
- **Tooling**: Vite, ESLint

## Getting started

### 1. Prerequisites

- Node.js 18+ (LTS recommended)
- npm (bundled with Node)

### 2. Clone or download this repo

```bash
git clone https://github.com/syd-baroya/cloud-atmosphere.git
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the dev server

```bash
npm run dev
```

Vite will print a local URL (by default `http://localhost:5173`) where you can view the scene in your browser.

### 5. Production build & preview

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```
Vite will print a local URL (by default `http://localhost:4173`) where you can view the scene in your browser.

### 5. Linting

```bash
npm run lint
```

## Controls

- **Orbit**: Click + drag with the mouse to orbit the camera around the planet.
- **Zoom**: Scroll wheel to zoom in/out (clamped so you stay outside the planet and inside the starfield).
- **Shader controls**: Use the `Shaders` panel (added by `lil-gui`) to tweak:
  - **Cloud**: noise scale, Worley scale, threshold, softness, alpha, absorption, rim strength.
  - **Atmosphere**: power, coverage, color.

## Project structure

```text
.
├─ src/
├─ App.jsx              # React app shell
├─ ThreeScene.jsx       # React wrapper that mounts the Three.js renderer
├─ SceneManager.js      # All Three.js scene setup & animation
├─ shaders/
│  ├─ cloud.vert.glsl   # Shared vertex shader for cloud & atmosphere shells
│  ├─ cloud.frag.glsl   # Procedural cloud fragment shader
│  └─ atmosphere.frag.glsl # Atmosphere rim fragment shader
└─ assets/              # Planet texture + noise textures (optional)
```

## Shader overview

- **Atmosphere shader** (`src/shaders/atmosphere.frag.glsl`):  
  Uses the angle between surface normal and view direction to produce limb brightening, giving a soft halo around the planet.

- **Cloud shader** (`src/shaders/cloud.frag.glsl`):  
  Combines Worley noise and FBM for puffy cloud density, derives normals from the density gradient, and applies sun/shadow, absorption, and a Fresnel-style rim.