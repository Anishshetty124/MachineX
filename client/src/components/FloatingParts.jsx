import { BatteryCharging } from 'lucide-react'
import { useEffect, useState } from 'react'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function FloatingParts() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let frameId = 0

    const updateProgress = () => {
      frameId = 0
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(scrollableHeight > 0 ? clamp(window.scrollY / scrollableHeight, 0, 1) : 0)
    }

    const handleScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(updateProgress)
    }

    updateProgress()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
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
        x: clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1),
        y: clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1),
      }
      if (!frameId) frameId = window.requestAnimationFrame(updatePointer)
    }

    const resetPointer = () => {
      nextPointer = { x: 0, y: 0 }
      if (!frameId) frameId = window.requestAnimationFrame(updatePointer)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerleave', resetPointer)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', resetPointer)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [])

  const partsStyle = {
    '--parts-progress': scrollProgress,
    '--parts-tilt': `${scrollProgress * 18 - 9}deg`,
    '--pointer-x': pointer.x,
    '--pointer-y': pointer.y,
  }

  return (
    <div className="floating-parts" style={partsStyle} aria-hidden="true">
      <div className="floating-part floating-disc">
        <span className="disc-ring disc-ring-outer" />
        <span className="disc-ring disc-ring-inner" />
        <span className="disc-hub" />
        <span className="disc-hole disc-hole-one" />
        <span className="disc-hole disc-hole-two" />
        <span className="disc-hole disc-hole-three" />
      </div>
      <div className="floating-part floating-pad">
        <span className="pad-metal" />
        <span className="pad-friction" />
        <span className="pad-highlight" />
      </div>
      <div className="floating-part floating-battery">
        <BatteryCharging size={34} strokeWidth={1.25} />
        <span className="battery-level" />
      </div>
    </div>
  )
}
