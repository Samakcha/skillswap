'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Check, 
  Loader2, 
  AlertCircle, 
  User, 
  MapPin, 
  Sparkles, 
  Save, 
  ArrowLeft,
  BookOpen,
  ArrowRight,
  Settings,
  Layers,
  Camera
} from 'lucide-react'

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
      staggerChildren: 0.06,
      delayChildren: 0.05
    }
  }
}

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()

  // Profile data state
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form fields state
  const [fullName, setFullName] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [skillsOffered, setSkillsOffered] = useState('')
  const [skillsNeeded, setSkillsNeeded] = useState('')
  const [bio, setBio] = useState('')
  const [availability, setAvailability] = useState('')
  
  // Profile picture upload states
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        // Fast authentication check
        const { data: { session } } = await supabase.auth.getSession()
        let currentUser = session?.user || null
        if (!currentUser) {
          const { data: { user: verifiedUser } } = await supabase.auth.getUser()
          currentUser = verifiedUser
        }

        if (!currentUser) {
          router.push('/auth/login')
          return
        }
        setUser(currentUser)

        // Load profile from Supabase
        const { data: currentProfile, error: profileErr } = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single() as any)

        if (profileErr) {
          // If no profile yet, redirect to profile setup onboarding
          router.push('/profile-setup')
          return
        }

        if (currentProfile) {
          setProfile(currentProfile)
          setFullName(currentProfile.full_name || '')
          setPinCode(currentProfile.pin_code || '')
          setNeighborhood(currentProfile.neighborhood || '')
          setSkillsOffered(currentProfile.skills_offered ? currentProfile.skills_offered.join(', ') : '')
          setSkillsNeeded(currentProfile.skills_needed ? currentProfile.skills_needed.join(', ') : '')
          setBio(currentProfile.bio || '')
          setAvailability(currentProfile.availability || '')
          setAvatarUrl(currentProfile.avatar_url || '')
          setAvatarPreview(currentProfile.avatar_url || '')
          
          // Sync with local cache
          if (typeof window !== 'undefined') {
            localStorage.setItem('skillswap_profile', JSON.stringify(currentProfile))
          }
        }
      } catch (err: any) {
        console.error('Error loading settings data:', err)
        setError('Failed to load profile details. Please try reloading.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

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

    if (!user?.id) {
      setError('You must be logged in to upload a profile picture.')
      return
    }

    setUploadingAvatar(true)
    try {
      const filePath = `${user.id}/${Date.now()}-${file.name}`
      
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

  // Auto-dismiss success toast after 4 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [success])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    
    if (!fullName.trim() || !pinCode.trim() || !skillsOffered.trim() || !skillsNeeded.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const parsedOffered = skillsOffered
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const parsedNeeded = skillsNeeded
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const updatedProfile = {
        id: user.id,
        full_name: fullName.trim(),
        pin_code: pinCode.trim(),
        neighborhood: neighborhood.trim() || null,
        skills_offered: parsedOffered,
        skills_needed: parsedNeeded,
        bio: bio.trim() || null,
        availability: availability.trim() || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString()
      }

      const { error: saveErr } = await (supabase
        .from('profiles') as any)
        .upsert(updatedProfile, { onConflict: 'id' })

      if (saveErr) {
        setError(saveErr.message)
        setSaving(false)
        return
      }

      // Update state and localized profile cache
      setProfile(updatedProfile)
      if (typeof window !== 'undefined') {
        localStorage.setItem('skillswap_profile', JSON.stringify(updatedProfile))
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen bg-theme-bg text-gray-100 flex flex-col justify-center items-center font-sans relative overflow-hidden w-full"
        >
          {/* 1. Cyber Tech Blueprint Grid Overlay */}
          <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
              <Settings className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Loading Settings</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Retrieving secure profile preferences...</p>
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
          key="content"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="min-h-screen bg-theme-bg text-gray-100 flex flex-col lg:flex-row font-sans selection:bg-[#FF4D00]/30 selection:text-white relative overflow-x-clip w-full"
        >
      {/* 1. Cyber Tech Blueprint Grid Overlay */}
      <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />

      {/* CLAUDE-STYLE SIDEBAR */}
      <Sidebar profile={profile} supabase={supabase} user={user} />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative">
        {/* BACKGROUND GLOWS */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

        {/* SETTINGS INNER BODY */}
        <main className="max-w-6xl mx-auto w-full px-6 pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
          
          {/* TOP BACK & ROUTE HEADER */}
          <motion.div 
            variants={FADE_UP} 
            className="bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          >
            <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
            
            <div className="space-y-4 relative z-10">
              <button 
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B0B0D] border-2 border-white/5 text-white/40 hover:text-black hover:bg-[#FF4D00] hover:border-black transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5px]" />
                <span className="font-mono font-black text-[10px] uppercase tracking-wider">Back to Dashboard</span>
              </button>
              
              <div className="space-y-1.5">
                <h1 className="font-display font-black text-3xl sm:text-4xl leading-[0.9] text-white tracking-tight uppercase flex flex-wrap gap-x-2">
                  <SplitText
                    text="Account"
                    className="text-white"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                  <SplitText
                    text="Settings"
                    className="text-[#FF4D00]"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                </h1>
                <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-1">
                  Manage your public SkillSwap profile, location preferences, and matching trade filters.
                </p>
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="self-start sm:self-center px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider text-white/50 hover:text-white bg-black hover:bg-[#161618] border-2 border-white/10 hover:border-white/20 rounded-xl transition-all shadow-[2px_2px_0px_rgba(255,255,255,0.05)] hover:shadow-none cursor-pointer relative z-10"
            >
              Cancel
            </button>
          </motion.div>

          {/* MAIN COLUMN SPLIT PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-2">
            
            {/* LEFT PROFILE CARD (35% width) */}
            <motion.div 
              variants={FADE_UP}
              className="lg:col-span-4 bg-[#0B0B0D] border-2 border-white/5 rounded-[2rem] p-6 shadow-[8px_8px_0px_#000000] hover:shadow-[8px_8px_0px_rgba(255,77,0,0.1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-6 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />

              <div className="flex flex-col items-center text-center gap-4 relative z-10 pt-4">
                {/* Large Profile Avatar / Initials */}
                {avatarPreview ? (
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-white/15 select-none shrink-0 bg-black">
                    <img 
                      src={avatarPreview} 
                      alt="Avatar Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-white/5 border-2 border-white/15 flex items-center justify-center font-display font-black text-3xl text-white select-none shrink-0 uppercase">
                    {fullName?.charAt(0).toUpperCase() || 'S'}
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">
                    {fullName || 'Neighbor'}
                  </h3>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 flex items-center justify-center gap-1 pt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                    <span>{neighborhood || 'Local Area'} (ZIP {pinCode})</span>
                  </div>
                </div>
              </div>

              {/* Status details inside Profile Card */}
              <div className="border-t border-white/[0.05] pt-5 space-y-5 relative z-10">
                <div className="text-[9px] font-mono font-bold text-white/30 tracking-widest uppercase">Profile Summary</div>
                
                {/* Skills Offered Pill */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Offering:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {profile?.skills_offered?.map((skill: string) => (
                      <span key={skill} className="px-2.5 py-1 rounded bg-emerald-500/5 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                        {skill}
                      </span>
                    )) || <span className="text-[10px] font-mono uppercase tracking-widest text-white/20 font-bold">None listed</span>}
                  </div>
                </div>

                {/* Skills Needed Pill */}
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9A3C] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00]" />
                    Learning:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {profile?.skills_needed?.map((skill: string) => (
                      <span key={skill} className="px-2.5 py-1 rounded bg-[#FF4D00]/5 text-[#FF9A3C] border border-[#FF4D00]/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                        {skill}
                      </span>
                    )) || <span className="text-[10px] font-mono uppercase tracking-widest text-white/20 font-bold">None listed</span>}
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div className="rounded-xl bg-black border border-white/5 p-4 text-[10px] font-mono text-white/40 leading-relaxed space-y-2">
                <div className="font-bold text-white/50 flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF4D00] animate-pulse shrink-0" />
                  <span>Pro Swapping Tip</span>
                </div>
                <p className="font-bold uppercase tracking-wider">
                  Separate multiple skills using commas to make it easy for neighbors to discover your profile slots!
                </p>
              </div>

            </motion.div>

            {/* RIGHT FORM CONTAINER (65% width) */}
            <motion.div 
              variants={CONTAINER_STAGGER}
              className="lg:col-span-8 flex flex-col gap-6"
            >
              {/* Form panel container */}
              <motion.div 
                variants={FADE_UP}
                className="bg-[#0B0B0D] border-2 border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_#000000]"
              >
                {/* Form header */}
                <div className="mb-6 pb-4 border-b border-white/[0.05]">
                  <h2 className="font-display font-black text-lg text-white uppercase tracking-tight flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-[#FF4D00]" />
                    <span>Public Profile Settings</span>
                  </h2>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold mt-1.5">
                    Update your public identity. Neighbors will view these details on your swap proposals and chats.
                  </p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  
                  {/* Real-time Alerts Notification Row */}
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/25 text-rose-300 text-xs font-mono font-bold uppercase tracking-wider flex items-start gap-2.5 shadow-[4px_4px_0px_rgba(244,63,94,0.05)]"
                      >
                        <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    {success && (
                      <motion.div 
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/25 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider flex items-start gap-2.5 shadow-[4px_4px_0px_rgba(16,185,129,0.05)]"
                      >
                        <Check className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5 stroke-[3px]" />
                        <span>Transmission Success: profile saved and cached live.</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Profile Picture Upload Section */}
                  <div className="space-y-3.5 flex flex-col items-center justify-center pb-5 border-b border-white/[0.04]">
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/50 text-center w-full">
                      Profile Avatar Picture
                    </label>
                    
                    <div className="relative group select-none">
                      {/* Clickable Circle Container */}
                      <div 
                        onClick={() => document.getElementById('settings-avatar-upload')?.click()}
                        className="w-24 h-24 rounded-2xl border-2 border-white/10 bg-black hover:border-[#FF4D00] flex items-center justify-center overflow-hidden cursor-pointer relative transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,77,0,0.15)] shadow-md"
                      >
                        {avatarPreview ? (
                          <img 
                            src={avatarPreview} 
                            alt="Avatar Preview" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-white/30 group-hover:text-white/60 transition-colors">
                            <Camera className="w-7 h-7 mb-1 stroke-[2px]" />
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider">Upload</span>
                          </div>
                        )}

                        {/* Dark overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                          <Camera className="w-6 h-6 text-white stroke-[2.5px]" />
                        </div>

                        {/* Upload spinner */}
                        {uploadingAvatar && (
                          <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10">
                            <Loader2 className="w-6 h-6 animate-spin text-[#FF4D00]" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-center space-y-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById('settings-avatar-upload')?.click()}
                        disabled={uploadingAvatar}
                        className="px-4 py-2 bg-black hover:bg-[#161618] text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border-2 border-white/10 hover:border-[#FF4D00] shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        {uploadingAvatar ? 'Uploading...' : 'Choose Photo'}
                      </button>
                      <input
                        id="settings-avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <p className="text-[9px] font-mono uppercase tracking-widest text-white/30 font-bold">
                        Supports JPG, PNG or GIF slots
                      </p>
                    </div>
                  </div>

                  {/* Email ID field (Read-only) */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                      Email Address <span className="text-white/20 font-bold">(Locked slot)</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-white/5 bg-[#121214]/50 text-white/40 focus:outline-none transition-all text-xs font-mono font-bold tracking-wider cursor-not-allowed opacity-60"
                    />
                  </div>

                  {/* Full Name field */}
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="eg. John Francisco"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-white/10 bg-[#121214] text-white placeholder-white/20 focus:border-[#FF4D00] focus:outline-none transition-all text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-[#FF4D00] focus:shadow-[4px_4px_0px_#FF4D00]"
                    />
                  </div>

                  {/* Pin Code and Neighborhood Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="pinCode" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                        Pin Code (ZIP)
                      </label>
                      <input
                        id="pinCode"
                        type="text"
                        required
                        placeholder="eg. 94102"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-white/10 bg-[#121214] text-white placeholder-white/20 focus:border-[#FF4D00] focus:outline-none transition-all text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-[#FF4D00] focus:shadow-[4px_4px_0px_#FF4D00]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="neighborhood" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                        Neighborhood <span className="text-white/20 font-bold">(optional)</span>
                      </label>
                      <input
                        id="neighborhood"
                        type="text"
                        placeholder="eg. Mission District"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-white/10 bg-[#121214] text-white placeholder-white/20 focus:border-[#FF4D00] focus:outline-none transition-all text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-[#FF4D00] focus:shadow-[4px_4px_0px_#FF4D00]"
                      />
                    </div>
                  </div>

                  {/* Skills You Offer field */}
                  <div className="space-y-2">
                    <label htmlFor="skillsOffered" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                      Skills you offer (separated by commas)
                    </label>
                    <input
                      id="skillsOffered"
                      type="text"
                      required
                      placeholder="eg. Cooking, Portrait Photography, Acoustic Guitar"
                      value={skillsOffered}
                      onChange={(e) => setSkillsOffered(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-white/10 bg-[#121214] text-white placeholder-white/20 focus:border-[#FF4D00] focus:outline-none transition-all text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-[#FF4D00] focus:shadow-[4px_4px_0px_#FF4D00]"
                    />
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/30 font-bold block pt-1.5">
                      List the skills you would like to share or teach to others in your area.
                    </span>
                  </div>

                  {/* Skills You Need field */}
                  <div className="space-y-2">
                    <label htmlFor="skillsNeeded" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                      Skills you need (separated by commas)
                    </label>
                    <input
                      id="skillsNeeded"
                      type="text"
                      required
                      placeholder="eg. French lessons, Plumbing, Organic Gardening"
                      value={skillsNeeded}
                      onChange={(e) => setSkillsNeeded(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-white/10 bg-[#121214] text-white placeholder-white/20 focus:border-[#FF4D00] focus:outline-none transition-all text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-[#FF4D00] focus:shadow-[4px_4px_0px_#FF4D00]"
                    />
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/30 font-bold block pt-1.5">
                      List the skills or topics you want to learn or get help with.
                    </span>
                  </div>

                  {/* Bio field */}
                  <div className="space-y-2">
                    <label htmlFor="bio" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                      Bio <span className="text-white/20 font-bold">(optional)</span>
                    </label>
                    <textarea
                      id="bio"
                      placeholder="Tell your neighbors a bit about yourself"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-white/10 bg-[#121214] text-white placeholder-white/20 focus:border-[#FF4D00] focus:outline-none transition-all text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-[#FF4D00] focus:shadow-[4px_4px_0px_#FF4D00] resize-none"
                    />
                  </div>

                  {/* Availability field */}
                  <div className="space-y-2">
                    <label htmlFor="availability" className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                      Availability <span className="text-white/20 font-bold">(optional)</span>
                    </label>
                    <input
                      id="availability"
                      type="text"
                      placeholder="e.g. Weekends only, Evenings after 6pm"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-white/10 bg-[#121214] text-white placeholder-white/20 focus:border-[#FF4D00] focus:outline-none transition-all text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-[#FF4D00] focus:shadow-[4px_4px_0px_#FF4D00]"
                    />
                  </div>

                  {/* Save Submit Button */}
                  <div className="pt-5 border-t border-white/[0.05] flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard')}
                      className="px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.99] border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                          <span>Saving Slots...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 text-black stroke-[2.5px]" />
                          <span>Save Settings</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </motion.div>

              {/* Walkthrough Settings Card */}
              <motion.div
                variants={FADE_UP}
                className="bg-[#0B0B0D] border-2 border-white/5 rounded-[2rem] p-6 sm:p-8 shadow-[8px_8px_0px_#000000] mt-6"
              >
                <div className="mb-4 pb-4 border-b border-white/[0.05]">
                  <h2 className="font-display font-black text-lg text-white uppercase tracking-tight flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-[#FF4D00]" />
                    <span>Interactive Walkthrough</span>
                  </h2>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold mt-1.5">
                    Reset or restart the step-by-step tour of the SkillSwap dashboard.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-gray-400 font-semibold leading-relaxed max-w-md">
                    If you want to view the onboarding walkthrough tour again to learn about the features of SkillSwap, you can restart it here.
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('skillswap_onboarding_complete')
                        window.dispatchEvent(new Event('restart-skillswap-tour'))
                        router.push('/dashboard')
                      }
                    }}
                    className="px-5 py-3 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.99] border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer inline-flex items-center justify-center gap-2 shrink-0 self-start sm:self-center"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black stroke-[2.5px]" />
                    <span>Restart Tour</span>
                  </button>
                </div>
              </motion.div>

            </motion.div>

          </div>

        </main>
      </div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
