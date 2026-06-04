'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  Layers, 
  Sparkles, 
  Tag, 
  BookOpen, 
  Heart,
  Upload,
  X,
  FileVideo,
  Image as ImageIcon
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
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
}

export default function CreatePostPage() {
  const supabase = createClient()
  const router = useRouter()
  const [type, setType] = useState<'offer' | 'request'>('offer')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skill, setSkill] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [pageLoading, setPageLoading] = useState(true)

  // Media upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<{ id: string; url: string; type: string; file: File }[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatusText, setUploadStatusText] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url))
    }
  }, [previews])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    addFiles(Array.from(e.target.files))
  }

  const addFiles = (newFiles: File[]) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
    const filteredFiles = newFiles.filter(file => {
      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Only JPG, PNG, WEBP and MP4 are supported.')
        return false
      }
      return true
    })

    if (selectedFiles.length + filteredFiles.length > 4) {
      setError('You can upload a maximum of 4 files.')
      return
    }

    const newPreviews = filteredFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      file
    }))

    setSelectedFiles(prev => [...prev, ...filteredFiles])
    setPreviews(prev => [...prev, ...newPreviews])
    setError('')
  }

  const removeFile = (id: string, url: string) => {
    URL.revokeObjectURL(url)
    setPreviews(prev => prev.filter(p => p.id !== id))
    setSelectedFiles(prev => {
      const targetPreview = previews.find(p => p.id === id)
      if (!targetPreview) return prev
      return prev.filter(f => f !== targetPreview.file)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  useEffect(() => {
    async function loadData() {
      // 1. Try to load profile from localStorage cache to prevent flicker
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('skillswap_profile')
          if (raw) {
            setProfile(JSON.parse(raw))
          }
        } catch (e) {
          console.error('Failed to parse cached profile:', e)
        }
      }

      try {
        // 2. Authenticate
        const { data: { session } } = await supabase.auth.getSession()
        let currentUser: any = session?.user
        if (!currentUser) {
          const { data: { user: verifiedUser } } = await supabase.auth.getUser()
          currentUser = verifiedUser
        }

        if (!currentUser) {
          router.push('/auth/login')
          return
        }
        setUser(currentUser)

        // 3. Retrieve DB profile
        const { data: freshProfile } = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single() as any)

        if (!freshProfile) {
          router.push('/profile-setup')
          return
        }

        setProfile(freshProfile)
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('skillswap_profile', JSON.stringify(freshProfile))
        }
      } catch (err) {
        console.error('Error loading session:', err)
      } finally {
        setPageLoading(false)
      }
    }

    loadData()
  }, [])

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    
    if (!title.trim() || !skill.trim() || !description.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (!user) {
        setError('You must be logged in to create a post.')
        setLoading(false)
        return
      }

      // 1. Create the post
      const { data: postData, error: postError } = await (supabase.from('posts') as any).insert({
        user_id: user.id,
        type,
        title: title.trim(),
        description: description.trim(),
        skill: skill.trim(),
      }).select().single()

      if (postError) {
        setError(postError.message)
        setLoading(false)
        return
      }

      const postId = postData.id

      // 2. Upload media files if present
      if (selectedFiles.length > 0) {
        setUploadProgress(5)
        setUploadStatusText('Preparing media synchronization...')

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i]
          const totalFiles = selectedFiles.length
          const currentProgressBase = 5 + (i / totalFiles) * 90 // progress runs from 5% to 95%
          
          setUploadStatusText(`Uploading ${file.name} (${i + 1}/${totalFiles})...`)
          setUploadProgress(Math.round(currentProgressBase))

          // Generate file path: userId/postId/timestamp-filename
          const filePath = `${user.id}/${postId}/${Date.now()}-${file.name}`

          // Perform storage upload
          const { error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            })

          if (uploadError) {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('post-media')
            .getPublicUrl(filePath)

          setUploadStatusText(`Registering media assets...`)
          
          // Insert row into post_media table
          const { error: mediaError } = await (supabase.from('post_media') as any).insert({
            post_id: postId,
            user_id: user.id,
            url: publicUrl,
            type: file.type.startsWith('video/') ? 'video' : 'image'
          })

          if (mediaError) {
            throw new Error(`Failed to record media database entry: ${mediaError.message}`)
          }
        }
        
        setUploadProgress(100)
        setUploadStatusText('Media assets synchronized successfully!')
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen bg-theme-bg text-gray-100 flex flex-col justify-center items-center font-sans relative overflow-hidden w-full"
        >
          <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
              <Layers className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Loading Queue</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Preparing proposal slot generator...</p>
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
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
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
        {/* Cyber Tech Blueprint Grid Overlay */}
        <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />

        {/* SIDEBAR NAVIGATION */}
        <Sidebar profile={profile} supabase={supabase} user={user} />

        {/* MAIN CONTAINER */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative animate-fadeIn">
          {/* BACKGROUND GLOWS */}
          <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

          {/* INNER CONTENT CONTAINER */}
          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
            
            {/* Split Panel */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 bg-black border-2 border-white/10 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 backdrop-blur-2xl z-10 shadow-[8px_8px_0px_rgba(255,77,0,0.12)] hover:shadow-[8px_8px_0px_#FF4D00] transition-shadow duration-300 relative">
              
              {/* LEFT COLUMN: Guidelines Info Console */}
              <div className="lg:col-span-5 relative overflow-hidden rounded-[2rem] bg-[#09090b] p-8 sm:p-10 border border-white/[0.08] flex flex-col justify-between min-h-[500px] lg:min-h-[620px] group shadow-inner">
                {/* Local Blueprint Grid */}
                <div className="absolute inset-0 skillswap-grid-bg skillswap-grid-bg-sm pointer-events-none z-0" />
                
                {/* Auras */}
                <div className="absolute -top-32 -left-32 w-[350px] h-[350px] rounded-full bg-[#FF4D00]/10 blur-[90px] pointer-events-none group-hover:bg-[#FF4D00]/15 transition-all duration-700" />
                <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#FF4D00]/5 blur-[80px] pointer-events-none" />

                {/* Info Content */}
                <div className="relative z-10 space-y-10">
                  {/* Brand Logo Text Link */}
                  <span 
                    onClick={() => router.push('/dashboard')} 
                    className="font-display font-black text-xl uppercase tracking-tighter cursor-pointer select-none text-white hover:text-[#FF4D00] transition-colors duration-300"
                  >
                    SKILL<span className="text-[#FF4D00]">SWAP</span>
                  </span>

                  {/* Header titles */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF4D00] animate-pulse" />
                      <span>Local Exchanger Network</span>
                    </div>
                    <h2 className="font-display font-black text-white text-[2rem] leading-[1.05] tracking-tight uppercase">
                      Share what <br />
                      <span className="text-[#FF4D00]">you know.</span>
                    </h2>
                    <p className="text-white/40 text-xs font-mono uppercase tracking-wide leading-relaxed">
                      Exchanging time and knowledge directly builds a resilient local community. List what you teach or need to learn.
                    </p>
                  </div>

                  {/* Tactile guideline cards */}
                  <div className="space-y-4 pt-1">
                    
                    {/* Select Type Card */}
                    <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex gap-4 hover:border-[#FF4D00]/30 transition-all duration-300">
                      <div className="w-9 h-9 rounded-xl bg-[#FF4D00]/10 border border-[#FF4D00]/25 flex items-center justify-center shrink-0 text-[#FF4D00]">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Choose Type</h4>
                        <p className="text-[10.5px] text-white/50 font-semibold leading-relaxed">
                          Flag your post as an **Offer** if you are teaching, or a **Request** if you want to learn.
                        </p>
                      </div>
                    </div>

                    {/* Target Skill Card */}
                    <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex gap-4 hover:border-[#FF4D00]/30 transition-all duration-300">
                      <div className="w-9 h-9 rounded-xl bg-[#FF4D00]/10 border border-[#FF4D00]/25 flex items-center justify-center shrink-0 text-[#FF4D00]">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">State the Skill</h4>
                        <p className="text-[10.5px] text-white/50 font-semibold leading-relaxed">
                          Specify the target topic clearly (e.g. Acoustic Guitar, Figma) so neighbors can filter easily.
                        </p>
                      </div>
                    </div>

                    {/* Zero Cash Card */}
                    <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex gap-4 hover:border-[#FF4D00]/30 transition-all duration-300">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-400">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Absolute Zero Cash</h4>
                        <p className="text-[10.5px] text-white/50 font-semibold leading-relaxed">
                          Trading skills in your neighborhood builds friendships and preserves assets. 100% mutual trading.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Back Link */}
                <div className="relative z-10 pt-6">
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to dashboard</span>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Interactive Form Console */}
              <div className="lg:col-span-7 flex flex-col justify-center px-2 py-4 sm:p-6 relative z-10">
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={CONTAINER_STAGGER}
                  className="w-full max-w-lg mx-auto space-y-7"
                >
                  
                  {/* Header titles */}
                  <motion.div variants={FADE_UP} className="space-y-1.5">
                    <h1 className="font-display font-black text-3xl sm:text-4xl leading-[0.9] text-white tracking-tight uppercase flex flex-wrap gap-x-2">
                      <SplitText
                        text="Create a"
                        className="text-white"
                        delay={40}
                        duration={0.6}
                        ease="power3.out"
                        textAlign="left"
                        tag="span"
                      />
                      <SplitText
                        text="Swap Proposal"
                        className="text-[#FF4D00]"
                        delay={40}
                        duration={0.6}
                        ease="power3.out"
                        textAlign="left"
                        tag="span"
                      />
                    </h1>
                    <p className="text-white/40 text-xs font-mono uppercase tracking-wide">
                      Publish your skill post in neighborhood <strong className="text-white font-bold">{profile?.neighborhood || 'ZIP code area'}</strong>
                    </p>
                  </motion.div>

                  {/* Submission Form */}
                  <motion.form variants={FADE_UP} onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Errors Notification Box */}
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-start gap-2.5"
                        >
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Proposal Type Toggles */}
                    <div className="space-y-2.5">
                      <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                        I want to...
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Toggle Offer */}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => setType('offer')}
                          className={`py-3.5 px-4 rounded-xl font-mono font-black text-[10px] uppercase tracking-widest border-2 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                            type === 'offer' 
                              ? 'bg-emerald-400 text-black border-black shadow-[4px_4px_0px_#000000] translate-y-[-2px] hover:shadow-none hover:translate-y-[0px]' 
                              : 'bg-[#09090b] text-white/50 border-white/10 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${type === 'offer' ? 'bg-black animate-pulse' : 'bg-gray-600'}`} />
                          Offer a Skill
                        </button>

                        {/* Toggle Request */}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => setType('request')}
                          className={`py-3.5 px-4 rounded-xl font-mono font-black text-[10px] uppercase tracking-widest border-2 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                            type === 'request' 
                              ? 'bg-[#FF4D00] text-black border-black shadow-[4px_4px_0px_#000000] translate-y-[-2px] hover:shadow-none hover:translate-y-[0px]' 
                              : 'bg-[#09090b] text-white/50 border-white/10 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${type === 'request' ? 'bg-black animate-pulse' : 'bg-gray-600'}`} />
                          Request a Skill
                        </button>

                      </div>
                    </div>

                    {/* Proposal Title Field */}
                    <div className="space-y-2">
                      <label htmlFor="title" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                        Proposal Title
                      </label>
                      <div className="relative group rounded-xl bg-[#09090b] border border-white/10 focus-within:border-[#FF4D00] focus-within:ring-1 focus-within:ring-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all duration-200">
                        <input
                          id="title"
                          type="text"
                          required
                          disabled={loading}
                          placeholder="e.g., French Lessons for Beginners, Organic Sourdough Baking"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-4 py-3.5 bg-transparent border-0 text-white placeholder-white/20 text-xs font-mono font-bold tracking-wider focus:outline-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Skill Tag Field */}
                    <div className="space-y-2">
                      <label htmlFor="skill" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                        Target Skill
                      </label>
                      <div className="relative group rounded-xl bg-[#09090b] border border-white/10 focus-within:border-[#FF4D00] focus-within:ring-1 focus-within:ring-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all duration-200">
                        <input
                          id="skill"
                          type="text"
                          required
                          disabled={loading}
                          placeholder="e.g., cooking, guitar, French, photography"
                          value={skill}
                          onChange={(e) => setSkill(e.target.value)}
                          className="w-full px-4 py-3.5 bg-transparent border-0 text-white placeholder-white/20 text-xs font-mono font-bold tracking-wider focus:outline-none disabled:opacity-50"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-wide block mt-1.5 pl-1">
                        The primary skill category for matching neighbors. Use simple keyword terms.
                      </span>
                    </div>

                    {/* Description Textarea Field */}
                    <div className="space-y-2">
                      <label htmlFor="description" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                        Proposal Details
                      </label>
                      <div className="relative group rounded-xl bg-[#09090b] border border-white/10 focus-within:border-[#FF4D00] focus-within:ring-1 focus-within:ring-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all duration-200">
                        <textarea
                          id="description"
                          required
                          rows={4}
                          disabled={loading}
                          placeholder="Describe your expertise, teaching style, schedule, and expectations of what you would like to trade."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full px-4 py-3.5 bg-transparent border-0 text-white placeholder-white/20 text-xs font-mono font-bold tracking-wider focus:outline-none resize-none disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Media Upload Section */}
                    <div className="space-y-2.5">
                      <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                        Media Attachments (Optional, Max 4)
                      </label>
                      
                      {/* Drag & Drop Container */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => !loading && document.getElementById('media-upload')?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                          loading 
                            ? 'opacity-50 pointer-events-none border-white/5 bg-transparent'
                            : isDragging 
                              ? 'border-[#FF4D00] bg-[#FF4D00]/5 shadow-[4px_4px_0px_#FF4D00]' 
                              : 'border-white/10 bg-[#09090b] hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/[0.02]'
                        }`}
                      >
                        <input
                          id="media-upload"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,video/mp4"
                          onChange={handleFileChange}
                          className="hidden"
                          disabled={loading}
                        />
                        
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                            isDragging 
                              ? 'bg-[#FF4D00] border-black text-black' 
                              : 'bg-white/5 border-white/10 text-white/40 group-hover:text-white group-hover:border-[#FF4D00]/30 group-hover:scale-105'
                          }`}>
                            <Upload className="w-5 h-5" />
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                              {isDragging ? 'Drop to upload!' : 'Drag & drop or click to scan files'}
                            </p>
                            <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest leading-relaxed">
                              Supports JPG, PNG, WEBP or MP4 (Max 10MB per file)
                            </p>
                          </div>
                        </div>

                        {/* Interactive cyber glow border trace on hover */}
                        <div className="absolute inset-0 border border-transparent rounded-xl pointer-events-none group-hover:border-[#FF4D00]/25 transition-colors duration-300" />
                      </div>

                      {/* Preview Grid */}
                      <AnimatePresence>
                        {previews.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3"
                          >
                            {previews.map((preview) => (
                              <motion.div
                                key={preview.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                className="relative aspect-square rounded-xl overflow-hidden bg-[#09090b] border border-white/10 group/item shadow-lg"
                              >
                                {preview.type === 'image' ? (
                                  <img
                                    src={preview.url}
                                    alt="Preview"
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full relative">
                                    <video
                                      src={preview.url}
                                      muted
                                      playsInline
                                      loop
                                      autoPlay
                                      className="w-full h-full object-cover"
                                    />
                                    {/* Small indicator overlay for video */}
                                    <div className="absolute bottom-2 left-2 bg-black/60 border border-white/10 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                      <FileVideo className="w-2.5 h-2.5 text-[#FF4D00]" />
                                      <span>MP4</span>
                                    </div>
                                  </div>
                                )}

                                {/* Remove Button */}
                                {!loading && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFile(preview.id, preview.url);
                                    }}
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center border border-black shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer z-10"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Real-time Upload Progress HUD */}
                    <AnimatePresence>
                      {loading && selectedFiles.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: 10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="p-5 rounded-xl border-2 border-[#FF4D00] bg-black shadow-[4px_4px_0px_#FF4D00] space-y-3 relative overflow-hidden"
                        >
                          {/* Top row: Label & percent */}
                          <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase tracking-wider text-[#FF4D00] relative z-10">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
                              <span>SYNCING MEDIA ASSETS...</span>
                            </div>
                            <span>{uploadProgress}%</span>
                          </div>

                          {/* Progress track */}
                          <div className="w-full h-2.5 bg-[#161618] border border-white/10 rounded-full relative overflow-hidden z-10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              transition={{ duration: 0.35, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-[#FF4D00] to-emerald-400 rounded-full"
                            />
                          </div>

                          {/* Status sub-label */}
                          <div className="flex items-center justify-between text-[9px] font-mono text-white/50 uppercase tracking-widest leading-none pt-0.5 relative z-10">
                            <span>{uploadStatusText || 'Synchronizing with mesh network...'}</span>
                            <span className="animate-pulse">ONLINE</span>
                          </div>

                          {/* Cyberblueprint subtle grid tracing */}
                          <div className="absolute inset-0 skillswap-grid-bg skillswap-grid-bg-sm pointer-events-none z-0 opacity-15" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      
                      {/* Cancel Button */}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => router.push('/dashboard')}
                        className="py-3.5 px-4 bg-black hover:bg-[#161618] text-white/50 hover:text-white border-2 border-white/10 hover:border-white/20 font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center shadow-[2px_2px_0px_rgba(255,255,255,0.05)] hover:shadow-none disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Cancel
                      </button>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="py-3.5 px-4 bg-[#FF4D00] hover:bg-white text-black font-mono font-black text-[11px] uppercase tracking-wider rounded-xl transition-all border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4.5 h-4.5 animate-spin text-black shrink-0" />
                            <span>Posting...</span>
                          </>
                        ) : (
                          <span>Publish Post</span>
                        )}
                      </button>

                    </div>

                  </motion.form>

                  <div className="text-center text-[10px] font-mono text-white/30 uppercase tracking-widest mt-4 select-none">
                    Your post will automatically expire after 30 days
                  </div>

                </motion.div>
              </div>

            </div>
            
          </main>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}