'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Heart, ArrowUpRight } from 'lucide-react'

interface CardData {
  id: number
  avatarColor: string
  name: string
  location: string
  title: string
  description: string
  tags: string[]
  likes: number
  isLiked?: boolean
}

const CARDS_DATA: CardData[] = [
  {
    id: 1,
    avatarColor: 'from-[#FF4D00] to-[#FF9A3C]',
    name: 'PRIYA SHARMA',
    location: '560037 • NEARBY',
    title: 'GUITAR LESSONS FOR BEGINNERS',
    description: 'Happy to teach beginner acoustic guitar on weekends. Bring your own guitar if possible.',
    tags: ['TEACHING', 'ACOUSTIC', 'WEEKEND', 'BEGINNER FRIENDLY'],
    likes: 24,
    isLiked: false
  },
  {
    id: 2,
    avatarColor: 'from-[#FF9A3C] to-[#E7C44D]',
    name: 'DAVID MILLER',
    location: '560012 • 0.8 MILES AWAY',
    title: 'HOMEMADE PASTA WORKSHOP',
    description: 'Learn the art of hand-rolling fresh egg pasta from scratch. I supply all organic semolina flour!',
    tags: ['TEACHING', 'CULINARY', 'MUTUAL', 'FLOUR PROVIDED'],
    likes: 15,
    isLiked: false
  },
  {
    id: 3,
    avatarColor: 'from-pink-500 to-[#FF4D00]',
    name: 'SARAH JENKINS',
    location: '560045 • 1.2 MILES AWAY',
    title: 'UI/UX PORTFOLIO REVIEW',
    description: 'Senior designer offering portfolio critiques, Figma alignment advice, and resume audits.',
    tags: ['TEACHING', 'DESIGN', 'TECH', 'CAREER HELP'],
    likes: 32,
    isLiked: false
  },
  {
    id: 4,
    avatarColor: 'from-[#E7C44D] to-emerald-500',
    name: 'MARCUS STERLING',
    location: '560078 • 1.9 MILES AWAY',
    title: 'SPANISH CONVERSATION PRACTICE',
    description: 'Native speaker happy to trade casual conversation coaching for sourdough baking tips.',
    tags: ['LOOKING TO SWAP', 'LANGUAGES', 'WEEKDAY', 'INTERACTIVE'],
    likes: 19,
    isLiked: false
  }
]

interface CardSwapProps {
  delay?: number
  cardDistance?: number
  verticalDistance?: number
  skewAmount?: number
  pauseOnHover?: boolean
  easing?: string
  interactiveButtons?: boolean
}

