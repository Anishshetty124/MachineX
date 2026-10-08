import { Html, OrbitControls, Stage } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { map2DTo3DSurface } from '../utils/coordinateMapper'

function Rotor({ exploded }) {
  const rotor = useRef()
  useFrame((_state, delta) => {
    if (rotor.current) rotor.current.rotation.z += delta * 0.18
  })

  return (
    <group ref={rotor} position={[0, 0, exploded ? -0.35 : 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.16, 64]} />
        <meshStandardMaterial color="#66747b" metalness={0.9} roughness={0.32} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}>
        <torusGeometry args={[1.48, 0.04, 12, 64]} />
        <meshStandardMaterial color="#afc0c5" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.11]}>
        <torusGeometry args={[0.52, 0.05, 12, 48]} />
        <meshStandardMaterial color="#a6b4b9" metalness={0.8} roughness={0.24} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.12]}>
        <cylinderGeometry args={[0.38, 0.38, 0.05, 48]} />
        <meshStandardMaterial color="#27343b" metalness={0.75} roughness={0.35} />
      </mesh>
    </group>
  )
}

function BrakePad({ exploded }) {
  return (
    <group position={[0, exploded ? 0.75 : 0, exploded ? 0.68 : 0.38]} rotation={[0, 0, -0.12]}>
      <mesh>
        <boxGeometry args={[1.25, 0.32, 0.28]} />
        <meshStandardMaterial color="#242c30" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[1.14, 0.08, 0.31]} />
        <meshStandardMaterial color="#b8c0bd" metalness={0.15} roughness={0.7} />
      </mesh>
    </group>
  )
}

function Caliper({ exploded }) {
  return (
    <group position={[0.18, exploded ? 0.95 : 0.12, exploded ? 0.45 : 0.12]}>
      <mesh>
        <boxGeometry args={[1.58, 0.3, 0.3]} />
        <meshStandardMaterial color="#c75839" metalness={0.45} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[1.25, 0.12, 0.34]} />
        <meshStandardMaterial color="#e27954" metalness={0.35} roughness={0.38} />
      </mesh>
    </group>
  )
}

function DefectMarker({ defect2DBox, defectType, severity }) {
  const marker = useRef()
  const position = map2DTo3DSurface(defect2DBox.x, defect2DBox.y)
  useFrame(({ clock }) => {
    if (!marker.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.12
    marker.current.scale.setScalar(pulse)
  })

  return (
    <group ref={marker} position={position}>
      <mesh>
        <boxGeometry args={[0.28, 0.28, 0.12]} />
        <meshBasicMaterial color="#ff4e4e" wireframe />
      </mesh>
      <pointLight color="#ff3d3d" intensity={1.8} distance={1.3} />
      <Html distanceFactor={7} position={[0.2, 0.2, 0.1]}>
        <div className="defect-tooltip"><strong>{defectType}</strong><span>{severity} severity</span></div>
      </Html>
    </group>
  )
}

export default function BrakePad3D({ defect2DBox, defectType, severity, exploded }) {
  return (
    <Canvas camera={{ position: [4.2, 3.2, 5.1], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={['#101a20']} />
      <Stage intensity={0.7} environment="city" adjustCamera={false}>
        <group rotation={[0.35, -0.35, 0]}>
          <Rotor exploded={exploded} />
          <BrakePad exploded={exploded} />
          <Caliper exploded={exploded} />
          <DefectMarker defect2DBox={defect2DBox} defectType={defectType} severity={severity} />
        </group>
      </Stage>
      <OrbitControls enableDamping minDistance={3.5} maxDistance={8} />
    </Canvas>
  )
}