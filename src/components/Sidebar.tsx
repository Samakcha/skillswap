'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Layers, 
  LayoutDashboard, 
  MessageSquare, 
  Plus, 
  LogOut, 
  Menu, 
  X, 
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  FileText,
  UserPlus,
  Copy,
  Check,
  Loader2,
  Bell,
  BellOff,
  ShieldOff,
  Award,
  ShieldAlert,
  Lightbulb,
  Trophy,
  History
} from 'lucide-react'

interface SidebarProps {
  profile: any
  supabase: any
  user: any
}

export default function Sidebar({ profile, supabase, user }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('skillswap_sidebar_collapsed') === 'true'
  })
  const [unreadCount, setUnreadCount] = useState(0)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document === 'undefined') return 'dark'
    return document.documentElement.classList.contains('light') ? 'light' : 'dark'
  })
  const [isHovered, setIsHovered] = useState(false)

  // Invite states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  // Blocked users states
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [blockedListLoading, setBlockedListLoading] = useState(false)
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null)

  const handleThemeToggle = (e: React.MouseEvent) => {
    const x = e.clientX
    const y = e.clientY
    const doc = document.documentElement
    const isLight = doc.classList.contains('light')
    
    const updateThemeState = () => {
      if (isLight) {
        doc.classList.remove('light')
        localStorage.setItem('skillswap_theme', 'dark')
        setTheme('dark')
      } else {
        doc.classList.add('light')
        localStorage.setItem('skillswap_theme', 'light')
        setTheme('light')
      }
    }

    if (!document.startViewTransition) {
      updateThemeState()
      return
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = document.startViewTransition(() => {
      updateThemeState()
    })

    transition.ready.then(() => {
      doc.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 900,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      )
    })
  }

  // Relative time helper
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

  const handleNotificationClick = async (notif: any) => {
    if (!supabase) return
    try {
      // 1. Mark as read in Supabase
      await (supabase.from('notifications') as any)
        .update({ is_read: true })
        .eq('id', notif.id)

      // Update local state instantly and recalculate unread count
      setNotifications(prev => {
        const next = prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        const unread = next.filter(n => !n.is_read).length
        setUnreadNotificationsCount(unread)
        return next
      })

      // 2. Navigate based on type
      setIsNotificationsOpen(false)
      if (notif.type === 'message' && notif.related_user_id) {
        router.push(`/messages/${notif.related_user_id}?post=${notif.related_post_id || ''}`)
      } else if ((notif.type === 'like' || notif.type === 'unlike') && notif.related_user_id) {
        router.push(`/profile/${notif.related_user_id}`)
      } else if (notif.type === 'review') {
        router.push(`/profile/${user?.id || ''}`)
      } else if (notif.related_post_id) {
        router.push(`/dashboard`) // fallback
      }
    } catch (err) {
      console.error('Error handling notification click:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id || !supabase) return
    try {
      await (supabase.from('notifications') as any)
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      // Update local state instantly
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadNotificationsCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation() // Prevent triggering the card's click/navigation action
    if (!supabase) return
    try {
      await (supabase.from('notifications') as any)
        .delete()
        .eq('id', notifId)

      // Update local state instantly and recalculate unread count
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== notifId)
        const unread = next.filter(n => !n.is_read).length
        setUnreadNotificationsCount(unread)
        return next
      })
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const handleGenerateInvite = async () => {
    if (!user?.id || !supabase) return
    setGeneratingInvite(true)
    setInviteError(null)
    setCopiedLink(false)

    try {
      const generatedCode = Math.random().toString(36).substring(2, 10)
      const pinCode = profile?.pin_code || null

      const { error } = await (supabase
        .from('invites') as any)
        .insert({
          code: generatedCode,
          pin_code: pinCode,
          created_by: user.id,
          uses: 0,
          max_uses: 5
        })

      if (error) throw error

      setInviteCode(generatedCode)
    } catch (err: any) {
      console.error('Error creating invite:', err)
      setInviteError(err.message || 'Failed to create invite link.')
    } finally {
      setGeneratingInvite(false)
    }
  }

  const closeInviteModal = () => {
    setIsInviteModalOpen(false)
    setInviteCode(null)
    setInviteError(null)
    setCopiedLink(false)
  }

  const fetchBlockedUsers = async () => {
    if (!user?.id || !supabase) return
    setBlockedListLoading(true)
    try {
      const { data, error } = await (supabase
        .from('blocked_users') as any)
        .select('*, profiles!blocked_id(full_name, avatar_url)')
        .eq('blocker_id', user.id)

      if (error) throw error
      setBlockedUsers(data || [])
    } catch (err) {
      console.error('Error fetching blocked users:', err)
    } finally {
      setBlockedListLoading(false)
    }
  }

  const handleUnblock = async (blockedId: string) => {
    if (!user?.id || !supabase) return
    setUnblockingUserId(blockedId)
    try {
      const { error } = await (supabase
        .from('blocked_users') as any)
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId)

      if (error) throw error
      
      setBlockedUsers(prev => prev.filter(u => u.blocked_id !== blockedId))
    } catch (err: any) {
      console.error('Error unblocking user:', err)
      alert('Failed to unblock user: ' + err.message)
    } finally {
      setUnblockingUserId(null)
    }
  }

  // Fetch and subscribe to unread message count in real-time
  useEffect(() => {
    if (!user?.id || !supabase) return

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('sender_id, post_id, posts(is_closed)')
          .eq('receiver_id', user.id)
          .eq('is_read', false)

        if (!error && data) {
          // Filter out messages where the associated post is closed
          const activeMessages = data.filter((m: any) => !(m.posts && m.posts.is_closed))
          const uniqueSenders = new Set(activeMessages.map((m: any) => m.sender_id))
          setUnreadCount(uniqueSenders.size)
        }
      } catch (err) {
        console.error('Error fetching unread count:', err)
      }
    }

    fetchUnreadCount()

    const unreadCountChannelName = `unread-count-updates-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Subscribe to messages table changes for this receiver
    const channel = supabase
      .channel(unreadCountChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false))
  }, [pathname])

  // Onboarding Walkthrough Sidebar Toggle Custom Event Listeners
  useEffect(() => {
    const handleOpen = () => setMobileOpen(true)
    const handleClose = () => setMobileOpen(false)
    
    window.addEventListener('open-skillswap-sidebar', handleOpen)
    window.addEventListener('close-skillswap-sidebar', handleClose)
    
    return () => {
      window.removeEventListener('open-skillswap-sidebar', handleOpen)
      window.removeEventListener('close-skillswap-sidebar', handleClose)
    }
  }, [])

  // Fetch and subscribe to notifications in real-time
  useEffect(() => {
    if (!user?.id || !supabase) return

    const fetchNotifications = async () => {
      try {
        const { data, error } = await (supabase
          .from('notifications') as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!error && data) {
          setNotifications(data)
          const unread = data.filter((n: any) => !n.is_read).length
          setUnreadNotificationsCount(unread)
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      }
    }

    fetchNotifications()

    const notificationsChannelName = `unread-notifications-updates-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Subscribe to notifications table changes for this receiver
    const channel = supabase
      .channel(notificationsChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])



  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'All Posts',
      path: '/posts',
      icon: FileText
    },
    {
      name: 'Messages',
      path: '/messages',
      icon: MessageSquare
    },
    {
      name: 'Reviews',
      path: '/reviews',
      icon: Award
    },
    {
      name: 'Leaderboard',
      path: '/leaderboard',
      icon: Trophy
    },
    {
      name: 'History',
      path: '/history',
      icon: History
    },
    {
      name: 'Settings',
      path: '/profile/edit',
      icon: Settings
    }
  ]

  const isPathActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(path)
  }

  // Sidebar Inner Content
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full text-gray-200 select-none" style={{ backgroundColor: 'var(--app-sidebar-bg)' }}>
      {/* Sidebar Header */}
      <div className="p-5 flex flex-col gap-5 shrink-0">
        <div className="flex items-center justify-between px-1">
          <a 
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault()
              router.push('/dashboard')
            }}
            className="font-display font-black text-sm tracking-tighter uppercase text-white hover:text-[#FF4D00] transition-colors duration-300 select-none cursor-pointer"
          >
            SKILL<span className="text-[#FF4D00]">SWAP</span>
          </a>

          {/* Desktop Collapse & Notification Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D00] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF4D00]"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setIsCollapsed(true)
                localStorage.setItem('skillswap_sidebar_collapsed', 'true')
              }}
              className="hidden lg:flex p-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-all cursor-pointer"
              title="Close Sidebar"
            >
              <PanelLeftClose className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Brutalist Command Button for New Post */}
        <button
          id="onboarding-new-post"
          onClick={() => router.push('/posts/create')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-black hover:bg-[#FF4D00] text-white hover:text-black font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl border-2 border-white/10 hover:border-black shadow-[4px_4px_0px_rgba(255,77,0,0.15)] hover:shadow-none transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 shrink-0 stroke-[3px]" />
          <span>Create Proposal</span>
        </button>
      </div>

      {/* Navigation Links Stack */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
        {navItems.map((item) => {
          const active = isPathActive(item.path)
          const Icon = item.icon
          const isMessages = item.name === 'Messages'
          
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border sidebar-nav-btn ${
                active 
                  ? 'bg-[#FF4D00]/5 border-[#FF4D00] text-white shadow-[0_0_15px_rgba(255,77,0,0.08)]' 
                  : 'bg-transparent border-transparent text-white/50 hover:bg-white/[0.02] hover:border-white/5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#FF4D00]' : 'text-white/40'}`} />
                <span className="truncate">{item.name}</span>
              </div>
              {isMessages && unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-[#FF4D00] text-black text-[10px] font-bold shadow-md shrink-0">
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}

        {/* Invite a Neighbor Nav Button */}
        <button
          id="onboarding-invite-neighbor"
          onClick={() => setIsInviteModalOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border bg-transparent border-transparent text-white/50 hover:bg-white/[0.02] hover:border-white/5 group sidebar-nav-btn"
        >
          <div className="flex items-center gap-3 min-w-0">
            <UserPlus className="w-4 h-4 shrink-0 text-white/40 group-hover:text-[#FF4D00] transition-colors" />
            <span className="truncate">Invite Neighbor</span>
          </div>
        </button>

        {/* Blocked Users Nav Button */}
        <button
          onClick={() => {
            setIsBlockedUsersOpen(true)
            fetchBlockedUsers()
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border bg-transparent border-transparent text-white/50 hover:bg-white/[0.02] hover:border-white/5 group sidebar-nav-btn"
        >
          <div className="flex items-center gap-3 min-w-0">
            <ShieldOff className="w-4 h-4 shrink-0 text-white/40 group-hover:text-[#FF4D00] transition-colors" />
            <span className="truncate">Blocked Users</span>
          </div>
        </button>


      </div>

      {/* User Profile Card (Bottom Section) */}
      <div className="p-4 border-t border-white/[0.04] bg-[#000000] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#09090b] border border-white/5 hover:border-[#FF4D00]/40 transition-colors duration-300">
          <div 
            onClick={() => user?.id && router.push(`/profile/${user.id}`)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            title="View your public profile"
          >
            {/* Avatar Letter / Image */}
            {profile?.avatar_url ? (
              <div className="w-8 h-8 rounded overflow-hidden border border-[#FF4D00]/40 shrink-0 shadow-md">
                <img 
                  src={profile.avatar_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/40 text-[#FF4D00] flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
              </div>
            )}
            {/* User Meta */}
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-white truncate leading-none">
                {profile?.full_name || 'Neighbor'}
              </div>
              <div className="text-[9px] text-gray-500 font-mono font-bold uppercase tracking-wider flex items-center gap-0.5 pt-1.5 truncate">
                <MapPin className="w-2.5 h-2.5 text-gray-600 shrink-0" />
                <span className="truncate">{profile?.neighborhood || 'Local Area'}</span>
              </div>
            </div>
          </div>
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded bg-black hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-gray-500 hover:text-rose-400 transition-all cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* FLOATING THEME TOGGLE (Hidden when notifications or blocked users drawer is open) */}
      {!isNotificationsOpen && !isBlockedUsersOpen && (
        <motion.button
          type="button"
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onClick={handleThemeToggle}
          animate={{ rotate: isHovered ? [0, 1.5, -1.5, 1, 0] : 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className={`fixed right-4 bottom-5 lg:right-6 lg:top-6 lg:bottom-auto z-[70] flex items-center justify-center w-12 h-12 rounded-full border shadow-2xl backdrop-blur-xl active:scale-95 transition-all duration-200 cursor-pointer ${
            theme === 'light'
              ? 'bg-black text-[#FF4D00] border-[#FF4D00] shadow-[0_0_18px_rgba(255,77,0,0.35)]'
              : 'bg-black/90 text-white border-white/15 hover:border-[#FF4D00]/70 hover:text-[#FF4D00]'
          }`}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          <Lightbulb className={`w-5 h-5 shrink-0 transition-transform ${theme === 'light' ? 'stroke-[2.5px] scale-110' : 'stroke-[1.8px]'}`} />
        </motion.button>
      )}

      {/* 1. DESKTOP STICKY SIDEBAR */}
      <aside 
        className={`hidden lg:flex flex-col h-screen sticky top-0 shrink-0 z-30 select-none transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed 
            ? 'w-0 opacity-0 pointer-events-none border-r-0' 
            : 'w-64 xl:w-72 opacity-100 border-r border-white/[0.04]'
        }`}
      >
        {/* Force contents to occupy exact layout width to prevent shrinking elements during collapse */}
        <div className="h-full w-64 xl:w-72 shrink-0">
          {renderSidebarContent()}
        </div>
      </aside>

      {/* 2. DESKTOP FLOATING EXPAND TOGGLE (Visible only when collapsed on desktop) */}
      {isCollapsed && (
        <div className="hidden lg:flex fixed left-5 top-5 z-40">
          <button
            onClick={() => {
              setIsCollapsed(false)
              localStorage.setItem('skillswap_sidebar_collapsed', 'false')
            }}
            className="w-9 h-9 rounded-xl bg-[#121214] hover:bg-[#1a1a1c] border border-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center shadow-lg active:scale-95 transition-all duration-200 cursor-pointer group animate-fadeIn"
            title="Open Sidebar"
          >
            <PanelLeftOpen className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
            </span>
          )}
        </div>
      )}

      {/* 3. MOBILE TOP STICKY HEADER */}
      <header className="lg:hidden sticky top-0 w-full z-40 bg-black/95 border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-xl">
        <div 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <span className="font-display font-black text-sm tracking-tighter uppercase text-white">
            SKILL<span className="text-[#FF4D00]">SWAP</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Bell Icon on Mobile Header */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF4D00]"></span>
              </span>
            )}
          </button>

          {/* Avatar Circle on mobile header */}
          {profile?.avatar_url ? (
            <div 
              onClick={() => router.push('/dashboard')}
              className="w-7.5 h-7.5 rounded overflow-hidden border border-[#FF4D00]/40 shrink-0 shadow"
            >
              <img 
                src={profile.avatar_url} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div 
              onClick={() => router.push('/dashboard')}
              className="w-7.5 h-7.5 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/40 text-[#FF4D00] flex items-center justify-center font-bold text-xs shadow"
            >
              {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
            </div>
          )}

          {/* Toggle Menu */}
          <div className="relative">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded bg-[#09090b] border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Toggle Navigation Sidebar"
            >
              {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
            </button>
            {!mobileOpen && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4D00]"></span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 4. MOBILE SIDE DRAWER DRAWER OVERLAY */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />

            {/* Sidebar Drawer container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 xs:w-72 max-w-[85vw] z-50 shadow-2xl h-full"
            >
              <div className="h-full border-r border-white/[0.04]">
                {renderSidebarContent()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. INVITE A NEIGHBOR MODAL OVERLAY */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeInviteModal}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
            >
              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking card
                className="bg-[#121214] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 relative shadow-2xl flex flex-col gap-5 text-gray-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/10 text-[#FF9A3C] flex items-center justify-center">
                      <UserPlus className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Invite a Neighbor</h3>
                      <p className="text-[10px] text-gray-500 font-light">Bring your community together</p>
                    </div>
                  </div>
                  <button 
                    onClick={closeInviteModal}
                    className="p-1 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="space-y-4 py-2">
                  <p className="text-xs text-gray-400 leading-relaxed font-light">
                    Generate a unique invitation link that pre-fills your local neighborhood PIN code (<span className="text-white font-bold">{profile?.pin_code || 'N/A'}</span>) when your neighbor signs up.
                  </p>

                  {inviteError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                      {inviteError}
                    </div>
                  )}

                  {inviteCode ? (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Invitation Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/join?code=${inviteCode}`}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#161618] text-white text-xs font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/join?code=${inviteCode}`
                            navigator.clipboard.writeText(link)
                            setCopiedLink(true)
                            setTimeout(() => setCopiedLink(false), 2000)
                          }}
                          className={`px-4.5 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                            copiedLink 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-[#FF6B00] hover:bg-[#e66000] border-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/15 active:scale-95'
                          }`}
                        >
                          {copiedLink ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {copiedLink && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] text-emerald-400 font-semibold"
                          >
                            Copied successfully! Share this link with your neighbor.
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite || !profile?.pin_code}
                      className="w-full py-3 px-4 bg-white hover:bg-gray-100 disabled:bg-white/50 text-black font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                    >
                      {generatingInvite ? (
                        <>
                          <Loader2 className="w-4.5 h-4.5 animate-spin text-black shrink-0" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <span>Generate Invite Link</span>
                      )}
                    </button>
                  )}

                  {!profile?.pin_code && (
                    <p className="text-[10px] text-amber-400 font-medium">
                      ⚠️ Please set your PIN code in Profile Settings to invite neighbors.
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 6. NOTIFICATIONS DRAWER OVERLAY */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsNotificationsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />

            {/* Sidebar Drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
              className="fixed inset-y-0 right-0 w-80 xs:w-96 max-w-[90vw] z-50 shadow-2xl h-full bg-[#121214] border-l border-white/[0.04] flex flex-col text-gray-200"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4.5 h-4.5 text-[#FF9A3C]" />
                  <span className="font-bold text-white text-xs">Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FF6B00] text-white text-[9px] font-black">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="px-2.5 py-1.5 rounded bg-[#FF6B00]/10 hover:bg-[#FF6B00] text-[#FF9A3C] hover:text-black transition-all font-mono font-bold text-[9px] uppercase tracking-wider cursor-pointer border border-[#FF6B00]/25 hover:border-transparent"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3 select-none">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-center text-gray-600">
                      <BellOff className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-400">All clear!</h4>
                      <p className="text-[10px] text-gray-500 font-light max-w-[200px] leading-relaxed pt-1 mx-auto">
                        No new notifications. We&apos;ll notify you when you receive reviews or messages.
                      </p>
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 rounded-2xl border text-xs leading-relaxed transition-all duration-200 cursor-pointer flex items-start gap-2 relative overflow-hidden group ${
                        notif.is_read 
                          ? 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.08]' 
                          : 'bg-[#FF6B00]/[0.03] border-[#FF6B00]/15 hover:bg-[#FF6B00]/[0.06] hover:border-[#FF6B00]/25 shadow-sm shadow-[#FF6B00]/5'
                      }`}
                    >
                      {/* Unread indicator dot */}
                      {!notif.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] shrink-0 mt-1.5" />
                      )}
                      
                      <div className="flex-1 min-w-0 space-y-1 pr-6">
                        <p className={`text-[11px] leading-relaxed break-words ${notif.is_read ? 'text-gray-400 font-light' : 'text-white font-medium'}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-semibold">
                          <span>{formatRelativeTime(notif.created_at)}</span>
                        </div>
                      </div>

                      {/* Delete notification button */}
                      <button
                        onClick={(e) => handleDeleteNotification(e, notif.id)}
                        className="absolute top-2 right-2 p-1 rounded-md text-[#FF9A3C] hover:text-white hover:bg-[#FF6B00]/15 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 7. BLOCKED USERS DRAWER OVERLAY */}
      <AnimatePresence>
        {isBlockedUsersOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsBlockedUsersOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />

            {/* Sidebar Drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
              className="fixed inset-y-0 right-0 w-80 xs:w-96 max-w-[90vw] z-50 shadow-2xl h-full bg-[#121214] border-l border-white/[0.04] flex flex-col text-gray-200"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-4.5 h-4.5 text-rose-400" />
                  <span className="font-bold text-white text-xs">Blocked Users</span>
                  {blockedUsers.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black">
                      {blockedUsers.length}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setIsBlockedUsersOpen(false)}
                  className="p-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {blockedListLoading ? (
                  <div className="h-full flex flex-col justify-center items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#FF9A3C]" />
                    <span className="text-[10px] text-gray-500">Loading blocked list...</span>
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3 select-none">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-center text-gray-600">
                      <ShieldOff className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-400">All clear!</h4>
                      <p className="text-[10px] text-gray-500 font-light max-w-[200px] leading-relaxed pt-1 mx-auto">
                        You haven&apos;t blocked anyone.
                      </p>
                    </div>
                  </div>
                ) : (
                  blockedUsers.map((item) => {
                    const blockedProfile = item.profiles
                    const name = blockedProfile?.full_name || 'Neighbor'
                    const avatar = blockedProfile?.avatar_url
                    const initial = name.charAt(0).toUpperCase()

                    return (
                      <div
                        key={item.id}
                        className="glass-panel p-3 rounded-2xl border border-white/[0.06] flex items-center justify-between gap-3 bg-white/[0.01]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {avatar ? (
                            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#FF6B00]/25 shrink-0 shadow-md">
                              <img 
                                src={avatar} 
                                alt={name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B00]/10 to-[#FF9A3C]/10 border border-[#FF6B00]/20 text-[#FF9A3C] flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                              {initial}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-white truncate leading-none">
                              {name}
                            </div>
                            <div className="text-[9px] text-gray-500 font-medium pt-1">
                              Blocked
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnblock(item.blocked_id)}
                          disabled={unblockingUserId === item.blocked_id}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 transition-all text-[10px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {unblockingUserId === item.blocked_id ? 'Unblocking...' : 'Unblock'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
