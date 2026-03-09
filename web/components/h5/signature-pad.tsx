\"use client\"

import { useRef, useState, useEffect } from \"react\"

type Props = {
  value?: string | null
  onChange?: (dataUrl: string | null) => void
  className?: string
}

export function SignaturePad({ value, onChange, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext(\"2d\")
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2
    ctx.lineCap = \"round\"
    ctx.strokeStyle = \"#111827\"

    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = value
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [value])

  const getPos = (e: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext(\"2d\")
    if (!ctx) return
    const { x, y } = getPos(e)
    drawing.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
    setHasDrawn(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext(\"2d\")
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const finishDrawing = () => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    if (onChange) {
      onChange(canvas.toDataURL(\"image/png\"))
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext(\"2d\")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    if (onChange) onChange(null)
  }

  return (
    <div className={className}>
      <div className=\"relative border border-dashed border-border rounded-lg bg-muted/40 overflow-hidden\">
        <canvas
          ref={canvasRef}
          className=\"w-full h-40 touch-none bg-background\"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerLeave={finishDrawing}
        />
        {!hasDrawn && !value && (
          <div className=\"absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-xs text-muted-foreground space-y-1\">
            <p>在此区域内进行手写签名</p>
            <p>建议横屏操作以获得更大空间</p>
          </div>
        )}
      </div>
      <div className=\"mt-2 flex items-center justify-between text-xs text-muted-foreground\">
        <span>{hasDrawn || value ? \"如需重签，可点击右侧清空\" : \"签名仅用于结算与合同确认存档\"}</span>
        <button
          type=\"button\"
          onClick={handleClear}
          className=\"px-2 py-1 rounded border border-border hover:bg-muted transition-colors\"
        >
          清空
        </button>
      </div>
    </div>
  )
}

