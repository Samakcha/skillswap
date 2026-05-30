'use client'

import { useState, useEffect, useRef } from 'react'
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
  Compass, 
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
  Settings,
  UserPlus,
  ShieldOff,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Copy,
  Bell,
  Send,
  Star,
  Lightbulb
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

interface DemoPost {
  id: string
  type: 'offer' | 'request'
  title: string
  skill: string
  description: string
  created_at: string
  user_id: string
  profiles: {
    full_name: string
    neighborhood: string
    pin_code: string
  }
}

// 1. MOCK DATA DEFINITIONS
const MOCK_PROFILE = {
  full_name: "Marcus Aurelius",
  neighborhood: "Greenwich Village",
  pin_code: "10012",
  bio: "Passionate urban gardener, fermentation hobbyist, and amateur acoustic guitar player. Let's build community resilience together!",
  availability: "Weekends & Evenings",
  skills_offered: ["Organic Gardening", "Sourdough Baking", "Acoustic Guitar"],
  skills_needed: ["React & Next.js", "Synthesizer Design", "Woodworking"]
}

const INITIAL_MOCK_POSTS: DemoPost[] = [
  {
    id: "demo-post-1",
    type: "offer",
    title: "Sourdough Starter & Techniques",
    skill: "Sourdough Baking",
    description: "Learn the art of wild yeast fermentation. I'll provide you with a mature 5-year-old starter and walk you through bulk fermentation, shaping, scoring, and baking in a Dutch oven.",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(), // 4h ago
    user_id: "demo-user-2",
    profiles: {
      full_name: "Chef Adrian",
      neighborhood: "West Village",
      pin_code: "10012"
    }
  },
  {
    id: "demo-post-2",
    type: "request",
    title: "Need help with Organic Raised Beds",
    skill: "Organic Gardening",
    description: "Looking for a neighbor to help me plan and build two raised vegetable beds in my small backyard. I need advice on soil mix, companion planting, and setting up simple drip irrigation.",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(), // Yesterday
    user_id: "demo-user-3",
    profiles: {
      full_name: "Elena Rostova",
      neighborhood: "East Village",
      pin_code: "10012"
    }
  },
  {
    id: "demo-post-3",
    type: "offer",
    title: "Woodworking Basics: Hand Tools",
    skill: "Woodworking",
    description: "I can teach you how to properly use, sharpen, and maintain hand planes, chisels, and Japanese pull saws. Let's make a beautiful jointed box together in my garage workshop.",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2d ago
    user_id: "demo-user-4",
    profiles: {
      full_name: "David Miller",
      neighborhood: "Greenwich Village",
      pin_code: "10012"
    }
  }
]

