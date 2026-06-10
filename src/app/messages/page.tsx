'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  ArrowLeft, 
  Layers, 
  ArrowUpRight, 
  Sparkles, 
  Plus, 
  LogOut,
  Compass,
  ArrowRight,
  User,
  Trash2,
  Square,
  CheckSquare
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

// Helper to format ISO timestamp as relative time
function formatRelativeTime(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) {
    return 'Just now'
  } else if (diffMin < 60) {
    return `${diffMin}m ago`
  } else if (diffHr < 24) {
    return `${diffHr}h ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
}

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [selectedConvoIds, setSelectedConvoIds] = useState<Set<string>>(new Set())
  const [isLight, setIsLight] = useState(false)

  // Real-time MutationObserver to sync system and manual theme toggles dynamically
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


  async function loadConversations(currentUserObj?: any) {
    // 1. Try to load cached profile from localStorage
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
      let activeUser = currentUserObj || user
      if (!activeUser) {
        const { data: { user: freshUser } } = await supabase.auth.getUser()
        if (!freshUser) {
          router.push('/auth/login')
          return
        }
        activeUser = freshUser
      }
      setUser(activeUser)

      // 2. Fetch fresh profile details from DB
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .single()

      if (freshProfile) {
        setProfile(freshProfile)
        if (typeof window !== 'undefined') {
          localStorage.setItem('skillswap_profile', JSON.stringify(freshProfile))
        }
      }

      const { data: messages } = await (supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(full_name), receiver:profiles!receiver_id(full_name), posts(is_closed, title)')
        .or(`sender_id.eq.${activeUser.id},receiver_id.eq.${activeUser.id}`)
        .order('created_at', { ascending: false }) as any)

      // Filter out system messages so they do not show up as actual chat message content in the dashboard listing
      const filteredMessages = (messages || []).filter((msg: any) => !msg.content?.startsWith('__SYSTEM_'))

      // Group messages by target contact AND post_id
      const seen = new Set()
      const convos: any[] = []

      for (const msg of filteredMessages) {
        const otherId = msg.sender_id === activeUser.id ? msg.receiver_id : msg.sender_id
        const otherName = msg.sender_id === activeUser.id ? msg.receiver?.full_name : msg.sender?.full_name
        const comboKey = `${otherId}_${msg.post_id || 'general'}`
        
        if (!seen.has(comboKey)) {
          seen.add(comboKey)

          // Calculate unread count for this contact and post from the messages list
          const unreadCount = filteredMessages.filter((m: any) => 
            m.sender_id === otherId && 
            m.receiver_id === activeUser.id && 
            m.is_read === false &&
            m.post_id === msg.post_id &&
            !(m.posts && m.posts.is_closed)
          ).length

          convos.push({ 
            id: comboKey,
            otherId, 
            otherName: otherName || 'Neighbor', 
            lastMessage: msg.content, 
            postId: msg.post_id,
            postTitle: msg.posts?.title || null,
            created_at: msg.created_at,
            unreadCount
          })
        }
      }

      setConversations(convos)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Toggle selection of a conversation channel
  const toggleSelectConvo = (id: string) => {
    setSelectedConvoIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Delete all selected conversations
  const handleDeleteSelected = async () => {
    if (selectedConvoIds.size === 0) return

    const confirmMessage = selectedConvoIds.size === 1
      ? "Are you sure you want to delete this conversation? This cannot be undone."
      : `Are you sure you want to delete these ${selectedConvoIds.size} conversations? This cannot be undone.`

    if (!window.confirm(confirmMessage)) return

    try {
      setLoading(true)

      // Ensure we have a valid logged in user object
      let currentUserObj = user
      if (!currentUserObj) {
        const { data: { user: freshUser } } = await supabase.auth.getUser()
        if (!freshUser) {
          alert('You must be logged in to delete conversations.')
          setLoading(false)
          return
        }
        setUser(freshUser)
        currentUserObj = freshUser
      }
      
      // Filter out convos to delete
      const toDelete = conversations.filter(c => selectedConvoIds.has(c.id))
      
      for (const convo of toDelete) {
        let query = supabase.from('messages').delete()
        if (convo.postId) {
          query = query.eq('post_id', convo.postId)
        } else {
          query = query.is('post_id', null)
        }
        
        await query.or(`and(sender_id.eq.${currentUserObj.id},receiver_id.eq.${convo.otherId}),and(sender_id.eq.${convo.otherId},receiver_id.eq.${currentUserObj.id})`)
      }

      // Update local state instantly so they disappear without refresh
      setConversations(prev => prev.filter(c => !selectedConvoIds.has(c.id)))
      setSelectedConvoIds(new Set())
    } catch (err) {
      console.error('Error deleting conversations:', err)
      alert('Failed to delete some conversations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Load conversations on mount and setup real-time subscription
  useEffect(() => {
    let currentUser: any = null
    let channel: ReturnType<typeof supabase.channel> | null = null
    
    const initLoad = async () => {
      const { data: { user: freshUser } } = await supabase.auth.getUser()
      if (!freshUser) {
        setLoading(false)
        router.push('/auth/login')
        return
      }

      currentUser = freshUser
      loadConversations(freshUser)

      // Supabase reuses channels by topic name. In React strict mode or during fast
      // refresh, cleanup can overlap with the next effect, so use a unique topic
      // for this subscription instance before adding postgres_changes callbacks.
      const channelName = `conversations-list-realtime-${freshUser.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`

      // Subscribe to messages table changes only after a real user is known.
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            const newMsg = payload.new as any
            const oldMsg = payload.old as any
            const activeUserId = currentUser?.id || user?.id

            if (!activeUserId) return

            const isRelevant = 
              (newMsg && (newMsg.sender_id === activeUserId || newMsg.receiver_id === activeUserId)) ||
              (oldMsg && (oldMsg.sender_id === activeUserId || oldMsg.receiver_id === activeUserId))

            if (isRelevant) {
              loadConversations(currentUser || user)
            }
          }
        )
        .subscribe()
    }
    
    initLoad()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, router])



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
              <MessageSquare className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Loading Channels</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Retrieving secure peer transmissions...</p>
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

        {/* MESSAGES INNER BODY */}
        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
        
        {/* HEADER PANEL */}
        <motion.div 
          variants={FADE_UP} 
          className="bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)]"
        >
          <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl leading-[0.9] text-white tracking-tight uppercase flex flex-col gap-2">
                <SplitText
                  text="Direct"
                  className="text-white inline-block"
                  delay={40}
                  duration={0.6}
                  ease="power3.out"
                  textAlign="left"
                  tag="span"
                />
                <SplitText
                  text="Messages"
                  className="text-[#FF4D00] inline-block"
                  delay={40}
                  duration={0.6}
                  ease="power3.out"
                  textAlign="left"
                  tag="span"
                />
              </h1>
              
              <AnimatePresence>
                {selectedConvoIds.size > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    onClick={handleDeleteSelected}
                    className="px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-black font-mono font-bold text-xs transition-all border-2 border-black shadow-[2px_2px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Selected ({selectedConvoIds.size})</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            
            <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-2">
              Coordinate meeting schedules, ask technical details, and organize your neighborhood skill exchanges.
            </p>
          </div>
        </motion.div>

        {/* CONVERSATIONS LIST STACK */}
        <motion.div 
          variants={CONTAINER_STAGGER}
          className="space-y-4"
        >
          <AnimatePresence mode="wait">
            {conversations.length === 0 ? (
              
              // EMPTY STATE CARD
              <motion.div
                key="empty-messages"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                variants={{}} // Prevent variant inheritance
                className="w-full bg-black border-2 border-white/10 p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-6 mt-6 rounded-[2rem] shadow-[6px_6px_0px_rgba(255,77,0,0.12)]"
              >
                <div className="w-14 h-14 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center text-[#FF4D00]">
                  <Compass className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">No messages yet</h3>
                  <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                    Once you start messaging members on their neighborhood post entries, your conversation channels will appear here.
                  </p>
                </div>
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 rounded-xl bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.99] border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore Swap Board</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
                </button>
              </motion.div>

            ) : (

              // CONVERSATIONS LIST
              <div key="convos-list" className="space-y-4.5">
                {conversations.map((convo) => {
                  const hasUnread = convo.unreadCount > 0
                  const isSelected = selectedConvoIds.has(convo.id)
                  
                  const cardBgClass = isLight
                    ? isSelected
                      ? 'border-[#FF4D00] bg-[#121216]'
                      : hasUnread 
                        ? 'border-[#FF4D00] bg-[#0E0E12] border-l-8 border-l-[#FF4D00]' 
                        : 'bg-[#0B0B0D] border-white/5 hover:border-[#FF4D00]'
                    : isSelected
                      ? 'border-[#FF4D00] bg-[#FFF5EE]'
                      : hasUnread
                        ? 'border-[#FF4D00] bg-white border-l-8 border-l-[#FF4D00] border-y-2 border-r-2 border-black'
                        : 'bg-[#FFFCF9] border-black hover:border-[#FF4D00]'

                  const cardShadowClass = isLight
                    ? 'shadow-[6px_6px_0px_#000000] hover:shadow-[6px_6px_0px_rgba(255,77,0,0.15)]'
                    : 'shadow-[6px_6px_0px_#FF4D00] hover:shadow-none'

                  const nameColorClass = isLight ? 'text-white' : 'text-black'
                  const msgColorClass = isLight 
                    ? hasUnread ? 'text-white' : 'text-gray-400'
                    : hasUnread ? 'text-black' : 'text-gray-700'
                  const timeColorClass = isLight ? 'text-white/30' : 'text-black/40'
                  
                  const badgeClass = isLight
                    ? 'bg-white/5 border border-white/10 text-white/50'
                    : 'bg-black/5 border border-black/10 text-black/55'
                    
                  const avatarClass = hasUnread
                    ? 'bg-[#FF4D00] border-black text-black font-black'
                    : isLight
                      ? 'bg-white/5 border-white/15 text-white'
                      : 'bg-black/5 border-black/15 text-black'
                      
                  const checkboxClass = isLight
                    ? 'bg-black/40 border border-white/10 hover:border-[#FF4D00]/50 text-gray-500 hover:text-white'
                    : 'bg-black/5 border border-black/10 hover:border-[#FF4D00]/50 text-black/30 hover:text-black'
                    
                  const arrowBtnClass = isLight
                    ? 'bg-white/5 border border-white/10 text-white/40 group-hover:text-black group-hover:bg-[#FF4D00] group-hover:border-black'
                    : 'bg-black/5 border border-black/10 text-black/40 group-hover:text-white group-hover:bg-[#FF4D00] group-hover:border-black'
                  
                  return (
                    <motion.div
                      key={convo.id}
                      variants={FADE_UP}
                      onClick={() => router.push(`/messages/${convo.otherId}?post=${convo.postId || ''}`)}
                      className={`rounded-2xl p-5 border-2 flex items-center justify-between cursor-pointer group transition-all duration-300 relative overflow-hidden hover:-translate-x-1 hover:-translate-y-1 ${cardBgClass} ${cardShadowClass}`}
                    >
                      {/* Left Convo Info */}
                      <div className="flex items-center gap-4 min-w-0 relative z-10">
                        {/* Selection Checkbox */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation() // Stop card navigation click
                            toggleSelectConvo(convo.id)
                          }}
                          className={`flex items-center justify-center p-1.5 rounded cursor-pointer transition-colors shrink-0 ${checkboxClass}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4.5 h-4.5 text-[#FF4D00] stroke-[2.5px]" />
                          ) : (
                            <Square className={`w-4.5 h-4.5 ${isLight ? 'text-white/20 hover:text-white/40' : 'text-black/20 hover:text-black/40'}`} />
                          )}
                        </div>
                        
                        {/* Avatar silhouette circle */}
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 border-2 transition-colors ${avatarClass}`}>
                          {convo.otherName.charAt(0).toUpperCase()}
                        </div>
 
                        {/* Name & Last Message */}
                        <div className="min-w-0 space-y-2">
                          <h3 className={`font-display font-black text-base group-hover:text-[#FF4D00] transition-colors leading-tight flex flex-wrap items-center gap-2 uppercase tracking-tight ${nameColorClass}`}>
                            <span>{convo.otherName}</span>
                            {convo.postTitle && (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${badgeClass}`}>
                                Swap: {convo.postTitle}
                              </span>
                            )}
                            {hasUnread && (
                              <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D00] animate-pulse" />
                            )}
                          </h3>
                          <p className={`text-xs font-semibold leading-relaxed truncate max-w-xs sm:max-w-md ${msgColorClass}`}>
                            {convo.lastMessage}
                          </p>
                        </div>
 
                      </div>
 
                      {/* Right Convo Meta & CTA */}
                      <div className="flex items-center gap-4 shrink-0 pl-3 relative z-10">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[9px] font-mono uppercase tracking-widest font-bold ${timeColorClass}`}>
                            {formatRelativeTime(convo.created_at)}
                          </span>
                        </div>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-[2px_2px_0px_#000000] group-hover:shadow-none border ${arrowBtnClass}`}>
                          <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform stroke-[2.5px]" />
                        </div>
                      </div>
 
                    </motion.div>
                  )
                })}
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
