"use client"

import { createClient } from '@/lib/supabase'
import SplitText from '@/components/SplitText'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, ArrowLeft, UserPlus, MapPin, Users, Layers, ArrowRight } from 'lucide-react'
import BackgroundLiquidEther from '@/components/BackgroundLiquidEther'

// Framer Motion Animation Presets
const FADE_UP = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
}

export default function JoinNeighborhoodPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [hostName, setHostName] = useState<string>('')
  const [postCount, setPostCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function validateInvite() {
      if (typeof window === 'undefined') return

      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (!code) {
          setError('No invitation code was found in the URL. Please make sure you have the correct link.')
          setLoading(false)
          return
        }

        // Fetch invite from invites table
        const { data, error: inviteError } = await (supabase
          .from('invites') as any)
          .select('*')
          .eq('code', code)
          .maybeSingle()

        if (inviteError) throw inviteError

        const inviteData = data as any

        if (!inviteData) {
          setError('This invitation code is invalid. Please ask your neighbor for a new invitation link.')
          setLoading(false)
          return
        }

        // Check if invite uses exceeded max_uses
        if (inviteData.uses >= inviteData.max_uses) {
          setError('This invitation link has reached its maximum usage limit and is no longer active.')
          setLoading(false)
          return
        }

        setInvite(inviteData)

        if (inviteData.pin_code) {
          const { data: postsData, error: postsError } = await (supabase
            .from('posts') as any)
            .select('id, profiles:profiles!posts_user_id_fkey!inner(pin_code)')
            .eq('is_active', true)
            .eq('profiles.pin_code', inviteData.pin_code)

          if (postsError) {
            console.error('Error fetching neighborhood post count:', postsError)
            setPostCount(null)
          } else {
            setPostCount((postsData || []).length)
          }
        } else {
          setPostCount(null)
        }

        // Fetch creator's name if present
        if (inviteData.created_by) {
          const { data: pData } = await (supabase
            .from('profiles') as any)
            .select('full_name')
            .eq('id', inviteData.created_by)
            .maybeSingle()

          const profileData = pData as any

          if (profileData?.full_name) {
            setHostName(profileData.full_name)
          }
        }
      } catch (err: any) {
        console.error('Error validating invite:', err)
        setError('An unexpected error occurred while validating the invitation. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    validateInvite()
  }, [])

  const handleJoin = async () => {
    if (!invite) return
    setJoining(true)

    try {
      // Increment invite's uses by 1
      const { error: updateError } = await (supabase
        .from('invites') as any)
        .update({ uses: invite.uses + 1 })
        .eq('code', invite.code)

      if (updateError) throw updateError

      // Redirect to signup page with pin_code
      router.push(`/auth/signup?pin_code=${invite.pin_code || ''}`)
    } catch (err: any) {
      console.error('Error joining neighborhood:', err)
      alert('Failed to process joining the neighborhood. Please try again.')
      setJoining(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-[#FF4D00] selection:text-black relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none select-none">
        <BackgroundLiquidEther />
        <div className="absolute inset-0 bg-[#FF4D00] mix-blend-color opacity-30 pointer-events-none" />
      </div>

      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/12 blur-[120px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/8 blur-[130px] pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-black/85 border border-white/10 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 z-10 shadow-[16px_16px_0px_#FF4D00] relative backdrop-blur-3xl"
      >
        <div className="lg:col-span-5 relative overflow-hidden rounded-[2rem] bg-gradient-to-tr from-[#1C0902] via-[#080402] to-black p-6 sm:p-8 lg:p-10 border border-white/10 flex flex-col justify-between min-h-[300px] sm:min-h-[340px] lg:min-h-[620px]">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] font-display font-black text-[8rem] leading-none uppercase select-none text-transparent stroke-white stroke-2 flex flex-col justify-between py-12">
            <span className="-translate-x-7 tracking-tighter">LOCAL</span>
            <span className="translate-x-10 tracking-tighter">ENTRY</span>
          </div>
          <div className="absolute -top-32 -left-32 w-[350px] h-[350px] rounded-full bg-[#FF4D00]/15 blur-[90px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#FF4D00]/5 blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" prefetch={true} className="font-display font-black text-2xl tracking-tighter uppercase text-white hover:text-[#FF4D00] transition-colors">
              SKILL<span className="text-[#FF4D00]">SWAP</span>
            </Link>
            <div className="px-3 py-1 border border-[#FF4D00]/25 rounded-full font-mono text-[8px] font-black uppercase tracking-widest text-[#FF4D00] bg-[#FF4D00]/5">
              INVITE GATE
            </div>
          </div>

          <div className="relative z-10 py-8 lg:py-0 space-y-5 lg:space-y-6">
            <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-7xl uppercase tracking-tight leading-[0.85] text-white">
              JOIN<br />
              THE<br />
              SWAP.
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-widest leading-relaxed text-white/40 max-w-sm font-bold">
              No cash. No tokens. Just a trusted invite into the skill exchange around your block.
            </p>
          </div>

          <Link
            href="/"
            prefetch={true}
            className="relative z-10 inline-flex items-center gap-2 text-[10px] font-mono font-black uppercase tracking-widest text-white/45 hover:text-[#FF4D00] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
        </div>

        <div className="lg:col-span-7 flex items-center justify-center p-2 sm:p-6">
          <div className="w-full max-w-xl relative text-center">
            <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2rem] bg-[#FF4D00] pointer-events-none" />
            <div className="relative bg-black border-2 border-white/10 rounded-[2rem] p-6 sm:p-10 shadow-2xl overflow-hidden">
              <div className="relative z-10">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="min-h-[440px] flex flex-col items-center justify-center gap-7"
                    >
                      <div className="w-14 h-14 rounded-xl bg-[#FF4D00] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_#FFFFFF]">
                        <Layers className="w-6 h-6 text-black stroke-[2.5px]" />
                      </div>
                      <div className="space-y-2 text-center select-none">
                        <h3 className="font-display font-black text-3xl text-white uppercase tracking-tight">Validating Invite</h3>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#FF4D00] font-bold">Synchronizing neighbor handshake...</p>
                      </div>
                      <div className="flex items-center justify-center gap-12 h-16 relative w-48 border-2 border-black rounded-xl bg-black px-4 shadow-[4px_4px_0px_#FF4D00] select-none">
                        <motion.div animate={{ y: [-12, 12, -12] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} className="w-1.5 h-7 bg-[#FF4D00] rounded-full shrink-0" />
                        <motion.div animate={{ x: [-48, 48, -48], y: [-6, 6, -6] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="w-3 h-3 bg-white rounded-full shadow-[0_0_8px_#FF4D00] shrink-0" />
                        <motion.div animate={{ y: [12, -12, 12] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} className="w-1.5 h-7 bg-[#FF4D00] rounded-full shrink-0" />
                      </div>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="min-h-[440px] flex flex-col items-center justify-center gap-7"
                    >
                      <div className="w-16 h-16 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-400 flex items-center justify-center shadow-[4px_4px_0px_#FF4D00]">
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <div className="space-y-3">
                        <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight leading-none text-white">
                          Invitation Issue
                        </h1>
                        <p className="text-white/55 text-sm font-semibold leading-relaxed max-w-sm mx-auto">
                          {error}
                        </p>
                      </div>
                      <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white hover:bg-[#FF4D00] text-black font-mono font-black text-[11px] uppercase tracking-wider rounded-xl border-2 border-black transition-all shadow-[4px_4px_0px_#FF4D00] hover:shadow-[4px_4px_0px_#FFFFFF] active:scale-95"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Go to Homepage
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      initial="hidden"
                      animate="visible"
                      variants={FADE_UP}
                      className="space-y-7"
                    >
                      <div className="w-16 h-16 rounded-xl bg-[#FF4D00] border-2 border-black text-black flex items-center justify-center mx-auto shadow-[4px_4px_0px_#FFFFFF]">
                        <UserPlus className="w-7 h-7 stroke-[2.5px]" />
                      </div>

                      <div className="space-y-4">
                        <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight leading-none text-white">
                          <SplitText
                            text="You're Invited!"
                            className="text-white inline-block"
                            delay={40}
                            duration={0.6}
                            ease="power3.out"
                            textAlign="center"
                            tag="span"
                          />
                        </h1>
                        <p className="text-white/55 text-sm font-semibold max-w-md mx-auto leading-relaxed">
                          {hostName ? (
                            <>
                              <span className="text-white font-black">{hostName}</span> has invited you to join their local skill-swapping community.
                            </>
                          ) : (
                            "A neighbor has invited you to join their local skill-swapping community."
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <div className="bg-[#09090b] border-2 border-white/10 rounded-2xl p-5 hover:border-[#FF4D00]/60 transition-colors">
                          <div className="flex items-center justify-between mb-5">
                            <span className="text-[9px] font-mono font-black text-white/40 tracking-widest uppercase">Neighborhood PIN</span>
                            <div className="w-8 h-8 rounded bg-[#FF4D00]/10 flex items-center justify-center text-[#FF4D00] border border-[#FF4D00]/20">
                              <MapPin className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="font-display font-black text-2xl text-white uppercase tracking-tight">
                            {invite.pin_code || "Global"}
                          </div>
                        </div>

                        <div className="bg-[#09090b] border-2 border-white/10 rounded-2xl p-5 hover:border-[#FF4D00]/60 transition-colors">
                          <div className="flex items-center justify-between mb-5">
                            <span className="text-[9px] font-mono font-black text-white/40 tracking-widest uppercase">Posts in PIN</span>
                            <div className="w-8 h-8 rounded bg-[#FF4D00]/10 flex items-center justify-center text-[#FF4D00] border border-[#FF4D00]/20">
                              <Users className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="font-display font-black text-xl text-white uppercase tracking-tight">
                            {postCount ?? 0} Posts
                          </div>
                          <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider pt-1.5">Active neighborhood proposals</div>
                        </div>
                      </div>

                      <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full py-4 px-4 bg-[#FF4D00] hover:bg-white disabled:opacity-50 text-black font-mono font-black text-[11px] uppercase tracking-wider rounded-xl border-2 border-black transition-all shadow-[6px_6px_0px_#FFFFFF] hover:shadow-none active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                      >
                        {joining ? (
                          <>
                            <Loader2 className="w-4.5 h-4.5 animate-spin text-black shrink-0" />
                            <span>Joining Neighborhood...</span>
                          </>
                        ) : (
                          <>
                            <span>Join Neighborhood</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider leading-relaxed">
                        Joining connects you to neighbors using PIN code <span className="font-black text-[#FF4D00]">{invite.pin_code}</span>.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
