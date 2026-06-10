'use client'

import { createClient } from '@/lib/supabase'
import SplitText from '@/components/SplitText'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, AlertCircle, ArrowLeft, Camera, Layers, User, MapPin, Map, Award, BookOpen, Clock, ArrowRight } from 'lucide-react'
import BackgroundLiquidEther from '@/components/BackgroundLiquidEther'

// Constants for calendar grid
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = [
  { key: 'Morning', label: 'Morning', time: '6am-12pm' },
  { key: 'Afternoon', label: 'Afternoon', time: '12pm-6pm' },
  { key: 'Evening', label: 'Evening', time: '6pm-10pm' },
  { key: 'Night', label: 'Night', time: '10pm-2am' },
]

const DEFAULT_SLOTS = {
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
  Sat: [],
  Sun: []
}

const HOURS = [
  '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
]

const getSlotData = (daySlots: any[], slotKey: string) => {
  if (!Array.isArray(daySlots)) return null
  const found = daySlots.find((item: any) => {
    if (typeof item === 'string') return item === slotKey
    if (item && typeof item === 'object') return item.slot === slotKey
    return false
  })
  if (!found) return null
  if (typeof found === 'string') {
    const defaults: Record<string, string> = {
      Morning: '6am - 12pm',
      Afternoon: '12pm - 6pm',
      Evening: '6pm - 10pm',
      Night: '10pm - 2am'
    }
    return { slot: slotKey, time: defaults[slotKey] || '' }
  }
  return found
}

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