export default function CardSwap({
  delay = 4500,
  cardDistance = 28,
  verticalDistance = 26,
  skewAmount = 2,
  pauseOnHover = true,
  easing = 'elastic',
  interactiveButtons = true
}: CardSwapProps) {
  const [cards, setCards] = useState<CardData[]>(CARDS_DATA)
  const [isAnimating, setIsAnimating] = useState(false)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([])
  const [showDragHint, setShowDragHint] = useState(false)
  const [hintPos, setHintPos] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isHoveredRef = useRef<boolean>(false)
  const lastWheelTime = useRef<number>(0)

  // Drag state refs
  const isDragging = useRef<boolean>(false)
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Function to perform the swap animation using GSAP
  const triggerSwap = (direction: 'left' | 'right' = 'right') => {
    if (cardsRef.current.length < 2 || isAnimating) return
    setIsAnimating(true)

    const topCard = cardsRef.current[0]
    if (!topCard) {
      setIsAnimating(false)
      return
    }

    // Easing selection
    const gsapEase = easing === 'elastic' ? 'elastic.out(1, 0.75)' : 'power2.out'
    const slideX = direction === 'right' ? 380 : -380
    const targetSkew = direction === 'right' ? skewAmount * 3 : -skewAmount * 3

    // GSAP Timeline to animate top card sliding out sideways, and shifting back under
    const tl = gsap.timeline({
      onComplete: () => {
        // Rotate cards array: shift first card to the end
        setCards((prev) => {
          const next = [...prev]
          const first = next.shift()
          if (first) next.push(first)
          return next
        })
        setIsAnimating(false)
      }
    })

    // 1. Slide top card out horizontally and fade out
    tl.to(topCard, {
      x: slideX,
      y: verticalDistance * 0.4,
      rotation: targetSkew,
      scale: 0.95,
      opacity: 0,
      duration: 0.55,
      ease: 'power2.inOut'
    })

    // 2. Animate the remaining cards moving up in the stack
    cardsRef.current.slice(1).forEach((card, index) => {
      if (!card) return
      
      const newPos = index // Position index in the upcoming array state
      const targetScale = 1 - newPos * 0.05
      const targetY = newPos * -verticalDistance
      const targetX = newPos * -cardDistance
      const targetRotation = newPos * -skewAmount

      tl.to(card, {
        x: targetX,
        y: targetY,
        scale: targetScale,
        rotation: targetRotation,
        duration: 0.5,
        ease: gsapEase
      }, 0.12) // Stagger start slightly
    })
  }

  // Setup loop timer
  useEffect(() => {
    const runTimer = () => {
      timerRef.current = setTimeout(() => {
        if (!isHoveredRef.current || !pauseOnHover) {
          triggerSwap('right')
        } else {
          runTimer() // Try again next interval
        }
      }, delay)
    }

    if (!isDragging.current) {
      runTimer()
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [cards, delay, pauseOnHover])

  // Apply initial / static stack transformations when cards array state changes
  useEffect(() => {
    if (isDragging.current) return

    cardsRef.current.forEach((card, index) => {
      if (!card) return
      
      // Calculate depth layers
      const targetScale = 1 - index * 0.05
      const targetY = index * -verticalDistance
      const targetX = index * -cardDistance
      const targetRotation = index * -skewAmount

      gsap.set(card, {
        x: targetX,
        y: targetY,
        scale: targetScale,
        rotation: targetRotation,
        zIndex: 100 - index,
        opacity: index > 2 ? 0 : 1 // Hide cards deeper than 3 stack levels
      })
    })
  }, [cards, cardDistance, verticalDistance, skewAmount])

  // Drag event handlers (Mouse / Touch)
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    if (idx !== 0 || isAnimating) return

    // Prevent dragging when clicking interactive buttons
    const target = e.target as HTMLElement
    if (target.closest('.interactive-btn') || target.closest('button') || target.closest('a')) {
      return
    }

    isDragging.current = true
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    startPos.current = { x: clientX, y: clientY }
    dragOffset.current = { x: 0, y: 0 }

    // Clear auto timer
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    dragOffset.current = { x: deltaX, y: deltaY }

    const topCard = cardsRef.current[0]
    if (!topCard) return

    // Apply real-time movement and rotational skew based on horizontal displacement
    gsap.set(topCard, {
      x: deltaX,
      y: deltaY * 0.2, // Dampen vertical dragging
      rotation: (deltaX / 350) * 15,
      cursor: 'grabbing'
    })
  }

  const handleDragEnd = () => {
    if (!isDragging.current) return
    isDragging.current = false

    const topCard = cardsRef.current[0]
    if (!topCard) return

    const deltaX = dragOffset.current.x

    if (Math.abs(deltaX) > 110) {
      // Trigger swap horizontally
      triggerSwap(deltaX > 0 ? 'right' : 'left')
    } else {
      // Snap back smoothly
      gsap.to(topCard, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.35,
        ease: 'power3.out'
      })
    }
  }

  // Intercept scroll-wheel vertical & horizontal scrolling over the cards
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now()
    if (now - lastWheelTime.current < 850) return // Throttled cooldown to prevent fast-skipping

    const scrollThreshold = 15
    const absX = Math.abs(e.deltaX)
    const absY = Math.abs(e.deltaY)

    if (absX > scrollThreshold || absY > scrollThreshold) {
      lastWheelTime.current = now
      // Determine swipe direction: scroll down or right goes right, scroll up or left goes left
      const direction = (e.deltaX > 0 || e.deltaY > 0) ? 'right' : 'left'
      
      // Visual feedback: briefly slide cards slightly, then complete swap
      triggerSwap(direction)
    }
  }

  // Handle Likes action & Emit beautiful floating heart particle
  const handleLike = (e: React.MouseEvent, cardId: number) => {
    e.stopPropagation()
    e.preventDefault()

    // Toggle liked state & increment counter
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          isLiked: !c.isLiked,
          likes: c.isLiked ? c.likes - 1 : c.likes + 1
        }
      }
      return c
    }))

    // Get click coordinates relative to the card container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const newParticle = {
        id: Date.now() + Math.random(),
        x,
        y
      }
      
      setParticles(prev => [...prev, newParticle])
      
      // Cleanup particle after animation finishes
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== newParticle.id))
      }, 1000)
    }
  }

  // Handle dynamic cursor label coordinates on mouse hover
  const handleMouseMoveContainer = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setHintPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-[420px] h-[300px] sm:h-[340px] md:h-[360px] flex items-center justify-center cursor-grab select-none active:cursor-grabbing overflow-visible"
      onMouseEnter={() => { 
        isHoveredRef.current = true
        setShowDragHint(true)
      }}
      onMouseLeave={() => { 
        isHoveredRef.current = false
        setShowDragHint(false)
        handleDragEnd() 
      }}
      onMouseMove={(e) => {
        handleMouseMoveContainer(e)
        handleDragMove(e)
      }}
      onMouseUp={handleDragEnd}
      onTouchStart={(e) => handleDragStart(e, 0)}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onWheel={handleWheel}
    >
      {/* 1. CUSTOM BRAND CURSOR / FLOATING HINT */}
      {showDragHint && !isAnimating && (
        <div 
          className="absolute z-50 pointer-events-none bg-black text-white font-mono text-[9px] font-black px-3 py-1.5 rounded-full border border-[#FF4D00] shadow-xl uppercase tracking-widest whitespace-nowrap opacity-90 transition-opacity duration-300 hidden md:block"
          style={{
            left: hintPos.x + 18,
            top: hintPos.y + 18,
          }}
        >
          👋 DRAG OR SCROLL TO SWAP
        </div>
      )}

      {/* 2. FLOATING HEART PARTICLES */}
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute z-50 pointer-events-none text-3xl animate-float-up text-[#FF4D00]"
          style={{
            left: p.x - 16,
            top: p.y - 16,
          }}
        >
          🧡
        </span>
      ))}

      {/* 3. ABSOLUTE PERSPECTIVE STACK */}
      {cards.map((card, idx) => {
        const isTop = idx === 0
        return (
          <div
            key={card.id}
            ref={(el) => { cardsRef.current[idx] = el }}
            onMouseDown={(e) => handleDragStart(e, idx)}
            onTouchStart={(e) => handleDragStart(e, idx)}
            className={`absolute w-[min(82vw,320px)] sm:w-[360px] bg-[#FFFCF9] border-2 border-black p-4 sm:p-6 shadow-[6px_6px_0px_#000000] rounded-2xl flex flex-col justify-between h-[240px] sm:h-[270px] select-none ${
              isTop ? 'z-40 hover:shadow-[10px_10px_0px_#000000] transition-shadow duration-300' : ''
            }`}
          >
            {/* Top row - Avatar, metadata & Like button */}
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-3">
                {/* Avatar circular gradient */}
                <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${card.avatarColor} border-2 border-black shadow-inner`} />
                <div>
                  <h5 className="font-display font-black text-[11px] tracking-tight text-black leading-tight">
                    {card.name}
                  </h5>
                  <p className="font-mono text-[9px] font-black text-black/55 uppercase tracking-widest mt-0.5">
                    {card.location}
                  </p>
                </div>
              </div>

              {/* High-impact brutalist Heart Like Button */}
              <button 
                onClick={(e) => handleLike(e, card.id)}
                className={`interactive-btn flex items-center gap-1.5 px-3 py-1.5 border border-black rounded-full font-mono text-[10px] font-black transition-all active:scale-90 cursor-pointer ${
                  card.isLiked 
                    ? 'bg-[#FF4D00] text-white border-[#FF4D00]' 
                    : 'bg-white text-black hover:bg-black/5'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${card.isLiked ? 'fill-current stroke-none animate-pulse' : 'stroke-[2.5px]'}`} />
                <span>{card.likes}</span>
              </button>
            </div>

            {/* Middle Skill context */}
            <div className="my-3.5 space-y-1.5 flex-1">
              <h4 className="font-display font-black text-sm text-black leading-snug uppercase tracking-tight line-clamp-1">
                {card.title}
              </h4>
              <p className="font-sans text-[11px] text-black/85 leading-relaxed font-semibold line-clamp-2">
                {card.description}
              </p>
            </div>

            {/* Bottom tag row & CTA */}
            <div className="flex items-center justify-between gap-2 border-t border-black/5 pt-4">
              <div className="flex flex-wrap gap-1 max-w-[200px] sm:max-w-[220px]">
                {card.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#FF4D00]/10 border border-[#FF4D00]/25 text-black font-mono text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Request Action link */}
              {interactiveButtons ? (
                <a 
                  href="/auth/signup"
                  className="interactive-btn shrink-0 group flex items-center gap-1 bg-black text-white hover:bg-[#FF4D00] hover:text-white font-mono text-[9px] font-black px-3.5 py-2 rounded-full border border-black transition-all active:scale-95 duration-200 uppercase tracking-tight"
                >
                  <span>Swap</span>
                  <ArrowUpRight className="w-3 h-3 stroke-[3px] group-hover:rotate-45 transition-transform duration-200" />
                </a>
              ) : (
                <div 
                  className="interactive-btn shrink-0 group flex items-center gap-1 bg-black text-white hover:bg-[#FF4D00] hover:text-white font-mono text-[9px] font-black px-3.5 py-2 rounded-full border border-black transition-all duration-200 uppercase tracking-tight cursor-default select-none"
                >
                  <span>Swap</span>
                  <ArrowUpRight className="w-3 h-3 stroke-[3px] group-hover:rotate-45 transition-transform duration-200" />
                </div>
              )}
            </div>

          </div>
        )
      })}
    </div>
  )
}
