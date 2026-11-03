import { useEffect, useRef } from 'react'

export type ReactorState = 'idle' | 'listening' | 'thinking' | 'speaking'

type Look = { color: [number, number, number]; spin: number; glow: number }

const LOOKS: Record<ReactorState, Look> = {
  idle: { color: [70, 130, 175], spin: 0.12, glow: 0.35 },
  listening: { color: [79, 216, 255], spin: 0.25, glow: 0.7 },
  thinking: { color: [255, 182, 72], spin: 1.6, glow: 0.6 },
  speaking: { color: [150, 236, 255], spin: 0.4, glow: 0.9 },
}

const BARS = 72
const CORE_SEGMENTS = 10
const MAX_PIXEL_RATIO = 2

function approach(current: number, target: number, rate: number) {
  return current + (target - current) * rate
}

/**
 * The animated reactor. It draws on a canvas every frame, so it only exists while the voice
 * conversation is open. `readLevels` fills the array with 0..1 values, one per bar, from
 * whichever audio is active.
 */
export default function JarvisReactor({
  state,
  readLevels,
}: {
  state: ReactorState
  readLevels: (levels: Float32Array) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  const readRef = useRef(readLevels)
  stateRef.current = state
  readRef.current = readLevels

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const levels = new Float32Array(BARS)
    const smooth = new Float32Array(BARS)
    const color = [...LOOKS.idle.color]
    let glow = LOOKS.idle.glow
    let spin = LOOKS.idle.spin
    let angle = 0
    let last = performance.now()
    let frame = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
      canvas.width = canvas.clientWidth * ratio
      canvas.height = canvas.clientHeight * ratio
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const arc = (radius: number, from: number, to: number, width: number, alpha: number) => {
      context.beginPath()
      context.arc(0, 0, radius, from, to)
      context.lineWidth = width
      context.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`
      context.stroke()
    }

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw)
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now

      const look = LOOKS[stateRef.current]
      for (let i = 0; i < 3; i++) color[i] = approach(color[i], look.color[i], 0.08)
      glow = approach(glow, look.glow, 0.08)
      spin = approach(spin, look.spin, 0.05)
      if (!still) angle += spin * delta

      levels.fill(0)
      readRef.current(levels)
      let energy = 0
      for (let i = 0; i < BARS; i++) {
        smooth[i] = approach(smooth[i], levels[i], levels[i] > smooth[i] ? 0.5 : 0.12)
        energy += smooth[i]
      }
      energy /= BARS

      const size = Math.min(canvas.width, canvas.height)
      const radius = size * 0.3
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.save()
      context.translate(canvas.width / 2, canvas.height / 2)
      const [r, g, b] = color.map(Math.round)

      // Glow and core
      const coreRadius = radius * (0.38 + energy * 0.22)
      const halo = context.createRadialGradient(0, 0, 0, 0, 0, radius * 1.5)
      halo.addColorStop(0, `rgba(${r},${g},${b},${0.3 * glow + energy * 0.25})`)
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`)
      context.fillStyle = halo
      context.fillRect(-size, -size, size * 2, size * 2)

      const core = context.createRadialGradient(0, 0, 0, 0, 0, coreRadius)
      core.addColorStop(0, 'rgba(255,255,255,0.95)')
      core.addColorStop(0.45, `rgba(${r},${g},${b},${0.75 + energy * 0.25})`)
      core.addColorStop(1, `rgba(${r},${g},${b},0)`)
      context.fillStyle = core
      context.beginPath()
      context.arc(0, 0, coreRadius, 0, Math.PI * 2)
      context.fill()

      // Segments around the core
      const gap = 0.09
      const step = (Math.PI * 2) / CORE_SEGMENTS
      for (let i = 0; i < CORE_SEGMENTS; i++) {
        const start = i * step + gap + angle * 0.35
        arc(radius * 0.56, start, start + step - gap * 2, radius * 0.13, 0.28 + glow * 0.45)
      }

      // Rings turning in opposite directions
      arc(radius * 0.74, 0, Math.PI * 2, 1, 0.45)
      for (let i = 0; i < 3; i++) {
        const start = -angle + (i * Math.PI * 2) / 3
        arc(radius * 0.82, start, start + 1.45, radius * 0.022, 0.8)
      }
      for (let i = 0; i < 2; i++) {
        const start = angle * 0.6 + i * Math.PI
        arc(radius * 1.32, start, start + 2.2, 1.5, 0.45)
      }

      // Bars that follow the sound
      context.lineCap = 'round'
      context.lineWidth = Math.max(1.5, size * 0.004)
      context.strokeStyle = `rgba(${r},${g},${b},0.85)`
      context.beginPath()
      for (let i = 0; i < BARS; i++) {
        const barAngle = (i / BARS) * Math.PI * 2 - Math.PI / 2
        const inner = radius * 0.95
        const outer = inner + radius * 0.02 + smooth[i] * radius * 0.28
        const x = Math.cos(barAngle)
        const y = Math.sin(barAngle)
        context.moveTo(x * inner, y * inner)
        context.lineTo(x * outer, y * outer)
      }
      context.stroke()
      context.lineCap = 'butt'
      context.restore()
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />
}
