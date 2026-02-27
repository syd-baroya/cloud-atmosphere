import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function ThreeScene() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111827)

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )
    camera.position.z = 3

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.3,
      metalness: 0.6,
    })
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(2, 4, 5)
    scene.add(directionalLight)

    let animationFrameId

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      cube.rotation.x += 0.01
      cube.rotation.y += 0.015

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!container) return
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0 || clientHeight === 0) return

      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }

    window.addEventListener('resize', handleResize)

    handleResize()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)

      geometry.dispose()
      material.dispose()
      renderer.dispose()

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className="three-wrapper">
      <div ref={containerRef} className="three-container" />
    </div>
  )
}

export default ThreeScene

