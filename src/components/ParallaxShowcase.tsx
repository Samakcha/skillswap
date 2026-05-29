'use client'

import { motion } from 'framer-motion'
import { Sparkles, HeartHandshake, ShieldCheck, Layers, Navigation, ArrowRight } from 'lucide-react'

export default function ParallaxShowcase() {
  // Storytelling steps
  const STORIES = [
    {
      id: 'why-we-exist',
      badge: 'The Vision',
      title: 'A human economy centered on mutual value.',
      description: 'In a hyper-digitized world where everything has a price tag, SkillSwap provides an alternative: a currency-free space built on genuine human connection. Your time, knowledge, and kindness are the only things that count here.',
      icon: HeartHandshake,
      color: '#FF6B00',
      align: 'left'
    },
    {
      id: 'how-it-pairs',
      badge: 'The Matching Engine',
      title: 'Hyper-local algorithms paired with simple parameters.',
      description: 'Our system analyzes teach/learn interests and maps coordinates strictly within your local neighborhood radius. We match you with nearby swapping partners so you can coordinate offline meetups within a simple 3-mile boundary.',
      icon: Navigation,
      color: '#E7C44D',
      align: 'right'
    },
    {
      id: 'safety-reputation',
      badge: 'Safety & Trust',
      title: 'Vetted profiles, peer-reviewed star histories.',
      description: 'Your safety is our priority. With complete bio portfolios, verified community feedback ratings, secure matching chat rooms, and a clear mutual code of conduct, you can share knowledge with total peace of mind.',
      icon: ShieldCheck,
      color: '#FF6B00',
      align: 'left'
    },
    {
      id: 'neighborhood-resilience',
      badge: 'The Destination',
      title: 'Rebuilding local resilience, one swap at a time.',
      description: 'By sharing knowledge directly, communities save thousands of dollars, discover hidden local talents, and foster true neighborhood reliance. The permaculturist next door or the developer down the street is your next best teacher.',
      icon: Layers,
      color: '#E7C44D',
      align: 'right'
    }
  ]

  return (
    <section 
      id="parallax-story" 
      className="relative py-32 md:py-48 px-6 bg-[#FFF5EB] border-y border-[#23162B]/5 w-full overflow-hidden z-10"
    >
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 grid-overlay" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header section title */}
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-36 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-xs font-extrabold text-[#FF6B00] uppercase tracking-widest bg-[#FF6B00]/8 px-3.5 py-1.5 rounded-full">
            Our Manifesto
          </span>
          <h2 className="font-display font-medium text-3xl sm:text-5xl text-[#23162B] tracking-tight leading-none">
            Everything you need to know <br className="hidden sm:inline" />
            about <span className="text-gradient-orange font-semibold italic">SkillSwap.</span>
          </h2>
          <p className="text-[#544A56] font-normal text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            A deep-dive look at the principles, safety layers, and engines powering our neighborhood sharing network.
          </p>
        </motion.div>

        {/* Storytelling Panels Grid */}
        <div className="space-y-32 md:space-y-48">
          {STORIES.map((story, idx) => {
            const Icon = story.icon
            
            return (
              <div 
                key={story.id} 
                className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center min-h-[300px]"
              >
                
                {/* Visual Portal Column with Slide-In animation */}
                <motion.div 
                  className={`lg:col-span-5 flex justify-center ${
                    story.align === 'right' ? 'lg:order-last' : ''
                  }`}
                  initial={{ 
                    opacity: 0, 
                    x: story.align === 'left' ? -60 : 60, 
                    rotate: story.align === 'left' ? -6 : 6, 
                    scale: 0.95,
                    filter: 'blur(4px)'
                  }}
                  whileInView={{ 
                    opacity: 1, 
                    x: 0, 
                    rotate: 0, 
                    scale: 1,
                    filter: 'blur(0px)'
                  }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Floating decorative portal card */}
                  <div className="relative group w-full max-w-[320px] aspect-square rounded-[32px] bg-[#FFFCF9] border border-[#23162B]/8 flex items-center justify-center overflow-hidden hover:border-[#23162B]/15 transition-all duration-300 shadow-[0_15px_35px_rgba(35,22,43,0.04)]">
                    
                    {/* Glowing radial backdrop inside portal */}
                    <div 
                      className="absolute -inset-10 opacity-[0.03] group-hover:opacity-[0.06] blur-2xl transition-opacity duration-500"
                      style={{ background: `radial-gradient(circle, ${story.color} 0%, transparent 70%)` }}
                    />
                    
                    {/* Concentric rings */}
                    <div className="absolute w-[240px] h-[240px] rounded-full border border-[#23162B]/5 animate-pulse" />
                    <div className="absolute w-[180px] h-[180px] rounded-full border border-[#23162B]/5 border-dashed" />
                    
                    {/* Central Icon */}
                    <div 
                      className="w-20 h-20 rounded-[24px] flex items-center justify-center shadow-sm relative z-10 hover:scale-105 transition-transform duration-300"
                      style={{ 
                        background: story.color === '#FF6B00' ? 'rgba(255, 107, 0, 0.08)' : 'rgba(231, 196, 77, 0.15)',
                        color: story.color === '#FF6B00' ? '#FF6B00' : '#23162B'
                      }}
                    >
                      <Icon className="w-10 h-10" />
                    </div>

                    {/* Numeric tag */}
                    <span className="absolute bottom-5 right-6 text-xs text-[#544A56]/30 font-display font-bold">
                      STORY_0{idx + 1}
                    </span>
                  </div>
                </motion.div>

                {/* Text Story Column with Glide-Up animation */}
                <motion.div 
                  className={`lg:col-span-7 space-y-6 text-center lg:text-left`}
                  initial={{ opacity: 0, y: 45, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                >
                  <div className="inline-flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: story.color }} />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#544A56]/60">
                      {story.badge}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-2xl sm:text-3.5xl text-[#23162B] tracking-tight leading-snug">
                    {story.title}
                  </h3>

                  <p className="text-[#544A56] font-normal text-sm sm:text-base leading-relaxed">
                    {story.description}
                  </p>

                  <div className="pt-4 flex justify-center lg:justify-start">
                    <a
                      href="/auth/signup"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#544A56] hover:text-[#23162B] transition-colors group cursor-pointer"
                    >
                      <span>Join to experience this</span>
                      <ArrowRight className="w-4 h-4 text-[#FF6B00] group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </motion.div>

              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
