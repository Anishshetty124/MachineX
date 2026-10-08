import { OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box3, Vector3 } from 'three'
import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

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

function RemoteModel({ url, exploded, modelColor, solidColor }) {
  const { scene } = useGLTF(url)
  const fit = useMemo(() => {
    const bounds = new Box3().setFromObject(scene)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const largestDimension = Math.max(size.x, size.y, size.z)
    const scale = largestDimension > 0 ? 2.8 / largestDimension : 1

    return {
      scale,
      position: [-center.x * scale, -center.y * scale, -center.z * scale],
    }
  }, [scene])

  useEffect(() => {
    if (!scene) return
    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if (material.color && modelColor) {
          material.color.set(modelColor)
        }
        if (solidColor && material.map) {
          material.map = null
          material.needsUpdate = true
        }
      })
    })
  }, [modelColor, scene, solidColor])

  return (
    <group scale={fit.scale} position={[fit.position[0], fit.position[1] + (exploded ? 0.45 : 0), fit.position[2]]}>
      <primitive object={scene} />
    </group>
  )
}

class ModelErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="model-empty">
          <strong>3D model display reset</strong>
          <span>Click Reset below to restore stage view.</span>
          <button 
            type="button" 
            className="secondary-button" 
            style={{ marginTop: '10px' }}
            onClick={() => {
              this.setState({ hasError: false })
              this.props.onReset?.()
            }}
          >
            Reset 3D Stage
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function BrakePadCanvas({ 
  modelUrl, 
  exploded, 
  modelColor, 
  solidColor, 
  backgroundColor,
  onReset
}) {
  const controlsRef = useRef()

  const zoom = (direction) => {
    if (!controlsRef.current) return
    direction === 'in' ? controlsRef.current.dollyIn(1.25) : controlsRef.current.dollyOut(1.25)
    controlsRef.current.update()
  }

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
    if (onReset) {
      onReset()
    }
  }

  return (
    <>
      <Canvas 
        camera={{ position: [0, 0, 5.5], fov: 45 }} 
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[backgroundColor || '#101a20']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 5, 6]} intensity={2.4} />
        <directionalLight position={[-4, -2, -3]} intensity={0.8} />

        <group position={[0, 0, 0]} rotation={[0.35, -0.35, 0]}>
          {modelUrl ? (
            <Suspense fallback={null}>
              <RemoteModel url={modelUrl} exploded={exploded} modelColor={modelColor} solidColor={solidColor} />
            </Suspense>
          ) : (
            <>
              <Rotor exploded={exploded} />
              <BrakePad exploded={exploded} />
              <Caliper exploded={exploded} />
            </>
          )}

        </group>

        <OrbitControls ref={controlsRef} makeDefault enableDamping enableZoom minDistance={1} maxDistance={20} />
      </Canvas>

      <div className="model-zoom-controls" aria-label="3D model zoom controls">
        <button type="button" className="icon-button" onClick={() => zoom('in')} title="Zoom in" aria-label="Zoom in">
          <ZoomIn size={17} />
        </button>
        <button type="button" className="icon-button" onClick={() => zoom('out')} title="Zoom out" aria-label="Zoom out">
          <ZoomOut size={17} />
        </button>
        <button type="button" className="icon-button" onClick={handleResetCamera} title="Reset camera & stage" aria-label="Reset stage">
          <RotateCcw size={17} />
        </button>
      </div>
    </>
  )
}

export default function BrakePad3D(props) {
  return (
    <ModelErrorBoundary key={`${props.modelUrl || 'default-stage'}-${props.resetKey || 0}`} onReset={props.onReset}>
      <BrakePadCanvas {...props} />
    </ModelErrorBoundary>
  )
}