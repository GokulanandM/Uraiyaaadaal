import { useEffect, useRef } from "react"

type Props = {
  analyserNode: AnalyserNode | null
  isRecording: boolean
}

const GOLD = "#F59E0B"
const BG = "#0E0B07"

export function WaveformVisualizer({ analyserNode, isRecording }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>()
  const phaseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 0
    const dataArray = analyserNode ? new Uint8Array(bufferLength) : null

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const targetW = Math.max(1, Math.floor(w * dpr))
      const targetH = Math.max(1, Math.floor(h * dpr))
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, w, h)

      ctx.lineWidth = 2
      ctx.strokeStyle = GOLD
      ctx.beginPath()

      if (analyserNode && dataArray && isRecording) {
        analyserNode.getByteTimeDomainData(dataArray)
        const slice = w / dataArray.length
        let x = 0
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i]! / 128.0
          const y = (v * h) / 2
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
          x += slice
        }
        ctx.lineTo(w, h / 2)
      } else {
        phaseRef.current += 0.04
        const mid = h / 2
        for (let x = 0; x <= w; x += 2) {
          const t = x * 0.02 + phaseRef.current
          const amp = analyserNode ? 6 : 12
          const y = mid + Math.sin(t) * amp
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    tick()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [analyserNode, isRecording])

  return (
    <canvas
      ref={canvasRef}
      className="h-40 w-full rounded-xl border border-[color:var(--border)] bg-black sm:h-52"
      aria-hidden
    />
  )
}
