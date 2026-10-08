import { Bounds, Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Component, Suspense, useRef } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
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

function RemoteModel({ url, exploded }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} scale={1.8} position={[0, exploded ? 0.45 : 0, 0]} />
}

function DatabaseModel({ url, exploded }) {
  return <RemoteModel url={url} exploded={exploded} />
}

class ModelErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? <div className="model-empty"><strong>3D model could not be rendered</strong><span>Check that the uploaded model was converted successfully.</span></div> : this.props.children
  }
}

function BrakePadCanvas({ modelUrl, defect2DBox, defectType, severity, exploded }) {
  const controlsRef = useRef()
  const zoom = (direction) => {
    if (!controlsRef.current) return
    direction === 'in' ? controlsRef.current.dollyIn(1.25) : controlsRef.current.dollyOut(1.25)
    controlsRef.current.update()
  }

  return (
    <>
      <Canvas camera={{ position: [4.2, 3.2, 5.1], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={['#101a20']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 5, 6]} intensity={2.4} />
        <directionalLight position={[-4, -2, -3]} intensity={0.8} />
        <Bounds fit clip observe margin={1.35}>
          <group rotation={[0.35, -0.35, 0]}>
            {modelUrl ? <Suspense fallback={null}><DatabaseModel url={modelUrl} exploded={exploded} /></Suspense> : <><Rotor exploded={exploded} /><BrakePad exploded={exploded} /><Caliper exploded={exploded} /></>}
            <DefectMarker defect2DBox={defect2DBox} defectType={defectType} severity={severity} />
          </group>
        </Bounds>
        <OrbitControls ref={controlsRef} makeDefault enableDamping enableZoom minDistance={0.5} maxDistance={30} />
      </Canvas>
      <div className="model-zoom-controls" aria-label="3D model zoom controls">
        <button type="button" className="icon-button" onClick={() => zoom('in')} title="Zoom in" aria-label="Zoom in"><ZoomIn size={17} /></button>
        <button type="button" className="icon-button" onClick={() => zoom('out')} title="Zoom out" aria-label="Zoom out"><ZoomOut size={17} /></button>
      </div>
    </>
  )
}

export default function BrakePad3D(props) {
  return <ModelErrorBoundary><BrakePadCanvas {...props} /></ModelErrorBoundary>
}