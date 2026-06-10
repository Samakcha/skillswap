'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  MapPin, 
  Search, 
  Layers, 
  Compass, 
  Clock, 
  ArrowUpRight, 
  Tag, 
  Star, 
  Award, 
  Calendar,
  Loader2
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
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
}

export default function UserReviewsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  // State for interactive features
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | '5' | '4' | 'below_4'>('all')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/' key press if not inside input/textarea
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    async function loadData() {
      // 1. Try to load profile instantly from localStorage cache to bypass round-trips
      let cachedProfile: any = null
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('skillswap_profile')
          if (raw) {
            cachedProfile = JSON.parse(raw)
            setProfile(cachedProfile)
          }
        } catch (e) {
          console.error('Failed to parse cached profile:', e)
        }
      }

      try {
        // 2. Auth check
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

        // 3. Fetch fresh profile details from DB
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
        
        // Update localStorage cache
        if (typeof window !== 'undefined') {
          localStorage.setItem('skillswap_profile', JSON.stringify(freshProfile))
        }

        // 4. Fetch all reviews received by this user
        const { data: userReviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url, neighborhood), posts(title, skill)')
          .eq('reviewed_id', currentUser.id)
          .order('created_at', { ascending: false })

        if (reviewsError) {
          throw reviewsError
        }

        setReviews(userReviews || [])
      } catch (error) {
        console.error('Error loading reviews data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Client-side dynamic filtering
  const filteredReviews = reviews.filter(review => {
    // 1. Filter by Tab
    if (activeTab === '5' && review.rating !== 5) return false
    if (activeTab === '4' && review.rating !== 4) return false
    if (activeTab === 'below_4' && review.rating >= 4) return false
    
    // 2. Filter by Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      const reviewerNameMatch = review.reviewer?.full_name?.toLowerCase().includes(query)
      const commentMatch = review.comment?.toLowerCase().includes(query)
      const postTitleMatch = review.posts?.title?.toLowerCase().includes(query)
      const postSkillMatch = review.posts?.skill?.toLowerCase().includes(query)
      return reviewerNameMatch || commentMatch || postTitleMatch || postSkillMatch
    }
    
    return true
  })

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Qualitative rating badges helper
  const getRatingBadgeText = (stars: number) => {
    if (stars === 5) return 'Exceptional'
    if (stars === 4) return 'Great Swap'
    if (stars === 3) return 'Good Partner'
    return 'Fair exchange'
  }

  // Calculate stats
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(2)
    : '0'
  const fiveStarCount = reviews.filter(r => r.rating === 5).length
  const fourStarCount = reviews.filter(r => r.rating === 4).length
  const belowFourCount = reviews.filter(r => r.rating < 4).length

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
          {/* Cyber Tech Blueprint Grid */}
          <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
              <Award className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Review Queue</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Retrieving neighbor feedback slots...</p>
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
          {/* Cyber Tech Blueprint Grid Overlay */}
          <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />

          {/* SIDEBAR NAVIGATION */}
          <Sidebar profile={profile} supabase={supabase} user={user} />

          {/* MAIN CONTAINER */}
          <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative">
            {/* BACKGROUND GLOWS */}
            <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

            {/* DASHBOARD INNER BODY */}
            <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
              
              {/* HERO GREETING PANEL */}
              <motion.div 
                variants={FADE_UP}
                className="bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)]"
              >
                <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  
                  {/* Left Col: Titles */}
                  <div className="lg:col-span-8 space-y-4.5">
                    <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl leading-[0.9] text-white tracking-tight uppercase flex flex-col gap-2">
                      <SplitText
                        text="Neighborhood"
                        className="text-white inline-block"
                        delay={40}
                        duration={0.6}
                        ease="power3.out"
                        textAlign="left"
                        tag="span"
                      />
                      <SplitText
                        text="Feedback Logs"
                        className="text-[#FF4D00] inline-block"
                        delay={40}
                        duration={0.6}
                        ease="power3.out"
                        textAlign="left"
                        tag="span"
                      />
                    </h1>
                    <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-2">
                      Your community value index. View stars and feedback logged by neighbors following successful swaps.
                    </p>
                  </div>

                  {/* Right Col: Stats breakdown */}
                  <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full self-stretch lg:self-auto">
                    
                    {/* Average Stars */}
                    <div className="bg-[#09090b] border-2 border-white/5 hover:border-[#FF4D00]/30 transition-colors duration-300 rounded-2xl p-4 text-center shadow-md flex flex-col justify-between">
                      <span className="block text-[8px] font-mono font-bold text-white/40 tracking-wider uppercase">Avg Rating</span>
                      <div className="flex items-center gap-1 justify-center py-2.5">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.25)] shrink-0" />
                        <strong className="text-xl font-display font-black text-white leading-none">
                          {averageRating}
                        </strong>
                      </div>
                      <span className="block text-[8px] font-mono text-white/20 uppercase tracking-wider">Out of 5 Stars</span>
                    </div>

                    {/* Total Reviews */}
                    <div className="bg-[#09090b] border-2 border-white/5 hover:border-[#FF4D00]/30 transition-colors duration-300 rounded-2xl p-4 text-center shadow-md flex flex-col justify-between">
                      <span className="block text-[8px] font-mono font-bold text-white/40 tracking-wider uppercase">Total Slots</span>
                      <div className="flex items-center gap-1 justify-center py-2.5">
                        <Award className="w-4 h-4 text-[#FF4D00] shrink-0" />
                        <strong className="text-xl font-display font-black text-[#FF4D00] leading-none">
                          {totalReviews}
                        </strong>
                      </div>
                      <span className="block text-[8px] font-mono text-white/20 uppercase tracking-wider">Feedback items</span>
                    </div>

                  </div>
                </div>
              </motion.div>

              {/* FEED CONTROLS BAR: SEARCH & TABS */}
              <motion.div 
                variants={FADE_UP}
                className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 border-b border-white/10 pb-5"
              >
                {/* Tab selectors */}
                <div className="flex items-center overflow-x-auto p-1 rounded-2xl bg-black border border-white/10 self-start max-w-full relative custom-scrollbar">
                  
                  {/* ALL */}
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'all' ? 'text-black' : 'text-white/50 hover:text-white'}`}
                  >
                    {activeTab === 'all' && (
                      <motion.span 
                        layoutId="activeReviewsTabIndicator"
                        className="absolute inset-0 bg-[#FF4D00] rounded-xl z-[-1] shadow-lg shadow-[#FF4D00]/15"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    All Logs ({totalReviews})
                  </button>

                  {/* 5 STARS */}
                  <button 
                    onClick={() => setActiveTab('5')}
                    className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === '5' ? 'text-emerald-400' : 'text-white/50 hover:text-white'}`}
                  >
                    {activeTab === '5' && (
                      <motion.span 
                        layoutId="activeReviewsTabIndicator"
                        className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-xl z-[-1]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      5 Stars ({fiveStarCount})
                    </span>
                  </button>

                  {/* 4 STARS */}
                  <button 
                    onClick={() => setActiveTab('4')}
                    className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === '4' ? 'text-[#FF9A3C]' : 'text-white/50 hover:text-white'}`}
                  >
                    {activeTab === '4' && (
                      <motion.span 
                        layoutId="activeReviewsTabIndicator"
                        className="absolute inset-0 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-xl z-[-1]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FF4D00] shrink-0" />
                      4 Stars ({fourStarCount})
                    </span>
                  </button>

                  {/* 3 STARS & BELOW */}
                  <button 
                    onClick={() => setActiveTab('below_4')}
                    className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'below_4' ? 'text-white font-bold' : 'text-white/50 hover:text-white'}`}
                  >
                    {activeTab === 'below_4' && (
                      <motion.span 
                        layoutId="activeReviewsTabIndicator"
                        className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl z-[-1]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                      3 Stars & Below ({belowFourCount})
                    </span>
                  </button>

                </div>

                {/* Search & Dynamic Count Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
                  {/* Dynamic Results Counter */}
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse shrink-0" />
                    <span>Showing <strong className="text-[#FF4D00] font-black">{filteredReviews.length}</strong> logs</span>
                  </div>

                  {/* Search input container */}
                  <div className="relative w-full sm:w-80 md:w-96 group rounded-2xl bg-[#09090b] border border-white/10 focus-within:border-[#FF4D00] focus-within:ring-1 focus-within:ring-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all duration-200">
                    <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 ${isSearchFocused ? 'text-[#FF4D00]' : 'text-white/40'}`}>
                      <Search className={`w-4 h-4 ${isSearchFocused ? 'scale-110' : ''} transition-transform duration-300`} />
                    </span>
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Search reviewer, comment, skill..."
                      value={searchQuery}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-transparent border-0 text-white placeholder-white/20 text-xs font-mono font-bold tracking-wider focus:outline-none"
                    />
                    {searchQuery ? (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[10px] font-mono font-bold uppercase text-white/50 hover:text-white transition-colors cursor-pointer"
                      >
                        [clear]
                      </button>
                    ) : (
                      !isSearchFocused && (
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">
                            /
                          </kbd>
                        </div>
                      )
                    )}
                  </div>
                </div>

              </motion.div>

              {/* REVIEWS GRID LAYOUT */}
              <motion.div 
                variants={CONTAINER_STAGGER}
                className="relative"
              >
                
                <AnimatePresence mode="wait">
                  {filteredReviews.length === 0 ? (
                    
                    // EMPTY STATE
                    <motion.div 
                      key="empty-state"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4 }}
                      className="w-full bg-black border-2 border-white/10 p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-6 mt-6 rounded-[2rem] shadow-[6px_6px_0px_rgba(255,77,0,0.12)]"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center text-[#FF4D00]">
                        <Compass className="w-7 h-7" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">No feedback found</h3>
                        <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                          {searchQuery 
                            ? `We couldn't find any feedback logs matching "${searchQuery}".`
                            : activeTab === 'all'
                              ? "You haven't received any verified reviews yet. Complete swaps with neighbors to start logging feedback!"
                              : `You don't have any reviews matching the selected rating filter.`
                          }
                        </p>
                      </div>

                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="px-6 py-3 rounded-xl bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.99] border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
                        >
                          Clear Filter
                        </button>
                      )}
                    </motion.div>

                  ) : (

                    // DYNAMIC REVIEWS LIST GRID
                    <div 
                      key="feed-grid"
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {filteredReviews.map((review) => (
                        <motion.div 
                          key={review.id}
                          variants={FADE_UP}
                          layout
                          className="bg-[#FFFCF9] rounded-2xl p-6 border-2 border-black hover:border-[#FF4D00] flex flex-col justify-between group transition-all duration-300 relative overflow-hidden shadow-[6px_6px_0px_#000000] hover:shadow-[6px_6px_0px_#FF4D00] hover:-translate-x-1 hover:-translate-y-1"
                        >
                          <div className="space-y-4.5 relative z-10">
                            
                            {/* CARD RATINGS BADGES */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {/* Stars Badge */}
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FF4D00]/10 text-black border border-[#FF4D00]/25 text-[9px] font-mono font-black uppercase tracking-widest select-none">
                                  <Star className="w-3.5 h-3.5 text-[#FF4D00] fill-[#FF4D00] shrink-0" />
                                  <span>{review.rating} / 5</span>
                                </span>

                                {/* Quality tag */}
                                <span className={`inline-flex items-center px-2.5 py-1 rounded border text-[9px] font-mono font-black uppercase tracking-widest ${
                                  review.rating === 5 
                                    ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25' 
                                    : 'bg-amber-500/10 text-amber-800 border-amber-500/25'
                                }`}>
                                  {getRatingBadgeText(review.rating || 0)}
                                </span>
                              </div>

                              {/* Created date display */}
                              <div className="flex items-center gap-1 text-[9px] font-mono text-black/40 uppercase tracking-wider font-bold">
                                <Clock className="w-3.5 h-3.5 text-black/30" />
                                <span>{formatDate(review.created_at)}</span>
                              </div>
                            </div>

                            {/* REVIEW MAIN CONTENT */}
                            <div className="space-y-3 pt-1">
                              {/* Post title / Proposal Title */}
                              <h3 className="font-display font-black text-lg text-black group-hover:text-[#FF4D00] transition-colors leading-snug truncate uppercase tracking-tight" title={review.posts?.title || "Skill Swap Exchange"}>
                                {review.posts?.title || "Skill Swap Exchange"}
                              </h3>

                              {/* Target skill pill */}
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[10px] font-mono font-black uppercase text-black tracking-wider">
                                <Tag className="w-3 h-3 text-black" />
                                <span>Skill: {review.posts?.skill || "Exchange"}</span>
                              </div>

                              {/* Comments */}
                              <p className="text-black/80 text-xs font-semibold leading-relaxed line-clamp-4 pt-1 italic">
                                &quot;{review.comment || 'No feedback text provided.'}&quot;
                              </p>
                            </div>

                          </div>

                          {/* CARD FOOTER - REVIEWER DETAILS */}
                          <div className="pt-5 mt-5 border-t border-black/10 flex items-center justify-between relative z-10">
                            {/* Author metadata */}
                            <div 
                              onClick={() => router.push(`/profile/${review.reviewer_id}`)}
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer group/author hover:opacity-85 transition-all"
                              title={`View ${review.reviewer?.full_name}'s Profile`}
                            >
                              {/* Avatar Image / Letter */}
                              {review.reviewer?.avatar_url ? (
                                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-black shrink-0">
                                  <img 
                                    src={review.reviewer.avatar_url} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#FF4D00] border-2 border-black text-black flex items-center justify-center font-bold text-xs shrink-0 uppercase shadow-inner">
                                  {review.reviewer?.full_name?.charAt(0).toUpperCase() || 'N'}
                                </div>
                              )}
                              
                              <div className="min-w-0">
                                <div className="text-[11px] font-display font-black uppercase tracking-wider text-black group-hover/author:text-[#FF4D00] transition-colors truncate leading-none">
                                  {review.reviewer?.full_name || 'Neighbor'}
                                </div>
                                <div className="text-[9px] font-mono uppercase tracking-wider text-black/55 flex items-center gap-0.5 pt-1 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-black/40 shrink-0" />
                                  <span className="truncate">{review.reviewer?.neighborhood || 'Local Neighbor'}</span>
                                </div>
                              </div>
                            </div>

                            {/* View Profile Call to action */}
                            <div className="shrink-0 pl-2">
                              <button
                                onClick={() => router.push(`/profile/${review.reviewer_id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF4D00] hover:bg-black border-2 border-black text-black hover:text-white font-mono font-black text-[9px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer group/btn"
                              >
                                <span>Profile</span>
                                <ArrowUpRight className="w-3 h-3 stroke-[2.5px] text-current group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all" />
                              </button>
                            </div>

                          </div>
                        </motion.div>
                      ))}
                    </div>

                  )}
                </AnimatePresence>

              </motion.div>

            </main>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
