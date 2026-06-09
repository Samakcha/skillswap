'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, 
  Crown, 
  Check, 
  Star, 
  MapPin, 
  ArrowLeft,
  Award,
  Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import SplitText from '@/components/SplitText'
import { getBulkSkillScoreDetails } from '@/lib/reputation'

// Framer Motion presets for staggered animations
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
      delayChildren: 0.1
    }
  }
}

interface LeaderboardUser {
  id: string
  full_name: string
  neighborhood: string | null
  avatar_url: string | null
  pin_code: string
  completedSwaps: number
  averageRating: number
  score: number
  tier: string
  rank: number
}

export default function LeaderboardPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [rawScoredUsers, setRawScoredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLight, setIsLight] = useState(false)
  const [activeTab, setActiveTab] = useState<'neighborhood' | 'monthly' | 'all_time'>('neighborhood')

  // Real-time MutationObserver to sync theme toggles dynamically
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
    async function loadLeaderboard() {
      try {
        setLoading(true)
        
        // 1. Fetch current user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) {
          router.push('/auth/login')
          return
        }
        setUser(authUser)

        // 2. Fetch current user's profile to get pin_code
        const { data: userProfile, error: profileError } = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single() as any)

        if (profileError || !userProfile) {
          router.push('/profile-setup')
          return
        }
        setProfile(userProfile)

        // 3. Fetch all profiles
        const { data: allProfiles, error: profilesError } = await (supabase
          .from('profiles')
          .select('*') as any)

        if (profilesError || !allProfiles || allProfiles.length === 0) {
          setRawScoredUsers([])
          setLoading(false)
          return
        }

        // 4. Calculate reputation details in bulk
        const scored = await getBulkSkillScoreDetails(supabase, allProfiles)
        setRawScoredUsers(scored)
      } catch (err) {
        console.error('Error fetching leaderboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [router, supabase])

  // Derive rankings list dynamically based on activeTab
  const leaderboardData: LeaderboardUser[] = (() => {
    let list = [...rawScoredUsers]

    if (activeTab === 'neighborhood') {
      // Filter to same pin code or neighborhood name
      list = list.filter(u => u.pinCode === profile?.pin_code || (u.neighborhood && u.neighborhood === profile?.neighborhood))
      list.sort((a, b) => b.score - a.score)
    } else if (activeTab === 'monthly') {
      // Filter to same pin code or neighborhood, sort by monthly (last 30 days) activity score
      list = list.filter(u => u.pinCode === profile?.pin_code || (u.neighborhood && u.neighborhood === profile?.neighborhood))
      list.sort((a, b) => b.monthlyScore - a.monthlyScore)
    } else if (activeTab === 'all_time') {
      // Platform-wide global ranking
      list.sort((a, b) => b.score - a.score)
    }

    // Map fields and assign ranks
    return list.map((item, idx) => ({
      id: item.userId,
      full_name: item.fullName,
      neighborhood: item.neighborhood,
      avatar_url: item.avatar_url,
      pin_code: item.pinCode || '',
      completedSwaps: item.completedSwapsCount,
      averageRating: item.averageRating,
      score: activeTab === 'monthly' ? item.monthlyScore : item.score,
      tier: item.tier,
      rank: idx + 1
    }))
  })()

  // Get current user stats
  const currentUserStats = leaderboardData.find(item => item.id === user?.id)

  // Get top 3 users for the podium
  const topThree = leaderboardData.slice(0, 3)
  const firstPlace = topThree.find(u => u.rank === 1) || null
  const secondPlace = topThree.find(u => u.rank === 2) || null
  const thirdPlace = topThree.find(u => u.rank === 3) || null

  // Dynamic Theme Styling configurations for Pedestals
  const frontFaceClass1st = isLight
    ? 'bg-black border-2 border-black text-white shadow-[8px_8px_0px_#000000]'
    : 'bg-[#0B0B0D]/95 border border-[#FF6B00]/40 text-white backdrop-blur-md shadow-[0_4px_25px_rgba(255,107,0,0.15)]'

  const frontFaceClassOthers = isLight
    ? 'bg-black border-2 border-black text-white shadow-[6px_6px_0px_#000000]'
    : 'bg-[#0B0B0D]/90 border border-white/10 text-white backdrop-blur-md'

  const getTierColorClass = (tier: string) => {
    switch (tier) {
      case 'Neighborhood Legend':
        return 'text-[#FF6B00] border-[#FF6B00]/30 bg-[#FF6B00]/5'
      case 'Community Mentor':
        return 'text-amber-400 border-amber-400/30 bg-amber-400/5'
      case 'Trusted Neighbor':
        return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
      case 'Active Swapper':
        return 'text-blue-400 border-blue-400/30 bg-blue-400/5'
      default:
        return 'text-gray-400 border-white/10 bg-white/5'
    }
  }

  return (
    <div className="min-h-screen bg-theme-bg text-gray-100 flex flex-col lg:flex-row font-sans selection:bg-[#FF6B00]/30 selection:text-white relative overflow-x-clip w-full">
      {/* Cyber Tech Blueprint Grid Overlay */}
      <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />
      
      {/* Sidebar navigation */}
      <Sidebar profile={profile} supabase={supabase} user={user} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10 relative z-10">
        {/* Background glow animations */}
        <div className={`absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full blur-[130px] pointer-events-none z-0 ${isLight ? 'bg-black/10' : 'bg-[#FF6B00]/5 animate-pulse'}`} />
        <div className={`absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full blur-[140px] pointer-events-none z-0 ${isLight ? 'bg-black/5' : 'bg-[#FF6B00]/5'}`} />

        {/* Leaderboard content */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 flex flex-col gap-8 relative z-10">
          
          {/* HEADER HERO PANEL */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={FADE_UP}
            className={`rounded-[2rem] p-6 sm:p-8 relative overflow-hidden backdrop-blur-md transition-all duration-300 ${
              isLight 
                ? 'bg-black border-2 border-black text-white shadow-[8px_8px_0px_#000000]' 
                : 'bg-black border-2 border-white/10 text-white shadow-[8px_8px_0px_rgba(255,77,0,0.12)]'
            } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}
          >
            <div className="absolute inset-0 bg-radial-gradient from-[#FF6B00]/5 to-transparent pointer-events-none" />
            
            <div className="space-y-4 relative z-10 flex-1">
              <button 
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0B0B0D] border-2 border-white/5 text-white/40 hover:text-black hover:bg-[#FF6B00] hover:border-black transition-all shadow-[2px_2px_0px_#000000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5px]" />
                <span className="font-mono font-black text-[10px] uppercase tracking-wider">Back to Dashboard</span>
              </button>
              
              <div className="space-y-1.5">
                <h1 className="font-display font-black text-3xl sm:text-4xl leading-[0.9] text-white tracking-tight uppercase flex flex-wrap gap-x-2">
                  <SplitText
                    text="SkillScore"
                    className="text-white"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                  <SplitText
                    text="Leaderboard"
                    className="text-[#FF6B00]"
                    delay={40}
                    duration={0.6}
                    ease="power3.out"
                    textAlign="left"
                    tag="span"
                  />
                </h1>
                <p className="text-xs font-mono text-white/40 uppercase tracking-wide leading-relaxed pt-1">
                  hyperlocal reputation rankings based on verified completed exchanges and neighborhood trust.
                </p>
              </div>
            </div>

            {/* Right cancel/ZIP section */}
            <div className="flex flex-col sm:items-end gap-3 self-start sm:self-center">
              <div className="px-3.5 py-1.5 border border-[#FF6B00]/25 text-[#FF6B00] bg-[#FF6B00]/5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest select-none shrink-0">
                Neighborhood: {profile?.neighborhood || 'Local'}
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="self-start sm:self-auto px-5 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-white/50 hover:text-white bg-black hover:bg-[#161618] border-2 border-white/10 hover:border-white/20 rounded-xl transition-all shadow-[2px_2px_0px_rgba(255,255,255,0.05)] hover:shadow-none cursor-pointer relative z-10"
              >
                Cancel
              </button>
            </div>
          </motion.div>

          {/* DYNAMIC LEADERBOARD TABS */}
          <div className="flex items-center overflow-x-auto p-1 rounded-2xl bg-black border border-white/10 self-start max-w-full relative select-none">
            {/* Neighborhood Tab */}
            <button 
              onClick={() => setActiveTab('neighborhood')}
              className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'neighborhood' ? 'text-black' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === 'neighborhood' && (
                <motion.span 
                  layoutId="activeLeaderboardTab"
                  className="absolute inset-0 bg-[#FF6B00] rounded-xl z-[-1] shadow-lg shadow-[#FF6B00]/15"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              Neighborhood
            </button>

            {/* Monthly Tab */}
            <button 
              onClick={() => setActiveTab('monthly')}
              className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'monthly' ? 'text-black' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === 'monthly' && (
                <motion.span 
                  layoutId="activeLeaderboardTab"
                  className="absolute inset-0 bg-[#FF6B00] rounded-xl z-[-1] shadow-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              Monthly Rank
            </button>

            {/* All-time Tab */}
            <button 
              onClick={() => setActiveTab('all_time')}
              className={`relative px-4.5 py-3 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer z-10 ${activeTab === 'all_time' ? 'text-black' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === 'all_time' && (
                <motion.span 
                  layoutId="activeLeaderboardTab"
                  className="absolute inset-0 bg-[#FF6B00] rounded-xl z-[-1] shadow-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              All-Time Global
            </button>
          </div>

          {/* 3D Brutalist Column Podium Section */}
          {!loading && leaderboardData.length > 0 && (
            <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-6 md:gap-8 py-10 max-w-4xl mx-auto w-full">
              
              {/* 2nd Place */}
              {secondPlace ? (
                <div className="flex flex-col items-center w-full max-w-[200px]">
                  {/* Floating Avatar */}
                  <div className="mb-4 relative">
                    {secondPlace.avatar_url ? (
                      <div className={`w-16 h-16 rounded-xl overflow-hidden transition-all duration-300 ${
                        isLight ? 'border-2 border-black shadow-[3px_3px_0px_#000000]' : 'border border-white/10 shadow-lg'
                      }`}>
                        <img src={secondPlace.avatar_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-xl transition-all duration-300 flex items-center justify-center font-display font-black text-xl uppercase ${
                        isLight 
                          ? 'bg-[#FF6B00] border-2 border-black text-black shadow-[3px_3px_0px_#000000]' 
                          : 'bg-[#FF6B00]/10 border border-white/10 text-[#FF6B00]'
                      }`}>
                        {secondPlace.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Pedestal */}
                  <div className="w-full relative flex flex-col items-center">
                    <div className={`w-full flex flex-col items-center justify-center p-4 text-center rounded-b-xl rounded-t-2xl h-32 transition-all duration-300 ${frontFaceClassOthers}`}>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-1">[2] {secondPlace.full_name}</span>
                      <span className="px-2 py-0.5 border rounded-md text-[8px] font-mono font-bold uppercase tracking-wider scale-90 mt-1 truncate max-w-full block text-center leading-none select-none duration-150 border-white/10 bg-white/5 text-white/60">
                        {secondPlace.tier}
                      </span>
                      <span className="text-xs font-mono text-[#FF6B00] font-black mt-2">
                        {secondPlace.score} SkillScore
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Vacant Column */
                <div className="flex flex-col items-center w-full max-w-[200px] opacity-20">
                  <div className="mb-4">
                    <div className="w-16 h-16 rounded-xl border border-dashed border-white/20 bg-transparent flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-white/30">
                      VACANT
                    </div>
                  </div>
                  <div className="w-full relative flex flex-col items-center">
                    <div className={`w-full flex flex-col items-center justify-center p-4 text-center border border-dashed rounded-b-xl rounded-t-2xl h-32 ${
                      isLight ? 'border-black text-black/40 bg-transparent' : 'border-white/20 text-white/20 bg-transparent'
                    }`}>
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold mb-1">[2] NO DATA</span>
                      <span className="text-[11px] font-mono font-bold mt-2">-</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {firstPlace ? (
                <div className="flex flex-col items-center w-full max-w-[220px] -translate-y-4 md:translate-y-0">
                  {/* Floating Avatar with Crown */}
                  <div className="mb-4 relative z-10">
                    <Crown className="w-6 h-6 absolute -top-5 left-1/2 -translate-x-1/2" style={{ color: '#FFD700', filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.6))' }} />
                    {firstPlace.avatar_url ? (
                      <div className={`w-20 h-20 rounded-xl overflow-hidden transition-all duration-300 ${
                        isLight ? 'border-2 border-black shadow-[4px_4px_0px_#000000]' : 'border-2 border-[#FF6B00]'
                      }`}>
                        <img src={firstPlace.avatar_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-20 h-20 rounded-xl transition-all duration-300 flex items-center justify-center font-display font-black text-2xl uppercase ${
                        isLight 
                          ? 'bg-[#FF6B00] border-2 border-black text-black shadow-[4px_4px_0px_#000000]' 
                          : 'bg-[#FF6B00]/15 border-2 border-[#FF6B00] text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.2)]'
                      }`}>
                        {firstPlace.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Pedestal */}
                  <div className="w-full relative flex flex-col items-center z-0">
                    <div className={`w-full flex flex-col items-center justify-center p-4 text-center rounded-b-xl rounded-t-2xl h-40 transition-all duration-300 ${frontFaceClass1st}`}>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF6B00] font-black mb-1">[1] {firstPlace.full_name}</span>
                      <span className="px-2 py-0.5 border rounded-md text-[8px] font-mono font-bold uppercase tracking-wider scale-90 mt-1 truncate max-w-full block text-center leading-none select-none duration-150 border-[#FF6B00]/30 bg-[#FF6B00]/5 text-[#FF6B00]">
                        {firstPlace.tier}
                      </span>
                      <span className="text-sm font-display font-black text-white mt-2.5 flex items-center gap-1 px-3.5 py-1 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-lg">
                        {firstPlace.score} SkillScore
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Vacant Column */
                <div className="flex flex-col items-center w-full max-w-[220px] opacity-20">
                  <div className="mb-4">
                    <div className="w-20 h-20 rounded-xl border border-dashed border-white/20 bg-transparent flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-white/30">
                      VACANT
                    </div>
                  </div>
                  <div className="w-full relative flex flex-col items-center">
                    <div className={`w-full flex flex-col items-center justify-center p-4 text-center border border-dashed rounded-b-xl rounded-t-2xl h-40 ${
                      isLight ? 'border-black text-black/40 bg-transparent' : 'border-white/25 text-white/25 bg-transparent'
                    }`}>
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold mb-1">[1] NO DATA</span>
                      <span className="text-[11px] font-mono font-bold mt-2">-</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {thirdPlace ? (
                <div className="flex flex-col items-center w-full max-w-[200px]">
                  {/* Floating Avatar */}
                  <div className="mb-4 relative">
                    {thirdPlace.avatar_url ? (
                      <div className={`w-16 h-16 rounded-xl overflow-hidden transition-all duration-300 ${
                        isLight ? 'border-2 border-black shadow-[3px_3px_0px_#000000]' : 'border border-white/10 shadow-lg'
                      }`}>
                        <img src={thirdPlace.avatar_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-xl transition-all duration-300 flex items-center justify-center font-display font-black text-xl uppercase ${
                        isLight 
                          ? 'bg-[#FF6B00] border-2 border-black text-black shadow-[3px_3px_0px_#000000]' 
                          : 'bg-[#FF6B00]/10 border border-white/10 text-[#FF6B00]'
                      }`}>
                        {thirdPlace.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Pedestal */}
                  <div className="w-full relative flex flex-col items-center">
                    <div className={`w-full flex flex-col items-center justify-center p-4 text-center rounded-b-xl rounded-t-2xl h-24 transition-all duration-300 ${frontFaceClassOthers}`}>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-1">[3] {thirdPlace.full_name}</span>
                      <span className="px-2 py-0.5 border rounded-md text-[8px] font-mono font-bold uppercase tracking-wider scale-90 mt-1 truncate max-w-full block text-center leading-none select-none duration-150 border-white/10 bg-white/5 text-white/60">
                        {thirdPlace.tier}
                      </span>
                      <span className="text-xs font-mono text-[#FF6B00]/80 font-black mt-2">
                        {thirdPlace.score} SkillScore
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Vacant Column */
                <div className="flex flex-col items-center w-full max-w-[200px] opacity-20">
                  <div className="mb-4">
                    <div className="w-16 h-16 rounded-xl border border-dashed border-white/20 bg-transparent flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-white/30">
                      VACANT
                    </div>
                  </div>
                  <div className="w-full relative flex flex-col items-center">
                    <div className={`w-full flex flex-col items-center justify-center p-4 text-center border border-dashed rounded-b-xl rounded-t-2xl h-24 ${
                      isLight ? 'border-black text-black/40 bg-transparent' : 'border-white/20 text-white/20 bg-transparent'
                    }`}>
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold mb-1">[3] NO DATA</span>
                      <span className="text-[11px] font-mono font-bold mt-2">-</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* User's personal stats card */}
          {loading ? (
            <SkeletonStatsCard isLight={isLight} />
          ) : (
            <div className={`relative overflow-hidden rounded-[2rem] p-6 md:p-8 transition-all duration-300 ${
              isLight 
                ? 'bg-black border-2 border-black text-white shadow-[8px_8px_0px_#000000]' 
                : 'bg-black/50 border border-[#FF6B00]/40 shadow-[0_0_20px_rgba(255,107,0,0.15)] backdrop-blur-md'
            }`}>
              <div className="absolute inset-0 bg-radial-gradient from-[#FF6B00]/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {currentUserStats?.avatar_url ? (
                    <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden border border-[#FF6B00]/40 shrink-0">
                      <img src={currentUserStats.avatar_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-[1.25rem] bg-[#FF6B00]/10 border border-[#FF6B00]/40 text-[#FF6B00] flex items-center justify-center font-display font-black text-2xl uppercase shrink-0">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'N'}
                    </div>
                  )}
                  
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#FF6B00] font-bold">Your Performance</div>
                    <h2 className="font-display font-black text-xl text-white uppercase tracking-tight">
                      {profile?.full_name || 'Neighbor'}
                    </h2>
                    <div className="text-[10px] font-mono uppercase text-white/40 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#FF6B00]" />
                      <span>{profile?.neighborhood || 'Local Area'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 xs:grid-cols-3 md:flex md:items-center gap-4 sm:gap-6 lg:gap-8 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                  {/* Rank */}
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Rank</span>
                    <span className="text-2xl font-display font-black text-white flex items-center gap-1.5 pt-1">
                      {currentUserStats ? `#${currentUserStats.rank}` : 'N/A'}
                    </span>
                  </div>
                  
                  {/* SkillScore */}
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">SkillScore</span>
                    <span className="text-2xl font-display font-black text-[#FF6B00] pt-1">
                      {currentUserStats ? currentUserStats.score : '0'}
                    </span>
                  </div>

                  {/* Tier */}
                  <div className="flex flex-col justify-center">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Rep Tier</span>
                    <div className="pt-1.5">
                      <span className={`px-2.5 py-1 border rounded-md text-[9px] font-mono font-bold uppercase tracking-wider select-none shrink-0 ${currentUserStats ? getTierColorClass(currentUserStats.tier) : 'text-white/20 border-white/5 bg-white/5'}`}>
                        {currentUserStats ? currentUserStats.tier : 'New Swapper'}
                      </span>
                    </div>
                  </div>

                  {/* Completed Swaps */}
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Completed</span>
                    <span className="text-xl font-display font-black text-white flex items-center gap-1 pt-1">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{currentUserStats ? currentUserStats.completedSwaps : '0'}</span>
                    </span>
                  </div>

                  {/* Average Rating */}
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Rating</span>
                    <span className="text-xl font-display font-black text-white flex items-center gap-1 pt-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                      <span>{currentUserStats ? currentUserStats.averageRating.toFixed(1) : '0.0'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full Leaderboard List (Redesigned Cyber Grid) */}
          {loading ? (
            <div className={`w-full rounded-[2rem] overflow-hidden transition-all duration-300 ${
              isLight 
                ? 'bg-black border-2 border-black text-white shadow-[8px_8px_0px_#000000]' 
                : 'bg-black/40 border border-white/[0.07]'
            }`}>
              <div className="w-full overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[600px] border-collapse font-mono text-xs text-white">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="px-4 py-3 border-r border-white/10 text-center font-bold uppercase tracking-wider w-20">Rank</th>
                      <th className="px-4 py-3 border-r border-white/10 text-left font-bold uppercase tracking-wider">Player</th>
                      <th className="px-4 py-3 border-r border-white/10 text-center font-bold uppercase tracking-wider w-36">Tier</th>
                      <th className="px-4 py-3 border-r border-white/10 text-center font-bold uppercase tracking-wider w-24">Swaps</th>
                      <th className="px-4 py-3 border-r border-white/10 text-center font-bold uppercase tracking-wider w-24">Rating</th>
                      <th className="px-4 py-3 text-right font-bold uppercase tracking-wider w-28">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className={`flex flex-col items-center justify-center text-center py-16 px-4 border rounded-[2rem] transition-all duration-300 ${
              isLight 
                ? 'bg-black border-black text-white shadow-[8px_8px_0px_#000000]' 
                : 'bg-black/40 border-white/[0.07]'
            }`}>
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-4">
                <Trophy className="w-8 h-8 text-white/30" />
              </div>
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">No rankings yet</h3>
              <p className="text-xs text-white/40 mt-1 max-w-sm leading-relaxed">
                No profiles were found matching this filter set. Complete your profile details to join.
              </p>
            </div>
          ) : (
            <div className={`w-full rounded-[2rem] overflow-hidden backdrop-blur-md transition-all duration-300 ${
              isLight 
                ? 'bg-black border-2 border-black text-white shadow-[8px_8px_0px_#000000]' 
                : 'bg-black/40 border border-white/[0.07]'
            }`}>
              <div className="w-full overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[620px] border-collapse font-mono text-xs text-white/90">
                  {/* Table Header */}
                  <thead>
                    <tr className={`border-b font-mono text-[10px] font-bold uppercase tracking-widest text-white/40 ${
                      isLight ? 'border-white/10 bg-white/[0.04]' : 'border-white/5 bg-white/[0.02]'
                    }`}>
                      <th className="px-4 py-3.5 border-r border-white/10 text-center font-bold uppercase w-20 shrink-0">Rank</th>
                      <th className="px-4 py-3.5 border-r border-white/10 text-left font-bold uppercase">Player</th>
                      <th className="px-4 py-3.5 border-r border-white/10 text-center font-bold uppercase w-36 shrink-0">Reputation Tier</th>
                      <th className="px-4 py-3.5 border-r border-white/10 text-center font-bold uppercase w-24 shrink-0">Swaps</th>
                      <th className="px-4 py-3.5 border-r border-white/10 text-center font-bold uppercase w-24 shrink-0">Rating</th>
                      <th className="px-4 py-3.5 text-right font-bold uppercase w-28 shrink-0">SkillScore</th>
                    </tr>
                  </thead>
                  
                  {/* Table Body */}
                  <tbody className={`divide-y ${isLight ? 'divide-white/10' : 'divide-white/5'}`}>
                    {leaderboardData.map((row) => {
                      const isSelf = row.id === user?.id
                      
                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors duration-150 ${
                            isSelf 
                              ? isLight 
                                ? 'bg-[#FF6B00]/15' 
                                : 'bg-[#FF6B00]/10' 
                              : isLight 
                                ? 'hover:bg-white/[0.04]' 
                                : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Rank Column */}
                          <td className="px-4 py-4.5 border-r border-white/10 text-center font-bold">
                            <span className={isSelf ? 'text-[#FF6B00]' : 'text-[#FF6B00]/80'}>
                              [{row.rank}]
                            </span>
                          </td>

                          {/* Player Identity Column */}
                          <td className="px-4 py-4.5 border-r border-white/10 text-left">
                            <div className="flex items-center gap-3">
                              {/* Avatar */}
                              {row.avatar_url ? (
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                  <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/25 text-[#FF6B00] flex items-center justify-center font-bold text-xs shrink-0">
                                  {row.full_name?.charAt(0).toUpperCase() || 'N'}
                                </div>
                              )}
                              
                              {/* Name + Neighborhood */}
                              <div className="min-w-0">
                                <Link
                                  href={`/profile/${row.id}`}
                                  className={`font-display font-black text-sm uppercase hover:text-[#FF6B00] transition-colors truncate block ${
                                    isSelf ? 'text-[#FF6B00]' : 'text-white'
                                  }`}
                                >
                                  {isSelf ? 'You' : row.full_name}
                                </Link>
                                <span className="text-[9px] font-mono text-white/40 block truncate max-w-[150px] sm:max-w-none">
                                  {row.neighborhood || 'Local Area'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Reputation Tier Column */}
                          <td className="px-4 py-4.5 border-r border-white/10 text-center select-none font-bold">
                            <span className={`px-2 py-0.5 border rounded-md text-[8.5px] font-mono font-bold uppercase tracking-wider block text-center leading-none ${getTierColorClass(row.tier)}`}>
                              {row.tier}
                            </span>
                          </td>

                          {/* Completed Swaps Column */}
                          <td className="px-4 py-4.5 border-r border-white/10 text-center font-bold font-mono">
                            {row.completedSwaps}
                          </td>

                          {/* Rating Column */}
                          <td className="px-4 py-4.5 border-r border-white/10 text-center font-bold font-mono">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-white">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>{row.averageRating.toFixed(1)}</span>
                            </div>
                          </td>

                          {/* Score Column */}
                          <td className="px-4 py-4.5 text-right font-display font-black text-[#FF6B00] text-sm">
                            {row.score}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

// Skeletons Components
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-white/5">
      <td className="px-4 py-4 border-r border-white/10 text-center w-20">
        <div className="w-6 h-4 bg-white/5 rounded mx-auto" />
      </td>
      <td className="px-4 py-4 border-r border-white/10 text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/5 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1 max-w-[150px]">
            <div className="h-3.5 bg-white/5 rounded w-3/4" />
            <div className="h-2.5 bg-white/5 rounded w-1/2" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 border-r border-white/10 text-center w-36">
        <div className="w-24 h-4.5 bg-white/5 rounded mx-auto" />
      </td>
      <td className="px-4 py-4 border-r border-white/10 text-center w-24">
        <div className="w-8 h-4 bg-white/5 rounded mx-auto" />
      </td>
      <td className="px-4 py-4 border-r border-white/10 text-center w-24">
        <div className="w-10 h-4 bg-white/5 rounded mx-auto" />
      </td>
      <td className="px-4 py-4 text-right w-28">
        <div className="w-12 h-4 bg-white/5 rounded ml-auto" />
      </td>
    </tr>
  )
}

function SkeletonStatsCard({ isLight }: { isLight: boolean }) {
  return (
    <div className={`rounded-[2rem] p-6 md:p-8 animate-pulse transition-all duration-300 ${
      isLight 
        ? 'bg-black border-2 border-black shadow-[8px_8px_0px_#000000]' 
        : 'bg-black/40 border border-white/10'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/5 rounded-[1.25rem] shrink-0" />
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded w-20" />
            <div className="h-5 bg-white/5 rounded w-32" />
            <div className="h-3 bg-white/5 rounded w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 xs:grid-cols-3 md:flex gap-4 sm:gap-6 lg:gap-8 border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2 shrink-0 min-w-[70px]">
              <div className="h-3 bg-white/5 rounded w-12" />
              <div className="h-5 bg-white/5 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
