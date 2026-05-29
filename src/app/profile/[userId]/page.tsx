'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  MapPin, 
  Layers, 
  Compass, 
  Clock, 
  ArrowUpRight, 
  Tag, 
  MessageSquare, 
  Star, 
  Award, 
  ArrowLeft,
  Calendar,
  User,
  Settings,
  Camera,
  Loader2,
  Ban,
  Flag
} from 'lucide-react'

// Framer Motion Animation Presets
const FADE_UP = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
}

export default function UserProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const targetUserId = params.userId as string

  // Data States
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [viewedProfile, setViewedProfile] = useState<any>(null)
  const [viewedPosts, setViewedPosts] = useState<any[]>([])
  const [viewedReviews, setViewedReviews] = useState<any[]>([])
  const [averageRating, setAverageRating] = useState<string>('0')
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('Spam')
  const [reportDetails, setReportDetails] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Logged in user authentication check
        const { data: { session } } = await supabase.auth.getSession()
        let loggedInUser = session?.user || null
        if (!loggedInUser) {
          const { data: { user: verifiedUser } } = await supabase.auth.getUser()
          loggedInUser = verifiedUser
        }

        if (!loggedInUser) {
          router.push('/auth/login')
          return
        }
        setCurrentUser(loggedInUser)

        // 2. Fetch logged in user profile details
        const { data: selfProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', loggedInUser.id)
          .single()

        if (selfProfile) {
          setCurrentProfile(selfProfile)
          if (typeof window !== 'undefined') {
            localStorage.setItem('skillswap_profile', JSON.stringify(selfProfile))
          }
        }

        // Check block status
        const { data: blockRes } = await (supabase
          .from('blocked_users') as any)
          .select('*')
          .eq('blocker_id', loggedInUser.id)
          .eq('blocked_id', targetUserId)
          .maybeSingle()

        setIsBlocked(!!blockRes)

        // 3. Fetch target user profile, active posts, and reviews in parallel
        const profileRes = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single() as any)

        const postsRes = await (supabase
          .from('posts')
          .select('*, profiles:profiles!posts_user_id_fkey!inner(full_name, pin_code, neighborhood)')
          .eq('user_id', targetUserId)
          .eq('is_active', true)
          .order('created_at', { ascending: false }) as any)

        const reviewsRes = await (supabase
          .from('reviews')
          .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url)')
          .eq('reviewed_id', targetUserId)
          .order('created_at', { ascending: false }) as any)

        if (profileRes.error || !profileRes.data) {
          router.push('/dashboard')
          return
        }

        setViewedProfile(profileRes.data)
        setViewedPosts((postsRes.data as any[]) || [])
        
        const reviewsData = (reviewsRes.data as any[]) || []
        setViewedReviews(reviewsData)

        // Calculate average star rating
        const totalRating = reviewsData.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0)
        const avg = reviewsData.length > 0 ? (totalRating / reviewsData.length).toFixed(2) : '0'
        setAverageRating(avg)
      } catch (err) {
        console.error("Error loading profile page:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [targetUserId])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    // Validate type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.')
      return
    }

    setUploadingAvatar(true)
    setAvatarError('')

    try {
      const filePath = `${currentUser.id}/${Date.now()}-${file.name}`

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 3. Update profiles table
      const { error: dbError } = await (supabase
        .from('profiles') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)

      if (dbError) {
        throw dbError
      }

      // 4. Update local states so change is reflected instantly
      const updatedProfile = { ...viewedProfile, avatar_url: publicUrl }
      setViewedProfile(updatedProfile)
      setCurrentProfile(updatedProfile)

      // Sync with localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('skillswap_profile', JSON.stringify(updatedProfile))
      }
    } catch (err: any) {
      console.error('Error uploading profile picture:', err)
      setAvatarError(err.message || 'Error uploading profile picture.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleBlockUser = async () => {
    if (!currentUser || !targetUserId) return
    setBlockLoading(true)
    try {
      const { error } = await (supabase
        .from('blocked_users') as any)
        .insert({
          blocker_id: currentUser.id,
          blocked_id: targetUserId
        })

      if (error) throw error
      setIsBlocked(true)
      setShowBlockConfirm(false)
    } catch (err: any) {
      console.error("Error blocking user:", err)
      alert("Failed to block user: " + err.message)
    } finally {
      setBlockLoading(false)
    }
  }

  const handleUnblockUser = async () => {
    if (!currentUser || !targetUserId) return
    setBlockLoading(true)
    try {
      const { error } = await (supabase
        .from('blocked_users') as any)
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', targetUserId)

      if (error) throw error
      setIsBlocked(false)
    } catch (err: any) {
      console.error("Error unblocking user:", err)
      alert("Failed to unblock user: " + err.message)
    } finally {
      setBlockLoading(false)
    }
  }

  const handleReportUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !targetUserId || !reportReason) return
    setReportLoading(true)
    try {
      const { error } = await (supabase
        .from('reports') as any)
        .insert({
          reporter_id: currentUser.id,
          reported_user_id: targetUserId,
          reason: reportReason,
          details: reportDetails || null
        })

      if (error) throw error

      // Insert notification for the reported user (anonymously)
      const { error: notifError } = await (supabase.from('notifications') as any).insert({
        user_id: targetUserId,
        type: 'report',
        message: 'Your account has been flagged for review',
        related_post_id: null,
        related_user_id: null,
        is_read: false
      })

      if (notifError) {
        console.error("Error creating report notification:", notifError)
      }

      alert("Report submitted. We will review it shortly.")
      setShowReportModal(false)
      setReportReason('Spam')
      setReportDetails('')
    } catch (err: any) {
      console.error("Error reporting user:", err)
      alert("Failed to submit report: " + err.message)
    } finally {
      setReportLoading(false)
    }
  }
 
  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Qualitative rating badges helper
  const getRatingText = (stars: number) => {
    if (stars >= 4.5) return 'Exceptional'
    if (stars >= 3.5) return 'Great Swap'
    if (stars >= 2.5) return 'Good Partner'
    return 'Fair exchange'
  }

  const isOwnProfile = currentUser?.id === targetUserId

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
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
              <Compass className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Loading Profile</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Retrieving neighbor profile data slots...</p>
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

      {/* SIDEBAR NAVIGATION */}
      <Sidebar profile={currentProfile} supabase={supabase} user={currentUser} />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative">
        {/* BACKGROUND GLOWS */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

        {/* PROFILE INNER BODY */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
          
          {/* HEADER BACK NAVIGATION BUTTON */}
          <motion.div 
            variants={FADE_UP} 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5"
          >
            <button 
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B0B0D] border-2 border-white/5 text-white/40 hover:text-black hover:bg-[#FF4D00] hover:border-black transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5px]" />
              <span className="font-mono font-black text-[10px] uppercase tracking-wider">Back to Dashboard</span>
            </button>
            
            {isOwnProfile ? (
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2.5 bg-black hover:bg-[#FF4D00] text-white hover:text-black font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all border-2 border-white/10 hover:border-black shadow-[2px_2px_0px_rgba(255,77,0,0.1)] hover:shadow-none cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 stroke-[2px]" />
                <span>Account Settings</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {!isBlocked && (
                  <button
                    onClick={() => router.push(`/messages/${targetUserId}`)}
                    className="px-4 py-2.5 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer active:scale-[0.98] flex items-center gap-2 transition-all duration-200"
                  >
                    <MessageSquare className="w-3.5 h-3.5 stroke-[2.5px]" />
                    <span>Chat with Neighbor</span>
                  </button>
                )}
                
                {isBlocked ? (
                  <button
                    onClick={handleUnblockUser}
                    disabled={blockLoading}
                    className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border-2 border-rose-500/20 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-xl shadow-[3px_3px_0px_rgba(244,63,94,0.2)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{blockLoading ? 'Unblocking...' : 'Unblock'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBlockConfirm(true)}
                    disabled={blockLoading}
                    className="px-4 py-2.5 bg-black hover:bg-rose-500/10 border-2 border-white/10 hover:border-rose-500/25 text-white/50 hover:text-rose-400 rounded-xl shadow-[3px_3px_0px_rgba(244,63,94,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-400" />
                    <span>Block User</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="px-4 py-2.5 bg-black hover:bg-amber-500/10 border-2 border-white/10 hover:border-amber-500/25 text-white/50 hover:text-amber-400 rounded-xl shadow-[3px_3px_0px_rgba(245,158,11,0.1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer active:scale-[0.98] flex items-center gap-2"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Report User</span>
                </button>
              </div>
            )}
          </motion.div>

          {/* 1. TOP USER PROFILE CARD HEADER */}
          <motion.div 
            variants={FADE_UP}
            className="bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)] flex flex-col gap-6"
          >
            <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              
              {/* Left Identity details */}
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                {/* Large Initials circle / Avatar Image */}
                {isOwnProfile ? (
                  <div className="relative group shrink-0 select-none">
                    <div 
                      onClick={() => document.getElementById('profile-avatar-upload')?.click()}
                      className="w-20 h-20 rounded-[1.25rem] overflow-hidden border-2 border-white/15 hover:border-[#FF4D00] shadow-[4px_4px_0px_#000000] hover:shadow-[4px_4px_0px_#FF4D00] cursor-pointer relative transition-all duration-300 bg-[#0B0B0D]"
                      title="Change profile picture"
                    >
                      {viewedProfile?.avatar_url ? (
                        <img 
                          src={viewedProfile.avatar_url} 
                          alt={viewedProfile.full_name || 'User Avatar'} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-white/5 to-white/10 flex items-center justify-center font-display font-black text-3xl text-white">
                          {viewedProfile?.full_name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                      )}

                      {/* Dark Camera Overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                        <Camera className="w-5 h-5 text-white" />
                      </div>

                      {/* Loading spinner */}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center z-10">
                          <Loader2 className="w-5 h-5 animate-spin text-[#FF4D00]" />
                        </div>
                      )}
                    </div>

                    <input
                      id="profile-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    
                    {avatarError && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-40 p-2 bg-rose-500/10 border-2 border-rose-500/25 text-rose-300 text-[9px] font-mono rounded-lg z-20 text-center uppercase tracking-widest shadow-md">
                        <span>{avatarError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  viewedProfile?.avatar_url ? (
                    <div className="w-20 h-20 rounded-[1.25rem] overflow-hidden border-2 border-white/15 shadow-[4px_4px_0px_#000000] select-none shrink-0 bg-black">
                      <img 
                        src={viewedProfile.avatar_url} 
                        alt={viewedProfile.full_name || 'User Avatar'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-[1.25rem] bg-white/5 border-2 border-white/15 shadow-[4px_4px_0px_#000000] flex items-center justify-center font-display font-black text-3xl text-white select-none shrink-0 uppercase">
                      {viewedProfile?.full_name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                  )
                )}

                <div className="space-y-3.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 border-2 border-[#FF4D00]/30 rounded-lg font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-widest bg-[#FF4D00]/5 select-none">
                    <Sparkles className="w-3 h-3 text-[#FF4D00] animate-pulse" />
                    <span>Verified Swap Member</span>
                  </div>
                  
                  <h1 className="font-display font-black text-3xl sm:text-4xl leading-[0.9] text-white tracking-tight uppercase">
                    <SplitText
                      text={viewedProfile?.full_name || 'Neighbor'}
                      className="text-white inline-block"
                      delay={40}
                      duration={0.6}
                      ease="power3.out"
                      textAlign="left"
                      tag="span"
                    />
                  </h1>
                  
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 flex items-center justify-center sm:justify-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                    <span>{viewedProfile?.neighborhood || 'Local Area'} (ZIP {viewedProfile?.pin_code})</span>
                  </div>

                  {viewedProfile?.bio && (
                    <p className="text-xs sm:text-sm text-gray-400 font-semibold leading-relaxed max-w-xl pt-2">
                      {viewedProfile.bio}
                    </p>
                  )}

                  {viewedProfile?.availability && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-white/50 pt-1 justify-center sm:justify-start">
                      <Clock className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                      <span>
                        <span className="font-bold text-[#FF4D00]">Available:</span> {viewedProfile.availability}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Rating counters */}
              <div className="flex items-center justify-center lg:justify-end gap-6 bg-[#0B0B0D] border-2 border-white/10 rounded-[1.25rem] p-4 sm:p-5 self-center lg:self-auto min-w-[240px] shadow-[4px_4px_0px_#000000] hover:shadow-[4px_4px_0px_rgba(255,77,0,0.15)] hover:border-[#FF4D00]/25 transition-all">
                <div className="text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.35)] shrink-0" />
                    <strong className="font-display font-black text-2xl text-white leading-none">
                      {averageRating !== '0' ? averageRating : '0'}
                    </strong>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest block mt-1.5">Average Star</span>
                </div>

                <div className="w-px h-8 bg-white/10" />

                <div className="text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <Award className="w-5 h-5 text-[#FF4D00] shrink-0 stroke-[2px]" />
                    <strong className="font-display font-black text-2xl text-white leading-none">
                      {viewedReviews.length}
                    </strong>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest block mt-1.5">Reviews</span>
                </div>
              </div>

            </div>

            {/* Bottom skills Offered/Needed segment */}
            <div className="border-t border-white/[0.05] pt-5 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              
              {/* Offers */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold text-white/40 flex items-center gap-1.5 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Skills Offered (Teaches)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {viewedProfile?.skills_offered?.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 rounded-lg bg-emerald-500/5 text-emerald-400 border-2 border-emerald-500/20 text-[10px] font-mono font-bold uppercase tracking-widest shadow-[2px_2px_0px_rgba(16,185,129,0.05)]">
                      {skill}
                    </span>
                  )) || <span className="text-[10px] font-mono uppercase tracking-widest text-white/20 font-bold">None listed</span>}
                </div>
              </div>

              {/* Needs */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold text-white/40 flex items-center gap-1.5 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00]" />
                  Skills Requested (Wants to Learn)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {viewedProfile?.skills_needed?.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 rounded-lg bg-[#FF4D00]/5 text-[#FF9A3C] border-2 border-[#FF4D00]/20 text-[10px] font-mono font-bold uppercase tracking-widest shadow-[2px_2px_0px_rgba(255,77,0,0.05)]">
                      {skill}
                    </span>
                  )) || <span className="text-[10px] font-mono uppercase tracking-widest text-white/20 font-bold">None listed</span>}
                </div>
              </div>

            </div>

          </motion.div>

          {/* 2. MIDDLE ACTIVE POSTS SECTION */}
          <motion.section 
            variants={FADE_UP}
            className="space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
              <Layers className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="font-display font-black text-xl text-white uppercase tracking-tight">
                Active Swap Proposals
              </h2>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">
                {viewedPosts.length} slot{viewedPosts.length !== 1 ? 's' : ''}
              </span>
            </div>

            {viewedPosts.length === 0 ? (
              
              // Empty Proposals card
              <div className="bg-black border-2 border-white/10 p-10 text-center max-w-lg mx-auto flex flex-col items-center gap-4 rounded-[2rem] shadow-[6px_6px_0px_rgba(255,77,0,0.12)]">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white/40">
                  <Compass className="w-5.5 h-5.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-black text-sm text-white uppercase tracking-tight">No active slots</h4>
                  <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                    This user has no active skill swap posts currently published in the neighborhood.
                  </p>
                </div>
              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {viewedPosts.map((post) => (
                  <div 
                    key={post.id}
                    className="rounded-[1.5rem] p-6 border-2 bg-[#FFFCF9] border-black hover:border-[#FF4D00] flex flex-col justify-between group transition-all duration-300 relative overflow-hidden shadow-[6px_6px_0px_#000000] hover:shadow-[6px_6px_0px_#FF4D00] hover:-translate-x-1 hover:-translate-y-1"
                  >
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between">
                        {post.type === 'offer' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/35 text-[9px] font-mono font-bold uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            Offering
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF4D00]/10 text-black border border-[#FF4D00]/25 text-[9px] font-mono font-bold uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse shrink-0" />
                            Requesting
                          </span>
                        )}

                        <div className="flex items-center gap-1 text-[9px] font-mono text-black/40 uppercase font-bold">
                          <Clock className="w-3.5 h-3.5 text-black/30" />
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-1">
                        <h3 className="font-display font-black text-lg text-black group-hover:text-[#FF4D00] transition-colors leading-snug truncate uppercase tracking-tight">
                          {post.title}
                        </h3>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[10px] font-mono font-black uppercase text-black tracking-wider">
                          <Tag className="w-3 h-3 text-black" />
                          <span>Skill: {post.skill}</span>
                        </div>

                        <p className="text-black/80 text-xs font-semibold leading-relaxed line-clamp-3 pt-1">
                           {post.description}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer actions */}
                    <div className="pt-4 mt-5 border-t border-black/10 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {viewedProfile?.avatar_url ? (
                          <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-black shrink-0">
                            <img 
                              src={viewedProfile.avatar_url} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#FF4D00] flex items-center justify-center border-2 border-black font-bold text-[10px] text-black shrink-0 uppercase shadow-inner">
                            {viewedProfile?.full_name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[10px] font-display font-black uppercase text-black truncate max-w-[120px]">
                          {viewedProfile?.full_name}
                        </span>
                      </div>

                      {!isOwnProfile && (
                        <button
                          onClick={() => router.push(`/messages/${targetUserId}?post=${post.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF4D00] hover:bg-black border-2 border-black text-black hover:text-white font-mono font-black text-[9px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer group/btn"
                        >
                          <span>Swap</span>
                          <ArrowUpRight className="w-3 h-3 stroke-[2.5px] text-current group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            )}
          </motion.section>

          {/* 3. BOTTOM REVIEWS SECTION */}
          <motion.section 
            variants={FADE_UP}
            className="space-y-6"
          >
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <h2 className="font-display font-black text-xl text-white uppercase tracking-tight">
                Neighborhood Reviews
              </h2>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">
                {viewedReviews.length} feedback slot{viewedReviews.length !== 1 ? 's' : ''}
              </span>
            </div>

            {viewedReviews.length === 0 ? (
              
              // Empty Reviews card
              <div className="bg-black border-2 border-white/10 p-10 text-center max-w-lg mx-auto flex flex-col items-center gap-4 rounded-[2rem] shadow-[6px_6px_0px_rgba(255,77,0,0.12)]">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white/40">
                  <Award className="w-5.5 h-5.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-black text-sm text-white uppercase tracking-tight">No reviews yet</h4>
                  <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                    This user has not received any verified swap reviews yet. Completing swaps generates feedback logs!
                  </p>
                </div>
              </div>

            ) : (

              <div className="space-y-4.5">
                {viewedReviews.map((review) => (
                  <div 
                    key={review.id}
                    className="bg-[#0B0B0D] border-2 border-white/10 rounded-[1.5rem] hover:border-[#FF4D00] shadow-[4px_4px_0px_#000000] hover:shadow-[4px_4px_0px_rgba(255,77,0,0.12)] hover:border-[#FF4D00]/25 transition-all p-5 space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-radial-gradient from-white/[0.01] to-transparent pointer-events-none" />
                    
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-2">
                        {/* Star Rating icons */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              className={`w-3.5 h-3.5 ${s <= (review.rating || 0) ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.25)]' : 'text-white/10'}`} 
                            />
                          ))}
                        </div>
                        
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#FF4D00]/5 border-2 border-[#FF4D00]/20 text-[9px] font-mono font-bold text-[#FF9A3C] uppercase tracking-widest">
                          {getRatingText(review.rating || 0)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/30 uppercase font-bold">
                        <Calendar className="w-3.5 h-3.5 text-white/20" />
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                    </div>

                    {/* Review comment */}
                    {review.comment && (
                      <p className="text-gray-300 text-xs font-semibold leading-relaxed pl-1 italic relative z-10">
                        &quot;{review.comment}&quot;
                      </p>
                    )}

                    {/* Reviewer Author Profile link */}
                    <div className="pt-3 border-t border-white/[0.04] flex items-center gap-2.5 relative z-10">
                      {review.reviewer?.avatar_url ? (
                        <div 
                          onClick={() => router.push(`/profile/${review.reviewer_id}`)}
                          className="w-7 h-7 rounded-md overflow-hidden border-2 border-white/10 cursor-pointer shrink-0"
                          title={`View ${review.reviewer?.full_name}'s Profile`}
                        >
                          <img 
                            src={review.reviewer.avatar_url} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => router.push(`/profile/${review.reviewer_id}`)}
                          className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center border-2 border-white/10 font-bold text-[10px] text-white/40 cursor-pointer hover:bg-white/[0.06] transition-colors shrink-0 uppercase"
                          title={`View ${review.reviewer?.full_name}'s Profile`}
                        >
                          {review.reviewer?.full_name?.charAt(0).toUpperCase() || 'N'}
                        </div>
                      )}
                      <div>
                        <span 
                          onClick={() => router.push(`/profile/${review.reviewer_id}`)}
                          className="text-[10px] font-mono font-bold uppercase text-white hover:text-[#FF4D00] transition-colors cursor-pointer leading-none"
                          title={`View ${review.reviewer?.full_name}'s Profile`}
                        >
                          {review.reviewer?.full_name || 'Verified Neighbor'}
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-white/30 font-bold block pt-1.5">Verified Swap Partner</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            )}
          </motion.section>

        </main>
      </div>

      {/* BLOCK CONFIRMATION MODAL */}
      <AnimatePresence>
        {showBlockConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBlockConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-black border-2 border-white/10 rounded-[2rem] p-6 shadow-[12px_12px_0px_#EF4444] z-10 flex flex-col gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Ban className="w-6 h-6 stroke-[2px]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Block {viewedProfile?.full_name || 'User'}?</h3>
                  <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                    Are you sure you want to block this user? They will no longer be able to message you or see your published proposals.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setShowBlockConfirm(false)}
                  className="py-3.5 px-4 bg-black hover:bg-[#161618] text-white/60 hover:text-white border-2 border-white/10 hover:border-white/20 font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl shadow-[4px_4px_0px_rgba(255,255,255,0.05)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer text-center transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBlockUser}
                  disabled={blockLoading}
                  className="py-3.5 px-4 bg-rose-600 hover:bg-white text-black font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl border-2 border-black shadow-[4px_4px_0px_#EF4444] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer text-center flex items-center justify-center gap-2 transition-all duration-200"
                >
                  {blockLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Blocking...</span>
                    </>
                  ) : (
                    <span>Block User</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPORT USER MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md skillswap-grid-bg skillswap-grid-bg-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-[#0A0A0C] border-2 border-rose-500/30 rounded-[2rem] p-6 shadow-[0_0_50px_rgba(244,63,94,0.15)] shadow-[12px_12px_0px_#F43F5E] z-10 flex flex-col gap-5 text-gray-200 overflow-hidden animate-fadeIn"
            >
              {/* Internal Glowing Danger Aura */}
              <div className="absolute top-[-20%] right-[-20%] w-[200px] h-[200px] rounded-full bg-rose-500/10 blur-[60px] pointer-events-none z-0" />

              <div className="flex items-center gap-3 border-b border-white/[0.04] pb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-[9px] font-bold text-rose-500/50 uppercase tracking-widest">SECURE REPORT LINK</div>
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Report {viewedProfile?.full_name || 'User'}</h3>
                </div>
              </div>

              <form onSubmit={handleReportUser} className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                    Reason for Report
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[var(--app-bg)] border-2 border-white/10 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl focus:border-rose-500 focus:shadow-[0_0_15px_rgba(244,63,94,0.2)] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="Spam" className="bg-[var(--app-bg)]">Spam</option>
                    <option value="Inappropriate behavior" className="bg-[var(--app-bg)]">Inappropriate behavior</option>
                    <option value="Fake profile" className="bg-[var(--app-bg)]">Fake profile</option>
                    <option value="Harassment" className="bg-[var(--app-bg)]">Harassment</option>
                    <option value="Other" className="bg-[var(--app-bg)]">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    placeholder="Provide any additional details or context..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3.5 bg-[var(--app-bg)] border-2 border-white/10 text-white text-xs font-mono font-bold tracking-wider placeholder-white/20 focus:outline-none transition-all resize-none rounded-xl focus:border-rose-500 focus:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/[0.04] mt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="py-3.5 px-4 bg-black hover:bg-[#161618] text-white/60 hover:text-white border-2 border-white/10 hover:border-white/20 font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl shadow-[2px_2px_0px_rgba(255,255,255,0.05)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer text-center transition-all duration-200 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-black hover:text-black font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer text-center flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                    {reportLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span className="relative z-10 flex items-center gap-2">Submit Report</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
