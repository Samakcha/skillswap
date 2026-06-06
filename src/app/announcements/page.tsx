'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone,
  Heart,
  Trash2,
  Loader2,
  Sparkles,
  MapPin,
  AlertCircle,
  X,
  Clock,
  Compass,
  Check
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

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export default function AnnouncementsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // App States
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  // Form/Input States
  const [content, setContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isLight, setIsLight] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)

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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Relative Time Helper Wording: e.g. "2 minutes ago", "3 hours ago"
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHr / 24)

    if (diffSec < 60) {
      return 'just now'
    } else if (diffMin < 60) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`
    } else if (diffHr < 24) {
      return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`
    } else if (diffDays === 1) {
      return 'yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  }

  // Enrich announcements with user specific like-status
  const enrichAnnouncementsList = (annList: any[], currentUserId: string | null) => {
    return annList.map((ann) => {
      const likes = ann.announcement_likes || []
      return {
        ...ann,
        like_count: likes.length,
        has_liked: currentUserId ? likes.some((l: any) => l.user_id === currentUserId) : false
      }
    })
  }

  // Load User, Profile, and Announcements
  useEffect(() => {
    async function loadData() {
      // 1. Try to load profile instantly from cache
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
        // 2. Fetch/Verify User Session
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

        // 3. Fetch Fresh Profile
        const { data: freshProfile, error: profileError } = await (supabase
          .from('profiles') as any)
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (profileError || !freshProfile) {
          router.push('/profile-setup')
          return
        }

        setProfile(freshProfile)
        if (typeof window !== 'undefined') {
          localStorage.setItem('skillswap_profile', JSON.stringify(freshProfile))
        }

        // 4. Fetch Announcements for user's Pin Code
        const userPinCode = freshProfile.pin_code
        // Filter out expired announcements (older than 7 days)
        const expirationTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        let fetchRes = await (supabase
          .from('announcements') as any)
          .select('*, profiles:profiles!user_id(full_name, avatar_url), announcement_likes(id, user_id)')
          .eq('pin_code', userPinCode)
          .gte('created_at', expirationTime)
          .order('created_at', { ascending: false })

        if (fetchRes.error) {
          console.warn('Primary fetch error, attempting fallback join syntax:', fetchRes.error)
          fetchRes = await (supabase
            .from('announcements') as any)
            .select('*, profiles:profiles(full_name, avatar_url), announcement_likes(id, user_id)')
            .eq('pin_code', userPinCode)
            .gte('created_at', expirationTime)
            .order('created_at', { ascending: false })
        }

        if (fetchRes.error) throw fetchRes.error

        const enriched = enrichAnnouncementsList(fetchRes.data || [], currentUser.id)
        setAnnouncements(enriched)
      } catch (err: any) {
        console.error('Error fetching announcements page data:', err)
        showToast('Failed to load announcements board: ' + err.message, 'error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Setup Supabase Realtime Subscriptions
  useEffect(() => {
    if (!user || !profile?.pin_code) return

    // 1. Channel for announcements table changes
    const announcementsChannelName = `realtime-announcements-${profile.pin_code}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const announcementsChannel = supabase
      .channel(announcementsChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        async (payload: any) => {
          const newRow = payload.new
          if (!newRow || newRow.pin_code !== profile.pin_code) return

          // Avoid duplicates
          let alreadyExists = false
          setAnnouncements(prev => {
            alreadyExists = prev.some(a => a.id === newRow.id)
            return prev
          })
          if (alreadyExists) return

          // Fetch the profile of the poster (since joined data isn't in raw payload)
          try {
            const { data: posterProfile } = await (supabase
              .from('profiles') as any)
              .select('full_name, avatar_url')
              .eq('id', newRow.user_id)
              .single()

            const enriched = {
              ...newRow,
              profiles: posterProfile || { full_name: 'Neighbor', avatar_url: null },
              announcement_likes: [],
              like_count: 0,
              has_liked: false
            }

            setAnnouncements(prev => {
              if (prev.some(a => a.id === newRow.id)) return prev
              return [enriched, ...prev]
            })
          } catch (err) {
            console.error('Error fetching profile for realtime insert:', err)
            const enriched = {
              ...newRow,
              profiles: { full_name: 'Neighbor', avatar_url: null },
              announcement_likes: [],
              like_count: 0,
              has_liked: false
            }
            setAnnouncements(prev => {
              if (prev.some(a => a.id === newRow.id)) return prev
              return [enriched, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'announcements'
        },
        (payload: any) => {
          const oldRow = payload.old
          if (oldRow) {
            setAnnouncements(prev => prev.filter(a => a.id !== oldRow.id))
          }
        }
      )
      .subscribe()

    // 2. Channel for announcement_likes changes to update like counts in real-time
    const likesChannelName = `realtime-likes-${profile.pin_code}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const likesChannel = supabase
      .channel(likesChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcement_likes'
        },
        async (payload: any) => {
          const newLike = payload.new
          if (!newLike) return

          // Increment count in local state
          setAnnouncements(prev => prev.map(ann => {
            if (ann.id === newLike.announcement_id) {
              const existingLikeIdx = ann.announcement_likes?.findIndex((l: any) => l.user_id === newLike.user_id)
              
              if (existingLikeIdx !== -1) {
                // Update the temp id to the real id from the database, do not change like_count
                const updatedLikes = [...ann.announcement_likes]
                updatedLikes[existingLikeIdx] = { id: newLike.id, user_id: newLike.user_id }
                return {
                  ...ann,
                  announcement_likes: updatedLikes,
                  has_liked: newLike.user_id === user?.id ? true : ann.has_liked
                }
              }

              // Otherwise it's from another user, increment like_count and append the like
              return {
                ...ann,
                announcement_likes: [...(ann.announcement_likes || []), { id: newLike.id, user_id: newLike.user_id }],
                like_count: (ann.like_count || 0) + 1,
                has_liked: newLike.user_id === user?.id ? true : ann.has_liked
              }
            }
            return ann
          }))

          // Toast notification for the announcement owner
          let likedAnn: any = null
          setAnnouncements(prev => {
            likedAnn = prev.find(a => a.id === newLike.announcement_id)
            return prev
          })

          if (likedAnn && likedAnn.user_id === user.id && newLike.user_id !== user.id) {
            try {
              const { data: likerProfile } = await (supabase
                .from('profiles') as any)
                .select('full_name')
                .eq('id', newLike.user_id)
                .single()

              showToast(`${likerProfile?.full_name || 'Someone'} liked your announcement!`, 'info')
            } catch (err) {
              console.error('Error fetching liker profile for realtime toast:', err)
              showToast('Someone liked your announcement!', 'info')
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'announcement_likes'
        },
        (payload: any) => {
          const oldLike = payload.old
          if (!oldLike || !oldLike.id) return

          // Decrement count in local state
          setAnnouncements(prev => prev.map(ann => {
            const hasLike = ann.announcement_likes?.some((l: any) => l.id === oldLike.id)
            if (!hasLike) return ann

            const likeToRemove = ann.announcement_likes.find((l: any) => l.id === oldLike.id)
            const isMyUnlike = likeToRemove?.user_id === user?.id

            return {
              ...ann,
              announcement_likes: ann.announcement_likes.filter((l: any) => l.id !== oldLike.id),
              like_count: Math.max(0, (ann.like_count || 0) - 1),
              has_liked: isMyUnlike ? false : ann.has_liked
            }
          }))
        }
      )
      .subscribe()

    // 3. Presence channel to track online users in the same neighborhood
    const presenceChannelName = `announcements-presence-${profile.pin_code}`
    const presenceChannel = supabase.channel(presenceChannelName)

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        setOnlineCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            full_name: profile.full_name,
            online_at: new Date().toISOString()
          })
        }
      })

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(announcementsChannel)
      supabase.removeChannel(likesChannel)
      presenceChannel.untrack()
      supabase.removeChannel(presenceChannel)
    }
  }, [user, profile])

  // Posting a new announcement
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user || !profile) return
    if (content.length > 300) {
      showToast('Announcement content exceeds the 300 character limit.', 'error')
      return
    }

    setIsPosting(true)
    try {
      const { data: newRow, error: insertError } = await (supabase
        .from('announcements') as any)
        .insert({
          user_id: user.id,
          pin_code: profile.pin_code,
          content: content.trim()
        })
        .select()
        .single()

      if (insertError) throw insertError

      setContent('')
      showToast('Announcement posted successfully!', 'success')

      // Optimistically insert locally (to guarantee instant feedback while Realtime handles duplicate prevention)
      const enrichedNewRow = {
        ...newRow,
        profiles: { full_name: profile.full_name, avatar_url: profile.avatar_url },
        announcement_likes: [],
        like_count: 0,
        has_liked: false
      }

      setAnnouncements(prev => {
        if (prev.some(a => a.id === newRow.id)) return prev
        return [enrichedNewRow, ...prev]
      })
    } catch (err: any) {
      console.error('Error creating announcement:', err)
      showToast('Failed to post announcement: ' + err.message, 'error')
    } finally {
      setIsPosting(false)
    }
  };

  // Deleting an announcement
  const handleDeleteAnnouncement = async (annId: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement? This cannot be undone.')) return

    try {
      const { error: deleteError } = await (supabase
        .from('announcements') as any)
        .delete()
        .eq('id', annId)

      if (deleteError) throw deleteError

      setAnnouncements(prev => prev.filter(a => a.id !== annId))
      showToast('Announcement deleted.', 'success')
    } catch (err: any) {
      console.error('Error deleting announcement:', err)
      showToast('Failed to delete announcement: ' + err.message, 'error')
    }
  };

  // Liking/Unliking an announcement (Optimistic Updates)
  const handleToggleLike = async (ann: any) => {
    if (!user) {
      showToast('You must be logged in to like announcements.', 'error')
      return
    }

    if (ann.user_id === user.id) {
      showToast('You cannot like your own announcements.', 'error')
      return
    }

    const annId = ann.id
    const wasLiked = ann.has_liked
    const originalCount = ann.like_count

    // Optimistic UI Update
    setAnnouncements(prev => prev.map(a => {
      if (a.id === annId) {
        return {
          ...a,
          has_liked: !wasLiked,
          like_count: wasLiked ? Math.max(0, originalCount - 1) : originalCount + 1,
          announcement_likes: wasLiked
            ? (a.announcement_likes || []).filter((l: any) => l.user_id !== user.id)
            : [...(a.announcement_likes || []), { id: `temp-${Math.random().toString(36).substring(2, 9)}`, user_id: user.id }]
        }
      }
      return a
    }))

     try {
      if (wasLiked) {
        // Unlike row deletion
        const { error } = await (supabase
          .from('announcement_likes') as any)
          .delete()
          .eq('announcement_id', annId)
          .eq('user_id', user.id)

        if (error) throw error
        showToast('Announcement unliked.', 'success')
      } else {
        // Like row insertion
        const { error } = await (supabase
          .from('announcement_likes') as any)
          .insert({
            announcement_id: annId,
            user_id: user.id
          })

        if (error) throw error
        showToast('Announcement liked!', 'success')

        // Don't send notification if liking own announcement
        if (ann.user_id === user.id) return

        const { error: notifError } = await (supabase
          .from('notifications') as any)
          .insert({
            user_id: ann.user_id,
            type: 'announcement_like',
            message: `${profile?.full_name || 'Someone'} liked your announcement`,
            related_post_id: null,
            related_user_id: user.id,
            is_read: false
          })

        if (notifError) {
          console.error('Error inserting notification:', notifError)
        }
      }
    } catch (err: any) {
      console.error('Error toggling like:', err)
      // Rollback on failure
      setAnnouncements(prev => prev.map(a => {
        if (a.id === annId) {
          return {
            ...a,
            has_liked: wasLiked,
            like_count: originalCount,
            announcement_likes: wasLiked
              ? [...(a.announcement_likes || []), { user_id: user.id }]
              : (a.announcement_likes || []).filter((l: any) => l.user_id !== user.id)
          }
        }
        return a
      }))
      showToast('Failed to update like status.', 'error')
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg text-gray-100 flex flex-col lg:flex-row font-sans selection:bg-[#FF4D00]/30 selection:text-white relative overflow-x-clip w-full">
      {/* Blueprint Grid Overlay */}
      <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />

      {/* Sidebar Navigation */}
      <Sidebar profile={profile} supabase={supabase} user={user} />

      {/* Main Board Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative">
        {/* Background Radial Glow Effects */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
          
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
                <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none">
                  <Sparkles className="w-3 h-3 text-[#FF4D00] animate-pulse" />
                  <span>Local Bulletin</span>
                </div>
                <h1 className="font-display font-black text-3xl sm:text-4xl leading-[0.9] text-white tracking-tight uppercase flex flex-wrap gap-x-2">
                  <SplitText
                    text="Neighborhood"
                    className="text-white"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                  <SplitText
                    text="Board"
                    className="text-[#FF4D00]"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                </h1>
                <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-2">
                  Announcements automatically expire after 7 days to keep listings fresh.
                </p>
              </div>

              {/* Location Badge Indicator */}
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
                {/* Presence Indicator inside Location Badge */}
                <div className="flex items-center gap-1.5 text-[9px] font-mono mt-1.5 select-none">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-white/40 tracking-wide">
                    {onlineCount <= 1 
                      ? 'Only you are here right now' 
                      : onlineCount === 2 
                        ? '1 neighbor online now' 
                        : `${onlineCount - 1} neighbors online now`}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* New Announcement Posting Section */}
          <motion.div
            variants={FADE_UP}
            initial="hidden"
            animate="visible"
            className={`rounded-[1.5rem] p-5 backdrop-blur-md relative transition-all duration-300 ${
              isLight
                ? 'bg-[#FFFCF9] border-2 border-black shadow-[6px_6px_0px_#000000]'
                : 'bg-black/45 border border-white/10'
            }`}
          >
            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 300))}
                  placeholder="Broadcast a message to your neighbors..."
                  maxLength={300}
                  className={`w-full rounded-xl p-4 text-sm transition-all duration-200 resize-none h-28 focus:outline-none focus:ring-1 ${
                    isLight
                      ? 'bg-black/[0.03] border-2 border-black/20 text-black placeholder-black/40 focus:border-black focus:ring-black'
                      : 'bg-white/[0.03] border border-white/10 text-white placeholder-white/20 focus:border-[#FF4D00] focus:ring-[#FF4D00]'
                  }`}
                  disabled={loading || isPosting}
                />
              </div>

              <div className="flex justify-between items-center">
                {/* Character Counter Progress & Indicator */}
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${
                    content.length >= 280 
                      ? 'text-rose-400' 
                      : content.length >= 240 
                        ? 'text-yellow-400' 
                        : isLight 
                          ? 'text-black/60'
                          : 'text-white/40'
                  }`}>
                    {content.length} / 300 CHARS
                  </span>
                  <div className={`hidden sm:block w-32 h-1 rounded-full overflow-hidden ${isLight ? 'bg-black/10' : 'bg-white/5'}`}>
                    <motion.div 
                      className={`h-full ${
                        content.length >= 280 
                          ? 'bg-rose-500' 
                          : content.length >= 240 
                            ? 'bg-yellow-500' 
                            : isLight
                              ? 'bg-black'
                              : 'bg-[#FF4D00]'
                      }`}
                      animate={{ width: `${(content.length / 300) * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>

                {/* Post Announcement Button */}
                <button
                  type="submit"
                  disabled={isPosting || !content.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-[#FF4D00] hover:bg-black text-black hover:text-white border-2 border-black shadow-[3px_3px_0px_#000000] hover:shadow-none'
                      : 'bg-[#FF4D00] hover:bg-white text-black border border-black hover:border-white shadow-[2px_2px_0px_rgba(255,255,255,0.15)] hover:shadow-none'
                  }`}
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Broadcasting...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className={`w-3.5 h-3.5 ${isLight ? 'fill-current' : 'fill-black stroke-none'}`} />
                      <span>Post Announcement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Announcements Feed Section */}
          <div className="space-y-6">
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[#FF4D00] border-b border-[#FF4D00]/20 pb-2 flex items-center gap-2">
              <Megaphone className="w-3.5 h-3.5 text-[#FF4D00]" />
              <span>Active Broadcasts</span>
            </h2>

            <AnimatePresence mode="popLayout">
              {loading ? (
                // Skeletons while fetching data to prevent layout shift
                <motion.div
                  key="loading-skeletons"
                  variants={CONTAINER_STAGGER}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="border border-white/5 bg-black/40 rounded-2xl p-6 flex flex-col gap-4 animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-white/5" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-white/5 rounded w-1/4" />
                          <div className="h-2 bg-white/5 rounded w-1/6" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-white/5 rounded w-full" />
                        <div className="h-3 bg-white/5 rounded w-5/6" />
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <div className="h-6 bg-white/5 rounded w-12" />
                        <div className="h-6 bg-white/5 rounded w-16" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : announcements.length === 0 ? (
                // Empty state
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-black/35 border-2 border-white/10 rounded-2xl p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-6 shadow-md"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center text-[#FF4D00]">
                    <Compass className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">No announcements yet</h3>
                    <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                      Be the first to post! Let your neighbors know what is happening in the local community.
                    </p>
                  </div>
                </motion.div>
              ) : (
                // Announcements List
                <motion.div
                  key="announcements-feed"
                  variants={CONTAINER_STAGGER}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {announcements.map((ann) => {
                    const isOwner = user?.id === ann.user_id;
                    const posterName = ann.profiles?.full_name || 'Neighbor';
                    const avatarUrl = ann.profiles?.avatar_url;

                    return (
                      <motion.div
                        key={ann.id}
                        variants={FADE_UP}
                        layout
                        className={`rounded-2xl p-6 relative overflow-hidden transition-all duration-300 shadow-md group ${
                          isLight
                            ? 'bg-[#FFFCF9] border-2 border-black text-black shadow-[6px_6px_0px_#000000]'
                            : 'bg-black border border-white/10 text-white'
                        }`}
                      >
                        {/* Subtle inner card background glow */}
                        {!isLight && <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />}

                        <div className="flex flex-col gap-4 relative z-10">
                          {/* Card Top Header */}
                          <div className="flex items-center justify-between gap-3">
                            <div
                              onClick={() => router.push(`/profile/${ann.user_id}`)}
                              className="flex items-center gap-3 cursor-pointer group/avatar"
                              title={`View ${posterName}'s profile`}
                            >
                              {avatarUrl ? (
                                <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 shadow-inner transition-colors ${
                                  isLight
                                    ? 'border-black/20 group-hover/avatar:border-black'
                                    : 'border-[#FF4D00]/40 group-hover/avatar:border-[#FF4D00]'
                                }`}>
                                  <img
                                    src={avatarUrl}
                                    alt={posterName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                                  isLight
                                    ? 'bg-black/5 border border-black/20 text-black group-hover/avatar:border-black'
                                    : 'bg-[#FF4D00]/10 border border-[#FF4D00]/30 text-[#FF4D00] group-hover/avatar:border-[#FF4D00]'
                                }`}>
                                  {posterName.charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div>
                                <h4 className={`text-xs font-display font-black uppercase tracking-wider transition-colors ${
                                  isLight
                                    ? 'text-black group-hover/avatar:text-[#FF4D00]'
                                    : 'text-white group-hover/avatar:text-[#FF4D00]'
                                }`}>
                                  {posterName}
                                </h4>
                                <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest pt-0.5">
                                  <Clock className={`w-3 h-3 ${isLight ? 'text-black/30' : 'text-white/30'}`} />
                                  <span className={isLight ? 'text-black/45' : 'text-white/40'}>{formatRelativeTime(ann.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Main Content */}
                          <p className={`text-sm leading-relaxed font-normal select-text whitespace-pre-wrap break-words ${
                            isLight ? 'text-black/85' : 'text-white/80'
                          }`}>
                            {ann.content}
                          </p>

                          {/* Card Bottom Actions */}
                          <div className={`pt-4 flex items-center justify-between ${
                            isLight ? 'border-t border-black/10' : 'border-t border-white/[0.06]'
                          }`}>
                            {/* Like Toggle Button */}
                            <button
                              onClick={() => !isOwner && handleToggleLike(ann)}
                              disabled={isOwner}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-mono font-bold uppercase ${
                                isOwner
                                  ? isLight
                                    ? 'text-black/30 border-black/10 bg-black/[0.005] cursor-not-allowed'
                                    : 'text-white/20 border-white/5 bg-white/[0.005] cursor-not-allowed'
                                  : ann.has_liked
                                    ? 'text-pink-500 border-pink-500/35 bg-pink-500/5 shadow-sm cursor-pointer'
                                    : isLight
                                      ? 'text-black/50 border-black/20 bg-black/[0.01] hover:bg-black/[0.03] hover:text-black cursor-pointer'
                                      : 'text-white/40 border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:text-white/80 cursor-pointer'
                              }`}
                              title={isOwner ? "You cannot like your own announcement" : undefined}
                            >
                              <Heart className={`w-3.5 h-3.5 ${ann.has_liked ? 'fill-pink-500 text-pink-500' : ''} ${isOwner ? 'opacity-40' : ''}`} />
                              <span>{ann.like_count || 0} Likes</span>
                            </button>

                            {/* Owner Delete Button */}
                            {isOwner && (
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                  isLight
                                    ? 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600'
                                    : 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-400'
                                }`}
                                title="Delete Announcement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Custom Toast Notifications Overlay */}
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
