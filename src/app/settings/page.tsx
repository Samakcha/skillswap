'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/profile/edit')
  }, [router])

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center font-sans">
      <div className="text-center space-y-4">
        <div className="text-white/40 font-mono text-[10px] uppercase tracking-widest animate-pulse">
          Redirecting to profile settings...
        </div>
      </div>
    </div>
  )
}
