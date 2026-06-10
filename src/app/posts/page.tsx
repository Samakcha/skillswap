'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { getUserSkillScoreDetails } from '@/lib/reputation'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  MapPin, 
  Plus, 
  Search, 
  ArrowRight, 
  Layers, 
  Compass, 
  AlertCircle,
  Clock,
  ArrowUpRight,
  Tag,
  Trash2,
  Check,
  CheckCircle2,
  FileText
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

export default function MyPostsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userRep, setUserRep] = useState<{ score: number; tier: string } | null>(null)
  
  // State for interactive features
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Completion Modal State
  const [completionPostId, setCompletionPostId] = useState<string | null>(null)
  const [completionPartners, setCompletionPartners] = useState<{ id: string; name: string }[]>([])
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

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
      // 1. Try to load profile from localStorage cache
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
        
        // Update cache
        if (typeof window !== 'undefined') {
          localStorage.setItem('skillswap_profile', JSON.stringify(freshProfile))
        }

        // Fetch reputation score details for the logged-in user
        try {
          const repDetails = await getUserSkillScoreDetails(supabase, currentUser.id)
          if (repDetails) {
            setUserRep({ score: repDetails.score, tier: repDetails.tier })
          }
        } catch (repErr) {
          console.error('Error fetching user reputation:', repErr)
        }

        // 4. Fetch all posts created by this user (both active and completed/inactive)
        const { data: userPosts } = await supabase
          .from('posts')
          .select('*, profiles:profiles!posts_user_id_fkey!inner(full_name, pin_code, neighborhood)')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
            
        const expiryThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()
        const nonExpiredPosts = (userPosts || []).filter((post: any) => {
          // Hide active posts older than 30 days (expired)
          if (post.is_active && new Date(post.created_at).getTime() < expiryThreshold) {
            return false
          }
          return true
        })
        setPosts(nonExpiredPosts)
      } catch (error) {
        console.error('Error loading my posts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Handle logical deletion of owned posts
  async function handleDeletePost(postId: string) {
    if (!window.confirm("Are you sure you want to delete this swap proposal?")) return

    try {
      const { error } = await (supabase
        .from('posts') as any)
        .update({ is_active: false })
        .eq('id', postId)

      if (error) {
        alert("Failed to delete post: " + error.message)
        return
      }

      // Update local state to mark inactive or filter out
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_active: false } : p))
    } catch (err: any) {
      alert("Error deleting post: " + err.message)
    }
  }

  // Find potential swapping partners and initiate completion flow
  async function handleMarkAsComplete(postId: string) {
    if (!user) return
    setModalLoading(true)
    setCompletionPostId(postId)

    try {
      let potentialPartners: { id: string; name: string }[] = []
      
      // 1. Fetch conversations associated with this specific post ID
      const { data: postMessages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, sender:profiles!sender_id(full_name), receiver:profiles!receiver_id(full_name)')
        .eq('post_id', postId)

      const map = new Map<string, string>()
      postMessages?.forEach((m: any) => {
        if (m.sender_id !== user.id) map.set(m.sender_id, m.sender?.full_name || 'Neighbor')
        if (m.receiver_id !== user.id) map.set(m.receiver_id, m.receiver?.full_name || 'Neighbor')
      })

      // 2. Fallback: if no direct messages for this post, look at recent general conversations
      if (map.size === 0) {
        const { data: generalMessages } = await supabase
          .from('messages')
          .select('sender_id, receiver_id, sender:profiles!sender_id(full_name), receiver:profiles!receiver_id(full_name)')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(50)

        generalMessages?.forEach((m: any) => {
          if (m.sender_id !== user.id) map.set(m.sender_id, m.sender?.full_name || 'Neighbor')
          if (m.receiver_id !== user.id) map.set(m.receiver_id, m.receiver?.full_name || 'Neighbor')
        })
      }

      potentialPartners = Array.from(map.entries()).map(([id, name]) => ({ id, name }))
      setCompletionPartners(potentialPartners)

      // If exactly 1 potential partner found, bypass modal and auto-complete
      if (potentialPartners.length === 1) {
        await executeCompletion(postId, potentialPartners[0].id)
      } else if (potentialPartners.length > 1) {
        // Show selection modal
        setShowCompletionModal(true)
      } else {
        // No chat partners found, just mark as complete directly with no review route
        await executeCompletion(postId, null)
      }
    } catch (err: any) {
      alert("Error initiating swap completion: " + err.message)
    } finally {
      setModalLoading(false)
    }
  }

  // Deactivate post in Supabase and route to review page if partnerId exists
  async function executeCompletion(postId: string, partnerId: string | null) {
    try {
      const { error } = await (supabase
        .from('posts') as any)
        .update({ is_active: false })
        .eq('id', postId)

      if (error) {
        alert("Failed to complete post: " + error.message)
        return
      }

      // Mark local state as inactive
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_active: false } : p))
      setShowCompletionModal(false)

      if (partnerId) {
        // Auto-redirect to verified reviews flow
        router.push(`/reviews/${partnerId}?post=${postId}`)
      } else {
        alert("Swap marked as complete successfully!")
      }
    } catch (err: any) {
      alert("Error completing post: " + err.message)
    }
  }

  // Client-side dynamic filtering
  const filteredPosts = posts.filter(post => {
    // 1. Filter by Tab
    if (activeTab === 'active' && !post.is_active) return false
    if (activeTab === 'completed' && post.is_active) return false
    
    // 2. Filter by Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      const titleMatch = post.title?.toLowerCase().includes(query)
      const descMatch = post.description?.toLowerCase().includes(query)
      const skillMatch = post.skill?.toLowerCase().includes(query)
      return titleMatch || descMatch || skillMatch
    }
    
    return true
  })

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
              <FileText className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Loading Queue</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Retrieving your personal proposal slots...</p>
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
      <Sidebar profile={profile} supabase={supabase} user={user} />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative">
        {/* BACKGROUND GLOWS */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

        {/* INNER CONTENT CONTAINER */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
          
          {/* HERO PANEL */}
          <motion.div 
            variants={FADE_UP}
            className="bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)]"
          >
            <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-4">
                <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl leading-[0.9] text-white tracking-tight uppercase flex flex-wrap gap-x-2">
                  <SplitText
                    text="Manage"
                    className="text-white"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                  <SplitText
                    text="Your Proposals"
                    className="text-[#FF4D00]"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                </h1>
                <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-2">
                  Review, complete, or logically terminate skill proposals in your active queue.
                </p>
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center gap-4 shrink-0 self-stretch md:self-auto">
                <div className="bg-black border-2 border-white/10 hover:border-[#FF4D00]/50 transition-colors duration-300 rounded-2xl px-5 py-4 text-center min-w-[105px] flex-1 md:flex-initial shadow-md">
                  <span className="block text-[9px] font-mono font-bold text-white/40 tracking-widest uppercase">Active</span>
                  <strong className="block text-2xl font-display font-black text-[#FF4D00] mt-1.5 leading-none">
                    {posts.filter(p => p.is_active).length}
                  </strong>
                </div>
                <div className="bg-black border-2 border-white/10 hover:border-[#FF4D00]/50 transition-colors duration-300 rounded-2xl px-5 py-4 text-center min-w-[105px] flex-1 md:flex-initial shadow-md">
                  <span className="block text-[9px] font-mono font-bold text-white/40 tracking-widest uppercase">Completed</span>
                  <strong className="block text-2xl font-display font-black text-emerald-400 mt-1.5 leading-none">
                    {posts.filter(p => !p.is_active).length}
                  </strong>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CONTROLS BAR: FILTERS & SEARCH */}
          <motion.div 
            variants={FADE_UP}
            className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 border-b border-white/10 pb-5"
          >
            {/* Filter buttons */}
            <div className="flex items-center overflow-x-auto p-1 rounded-2xl bg-black border border-white/10 self-start max-w-full relative">
              {/* ALL */}
              <button 
                onClick={() => setActiveTab('all')}
                className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'all' ? 'text-black' : 'text-white/50 hover:text-white'}`}
              >
                {activeTab === 'all' && (
                  <motion.span 
                    layoutId="activePostsTabIndicator"
                    className="absolute inset-0 bg-[#FF4D00] rounded-xl z-[-1] shadow-lg shadow-[#FF4D00]/15"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                All Proposals ({posts.length})
              </button>

              {/* ACTIVE */}
              <button 
                onClick={() => setActiveTab('active')}
                className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'active' ? 'text-emerald-400' : 'text-white/50 hover:text-white'}`}
              >
                {activeTab === 'active' && (
                  <motion.span 
                    layoutId="activePostsTabIndicator"
                    className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-xl z-[-1]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Active ({posts.filter(p => p.is_active).length})
                </span>
              </button>

              {/* COMPLETED */}
              <button 
                onClick={() => setActiveTab('completed')}
                className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'completed' ? 'text-white font-bold' : 'text-white/50 hover:text-white'}`}
              >
                {activeTab === 'completed' && (
                  <motion.span 
                    layoutId="activePostsTabIndicator"
                    className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl z-[-1]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                  Completed ({posts.filter(p => !p.is_active).length})
                </span>
              </button>
            </div>

            {/* Search & Dynamic Counter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse shrink-0" />
                <span>Showing <strong className="text-[#FF4D00] font-black">{filteredPosts.length}</strong> slots</span>
              </div>

              {/* Search input container */}
              <div className="relative w-full sm:w-80 md:w-96 group rounded-2xl bg-[#09090b] border border-white/10 focus-within:border-[#FF4D00] focus-within:ring-1 focus-within:ring-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all duration-200">
                <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 ${isSearchFocused ? 'text-[#FF4D00]' : 'text-white/40'}`}>
                  <Search className={`w-4 h-4 ${isSearchFocused ? 'scale-110' : ''} transition-transform duration-300`} />
                </span>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search your proposals..."
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

          {/* GRID OF OWN POSTS */}
          <motion.div 
            variants={CONTAINER_STAGGER}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {filteredPosts.length === 0 ? (
                
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
                    <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">No proposals found</h3>
                    <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                      {searchQuery 
                        ? `We couldn't find any of your posts matching "${searchQuery}".`
                        : activeTab === 'completed'
                          ? "You haven't completed any skill swaps yet."
                          : "You have no active skill swap posts slots!"
                      }
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      if (searchQuery) {
                        setSearchQuery('')
                      } else {
                        router.push('/posts/create')
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.99] border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer animate-fadeIn"
                  >
                    {searchQuery ? (
                      <span>Clear Filter</span>
                    ) : (
                      <>
                        <span>Create Swap Slot</span>
                      </>
                    )}
                  </button>
                </motion.div>

              ) : (

                // FEED GRID LAYOUT
                <div 
                  key="feed-grid"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredPosts.map((post) => (
                    <motion.div 
                      key={post.id}
                      variants={FADE_UP}
                      layout
                      className={`rounded-2xl p-6 border-2 flex flex-col justify-between group transition-all duration-300 relative overflow-hidden shadow-[var(--post-shadow)] hover:shadow-none hover:-translate-x-1 hover:-translate-y-1 ${
                        post.is_active 
                          ? 'bg-[#FFFCF9] border-black' 
                          : 'bg-[#FCFAF2] border-emerald-500/35 opacity-90'
                      }`}
                    >
                      <div className="space-y-4.5 relative z-10">
                        
                        {/* TYPE BADGES */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
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

                            {!post.is_active && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-mono font-black tracking-widest text-emerald-800 uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                Completed
                              </span>
                            )}
                          </div>

                          {/* Created date display */}
                          <div className="flex items-center gap-1 text-[9px] font-mono text-black/40 uppercase tracking-wider font-bold">
                            <Clock className="w-3.5 h-3.5 text-black/30" />
                            <span>{formatDate(post.created_at)}</span>
                          </div>
                        </div>

                        {/* POST CONTENT */}
                        <div className="space-y-3 pt-1">
                          <h3 className={`font-display font-black text-lg text-black group-hover:text-[#FF4D00] transition-colors leading-snug truncate uppercase tracking-tight ${!post.is_active ? 'text-black/60' : ''}`}>
                            {post.title}
                          </h3>

                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[10px] font-mono font-black uppercase text-black tracking-wider">
                            <Tag className="w-3 h-3 text-black" />
                            <span>Skill: {post.skill}</span>
                          </div>

                          <p className="text-black/80 text-xs font-semibold leading-relaxed line-clamp-3 pt-1">
                            {post.description}
                          </p>
                        </div>
                      </div>

                      {/* CARD FOOTER & ACTIONS */}
                      <div className="pt-5 mt-5 border-t border-black/10 flex items-center justify-between relative z-10">
                        {/* Author metadata (Clickable Profile Link) */}
                        <div 
                          onClick={() => router.push(`/profile/${profile.id}`)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer group/author hover:opacity-85 transition-all"
                          title={`View your public profile`}
                        >
                          {/* Avatar Circle */}
                          <div className="w-8 h-8 rounded-full bg-[#FF4D00] border-2 border-black text-black flex items-center justify-center font-bold text-xs shrink-0 group-hover/author:border-black transition-colors shadow-inner">
                            {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-display font-black uppercase tracking-wider text-black group-hover/author:text-[#FF4D00] transition-colors truncate leading-none">
                              {profile?.full_name}
                            </div>
                            <div className="text-[9px] font-mono uppercase tracking-wider text-black/55 flex items-center gap-0.5 pt-1 truncate">
                              <MapPin className="w-2.5 h-2.5 text-black/40 shrink-0" />
                              <span className="truncate">{profile?.neighborhood || 'Local Area'}</span>
                            </div>
                            {/* SkillScore Compact Badge */}
                            {userRep && (
                              <div className="flex items-center gap-1.5 mt-1 select-none">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FF4D00]/15 text-black border border-black/10 text-[8px] font-mono font-bold uppercase tracking-wider leading-none">
                                  {userRep.score} REP
                                </span>
                                <span className="text-[7.5px] font-mono font-black text-black/50 uppercase tracking-wider leading-none">
                                  {userRep.tier}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          {post.is_active ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={modalLoading}
                                onClick={() => handleMarkAsComplete(post.id)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-black border border-black font-mono font-black text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer disabled:opacity-50"
                                title="Mark Swap as Complete"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                                <span>Complete</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-400 hover:bg-rose-500 text-black border border-black font-mono font-black text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                                title="Delete Proposal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] font-mono font-black text-emerald-800 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                              Completed Proposal
                            </span>
                          )}
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

      {/* COMPLETION MODAL */}
      <AnimatePresence>
        {showCompletionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompletionModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-black border-2 border-white/10 rounded-[2rem] p-6 relative z-10 shadow-[12px_12px_0px_#FF4D00] flex flex-col gap-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5 stroke-[2.5px]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Complete Skill Swap</h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 pt-0.5">Identify your swapping partner</p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {completionPartners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => executeCompletion(completionPostId!, partner.id)}
                    className="w-full text-left p-4 rounded-xl bg-[#09090b] border border-white/5 hover:border-[#FF4D00]/50 hover:bg-[#FF4D00]/5 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-white/50 group-hover:border-[#FF4D00]/50 transition-colors">
                        {partner.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/70 group-hover:text-white">{partner.name}</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-[#FF4D00] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="py-3.5 px-4 bg-black hover:bg-[#161618] text-white/50 hover:text-white border-2 border-white/10 hover:border-white/20 font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center shadow-[2px_2px_0px_rgba(255,255,255,0.05)] hover:shadow-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeCompletion(completionPostId!, null)}
                  className="py-3.5 px-4 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all border-2 border-black shadow-[2px_2px_0px_#FFFFFF] hover:shadow-none cursor-pointer text-center"
                >
                  Skip & Complete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
