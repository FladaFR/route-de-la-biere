'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAdmin() {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/')
        return
      }

      const { data: edition } = await supabase
        .from('editions')
        .select('edition_id')
        .eq('is_active', true)
        .single()

      if (!edition) {
        router.replace('/bieres')
        return
      }

      const { data: participant } = await supabase
        .from('participants')
        .select('is_admin')
        .eq('access_token', token)
        .eq('edition_id', edition.edition_id)
        .single()

      if (!participant?.is_admin) {
        router.replace('/bieres')
        return
      }

      setChecking(false)
    }

    checkAdmin()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-amber-800 text-sm">Vérification des droits...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <Link
          href="/bieres"
          className="text-sm font-medium opacity-90 hover:opacity-100 transition-opacity"
        >
          ← Retour à la Route
        </Link>
        <span className="font-bold tracking-wide">⚙️ Admin</span>
      </header>
      {children}
    </div>
  )
}