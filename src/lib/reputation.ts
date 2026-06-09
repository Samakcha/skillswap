import { createClient } from './supabase'

export interface ProfileCompletenessInput {
  avatar_url?: string | null
  bio?: string | null
  skills_offered?: string[] | null
  skills_needed?: string[] | null
  availability?: string | null
  availability_slots?: any
  neighborhood?: string | null
}

export interface SkillScoreInput {
  completedSwapsCount: number
  averageRating: number
  totalReviewsCount: number
  responseRate: number // fraction between 0.0 and 1.0
  announcementLikesCount: number
  postsCreatedCount: number
  completenessInput: ProfileCompletenessInput
  likesReceivedCount: number
}

/**
 * Derives the city name from a pin code or neighborhood.
 */
export function getCityFromLocation(pinCode: string | null, neighborhood: string | null): string {
  const code = (pinCode || '').trim()
  const nh = (neighborhood || '').toLowerCase()
  
  if (code.startsWith('560') || nh.includes('bengaluru') || nh.includes('bangalore') || nh.includes('rajarajeshwari')) {
    return 'Bengaluru'
  }
  if (code.startsWith('110') || nh.includes('delhi')) {
    return 'New Delhi'
  }
  if (code.startsWith('400') || nh.includes('mumbai') || nh.includes('bombay')) {
    return 'Mumbai'
  }
  if (code.startsWith('600') || nh.includes('chennai') || nh.includes('madras')) {
    return 'Chennai'
  }
  if (code.startsWith('700') || nh.includes('kolkata') || nh.includes('calcutta')) {
    return 'Kolkata'
  }
  return 'Bengaluru' // Default to Bengaluru since it is the primary city in the platform seed data
}

/**
 * Calculates profile completeness percentage (0 to 100).
 */
export function calculateProfileCompleteness(profile: ProfileCompletenessInput): number {
  let count = 0
  const totalFields = 6

  // 1. Profile photo
  if (profile.avatar_url && profile.avatar_url.trim().length > 0) {
    count++
  }
  // 2. Bio
  if (profile.bio && profile.bio.trim().length > 0) {
    count++
  }
  // 3. Teaching skills
  if (Array.isArray(profile.skills_offered) && profile.skills_offered.filter(Boolean).length > 0) {
    count++
  }
  // 4. Learning skills
  if (Array.isArray(profile.skills_needed) && profile.skills_needed.filter(Boolean).length > 0) {
    count++
  }
  // 5. Availability
  const hasTextAvailability = !!(profile.availability && profile.availability.trim().length > 0)
  const hasSlotAvailability = profile.availability_slots && typeof profile.availability_slots === 'object' &&
    Object.values(profile.availability_slots).some((daySlots: any) => Array.isArray(daySlots) && daySlots.length > 0)
  if (hasTextAvailability || hasSlotAvailability) {
    count++
  }
  // 6. Neighborhood info
  if (profile.neighborhood && profile.neighborhood.trim().length > 0) {
    count++
  }

  return Math.min(100, Math.round((count / totalFields) * 100))
}

/**
 * Calculates the Response Rate from messages list.
 */
export function calculateResponseRate(incoming: any[], outgoing: any[], targetUserId: string): number {
  if (!incoming || incoming.length === 0) {
    return 0.8 // Neutral baseline of 80% if no messages received yet
  }

  // Define a conversation as a unique pair of post_id and partner (sender)
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
    return 0.8 // Baseline
  }

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

  return repliedCount / totalConversations
}

/**
 * Core reputation algorithm for calculating SkillScore.
 */
export function calculateSkillScore(input: SkillScoreInput): number {
  // 1. Completed Swaps (50% = 500 max)
  // 10 points per completed swap, capping at 50 swaps
  const swapScore = Math.min(500, input.completedSwapsCount * 10)

  // 2. Review Quality (25% = 250 max)
  // Bayesian average confidence weighted: rating scaled by reviewsCount/(reviewsCount+3)
  const reviewScore = input.totalReviewsCount > 0
    ? 250 * (input.averageRating / 5) * (input.totalReviewsCount / (input.totalReviewsCount + 3))
    : 0

  // 3. Response Rate (15% = 150 max)
  // Piecewise boost/penalty
  const R = input.responseRate
  let responseScore = 0
  if (R >= 0.9) {
    responseScore = 150
  } else if (R >= 0.5) {
    responseScore = 50 + 100 * (R - 0.5) / 0.4
  } else {
    responseScore = 50 * (R / 0.5)
  }

  // 4. Community Participation (5% = 50 max)
  // announcement likes (2 pts each) + posts created (5 pts each)
  const communityScore = Math.min(50, (input.announcementLikesCount * 2) + (input.postsCreatedCount * 5))

  // 5. Likes + Profile Quality (5% = 50 max)
  // Profile completeness (max 40 pts) + post likes received (max 10 pts, 1 pt per like)
  const completenessPct = calculateProfileCompleteness(input.completenessInput)
  const completenessPoints = (completenessPct / 100) * 40
  const likesPoints = Math.min(10, input.likesReceivedCount * 1)
  const profilePlusLikesScore = completenessPoints + likesPoints

  const total = Math.round(swapScore + reviewScore + responseScore + communityScore + profilePlusLikesScore)
  return Math.min(1000, Math.max(0, total))
}

