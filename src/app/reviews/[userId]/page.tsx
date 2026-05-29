'use client'

import { createClient } from '@/lib/supabase'
import SplitText from '@/components/SplitText'
import CardSwap from '@/components/CardSwap'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Check, 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  Layers, 
  Sparkles, 
  Star,
  Users,
  Compass,
  Award
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
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
}

export default function ReviewPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const reviewedId = params.userId as string
  const postId = searchParams.get('post')

  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reviewedProfile, setReviewedProfile] = useState<any>(null)

  useEffect(() => {
    async function loadReviewedProfile() {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', reviewedId)
          .single()
        setReviewedProfile(profile)
      } catch (err) {
        console.error('Error loading reviewed profile:', err)
      }
    }
    loadReviewedProfile()
  }, [reviewedId])

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to leave a review.')
        setLoading(false)
        return
      }

      if (rating === 0) {
        setError('Please select a rating of at least 1 star.')
        setLoading(false)
        return
      }

      const { error } = await (supabase.from('reviews') as any).insert({
        reviewer_id: user.id,
        reviewed_id: reviewedId,
        post_id: postId || null,
        rating,
        comment: comment.trim(),
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Trigger automatic notification for the reviewed user
      try {
        const { data: reviewerProfile } = await (supabase
          .from('profiles') as any)
          .select('full_name')
          .eq('id', user.id)
          .single()
        const reviewerName = (reviewerProfile as any)?.full_name || user.user_metadata?.full_name || 'A neighbor'

        await (supabase.from('notifications') as any).insert({
          user_id: reviewedId,
          type: 'review',
          message: `${reviewerName} left you a review`,
          is_read: false,
          related_post_id: postId || null,
          related_user_id: user.id
        })
      } catch (notifErr) {
        console.error('Failed to send review notification:', notifErr)
      }

      if (postId) {
        try {
          // 1. Mark all messages for this post sent to the current user as read
          await (supabase
            .from('messages') as any)
            .update({ is_read: true })
            .eq('post_id', postId)
            .eq('receiver_id', user.id)

          // 2. Fetch all reviews for this post to check if both users submitted reviews
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select('id')
            .eq('post_id', postId)
          
          // 3. If both reviews are submitted, delete the messages to clean up database
          if (!reviewsError && reviewsData && reviewsData.length >= 2) {
            await (supabase
              .from('messages') as any)
              .delete()
              .eq('post_id', postId)
          }
        } catch (dbErr) {
          console.error('Failed to perform review verification and cleanup:', dbErr)
        }
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  // Get qualitative rating text helper
  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1: return 'Needs Improvement'
      case 2: return 'Fair swap'
      case 3: return 'Good swap & friendly'
      case 4: return 'Great experience!'
      case 5: return 'Exceptional swapping!'
      default: return 'Select a rating'
    }
  }

  return (
    <main className="min-h-screen bg-theme-bg text-gray-100 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-[#FF4D00]/30 selection:text-white relative overflow-hidden w-full">
      
      {/* Cyber Tech Blueprint Grid Overlay */}
      <div className="absolute inset-0 skillswap-grid-bg pointer-events-none z-0" />

      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] max-w-[85vw] max-h-[85vw] rounded-full bg-[#FF4D00]/5 blur-[140px] pointer-events-none z-0" />

      {/* Main Responsive Split Panel */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 bg-black border-2 border-white/10 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 backdrop-blur-2xl z-10 shadow-[8px_8px_0px_rgba(255,77,0,0.12)] hover:shadow-[8px_8px_0px_#FF4D00] transition-shadow duration-300 relative">
        
        {/* LEFT COLUMN: Sidebar Info Console */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-[2rem] bg-[#09090b] p-8 sm:p-10 border border-white/[0.08] flex flex-col justify-between min-h-[500px] lg:min-h-[620px] group shadow-inner">
          {/* Local Blueprint Grid */}
          <div className="absolute inset-0 skillswap-grid-bg skillswap-grid-bg-sm pointer-events-none z-0" />
          
          {/* Auras */}
          <div className="absolute -top-32 -left-32 w-[350px] h-[350px] rounded-full bg-[#FF4D00]/10 blur-[90px] pointer-events-none group-hover:bg-[#FF4D00]/15 transition-all duration-700" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#FF4D00]/5 blur-[80px] pointer-events-none" />

          {/* Info Content */}
          <div className="relative z-10 space-y-10">
            {/* Brand Logo Text Link */}
            <span 
              onClick={() => router.push('/dashboard')} 
              className="font-display font-black text-xl uppercase tracking-tighter cursor-pointer select-none text-white hover:text-[#FF4D00] transition-colors duration-300"
            >
              SKILL<span className="text-[#FF4D00]">SWAP</span>
            </span>

            {/* Welcome Titles */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF4D00]/30 rounded-full font-mono text-[9px] font-bold text-[#FF4D00] uppercase tracking-wider bg-[#FF4D00]/5 select-none">
                <Sparkles className="w-3.5 h-3.5 text-[#FF4D00] animate-pulse" />
                <span>Build Swapping Stars</span>
              </div>
              <h2 className="font-display font-black text-white text-[2rem] leading-[1.05] tracking-tight uppercase">
                Review your <br />
                <span className="text-[#FF4D00]">local swap.</span>
              </h2>
              <p className="text-white/40 text-xs font-mono uppercase tracking-wide leading-relaxed">
                Feedback preserves the integrity, safety, and reputational trust of our neighborhood directory list.
              </p>
            </div>

            {/* Premium Interactive Live Preview */}
            <div className="flex-1 flex items-center justify-center py-4 scale-90 sm:scale-95 lg:scale-100 relative">
              <CardSwap 
                delay={4200}
                cardDistance={20}
                verticalDistance={18}
                skewAmount={1.5}
                pauseOnHover={true}
                interactiveButtons={false}
              />
            </div>

          </div>

          {/* Footer Back Button */}
          <div className="relative z-10 pt-6">
            <button 
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to dashboard</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Review Form Panel */}
        <div className="lg:col-span-7 flex flex-col justify-center px-2 py-4 sm:p-6 lg:p-8 relative z-10">
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={CONTAINER_STAGGER}
            className="w-full max-w-lg mx-auto space-y-7"
          >
            
            {/* Header Titles */}
            <motion.div variants={FADE_UP} className="space-y-1.5">
              <h1 className="font-display font-black text-3xl sm:text-4xl leading-[0.9] text-white tracking-tight uppercase">
                <SplitText
                  text={`Rate ${reviewedProfile?.full_name || 'Your Neighbor'}`}
                  className="text-[#FF4D00] inline-block"
                  delay={40}
                  duration={0.6}
                  ease="power3.out"
                  textAlign="left"
                  tag="span"
                />
              </h1>
              <p className="text-white/40 text-xs font-mono uppercase tracking-wide">
                Rate your swap experience and add supportive comments to help build their local stars.
              </p>
            </motion.div>

            {/* Profile Setup Form */}
            <motion.form variants={FADE_UP} onSubmit={handleSubmit} className="space-y-5">
              
              {/* Errors Display */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Star Rating Interactive Input */}
              <div className="space-y-3.5 rounded-xl bg-[#09090b] border border-white/10 p-5 focus-within:border-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                  Select Rating
                </label>
                
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map(star => {
                    const isActive = star <= (hoveredRating || rating)
                    
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 focus:outline-none transition-all hover:scale-115 active:scale-95 cursor-pointer"
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star 
                          className={`w-9 h-9 stroke-[1.5px] transition-all duration-300 ${
                            isActive 
                              ? 'fill-[#FF4D00] text-[#FF4D00] drop-shadow-[0_0_8px_rgba(255,77,0,0.45)]' 
                              : 'text-white/20 hover:text-[#FF4D00]/50'
                          }`}
                        />
                      </button>
                    )
                  })}

                  <div className="h-6 w-px bg-white/10 mx-2" />

                  {/* Rating Qualitative Label */}
                  <div className="text-[10px] font-mono font-black uppercase text-[#FF4D00] tracking-wider transition-all">
                    {getRatingText(hoveredRating || rating)}
                  </div>
                </div>
              </div>

              {/* Review Comment Textarea */}
              <div className="space-y-2">
                <label htmlFor="comment" className="block text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                  Share Your Experience <span className="text-white/25 font-normal">(optional)</span>
                </label>
                <div className="relative group rounded-xl bg-[#09090b] border border-white/10 focus-within:border-[#FF4D00] focus-within:ring-1 focus-within:ring-[#FF4D00] focus-within:shadow-[4px_4px_0px_#FF4D00] transition-all duration-200">
                  <textarea
                    id="comment"
                    rows={4}
                    placeholder="Tell others how the skill swap went! e.g., 'Sam taught me acoustic chords and was incredibly patient. Sourdough baking swap went successfully!'"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-4 py-3.5 bg-transparent border-0 text-white placeholder-white/20 text-xs font-mono font-bold tracking-wider focus:outline-none resize-none animate-fadeIn"
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="py-3.5 px-4 bg-black hover:bg-[#161618] text-white/50 hover:text-white border-2 border-white/10 hover:border-white/20 font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center shadow-[2px_2px_0px_rgba(255,255,255,0.05)] hover:shadow-none"
                >
                  Cancel
                </button>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="py-3.5 px-4 bg-[#FF4D00] hover:bg-white text-black font-mono font-black text-[11px] uppercase tracking-wider rounded-xl transition-all border-2 border-black shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin text-black shrink-0" />
                      <span>Saving Review...</span>
                    </>
                  ) : (
                    <span>Submit Review</span>
                  )}
                </button>

              </div>

            </motion.form>

          </motion.div>

        </div>
      </div>
    </main>
  )
}