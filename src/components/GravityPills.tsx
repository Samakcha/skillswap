'use client'

import { useEffect, useRef, useState } from "react"
import Matter from "matter-js"

interface PillItem {
  text: string
  bg: string
  textCol: string
  border: string
}

const PILLS_DATA: PillItem[] = [
  { text: "BAKING", bg: "bg-[#FF4D00]", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "YOGA", bg: "bg-black", textCol: "text-[#FF4D00]", border: "border-[#FF4D00]" },
  { text: "NEXT.JS", bg: "bg-white", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "WOODWORK", bg: "bg-black", textCol: "text-white", border: "border-white/10" },
  { text: "MUSIC", bg: "bg-[#FF4D00]", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "MECHANICS", bg: "bg-white", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "COOKING", bg: "bg-black", textCol: "text-[#FF4D00]", border: "border-[#FF4D00]" },
  { text: "CODING", bg: "bg-[#FF4D00]", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "MEDITATION", bg: "bg-white", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "SEWING", bg: "bg-black", textCol: "text-white", border: "border-white/10" },
  { text: "SQL", bg: "bg-[#FF4D00]", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "AI", bg: "bg-black", textCol: "text-[#FF4D00]", border: "border-[#FF4D00]" },
  { text: "UI/UX", bg: "bg-white", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "DANCE", bg: "bg-black", textCol: "text-white", border: "border-white/10" },
  { text: "COFFEE", bg: "bg-[#FF4D00]", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "PLANTS", bg: "bg-white", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "PHOTOS", bg: "bg-black", textCol: "text-[#FF4D00]", border: "border-[#FF4D00]" },
  { text: "CLAY", bg: "bg-black", textCol: "text-white", border: "border-white/10" },
  { text: "WRITING", bg: "bg-[#FF4D00]", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "FRENCH", bg: "bg-white", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "MATH", bg: "bg-black", textCol: "text-[#FF4D00]", border: "border-[#FF4D00]" },
  { text: "CHESS", bg: "bg-black", textCol: "text-white", border: "border-white/10" },
  { text: "GUITAR", bg: "bg-[#FF4D00]", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "SKATE", bg: "bg-white", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "DESIGN", bg: "bg-black", textCol: "text-[#FF4D00]", border: "border-[#FF4D00]" },
  { text: "HTML", bg: "bg-black", textCol: "text-white", border: "border-white/10" },
  { text: "CSS", bg: "bg-[#FF4D00]", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "SEO", bg: "bg-white", textCol: "text-black", border: "border-black shadow-[3px_3px_0px_#000000]" },
  { text: "DOGS", bg: "bg-black", textCol: "text-[#FF4D00]", border: "border-[#FF4D00]" },
  { text: "FILM", bg: "bg-black", textCol: "text-white", border: "border-white/10" }
]

