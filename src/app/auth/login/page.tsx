"use client"

import { createClient } from '@/lib/supabase'
import SplitText from '@/components/SplitText'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, ArrowRight, MapPin, ShieldCheck, Clock, CheckCircle } from 'lucide-react'
import CardSwap from '@/components/CardSwap'

// Framer Motion Animation Presets
const FADE_UP = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
}

const CONTAINER_STAGGER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
}

const BACKGROUND_VIDEO_SRC = 'https://player.vimeo.com/video/1196908707?h=fed589ba2b&autoplay=1&loop=1&muted=1&playsinline=1&controls=0&badge=0&byline=0&portrait=0&title=0&transparent=1&dnt=1&api=1'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // State variables for fields and states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [redirectMessage, setRedirectMessage] = useState('Connecting handshake...')
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('signup_success') === 'true') {
        setSignupSuccess(true)
      }
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('vimeo.com')) return
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'play' || data.event === 'playing') {
          setIsVideoLoaded(true)
        }
      } catch (e) {
        // Safe to ignore non-JSON messages
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    // Fallback safety timeout (2 seconds)
    const fallbackTimer = setTimeout(() => {
      setIsVideoLoaded(true)
    }, 2000)
    
    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(fallbackTimer)
    }
  }, [])


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSignupSuccess(false)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setRedirectMessage('Retrieving neighbor profile...')
    // Proactively pre-cache profile in localStorage for instant dashboard transition!
    if (data?.user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        if (profile && typeof window !== 'undefined') {
          localStorage.setItem('skillswap_profile', JSON.stringify(profile))
        }
      } catch (e) {
        console.error('Failed to pre-cache profile on login:', e)
      }
    }

    setRedirectMessage('Handshake verified. Launching Hub...')
    setIsRedirecting(true)

    setTimeout(() => {
      router.push('/dashboard')
    }, 1100)
  }

  return (
    <main className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-[#FF4D00] selection:text-black relative overflow-hidden">
      
      {/* 0. Full-width Immersive Background Video with Autoplay Recovery & 10s Rewind */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none select-none">
        <iframe
          src={BACKGROUND_VIDEO_SRC}
          onLoad={() => setIsVideoLoaded(true)}
          className={`vimeo-background-iframe grayscale contrast-125 transition-opacity duration-1000 ${
            isVideoLoaded ? 'opacity-15' : 'opacity-0'
          }`}

          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        />

        {/* Color overlay matching landing page tinting */}
        <div className="absolute inset-0 bg-[#FF4D00] mix-blend-color opacity-30 pointer-events-none" />
      </div>

      {/* 2. Kinetic Orange Shifting Auras */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/12 blur-[120px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/8 blur-[130px] pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        {isRedirecting ? (
          <motion.div
            key="redirect-loader"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md mx-auto bg-black/90 border-2 border-white/10 rounded-[2rem] p-6 sm:p-9 z-10 shadow-[10px_10px_0px_#FF4D00] relative backdrop-blur-3xl flex flex-col items-center justify-center text-center gap-6 min-h-[420px]"
          >
            <div className="relative z-10 space-y-6 flex flex-col items-center w-full">
              {/* Concentric Brand Logo */}
              <div className="w-14 h-14 rounded-xl bg-[#FF4D00] border-2 border-black flex items-center justify-center shadow-lg relative group shadow-[4px_4px_0px_#FFFFFF]">
                <Layers className="w-6 h-6 text-black stroke-[2.5px]" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none">
                  PING | AUTH VERIFIED
                </div>
                <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight leading-none">
                  {redirectMessage}
                </h2>
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest pl-1 font-bold">
                  Synchronizing neighborhood swaps...
                </p>
              </div>

              {/* Kinetic Ping-Pong Loader */}
              <div className="flex items-center justify-center gap-12 h-16 relative w-48 border-2 border-black rounded-xl bg-black px-4 mt-4 shadow-[4px_4px_0px_#FF4D00]">
                {/* Left Paddle */}
                <motion.div 
                  animate={{ y: [-12, 12, -12] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-7 bg-[#FF4D00] rounded-full shrink-0"
                />
                {/* Bouncing Ball */}
                <motion.div 
                  animate={{ x: [-48, 48, -48], y: [-6, 6, -6] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 bg-white rounded-full shadow-[0_0_8px_#FF4D00] shrink-0"
                />
                {/* Right Paddle */}
                <motion.div 
                  animate={{ y: [12, -12, 12] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-7 bg-[#FF4D00] rounded-full shrink-0"
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="login-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 bg-black/80 border border-white/10 rounded-[2rem] p-3 sm:p-5 lg:p-6 z-10 shadow-[10px_10px_0px_#FF4D00] relative backdrop-blur-3xl"
          >
            {/* LEFT COLUMN: Sidebar Active CardSwap Showcase */}
            <div className="lg:col-span-5 relative overflow-hidden rounded-[1.5rem] bg-gradient-to-tr from-[#1C0902] via-[#080402] to-black p-6 border border-white/10 flex flex-col justify-between min-h-[440px] lg:min-h-[520px] group">
              {/* Giant Ping Pong Volley Watermark */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] font-display font-black text-[9rem] leading-none uppercase select-none text-transparent stroke-white stroke-2 flex flex-col justify-between py-12">
                <span className="-translate-x-4 tracking-tighter">PING</span>
                <span className="translate-x-12 tracking-tighter">PONG</span>
              </div>

              {/* Internal Glowing Blob */}
              <div className="absolute -top-32 -left-32 w-[350px] h-[350px] rounded-full bg-[#FF4D00]/15 blur-[90px] pointer-events-none group-hover:bg-[#FF4D00]/20 transition-all duration-700" />
              <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#FF4D00]/5 blur-[80px] pointer-events-none" />

              {/* Core Content */}
              <div className="relative z-10 flex flex-col h-full justify-between">
                {/* Concentric Brand Logo */}
                <div className="flex items-center justify-between">
                  <Link href="/" prefetch={true} className="inline-flex items-center gap-3 group/logo select-none">
                    <span className="font-display font-bold text-2xl tracking-tighter uppercase text-white group-hover/logo:text-[#FF4D00] transition-colors duration-300">
                      SKILLSWAP
                    </span>
                  </Link>
                  <div className="px-3 py-1 border border-[#FF4D00]/20 rounded-full font-mono text-[8px] font-bold uppercase tracking-widest text-[#FF4D00]/95 bg-[#FF4D00]/5">
                    PING: CONNECT HANDSHAKE
                  </div>
                </div>

                {/* Premium Interactive Live Preview */}
                <div className="flex-1 flex items-center justify-center py-4 scale-80 sm:scale-85 lg:scale-90">
                  <CardSwap 
                    delay={4200}
                    cardDistance={20}
                    verticalDistance={18}
                    skewAmount={1.5}
                    pauseOnHover={true}
                  />
                </div>

                {/* Bottom Dock Navigation & Welcome Indicators */}
                <div className="space-y-4">
                  <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-white/50">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
                      <span>ACCESS GATEWAY</span>
                    </div>
                    <span className="text-[#FF4D00] font-black uppercase font-mono text-[8px] tracking-wider">SECURE SSL CONNECTION</span>
                  </div>

                  {/* Home Return Button */}
                  <div>
                    <Link 
                      href="/" 
                      prefetch={true}
                      className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-[#FF4D00] hover:text-white transition-colors duration-200 uppercase tracking-widest group"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                      <span>Back to home</span>
                    </Link>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: Login Form Panel */}
            <div className="lg:col-span-7 flex flex-col justify-center px-2 py-3 sm:p-5 lg:p-6 relative z-10">
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={CONTAINER_STAGGER}
                className="w-full max-w-md mx-auto space-y-6"
              >
                
                {/* Header Titles */}
                <motion.div variants={FADE_UP} className="space-y-2.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none">
                    PONG | SECURE AUTHENTICATION
                  </div>
                  <h1 className="font-display font-black text-white text-[2.2rem] tracking-tight uppercase leading-none">
                    <SplitText
                      text="Log In"
                      className="text-white inline-block"
                      delay={40}
                      duration={0.6}
                      ease="power3.out"
                      textAlign="left"
                      tag="span"
                    />
                  </h1>
                  <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">
                    Enter your credentials to connect back into the loop.
                  </p>
                </motion.div>

                {/* Login Form */}
                <motion.form variants={FADE_UP} onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Errors Display */}
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono uppercase tracking-wide flex items-start gap-2.5"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Success Notification */}
                  <AnimatePresence mode="wait">
                    {signupSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono uppercase tracking-wide flex items-start gap-2.5"
                      >
                        <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-bold text-white">ACCOUNT CREATED SUCCESS!</span>
                          <span className="block text-[10px] text-emerald-400/80 mt-0.5">Please sign in with your credentials to get started.</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                      Email Address
                    </label>
                    <div className="relative group">
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder="eg. johnfrans@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                    </div>
                  </div>

                  {/* Password Field with Eye Toggle */}
                  <div className="space-y-2 relative">
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="password" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50">
                        Password
                      </label>
                      <Link href="#" className="text-[10px] font-mono uppercase text-[#FF4D00] hover:text-white transition-colors hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative group">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 pr-12 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1 cursor-pointer z-10"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 py-4 px-4 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest rounded-xl border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin text-black shrink-0" />
                        <span>HANDSHAKE INITIALIZING...</span>
                      </>
                    ) : (
                      <span className="flex items-center gap-2 relative z-10 select-none">
                        <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 mr-1 text-[#FF4D00] group-hover/btn:text-black">🏓</span>
                        <span>LOG IN TO SWAP</span>
                        <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 ml-1 text-[#FF4D00] group-hover/btn:text-black">🏓</span>
                      </span>
                    )}
                    {/* Visual bouncing ball overlay sweep */}
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/btn:opacity-15 transition-opacity duration-300 bg-gradient-to-r from-transparent via-[#FF4D00]/40 to-transparent animate-[marquee-left_1.5s_linear_infinite]" />
                  </button>

                </motion.form>

                {/* Footer Back Links */}
                <motion.div variants={FADE_UP} className="text-center pt-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-white/50">
                    Don't have an account?{' '}
                    <Link href="/auth/signup" className="text-[#FF4D00] hover:text-white font-bold ml-1 transition-colors hover:underline">
                      Join Swap
                    </Link>
                  </p>
                </motion.div>

              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
