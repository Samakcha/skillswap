import { createClient } from '@/lib/supabase'

export type PlanName = 'Free' | 'Plus' | 'Pro'

export async function getUserPlan(userId: string): Promise<PlanName> {
  const supabase = createClient()
  const { data } = await (supabase
    .from('subscriptions') as any)
    .select('plan_name, status')
    .eq('user_id', userId)
    .single()

  if (!data || data.status !== 'active') return 'Free'
  return data.plan_name as PlanName
}

export function isPlus(plan: PlanName): boolean {
  return plan === 'Plus' || plan === 'Pro'
}

export function isPro(plan: PlanName): boolean {
  return plan === 'Pro'
}

export const PLAN_LIMITS = {
  Free: {
    savedPosts: 10,
    mediaPerPost: 3,
    announcementsPerWeek: 3,
  },
  Plus: {
    savedPosts: Infinity,
    mediaPerPost: Infinity,
    announcementsPerWeek: Infinity,
  },
  Pro: {
    savedPosts: Infinity,
    mediaPerPost: Infinity,
    announcementsPerWeek: Infinity,
  }
}