/**
 * Returns reputation tier based on SkillScore.
 */
export function getReputationTier(score: number): string {
  if (score >= 800) return 'Neighborhood Legend'
  if (score >= 600) return 'Community Mentor'
  if (score >= 400) return 'Trusted Neighbor'
  if (score >= 200) return 'Active Swapper'
  return 'New Swapper'
}

/**
 * Calculates in-memory local ranks for all users.
 */
export interface ScoredUser {
  userId: string
  fullName: string
  neighborhood: string | null
  pinCode: string | null
  city: string
  score: number
  tier: string
  completedSwapsCount: number
  averageRating: number
  totalReviewsCount: number
}

export function computeLocalRanks(users: ScoredUser[], targetUserId: string) {
  const targetUser = users.find(u => u.userId === targetUserId)
  if (!targetUser) {
    return { neighborhoodRank: 1, neighborhoodTotal: 1, cityRank: 1, cityTotal: 1, globalRank: 1, globalTotal: 1 }
  }

  const sortedUsers = [...users].sort((a, b) => b.score - a.score)
  const globalRank = sortedUsers.findIndex(u => u.userId === targetUserId) + 1

  // Neighborhood Rank
  const neighborhoodUsers = sortedUsers.filter(u => u.pinCode === targetUser.pinCode || u.neighborhood === targetUser.neighborhood)
  const neighborhoodRank = neighborhoodUsers.findIndex(u => u.userId === targetUserId) + 1

  // City Rank
  const cityUsers = sortedUsers.filter(u => u.city === targetUser.city)
  const cityRank = cityUsers.findIndex(u => u.userId === targetUserId) + 1

  return {
    neighborhoodRank,
    neighborhoodTotal: neighborhoodUsers.length,
    cityRank,
    cityTotal: cityUsers.length,
    globalRank,
    globalTotal: sortedUsers.length
  }
}

/**
 * Single-user data loader that fetches all metrics from Supabase and calculates SkillScore.
 */
export async function getUserSkillScoreDetails(supabase: any, userId: string) {
  try {
    const [profileRes, postsRes, reviewsRes, incomingRes, outgoingRes, announcementLikesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('posts').select('id, is_active, likes(user_id)').eq('user_id', userId) as any,
      supabase.from('reviews').select('rating').eq('reviewed_id', userId),
      supabase.from('messages').select('post_id, sender_id').eq('receiver_id', userId) as any,
      supabase.from('messages').select('post_id, sender_id').eq('sender_id', userId) as any,
      supabase.from('announcement_likes').select('id').eq('user_id', userId) as any
    ])

    if (profileRes.error || !profileRes.data) {
      return null
    }

    const profile = profileRes.data
    const posts = postsRes.data || []
    const reviews = reviewsRes.data || []
    const incoming = incomingRes.data || []
    const outgoing = outgoingRes.data || []
    const announcementLikes = announcementLikesRes.data || []

    const completedSwapsCount = posts.filter((p: any) => p.is_active === false).length
    const postsCreatedCount = posts.length
    const likesReceivedCount = posts.reduce((sum: number, p: any) => sum + (p.likes?.length || 0), 0)

    const totalReviewsCount = reviews.length
    const totalRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0)
    const averageRating = totalReviewsCount > 0 ? totalRating / totalReviewsCount : 0

    const responseRate = calculateResponseRate(incoming, outgoing, userId)

    const completenessInput: ProfileCompletenessInput = {
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      skills_offered: profile.skills_offered,
      skills_needed: profile.skills_needed,
      availability: profile.availability,
      availability_slots: profile.availability_slots,
      neighborhood: profile.neighborhood
    }

    const score = calculateSkillScore({
      completedSwapsCount,
      averageRating,
      totalReviewsCount,
      responseRate,
      announcementLikesCount: announcementLikes.length,
      postsCreatedCount,
      completenessInput,
      likesReceivedCount
    })

    const tier = getReputationTier(score)

    return {
      score,
      tier,
      completedSwapsCount,
      averageRating,
      totalReviewsCount,
      responseRate,
      announcementLikesCount: announcementLikes.length,
      likesReceivedCount,
      profile,
      city: getCityFromLocation(profile.pin_code, profile.neighborhood)
    }
  } catch (err) {
    console.error('Error in getUserSkillScoreDetails:', err)
    return null
  }
}

