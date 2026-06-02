'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  MapPin, 
  Tag, 
  Compass,
  ArrowRight,
  Clock,
  Star,
  Heart,
  MessageSquare,
  Award,
  Layers,
  FileVideo,
  X,
  History as HistoryIcon
} from 'lucide-react'

// Framer Motion Animation Presets
const FADE_UP = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as any } }
}

const TIMELINE_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

export default function HistoryPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // Data States
  const [completedSwaps, setCompletedSwaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLight, setIsLight] = useState(false)
  
  // Summary Stats State
  const [stats, setStats] = useState({
    completedCount: 0,
    avgRatingReceived: '0.0',
    likesCount: 0
  })

  // Lightbox State
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null)

  // Real-time MutationObserver to sync theme
  useEffect(() => {
    if (typeof document === 'undefined') return
    setIsLight(document.documentElement.classList.contains('light'))

    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains('light'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function loadHistoryData() {
      try {
        // 1. Auth check
        const { data: { session } } = await (supabase.auth.getSession() as any)
        let currentUser = session?.user || null
        if (!currentUser) {
          const { data: { user: verifiedUser } } = await (supabase.auth.getUser() as any)
          currentUser = verifiedUser
        }

        if (!currentUser) {
          router.push('/auth/login')
          return
        }
        setUser(currentUser)

        // 2. Fetch profile details
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

        // Sync with localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('skillswap_profile', JSON.stringify(freshProfile))
        }

        // 3. Fetch completed posts (is_active = false)
        const { data: completedPosts } = await (supabase
          .from('posts')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('is_active', false)
          .order('created_at', { ascending: false }) as any)

        if (!completedPosts || completedPosts.length === 0) {
          setCompletedSwaps([])
          
          // Load overall stats even if 0 completed posts
          await loadGeneralStats(currentUser.id, 0)
          setLoading(false)
          return
        }

        const postIds = completedPosts.map((p: any) => p.id)

        // 4. Batch query media, reviews, and messages using `.in()` to prevent N+1 queries
        const [mediaRes, reviewsRes, messagesRes] = await Promise.all([
          (supabase.from('post_media').select('post_id, url, type').in('post_id', postIds) as any),
          (supabase.from('reviews').select('post_id, rating, comment, reviewer_id, reviewed_id').in('post_id', postIds) as any),
          (supabase.from('messages').select('post_id, sender_id, receiver_id').in('post_id', postIds) as any)
        ])

        const mediaData = mediaRes.data || []
        const reviewsData = reviewsRes.data || []
        const messagesData = messagesRes.data || []

        // 5. Resolve partner IDs for each completed post
        const partnerIdMap = new Map<string, string>() // post_id -> partner_id
        const uniquePartnerIds = new Set<string>()

        completedPosts.forEach((post: any) => {
          let partnerId: string | null = null

          // Look in messages first
          const postMessages = messagesData.filter((m: any) => m.post_id === post.id)
          for (const msg of postMessages) {
            if (msg.sender_id !== currentUser.id) {
              partnerId = msg.sender_id
              break
            }
            if (msg.receiver_id !== currentUser.id) {
              partnerId = msg.receiver_id
              break
            }
          }

          // Fallback to reviews associated with this post
          if (!partnerId) {
            const postReviews = reviewsData.filter((r: any) => r.post_id === post.id)
            const given = postReviews.find((r: any) => r.reviewer_id === currentUser.id)
            if (given) {
              partnerId = given.reviewed_id
            } else {
              const received = postReviews.find((r: any) => r.reviewed_id === currentUser.id)
              if (received) {
                partnerId = received.reviewer_id
              }
            }
          }

          if (partnerId) {
            partnerIdMap.set(post.id, partnerId)
            uniquePartnerIds.add(partnerId)
          }
        });

        // 6. Fetch resolved partner profiles in one batch
        const partnerProfilesMap = new Map<string, any>()
        if (uniquePartnerIds.size > 0) {
          const { data: partnerProfiles } = await (supabase
            .from('profiles')
            .select('id, full_name, avatar_url, neighborhood')
            .in('id', Array.from(uniquePartnerIds)) as any)

          partnerProfiles?.forEach((p: any) => {
            partnerProfilesMap.set(p.id, p)
          })
        }

        // 7. Assemble rich posts list
        const richSwaps = completedPosts.map((post: any) => {
          const postMedia = mediaData.filter((m: any) => m.post_id === post.id)
          const postReviews = reviewsData.filter((r: any) => r.post_id === post.id)
          
          const reviewReceived = postReviews.find((r: any) => r.reviewed_id === currentUser.id) || null
          const reviewGiven = postReviews.find((r: any) => r.reviewer_id === currentUser.id) || null
          
          const partnerId = partnerIdMap.get(post.id) || null
          const partnerProfile = partnerId ? partnerProfilesMap.get(partnerId) : null

          return {
            ...post,
            media: postMedia,
            reviewReceived,
            reviewGiven,
            partnerProfile
          }
        })

        setCompletedSwaps(richSwaps)

        // 8. Load stats using batch aggregates
        await loadGeneralStats(currentUser.id, richSwaps.length)

      } catch (error) {
        console.error('Error loading history timeline:', error)
      } finally {
        setLoading(false)
      }
    }

    async function loadGeneralStats(userId: string, completedCount: number) {
      try {
        // Fetch all reviews received by the user
        const { data: allReviewsReceived } = await (supabase
          .from('reviews')
          .select('rating')
          .eq('reviewed_id', userId) as any)

        const ratingSum = allReviewsReceived?.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) || 0
        const totalReviews = allReviewsReceived?.length || 0
        const avgRatingReceived = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : '0.0'

        // Fetch likes count across all user's posts
        const { data: allUserPosts } = await (supabase
          .from('posts')
          .select('id')
          .eq('user_id', userId) as any)
        
        const userPostIds = allUserPosts?.map((p: any) => p.id) || []
        let likesCount = 0
        if (userPostIds.length > 0) {
          const { count } = await (supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .in('post_id', userPostIds) as any)
          likesCount = count || 0
        }

        setStats({
          completedCount,
          avgRatingReceived,
          likesCount
        })
      } catch (err) {
        console.error('Error loading user stats:', err)
      }
    }

    loadHistoryData()
  }, [])

  // Format Date Helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Star Icons Renderer
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating
                ? 'fill-[#FF4D00] text-[#FF4D00]'
                : 'text-black/10'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen bg-theme-bg text-theme-fg flex flex-col justify-center items-center font-sans relative overflow-hidden w-full"
        >
          {/* Cyber Tech Blueprint Grid Overlay */}
          <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className={`w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center border-2 border-black transition-all duration-300 ${
              isLight ? 'shadow-[4px_4px_0px_#000000]' : 'shadow-[4px_4px_0px_#FFFFFF]'
            }`}>
              <HistoryIcon className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-theme-fg uppercase tracking-tight">Syncing Swaps</h3>
              <p className={`text-[10px] font-mono uppercase tracking-widest font-bold transition-colors duration-300 ${
                isLight ? 'text-black/60' : 'text-white/30'
              }`}>
                Constructing timeline queue...
              </p>
            </div>
            
            {/* Kinetic Ping-Pong Loader */}
            <div className={`flex items-center justify-center gap-12 h-16 relative w-48 border-2 border-black rounded-xl bg-black px-4 mt-4 transition-all duration-300 ${
              isLight ? 'shadow-[4px_4px_0px_#000000]' : 'shadow-[4px_4px_0px_#FF4D00]'
            }`}>
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
                className={`w-3 h-3 rounded-full shrink-0 transition-all duration-300 ${
                  isLight ? 'bg-white shadow-[0_0_8px_#FFFFFF]' : 'bg-white shadow-[0_0_8px_#FF4D00]'
                }`}
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
          className="min-h-screen bg-theme-bg text-theme-fg flex flex-col lg:flex-row font-sans selection:bg-[#FF4D00]/30 selection:text-white relative overflow-x-clip w-full"
        >
          {/* Cyber Tech Blueprint Grid Overlay */}
          <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />

          {/* SIDEBAR NAVIGATION */}
          <Sidebar profile={profile} supabase={supabase} user={user} />

          {/* MAIN CONTAINER */}
          <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative">
            {/* BACKGROUND GLOWS */}
            <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

            {/* INNER CONTENT CONTAINER */}
            <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
              
              {/* HERO PANEL */}
              <motion.div 
                variants={FADE_UP}
                className={`bg-black border-2 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md transition-all duration-300 ${
                  isLight 
                    ? 'border-black shadow-[8px_8px_0px_#000000]' 
                    : 'border-white/10 shadow-[8px_8px_0px_rgba(255,77,0,0.12)]'
                }`}
              >
                <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none">
                      <Sparkles className="w-3 h-3 text-[#FF4D00] animate-pulse" />
                      <span>Swapping History Timeline</span>
                    </div>
                    <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl leading-[0.9] text-white tracking-tight uppercase flex flex-wrap gap-x-2">
                      <SplitText
                        text="Swap"
                        className="text-white"
                        delay={40}
                        duration={0.6}
                        ease="power3.out"
                        textAlign="left"
                        tag="span"
                      />
                      <SplitText
                        text="History"
                        className="text-[#FF4D00]"
                        delay={40}
                        duration={0.6}
                        ease="power3.out"
                        textAlign="left"
                        tag="span"
                      />
                    </h1>
                    <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-2">
                      A visual archive of your completed hyperlocal exchanges and reputation stars.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* SUMMARY STATS BAR */}
              <motion.div 
                variants={FADE_UP}
                className="grid grid-cols-3 gap-4"
              >
                {/* Stat 1 */}
                <div className={`border-2 rounded-2xl p-4 text-center transition-all duration-300 flex flex-col justify-center min-h-[90px] ${
                  isLight 
                    ? 'bg-[#FFFCF9] border-black shadow-[4px_4px_0px_#000000]' 
                    : 'bg-black border-white/10 shadow-[4px_4px_0px_#FF4D00]/25'
                }`}>
                  <span className={`block text-[8px] font-mono font-bold tracking-widest uppercase transition-colors duration-300 ${
                    isLight ? 'text-black/60' : 'text-white/40'
                  }`}>
                    Swaps Completed
                  </span>
                  <strong className="block text-xl sm:text-2xl font-display font-black text-[#FF4D00] mt-1.5 leading-none">
                    {stats.completedCount}
                  </strong>
                </div>

                {/* Stat 2 */}
                <div className={`border-2 rounded-2xl p-4 text-center transition-all duration-300 flex flex-col justify-center min-h-[90px] ${
                  isLight 
                    ? 'bg-[#FFFCF9] border-black shadow-[4px_4px_0px_#000000]' 
                    : 'bg-black border-white/10 shadow-[4px_4px_0px_#FF4D00]/25'
                }`}>
                  <span className={`block text-[8px] font-mono font-bold tracking-widest uppercase transition-colors duration-300 ${
                    isLight ? 'text-black/60' : 'text-white/40'
                  }`}>
                    Avg Rating Received
                  </span>
                  <strong className={`block text-xl sm:text-2xl font-display font-black mt-1.5 leading-none flex items-center justify-center gap-1 transition-colors duration-300 ${
                    isLight ? 'text-emerald-600' : 'text-emerald-400'
                  }`}>
                    <span>⭐</span>
                    <span>{stats.avgRatingReceived}</span>
                  </strong>
                </div>

                {/* Stat 3 */}
                <div className={`border-2 rounded-2xl p-4 text-center transition-all duration-300 flex flex-col justify-center min-h-[90px] ${
                  isLight 
                    ? 'bg-[#FFFCF9] border-black shadow-[4px_4px_0px_#000000]' 
                    : 'bg-black border-white/10 shadow-[4px_4px_0px_#FF4D00]/25'
                }`}>
                  <span className={`block text-[8px] font-mono font-bold tracking-widest uppercase transition-colors duration-300 ${
                    isLight ? 'text-black/60' : 'text-white/40'
                  }`}>
                    Total Likes Received
                  </span>
                  <strong className={`block text-xl sm:text-2xl font-display font-black mt-1.5 leading-none flex items-center justify-center gap-1 transition-colors duration-300 ${
                    isLight ? 'text-pink-600' : 'text-pink-400'
                  }`}>
                    <span>❤️</span>
                    <span>{stats.likesCount}</span>
                  </strong>
                </div>
              </motion.div>

              {/* TIMELINE VIEW */}
              <div className="relative">
                <AnimatePresence mode="wait">
                  {completedSwaps.length === 0 ? (
                    
                    // EMPTY STATE
                    <motion.div 
                      key="empty-state"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className={`w-full border-2 p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-6 mt-6 rounded-[2rem] transition-all duration-300 ${
                        isLight 
                          ? 'bg-[#FFFCF9] border-black shadow-[6px_6px_0px_#000000]' 
                          : 'bg-black border-white/10 shadow-[6px_6px_0px_rgba(255,77,0,0.12)]'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                        isLight 
                          ? 'bg-[#FF4D00]/10 border-[#FF4D00]/25 text-[#FF4D00] shadow-[2px_2px_0px_#000000]' 
                          : 'bg-[#FF4D00]/5 border-[#FF4D00]/20 text-[#FF4D00]'
                      }`}>
                        <Compass className="w-7 h-7" />
                      </div>

                      <div className="space-y-2">
                        <h3 className={`font-display font-black text-lg uppercase tracking-tight transition-colors duration-300 ${
                          isLight ? 'text-black' : 'text-white'
                        }`}>
                          No completed swaps
                        </h3>
                        <p className={`font-mono text-[10px] uppercase tracking-widest leading-relaxed max-w-xs mx-auto transition-colors duration-300 ${
                          isLight ? 'text-black/60' : 'text-white/40'
                        }`}>
                          No swaps completed yet. Start exchanging skills with your neighbors!
                        </p>
                      </div>

                      <button 
                        onClick={() => router.push('/posts')}
                        className={`px-6 py-3 rounded-xl bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.99] border-2 border-black cursor-pointer hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${
                          isLight ? 'shadow-[4px_4px_0px_#000000]' : 'shadow-[4px_4px_0px_#FFFFFF]'
                        }`}
                      >
                        <span>Explore Swap Board</span>
                      </button>
                    </motion.div>

                  ) : (

                    // VERTICAL TIMELINE CONTAINER
                    <motion.div 
                      key="timeline"
                      variants={TIMELINE_CONTAINER}
                      className={`relative border-l ml-4 md:ml-32 pl-6 sm:pl-10 space-y-12 py-4 transition-colors duration-300 ${
                        isLight ? 'border-black/25' : 'border-white/10'
                      }`}
                    >
                      {completedSwaps.map((post) => (
                        <motion.div
                          key={post.id}
                          variants={FADE_UP}
                          className="relative"
                        >
                          {/* Timeline bullet node */}
                          <div className={`absolute -left-[31px] sm:-left-[47px] top-6 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300 ${
                            isLight 
                              ? 'bg-[#FFFCF9] border-black shadow-[2px_2px_0px_#000000]' 
                              : 'bg-[#070709] border-[#FF4D00] shadow-[0_0_8px_rgba(255,77,0,0.7)]'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                              isLight ? 'bg-black' : 'bg-[#FF4D00]'
                            }`} />
                          </div>

                          {/* Desktop side date indicator */}
                          <div className="absolute left-[-170px] top-4 w-32 text-right hidden md:block select-none">
                            <span className={`text-[10px] font-mono font-black uppercase tracking-wider block transition-colors duration-300 ${
                              isLight ? 'text-black/80' : 'text-white/40'
                            }`}>
                              {formatDate(post.created_at)}
                            </span>
                            <span className={`text-[8px] font-mono uppercase tracking-widest mt-1 block transition-colors duration-300 ${
                              isLight ? 'text-black/60' : 'text-white/20'
                            }`}>
                              Completed Slot
                            </span>
                          </div>

                          {/* Timeline Card */}
                          <div className="bg-[#FFFCF9] border-2 border-black rounded-[2rem] p-5 sm:p-7 shadow-[var(--post-shadow)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-300 flex flex-col gap-5">
                            
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-4.5">
                              <div className="space-y-1.5">
                                {/* Mobile-only Date display */}
                                <span className="inline-block md:hidden text-[9px] font-mono text-[#FF4D00] uppercase tracking-wider font-black">
                                  {formatDate(post.created_at)}
                                </span>
                                
                                <h3 className="font-display font-black text-lg text-black group-hover:text-[#FF4D00] transition-colors leading-snug uppercase tracking-tight">
                                  {post.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[9px] font-mono font-black uppercase text-black tracking-wider">
                                    <Tag className="w-3 h-3 text-black" />
                                    <span>Skill: {post.skill}</span>
                                  </div>

                                  {post.type === 'offer' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/25 text-[9px] font-mono font-black uppercase tracking-wider">
                                      Offering
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FF4D00]/10 text-black border border-[#FF4D00]/25 text-[9px] font-mono font-black uppercase tracking-wider">
                                      Requesting
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Card Body: Description snippet */}
                            {post.description && (
                              <p className="text-black/80 text-xs font-semibold leading-relaxed line-clamp-3">
                                {post.description}
                              </p>
                            )}

                            {/* Post media thumbnails if uploaded */}
                            {post.media && post.media.length > 0 && (
                              <div className="flex flex-wrap gap-2.5 pt-1">
                                {post.media.map((item: any, index: number) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => setActiveLightboxImage(item.url)}
                                    className="w-14 h-14 rounded-lg overflow-hidden border border-black/10 hover:border-[#FF4D00]/50 transition-all bg-black shrink-0 relative cursor-zoom-in group"
                                  >
                                    {item.type === 'video' || item.url.toLowerCase().endsWith('.mp4') ? (
                                      <div className="w-full h-full relative">
                                        <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                          <FileVideo className="w-4 h-4 text-white/60" />
                                        </div>
                                      </div>
                                    ) : (
                                      <img src={item.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Swapped Partner & Feedback Review Panel */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-2 border-t border-black/10">
                              {/* Left: Swapped Partner profile link */}
                              <div className="flex flex-col gap-2">
                                <span className="text-[9px] font-mono text-black/40 uppercase tracking-widest font-black block">
                                  Swapped Partner
                                </span>
                                {post.partnerProfile ? (
                                  <div 
                                    onClick={() => router.push(`/profile/${post.partnerProfile.id}`)}
                                    className="inline-flex items-center gap-2.5 p-2 rounded-xl bg-black/[0.02] border border-black/10 hover:border-[#FF4D00]/50 hover:bg-[#FF4D00]/5 transition-all cursor-pointer self-start"
                                    title="View neighbor profile"
                                  >
                                    {post.partnerProfile.avatar_url ? (
                                      <img 
                                        src={post.partnerProfile.avatar_url} 
                                        className="w-8 h-8 rounded-lg object-cover border border-black/10 shrink-0" 
                                        alt="" 
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-[#FF4D00]/10 border border-[#FF4D00]/30 text-[#FF4D00] flex items-center justify-center font-bold text-xs shrink-0 select-none">
                                        {post.partnerProfile.full_name?.charAt(0).toUpperCase() || 'N'}
                                      </div>
                                    )}
                                    <div className="text-left min-w-0">
                                      <div className="text-[11px] font-display font-black uppercase text-black leading-none truncate max-w-[120px]">
                                        {post.partnerProfile.full_name}
                                      </div>
                                      <div className="text-[9px] font-mono text-black/55 uppercase tracking-wider mt-1.5 truncate max-w-[120px] flex items-center gap-0.5">
                                        <MapPin className="w-2.5 h-2.5 text-black/40 shrink-0" />
                                        <span>{post.partnerProfile.neighborhood || 'Local Area'}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  /* Unknown neighbor fallback grace output */
                                  <div className="inline-flex items-center gap-2.5 p-2 rounded-xl bg-black/[0.02] border border-black/15 text-black/40 self-start select-none">
                                    <div className="w-8 h-8 rounded-lg bg-black/5 border border-black/10 text-black/40 flex items-center justify-center font-bold text-xs shrink-0">
                                      ?
                                    </div>
                                    <div className="text-left">
                                      <div className="text-[11px] font-bold text-black/40 leading-none">
                                        Unknown neighbor
                                      </div>
                                      <div className="text-[9px] font-mono text-black/20 uppercase tracking-wider mt-1.5">
                                        Local Area
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right: Star Feedback details */}
                              <div className="flex flex-col gap-2.5">
                                <span className="text-[9px] font-mono text-black/40 uppercase tracking-widest font-black block">
                                  Swap Feedback
                                </span>
                                <div className="space-y-2">
                                  {/* Received */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-black/40 uppercase tracking-wider min-w-[75px] block">
                                      Received:
                                    </span>
                                    {post.reviewReceived ? (
                                      renderStars(post.reviewReceived.rating)
                                    ) : (
                                      <span className="text-[9px] font-mono text-black/30 uppercase tracking-widest">
                                        Pending
                                      </span>
                                    )}
                                  </div>

                                  {/* Given */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-black/40 uppercase tracking-wider min-w-[75px] block">
                                      Given:
                                    </span>
                                    {post.reviewGiven ? (
                                      renderStars(post.reviewGiven.rating)
                                    ) : (
                                      <span className="text-[9px] font-mono text-black/30 uppercase tracking-widest">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Review snippet comment block */}
                            {post.reviewReceived?.comment && (
                              <div className="p-3.5 rounded-xl bg-black/[0.03] border border-black/5 text-[11px] font-mono font-bold leading-relaxed text-black/60 flex gap-2">
                                <MessageSquare className="w-4 h-4 text-[#FF4D00] shrink-0 mt-0.5" />
                                <div className="italic">
                                  &ldquo;{post.reviewReceived.comment}&rdquo;
                                </div>
                              </div>
                            )}

                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                  )}
                </AnimatePresence>
              </div>

            </main>
          </div>

          {/* FULL SCREEN LIGHTBOX FOR MEDIA VIEWING */}
          <AnimatePresence>
            {activeLightboxImage && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveLightboxImage(null)}
                  className="absolute inset-0 bg-black/95 cursor-zoom-out"
                />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="relative max-w-5xl max-h-[90vh] z-10 flex flex-col gap-4"
                >
                  {activeLightboxImage.toLowerCase().endsWith('.mp4') ? (
                    <video
                      src={activeLightboxImage}
                      controls
                      autoPlay
                      className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/10 bg-black shadow-2xl"
                    />
                  ) : (
                    <img
                      src={activeLightboxImage}
                      alt="Enlarged timeline media"
                      className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/10 bg-black shadow-2xl"
                    />
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setActiveLightboxImage(null)}
                    className="self-center px-4 py-2 bg-white/5 border border-white/10 hover:border-[#FF4D00] hover:text-[#FF4D00] text-white font-mono text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg"
                  >
                    Close Zoom
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
