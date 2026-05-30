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
  Flag,
  Loader2,
  Award,
  X,
  Heart
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

interface OnboardingStep {
  title: string
  description: string
  targetId: string
  placement: 'top' | 'bottom' | 'left' | 'right'
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Welcome",
    description: "Welcome to SkillSwap! This is your neighborhood hub where you can see everything happening around you.",
    targetId: "onboarding-welcome",
    placement: "bottom"
  },
  {
    title: "Your Neighborhood",
    description: "This shows your neighborhood and pin code. Only people in the same area can see each other's posts.",
    targetId: "onboarding-location",
    placement: "bottom"
  },
  {
    title: "Search Bar",
    description: "Use the search bar to find specific skills or neighbors. Press / on your keyboard to focus it instantly.",
    targetId: "onboarding-search",
    placement: "bottom"
  },
  {
    title: "Filter Tabs",
    description: "Filter the feed by All posts, skills being Offered, or skills being Requested by your neighbors.",
    targetId: "onboarding-filter",
    placement: "bottom"
  },
  {
    title: "Post Cards",
    description: "Each card represents a skill swap proposal. You can see the skill, description, and who posted it.",
    targetId: "onboarding-post-card",
    placement: "top"
  },
  {
    title: "Chat Button",
    description: "Click Chat to start a private conversation with that neighbor about their skill swap proposal.",
    targetId: "onboarding-chat-button",
    placement: "top"
  },
  {
    title: "New Post Button",
    description: "Ready to share your own skills? Click here to create a new offer or request and let your neighbors know what you can teach or learn.",
    targetId: "onboarding-new-post",
    placement: "right"
  },
  {
    title: "Invite Neighbors",
    description: "Grow your neighborhood! Generate an invite link and share it with friends or neighbors so they can join your local SkillSwap community.",
    targetId: "onboarding-invite-neighbor",
    placement: "right"
  }
]

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // Helper to fetch likes for a list of posts
  async function fetchLikesForPostsList(postsList: any[], currentUserId: string | null) {
    return Promise.all(
      postsList.map(async (post) => {
        const { data: likes } = await (supabase
          .from('likes') as any)
          .select('*')
          .eq('post_id', post.id)
        
        return {
          ...post,
          like_count: likes ? likes.length : 0,
          has_liked: likes && currentUserId ? likes.some((l: any) => l.user_id === currentUserId) : false
        }
      })
    )
  }
  
  // State for interactive features
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'offer' | 'request' | 'my_posts'>('all')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Onboarding Walkthrough State
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [activeElementRect, setActiveElementRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

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

  // Custom Confirm Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalConfig({ title, message, onConfirm })
    setShowConfirmModal(true)
  }

  // Get active onboarding steps dynamically based on posts availability
  const getActiveSteps = () => {
    const hasPosts = posts.length > 0
    const hasOtherUserPosts = posts.some(p => p.user_id !== user?.id)

    return ONBOARDING_STEPS.filter(step => {
      if (step.targetId === 'onboarding-post-card' && !hasPosts) return false
      if (step.targetId === 'onboarding-chat-button' && !hasOtherUserPosts) return false
      return true
    })
  }
  
  // Custom event listener to restart the tour from sidebar
  useEffect(() => {
    const handleRestartTour = () => {
      setCurrentStep(0)
      setShowWalkthrough(true)
    }
    window.addEventListener('restart-skillswap-tour', handleRestartTour)
    return () => {
      window.removeEventListener('restart-skillswap-tour', handleRestartTour)
    }
  }, [])

  // Check localStorage and initialize walkthrough after loading completes
  useEffect(() => {
    if (!loading) {
      if (typeof window !== 'undefined') {
        const isComplete = localStorage.getItem('skillswap_onboarding_complete')
        if (!isComplete) {
          const timer = setTimeout(() => {
            setShowWalkthrough(true)
            setCurrentStep(0)
          }, 500)
          return () => clearTimeout(timer)
        }
      }
    }
  }, [loading])

  // Track highlighted element position and scroll into view when step changes
  useEffect(() => {
    if (!showWalkthrough) {
      setActiveElementRect(null)
      return
    }

    const currentTargetId = getActiveSteps()[currentStep]?.targetId
    if (!currentTargetId) return

    // Dynamic drawer triggering on mobile viewports for sidebar items
    if (currentTargetId === 'onboarding-new-post' || currentTargetId === 'onboarding-invite-neighbor') {
      if (window.innerWidth < 1024) {
        window.dispatchEvent(new Event('open-skillswap-sidebar'))
      }
    } else {
      window.dispatchEvent(new Event('close-skillswap-sidebar'))
    }

    const updateRect = () => {
      const element = document.getElementById(currentTargetId)
      if (element) {
        setActiveElementRect(element.getBoundingClientRect())
      } else {
        setActiveElementRect(null)
      }
    }

    // Measure instantly so spotlight and explanation box start moving at the exact same time
    updateRect()

    // Smooth scroll the element into view instantly
    const element = document.getElementById(currentTargetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Schedule quick layout settle backups to handle mobile drawer slide-ins, etc.
    const timers = [
      setTimeout(updateRect, 100),
      setTimeout(updateRect, 200),
      setTimeout(updateRect, 400)
    ]

    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, { capture: true })

    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, { capture: true })
    }
  }, [currentStep, showWalkthrough])

  const handleOnboardingNext = () => {
    if (currentStep < getActiveSteps().length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleOnboardingComplete()
    }
  }

  const handleOnboardingBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleOnboardingSkip = () => {
    handleOnboardingComplete()
  }

  const handleOnboardingComplete = () => {
    setShowWalkthrough(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('skillswap_onboarding_complete', 'true')
    }
    // Close sidebar drawer if left open on mobile
    window.dispatchEvent(new Event('close-skillswap-sidebar'))
  }



  // Dynamic style calculation for tooltip positioning
  const getTooltipStyle = () => {
    if (!activeElementRect) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const
      }
    }
    
    const rect = activeElementRect
    const placement = getActiveSteps()[currentStep]?.placement || 'bottom'
    const tooltipWidth = 320
    const tooltipHeight = tooltipRef.current?.getBoundingClientRect().height || 230
    const margin = 30 // distance from target
    
    let left = 0
    let top = 0
    
    if (placement === 'bottom') {
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      top = rect.bottom + margin
    } else if (placement === 'top') {
      left = rect.left + rect.width / 2 - tooltipWidth / 2
      top = rect.top - tooltipHeight - margin
    } else if (placement === 'right') {
      left = rect.right + margin
      top = rect.top + rect.height / 2 - tooltipHeight / 2
    } else if (placement === 'left') {
      left = rect.left - tooltipWidth - margin
      top = rect.top + rect.height / 2 - tooltipHeight / 2
    }
    
    // Boundary collision detection
    const padding = 16
    if (typeof window !== 'undefined') {
      if (left < padding) left = padding
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding
      }
      if (top < padding) top = padding
      if (top + tooltipHeight > window.innerHeight - padding) {
        top = window.innerHeight - tooltipHeight - padding
      }
    }
    
    return {
      left,
      top,
      position: 'fixed' as const,
      width: tooltipWidth,
      zIndex: 50
    }
  }

  // Completion Modal State
  const [completionPostId, setCompletionPostId] = useState<string | null>(null)
  const [completionPartners, setCompletionPartners] = useState<{ id: string; name: string }[]>([])
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  // Report Post States
  const [reportPostId, setReportPostId] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('Spam')
  const [reportDetails, setReportDetails] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

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

      // Fast session retrieval for likes enrichment during cache load
      let currentUserId: string | null = null
      try {
        const { data: { session } } = await supabase.auth.getSession()
        currentUserId = session?.user?.id || null
      } catch (err) {
        console.error('Error fetching session for cache load:', err)
      }

      // 2. If cached profile exists, instantly start loading posts in parallel with auth check
      let postsPromise: Promise<any> | null = null
      if (cachedProfile?.pin_code) {
        const promise = (supabase
          .from('posts')
          .select('*, profiles:profiles!posts_user_id_fkey(full_name, pin_code, neighborhood)')
          .eq('is_active', true)
          .order('created_at', { ascending: false }) as any)
          
        postsPromise = promise
          
        // Run posts retrieval in parallel
        promise.then(async ({ data }: any) => {
          if (data) {
            const filtered = data.filter((post: any) => post.profiles?.pin_code === cachedProfile.pin_code)
            const enriched = await fetchLikesForPostsList(filtered, currentUserId)
            setPosts(enriched)
            setLoading(false) // Ends the loader immediately!
          }
        }).catch((err: any) => console.error('Error fetching cached posts:', err))
      }

      try {
        // 3. Fast auth check: retrieve cached session instead of blocking on server verify
        const { data: { session } } = await supabase.auth.getSession()
        let user: any = session?.user
        if (!user) {
          const { data: { user: verifiedUser } } = await supabase.auth.getUser()
          user = verifiedUser
        }

        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)

        // 4. Fetch fresh profile details from DB
        const { data: freshProfile } = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
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

        // Fetch blocked users to filter their posts out of the feed
        const { data: blockedList } = await (supabase
          .from('blocked_users') as any)
          .select('blocked_id')
          .eq('blocker_id', user.id)
        const blockedUserIds = new Set((blockedList || []).map((b: any) => b.blocked_id))

        // 5. If no cache existed, or if the pin_code changed, fetch posts freshly
        if (!cachedProfile || cachedProfile.pin_code !== freshProfile.pin_code || !postsPromise) {
          const { data: freshPosts } = await supabase
            .from('posts')
            .select('*, profiles:profiles!posts_user_id_fkey(full_name, pin_code, neighborhood)')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            
          const filtered = (freshPosts || []).filter((post: any) => post.profiles?.pin_code === freshProfile.pin_code)
          const nonBlocked = filtered.filter((post: any) => !blockedUserIds.has(post.user_id))
          
          const enriched = await fetchLikesForPostsList(nonBlocked, user.id)
          setPosts(enriched)
        } else {
          // If posts were already loaded from cache, filter out posts from blocked users
          setPosts(prev => prev.filter((post: any) => !blockedUserIds.has(post.user_id)))
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Handle logical deletion of owned posts
  async function handleDeletePost(postId: string) {
    askConfirmation(
      "Delete Proposal",
      "Are you sure you want to delete this swap proposal? This action cannot be undone.",
      async () => {
        try {
          const { error } = await (supabase
            .from('posts') as any)
            .update({ is_active: false })
            .eq('id', postId)

          if (error) {
            showToast("Failed to delete post: " + error.message, "error")
            return
          }

          // Smoothly update local React state to animate card dismissal
          setPosts(prev => prev.filter(p => p.id !== postId))
          showToast("Swap proposal deleted successfully.", "success")
        } catch (err: any) {
          showToast("Error deleting post: " + err.message, "error")
        }
      }
    )
  }

  // Realtime subscription on likes table
  useEffect(() => {
    if (!user) return

    const likesChannelName = `likes-updates-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const channel = supabase
      .channel(likesChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes'
        },
        async (payload: any) => {
          console.log('Realtime likes update:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newLike = payload.new
            if (!newLike) return
            
            setPosts(prev => prev.map(p => {
              if (p.id === newLike.post_id) {
                const isMyLike = newLike.user_id === user.id
                if (isMyLike) {
                  if (!p.has_liked) {
                    return {
                      ...p,
                      has_liked: true,
                      like_count: (p.like_count || 0) + 1
                    }
                  }
                } else {
                  return {
                    ...p,
                    like_count: (p.like_count || 0) + 1
                  }
                }
              }
              return p
            }))
          } else if (payload.eventType === 'DELETE') {
            const oldLike = payload.old
            if (!oldLike) return
            
            const postId = oldLike.post_id
            const userId = oldLike.user_id
            
            if (postId) {
              setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                  const isMyLike = userId === user.id
                  if (isMyLike) {
                    if (p.has_liked) {
                      return {
                        ...p,
                        has_liked: false,
                        like_count: Math.max(0, (p.like_count || 0) - 1)
                      }
                    }
                  } else {
                    return {
                      ...p,
                      like_count: Math.max(0, (p.like_count || 0) - 1)
                    }
                  }
                }
                return p
              }))
            } else {
              // Fallback if REPLICA IDENTITY is DEFAULT
              const { data: allLikes } = await (supabase
                .from('likes') as any)
                .select('*')
              
              if (allLikes) {
                setPosts(prev => prev.map(p => {
                  const postLikes = allLikes.filter((l: any) => l.post_id === p.id)
                  return {
                    ...p,
                    like_count: postLikes.length,
                    has_liked: postLikes.some((l: any) => l.user_id === user.id)
                  }
                }))
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Handle toggling likes
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

    // Optimistic Update (instant UI feedback)
    setPosts(prev => prev.map(p => {
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
        // Unlike: delete row from likes table
        const { error } = await (supabase
          .from('likes') as any)
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (error) throw error
        showToast("Post unliked.", "success")

        // Insert unlike notification for post owner
        if (post.user_id !== user.id) {
          const { error: notifError } = await (supabase.from('notifications') as any).insert({
            user_id: post.user_id, // post owner's id
            type: 'unlike',
            message: `${profile.full_name || 'Someone'} unliked your post`,
            related_post_id: postId,
            related_user_id: user.id,
            is_read: false
          })

          if (notifError) {
            console.error("Error inserting unlike notification:", notifError)
          }
        }
      } else {
        // Like: insert row into likes table
        const { error } = await (supabase
          .from('likes') as any)
          .insert({
            post_id: postId,
            user_id: user.id
          })

        if (error) throw error
        showToast("Post liked!", "success")

        // Insert notification for post owner
        if (post.user_id !== user.id) {
          const { error: notifError } = await (supabase.from('notifications') as any).insert({
            user_id: post.user_id, // post owner's id
            type: 'like',
            message: `${profile.full_name || 'Someone'} liked your post`,
            related_post_id: postId,
            related_user_id: user.id,
            is_read: false
          })

          if (notifError) {
            console.error("Error inserting notification:", notifError)
          }
        }
      }
    } catch (err: any) {
      console.error("Error toggling like:", err)
      showToast("Failed to update like. Rolling back...", "error")
      
      // Rollback optimistic update
      setPosts(prev => prev.map(p => {
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
      showToast("Error initiating swap completion: " + err.message, "error")
    } finally {
      setModalLoading(false)
    }
  }

  // Deactivate the post and optionally redirect to review page
  async function executeCompletion(postId: string, partnerId: string | null) {
    try {
      const { error } = await (supabase
        .from('posts') as any)
        .update({ is_active: false })
        .eq('id', postId)

      if (error) {
        showToast("Failed to complete post: " + error.message, "error")
        return
      }

      // Smoothly update local React state to dismiss card
      setPosts(prev => prev.filter(p => p.id !== postId))
      setShowCompletionModal(false)

      if (partnerId) {
        // Auto-redirect to verified reviews flow
        router.push(`/reviews/${partnerId}?post=${postId}`)
      } else {
        showToast("Swap marked as complete successfully!", "success")
      }
    } catch (err: any) {
      showToast("Error completing post: " + err.message, "error")
    }
  }

  async function handleReportPost(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !reportPostId || !reportReason) return
    setReportLoading(true)
    try {
      const reportedPost = posts.find(p => p.id === reportPostId)
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

      // Insert notification for the reported user (anonymously)
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

  // Filter posts on the client-side for dynamic instant reactions
  const filteredPosts = posts.filter(post => {
    const postType = post.type?.toLowerCase().trim()
    
    // 1. Filter by Tab
    if (activeTab === 'offer' && postType !== 'offer' && postType !== 'offering') return false
    if (activeTab === 'request' && postType !== 'request' && postType !== 'requesting') return false
    if (activeTab === 'my_posts' && post.user_id !== user?.id) return false
    
    // 2. Filter by Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase()
      const titleMatch = post.title?.toLowerCase().includes(query)
      const descMatch = post.description?.toLowerCase().includes(query)
      const skillMatch = post.skill?.toLowerCase().includes(query)
      const authorMatch = post.profiles?.full_name?.toLowerCase().includes(query)
      return titleMatch || descMatch || skillMatch || authorMatch
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
          {/* Cyber Tech Blueprint Grid */}
          <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
              <Layers className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Swapper Hub</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Loading your neighborhood...</p>
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
        <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

        {/* DASHBOARD INNER BODY */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
        
        {/* HERO GREETING PANEL */}
        <motion.div 
          id="onboarding-welcome"
          variants={FADE_UP}
          className="bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)]"
        >
          {/* Subtle gradient light backing */}
          <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
            
            {/* Left Col: Greeting & User Name */}
            <div className="lg:col-span-6 space-y-4.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none">
                <Sparkles className="w-3 h-3 text-[#FF4D00] animate-pulse" />
                <span>Active Swapper Hub</span>
              </div>
              <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl leading-[0.9] text-white tracking-tight uppercase flex flex-col gap-2">
                <SplitText
                  text="Welcome back,"
                  className="text-white inline-block"
                  delay={40}
                  duration={0.6}
                  ease="power3.out"
                  textAlign="left"
                  tag="span"
                />
                <SplitText
                  text={profile?.full_name || ''}
                  className="text-[#FF4D00] inline-block"
                  delay={40}
                  duration={0.6}
                  ease="power3.out"
                  textAlign="left"
                  tag="span"
                />
              </h1>

              {profile?.bio && (
                <p className="text-xs sm:text-sm text-gray-400 font-semibold leading-relaxed max-w-md">
                  {profile.bio}
                </p>
              )}

              {profile?.availability && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-white/50 tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                  <span>
                    <span className="font-bold text-[#FF4D00]">Available:</span> {profile.availability}
                  </span>
                </div>
              )}

              <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-2">
                Hyperlocal mutualism engine active | Trading skills directly with neighbors without cash.
              </p>
            </div>

            {/* Right Col: Interactive Stats Summary */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              
              {/* Location Card */}
              <div id="onboarding-location" className="bg-black border-2 border-white/10 hover:border-[#FF4D00]/60 transition-colors duration-300 rounded-2xl p-5 flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-white/40 tracking-widest uppercase">Your Location</span>
                  <div className="w-7 h-7 rounded bg-[#FF4D00]/10 flex items-center justify-center text-[#FF4D00] border border-[#FF4D00]/20">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="pt-2">
                  <div className="font-display font-bold text-lg text-white truncate uppercase tracking-tight">
                    {profile?.neighborhood || 'Local Neighborhood'}
                  </div>
                  <div className="text-[10px] font-mono text-white/50 tracking-wider uppercase pt-1">
                    Pin Code: {profile?.pin_code}
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-black border-2 border-white/10 hover:border-[#FF4D00]/60 transition-colors duration-300 rounded-2xl p-5 flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-white/40 tracking-widest uppercase">Matches Nearby</span>
                  <div className="w-7 h-7 rounded bg-[#FF4D00]/10 flex items-center justify-center text-[#FF4D00] border border-[#FF4D00]/20">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="pt-2">
                  <div className="font-display font-black text-2xl text-[#FF4D00] uppercase leading-none tracking-tight">
                    {posts.length} Active
                  </div>
                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider pt-1.5">
                    Within 3-mile radius
                  </div>
                </div>
              </div>

              {/* Skills Offered Info row */}
              <div className="sm:col-span-2 bg-black border-2 border-white/10 rounded-2xl p-5 space-y-3.5">
                <div className="flex flex-col gap-3 text-[10px] font-mono uppercase tracking-wider">
                  
                  {/* Offered list */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-emerald-400">Teaching:</span>
                    <span className="text-white font-bold tracking-widest truncate max-w-[320px] sm:max-w-md" title={profile?.skills_offered?.join(', ')}>
                      {profile?.skills_offered?.join(', ') || 'None listed'}
                    </span>
                  </div>

                  {/* Needed list */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF4D00] shrink-0" />
                    <span className="font-bold text-[#FF4D00]">Learning:</span>
                    <span className="text-white font-bold tracking-widest truncate max-w-[320px] sm:max-w-md" title={profile?.skills_needed?.join(', ')}>
                      {profile?.skills_needed?.join(', ') || 'None listed'}
                    </span>
                  </div>

                </div>
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
          <div id="onboarding-filter" className="flex items-center overflow-x-auto p-1 rounded-2xl bg-black border border-white/10 self-start max-w-full relative">
            
            {/* ALL */}
            <button 
              onClick={() => setActiveTab('all')}
              className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'all' ? 'text-black' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === 'all' && (
                <motion.span 
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#FF4D00] rounded-xl z-[-1] shadow-lg shadow-[#FF4D00]/15"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              All Swaps
            </button>

            {/* OFFERS */}
            <button 
              onClick={() => setActiveTab('offer')}
              className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'offer' ? 'text-emerald-400' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === 'offer' && (
                <motion.span 
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-xl z-[-1]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                Offering
              </span>
            </button>

            {/* REQUESTS */}
            <button 
              onClick={() => setActiveTab('request')}
              className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'request' ? 'text-[#FF9A3C]' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === 'request' && (
                <motion.span 
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-xl z-[-1]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF4D00] shrink-0" />
                Requesting
              </span>
            </button>

            {/* MY POSTS */}
            <button 
              onClick={() => setActiveTab('my_posts')}
              className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'my_posts' ? 'text-black' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === 'my_posts' && (
                <motion.span 
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white rounded-xl z-[-1]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              My Posts
            </button>

          </div>

          {/* Search & Dynamic Count Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
            {/* Dynamic Results Counter */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse shrink-0" />
              <span>Showing <strong className="text-[#FF4D00] font-black">{filteredPosts.length}</strong> active slots</span>
            </div>

            {/* Search input container */}
            <div id="onboarding-search" className="relative w-full sm:w-80 md:w-96 group rounded-2xl bg-[#09090b] border border-white/10 focus-within:border-[#FF4D00] focus-within:ring-1 focus-within:ring-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all duration-200">
              <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 ${isSearchFocused ? 'text-[#FF4D00]' : 'text-white/40'}`}>
                <Search className={`w-4 h-4 ${isSearchFocused ? 'scale-110' : ''} transition-transform duration-300`} />
              </span>
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search skill, topic, neighbor..."
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

        {/* FEED CONTENT GRID */}
        <motion.div 
          variants={CONTAINER_STAGGER}
          className="relative"
        >
          
          <AnimatePresence mode="wait">
            {filteredPosts.length === 0 ? (
              
              // EMPTY STATE ILLUSTRATION CONTAINER
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                variants={{}} // Disable variant inheritance
                className="w-full bg-black border-2 border-white/10 p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-6 mt-6 rounded-[2rem] shadow-[6px_6px_0px_rgba(255,77,0,0.12)]"
              >
                <div className="w-14 h-14 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center text-[#FF4D00]">
                  <Compass className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">No slots active</h3>
                  <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                    {searchQuery 
                      ? `We couldn't find any swaps matching "${searchQuery}".`
                      : activeTab === 'my_posts'
                        ? "You haven't posted any skills yet! Share what you know to invite swap requests."
                        : `No swaps active in ZIP code ${profile?.pin_code}. Be the first to start a chain!`
                    }
                  </p>
                </div>

                {/* Call to Actions inside empty feed */}
                <button 
                  onClick={() => {
                    if (searchQuery) {
                      setSearchQuery('')
                    } else {
                      router.push('/posts/create')
                    }
                  }}
                  className="px-6 py-3 rounded-xl bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.99] border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
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
                {(() => {
                  let chatButtonAssigned = false;
                  return filteredPosts.map((post, idx) => {
                    const isOwnPost = post.user_id === user?.id
                    const isFirstPost = idx === 0
                    const shouldHaveChatButtonId = !isOwnPost && !chatButtonAssigned
                    if (shouldHaveChatButtonId) {
                      chatButtonAssigned = true
                    }

                    return (
                      <motion.div 
                        key={post.id}
                        id={isFirstPost ? "onboarding-post-card" : undefined}
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

                          {/* Created date display & Like Button */}
                          <div className="flex items-center gap-2 relative z-20">
                            <div className="flex items-center gap-1 text-[9px] font-mono text-black/40 uppercase tracking-wider font-bold">
                              <Clock className="w-3.5 h-3.5 text-black/30" />
                              <span>{formatDate(post.created_at)}</span>
                            </div>

                            {!isOwnPost && (
                              <button
                                type="button"
                                onClick={(e) => handleLikeClick(e, post)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-black rounded-full font-mono text-[9px] font-bold transition-all active:scale-90 cursor-pointer bg-white text-black hover:bg-black/5 shadow-[1px_1px_0px_#000000] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
                                title={post.has_liked ? "Unlike post" : "Like post"}
                              >
                                <Heart className={`w-3 h-3 ${post.has_liked ? 'fill-[#FF4D00] text-[#FF4D00]' : 'text-black'}`} />
                                <span>{post.like_count || 0}</span>
                              </button>
                            )}
                          </div>

                        </div>

                        {/* POST CONTENT */}
                        <div className="space-y-3 pt-1">
                          
                          {/* Title */}
                          <h3 className="font-display font-black text-lg text-black group-hover:text-[#FF4D00] transition-colors leading-snug truncate uppercase tracking-tight">
                            {post.title}
                          </h3>

                          {/* Target skill tag pill */}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[10px] font-mono font-bold uppercase text-black tracking-wider">
                            <Tag className="w-3 h-3 text-black" />
                            <span>Skill: {post.skill}</span>
                          </div>

                          {/* Description body */}
                          <p className="text-black/80 text-xs font-semibold leading-relaxed line-clamp-3 pt-1">
                            {post.description}
                          </p>

                        </div>

                      </div>

                      {/* CARD FOOTER & AUTHOR PANEL */}
                      <div className="pt-5 mt-5 border-t border-black/10 flex items-center justify-between relative z-10">
                        
                        {/* Author metadata (Clickable Profile Link) */}
                        <div 
                          onClick={() => router.push(`/profile/${post.user_id}`)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer group/author hover:opacity-85 transition-all"
                          title={`View ${post.profiles?.full_name}'s profile`}
                        >
                          
                          {/* Avatar Circle */}
                          <div className="w-8 h-8 rounded-full bg-[#FF4D00] border-2 border-black text-black flex items-center justify-center font-bold text-xs shrink-0 group-hover/author:border-black transition-colors shadow-inner">
                            {post.profiles?.full_name?.charAt(0).toUpperCase() || 'S'}
                          </div>

                          {/* Author Name and Location context */}
                          <div className="min-w-0">
                            <div className="text-[11px] font-display font-black uppercase tracking-wider text-black group-hover/author:text-[#FF4D00] transition-colors truncate leading-none">
                              {post.profiles?.full_name}
                            </div>
                            <div className="text-[9px] font-mono uppercase tracking-wider text-black/55 flex items-center gap-0.5 pt-1 truncate">
                              <MapPin className="w-2.5 h-2.5 text-black/40 shrink-0" />
                              <span className="truncate">{post.profiles?.neighborhood || 'Local Area'}</span>
                            </div>
                          </div>

                        </div>

                        {/* Interactive CTA action buttons */}
                        <div className="shrink-0 pl-2">
                          {isOwnPost ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={modalLoading}
                                onClick={() => handleMarkAsComplete(post.id)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-black border border-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer disabled:opacity-50"
                                title="Mark Swap as Complete"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                                <span>Complete</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-400 hover:bg-rose-500 text-black border border-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                                title="Delete Proposal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          ) : (
                            
                            // MESSAGE CHAT ACTIONS BUTTON & REPORT BUTTON
                            <div className="flex items-center gap-2">
                              <button
                                id={shouldHaveChatButtonId ? "onboarding-chat-button" : undefined}
                                onClick={() => router.push(`/messages/${post.user_id}?post=${post.id}`)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF4D00] hover:bg-black hover:text-white text-black border border-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer group/btn"
                              >
                                <span>Swap</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-current group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all stroke-[2.5px]" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReportPostId(post.id)
                                  setShowReportModal(true)
                                }}
                                className="p-2.5 rounded-xl bg-white hover:bg-rose-500/10 border border-black/10 hover:border-rose-500/30 text-black/50 hover:text-rose-600 transition-all cursor-pointer shadow-[2px_2px_0px_#000000] hover:shadow-none"
                                title="Report Proposal"
                              >
                                <Flag className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </div>

                          )}
                        </div>

                      </div>

                    </motion.div>
                  )
                });
              })()}
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

      {/* REPORT POST MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowReportModal(false)
                setReportPostId(null)
              }}
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
              
              <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-[9px] font-bold text-rose-500/50 uppercase tracking-widest">SECURE REPORT LINK</div>
                  <h3 className="font-display font-black text-base text-white uppercase tracking-tight">Report Proposal</h3>
                </div>
              </div>

              <form onSubmit={handleReportPost} className="space-y-4 relative z-10">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest mb-1.5">
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

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest mb-1.5">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    placeholder="Provide any additional details or context..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3.5 bg-[var(--app-bg)] border-2 border-white/10 text-white text-xs font-mono font-bold tracking-wider placeholder-white/15 rounded-xl focus:border-rose-500 focus:shadow-[0_0_15px_rgba(244,63,94,0.2)] focus:outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false)
                      setReportPostId(null)
                    }}
                    className="px-4.5 py-3.5 rounded-xl bg-black hover:bg-[#161618] border-2 border-white/10 hover:border-white/20 text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 hover:text-white transition-all cursor-pointer shadow-[2px_2px_0px_rgba(255,255,255,0.05)] active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="px-5 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-black hover:text-black transition-all font-mono font-bold text-[11px] uppercase tracking-wider cursor-pointer border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                    {reportLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black shrink-0" />
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

      {/* ONBOARDING TOUR RENDER OVERLAYS */}
      <AnimatePresence>
        {showWalkthrough && activeElementRect && (
          <>
            {/* SVG Mask Spotlight Backdrop */}
            <svg 
              className="fixed inset-0 w-full h-full pointer-events-none z-[42]"
              style={{ pointerEvents: 'none' }}
            >
              <defs>
                <mask id="onboarding-spotlight-mask">
                  {/* Backdrop is visible by default (white) */}
                  <rect width="100%" height="100%" fill="white" />
                  {/* Spotlight hole is transparent (black) */}
                  <motion.rect 
                    animate={{
                      x: activeElementRect.x - 6,
                      y: activeElementRect.y - 6,
                      width: activeElementRect.width + 12,
                      height: activeElementRect.height + 12,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 160,
                      damping: 22,
                      restDelta: 0.5,
                    }}
                    rx="12" 
                    fill="black" 
                  />
                </mask>
              </defs>
              <rect 
                width="100%" 
                height="100%" 
                fill="rgba(5, 5, 8, 0.72)" 
                mask="url(#onboarding-spotlight-mask)"
                style={{ pointerEvents: 'auto' }}
              />
            </svg>

            {/* Glowing Orange Target Ring */}
            <motion.div 
              className="fixed pointer-events-none z-[43] rounded-[12px] border-2 border-[#FF4D00]"
              animate={{
                x: activeElementRect.x - 6,
                y: activeElementRect.y - 6,
                width: activeElementRect.width + 12,
                height: activeElementRect.height + 12,
              }}
              transition={{
                type: "spring",
                stiffness: 160,
                damping: 22,
                restDelta: 0.5,
              }}
              style={{
                boxShadow: '0 0 15px 4px rgba(255, 77, 0, 0.45), inset 0 0 8px rgba(255, 77, 0, 0.25)',
                left: 0,
                top: 0,
              }}
            />



            {/* Onboarding Dialog Tooltip Card */}
            {(() => {
              const tooltipStyle = getTooltipStyle()
              return (
                <motion.div
                  ref={tooltipRef}
                  id="onboarding-tooltip"
                  animate={{
                    x: tooltipStyle.left,
                    y: tooltipStyle.top,
                    scale: 1,
                    opacity: 1,
                  }}
                  initial={{
                    x: tooltipStyle.left,
                    y: tooltipStyle.top,
                    scale: 0.94,
                    opacity: 0,
                  }}
                  exit={{
                    scale: 0.94,
                    opacity: 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 160,
                    damping: 22,
                    restDelta: 0.5,
                  }}
                  className="bg-black/90 backdrop-blur-md border-2 border-[#FF4D00] rounded-[24px] p-5 shadow-[0_0_40px_rgba(255,77,0,0.22)] text-white flex flex-col gap-4 fixed"
                  style={{
                    width: tooltipStyle.width,
                    zIndex: tooltipStyle.zIndex,
                    left: 0,
                    top: 0,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <span className="font-mono text-[9px] font-bold uppercase text-[#FF4D00] tracking-widest">
                      Step {currentStep + 1} of {getActiveSteps().length}
                    </span>
                    <button 
                      onClick={handleOnboardingSkip}
                      className="text-[9px] font-mono font-bold uppercase text-white/40 hover:text-[#FF4D00] transition-colors cursor-pointer"
                    >
                      Skip Tour
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h4 className="font-display font-black text-sm uppercase text-white tracking-tight flex flex-col gap-1">
                      {getActiveSteps()[currentStep].title}
                      
                      {/* Curved Sketchy Doodle Line */}
                      <svg className="w-24 h-1.5 text-[#FF4D00] mt-0.5" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <path d="M 0 5 Q 25 2, 50 6 T 100 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </h4>
                    <p className="text-[11px] text-gray-300 font-semibold leading-relaxed">
                      {getActiveSteps()[currentStep].description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-1">
                    <button
                      onClick={handleOnboardingBack}
                      disabled={currentStep === 0}
                      className={`px-3 py-1.5 rounded-lg border-2 border-white/15 text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        currentStep === 0 
                          ? 'opacity-25 cursor-not-allowed border-white/5 text-white/30' 
                          : 'hover:bg-white/5 text-white/70 hover:text-white hover:border-white/30'
                      }`}
                    >
                      Back
                    </button>

                    <button
                      onClick={handleOnboardingNext}
                      className="px-4.5 py-2 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all border-2 border-black shadow-[3px_3px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] cursor-pointer"
                    >
                      {currentStep === getActiveSteps().length - 1 ? 'Finish' : 'Next'}
                    </button>
                  </div>
                </motion.div>
              )
            })()}
          </>
        )}
      </AnimatePresence>

      {/* Floating Restart Tour Button */}
      <AnimatePresence>
        {!showWalkthrough && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-30"
          >
            <button
              onClick={() => {
                setCurrentStep(0)
                setShowWalkthrough(true)
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('skillswap_onboarding_complete')
                }
              }}
              className="flex items-center gap-2 px-4.5 py-3.5 bg-black/80 hover:bg-[#FF4D00] text-white hover:text-black border-2 border-[#FF4D00] hover:border-black font-mono font-bold text-[10px] uppercase tracking-widest rounded-full backdrop-blur-md shadow-[0_0_30px_rgba(255,77,0,0.25)] hover:shadow-[0_0_15px_rgba(255,77,0,0.5)] transition-all duration-300 active:scale-95 cursor-pointer group"
              title="Restart Onboarding Tour"
            >
              <Award className="w-4.5 h-4.5 text-[#FF4D00] group-hover:text-black transition-colors shrink-0 stroke-[2.5px]" />
              <span>Restart Tour</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications Container */}
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

      {/* Custom Confirm Modal */}
      <AnimatePresence>
        {showConfirmModal && confirmModalConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-black border-2 border-[#FF4D00]/30 rounded-[2rem] p-6 relative z-10 shadow-[0_0_50px_rgba(255,77,0,0.15)] shadow-[12px_12px_0px_#FF4D00] flex flex-col gap-6 w-full max-w-sm overflow-hidden"
            >
              <div className="absolute top-[-20%] right-[-20%] w-[180px] h-[180px] rounded-full bg-[#FF4D00]/5 blur-[50px] pointer-events-none z-0" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/30 flex items-center justify-center text-[#FF4D00]">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">{confirmModalConfig.title}</h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 pt-0.5">NEIGHBORHOOD HUB CONFIRMATION</p>
                </div>
              </div>

              <p className="text-xs text-gray-300 font-semibold leading-relaxed relative z-10">
                {confirmModalConfig.message}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 relative z-10">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="py-3 px-4 bg-black hover:bg-[#161618] text-white/50 hover:text-white border-2 border-white/10 hover:border-white/20 font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModalConfig.onConfirm()
                    setShowConfirmModal(false)
                  }}
                  className="py-3 px-4 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all border-2 border-black shadow-[2px_2px_0px_#FFFFFF] hover:shadow-none cursor-pointer text-center font-black"
                >
                  Confirm
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
