import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'

function seededValue(index) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function Particles() {
  const pointsRef = useRef()
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const positions = useMemo(() => {
    const values = new Float32Array(1100 * 3)
    for (let index = 0; index < values.length; index += 3) {
      values[index] = (seededValue(index) - 0.5) * 13
      values[index + 1] = (seededValue(index + 1) - 0.5) * 8
      values[index + 2] = (seededValue(index + 2) - 0.5) * 8
    }
    return values
  }, [])

  useEffect(() => {
    let frameId = 0
    let nextPointer = { x: 0, y: 0 }
    const updatePointer = () => {
      frameId = 0
      setPointer(nextPointer)
    }
    const handlePointerMove = (event) => {
      nextPointer = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      }
      if (!frameId) frameId = window.requestAnimationFrame(updatePointer)
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [])

  useFrame(({ camera, clock }) => {
    if (!pointsRef.current) return
    const elapsed = clock.getElapsedTime()
    pointsRef.current.rotation.y = elapsed * 0.018 + pointer.x * 0.035
    pointsRef.current.rotation.x = Math.sin(elapsed * 0.12) * 0.025 + pointer.y * 0.025
    camera.position.x += (pointer.x * 0.22 - camera.position.x) * 0.025
    camera.position.y += (-pointer.y * 0.14 - camera.position.y) * 0.025
    camera.lookAt(0, 0, 0)
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9bcfd0" size={0.075} transparent opacity={0.58} depthWrite={false} sizeAttenuation />
    </points>
  )
}

export default function ParticleBackground() {
  return (
    <div className="particle-background" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5.5], fov: 55 }} dpr={[1, 1.25]} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}>
        <Particles />
      </Canvas>
    </div>
  )
}
