'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import CircularGallery from '@/components/CircularGallery'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getBulkSkillScoreDetails, computeLocalRanks } from '@/lib/reputation'
import { 
  Sparkles, 
  MapPin, 
  MessageSquare, 
  LogOut, 
  Plus, 
  Search, 
  ArrowRight, 
  Layers, 
  BookOpen, 
  Compass, 
  Users,
  AlertCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Tag,
  Trash2,
  Check,
  Zap,
  Flag,
  Loader2,
  Award,
  X,
  Heart,
  Pencil,
  Upload,
  Music,
  Laptop,
  ChefHat,
  Dumbbell,
  Globe,
  Palette,
  Wrench,
  GraduationCap,
  Briefcase,
  Leaf,
  Bookmark
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

const CATEGORIES = [
  { name: 'Music', icon: Music },
  { name: 'Technology', icon: Laptop },
  { name: 'Food & Cooking', icon: ChefHat },
  { name: 'Fitness & Health', icon: Dumbbell },
  { name: 'Languages', icon: Globe },
  { name: 'Arts & Crafts', icon: Palette },
  { name: 'Home & DIY', icon: Wrench },
  { name: 'Education', icon: GraduationCap },
  { name: 'Business & Finance', icon: Briefcase },
  { name: 'Wellness', icon: Leaf },
  { name: 'General', icon: Sparkles }
]

const getCategoryIcon = (catName: string) => {
  return CATEGORIES.find(c => c.name.toLowerCase() === catName?.toLowerCase())?.icon || Sparkles;
}

export default function SavedPage() {
  const supabase = createClient()
  const router = useRouter()
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bulkScoredUsers, setBulkScoredUsers] = useState<any[]>([])
  const [scoredUsersMap, setScoredUsersMap] = useState<Record<string, { score: number; tier: string }>>({})
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null)
  const [isLight, setIsLight] = useState(false)

  // View Post Modal details state
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [selectedPostRating, setSelectedPostRating] = useState<string>('0')
  const [selectedPostRatingCount, setSelectedPostRatingCount] = useState<number>(0)
  const [selectedPostSwapCount, setSelectedPostSwapCount] = useState<number | null>(null)
  const [selectedPostResponseRateText, setSelectedPostResponseRateText] = useState<string | null>(null)
  const [selectedPostResponseRateColor, setSelectedPostResponseRateColor] = useState<string | null>(null)
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null)

  // Custom Toast Notifications
  interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info'
  }
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Report Post States
  const [reportPostId, setReportPostId] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('Spam')
  const [reportDetails, setReportDetails] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

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

  // Fetch post owner's average rating and stats when modal is opened
  useEffect(() => {
    if (!selectedPost || selectedPost.is_expired) {
      queueMicrotask(() => {
        setSelectedPostRating('0')
        setSelectedPostRatingCount(0)
        setSelectedPostSwapCount(null)
        setSelectedPostResponseRateText(null)
        setSelectedPostResponseRateColor(null)
      })
      return
    }

    // Reset stats to loading state immediately to prevent stale values flashing
    setSelectedPostSwapCount(null)
    setSelectedPostResponseRateText(null)
    setSelectedPostResponseRateColor(null)

    async function loadPostOwnerRatingAndStats() {
      const targetUserId = selectedPost.user_id
      try {
        const [reviewsRes, completedRes, incomingRes, outgoingRes]: any[] = await Promise.all([
          supabase
            .from('reviews')
            .select('rating')
            .eq('reviewed_id', targetUserId),
          supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', targetUserId)
            .eq('is_active', false),
          supabase
            .from('messages')
            .select('post_id, sender_id')
            .eq('receiver_id', targetUserId),
          supabase
            .from('messages')
            .select('post_id, sender_id')
            .eq('sender_id', targetUserId)
        ])

        // 1. Process reviews
        const reviewsData = reviewsRes.data
        if (reviewsData && reviewsData.length > 0) {
          const totalRating = reviewsData.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0)
          const avg = (totalRating / reviewsData.length).toFixed(1)
          setSelectedPostRating(avg)
          setSelectedPostRatingCount(reviewsData.length)
        } else {
          setSelectedPostRating('0')
          setSelectedPostRatingCount(0)
        }

        // 2. Process completed swaps count
        setSelectedPostSwapCount(completedRes.count || 0)

        // 3. Process response rate
        const incoming = (incomingRes.data as any[]) || []
        const outgoing = (outgoingRes.data as any[]) || []

        if (incoming.length === 0) {
          setSelectedPostResponseRateText('New')
          setSelectedPostResponseRateColor('neutral')
        } else {
          const conversations = new Map<string, { post_id: string; sender_id: string }>()
          incoming.forEach((msg) => {
            if (msg.post_id && msg.sender_id) {
              const key = `${msg.post_id}_${msg.sender_id}`
              if (!conversations.has(key)) {
                conversations.set(key, { post_id: msg.post_id, sender_id: msg.sender_id })
              }
            }
          })

          const totalConversations = conversations.size
          if (totalConversations === 0) {
            setSelectedPostResponseRateText('New')
            setSelectedPostResponseRateColor('neutral')
          } else {
            const repliedPostIds = new Set<string>()
            outgoing.forEach((msg) => {
              if (msg.post_id) {
                repliedPostIds.add(msg.post_id)
              }
            })

            let repliedCount = 0
            conversations.forEach((conv) => {
              if (repliedPostIds.has(conv.post_id)) {
                repliedCount++
              }
            })

            const rate = Math.round((repliedCount / totalConversations) * 100)
            setSelectedPostResponseRateText(`${rate}%`)
            if (rate > 70) {
              setSelectedPostResponseRateColor('green')
            } else if (rate >= 40 && rate <= 70) {
              setSelectedPostResponseRateColor('yellow')
            } else {
              setSelectedPostResponseRateColor('red')
            }
          }
        }
      } catch (err) {
        console.error('Error fetching post owner rating and stats:', err)
        setSelectedPostRating('0')
        setSelectedPostRatingCount(0)
        setSelectedPostSwapCount(0)
        setSelectedPostResponseRateText('New')
        setSelectedPostResponseRateColor('neutral')
      }
    }

    loadPostOwnerRatingAndStats()
  }, [selectedPost])

  async function loadData() {
    try {
      // Auth check
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

      // Fetch profile
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

      // Fetch saved posts with joins
      let res = await (supabase
        .from('saved_posts') as any)
        .select(`
          post_id,
          user_id,
          posts:posts(
            *,
            profiles:profiles!posts_user_id_fkey(
              full_name,
              pin_code,
              neighborhood,
              avatar_url
            ),
            post_media(
              url,
              type
            ),
            likes(
              user_id
            )
          )
        `)
        .eq('user_id', currentUser.id)

      if (res.error && res.error.message.includes("Could not find a relationship between 'posts' and 'post_media'")) {
        console.warn('post_media table relationship not found in schema cache. Falling back to query without media.');
        res = await (supabase
          .from('saved_posts') as any)
          .select(`
            post_id,
            user_id,
            posts:posts(
              *,
              profiles:profiles!posts_user_id_fkey(
                full_name,
                pin_code,
                neighborhood,
                avatar_url
              ),
              likes(
                user_id
              )
            )
          `)
          .eq('user_id', currentUser.id)
      }

      const rawItems = res.data || []
      const processedItems = rawItems.map((item: any) => {
        const post = item.posts
        if (!post) {
          return {
            id: item.post_id,
            is_expired: true,
            title: "Deleted Post",
            description: "This post has been completed or deleted.",
            type: "offer",
            created_at: new Date().toISOString(),
            likes: [],
            like_count: 0,
            has_liked: false
          }
        }

        const createdAt = new Date(post.created_at).getTime()
        const isExpired = post.is_active === false || (createdAt < Date.now() - 30 * 24 * 60 * 60 * 1000)

        const likes = post.likes || []
        return {
          ...post,
          is_expired: isExpired,
          like_count: likes.length,
          has_liked: likes.some((l: any) => l.user_id === currentUser.id)
        }
      })

      setSavedPosts(processedItems)

      // Fetch bulk reputation scores
      try {
        const { data: allProfiles } = await supabase.from('profiles').select('*')
        if (allProfiles && allProfiles.length > 0) {
          const bulkScored = await getBulkSkillScoreDetails(supabase, allProfiles)
          setBulkScoredUsers(bulkScored)
          
          const map: Record<string, { score: number; tier: string }> = {}
          bulkScored.forEach((item: any) => {
            map[item.userId] = { score: item.score, tier: item.tier }
          })
          setScoredUsersMap(map)
        }
      } catch (repErr) {
        console.error('Error fetching bulk reputation:', repErr)
      }
    } catch (error) {
      console.error('Error loading saved posts page data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Toggle Save (Unsave) post instantly
  async function handleToggleSave(postId: string) {
    if (!user) {
      showToast("You must be logged in to modify saved posts.", "error")
      return
    }

    // Optimistically remove from list
    setSavedPosts(prev => prev.filter(p => p.id !== postId))
    if (selectedPost?.id === postId) {
      setSelectedPost(null)
    }
    showToast("Post removed from saved list.", "success")

    try {
      const { error } = await (supabase
        .from('saved_posts') as any)
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (err: any) {
      console.error("Error unsaving post:", err)
      showToast("Failed to remove post: " + err.message, "error")
      // Reload fresh data to restore consistency
      loadData()
    }
  }

  // Handle toggling likes in modal
  async function handleLikeClick(e: React.MouseEvent, post: any) {
    e.stopPropagation()
    e.preventDefault()
    
    if (!user || !profile) {
      showToast("You must be logged in to like posts.", "error")
      return
    }

    const postId = post.id
    const wasLiked = post.has_liked
    const originalCount = post.like_count || 0

    // Optimistic Update
    setSavedPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          has_liked: !wasLiked,
          like_count: wasLiked ? Math.max(0, originalCount - 1) : originalCount + 1
        }
      }
      return p
    }))

    try {
      if (wasLiked) {
        const { error } = await (supabase
          .from('likes') as any)
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (error) throw error
        showToast("Post unliked.", "success")
      } else {
        const { error } = await (supabase
          .from('likes') as any)
          .insert({
            post_id: postId,
            user_id: user.id
          })

        if (error) throw error
        showToast("Post liked!", "success")
      }
    } catch (err: any) {
      console.error("Error toggling like:", err)
      showToast("Failed to update like status.", "error")
      // Rollback
      setSavedPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            has_liked: wasLiked,
            like_count: originalCount
          }
        }
        return p
      }))
    }
  }

  // Submit Report
  async function handleReportPost(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !reportPostId || !reportReason) return
    setReportLoading(true)
    try {
      const reportedPost = savedPosts.find(p => p.id === reportPostId)
      const reportedUserId = reportedPost?.user_id

      const { error } = await (supabase
        .from('reports') as any)
        .insert({
          reporter_id: user.id,
          reported_post_id: reportPostId,
          reason: reportReason,
          details: reportDetails || null
        })

      if (error) throw error

      if (reportedUserId) {
        const { error: notifError } = await (supabase.from('notifications') as any).insert({
          user_id: reportedUserId,
          type: 'report',
          message: 'One of your posts has been flagged for review',
          related_post_id: reportPostId,
          related_user_id: null,
          is_read: false
        })

        if (notifError) {
          console.error("Error creating post report notification:", notifError)
        }
      }

      showToast("Report submitted. We will review it shortly.", "success")
      setShowReportModal(false)
      setReportPostId(null)
      setReportReason('Spam')
      setReportDetails('')
    } catch (err: any) {
      console.error("Error reporting post:", err)
      showToast("Failed to submit report: " + err.message, "error")
    } finally {
      setReportLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-theme-bg text-gray-100 flex flex-col lg:flex-row font-sans selection:bg-[#FF4D00]/30 selection:text-white relative overflow-x-clip w-full">
      {/* Cyber Blueprint Grid Overlay */}
      <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />

      {/* Navigation Sidebar */}
      <Sidebar profile={profile} supabase={supabase} user={user} />

      {/* Main Board Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative">
        <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
          
          {/* Header Panel */}
          <motion.div
            variants={FADE_UP}
            initial="hidden"
            animate="visible"
            className="bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)]"
          >
            <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-4">
                <h1 className="font-display font-black text-3xl sm:text-4xl leading-[0.9] text-white tracking-tight uppercase flex flex-wrap gap-x-2">
                  <SplitText
                    text="Saved"
                    className="text-white"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                  <SplitText
                    text="Proposals"
                    className="text-[#FF4D00]"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                </h1>
                <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-2">
                  Keep track of skills you want to learn or teach in your neighborhood.
                </p>
              </div>

              {/* Current Area Indicator */}
              <div className="flex flex-col gap-1 items-end self-stretch sm:self-auto bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 min-w-[180px] max-w-[240px] shadow-sm overflow-hidden">
                <span className="text-[9px] font-mono font-bold text-white/40 tracking-widest uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#FF4D00]" /> Current Area
                </span>
                <div 
                  className="text-sm font-display font-black text-white uppercase mt-1 truncate w-full text-right"
                  title={profile?.neighborhood || 'Local Area'}
                >
                  {profile?.neighborhood || 'Local Area'}
                </div>
                <span className="text-[10px] font-mono text-white/60 tracking-wider">
                  PIN: {profile?.pin_code || '---'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Grid Layout & Loading state */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {loading ? (
                // Skeletons Loader
                <motion.div
                  key="loading-skeletons"
                  variants={CONTAINER_STAGGER}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-black/45 border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-6 min-h-[320px] animate-pulse"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="h-5 bg-white/5 rounded w-20" />
                          <div className="h-4 bg-white/5 rounded w-16" />
                        </div>
                        <div className="space-y-3">
                          <div className="h-6 bg-white/5 rounded w-3/4" />
                          <div className="h-5 bg-white/5 rounded w-1/3" />
                          <div className="h-12 bg-white/5 rounded w-full" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-5 border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5" />
                          <div className="space-y-2">
                            <div className="h-3 bg-white/5 rounded w-16" />
                            <div className="h-2 bg-white/5 rounded w-12" />
                          </div>
                        </div>
                        <div className="h-8 bg-white/5 rounded w-24" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : savedPosts.length === 0 ? (
                // Empty state
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4 }}
                  className="w-full bg-black border-2 border-white/10 p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-6 mt-6 rounded-[2rem] shadow-[6px_6px_0px_rgba(255,77,0,0.12)]"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center text-[#FF4D00]">
                    <Bookmark className="w-7 h-7 text-[#FF4D00]" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">No saved posts</h3>
                    <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                      No saved posts yet. Bookmark posts you are interested in!
                    </p>
                  </div>

                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 rounded-xl bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.99] border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
                  >
                    <span>Browse Feed</span>
                  </button>
                </motion.div>
              ) : (
                // Saved Posts Feed Grid
                <motion.div
                  key="saved-grid"
                  variants={CONTAINER_STAGGER}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {savedPosts.map((post) => {
                    const isOwnPost = post.user_id === user?.id
                    const CategoryIcon = getCategoryIcon(post.category)

                    // Expired card render
                    if (post.is_expired) {
                      return (
                        <motion.div
                          key={post.id}
                          variants={FADE_UP}
                          className="bg-black/60 rounded-2xl p-6 border-2 border-white/5 flex flex-col justify-between min-h-[320px] relative overflow-hidden"
                        >
                          <div className="space-y-4 relative z-10 opacity-60">
                            <div className="flex justify-between items-center">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 text-white/50 border border-white/10 text-[9px] font-mono font-bold uppercase tracking-widest">
                                Expired
                              </span>
                            </div>
                            <div className="space-y-3 pt-1">
                              <h3 className="font-display font-black text-lg text-white/40 line-through uppercase tracking-tight">
                                {post.title}
                              </h3>
                              <p className="text-white/30 text-xs font-semibold leading-relaxed line-clamp-2">
                                {post.description}
                              </p>
                            </div>
                          </div>

                          {/* Expired message block */}
                          <div className="mt-4 p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex items-center gap-2 relative z-10">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold">This post has expired</span>
                          </div>

                          {/* Bookmark Unsave Toggle Button */}
                          <div className="absolute top-6 right-6 z-20">
                            <button
                              type="button"
                              onClick={() => handleToggleSave(post.id)}
                              className="flex items-center justify-center p-1.5 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-[#FF4D00] hover:text-red-400 transition-colors cursor-pointer shrink-0"
                              title="Unsave Post"
                            >
                              <Bookmark className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        </motion.div>
                      )
                    }

                    // Active card render
                    return (
                      <motion.div
                        key={post.id}
                        variants={FADE_UP}
                        layout
                        className="bg-[#FFFCF9] rounded-2xl p-6 border-2 border-black hover:border-[#FF4D00] flex flex-col justify-between group transition-all duration-300 relative overflow-hidden shadow-[var(--post-shadow)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                      >
                        <div className="space-y-4.5 relative z-10">
                          
                          {/* CARD TYPE BADGES */}
                          <div className="flex items-center justify-between">
                            
                            {post.type === 'offer' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/35 text-[9px] font-mono font-bold uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Offering
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF4D00]/10 text-black border border-[#FF4D00]/25 text-[9px] font-mono font-bold uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
                                Requesting
                              </span>
                            )}

                            {/* Created date display & Like count */}
                            <div className="flex items-center gap-2 relative z-20">
                              <div className="flex items-center gap-1 text-[9px] font-mono text-black/40 uppercase tracking-wider font-bold">
                                <Clock className="w-3.5 h-3.5 text-black/30" />
                                <span>{formatDate(post.created_at)}</span>
                              </div>

                              <div className="flex items-center gap-1 px-2.5 py-0.5 border border-black/10 rounded-full font-mono text-[9px] font-bold bg-white text-black">
                                <Heart className={`w-3 h-3 transition-colors ${post.has_liked ? 'fill-pink-500 text-pink-500' : 'text-pink-500'}`} />
                                <span>{post.like_count || 0}</span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  handleToggleSave(post.id)
                                }}
                                className="flex items-center justify-center p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                                title="Unsave Post"
                              >
                                <Bookmark className="w-3.5 h-3.5 text-[#FF4D00] fill-[#FF4D00]" />
                              </button>
                            </div>

                          </div>

                          {/* POST CONTENT */}
                          <div className="space-y-3 pt-1">
                            
                            <h3 className="font-display font-black text-lg text-black group-hover:text-[#FF4D00] transition-colors leading-snug truncate uppercase tracking-tight">
                              {post.title}
                            </h3>

                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[10px] font-mono font-bold uppercase text-black tracking-wider">
                              <Tag className="w-3 h-3 text-black" />
                              <span>Skill: {post.skill}</span>
                            </div>

                            <div className="flex pt-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/5 border border-black/10 text-[9px] font-mono font-bold uppercase text-black/70 tracking-wider">
                                <CategoryIcon className="w-3 h-3 text-black/50" />
                                <span>{post.category || 'General'}</span>
                              </span>
                            </div>

                            <p className="text-black/80 text-xs font-semibold leading-relaxed line-clamp-2 pt-1">
                              {post.description}
                            </p>
                          </div>

                        </div>

                        {/* CARD FOOTER */}
                        <div className="pt-5 mt-5 border-t border-black/10 flex items-center justify-between relative z-10">
                          
                          {/* Author Info */}
                          {(() => {
                            const authorRep = scoredUsersMap[post.user_id] || { score: 0, tier: 'New Swapper' }
                            const hoveredUserData = bulkScoredUsers.find(u => u.userId === post.user_id)
                            const hoveredUserRanks = hoveredUserData ? computeLocalRanks(bulkScoredUsers, post.user_id) : null

                            return (
                              <div 
                                onClick={() => router.push(`/profile/${post.user_id}`)}
                                onMouseEnter={() => setHoveredUserId(post.user_id)}
                                onMouseLeave={() => setHoveredUserId(null)}
                                className="flex items-center gap-2.5 min-w-0 cursor-pointer group/author hover:opacity-95 transition-all relative z-30"
                                title={`View ${post.profiles?.full_name}'s profile`}
                              >
                                {/* Hover Card Tooltip */}
                                <AnimatePresence>
                                  {hoveredUserId === post.user_id && hoveredUserData && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      transition={{ duration: 0.2, ease: "easeOut" }}
                                      className="absolute bottom-full left-0 mb-3.5 w-64 bg-[#09090b] border-2 border-white/10 rounded-2xl p-4 shadow-[8px_8px_0px_#FF4D00] z-50 text-white select-none pointer-events-none"
                                    >
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="font-display font-black text-xs uppercase text-white truncate">{hoveredUserData.fullName}</h4>
                                          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{hoveredUserData.neighborhood || 'Local Area'}</span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                          <div className="flex flex-col">
                                            <span className="text-[8px] font-mono uppercase text-white/40 tracking-wider">SkillScore</span>
                                            <span className="text-sm font-display font-black text-[#FF4D00]">{hoveredUserData.score} REP</span>
                                          </div>
                                          <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-mono uppercase text-white/40 tracking-wider">Tier</span>
                                            <span className="text-[8.5px] font-mono font-black text-white uppercase tracking-wider block text-center leading-none px-1.5 py-0.5 border border-white/10 bg-white/5 rounded-md">
                                              {hoveredUserData.tier}
                                            </span>
                                          </div>
                                        </div>

                                        {hoveredUserRanks && (
                                          <div className="border-t border-white/5 pt-2 flex flex-col gap-1">
                                            <span className="text-[8px] font-mono uppercase text-white/40 tracking-wider">Local Standing</span>
                                            <span className="text-[9.5px] font-mono font-bold text-emerald-400">
                                              #{hoveredUserRanks.neighborhoodRank} in {hoveredUserData.neighborhood || 'Local Area'}
                                            </span>
                                          </div>
                                        )}

                                        <div className="border-t border-white/5 pt-2 grid grid-cols-2 gap-2 text-center">
                                          <div>
                                            <span className="block text-[8px] font-mono uppercase text-white/40">Swaps</span>
                                            <span className="text-xs font-mono font-bold text-white">{hoveredUserData.completedSwapsCount}</span>
                                          </div>
                                          <div>
                                            <span className="block text-[8px] font-mono uppercase text-white/40">Rating</span>
                                            <span className="text-xs font-mono font-bold text-white">⭐ {hoveredUserData.averageRating.toFixed(1)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                
                                {/* Avatar Circle */}
                                <div className="w-8 h-8 rounded-full bg-[#FF4D00] border-2 border-black overflow-hidden flex items-center justify-center shrink-0">
                                  {post.profiles?.avatar_url ? (
                                    <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    <span className="font-bold text-xs text-black uppercase">{post.profiles?.full_name?.charAt(0).toUpperCase() || 'S'}</span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-[11px] font-display font-black uppercase tracking-wider text-black group-hover/author:text-[#FF4D00] transition-colors truncate leading-none">
                                    {post.profiles?.full_name}
                                  </div>
                                  <div className="text-[9px] font-mono uppercase tracking-wider text-black/55 flex items-center gap-0.5 pt-1 truncate">
                                    <MapPin className="w-2.5 h-2.5 text-black/40 shrink-0" />
                                    <span className="truncate">{post.profiles?.neighborhood || 'Local Area'}</span>
                                  </div>
                                  
                                  {/* SkillScore Compact Badge */}
                                  <div className="flex items-center gap-1.5 mt-1 select-none">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FF4D00]/15 text-black border border-black/10 text-[8px] font-mono font-bold uppercase tracking-wider leading-none">
                                      {authorRep.score} REP
                                    </span>
                                    <span className="text-[7.5px] font-mono font-black text-black/50 uppercase tracking-wider leading-none">
                                      {authorRep.tier}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}

                          {/* View Post Button */}
                          <div className="shrink-0 pl-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPost(post)}
                              className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-black hover:bg-[#FF4D00] hover:text-black text-white border border-white/10 hover:border-black font-mono font-black text-[10px] uppercase tracking-wider transition-all shadow-[4px_4px_0px_rgba(255,77,0,0.15)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
                            >
                              <span>View Post</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>

                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </main>
      </div>

      {/* DETAILED VIEW POST OVERLAY MODAL */}
      <AnimatePresence>
        {selectedPost && !selectedPost.is_expired && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md skillswap-grid-bg skillswap-grid-bg-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
              className="relative w-full max-w-4xl bg-[#09090b] border-2 border-white/10 rounded-[2.5rem] p-5 sm:p-8 md:p-10 shadow-[16px_16px_0px_#FF4D00] overflow-hidden flex flex-col gap-6 md:gap-8 max-h-[85vh] overflow-y-auto z-10 no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`
                .no-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              
              <div className="absolute -top-32 -left-32 w-[300px] h-[300px] rounded-full bg-[#FF4D00]/10 blur-[80px] pointer-events-none z-0" />
              <div className="absolute bottom-[-100px] right-[-100px] w-[250px] h-[250px] rounded-full bg-[#FF4D00]/5 blur-[70px] pointer-events-none z-0" />

              {/* HEADER SECTION */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 relative z-10">
                <div 
                  onClick={() => {
                    setSelectedPost(null);
                    router.push(`/profile/${selectedPost.user_id}`);
                  }}
                  className="flex items-center gap-3.5 group/author cursor-pointer"
                  title="View Profile"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-[#FF4D00] bg-black text-[#FF4D00] flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden shadow-[0_0_15px_rgba(255,77,0,0.15)] group-hover/author:border-white transition-colors duration-300">
                    {selectedPost.profiles?.avatar_url ? (
                      <img 
                        src={selectedPost.profiles.avatar_url} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/author:scale-105" 
                        alt="" 
                      />
                    ) : (
                      <span>{selectedPost.profiles?.full_name?.charAt(0).toUpperCase() || 'S'}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-widest leading-none">PROPOSAL CREATOR</div>
                    <h3 className="font-display font-black text-white text-base sm:text-lg uppercase tracking-tight leading-none group-hover/author:text-[#FF4D00] transition-colors duration-300">
                      {selectedPost.profiles?.full_name}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-[#FF4D00]" />
                        <span>{selectedPost.profiles?.neighborhood || 'Local Area'}</span>
                      </div>
                      
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <span>⭐</span>
                        <span>{selectedPostRating} / 5.0</span>
                        <span className="text-white/30">({selectedPostRatingCount} reviews)</span>
                      </div>

                      {(() => {
                        const authorRepData = bulkScoredUsers.find((u: any) => u.userId === selectedPost.user_id)
                        const authorRanks = authorRepData ? computeLocalRanks(bulkScoredUsers, selectedPost.user_id) : null
                        if (!authorRepData) return null
                        return (
                          <>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FF4D00]/20 text-[#FF4D00] border border-[#FF4D00]/30 text-[9px] font-mono font-bold uppercase tracking-wider leading-none">
                              {authorRepData.score} REP
                            </span>
                            <span className="text-[9px] font-mono font-black text-white/60 uppercase tracking-wider leading-none">
                              {authorRepData.tier}
                            </span>
                            {authorRanks && (
                              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
                                <span>🏆 #{authorRanks.neighborhoodRank} in {authorRepData.neighborhood || 'Local Area'}</span>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="flex flex-wrap items-center gap-3 select-none">
                  <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-2 px-3 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                    <Check className="w-4 h-4 text-[#FF4D00] stroke-[2.5px] shrink-0" />
                    <div>
                      <div className="flex items-baseline gap-1">
                        <strong className="font-display font-black text-sm text-white leading-none">
                          {selectedPostSwapCount !== null ? selectedPostSwapCount : '...'}
                        </strong>
                        <span className="text-[8px] font-mono font-bold text-white/40 uppercase tracking-widest leading-none">
                          Swaps Completed
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-2 px-3 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                    <Zap className={`w-4 h-4 fill-current shrink-0 ${
                      selectedPostResponseRateColor === 'green' ? 'text-emerald-400' :
                      selectedPostResponseRateColor === 'yellow' ? 'text-amber-400' :
                      selectedPostResponseRateColor === 'red' ? 'text-rose-400' :
                      'text-white/60'
                    }`} />
                    <div>
                      <div className="flex items-baseline gap-1">
                        <strong className={`font-display font-black text-sm leading-none ${
                          selectedPostResponseRateColor === 'green' ? 'text-emerald-400' :
                          selectedPostResponseRateColor === 'yellow' ? 'text-amber-400' :
                          selectedPostResponseRateColor === 'red' ? 'text-rose-400' :
                          'text-white'
                        }`}>
                          {selectedPostResponseRateText !== null ? selectedPostResponseRateText : '...'}
                        </strong>
                        <span className="text-[8px] font-mono font-bold text-white/40 uppercase tracking-widest leading-none">
                          Response Rate
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="absolute sm:relative top-0 right-0 sm:top-auto sm:right-auto w-9 h-9 rounded-xl bg-black hover:bg-[#161618] border border-white/10 hover:border-[#FF4D00] text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-[2px_2px_0px_rgba(255,255,255,0.05)]"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MAIN CONTENT SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                <div className={`space-y-5 ${selectedPost.post_media && selectedPost.post_media.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
                  
                  {/* BADGES */}
                  <div className="flex flex-wrap items-center gap-3">
                    {selectedPost.type === 'offer' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 text-[9px] font-mono font-bold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Offering a Skill
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/25 text-[9px] font-mono font-bold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00] animate-pulse" />
                        Requesting a Skill
                      </span>
                    )}

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[10px] font-mono font-bold uppercase text-white tracking-wider">
                      <Tag className="w-3.5 h-3.5 text-[#FF4D00]" />
                      <span>Skill: {selectedPost.skill}</span>
                    </div>

                    <div className="inline-flex items-center gap-1 text-[9px] font-mono text-white/35 uppercase tracking-wider font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#FF4D00]" />
                      <span>Posted on {formatDate(selectedPost.created_at)}</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-3.5">
                    <h2 className="font-display font-black text-white text-xl sm:text-2xl uppercase tracking-tight leading-tight">
                      {selectedPost.title}
                    </h2>
                    <p className="text-white/80 text-xs sm:text-sm font-semibold leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto pr-1">
                      {selectedPost.description}
                    </p>
                  </div>
                </div>

                {/* MEDIA GALLERY */}
                {selectedPost.post_media && selectedPost.post_media.length > 0 && (
                  <div className="lg:col-span-5 space-y-4 flex flex-col justify-center min-h-[380px]">
                    <div className="font-mono text-[9px] font-bold text-white/30 uppercase tracking-widest">
                      {selectedPost.post_media.length === 1 ? 'PROPOSAL MEDIA' : 'PROPOSAL GALLERY'}
                    </div>

                    <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm shadow-inner">
                      {selectedPost.post_media.length === 1 ? (
                        <button
                          type="button"
                          onClick={() => setActiveLightboxImage(selectedPost.post_media[0].url)}
                          className="w-full h-full block group relative cursor-zoom-in"
                        >
                          {selectedPost.post_media[0].type === 'video' || selectedPost.post_media[0].url.toLowerCase().endsWith('.mp4') ? (
                            <video
                              src={selectedPost.post_media[0].url}
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={selectedPost.post_media[0].url}
                              alt={selectedPost.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3 py-1.5 rounded-xl bg-black/70 border border-white/20 text-white font-mono text-[9px] font-bold uppercase tracking-widest backdrop-blur-sm">
                              Click to enlarge
                            </span>
                          </div>
                        </button>
                      ) : (
                        <CircularGallery
                          items={selectedPost.post_media.map((media: any) => ({
                            image: media.url,
                            text: selectedPost.title
                          }))}
                          bend={3}
                          textColor="#ffffff"
                          borderRadius={0.05}
                          scrollEase={0.03}
                          scrollSpeed={2}
                          onItemClick={(idx: number) => {
                            const media = selectedPost.post_media[idx];
                            if (media) {
                              setActiveLightboxImage(media.url);
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div className="border-t border-white/[0.08] pt-6 flex flex-wrap items-center justify-between gap-4 mt-auto relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 rounded-full font-mono text-[10px] font-bold bg-white/5 text-white">
                    <Heart className={`w-3.5 h-3.5 transition-colors ${selectedPost.has_liked ? 'fill-pink-500 text-pink-500' : 'text-white/40'}`} />
                    <span>{selectedPost.like_count || 0} Neighbor{selectedPost.like_count !== 1 ? 's' : ''} liked this</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    {/* Like Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        handleLikeClick(e, selectedPost);
                        setSelectedPost((prev: any) => {
                          if (!prev) return prev;
                          const wasLiked = prev.has_liked;
                          const originalCount = prev.like_count || 0;
                          return {
                            ...prev,
                            has_liked: !wasLiked,
                            like_count: wasLiked ? Math.max(0, originalCount - 1) : originalCount + 1
                          };
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-4.5 py-3 border-2 border-black rounded-xl font-mono font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-[3px_3px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] group/likebtn ${
                        selectedPost.has_liked
                          ? 'bg-pink-500 text-black font-black'
                          : 'bg-white text-black hover:bg-pink-500'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 transition-colors ${selectedPost.has_liked ? 'fill-black text-black' : 'text-black group-hover/likebtn:fill-black'}`} />
                      <span>{selectedPost.has_liked ? 'Liked' : 'Like'}</span>
                    </button>

                    {/* Unsave Action */}
                    <button
                      type="button"
                      onClick={() => handleToggleSave(selectedPost.id)}
                      className="inline-flex items-center gap-1.5 px-4.5 py-3 border-2 border-black rounded-xl font-mono font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-[3px_3px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] bg-[#FF4D00] text-black font-black"
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-black text-black" />
                      <span>Saved</span>
                    </button>

                    {/* Swap/Chat Action */}
                    <button
                      onClick={() => {
                        setSelectedPost(null);
                        router.push(`/messages/${selectedPost.user_id}?post=${selectedPost.id}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-[#FF4D00] hover:bg-white hover:text-black text-black border border-black font-mono font-black text-[10px] uppercase tracking-wider transition-all shadow-[3px_3px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer group/modalbtn"
                    >
                      <span>SWAP</span>
                      <ArrowUpRight className="w-4 h-4 text-current group-hover/modalbtn:translate-x-0.5 group-hover/modalbtn:-translate-y-0.5 transition-all stroke-[2.5px]" />
                    </button>

                    {/* Report Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setReportPostId(selectedPost.id);
                        setShowReportModal(true);
                      }}
                      className="p-3 rounded-xl bg-[#111113]/80 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-white/50 hover:text-rose-500 transition-all cursor-pointer shadow-[3px_3px_0px_rgba(255,255,255,0.05)] hover:shadow-none"
                      title="Report Proposal"
                    >
                      <Flag className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN LIGHTBOX */}
      <AnimatePresence>
        {activeLightboxImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveLightboxImage(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-full max-h-[90vh] z-10 flex items-center justify-center rounded-2xl overflow-hidden border border-white/10"
            >
              {activeLightboxImage.toLowerCase().endsWith('.mp4') ? (
                <video src={activeLightboxImage} controls className="max-w-full max-h-[90vh] object-contain" autoPlay />
              ) : (
                <img src={activeLightboxImage} alt="" className="max-w-full max-h-[90vh] object-contain" />
              )}
              <button
                onClick={() => setActiveLightboxImage(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/80 hover:bg-black border border-white/10 text-white flex items-center justify-center cursor-pointer"
                title="Close image overlay"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPORT POST OVERLAY MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !reportLoading && setShowReportModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 z-10"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-rose-500 font-mono text-[10px] font-black uppercase tracking-widest">
                  <Flag className="w-4 h-4 fill-current shrink-0" />
                  <span>Report Proposal</span>
                </div>
                <button
                  onClick={() => !reportLoading && setShowReportModal(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors cursor-pointer"
                  disabled={reportLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReportPost} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">
                    Reason for reporting
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-xl bg-black border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
                    disabled={reportLoading}
                  >
                    <option value="Spam">Spam or Duplicate Listing</option>
                    <option value="Harassment">Harassment or Abuse</option>
                    <option value="Inappropriate">Inappropriate Skill Offer/Request</option>
                    <option value="Scam">Scam, Fraud or Suspicious Activity</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">
                    Additional Context (Optional)
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide details to help our safety team investigate..."
                    className="w-full rounded-xl bg-black border border-white/10 p-3 text-xs text-white placeholder-white/20 h-24 focus:outline-none focus:border-rose-500 transition-colors resize-none"
                    disabled={reportLoading}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/60 hover:text-white font-mono text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    disabled={reportLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    disabled={reportLoading}
                  >
                    {reportLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5 fill-current" />
                        <span>Submit Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST SYSTEM */}
      <div className="fixed top-4 left-4 right-4 sm:left-auto sm:top-6 sm:right-6 z-[60] flex flex-col gap-3 w-auto sm:w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => {
            const isSuccess = toast.type === 'success'
            const isError = toast.type === 'error'
            
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`pointer-events-auto w-full p-4 rounded-2xl border-2 bg-black/95 backdrop-blur-md flex items-start gap-3 shadow-lg ${
                  isSuccess 
                    ? 'border-emerald-500/40 shadow-emerald-500/10' 
                    : isError 
                      ? 'border-rose-500/40 shadow-rose-500/10' 
                      : 'border-[#FF4D00]/40 shadow-[#FF4D00]/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  isSuccess 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : isError 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                      : 'bg-[#FF4D00]/10 border-[#FF4D00]/20 text-[#FF4D00]'
                }`}>
                  {isSuccess ? (
                    <Check className="w-4 h-4" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Compass className="w-4 h-4 text-[#FF4D00]" />
                  )}
                </div>
                
                <div className="flex-1 space-y-0.5 pt-0.5">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                    {toast.type === 'success' ? 'SYSTEM SUCCESS' : toast.type === 'error' ? 'SYSTEM ERROR' : 'SYSTEM ALERT'}
                  </div>
                  <p className="text-xs text-white font-semibold leading-relaxed">
                    {toast.message}
                  </p>
                </div>
                
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="p-1 text-white/30 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

    </div>
  )
}
