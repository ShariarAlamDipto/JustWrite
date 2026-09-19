import React, { useEffect, useRef } from 'react'

/**
 * Ambient gradient field rendered into the empty margins beside the content
 * column. Soft organic colour blobs drift over the page background and lean
 * toward the cursor; a grain layer on top breaks up the banding.
 *
 * The palette is randomised on every load, so each visit has its own colour.
 */

const BLOB_COUNT = 6

// The canvas is deliberately tiny and stretched to fill the viewport — the
// browser's own upscaling does most of the smoothing for free.
const BUFFER_W = 200
const BUFFER_H = 130

/**
 * Curated, deliberately desaturated palettes. Muted tones sit against black
 * without shouting; fully saturated hues (hot pink, neon cyan) do not, so the
 * colour is picked from this list rather than anywhere on the wheel.
 */
const PALETTES: ReadonlyArray<{ hue: number; sat: number; light: number }> = [
  { hue: 104, sat: 20, light: 58 }, // sage
  { hue: 204, sat: 38, light: 70 }, // baby blue
  { hue: 166, sat: 24, light: 57 }, // eucalyptus
  { hue: 228, sat: 28, light: 65 }, // periwinkle
  { hue: 262, sat: 19, light: 63 }, // lavender ash
  { hue: 150, sat: 22, light: 60 }, // seafoam
  { hue: 214, sat: 25, light: 57 }, // slate blue
  { hue: 38, sat: 24, light: 62 },  // soft sand
  { hue: 186, sat: 26, light: 62 }, // dusty aqua
  { hue: 82, sat: 18, light: 57 },  // moss
]

interface Blob {
  hue: number
  sat: number
  light: number
  baseX: number
  baseY: number
  radius: number
  driftX: number
  driftY: number
  speedX: number
  speedY: number
  phaseX: number
  phaseY: number
  depth: number
}

function createBlobs(): Blob[] {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
  // A narrow hue walk keeps the field reading as one colour rather than a
  // rainbow — the variation shows up as depth, not as separate hues.
  const spread = 22 + Math.random() * 16

  const bands = Math.ceil(BLOB_COUNT / 2)

  return Array.from({ length: BLOB_COUNT }, (_, i) => {
    const t = BLOB_COUNT > 1 ? i / (BLOB_COUNT - 1) : 0.5
    // Alternate sides and step down vertical bands so both margins always get
    // colour along their full height — the mask hides everything in between.
    const onLeft = i % 2 === 0
    const band = Math.floor(i / 2)

    return {
      hue: palette.hue + (t - 0.5) * spread,
      sat: palette.sat + (Math.random() - 0.5) * 8,
      light: palette.light + (Math.random() - 0.5) * 8,
      baseX: onLeft ? -0.18 + Math.random() * 0.4 : 0.78 + Math.random() * 0.4,
      baseY: (band + Math.random()) / bands,
      radius: 0.34 + Math.random() * 0.18,
      driftX: 0.05 + Math.random() * 0.07,
      driftY: 0.08 + Math.random() * 0.12,
      speedX: 0.6 + Math.random() * 0.7,
      speedY: 0.5 + Math.random() * 0.7,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      depth: 0.04 + Math.random() * 0.1,
    }
  })
}

export default function AmbientGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = BUFFER_W
    canvas.height = BUFFER_H

    const blobs = createBlobs()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 }
    const handlePointerMove = (event: PointerEvent) => {
      pointer.targetX = event.clientX / window.innerWidth
      pointer.targetY = event.clientY / window.innerHeight
    }

    if (!reduceMotion) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
    }

    let frame = 0

    const draw = (elapsed: number) => {
      pointer.x += (pointer.targetX - pointer.x) * 0.05
      pointer.y += (pointer.targetY - pointer.y) * 0.05

      const pullX = pointer.x - 0.5
      const pullY = pointer.y - 0.5
      const time = reduceMotion ? 0 : elapsed * 0.00007

      ctx.clearRect(0, 0, BUFFER_W, BUFFER_H)
      ctx.globalCompositeOperation = 'lighter'

      for (const blob of blobs) {
        const nx = blob.baseX + Math.sin(time * blob.speedX + blob.phaseX) * blob.driftX + pullX * blob.depth
        const ny = blob.baseY + Math.cos(time * blob.speedY + blob.phaseY) * blob.driftY + pullY * blob.depth

        const dx = nx - pointer.x
        const dy = ny - pointer.y
        const proximity = Math.exp(-(dx * dx + dy * dy) * 6)

        const x = nx * BUFFER_W
        const y = ny * BUFFER_H
        const radius = blob.radius * BUFFER_W * (1 + proximity * 0.22)

        const { hue, sat, light } = blob
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light + proximity * 6}%, 0.94)`)
        gradient.addColorStop(0.3, `hsla(${hue}, ${sat}%, ${light - 3}%, 0.76)`)
        gradient.addColorStop(0.55, `hsla(${hue}, ${sat - 2}%, ${light - 8}%, 0.3)`)
        gradient.addColorStop(0.8, `hsla(${hue}, ${sat - 2}%, ${light - 12}%, 0.05)`)
        gradient.addColorStop(1, `hsla(${hue}, ${sat}%, ${light - 14}%, 0)`)

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, BUFFER_W, BUFFER_H)
      }

      if (!reduceMotion) frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [])

  return (
    <div className="jw-ambient" aria-hidden="true">
      <canvas ref={canvasRef} className="jw-ambient-canvas" />
      <div className="jw-ambient-grain" />
    </div>
  )
}