export default function GravityPills({ asBackground = false }: { asBackground?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])
  const [measured, setMeasured] = useState(false)

  // Initialize measured array
  pillRefs.current = pillRefs.current.slice(0, PILLS_DATA.length)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let engine: Matter.Engine
    let runner: Matter.Runner
    let rafId: number
    let isInitialized = false
    let currentWidth = 0
    let currentHeight = 0

    let ground: Matter.Body
    let leftWall: Matter.Body
    let rightWall: Matter.Body
    let ceiling: Matter.Body
    let bodiesData: { body: Matter.Body; el: HTMLDivElement; width: number; height: number }[] = []

    const initPhysics = (startWidth: number, startHeight: number) => {
      currentWidth = startWidth
      currentHeight = startHeight
      const Engine = Matter.Engine
      const World = Matter.World
      const Bodies = Matter.Bodies
      const Composite = Matter.Composite
      const Mouse = Matter.Mouse
      const MouseConstraint = Matter.MouseConstraint
      const Runner = Matter.Runner

      engine = Engine.create({
        gravity: { y: 0.8 }
      })

      // Increase solver iterations to prevent tunneling under high-speed drags/tosses
      engine.positionIterations = 10
      engine.velocityIterations = 10

      // Ultra-thick, overlapping static boundaries (300px thickness, 2000px overflow lengths)
      // This forms a completely airtight, gapless bounding box sealing all corners and sides perfectly.
      // - Ground: Top surface is exactly y = startHeight
      // - Left Wall: Right surface is exactly x = 0
      // - Right Wall: Left surface is exactly x = startWidth
      // - Ceiling: Bottom surface is exactly y = 0
      ground = Bodies.rectangle(startWidth / 2, startHeight + 150, startWidth + 2000, 300, { isStatic: true, friction: 0.2 })
      leftWall = Bodies.rectangle(-150, startHeight / 2, 300, startHeight + 2000, { isStatic: true, friction: 0.2 })
      rightWall = Bodies.rectangle(startWidth + 150, startHeight / 2, 300, startHeight + 2000, { isStatic: true, friction: 0.2 })
      ceiling = Bodies.rectangle(startWidth / 2, -150, startWidth + 2000, 300, { isStatic: true })

      // 1. Measure the pills in DOM now that we have valid container size
      const rects = pillRefs.current.map((el) => {
        if (!el) return { width: 100, height: 32 }
        const rect = el.getBoundingClientRect()
        return { width: rect.width || 100, height: rect.height || 32 }
      })
      setMeasured(true)

      // 2. Create bodies for each pill with rounded capsule corner boundary box (chamfer)
      bodiesData = rects.map((rect, idx) => {
        // Scatter initial positions staggered below the ceiling directly inside the viewport
        const x = Math.random() * (startWidth - 160) + 80
        
        // Scale the spawn height to be safely within the top 50% of the viewport (between y = 40 and y = startHeight * 0.5)
        // This guarantees all 30 pills spawn cleanly inside the box regardless of container dimensions
        const spawnRangeY = (startHeight * 0.5) - 40
        const y = 40 + (idx / PILLS_DATA.length) * spawnRangeY
        
        const body = Bodies.rectangle(x, y, rect.width, rect.height, {
          restitution: 0.4, // bouncy
          friction: 0.08,
          frictionAir: 0.015,
          chamfer: { radius: rect.height / 2 } // round collision box
        })

        return {
          body,
          el: pillRefs.current[idx]!,
          width: rect.width,
          height: rect.height
        }
      })

      // 3. Add to simulation world
      Composite.add(engine.world, [
        ground,
        leftWall,
        rightWall,
        ceiling,
        ...bodiesData.map(b => b.body)
      ])

      // 4. Integrate mouse constraints for dragging
      const mouse = Mouse.create(container)
      const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
          stiffness: 0.15,
          render: { visible: false }
        }
      })

      Composite.add(engine.world, mouseConstraint)

      // Disable standard scroll wheel capture to preserve normal page scrolling
      // @ts-ignore
      if (mouse.element) {
        // @ts-ignore
        mouse.element.removeEventListener("mousewheel", mouse.mousewheel)
        // @ts-ignore
        mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel)
      }

      // 5. Fire up Matter.js runner and clamp positions against leakage
      Matter.Events.on(engine, "afterUpdate", () => {
        bodiesData.forEach(({ body, width, height }) => {
          const halfW = width / 2
          const halfH = height / 2

          let clampedX = body.position.x
          let clampedY = body.position.y
          let changed = false

          if (clampedX < halfW) {
            clampedX = halfW
            changed = true
          } else if (clampedX > currentWidth - halfW) {
            clampedX = currentWidth - halfW
            changed = true
          }

          if (clampedY < halfH) {
            clampedY = halfH
            changed = true
          } else if (clampedY > currentHeight - halfH) {
            clampedY = currentHeight - halfH
            changed = true
          }

          if (changed) {
            Matter.Body.setPosition(body, { x: clampedX, y: clampedY })
            
            // Re-calculate velocity to bounce slightly off bounds instead of escaping
            let vx = body.velocity.x
            let vy = body.velocity.y
            if ((body.position.x <= halfW && vx < 0) || (body.position.x >= currentWidth - halfW && vx > 0)) {
              vx = -vx * 0.2
            }
            if ((body.position.y <= halfH && vy < 0) || (body.position.y >= currentHeight - halfH && vy > 0)) {
              vy = -vy * 0.2
            }
            Matter.Body.setVelocity(body, { x: vx, y: vy })
          }
        })
      })

      runner = Runner.create()
      Runner.run(runner, engine)

      // 6. Fluid requestAnimationFrame loop for DOM synchronization
      const updatePhysics = () => {
        bodiesData.forEach(({ body, el, width: w, height: h }) => {
          if (!el) return
          const { x, y } = body.position
          const angle = body.angle
          el.style.opacity = "1"
          el.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0) rotate(${angle}rad)`
        })
        rafId = requestAnimationFrame(updatePhysics)
      }

      rafId = requestAnimationFrame(updatePhysics)
      isInitialized = true
    }

    // 7. ResizeObserver to keep boundaries matched to viewport perfectly
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect
        if (w === 0 || h === 0) continue

        if (!isInitialized) {
          initPhysics(w, h)
        } else {
          currentWidth = w
          currentHeight = h
          // Keep boundaries perfectly locked on container bounds during viewport changes
          Matter.Body.setPosition(ground, { x: w / 2, y: h + 150 })
          Matter.Body.setPosition(rightWall, { x: w + 150, y: h / 2 })
          Matter.Body.setPosition(leftWall, { x: -150, y: h / 2 })
          Matter.Body.setPosition(ceiling, { x: w / 2, y: -150 })
        }
      }
    })

    resizeObserver.observe(container)

    // Cleanup
    return () => {
      resizeObserver.disconnect()
      if (isInitialized) {
        cancelAnimationFrame(rafId)
        Matter.Runner.stop(runner)
        Matter.Engine.clear(engine)
        Matter.World.clear(engine.world, false)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={
        asBackground
          ? "absolute inset-0 w-full h-full bg-transparent overflow-hidden select-none touch-none"
          : "relative w-full h-[480px] bg-[#070709] border-2 border-black rounded-[2.5rem] shadow-[8px_8px_0px_#000000] overflow-hidden select-none touch-none skillswap-grid-bg skillswap-grid-bg-sm"
      }
    >
      {/* Decorative Glow inside */}
      {!asBackground && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#FF4D00]/5 blur-[90px] pointer-events-none" />
      )}

      {/* Interactive Helper Text */}
      {!asBackground && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold text-white/20 uppercase tracking-widest pointer-events-none select-none">
          🔋 Grab, Toss, and Swap Active Neighborhood Skills
        </div>
      )}

      {PILLS_DATA.map((pill, index) => (
        <div
          key={pill.text}
          ref={(el) => {
            pillRefs.current[index] = el
          }}
          className={`absolute px-4 py-2 rounded-full font-display font-black text-[10px] sm:text-xs uppercase tracking-tight border-2 select-none pointer-events-auto transition-opacity duration-300 ${pill.bg} ${pill.textCol} ${pill.border} ${
            measured ? "opacity-100" : "opacity-0"
          }`}
          style={{
            left: 0,
            top: 0,
            transformOrigin: "center center",
            willChange: "transform, opacity"
          }}
        >
          {pill.text}
        </div>
      ))}
    </div>
  )
}