export default function ProfileSetupPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // State variables for the fields
  const [fullName, setFullName] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [skillsOffered, setSkillsOffered] = useState('')
  const [skillsNeeded, setSkillsNeeded] = useState('')
  const [bio, setBio] = useState('')
  const [availability, setAvailability] = useState('')
  const [availabilitySlots, setAvailabilitySlots] = useState<any>(DEFAULT_SLOTS)
  const [activeCustomizer, setActiveCustomizer] = useState<{ day: string; slotKey: string } | null>(null)
  const [customStart, setCustomStart] = useState('6am')
  const [customEnd, setCustomEnd] = useState('12pm')

  useEffect(() => {
    if (activeCustomizer) {
      const current = getSlotData(availabilitySlots[activeCustomizer.day], activeCustomizer.slotKey)
      if (current?.time) {
        const parts = current.time.split(' - ')
        if (parts.length === 2) {
          setCustomStart(parts[0])
          setCustomEnd(parts[1])
          return
        }
      }
      const defaults: Record<string, [string, string]> = {
        Morning: ['6am', '12pm'],
        Afternoon: ['12pm', '6pm'],
        Evening: ['6pm', '10pm'],
        Night: ['10pm', '2am']
      }
      const def = defaults[activeCustomizer.slotKey] || ['9am', '5pm']
      setCustomStart(def[0])
      setCustomEnd(def[1])
    }
  }, [activeCustomizer, availabilitySlots])
  
  // Profile picture upload states
  const [userId, setUserId] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Safe client-side fetch of Supabase metadata on mount
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        setUserId(user.id)
        if (user.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name)
        }
        if (user.user_metadata?.pin_code) {
          setPinCode(user.user_metadata.pin_code)
        }
        // Load existing profile details if they exist
        const { data: existingProfile } = await (supabase
          .from('profiles') as any)
          .select('avatar_url, availability, availability_slots')
          .eq('id', user.id)
          .single()
        if (existingProfile) {
          if (existingProfile.avatar_url) {
            setAvatarUrl(existingProfile.avatar_url)
            setAvatarPreview(existingProfile.avatar_url)
          }
          if (existingProfile.availability) {
            setAvailability(existingProfile.availability)
          }
          if (existingProfile.availability_slots && typeof existingProfile.availability_slots === 'object') {
            const parsedSlots = {
              Mon: Array.isArray(existingProfile.availability_slots.Mon) ? existingProfile.availability_slots.Mon : [],
              Tue: Array.isArray(existingProfile.availability_slots.Tue) ? existingProfile.availability_slots.Tue : [],
              Wed: Array.isArray(existingProfile.availability_slots.Wed) ? existingProfile.availability_slots.Wed : [],
              Thu: Array.isArray(existingProfile.availability_slots.Thu) ? existingProfile.availability_slots.Thu : [],
              Fri: Array.isArray(existingProfile.availability_slots.Fri) ? existingProfile.availability_slots.Fri : [],
              Sat: Array.isArray(existingProfile.availability_slots.Sat) ? existingProfile.availability_slots.Sat : [],
              Sun: Array.isArray(existingProfile.availability_slots.Sun) ? existingProfile.availability_slots.Sun : []
            }
            setAvailabilitySlots(parsedSlots)
          }
        }
      } catch (err) {
        console.error('Error fetching user metadata:', err)
      }
    }
    loadUserData()
  }, [router, supabase])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }

    // 1. Show preview of selected image before uploading
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    setError('')

    // 2. Upload it to Supabase Storage immediately
    let currentUserId = userId
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        currentUserId = user.id
        setUserId(user.id)
      }
    }

    if (!currentUserId) {
      setError('You must be logged in to upload a profile picture.')
      return
    }

    setUploadingAvatar(true)
    try {
      const filePath = `${currentUserId}/${Date.now()}-${file.name}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // After successful upload, get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
    } catch (err: any) {
      console.error('Error uploading avatar:', err)
      setError(err.message || 'Error uploading profile picture.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const clearAllSlots = () => {
    setAvailabilitySlots(DEFAULT_SLOTS)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!fullName.trim() || !pinCode.trim() || !skillsOffered.trim() || !skillsNeeded.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in to configure your profile.')
      setLoading(false)
      return
    }

    const { error } = await (supabase
      .from('profiles') as any)
      .upsert(
        {
          id: user.id,
          full_name: fullName.trim(),
          pin_code: pinCode.trim(),
          neighborhood: neighborhood.trim() || null,
          skills_offered: skillsOffered
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          skills_needed: skillsNeeded
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          bio: bio.trim() || null,
          availability: availability.trim() || null,
          availability_slots: availabilitySlots,
          avatar_url: avatarUrl || null,
        },
        {
          onConflict: 'id',
        }
      )

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Onboarding complete! Push to dashboard
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-[#FF4D00] selection:text-black relative overflow-hidden">
      
      {/* 0. Full-width immersive LiquidEther background */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none select-none">
        <BackgroundLiquidEther />
        <div className="absolute inset-0 bg-[#FF4D00] mix-blend-color opacity-30 pointer-events-none" />
      </div>

      {/* 1. Cyber Tech Blueprint Grid */}
      <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
      
      {/* 2. Kinetic Orange Shifting Auras */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/12 blur-[120px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/8 blur-[130px] pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        <>
          {/* ========================================================================= */}
          {/* DESKTOP/LAPTOP VIEWPORT: 100% Identical Original Layout                   */}
          {/* ========================================================================= */}
          <div className="hidden lg:grid w-full max-w-6xl grid-cols-12 gap-8 lg:gap-12 bg-black/80 border border-white/10 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 z-10 shadow-[16px_16px_0px_#FF4D00] relative backdrop-blur-3xl">
            
            {/* LEFT COLUMN: Sidebar Steps UI */}
            <div className="lg:col-span-5 relative overflow-hidden rounded-[2rem] bg-gradient-to-tr from-[#1C0902] via-[#080402] to-black p-8 sm:p-12 border border-white/10 flex flex-col justify-between min-h-[500px] lg:min-h-[640px] group">
              {/* Giant Ping Pong Volley Watermark */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] font-display font-black text-[9rem] leading-none uppercase select-none text-transparent stroke-white stroke-2 flex flex-col justify-between py-12">
                <span className="-translate-x-6 tracking-tighter">VOLLEY</span>
                <span className="translate-x-16 tracking-tighter">SETUP</span>
              </div>

              {/* Internal Glowing Blob */}
              <div className="absolute -top-32 -left-32 w-[350px] h-[350px] rounded-full bg-[#FF4D00]/15 blur-[90px] pointer-events-none group-hover:bg-[#FF4D00]/20 transition-all duration-700" />
              <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#FF4D00]/5 blur-[80px] pointer-events-none" />

              {/* Core Content */}
              <div className="relative z-10 space-y-12">
                {/* Concentric Brand Logo */}
                <div className="flex items-center justify-between">
                  <Link href="/" prefetch={true} className="inline-flex items-center gap-3 group/logo select-none">
                    <span className="font-display font-bold text-2xl tracking-tighter uppercase text-white group-hover/logo:text-[#FF4D00] transition-colors duration-300">
                      SKILLSWAP
                    </span>
                  </Link>
                  <div className="px-3 py-1 border border-[#FF4D00]/20 rounded-full font-mono text-[8px] font-black uppercase tracking-widest text-[#FF4D00]/95 bg-[#FF4D00]/5">
                    STEP 2: DECLARE YOUR SLOT
                  </div>
                </div>

                {/* Welcome Titles */}
                <div className="space-y-2.5">
                  <h2 className="font-display font-black text-white text-[2rem] leading-none uppercase tracking-tight">
                    Get Started
                  </h2>
                  <p className="text-white/40 text-xs font-mono uppercase tracking-wider pl-0.5">
                    Complete the setup to secure your slot.
                  </p>
                </div>

                {/* Step Indicators (Step 1 marked Completed, Step 2 is Active) */}
                <div className="space-y-4 pt-2">
                  
                  {/* Step 1: Completed */}
                  <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.04] px-5 py-4.5 rounded-2xl transition-all duration-300">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/40">Sign up your account</span>
                  </div>

                  {/* Step 2: Active */}
                  <div className="flex items-center gap-4 bg-[#FF4D00] px-5 py-4.5 rounded-2xl shadow-[4px_4px_0px_#FFFFFF] border-2 border-black transition-all duration-300 text-black">
                    <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0 border border-black/10">
                      2
                    </div>
                    <span className="text-xs font-mono font-black uppercase tracking-wider">Configure your profile</span>
                  </div>

                  {/* Step 3: Inactive */}
                  <div className="flex items-center gap-4 bg-[#111113]/40 border border-white/5 px-5 py-4.5 rounded-2xl transition-all duration-300">
                    <div className="w-7 h-7 rounded-full bg-[#202022] text-[#8E8E93] border border-white/[0.04] flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/20">Swap your first skill</span>
                  </div>

                </div>
              </div>

              {/* Footer & Progress */}
              <div className="space-y-4 relative z-10 pt-8">
                <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-white/50">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
                    <span>SECURE HANDSHAKE: IN PROGRESS</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#FF4D00] font-black">02</span>
                    <span className="w-12 h-[2px] bg-white/20 relative overflow-hidden inline-block rounded-full">
                      <span className="absolute top-0 left-0 w-2/3 h-full bg-[#FF4D00]" />
                    </span>
                    <span>03</span>
                  </div>
                </div>
                
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

            {/* RIGHT COLUMN: Profile Setup Form Panel */}
            <div className="lg:col-span-7 flex flex-col justify-center px-2 py-4 sm:p-6 lg:p-8 relative z-10">
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={CONTAINER_STAGGER}
                className="w-full max-w-lg mx-auto space-y-8"
              >
                
                {/* Header Titles */}
                <motion.div variants={FADE_UP} className="space-y-2.5">
                  <h1 className="font-display font-black text-white text-[2.6rem] tracking-tight uppercase leading-none">
                    <SplitText
                      text="Configure Profile"
                      className="text-white inline-block"
                      delay={40}
                      duration={0.6}
                      ease="power3.out"
                      textAlign="left"
                      tag="span"
                    />
                  </h1>
                  <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">
                    List your skills and details to verify neighborhood synchrony.
                  </p>
                </motion.div>

                {/* Profile Setup Form */}
                <motion.form variants={FADE_UP} onSubmit={handleSubmit} className="space-y-4">
                  
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

                  {/* Profile Picture Upload Section */}
                  <div className="space-y-3 flex flex-col items-center justify-center pb-4 border-b border-white/10">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 text-center w-full">
                      Profile Picture
                    </label>
                    
                    <div className="relative group">
                      {/* Clickable Circle Container */}
                      <div 
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        className="w-24 h-24 rounded-full border-2 border-dashed border-[#FF4D00]/80 bg-[#111113] hover:border-[#FF4D00] hover:scale-105 flex items-center justify-center overflow-hidden cursor-pointer relative transition-all duration-300 shadow-[4px_4px_0px_#FF4D00] hover:shadow-none group-hover:shadow-[0_0_20px_rgba(255,77,0,0.25)] select-none"
                      >
                        {avatarPreview ? (
                          <img 
                            src={avatarPreview} 
                            alt="Avatar Preview" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-white/40 group-hover:text-white transition-colors">
                            <Camera className="w-6 h-6 mb-1 text-[#FF4D00]/80 group-hover:text-[#FF4D00]" />
                            <span className="text-[8px] font-mono font-bold uppercase tracking-widest">SCAN IMAGE</span>
                          </div>
                        )}

                        {/* Dark overlay on hover */}
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-300">
                          <Camera className="w-5 h-5 text-[#FF4D00] mb-1 animate-pulse" />
                          <span className="text-[8px] font-mono font-bold text-white uppercase tracking-wider">CHANGE</span>
                        </div>

                        {/* Upload spinner */}
                        {uploadingAvatar && (
                          <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-10">
                            <Loader2 className="w-6 h-6 animate-spin text-[#FF4D00]" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-center space-y-1.5">
                      <button
                        type="button"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={uploadingAvatar}
                        className="px-4 py-2 bg-black hover:bg-white border border-white/15 text-white hover:text-black font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-50"
                      >
                        {uploadingAvatar ? 'Uploading...' : 'Choose Photo'}
                      </button>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <p className="text-[9px] font-mono uppercase text-white/30 tracking-wider">
                        Supports JPG, PNG or GIF (scan formats)
                      </p>
                    </div>
                  </div>

                  {/* Full Name Field */}
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                      Full Name
                    </label>
                    <div className="relative group">
                      <input
                        id="fullName"
                        type="text"
                        required
                        placeholder="eg. John Francisco"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                    </div>
                  </div>

                  {/* Pin Code & Neighborhood side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="space-y-2">
                      <label htmlFor="neighborhood" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                        Neighborhood <span className="text-white/20 font-light font-sans lowercase">(optional)</span>
                      </label>
                      <div className="relative group">
                        <input
                          id="neighborhood"
                          type="text"
                          placeholder="eg. Mission District"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                      </div>
                    </div>
                  </div>

                  {/* Skills You Offer Field */}
                  <div className="space-y-2">
                    <label htmlFor="skillsOffered" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                      Skills you offer
                    </label>
                    <div className="relative group">
                      <input
                        id="skillsOffered"
                        type="text"
                        required
                        placeholder="eg. cooking, acoustic guitar, portrait photography"
                        value={skillsOffered}
                        onChange={(e) => setSkillsOffered(e.target.value)}
                        className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                    </div>
                    <span className="text-[9px] font-mono uppercase text-white/30 block mt-1.5 tracking-wider">
                      List the skills you would like to teach, separated by commas.
                    </span>
                  </div>

                  {/* Skills You Need Field */}
                  <div className="space-y-2">
                    <label htmlFor="skillsNeeded" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                      Skills you need
                    </label>
                    <div className="relative group">
                      <input
                        id="skillsNeeded"
                        type="text"
                        required
                        placeholder="eg. French lessons, plumbing, organic gardening"
                        value={skillsNeeded}
                        onChange={(e) => setSkillsNeeded(e.target.value)}
                        className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                    </div>
                    <span className="text-[9px] font-mono uppercase text-white/30 block mt-1.5 tracking-wider">
                      List the skills you would like to learn, separated by commas.
                    </span>
                  </div>

                  {/* Bio Field */}
                  <div className="space-y-2">
                    <label htmlFor="bio" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                      Bio <span className="text-white/20 font-light font-sans lowercase">(optional)</span>
                    </label>
                    <div className="relative group">
                      <textarea
                        id="bio"
                        placeholder="Tell your neighbors a bit about yourself"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner resize-none"
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                    </div>
                  </div>

                  {/* Availability Field */}
                  <div className="space-y-2">
                    <label htmlFor="availability" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1">
                      Availability <span className="text-white/20 font-light font-sans lowercase">(optional)</span>
                    </label>
                    <div className="relative group">
                      <input
                        id="availability"
                        type="text"
                        placeholder="e.g. Weekends only, Evenings after 6pm"
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="w-full px-4 py-3.5 bg-[#111113] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-all text-xs font-mono rounded-xl focus:outline-none focus:bg-[#141416] shadow-inner"
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#FF4D00] group-focus-within:w-full transition-all duration-300 rounded-b-xl" />
                    </div>
                  </div>

                  {/* Weekly Availability Calendar Grid */}
                  <div className="space-y-4 pt-5 border-t border-white/[0.05] mt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#FF4D00]" />
                          <span>Weekly Availability</span>
                        </h3>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-white/30 font-bold">
                          Click to select your available time slots
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={clearAllSlots}
                        className="px-3 py-1.5 bg-black hover:bg-rose-500/10 border border-white/10 hover:border-[#FF4D00] hover:text-[#FF4D00] font-mono font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Calendar Grid Container with Mobile Responsiveness */}
                    <div className="overflow-x-auto w-full border border-white/10 rounded-xl bg-black/40 p-4 no-scrollbar">
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-8 gap-2 text-center">
                          {/* Top-Left Empty Corner Cell */}
                          <div></div>
                          
                          {/* Day Column Headers */}
                          {DAYS.map(day => (
                            <div 
                              key={day} 
                              className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest py-1.5 bg-[#09090b] border border-white/[0.03] rounded-lg select-none"
                            >
                              {day}
                            </div>
                          ))}

                          {/* Time Slot Rows */}
                          {SLOTS.map(slot => {
                            return (
                              <div key={slot.key} className="contents">
                                {/* Row Label (Slot Name) */}
                                {(() => {
                                  const isRowActive = DAYS.some(day => !!getSlotData(availabilitySlots[day], slot.key))
                                  return (
                                    <div className="flex flex-col justify-center items-start text-left select-none pr-2">
                                      <span className={`text-[9px] font-mono font-black uppercase tracking-wider leading-none transition-colors duration-200 ${
                                        isRowActive ? 'text-[#FF4D00]' : 'text-white/60'
                                      }`}>
                                        {slot.label}
                                      </span>
                                    </div>
                                  )
                                })()}

                                {/* Clickable Grid Cells for this slot for each day */}
                                {DAYS.map(day => {
                                  const slotData = getSlotData(availabilitySlots[day], slot.key)
                                  const isSelected = !!slotData
                                  return (
                                    <button
                                      key={`${day}-${slot.key}`}
                                      type="button"
                                      onClick={() => setActiveCustomizer({ day, slotKey: slot.key })}
                                      className={`py-1.5 px-0.5 rounded-lg text-[8px] font-mono font-bold uppercase tracking-widest transition-all border duration-200 cursor-pointer text-center select-none flex flex-col justify-center items-center min-h-[48px] ${
                                        isSelected
                                          ? 'bg-[#FF4D00] text-white border-black shadow-[0_0_10px_rgba(255,77,0,0.25)] hover:scale-[1.01]'
                                          : 'bg-[#0B0B0D] text-white/30 border-white/5 hover:text-white/60 hover:border-white/20 hover:bg-[#121214]'
                                      }`}
                                    >
                                      <span className="leading-tight">{slot.label}</span>
                                      {isSelected && (
                                        <span className="text-[6px] text-white/95 font-normal lowercase tracking-wide mt-0.5 bg-black/20 px-1 py-0.5 rounded leading-none">
                                          {slotData.time}
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Save Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 py-4 px-4 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest rounded-xl border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin text-black shrink-0" />
                        <span>VOLLEY SYNC IN PROGRESS...</span>
                      </>
                    ) : (
                      <span className="flex items-center gap-2 relative z-10 select-none">
                        <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 mr-1 text-[#FF4D00] group-hover/btn:text-black">🏓</span>
                        <span>SAVE SECURE PROFILE</span>
                        <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 ml-1 text-[#FF4D00] group-hover/btn:text-black">🏓</span>
                      </span>
                    )}
                    {/* Visual bouncing ball overlay sweep */}
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/btn:opacity-15 transition-opacity duration-300 bg-gradient-to-r from-transparent via-[#FF4D00]/40 to-transparent animate-[marquee-left_1.5s_linear_infinite]" />
                  </button>
                </motion.form>
              </motion.div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MOBILE VIEWPORT: Redesigned Award-Winning Mockup Layout                   */}
          {/* ========================================================================= */}
          <motion.div
            key="profile-setup-mobile"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="block lg:hidden w-full max-w-md mx-auto space-y-6 bg-black border-2 border-white/10 rounded-[2rem] p-5 sm:p-6 shadow-[10px_10px_0px_#FF4D00] relative z-10"
          >
            {/* Header: Logo on left, step badge on right */}
            <div className="flex items-center justify-between pb-2 select-none">
              <Link href="/" prefetch={true} className="inline-flex items-center select-none">
                <span className="font-display font-black text-2xl tracking-tighter uppercase text-white hover:text-[#FF4D00] transition-colors">
                  SKILLSWAP
                </span>
              </Link>
              <div className="px-3 py-1.5 border border-[#FF4D00]/30 rounded-full font-mono text-[8px] font-bold uppercase tracking-widest text-[#FF4D00] bg-[#FF4D00]/5">
                STEP 2 OF 3
              </div>
            </div>

            {/* Title & Subtitle with Cursive Annotation */}
            <div className="space-y-3 relative mb-6">
              <h1 className="font-display font-black text-white text-[3.2rem] sm:text-[3.6rem] leading-[0.85] tracking-tight uppercase text-left relative select-none">
                SETUP<br />
                YOUR<br />
                <span className="text-[#FF4D00] relative inline-block">
                  PROFILE
                  {/* Cursive Annotation */}
                  <span className="absolute left-[92%] bottom-[45%] w-36 pointer-events-none hidden xs:flex items-center gap-1.5 rotate-3">
                    <div className="shrink-0 -rotate-12 translate-y-2">
                      <svg className="w-10 h-8 text-[#FF4D00]" fill="none" viewBox="0 0 50 35">
                        <path d="M40 5 C30 12, 18 15, 8 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M6 16 L6 26 L16 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="font-mono text-left leading-none translate-y-1">
                      <span className="block font-bold text-[#FF4D00] text-[13px] italic font-sans lowercase">Declare</span>
                      <span className="block text-white/50 text-[8px] uppercase tracking-wider">your skills</span>
                    </div>
                  </span>
                </span>
              </h1>
              <p className="text-white/65 text-sm leading-snug font-sans max-w-sm pt-2">
                Configure your profile to start matching and swapping skills in your neighborhood.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
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
              </  AnimatePresence>

              {/* Profile Picture Upload Section */}
              <div className="bg-[#0B0B0D] border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                <div className="absolute top-3 left-4 text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">
                  PROFILE PICTURE
                </div>
                
                <div className="relative group mt-3">
                  <div 
                    onClick={() => document.getElementById('avatar-upload-mobile')?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-[#FF4D00]/80 bg-black hover:border-[#FF4D00] flex items-center justify-center overflow-hidden cursor-pointer relative transition-all duration-300 shadow-[0_0_15px_rgba(255,77,0,0.15)] group-hover:scale-105 select-none"
                  >
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar Preview" 
                        className="w-full h-full object-cover transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/40">
                        <Camera className="w-5 h-5 mb-1 text-[#FF4D00]" />
                        <span className="text-[7px] font-mono font-bold uppercase tracking-widest">UPLOAD</span>
                      </div>
                    )}

                    {/* Dark overlay on hover */}
                    <div className="absolute inset-0 bg-black/75 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-300">
                      <Camera className="w-4 h-4 text-[#FF4D00] mb-0.5 animate-pulse" />
                      <span className="text-[7px] font-mono font-bold text-white uppercase tracking-wider">CHANGE</span>
                    </div>

                    {/* Upload spinner */}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-10">
                        <Loader2 className="w-5 h-5 animate-spin text-[#FF4D00]" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatar-upload-mobile')?.click()}
                    disabled={uploadingAvatar}
                    className="px-3.5 py-1.5 bg-black border border-white/10 hover:border-white/30 text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Choose Photo'}
                  </button>
                  <input
                    id="avatar-upload-mobile"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-[8px] font-mono uppercase text-white/30 tracking-wider">
                    Supports JPG, PNG or GIF
                  </p>
                </div>
              </div>

              {/* Full Name Field */}
              <div className="space-y-1.5">
                <label htmlFor="mobileFullName" className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 pl-1">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobileFullName"
                    type="text"
                    required
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113] border border-white/15 text-white placeholder-white/30 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Zip/Pin Code Input */}
              <div className="space-y-1.5">
                <label htmlFor="mobilePinCode" className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 pl-1">
                  Zip/Pin Code
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <MapPin className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobilePinCode"
                    type="text"
                    required
                    placeholder="Zip/Pin Code"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113] border border-white/15 text-white placeholder-white/30 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Neighborhood Input */}
              <div className="space-y-1.5">
                <label htmlFor="mobileNeighborhood" className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 pl-1">
                  Neighborhood <span className="text-white/20 font-bold lowercase">(optional)</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <Map className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobileNeighborhood"
                    type="text"
                    placeholder="Neighborhood (optional)"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113] border border-white/15 text-white placeholder-white/30 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Skills You Offer Field */}
              <div className="space-y-1.5">
                <label htmlFor="mobileSkillsOffered" className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 pl-1">
                  Skills you offer
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobileSkillsOffered"
                    type="text"
                    required
                    placeholder="Skills you offer (comma separated)"
                    value={skillsOffered}
                    onChange={(e) => setSkillsOffered(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113] border border-white/15 text-white placeholder-white/30 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>
                <span className="text-[8px] font-mono uppercase text-white/30 block mt-1 tracking-wider pl-1 font-bold">
                  List the skills you would like to teach, separated by commas.
                </span>
              </div>

              {/* Skills You Need Field */}
              <div className="space-y-1.5">
                <label htmlFor="mobileSkillsNeeded" className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 pl-1">
                  Skills you need
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <Award className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobileSkillsNeeded"
                    type="text"
                    required
                    placeholder="Skills you need (comma separated)"
                    value={skillsNeeded}
                    onChange={(e) => setSkillsNeeded(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113] border border-white/15 text-white placeholder-white/30 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>
                <span className="text-[8px] font-mono uppercase text-white/30 block mt-1 tracking-wider pl-1 font-bold">
                  List the skills you would like to learn, separated by commas.
                </span>
              </div>

              {/* Bio Field */}
              <div className="space-y-1.5">
                <label htmlFor="mobileBio" className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 pl-1">
                  Bio <span className="text-white/20 font-bold lowercase">(optional)</span>
                </label>
                <div className="relative group">
                  <textarea
                    id="mobileBio"
                    placeholder="Tell your neighbors a bit about yourself (optional bio)"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-4 bg-[#111113] border border-white/15 text-white placeholder-white/30 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] resize-none"
                  />
                </div>
              </div>

              {/* Availability Input */}
              <div className="space-y-1.5">
                <label htmlFor="mobileAvailability" className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 pl-1">
                  Availability <span className="text-white/20 font-bold lowercase">(optional)</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#FF4D00] transition-colors pointer-events-none">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <input
                    id="mobileAvailability"
                    type="text"
                    placeholder="Availability (optional)"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#111113] border border-white/15 text-white placeholder-white/30 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:shadow-[0_0_15px_rgba(255,77,0,0.15)] transition-all text-base font-mono rounded-2xl focus:outline-none focus:bg-[#141416] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Weekly Availability Calendar Grid (Mobile) */}
              <div className="space-y-4 pt-4 border-t border-white/5 mt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#FF4D00]" />
                      <span>Weekly Availability</span>
                    </h3>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-white/30 font-bold">
                      Click slots to select availability
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={clearAllSlots}
                    className="px-3 py-1.5 bg-black hover:bg-[#FF4D00]/10 border border-white/10 hover:border-[#FF4D00] text-white/80 hover:text-[#FF4D00] font-mono font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Calendar Grid Container with Mobile Responsiveness */}
                <div className="overflow-x-auto w-full border border-white/15 rounded-xl bg-[#0B0B0D] p-4 no-scrollbar">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-8 gap-2 text-center">
                      {/* Top-Left Empty Corner Cell */}
                      <div></div>
                      
                      {/* Day Column Headers */}
                      {DAYS.map(day => (
                        <div 
                          key={day} 
                          className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest py-1.5 bg-[#111113] border border-white/[0.05] rounded-lg select-none"
                        >
                          {day}
                        </div>
                      ))}

                      {/* Time Slot Rows */}
                      {SLOTS.map(slot => {
                        return (
                          <div key={slot.key} className="contents">
                            {/* Row Label (Slot Name) */}
                            {(() => {
                              const isRowActive = DAYS.some(day => !!getSlotData(availabilitySlots[day], slot.key))
                              return (
                                <div className="flex flex-col justify-center items-start text-left select-none pr-2">
                                  <span className={`text-[9px] font-mono font-black uppercase tracking-wider leading-none transition-colors duration-200 ${
                                    isRowActive ? 'text-[#FF4D00]' : 'text-white/60'
                                  }`}>
                                    {slot.label}
                                  </span>
                                </div>
                              )
                            })()}

                            {/* Clickable Grid Cells for this slot for each day */}
                            {DAYS.map(day => {
                              const slotData = getSlotData(availabilitySlots[day], slot.key)
                              const isSelected = !!slotData
                              return (
                                <button
                                  key={`${day}-${slot.key}`}
                                  type="button"
                                  onClick={() => setActiveCustomizer({ day, slotKey: slot.key })}
                                  className={`py-1.5 px-0.5 rounded-lg text-[8px] font-mono font-bold uppercase tracking-widest transition-all border duration-200 cursor-pointer text-center select-none flex flex-col justify-center items-center min-h-[48px] ${
                                    isSelected
                                      ? 'bg-[#FF4D00] text-white border-black shadow-[0_0_10px_rgba(255,77,0,0.25)] hover:scale-[1.01]'
                                      : 'bg-[#111113] text-white/40 border-white/10 hover:text-white/70 hover:border-white/20 hover:bg-[#141416]'
                                  }`}
                                >
                                  <span className="leading-tight">{slot.label}</span>
                                  {isSelected && (
                                    <span className="text-[6px] text-white/95 font-normal lowercase tracking-wide mt-0.5 bg-black/20 px-1 py-0.5 rounded leading-none">
                                      {slotData.time}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Save Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-4.5 px-4 bg-[#FF4D00] text-black font-mono font-bold text-xs uppercase tracking-widest rounded-2xl border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 relative overflow-hidden"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-black shrink-0" />
                    <span>VOLLEY SYNC IN PROGRESS...</span>
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2 select-none font-sans">
                    <span>SAVE SECURE PROFILE</span>
                    <ArrowRight className="w-4.5 h-4.5 stroke-[2.5px]" />
                  </span>
                )}
              </button>

            </form>

            {/* Bottom Home link */}
            <div className="text-center pt-4 border-t border-white/5 flex flex-col items-center gap-4">
              <Link 
                href="/" 
                prefetch={true}
                className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-[#FF4D00] hover:text-white transition-colors duration-200 uppercase tracking-widest group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                <span>Back to home</span>
              </Link>
            </div>

          </motion.div>

          {/* TIMING CUSTOMIZER POPUP MODAL */}
          <AnimatePresence>
            {activeCustomizer && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/85 backdrop-blur-md"
                  onClick={() => setActiveCustomizer(null)}
                />
                
                {/* Modal Content */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="relative w-full max-w-xs bg-black border-2 border-white/10 rounded-[2rem] p-6 shadow-[8px_8px_0px_#FF4D00] z-10 flex flex-col gap-5 text-white"
                >
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-sm text-white uppercase tracking-tight">
                      Customize Timing
                    </h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#FF4D00] font-bold">
                      {activeCustomizer.day} — {activeCustomizer.slotKey}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-2">
                    <div className="space-y-2">
                      <label className="block text-[8px] font-mono font-bold uppercase tracking-wider text-white/40">
                        Start Time
                      </label>
                      <select
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border-2 border-white/10 bg-[#121214] text-white font-mono text-xs font-bold focus:border-[#FF4D00] focus:outline-none"
                      >
                        {HOURS.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[8px] font-mono font-bold uppercase tracking-wider text-white/40">
                        End Time
                      </label>
                      <select
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border-2 border-white/10 bg-[#121214] text-white font-mono text-xs font-bold focus:border-[#FF4D00] focus:outline-none"
                      >
                        {HOURS.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => {
                        setAvailabilitySlots((prev: any) => {
                          const day = activeCustomizer.day
                          const slotKey = activeCustomizer.slotKey
                          const currentDaySlots = prev[day] || []
                          const filtered = currentDaySlots.filter((item: any) => {
                            if (typeof item === 'string') return item !== slotKey
                            if (item && typeof item === 'object') return item.slot !== slotKey
                            return true
                          })
                          const updated = [
                            ...filtered,
                            { slot: slotKey, time: `${customStart} - ${customEnd}` }
                          ]
                          return {
                            ...prev,
                            [day]: updated
                          }
                        })
                        setActiveCustomizer(null)
                      }}
                      className="w-full py-2.5 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border-2 border-black shadow-[2px_2px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer text-center"
                    >
                      Save Timing
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setActiveCustomizer(null)}
                        className="py-2 px-3 bg-black hover:bg-[#161618] text-white/60 border border-white/10 hover:border-white/25 font-mono font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer shadow-[2px_2px_0px_rgba(255,255,255,0.05)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                      >
                        Cancel
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setAvailabilitySlots((prev: any) => {
                            const day = activeCustomizer.day
                            const slotKey = activeCustomizer.slotKey
                            const currentDaySlots = prev[day] || []
                            const updated = currentDaySlots.filter((item: any) => {
                              if (typeof item === 'string') return item !== slotKey
                              if (item && typeof item === 'object') return item.slot !== slotKey
                              return true
                            })
                            return {
                              ...prev,
                              [day]: updated
                            }
                          })
                          setActiveCustomizer(null)
                        }}
                        className="py-2 px-3 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/30 hover:border-rose-800/40 font-mono font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer"
                      >
                        Remove Slot
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      </AnimatePresence>
    </main>
  )
}
