'use client'

import LiquidEther from '@/components/LiquidEther'

type BackgroundLiquidEtherProps = {
  intensity?: 'hero' | 'subtle'
  className?: string
}

const SKILLSWAP_ETHER_COLORS = ['#FF4D00', '#FF9A3C', '#E7C44D', '#FFFFFF']

export default function BackgroundLiquidEther({
  intensity = 'subtle',
  className = ''
}: BackgroundLiquidEtherProps) {
  const isHero = intensity === 'hero'

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      <LiquidEther
        colors={SKILLSWAP_ETHER_COLORS}
        mouseForce={isHero ? 18 : 14}
        cursorSize={isHero ? 140 : 110}
        resolution={0.42}
        isViscous={false}
        iterationsViscous={24}
        iterationsPoisson={24}
        autoDemo={true}
        autoSpeed={isHero ? 0.55 : 0.42}
        autoIntensity={isHero ? 2.4 : 1.8}
        takeoverDuration={0.25}
        autoResumeDelay={2400}
        autoRampDuration={0.7}
        className="skillswap-liquid-ether"
      />
    </div>
  )
}