export default function DemoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<DemoPost[]>(INITIAL_MOCK_POSTS)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'posts' | 'messages' | 'reviews' | 'settings'>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Dashboard feeds filter tab & search queries
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'offer' | 'request' | 'my_posts'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // simulated modal triggers
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showNewProposalModal, setShowNewProposalModal] = useState(false)
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Custom Toast State
  const [toasts, setToasts] = useState<Toast[]>([])
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document === 'undefined') return 'dark'
    return document.documentElement.classList.contains('light') ? 'light' : 'dark'
  })
  const [isHovered, setIsHovered] = useState(false)

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
          duration: 550,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      )
    })
  }

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }

  // Pre-load layout settle simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
      triggerToast("Welcome to Demo Sandbox mode! Live search & filtering active.", "success")
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  // Keyboard shortcut listener to focus search on '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Filter posts on the client side dynamically
  const filteredPosts = posts.filter(post => {
    const isOwn = post.user_id === "demo-user-1"
    
    // 1. Tab check
    if (activeFeedTab === 'offer' && post.type !== 'offer') return false
    if (activeFeedTab === 'request' && post.type !== 'request') return false
    if (activeFeedTab === 'my_posts' && !isOwn) return false

    // 2. Search check
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const titleMatch = post.title.toLowerCase().includes(q)
      const descMatch = post.description.toLowerCase().includes(q)
      const skillMatch = post.skill.toLowerCase().includes(q)
      const authorMatch = post.profiles.full_name.toLowerCase().includes(q)
      return titleMatch || descMatch || skillMatch || authorMatch
    }

    return true
  })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Handler simulations
  const handleSimulateChat = (authorName: string) => {
    triggerToast(`Demo Mode: Private chat initiated with ${authorName}.`, "success")
  }

  const handleSimulateComplete = (title: string) => {
    triggerToast(`Demo Mode: Marked proposal "${title}" as completed!`, "success")
  }

  const handleSimulateDelete = (postId: string, title: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
    triggerToast(`Demo Mode: Deleted post "${title}". Feed updated.`, "info")
  }

  const handleSimulateReport = (title: string) => {
    triggerToast(`Demo Mode: Flagged "${title}" for administrator review.`, "info")
  }

  const handleSimulateNewProposal = (e: React.FormEvent) => {
    e.preventDefault()
    setShowNewProposalModal(false)
    
    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    const title = formData.get('title') as string
    const skill = formData.get('skill') as string
    const type = formData.get('type') as 'offer' | 'request'
    const description = formData.get('description') as string

    if (!title || !skill || !description) {
      triggerToast("Failed to create: Please fill in all fields.", "error")
      return
    }

    const newPost: DemoPost = {
      id: `demo-post-${Date.now()}`,
      type,
      title,
      skill,
      description,
      created_at: new Date().toISOString(),
      user_id: "demo-user-1",
      profiles: {
        full_name: MOCK_PROFILE.full_name,
        neighborhood: MOCK_PROFILE.neighborhood,
        pin_code: MOCK_PROFILE.pin_code
      }
    }

    setPosts(prev => [newPost, ...prev])
    triggerToast(`Demo Mode: Created new proposal "${title}" successfully!`, "success")
  }

  const handleSimulateSignOut = () => {
    triggerToast("Demo Mode: Logging out from the simulated environment.", "info")
  }

  // Active navigation items
  const sidebarNavItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Layers },
    { id: 'posts', name: 'All Posts', icon: Compass },
    { id: 'messages', name: 'Messages', icon: MessageSquare, badge: 2 },
    { id: 'reviews', name: 'Reviews', icon: Award },
    { id: 'settings', name: 'Settings', icon: Settings }
  ] as const

  // 2. MAIN MARKUP STRUCTURE
  return (
    <div className="min-h-screen bg-theme-bg text-gray-100 font-sans selection:bg-[#FF4D00]/30 selection:text-white relative overflow-x-hidden w-full flex flex-col lg:flex-row">
      
      {/* Dynamic SEO Title & Meta tags simulated */}
      <title>DEMO SANDBOX | SKILLSWAP</title>
      <meta name="description" content="Simulated interactive dashboard sandbox for SkillSwap. No account or backend connection required." />

      {/* Blueprint Grid Overlay */}
      <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
      <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

      {/* FLOATING ACTION TOASTS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-black/90 border border-white/10 rounded-2xl p-4.5 flex items-start gap-3 shadow-2xl backdrop-blur-md pointer-events-auto shadow-[#FF4D00]/5"
            >
              {toast.type === 'success' && (
                <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-6 h-6 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5px]" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-6 h-6 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[#FF4D00] flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex-1">
                <span className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-widest block">System Alert</span>
                <p className="text-xs font-mono font-semibold text-white/95 leading-relaxed pt-1">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-white/30 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ONBOARDING LOADING SCREEN */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] bg-theme-bg flex flex-col justify-center items-center font-sans overflow-hidden w-full h-full"
          >
            <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
            
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
                <Layers className="w-6 h-6 text-black stroke-[2.5px]" />
              </div>
              <div className="space-y-2 text-center select-none">
                <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">DEMO SANDBOX</h3>
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 font-bold">Mounting virtual environments...</p>
              </div>
              
              {/* Kinetic Bouncing Paddle Loader */}
              <div className="flex items-center justify-center gap-12 h-16 relative w-48 border-2 border-black rounded-xl bg-black px-4 mt-4 shadow-[4px_4px_0px_#FF4D00]">
                <motion.div 
                  animate={{ y: [-12, 12, -12] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-7 bg-[#FF4D00] rounded-full shrink-0"
                />
                <motion.div 
                  animate={{ x: [-48, 48, -48], y: [-6, 6, -6] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 bg-white rounded-full shadow-[0_0_8px_#FF4D00] shrink-0"
                />
                <motion.div 
                  animate={{ y: [12, -12, 12] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-7 bg-[#FF4D00] rounded-full shrink-0"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. SIDEBAR CONTENT */}
      {/* A. Desktop sticky sidebar */}
      <aside 
        className={`hidden lg:flex flex-col h-screen sticky top-0 shrink-0 z-30 select-none transition-all duration-300 ease-in-out overflow-hidden border-r border-white/[0.04] ${
          sidebarCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-64 xl:w-72 opacity-100'
        }`}
      >
        <div className="h-full w-64 xl:w-72 shrink-0 flex flex-col" style={{ backgroundColor: 'var(--app-sidebar-bg)' }}>
          
          {/* Header */}
          <div className="p-5 flex flex-col gap-5 shrink-0">
            <div className="flex items-center justify-between px-1">
              <a 
                href="/demo"
                className="font-display font-black text-sm tracking-tighter uppercase text-white hover:text-[#FF4D00] transition-colors duration-300 select-none cursor-pointer"
              >
                SKILL<span className="text-[#FF4D00]">SWAP</span>
                <span className="ml-2 font-mono text-[7px] text-white/30 border border-white/20 px-1 rounded-sm align-middle tracking-normal">DEMO</span>
              </a>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => triggerToast("Demo Mode: 0 unread system notifications.", "info")}
                  className="relative p-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-all cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF4D00]"></span>
                  </span>
                </button>

                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-all cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Proposal Creator Trigger */}
            <button
              onClick={() => {}}
              className="w-full flex items-center justify-center gap-2 py-3 bg-black hover:bg-[#FF4D00] text-white hover:text-black font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl border-2 border-white/10 hover:border-black shadow-[4px_4px_0px_rgba(255,77,0,0.15)] hover:shadow-none transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0 stroke-[3px]" />
              <span>Create Proposal</span>
            </button>
          </div>

          {/* Navigation stack */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
            {sidebarNavItems.map((item) => {
              const isDashboard = item.id === 'dashboard'
              return (
                <button
                  key={item.id}
                  onClick={() => {}}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border sidebar-nav-btn transition-all duration-300 ${
                    isDashboard 
                      ? 'bg-[#FF4D00]/5 border-[#FF4D00] text-white shadow-[0_0_15px_rgba(255,77,0,0.08)]' 
                      : 'bg-transparent border-transparent text-white/50 hover:bg-white/[0.02] hover:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isDashboard ? 'text-[#FF4D00]' : 'text-white/40'}`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.id === 'messages' && (
                    <span className="px-2 py-0.5 rounded bg-[#FF4D00] text-black text-[10px] font-black shadow-md shrink-0">
                      2
                    </span>
                  )}
                </button>
              )
            })}

            <button
              onClick={() => {}}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border bg-transparent border-transparent text-white/50 hover:bg-white/[0.02] hover:border-white/5 group sidebar-nav-btn"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserPlus className="w-4 h-4 shrink-0 text-white/40 group-hover:text-[#FF4D00] transition-colors" />
                <span className="truncate">Invite Neighbor</span>
              </div>
            </button>

            <button
              onClick={() => {}}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border bg-transparent border-transparent text-white/50 hover:bg-white/[0.02] hover:border-white/5 group sidebar-nav-btn"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ShieldOff className="w-4 h-4 shrink-0 text-white/40 group-hover:text-[#FF4D00] transition-colors" />
                <span className="truncate">Blocked Users</span>
              </div>
            </button>

            {/* Visual Divider */}
            <div className="border-t border-white/[0.04] my-2 pt-2" />

            {/* Back to Landing Page Button */}
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border border-[#FF4D00]/25 bg-[#FF4D00]/5 text-[#FF4D00] hover:bg-[#FF4D00]/10 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ArrowRight className="w-4 h-4 shrink-0 rotate-180" />
                <span className="truncate">Exit to Landing</span>
              </div>
            </button>

            {/* Create Account Button */}
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border border-black bg-[#FF4D00] text-black hover:bg-white transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserPlus className="w-4 h-4 shrink-0 text-black" />
                <span className="truncate">Sign Up Now</span>
              </div>
            </button>
          </div>

          {/* Tactile Filament Bulb Toggle */}
          <div className="p-4 border-t border-white/[0.04] bg-[#000000] flex flex-col gap-3">
            <div className="flex items-center justify-between px-2.5 py-2 bg-[#09090b]/50 rounded-xl border border-white/5">
              <span className="font-mono text-[9px] font-bold text-white/40 uppercase tracking-widest select-none">
                {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
              </span>
              <div className="flex flex-col items-center relative pr-2">
                <div className="w-[1.5px] h-2.5 bg-white/20" />
                <motion.div
                  animate={{ rotate: isHovered ? [0, 8, -6, 4, -2, 0] : 0 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  onHoverStart={() => setIsHovered(true)}
                  onHoverEnd={() => setIsHovered(false)}
                  onClick={handleThemeToggle}
                  className={`w-7.5 h-7.5 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                    theme === 'light'
                      ? 'bg-[#FF4D00]/10 border-[#FF4D00] text-[#FF4D00] shadow-[0_0_12px_rgba(255,77,0,0.35)] animate-pulse'
                      : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:border-white/30'
                  }`}
                  title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                  <Lightbulb className={`w-3.5 h-3.5 transition-transform ${theme === 'light' ? 'stroke-[2.5px] scale-110' : 'stroke-[1.5px]'}`} />
                </motion.div>
              </div>
            </div>
          </div>

          {/* User Meta profile footer */}
          <div className="p-4 pt-0 border-t-0 bg-[#000000]">
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#09090b] border border-white/5 hover:border-[#FF4D00]/40 transition-colors duration-300">
              <div 
                onClick={() => {}}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div className="w-8 h-8 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/40 text-[#FF4D00] flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                  M
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white truncate leading-none">
                    {MOCK_PROFILE.full_name}
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono font-bold uppercase tracking-wider flex items-center gap-0.5 pt-1.5 truncate">
                    <MapPin className="w-2.5 h-2.5 text-gray-600 shrink-0" />
                    <span className="truncate">{MOCK_PROFILE.neighborhood}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {}}
                className="p-2 rounded bg-black hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-gray-500 hover:text-rose-400 transition-all cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* B. Floating Collapsible open button on desktop */}
      {sidebarCollapsed && (
        <div className="hidden lg:flex fixed left-5 top-5 z-40">
          <button
            onClick={() => {
              setSidebarCollapsed(false)
              triggerToast("Sidebar expanded.", "info")
            }}
            className="w-9 h-9 rounded-xl bg-[#121214] hover:bg-[#1a1a1c] border border-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center shadow-lg active:scale-95 transition-all duration-200 cursor-pointer group"
          >
            <PanelLeftOpen className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
          </button>
        </div>
      )}

      {/* C. Mobile Header and sticky drawer navigation */}
      <header className="lg:hidden sticky top-0 w-full z-40 bg-black/95 border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-xl">
        <div 
          onClick={() => setActiveSidebarTab('dashboard')}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <span className="font-display font-black text-sm tracking-tighter uppercase text-white">
            SKILL<span className="text-[#FF4D00]">SWAP</span>
          </span>
          <span className="font-mono text-[7px] text-white/30 border border-white/20 px-1 rounded-sm align-middle tracking-normal">DEMO</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerToast("Demo Mode: 0 unread system notifications.", "info")}
            className="relative p-1.5 rounded-lg bg-transparent hover:bg-white/[0.04] text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <Bell className="w-4.5 h-4.5" />
          </button>

          <div 
            onClick={() => setActiveSidebarTab('reviews')}
            className="w-7.5 h-7.5 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/40 text-[#FF4D00] flex items-center justify-center font-bold text-xs shadow cursor-pointer"
          >
            M
          </div>

          {/* Bulb Toggle on Mobile Header */}
          <button
            onClick={handleThemeToggle}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-[#FF4D00]/10 border-[#FF4D00] text-[#FF4D00] shadow-[0_0_8px_rgba(255,77,0,0.3)] animate-pulse'
                : 'bg-[#09090b] border-white/10 text-gray-400 hover:text-white'
            }`}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            <Lightbulb className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 rounded bg-[#09090b] border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {mobileSidebarOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 max-w-[85vw] z-50 shadow-2xl h-full flex flex-col" style={{ backgroundColor: 'var(--app-sidebar-bg)' }}
            >
              <div className="p-5 flex flex-col gap-5 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-display font-black text-sm tracking-tighter uppercase text-white">SKILLSWAP</span>
                  <button onClick={() => setMobileSidebarOpen(false)} className="text-white/50"><X className="w-4.5 h-4.5" /></button>
                </div>

                {/* Proposal Creator Trigger */}
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF4D00] text-black font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl border-2 border-black active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0 stroke-[3px]" />
                  <span>Create Proposal</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                {sidebarNavItems.map((item) => {
                  const isDashboard = item.id === 'dashboard'
                  return (
                    <button
                      key={item.id}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase border cursor-pointer ${
                        isDashboard 
                          ? 'bg-[#FF4D00]/5 border-[#FF4D00] text-white' 
                          : 'bg-transparent border-transparent text-white/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${isDashboard ? 'text-[#FF4D00]' : 'text-white/40'}`} />
                        <span>{item.name}</span>
                      </div>
                    </button>
                  )
                })}

                {/* Visual Divider */}
                <div className="border-t border-white/[0.04] my-2 pt-2" />

                {/* Back to Landing Page Button */}
                <button
                  onClick={() => {
                    setMobileSidebarOpen(false)
                    router.push('/')
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border border-[#FF4D00]/25 bg-[#FF4D00]/5 text-[#FF4D00]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ArrowRight className="w-4 h-4 shrink-0 rotate-180" />
                    <span className="truncate">Exit to Landing</span>
                  </div>
                </button>

                {/* Create Account Button */}
                <button
                  onClick={() => {
                    setMobileSidebarOpen(false)
                    router.push('/auth/signup')
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer border border-black bg-[#FF4D00] text-black"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserPlus className="w-4 h-4 shrink-0 text-black" />
                    <span className="truncate">Sign Up Now</span>
                  </div>
                </button>
              </div>

              {/* Bulb Toggle in Mobile Drawer */}
              <div className="p-4 border-t border-white/[0.04] bg-[#000000]">
                <div className="flex items-center justify-between px-2.5 py-2 bg-[#09090b]/50 rounded-xl border border-white/5">
                  <span className="font-mono text-[9px] font-bold text-white/40 uppercase tracking-widest select-none">
                    {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </span>
                  <button
                    onClick={handleThemeToggle}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                      theme === 'light'
                        ? 'bg-[#FF4D00]/10 border-[#FF4D00] text-[#FF4D00] shadow-[0_0_12px_rgba(255,77,0,0.35)] animate-pulse'
                        : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:border-white/30'
                    }`}
                  >
                    <Lightbulb className={`w-3.5 h-3.5 transition-transform ${theme === 'light' ? 'stroke-[2.5px] scale-110' : 'stroke-[1.5px]'}`} />
                  </button>
                </div>
              </div>

              <div className="p-4 pt-0 bg-black">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#FF4D00] text-black font-bold text-xs flex items-center justify-center">M</div>
                    <div className="text-[10px] font-bold text-white">Marcus Aurelius</div>
                  </div>
                  <button onClick={() => {}} className="p-1.5 text-gray-500 hover:text-white transition-colors"><LogOut className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. MAIN WORKSPACE / INNER CONTENTS PANEL */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative">
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 relative z-10 flex flex-col gap-8">
          
          {/* TAB ROUTING SWAPPERS PANEL */}
          {activeSidebarTab === 'dashboard' && (
            <div className="flex flex-col gap-8">
              
              {/* HEADER GREETING PANEL */}
              <motion.div 
                variants={FADE_UP}
                initial="hidden"
                animate="visible"
                className="bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-[8px_8px_0px_rgba(255,77,0,0.12)]"
              >
                <div className="absolute inset-0 bg-radial-gradient from-[#FF4D00]/5 to-transparent pointer-events-none" />
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                  <div className="lg:col-span-6 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none">
                      <Sparkles className="w-3 h-3 text-[#FF4D00] animate-pulse" />
                      <span>DEMO SANDBOX HUB</span>
                    </div>
                    <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl leading-[0.9] text-white tracking-tight uppercase flex flex-col gap-2">
                      <span className="text-white">Welcome back,</span>
                      <span className="text-[#FF4D00]">{MOCK_PROFILE.full_name}</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400 font-semibold leading-relaxed max-w-md">
                      {MOCK_PROFILE.bio}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-white/50 tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-[#FF4D00] shrink-0" />
                      <span>
                        <span className="font-bold text-[#FF4D00]">Available:</span> {MOCK_PROFILE.availability}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-white/30 uppercase tracking-wide leading-relaxed pt-2">
                      Hyperlocal mutualism sandbox active | Trading skills directly without cash transactions.
                    </p>
                  </div>

                  {/* Location & Stats columns */}
                  <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <div className="bg-black border-2 border-white/10 hover:border-[#FF4D00]/60 transition-colors duration-300 rounded-2xl p-5 flex flex-col justify-between min-h-[115px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-white/40 tracking-widest uppercase">Your Location</span>
                        <div className="w-7 h-7 rounded bg-[#FF4D00]/10 flex items-center justify-center text-[#FF4D00] border border-[#FF4D00]/20">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="font-display font-bold text-lg text-white truncate uppercase tracking-tight">
                          {MOCK_PROFILE.neighborhood}
                        </div>
                        <div className="text-[10px] font-mono text-white/50 tracking-wider uppercase pt-1">
                          Pin Code: {MOCK_PROFILE.pin_code}
                        </div>
                      </div>
                    </div>

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

                    {/* Offered / Needed list info card */}
                    <div className="sm:col-span-2 bg-black border-2 border-white/10 rounded-2xl p-5 space-y-3.5">
                      <div className="flex flex-col gap-3 text-[10px] font-mono uppercase tracking-wider">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-bold text-emerald-400">Teaching:</span>
                          <span className="text-white font-bold tracking-widest truncate max-w-xs sm:max-w-md">
                            {MOCK_PROFILE.skills_offered.join(', ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#FF4D00] shrink-0" />
                          <span className="font-bold text-[#FF4D00]">Learning:</span>
                          <span className="text-white font-bold tracking-widest truncate max-w-xs sm:max-w-md">
                            {MOCK_PROFILE.skills_needed.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* FEED SEARCH & FILTERS BAR */}
              <motion.div 
                variants={FADE_UP}
                initial="hidden"
                animate="visible"
                className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 border-b border-white/10 pb-5"
              >
                {/* Feeds Tab Selector */}
                <div className="flex items-center overflow-x-auto p-1 rounded-2xl bg-black border border-white/10 self-start max-w-full relative">
                  {[
                    { id: 'all', label: 'All Swaps', color: 'text-white' },
                    { id: 'offer', label: 'Offering', color: 'text-emerald-400', indicator: 'bg-emerald-500/10 border-emerald-500/30' },
                    { id: 'request', label: 'Requesting', color: 'text-[#FF9A3C]', indicator: 'bg-[#FF4D00]/10 border-[#FF4D00]/30' },
                    { id: 'my_posts', label: 'My Posts', color: 'text-white' }
                  ].map((tab) => {
                    const active = activeFeedTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveFeedTab(tab.id as any)
                          triggerToast(`Swapped feed filter to: ${tab.label}`, "info")
                        }}
                        className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${
                          active ? tab.color : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="activeFeedIndicator"
                            className={`absolute inset-0 rounded-xl z-[-1] ${
                              tab.id === 'all' ? 'bg-[#FF4D00]' : tab.id === 'my_posts' ? 'bg-white' : tab.indicator
                            }`}
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="flex items-center gap-1.5">
                          {tab.id === 'offer' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                          {tab.id === 'request' && <span className="w-2 h-2 rounded-full bg-[#FF4D00]" />}
                          {tab.id === 'my_posts' && active && <span className="text-black font-black">{tab.label}</span>}
                          {tab.id === 'all' && active && <span className="text-black font-black">{tab.label}</span>}
                          {((tab.id !== 'all' && tab.id !== 'my_posts') || !active) && tab.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Results count & Search input */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-pulse shrink-0" />
                    <span>Showing <strong className="text-[#FF4D00] font-black">{filteredPosts.length}</strong> active slots</span>
                  </div>

                  <div className="relative w-full sm:w-80 md:w-96 group rounded-2xl bg-[#09090b] border border-white/10 focus-within:border-[#FF4D00] focus-within:ring-1 focus-within:ring-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all duration-200">
                    <span className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 ${isSearchFocused ? 'text-[#FF4D00]' : 'text-white/40'}`}>
                      <Search className="w-4 h-4" />
                    </span>
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Type to live filter sandbox data..."
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
                          <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">/</kbd>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </motion.div>

              {/* POST FEED CONTENT CONTAINER */}
              <motion.div 
                variants={CONTAINER_STAGGER}
                initial="hidden"
                animate="visible"
                className="relative"
              >
                <AnimatePresence mode="wait">
                  {filteredPosts.length === 0 ? (
                    <motion.div 
                      key="empty-state"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="w-full bg-black border-2 border-white/10 p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-6 mt-6 rounded-[2rem] shadow-[6px_6px_0px_rgba(255,77,0,0.12)]"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 flex items-center justify-center text-[#FF4D00]">
                        <Compass className="w-7 h-7" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">No slots active</h3>
                        <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                          We couldn't find any mock posts matching "{searchQuery}". Try searching for 'Sourdough', 'Gardening', 'Woodworking' or 'Synth'.
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setSearchQuery('')
                          setActiveFeedTab('all')
                        }}
                        className="px-6 py-3 rounded-xl bg-[#FF4D00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_#FFFFFF] cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </motion.div>
                  ) : (
                    <div key="feed-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredPosts.map((post) => {
                        const isOwn = post.user_id === "demo-user-1"
                        return (
                          <motion.div
                            key={post.id}
                            variants={FADE_UP}
                            layout
                            className="bg-[#FFFCF9] rounded-2xl p-6 border-2 border-black flex flex-col justify-between group transition-all duration-300 relative overflow-hidden shadow-[var(--post-shadow)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                {post.type === 'offer' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-800 border border-emerald-500/35 text-[9px] font-mono font-bold uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Offering
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF4D00]/10 text-black border border-[#FF4D00]/25 text-[9px] font-mono font-bold uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D00]" />
                                    Requesting
                                  </span>
                                )}

                                <div className="flex items-center gap-1 text-[9px] font-mono text-black/40 uppercase tracking-wider font-bold">
                                  <Clock className="w-3.5 h-3.5 text-black/30" />
                                  <span>{formatDate(post.created_at)}</span>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h3 className="font-display font-black text-lg text-black group-hover:text-[#FF4D00] transition-colors leading-snug truncate uppercase tracking-tight">
                                  {post.title}
                                </h3>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[10px] font-mono font-black uppercase text-black tracking-wider">
                                  <Tag className="w-3 h-3 text-black" />
                                  <span>Skill: {post.skill}</span>
                                </div>
                                <p className="text-black/80 text-xs font-semibold leading-relaxed line-clamp-3">
                                  {post.description}
                                </p>
                              </div>
                            </div>

                            {/* Author & Actions footer */}
                            <div className="pt-5 mt-5 border-t border-black/10 flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[#FF4D00] border-2 border-black text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                                  {post.profiles.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[11px] font-display font-black uppercase tracking-wider text-black truncate leading-none">
                                    {post.profiles.full_name}
                                  </div>
                                  <div className="text-[9px] font-mono uppercase tracking-wider text-black/55 flex items-center gap-0.5 pt-1 truncate">
                                    <MapPin className="w-2.5 h-2.5 text-black/40 shrink-0" />
                                    <span className="truncate">{post.profiles.neighborhood}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 pl-2">
                                {isOwn ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSimulateComplete(post.title)}
                                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-black border border-black font-mono font-black text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                                      title="Mark Swap as Complete"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                                      <span>Complete</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSimulateDelete(post.id, post.title)}
                                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-400 hover:bg-rose-500 text-black border border-black font-mono font-black text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                                      title="Delete Proposal"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSimulateChat(post.profiles.full_name)}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF4D00] hover:bg-black hover:text-white text-black border border-black font-mono font-black text-[10px] uppercase tracking-wider transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                                    >
                                      <span>Swap</span>
                                      <ArrowUpRight className="w-3.5 h-3.5 text-current stroke-[2.5px]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSimulateReport(post.title)}
                                      className="p-2.5 rounded-xl bg-white hover:bg-rose-500/10 border border-black/10 hover:border-rose-500/30 text-black/50 hover:text-rose-600 transition-all cursor-pointer shadow-[2px_2px_0px_#000000]"
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
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {/* ALL POSTS DIRECTORY TAB */}
          {activeSidebarTab === 'posts' && (
            <motion.div 
              variants={FADE_UP}
              initial="hidden"
              animate="visible"
              className="bg-black border-2 border-white/10 rounded-[2rem] p-8 text-left space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-display font-black text-2xl uppercase tracking-tight text-white">Interactive Feed Directory</h2>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#FF4D00] font-bold">Comprehensive active trades in Greenwich Loop</p>
                </div>
                <span className="px-3.5 py-1.5 rounded-full border border-[#FF4D00]/30 font-mono text-[10px] font-bold text-[#FF4D00] uppercase bg-[#FF4D00]/5">{posts.length} Active Proposals</span>
              </div>

              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          post.type === 'offer' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#FF4D00]/10 text-[#FF9A3C]'
                        }`}>{post.type}</span>
                        <span className="text-[10px] font-mono text-white/40 uppercase font-bold">{formatDate(post.created_at)}</span>
                      </div>
                      <h4 className="font-display font-bold text-base text-white truncate uppercase">{post.title}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2 max-w-2xl">{post.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                      <div className="text-right">
                        <div className="text-[10px] font-mono font-bold text-white uppercase">{post.profiles.full_name}</div>
                        <div className="text-[9px] font-mono text-white/40 uppercase">{post.profiles.neighborhood}</div>
                      </div>
                      <button 
                        onClick={() => handleSimulateChat(post.profiles.full_name)}
                        className="p-3.5 rounded-xl bg-[#FF4D00] hover:bg-white text-black transition-all border border-black shadow-[2px_2px_0px_#000000] cursor-pointer"
                      >
                        <ArrowUpRight className="w-4 h-4 stroke-[3px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* MESSAGES / CHAT SIMULATION TAB */}
          {activeSidebarTab === 'messages' && (
            <motion.div 
              variants={FADE_UP}
              initial="hidden"
              animate="visible"
              className="bg-black border-2 border-white/10 rounded-[2rem] overflow-hidden flex flex-col h-[70vh] shadow-2xl relative"
            >
              <div className="grid grid-cols-12 h-full">
                
                {/* Conversations list column */}
                <div className="col-span-12 md:col-span-4 border-r border-white/10 flex flex-col bg-[#020202]">
                  <div className="p-4.5 border-b border-white/10">
                    <h3 className="font-display font-black text-sm uppercase text-white tracking-wider">MESSAGES</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 p-2">
                    {[
                      { id: '1', name: 'Chef Adrian', skill: 'Sourdough Baking', text: 'Hey Marcus, ready to teach you tomorrow!', time: '10m ago', unread: true },
                      { id: '2', name: 'David Miller', skill: 'Woodworking', text: 'Chisels are perfectly sharpened. See you at 2!', time: '2h ago', unread: false }
                    ].map((conv) => (
                      <div key={conv.id} className={`p-4 rounded-xl cursor-pointer border flex flex-col gap-1 transition-all ${
                        conv.id === '1' ? 'bg-[#FF4D00]/5 border-[#FF4D00]/30 text-white' : 'bg-transparent border-transparent hover:bg-white/5 text-white/60'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider">{conv.name}</span>
                          <span className="text-[8px] font-mono text-white/30 uppercase">{conv.time}</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#FF4D00] uppercase font-bold">{conv.skill}</span>
                        <p className="text-[10px] font-mono text-white/50 truncate leading-snug">{conv.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Chat column */}
                <div className="col-span-12 md:col-span-8 flex flex-col h-full">
                  <div className="p-4.5 border-b border-white/10 flex items-center justify-between bg-black">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">C</div>
                      <div>
                        <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Chef Adrian</h4>
                        <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest font-black">Active Swapping Slot</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/30 font-mono text-[8px] font-black uppercase tracking-widest">VERIFIED NEIGHBOR</span>
                  </div>

                  {/* Messages Bubble History */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
                    <div className="flex flex-col gap-1 max-w-[70%] bg-white/5 border border-white/10 rounded-2xl p-3.5 self-start text-white/80">
                      <span className="text-[8px] text-white/30 uppercase font-black">Chef Adrian • 12:45 PM</span>
                      <p>Hello Marcus! I saw your request for learning woodworking, but I am offering sourdough techniques. Would you be interested in trading an hour of gardening instruction for a private sourdough lesson?</p>
                    </div>

                    <div className="flex flex-col gap-1 max-w-[70%] bg-[#FF4D00]/10 border border-[#FF4D00]/25 rounded-2xl p-3.5 self-end ml-auto text-white">
                      <span className="text-[8px] text-[#FF4D00] uppercase font-black">You (Marcus) • 12:48 PM</span>
                      <p>That sounds absolutely incredible, Adrian! I have three raised garden beds in Greenwich Village and would love to show you companion planting and soil maintenance. Let's trade!</p>
                    </div>

                    <div className="flex flex-col gap-1 max-w-[70%] bg-white/5 border border-white/10 rounded-2xl p-3.5 self-start text-white/80">
                      <span className="text-[8px] text-white/30 uppercase font-black">Chef Adrian • 12:50 PM</span>
                      <p>Awesome! I'll prepare the wild starter yeast and some organic flour. I can come over to your garden tomorrow around 10:00 AM if that works for you?</p>
                    </div>
                  </div>

                  {/* Chat Input panel */}
                  <div className="p-4 border-t border-white/10 bg-[#020202]">
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      triggerToast("Demo Mode: Custom message transmission simulated.", "success")
                      const input = (e.currentTarget as any).querySelector('input')
                      if (input) input.value = ''
                    }} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Type a message inside the sandbox..." 
                        className="flex-1 px-4 py-3 bg-[#09090b] border border-white/10 rounded-xl focus:border-[#FF4D00] focus:outline-none text-xs font-mono text-white"
                      />
                      <button className="px-5 py-3 bg-[#FF4D00] hover:bg-white text-black rounded-xl border border-black shadow-[2px_2px_0px_#000000] cursor-pointer flex items-center justify-center">
                        <Send className="w-4 h-4 stroke-[2.5px]" />
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* REVIEWS & RATINGS TAB */}
          {activeSidebarTab === 'reviews' && (
            <motion.div 
              variants={FADE_UP}
              initial="hidden"
              animate="visible"
              className="bg-black border-2 border-white/10 rounded-[2rem] p-8 text-left space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-6 gap-4">
                <div className="space-y-1">
                  <h2 className="font-display font-black text-2xl uppercase tracking-tight text-white">REPUTATION RECORD</h2>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 font-bold">Feedback verified via local cryptographic GPS logs</p>
                </div>
                <div className="flex items-center gap-4.5">
                  <div className="text-center">
                    <span className="font-display font-black text-4xl text-[#FF4D00] block leading-none">5.0</span>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-white/35 font-bold">Average Star</span>
                  </div>
                  <div className="text-center border-l border-white/10 pl-4.5">
                    <span className="font-display font-black text-4xl text-white block leading-none">3</span>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-white/35 font-bold">Swaps Done</span>
                  </div>
                </div>
              </div>

              {/* Review card stacks */}
              <div className="space-y-6">
                {[
                  { name: 'Elena Rostova', rating: 5, date: 'May 20, 2026', text: 'Marcus helped me design my composting loop. He is incredibly knowledgeable about organic soils and very patient. Outstanding swap!', skill: 'Organic Gardening' },
                  { name: 'David Miller', rating: 5, date: 'May 15, 2026', text: 'Terrific swap! Marcus traded me an hour of guitar chord coaching for woodworking tools. He learned pull saws amazingly fast.', skill: 'Acoustic Guitar' },
                  { name: 'Siddharth Sen', rating: 5, date: 'May 08, 2026', text: 'Showed Marcus how to build modular patches. Highly analytical mind, had a blast explaining analog LFO flows to him.', skill: 'Synthesizer Design' }
                ].map((rev, index) => (
                  <div key={index} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-white/50">{rev.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">{rev.name}</h4>
                          <span className="text-[8px] font-mono text-[#FF4D00] uppercase font-bold">Skill Swapped: {rev.skill}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-0.5 text-[#FF4D00] justify-end">
                          {[...Array(rev.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                        </div>
                        <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider font-bold pt-1 block">{rev.date}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 font-medium leading-relaxed font-mono">"{rev.text}"</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SETTINGS PARAMETERS TAB */}
          {activeSidebarTab === 'settings' && (
            <motion.div 
              variants={FADE_UP}
              initial="hidden"
              animate="visible"
              className="bg-black border-2 border-white/10 rounded-[2rem] p-8 text-left space-y-8"
            >
              <div className="border-b border-white/10 pb-4">
                <h2 className="font-display font-black text-2xl uppercase tracking-tight text-white">NEIGHBORHOOD SETTINGS</h2>
                <p className="font-mono text-[9px] uppercase tracking-widest text-[#FF4D00] font-bold">System configurations for your physical radius loops</p>
              </div>

              <div className="space-y-6 font-mono text-xs max-w-xl">
                {/* 1. Proximity togglers */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase tracking-wider">VERIFIED Radius boundary</h4>
                    <p className="text-[10px] text-white/40 uppercase">Constrain matching algorithm within a strict 3-mile loop.</p>
                  </div>
                  <button 
                    onClick={() => triggerToast("Demo Mode: Proximity toggle is simulated.", "info")}
                    className="w-12 h-6 rounded-full bg-[#FF4D00] p-1 flex items-center cursor-pointer transition-all"
                  >
                    <div className="w-4 h-4 rounded-full bg-black translate-x-6" />
                  </button>
                </div>

                {/* 2. Skills sliders */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase tracking-wider">GPS Location Anchor</h4>
                    <p className="text-[10px] text-white/40 uppercase">Pre-verifies matches near Greenwich Village zip code 10012.</p>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value="10012, New York" 
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/15 bg-black text-white text-xs"
                    />
                    <button 
                      onClick={() => triggerToast("Demo Mode: GPS verification can only be modified in a live environment.", "error")}
                      className="px-4 py-2 bg-white hover:bg-[#FF4D00] text-black hover:text-black font-bold text-[10px] uppercase rounded-xl transition-all cursor-pointer border border-black"
                    >
                      Update GPS
                    </button>
                  </div>
                </div>

                {/* 3. Account status indicator */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white uppercase tracking-wider">Account Status</h4>
                    <span className="text-[9px] text-[#FF4D00] font-black uppercase tracking-widest block pt-1">DEMO LEVEL SANDBOX</span>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Active & Trusted</span>
                </div>
              </div>
            </motion.div>
          )}

        </main>
      </div>

      {/* 5. SIMULATED OVERLAY MODALS */}
      {/* A. Invite Neighbor Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-[#121214] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl flex flex-col gap-5 text-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#FF6B00]/10 text-[#FF9A3C] flex items-center justify-center">
                    <UserPlus className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Invite a Neighbor</h3>
                    <p className="text-[10px] text-gray-500">Bring your community together</p>
                  </div>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed font-mono">
                Generate an invitation link pre-filled with your Greenwich PIN (<span className="text-white font-bold">{MOCK_PROFILE.pin_code}</span>) so your neighbors join the Greenwich Village loop.
              </p>

              <div className="space-y-2">
                <span className="block text-[9px] font-mono text-white/40 uppercase tracking-widest font-black">Simulated Link</span>
                <div className="flex gap-2">
                  <input type="text" readOnly value={`https://skillswap.io/join?code=invite-marcus-${MOCK_PROFILE.pin_code}`} className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-[#161618] text-white text-xs font-mono focus:outline-none" />
                  <button 
                    onClick={() => {
                      setInviteCopied(true)
                      triggerToast("Demo Mode: Copied invite link to clipboard!", "success")
                      setTimeout(() => setInviteCopied(false), 2000)
                    }}
                    className={`px-4 rounded-xl border font-mono text-xs cursor-pointer ${inviteCopied ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#FF4D00] text-black font-black'}`}
                  >
                    {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B. Create proposal simulated creator */}
      <AnimatePresence>
        {showNewProposalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewProposalModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-black border-2 border-white/10 rounded-[2rem] w-full max-w-lg p-7 relative z-10 shadow-[10px_10px_0px_#FF4D00] flex flex-col gap-6 text-gray-200"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center border border-[#FF4D00]/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-white uppercase tracking-tight">Create Swap Proposal</h3>
                    <p className="text-[9px] font-mono text-[#FF4D00] uppercase tracking-widest font-black">Post into physical loop {MOCK_PROFILE.pin_code}</p>
                  </div>
                </div>
                <button onClick={() => setShowNewProposalModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSimulateNewProposal} className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/50 uppercase font-black">Proposal Title</label>
                    <input name="title" required placeholder="e.g. Italian Pasta Dough lessons" className="w-full px-4 py-3 bg-[#09090b] border border-white/10 rounded-xl focus:border-[#FF4D00] focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/50 uppercase font-black">Primary Skill Category</label>
                    <input name="skill" required placeholder="e.g. Culinary Arts" className="w-full px-4 py-3 bg-[#09090b] border border-white/10 rounded-xl focus:border-[#FF4D00] focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/50 uppercase font-black">Exchange Type</label>
                  <select name="type" className="w-full px-4 py-3 bg-[#09090b] border border-white/10 rounded-xl focus:border-[#FF4D00] focus:outline-none text-white font-mono">
                    <option value="offer">I am Offering to teach (OFFERING)</option>
                    <option value="request">I am Requesting to learn (REQUESTING)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/50 uppercase font-black">Proposal Description</label>
                  <textarea name="description" required rows={3} placeholder="Describe what you would like to swap. Tell your neighbors about your expertise, session logistics, or what specific topics you expect to learn..." className="w-full px-4 py-3 bg-[#09090b] border border-white/10 rounded-xl focus:border-[#FF4D00] focus:outline-none" />
                </div>

                <div className="pt-3 flex gap-3">
                  <button type="submit" className="flex-1 py-3.5 bg-[#FF4D00] hover:bg-white text-black font-mono font-bold uppercase rounded-xl border border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer">
                    Simulate Post Creation
                  </button>
                  <button type="button" onClick={() => setShowNewProposalModal(false)} className="px-5 py-3.5 bg-black hover:bg-white/10 text-white rounded-xl border border-white/10 cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* C. Blocked Users overlay modal */}
      <AnimatePresence>
        {showBlockedUsersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBlockedUsersModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xs" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-[#121214] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl flex flex-col gap-5 text-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <ShieldOff className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Blocked Users</h3>
                    <p className="text-[10px] text-gray-500">Muted neighbors in zip {MOCK_PROFILE.pin_code}</p>
                  </div>
                </div>
                <button onClick={() => setShowBlockedUsersModal(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-xs text-gray-400 font-mono">
                You have not blocked any neighbors in Greenwich Village yet. Muting keeps their proposals hidden from your matching lists.
              </p>

              <button onClick={() => setShowBlockedUsersModal(false)} className="w-full py-2.5 bg-white text-black font-bold text-xs rounded-xl cursor-pointer">
                Close Panel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
