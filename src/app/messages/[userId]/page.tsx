'use client'

import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Layers, 
  Send, 
  Award, 
  Sparkles, 
  LogOut,
  MapPin,
  MessageSquare,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

// Framer Motion Animation Presets
const FADE_UP = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
}

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const otherId = params.userId as string
  const postId = searchParams.get('post')

  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [otherProfile, setOtherProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [initialUnreadCount, setInitialUnreadCount] = useState(0)
  const [unreadMessageIds, setUnreadMessageIds] = useState<Set<string>>(new Set())
  const [isChatClosed, setIsChatClosed] = useState(false)
  const [closeRequestedBy, setCloseRequestedBy] = useState<string | null>(null)
  const [closeAccepted, setCloseAccepted] = useState<boolean>(false)
  const [isBlockedByEither, setIsBlockedByEither] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadMessages() {
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
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        setUser(user)

        // 2. Fetch fresh profile details from DB
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (freshProfile) {
          setProfile(freshProfile)
          if (typeof window !== 'undefined') {
            localStorage.setItem('skillswap_profile', JSON.stringify(freshProfile))
          }
        }

        // Query the other swapper's name and neighborhood details
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, pin_code, neighborhood')
          .eq('id', otherId)
          .single()

        setOtherProfile(profile)

        // Check if either user has blocked the other
        const { data: blocks } = await (supabase
          .from('blocked_users') as any)
          .select('*')
          .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${user.id})`)

        setIsBlockedByEither(!!(blocks && blocks.length > 0))

        // Check if the chat/post is closed
        if (postId) {
          const { data: postData } = await (supabase
            .from('posts') as any)
            .select('is_closed, close_accepted')
            .eq('id', postId)
            .single()
          
          if (postData) {
            setIsChatClosed(!!postData.is_closed)
            setCloseAccepted(!!postData.close_accepted)
          }
        }

        // 1. Fetch messages history first
        let query = supabase
          .from('messages')
          .select('*')
        
        if (postId) {
          query = query.eq('post_id', postId)
        } else {
          query = query.is('post_id', null)
        }

        const { data: msgs } = await query
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true })

        const list = (msgs || []) as any[]

        // Find if a close request was initiated in this specific user session
        const closeRequestMsg = list.find((m: any) => m.content === '__SYSTEM_CLOSE_REQUEST__')
        const closeAcceptedMsg = list.find((m: any) => m.content === '__SYSTEM_CLOSE_ACCEPTED__')

        if (closeRequestMsg && !closeAcceptedMsg) {
          setCloseRequestedBy(closeRequestMsg.sender_id)
        } else {
          setCloseRequestedBy(null)
        }

        // Filter out system messages so they do not render as chat bubbles or disrupt normal flow
        const filteredList = list.filter((m: any) => !m.content?.startsWith('__SYSTEM_'))

        // 2. Identify unread messages from otherId to user.id before marking read
        const unreadMsgs = filteredList.filter((m: any) => 
          m.sender_id === otherId && 
          m.receiver_id === user.id && 
          !m.is_read
        )
        
        setInitialUnreadCount(unreadMsgs.length)
        setUnreadMessageIds(new Set(unreadMsgs.map((m: any) => m.id)))
        setMessages(filteredList)

        // 3. Mark incoming messages from this user to me as read in the database
        if (unreadMsgs.length > 0) {
          let markQuery = (supabase.from('messages') as any)
            .update({ is_read: true })
            .eq('sender_id', otherId)
            .eq('receiver_id', user.id)
            .eq('is_read', false)

          if (postId) {
            markQuery = markQuery.eq('post_id', postId)
          } else {
            markQuery = markQuery.is('post_id', null)
          }
          await markQuery
        }
      } catch (error) {
        console.error('Error loading chat session:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [otherId, postId])

  // ─── Realtime subscription — only runs once user is resolved ───────────────
  useEffect(() => {
    // Guard: do not subscribe until the user has been authenticated
    if (!user?.id) return

    // Supabase reuses channels by topic name. Keep this subscription instance
    // unique so strict mode or fast refresh cleanup overlap cannot add
    // postgres_changes callbacks to an already subscribed channel.
    const channelName = `chat-${[otherId, user.id, postId || 'general'].sort().join('-')}-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Setup Postgres Realtime inserts and updates subscriptions
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as any
          const isRelevant =
            ((msg.receiver_id === otherId && msg.sender_id === user?.id) ||
             (msg.sender_id === otherId && msg.receiver_id === user?.id)) &&
            (msg.post_id === postId || (!msg.post_id && !postId))

          if (isRelevant) {
            // Handle system messages for close requests
            if (msg.content === '__SYSTEM_CLOSE_REQUEST__') {
              setCloseRequestedBy(msg.sender_id)
              return
            } else if (msg.content === '__SYSTEM_CLOSE_ACCEPTED__') {
              setCloseAccepted(true)
              setIsChatClosed(true)
              return
            }

            // If we receive a message from otherId, mark it as read in the DB immediately
            if (msg.sender_id === otherId && msg.receiver_id === user?.id && !msg.is_read) {
              (async () => {
                try {
                  await (supabase.from('messages') as any)
                    .update({ is_read: true })
                    .eq('id', msg.id)
                } catch (err) {
                  console.error('Failed to auto-mark message as read:', err)
                }
              })()
            }

            // Prevent double insertion
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedMsg = payload.new as any
          const isRelevant =
            ((updatedMsg.receiver_id === otherId && updatedMsg.sender_id === user?.id) ||
             (updatedMsg.sender_id === otherId && updatedMsg.receiver_id === user?.id)) &&
            (updatedMsg.post_id === postId || (!updatedMsg.post_id && !postId))

          if (isRelevant) {
            // Update the message inside our local history list in real-time
            setMessages(prev => 
              prev.map(m => m.id === updatedMsg.id ? updatedMsg : m)
            )
          }
        }
      })

    if (postId) {
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts',
        filter: `id=eq.${postId}`,
      }, (payload: any) => {
        if (payload.new) {
          if ('is_closed' in payload.new) {
            setIsChatClosed(!!payload.new.is_closed)
          }
          if ('close_accepted' in payload.new) {
            setCloseAccepted(!!payload.new.close_accepted)
          }
        }
      })
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, otherId, postId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!newMessage.trim() || !user) return

    const tempMsg = newMessage.trim()
    setNewMessage('')

    try {
      await (supabase.from('messages') as any).insert({
        sender_id: user.id,
        receiver_id: otherId,
        post_id: postId || null,
        content: tempMsg,
      })

      // Trigger automatic notification for the receiver
      const senderName = profile?.full_name || 'A neighbor'
      await (supabase.from('notifications') as any).insert({
        user_id: otherId,
        type: 'message',
        message: `You have a new message from ${senderName}`,
        is_read: false,
        related_post_id: postId || null,
        related_user_id: user.id
      })
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  async function handleCloseChat() {
    if (!postId) return
    const confirmed = window.confirm("Are you sure you want to request closing this chat? This will ask the other user to accept.")
    if (!confirmed) return

    try {
      const { error } = await (supabase
        .from('posts') as any)
        .update({ close_requested_by: user.id })
        .eq('id', postId)

      if (error) {
        console.error('Error requesting to close chat:', error)
        alert('Failed to request chat closure. Please try again.')
        return
      }

      // Lock this close request to this specific session by inserting a system message
      await (supabase.from('messages') as any).insert({
        sender_id: user.id,
        receiver_id: otherId,
        post_id: postId || null,
        content: '__SYSTEM_CLOSE_REQUEST__',
      })

      setCloseRequestedBy(user.id)
    } catch (err) {
      console.error('Error in handleCloseChat:', err)
    }
  }

  async function handleAcceptCloseChat() {
    if (!postId) return

    try {
      const { error } = await (supabase
        .from('posts') as any)
        .update({ 
          close_accepted: true,
          is_closed: true 
        })
        .eq('id', postId)

      if (error) {
        console.error('Error accepting close chat request:', error)
        alert('Failed to accept chat closure. Please try again.')
        return
      }

      // Mark this close request as accepted in this session by inserting a system message
      await (supabase.from('messages') as any).insert({
        sender_id: user.id,
        receiver_id: otherId,
        post_id: postId || null,
        content: '__SYSTEM_CLOSE_ACCEPTED__',
      })

      setCloseAccepted(true)
      setIsChatClosed(true)
    } catch (err) {
      console.error('Error in handleAcceptCloseChat:', err)
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
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
              <MessageSquare className="w-6 h-6 text-black stroke-[2.5px]" />
            </div>
            <div className="space-y-2 text-center select-none">
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Opening Channel</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Connecting secure peer conversation...</p>
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
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* BACKGROUND GLOWS */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

        {/* STICKY GLASS HEADER (CHAT HEADER ONLY) */}
        <header className="sticky top-0 z-40 w-full bg-black/90 border-b-2 border-white/10 py-4 backdrop-blur-2xl">
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
            
            {/* Back to Messages Button */}
            <span 
              onClick={() => router.push('/messages')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0B0B0D] border-2 border-white/5 text-white/40 group-hover:text-black group-hover:bg-[#FF4D00] group-hover:border-black transition-all shadow-[2px_2px_0px_#000000] group-hover:shadow-none flex items-center justify-center">
                <ArrowLeft className="w-4.5 h-4.5 stroke-[2.5px]" />
              </div>
              <span className="font-mono font-black text-xs uppercase text-white group-hover:text-[#FF4D00] transition-colors tracking-wider">
                Back to Messages
              </span>
            </span>

            {/* Action CTAs */}
            <div className="flex items-center gap-3">
              
              {postId && !isChatClosed && !closeRequestedBy && (
                <button 
                  onClick={handleCloseChat}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all border-2 border-black shadow-[2px_2px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                >
                  <XCircle className="w-4 h-4 stroke-[2px]" />
                  <span>Close Chat</span>
                </button>
              )}

              {/* Review Button */}
              {isChatClosed && (
                <button 
                  onClick={() => router.push(`/reviews/${otherId}?post=${postId || ''}`)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all border-2 border-black shadow-[2px_2px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                >
                  <Award className="w-4 h-4 stroke-[2px]" />
                  <span>Leave Review</span>
                </button>
              )}

            </div>
          </div>
        </header>

        {/* CHAT SESSION BODY */}
        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 pb-32 flex-1 flex flex-col min-h-[calc(100vh-140px)] z-10">
        
        {/* PEER METADATA HEADER */}
        <motion.div 
          variants={FADE_UP}
          className="bg-black border-2 border-white/10 rounded-[2rem] p-5 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-4 min-w-0 relative z-10">
            
            {/* Silhouette avatar circle */}
            <div className="w-12 h-12 rounded-lg bg-white/5 border-2 border-white/15 text-white flex items-center justify-center font-mono font-bold text-base shrink-0">
              {otherProfile?.full_name?.charAt(0).toUpperCase() || 'N'}
            </div>

            {/* Metadata detail */}
            <div className="min-w-0 flex flex-col gap-1">
              <h2 className="font-display font-black text-lg text-white leading-tight uppercase tracking-tight">
                <SplitText
                  text={otherProfile?.full_name || 'Swapping Partner'}
                  className="text-white inline-block"
                  delay={40}
                  duration={0.6}
                  ease="power3.out"
                  textAlign="left"
                  tag="span"
                />
              </h2>
              <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                <span>{otherProfile?.neighborhood || 'Local Area'} (ZIP: {otherProfile?.pin_code})</span>
              </p>
            </div>

          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none relative z-10 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#FF4D00] animate-pulse" />
            <span>Secure Chat Active</span>
          </div>
        </motion.div>

        {/* MESSAGES CHAT LOG WINDOW */}
        <motion.div 
          variants={FADE_UP}
          className="flex-1 bg-[#0B0B0D] border-2 border-white/5 rounded-[2rem] p-6 flex flex-col justify-between overflow-hidden shadow-[8px_8px_0px_#000000] min-h-[420px] mt-6"
        >
          
          {/* Scrollable messages bubble log */}
          <div className="flex-1 overflow-y-auto space-y-4 max-h-[460px] no-scrollbar">
            
            {messages.length === 0 ? (
              
              // NEW CHAT GREETING EMPTY MESSAGE
              <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-5 mt-12 select-none max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center text-[#FF4D00]">
                  <MessageSquare className="w-6 h-6 stroke-[2px]" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-display font-black text-sm text-white uppercase tracking-tight">Start of connection</h4>
                  <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                    Say hello to {otherProfile?.full_name || 'your neighbor'} and align on convenient swapping schedules!
                  </p>
                </div>
              </div>

            ) : (

              // MESSAGE BUBBLES MAP
              messages.map((msg) => {
                const isCurrentUser = msg.sender_id === user?.id
                const isUnread = unreadMessageIds.has(msg.id)

                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} w-full animate-fadeIn`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed break-words font-sans relative flex flex-col gap-2 ${
                        isCurrentUser 
                          ? 'bg-[#FF4D00] text-black border-2 border-black shadow-[3px_3px_0px_#FFFFFF] rounded-tr-none font-bold' 
                          : isUnread
                            ? 'bg-black text-white border-2 border-[#FF4D00] shadow-[3px_3px_0px_#FF4D00] rounded-tl-none font-semibold'
                            : 'bg-black text-gray-200 border-2 border-white/10 rounded-tl-none font-semibold'
                      }`}
                    >
                      <span>{msg.content}</span>
                      
                      {/* WhatsApp-style time & checkmarks indicator footer */}
                      <div className="flex items-center justify-end gap-1.5 self-end mt-1 text-[9px] select-none opacity-80 font-mono font-bold uppercase tracking-wider">
                        <span className={isCurrentUser ? 'text-black/60' : 'text-white/30'}>
                          {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        {isCurrentUser && (
                          <span className="flex items-center leading-none">
                            {msg.is_read ? (
                              <span className="text-black font-black text-[10px] tracking-[-2px] leading-none select-none" title="Seen">✓✓</span>
                            ) : (
                              <span className="text-black/40 font-black text-[10px] tracking-[-2px] leading-none select-none" title="Sent">✓✓</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })

            )}
            
            <div ref={bottomRef} />
          </div>

          {closeRequestedBy && user && closeRequestedBy !== user.id && !isChatClosed && (
            <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn shadow-[4px_4px_0px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0 animate-pulse" />
                <span>Neighbor requests closing chat</span>
              </div>
              <button 
                type="button"
                onClick={handleAcceptCloseChat}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
              >
                <span>Accept closure</span>
              </button>
            </div>
          )}

          {closeRequestedBy && user && closeRequestedBy === user.id && !isChatClosed && (
            <div className="mt-6 p-4 rounded-xl bg-white/5 border-2 border-white/10 text-white/40 text-xs font-mono font-bold uppercase tracking-wider flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-white/30 shrink-0 animate-spin" />
                <span>Awaiting closure response...</span>
              </div>
            </div>
          )}

          {isChatClosed && (
            <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn shadow-[4px_4px_0px_rgba(244,63,94,0.1)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 animate-pulse" />
                <span>This swap channel is closed</span>
              </div>
              <button 
                type="button"
                onClick={() => router.push(`/reviews/${otherId}?post=${postId || ''}`)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-[10px] uppercase tracking-wider transition-all border-2 border-black shadow-[2px_2px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>Leave Review</span>
              </button>
            </div>
          )}

          {isBlockedByEither && (
            <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 animate-fadeIn animate-pulse shadow-[4px_4px_0px_rgba(244,63,94,0.1)]">
              <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
              <span>Channel Blocked</span>
            </div>
          )}

          {/* DYNAMIC MESSAGE INPUT FOOTER BAR */}
          <form onSubmit={handleSend} className="mt-6 pt-5 border-t border-white/[0.04] flex items-center gap-3">
            <input
              type="text"
              placeholder={isBlockedByEither ? "Channel is blocked" : isChatClosed ? "Channel is closed" : "Type transmission content..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isChatClosed || isBlockedByEither}
              className="flex-1 px-4 py-3.5 rounded-xl border-2 border-white/10 bg-[#121214] text-white placeholder-white/20 focus:border-[#FF4D00] focus:outline-none transition-all text-xs font-mono font-bold tracking-wider focus:ring-1 focus:ring-[#FF4D00] focus:shadow-[4px_4px_0px_#FF4D00] disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button 
              type="submit"
              disabled={isChatClosed || isBlockedByEither || !newMessage.trim()}
              className="w-12 h-12 rounded-xl bg-white hover:bg-gray-200 disabled:bg-white/5 border-2 border-black shadow-[2px_2px_0px_#FF4D00] disabled:shadow-none disabled:border-white/10 text-black disabled:text-white/20 transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4 shrink-0 stroke-[2.5px]" />
            </button>
          </form>

        </motion.div>

      </main>
      </div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
