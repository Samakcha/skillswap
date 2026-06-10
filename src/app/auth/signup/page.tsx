"use client"

import { createClient } from '@/lib/supabase'
import SplitText from '@/components/SplitText'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, User, Mail, MapPin, Lock, ArrowRight } from 'lucide-react'
import CardSwap from '@/components/CardSwap'
import BackgroundLiquidEther from '@/components/BackgroundLiquidEther'

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

export default function SignUpPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // State variables for the fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [pinCode, setPinCode] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('pin_code') || ''
  })
  const [password, setPassword] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [redirectMessage, setRedirectMessage] = useState('Initializing volley...')
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)

  // Mobile-only states
  const [mobileFullName, setMobileFullName] = useState('')
  const [mobileConfirmPassword, setMobileConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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



  async function handleSignUp(e: React.FormEvent, isMobileFormSubmit: boolean = false) {
    e.preventDefault()
    
    let finalFirstName = firstName.trim()
    let finalLastName = lastName.trim()
    let finalEmail = email.trim()
    let finalPinCode = pinCode.trim()
    let finalPassword = password

    if (isMobileFormSubmit) {
      if (!mobileFullName.trim()) {
        setError('Please enter your Full Name.')
        return
      }
      const nameParts = mobileFullName.trim().split(/\s+/)
      finalFirstName = nameParts[0] || ''
      finalLastName = nameParts.slice(1).join(' ') || ''
      
      if (password !== mobileConfirmPassword) {
        setError('Passwords do not match.')
        return
      }
      
      if (finalPassword.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
    } else {
      if (!finalFirstName || !finalLastName) {
        setError('Please fill in both first name and last name.')
        return
      }
      if (finalPassword.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
    }

    if (!finalEmail) {
      setError('Please fill in your email address.')
      return
    }
    if (!finalPinCode) {
      setError('Please fill in your Zip/Pin Code.')
      return
    }

    setLoading(true)
    setError('')

    const fullName = `${finalFirstName} ${finalLastName}`

    // Sign up with Supabase auth and pass names and pin code in user metadata
    const { error } = await supabase.auth.signUp({
      email: finalEmail,
      password: finalPassword,
      options: {
        data: {
          first_name: finalFirstName,
          last_name: finalLastName,
          full_name: fullName,
          pin_code: finalPinCode
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setRedirectMessage('Volley registered! Creating secure profile...')
    setIsRedirecting(true)

    // Redirect user to login with signup_success query parameter after showing the beautiful transition
    setTimeout(() => {
      router.push('/auth/login?signup_success=true')
    }, 1100)
  }

  return (
    <main className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-[#FF4D00] selection:text-black relative overflow-hidden">
      
      {/* 0. Full-width immersive LiquidEther background */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none select-none">
        <BackgroundLiquidEther />
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
            className="w-full max-w-md mx-auto bg-black/90 border-2 border-white/10 rounded-[2rem] p-5 sm:p-9 z-10 shadow-[10px_10px_0px_#FF4D00] relative backdrop-blur-3xl flex flex-col items-center justify-center text-center gap-6 min-h-[420px]"
          >
            <div className="relative z-10 space-y-6 flex flex-col items-center w-full">
              {/* Concentric Brand Logo */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#FF4D00] border-2 border-black flex items-center justify-center shadow-lg relative group shadow-[4px_4px_0px_#FFFFFF]">
                <Layers className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-black stroke-[2.5px]" />
              </div>

              <div className="space-y-2">
                <h2 className="font-display font-black text-xl sm:text-3xl text-white uppercase tracking-tight leading-none">
                  {redirectMessage}
                </h2>
                <p className="text-white/40 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest pl-1 font-bold">
                  Forwarding to Secure Gateway...
                </p>
              </div>

              {/* Kinetic Ping-Pong Loader */}
              <div className="flex items-center justify-center gap-12 h-14 sm:h-16 relative w-40 sm:w-48 border-2 border-black rounded-xl bg-black px-4 mt-4 shadow-[4px_4px_0px_#FF4D00]">
                {/* Left Paddle */}
                <motion.div 
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-6 sm:h-7 bg-[#FF4D00] rounded-full shrink-0"
                />
                {/* Bouncing Ball */}
                <motion.div 
                  animate={{ x: [-40, 40, -40], y: [-5, 5, -5] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full shadow-[0_0_8px_#FF4D00] shrink-0"
                />
                {/* Right Paddle */}
                <motion.div 
                  animate={{ y: [10, -10, 10] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-6 sm:h-7 bg-[#FF4D00] rounded-full shrink-0"
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* DESKTOP/LAPTOP VIEWPORT: 100% Identical Original Layout                   */}
            {/* ========================================================================= */}
            <motion.div
              key="signup-panel-desktop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden lg:grid w-full max-w-5xl grid-cols-12 gap-6 lg:gap-8 bg-black/80 border border-white/10 rounded-[2rem] p-3 sm:p-5 lg:p-6 z-10 shadow-[10px_10px_0px_#FF4D00] relative backdrop-blur-3xl"
            >
              {/* LEFT COLUMN: Sidebar Active CardSwap Showcase */}
              <div className="lg:col-span-5 relative overflow-hidden rounded-[1.5rem] bg-gradient-to-tr from-[#1C0902] via-[#080402] to-black p-6 border border-white/10 flex flex-col justify-between min-h-[440px] lg:min-h-[520px] group">
                {/* Giant Ping Pong Volley Watermark */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] font-display font-black text-[9rem] leading-none uppercase select-none text-transparent stroke-white stroke-2 flex flex-col justify-between py-12">
                  <span className="-translate-x-6 tracking-tighter">SERVE</span>
                  <span className="translate-x-16 tracking-tighter">RETURN</span>
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

                  {/* Bottom Dock Navigation & Progress Indicators */}
                  <div className="space-y-4">
                    <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-white/50">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
                        <span>VOLLEY RATE: 100% MUTUAL</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#FF4D00] font-black">01</span>
                        <span className="w-12 h-[2px] bg-white/20 relative overflow-hidden inline-block rounded-full">
                          <span className="absolute top-0 left-0 w-1/3 h-full bg-[#FF4D00]" />
                        </span>
                        <span>03</span>
                      </div>
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

              {/* RIGHT COLUMN: Signup Form Panel */}
              <div className="lg:col-span-7 flex flex-col justify-center px-2 py-3 sm:p-5 lg:p-6 relative z-10">
                <div className="w-full max-w-md mx-auto space-y-6">
                  
                  {/* Header Titles */}
                  <div className="space-y-2.5">
                    <h1 className="font-display font-black text-white text-[2.2rem] tracking-tight uppercase leading-none">
                      <SplitText
                        text="Sign Up Account"
                        className="text-white inline-block"
                        delay={40}
                        duration={0.6}
                        ease="power3.out"
                        textAlign="left"
                        tag="span"
                      />
                    </h1>
                    <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">
                      Enter your details to return the volley and list your skills.
                    </p>
                  </div>

                  {/* Signup Form */}
                  <form onSubmit={(e) => handleSignUp(e, false)} className="space-y-4">
                    
                    {/* Errors Display */}
                    <AnimatePresence mode="wait">
                      {error && (
                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono uppercase tracking-wide flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Side-by-side First & Last Names */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                          First Name
                        </label>
                        <div className="relative group">
                          <input
                            id="firstName"
                            type="text"
                            required
                            placeholder="eg. John"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                          />
                          <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="lastName" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                          Last Name
                        </label>
                        <div className="relative group">
                          <input
                            id="lastName"
                            type="text"
                            required
                            placeholder="eg. Francisco"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                          />
                          <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                        </div>
                      </div>
                    </div>

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

                    {/* Pin Code Field */}
                    <div className="space-y-2">
                      <label htmlFor="pinCode" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                        Zip/Pin Code
                      </label>
                      <div className="relative group">
                        <input
                          id="pinCode"
                          type="text"
                          required
                          placeholder="eg. 94102"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value)}
                          className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                      </div>
                    </div>

                    {/* Password Field with Eye Toggle */}
                    <div className="space-y-2 relative">
                      <label htmlFor="password" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                        Password
                      </label>
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
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                      </div>
                      <span className="text-[9px] font-mono uppercase text-white/30 block mt-1.5 tracking-wider">
                        * Must be at least 8 characters.
                      </span>
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
                          <span>VOLLEY INITIALIZING...</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-2 relative z-10 select-none">
                          <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 mr-1 text-[#FF4D00] group-hover/btn:text-black">🏓</span>
                          <span>CREATE FREE ACCOUNT</span>
                          <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 ml-1 text-[#FF4D00] group-hover/btn:text-black">🏓</span>
                        </span>
                      )}
                      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/btn:opacity-15 transition-opacity duration-300 bg-gradient-to-r from-transparent via-[#FF4D00]/40 to-transparent animate-[marquee-left_1.5s_linear_infinite]" />
                    </button>

                  </form>

                  {/* Footer Back Links */}
                  <div className="text-center pt-2">
                    <p className="text-xs font-mono uppercase tracking-wider text-white/50">
                      Already have an account?{' '}
                      <Link href="/auth/login" className="text-[#FF4D00] hover:text-white font-bold ml-1 transition-colors hover:underline">
                        Log in
                      </Link>
                    </p>
                  </div>

                </div>
              </div>
            </motion.div>

            {/* ========================================================================= */}
            {/* MOBILE VIEWPORT: Redesigned Award-Winning Mockup Layout                   */}
            {/* ========================================================================= */}
            <motion.div
              key="signup-panel-mobile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="block lg:hidden w-full max-w-md mx-auto space-y-6"
            >
              {/* Header: Logo on left, badge on right */}
              <div className="flex items-center justify-between pb-2 select-none">
                <Link href="/" prefetch={true} className="inline-flex items-center select-none">
                  <span className="font-display font-black text-2xl tracking-tighter uppercase text-white hover:text-[#FF4D00] transition-colors">
                    SKILLSWAP
                  </span>
                </Link>
              </div>

              {/* Title & Subtitle with Cursive Annotation */}
              <div className="space-y-3 relative mb-6">
                <h1 className="font-display font-black text-white text-[3.2rem] sm:text-[3.6rem] leading-[0.85] tracking-tight uppercase text-left relative select-none">
                  JOIN<br />
                  THE<br />
                  <span className="text-[#FF4D00] relative inline-block">
                    SWAP
                    {/* Cursive Annotation */}
                    <span className="absolute left-[92%] bottom-[45%] w-36 pointer-events-none hidden xs:flex items-center gap-1.5 rotate-3">
                      <div className="shrink-0 -rotate-12 translate-y-2">
                        <svg className="w-10 h-8 text-[#FF4D00]" fill="none" viewBox="0 0 50 35">
                          <path d="M40 5 C30 12, 18 15, 8 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M6 16 L6 26 L16 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="font-mono text-left leading-none translate-y-1">
                        <span className="block font-bold text-[#FF4D00] text-[13px] italic font-sans lowercase">Skills</span>
                        <span className="block text-white/50 text-[8px] uppercase tracking-wider">over money</span>
                      </div>
                    </span>
                  </span>
                </h1>
                <p className="text-white/65 text-sm leading-snug font-sans max-w-sm pt-2">
                  Create your free account and start exchanging skills with people nearby.
                </p>
              </div>

              {/* Signup Form */}
              <form onSubmit={(e) => handleSignUp(e, true)} className="space-y-4">
                
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

                {/* Full Name Input */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobileFullName"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Full Name"
                    value={mobileFullName}
                    onChange={(e) => setMobileFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113]/60 border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>

                {/* Email Address Input */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobileEmail"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113]/60 border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>

                {/* Zip/Pin Code Input */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <MapPin className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobilePinCode"
                    type="text"
                    required
                    autoComplete="postal-code"
                    placeholder="Zip/Pin Code"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113]/60 border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobilePassword"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-[#111113]/60 border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Confirm Password Input */}
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobileConfirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Confirm Password"
                    value={mobileConfirmPassword}
                    onChange={(e) => setMobileConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-[#111113]/60 border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>



                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-4.5 px-4 bg-[#FF4D00] text-black font-mono font-bold text-xs uppercase tracking-widest rounded-2xl border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 relative overflow-hidden"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin text-black shrink-0" />
                      <span>CREATING ACCOUNT...</span>
                    </>
                  ) : (
                    <span className="flex items-center justify-center gap-2 select-none font-sans">
                      <span>CREATE ACCOUNT</span>
                      <ArrowRight className="w-4.5 h-4.5 stroke-[2.5px]" />
                    </span>
                  )}
                </button>

              </form>



              {/* Bottom Login Link */}
              <div className="text-center pt-4 border-t border-white/5 flex flex-col items-center gap-4">
                <p className="text-xs font-mono uppercase tracking-wider text-white/50">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-[#FF4D00] hover:text-white font-bold ml-1 transition-colors hover:underline">
                    Log in
                  </Link>
                </p>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