/**
 * Bulk reputation calculator for multiple users (ideal for leaderboards and feeds).
 */
export async function getBulkSkillScoreDetails(supabase: any, profiles: any[]) {
  if (!profiles || profiles.length === 0) return []

  const profileIds = profiles.map(p => p.id)

  try {
    const [postsRes, reviewsRes, incomingRes, outgoingRes, announcementLikesRes] = await Promise.all([
      supabase.from('posts').select('id, user_id, is_active, created_at, likes(user_id)').in('user_id', profileIds) as any,
      supabase.from('reviews').select('reviewed_id, rating, created_at').in('reviewed_id', profileIds) as any,
      supabase.from('messages').select('post_id, sender_id, receiver_id').in('receiver_id', profileIds) as any,
      supabase.from('messages').select('post_id, sender_id, receiver_id').in('sender_id', profileIds) as any,
      supabase.from('announcement_likes').select('id, user_id').in('user_id', profileIds) as any
    ])

    const postsData = postsRes.data || []
    const reviewsData = reviewsRes.data || []
    const incomingData = incomingRes.data || []
    const outgoingData = outgoingRes.data || []
    const announcementLikesData = announcementLikesRes.data || []

    return profiles.map(profile => {
      const userPosts = postsData.filter((p: any) => p.user_id === profile.id)
      const userReviews = reviewsData.filter((r: any) => r.reviewed_id === profile.id)
      const userIncoming = incomingData.filter((m: any) => m.receiver_id === profile.id)
      const userOutgoing = outgoingData.filter((m: any) => m.sender_id === profile.id)
      const userAnnLikes = announcementLikesData.filter((l: any) => l.user_id === profile.id)

      const completedSwapsCount = userPosts.filter((p: any) => p.is_active === false).length
      const postsCreatedCount = userPosts.length
      const likesReceivedCount = userPosts.reduce((sum: number, p: any) => sum + (p.likes?.length || 0), 0)

      const totalReviewsCount = userReviews.length
      const totalRating = userReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0)
      const averageRating = totalReviewsCount > 0 ? totalRating / totalReviewsCount : 0

      const responseRate = calculateResponseRate(userIncoming, userOutgoing, profile.id)

      const completenessInput: ProfileCompletenessInput = {
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        skills_offered: profile.skills_offered,
        skills_needed: profile.skills_needed,
        availability: profile.availability,
        availability_slots: profile.availability_slots,
        neighborhood: profile.neighborhood
      }

      const score = calculateSkillScore({
        completedSwapsCount,
        averageRating,
        totalReviewsCount,
        responseRate,
        announcementLikesCount: userAnnLikes.length,
        postsCreatedCount,
        completenessInput,
        likesReceivedCount
      })

      const tier = getReputationTier(score)
      const city = getCityFromLocation(profile.pin_code, profile.neighborhood)

      // Calculate recent/monthly score (only including events in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()
      const recentSwapsCount = userPosts.filter((p: any) => p.is_active === false && new Date(p.created_at || Date.now()).getTime() >= thirtyDaysAgo).length
      const recentReviews = userReviews.filter((r: any) => new Date(r.created_at || Date.now()).getTime() >= thirtyDaysAgo)
      const recentReviewsCount = recentReviews.length
      const recentTotalRating = recentReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0)
      const recentAverageRating = recentReviewsCount > 0 ? recentTotalRating / recentReviewsCount : 0

      const monthlyScore = calculateSkillScore({
        completedSwapsCount: recentSwapsCount,
        averageRating: recentAverageRating,
        totalReviewsCount: recentReviewsCount,
        responseRate, // response rate remains stable
        announcementLikesCount: userAnnLikes.length, // historical community action remains
        postsCreatedCount: userPosts.filter((p: any) => new Date(p.created_at || Date.now()).getTime() >= thirtyDaysAgo).length,
        completenessInput,
        likesReceivedCount
      })

      return {
        userId: profile.id,
        fullName: profile.full_name || 'Neighbor',
        neighborhood: profile.neighborhood,
        pinCode: profile.pin_code,
        city,
        score,
        monthlyScore,
        tier,
        completedSwapsCount,
        averageRating,
        totalReviewsCount,
        avatar_url: profile.avatar_url
      }
    })
  } catch (err) {
    console.error('Error in getBulkSkillScoreDetails:', err)
    return []
  }
}
