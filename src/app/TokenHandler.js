'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TokenHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('loading') // loading | redirecting | invalid | no_token

  useEffect(() => {
    async function identify() {
      // Priorité 1 : token dans l'URL. Priorité 2 : token sauvegardé.
      const urlToken = searchParams.get('token')
      const token = urlToken || localStorage.getItem('biere_token')

      if (!token) {
        setStatus('no_token')
        return
      }

      // Étape 1 : récupérer l'édition active
      const { data: edition, error: editionError } = await supabase
        .from('editions')
        .select('edition_id')
        .eq('is_active', true)
        .single()

      if (editionError || !edition) {
        setStatus('invalid')
        return
      }

      // Étape 2 : trouver le participant avec ce token dans cette édition
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('participant_id, nickname, is_admin')
        .eq('access_token', token)
        .eq('edition_id', edition.edition_id)
        .single()

      if (participantError || !participant) {
        localStorage.removeItem('biere_token') // Nettoyer si token périmé
        setStatus('invalid')
        return
      }

      // ✅ Token valid! Save and redirect.
localStorage.setItem('biere_token', token)
setStatus('redirecting')

// First visit (token from URL) → profile setup
// Returning visit (token from localStorage) → beer list
if (urlToken) {
  router.push('/profil')
} else {
  router.push('/bieres')
}
    }

    identify()
  }, [])

  // --- États visuels ---

  if (status === 'loading' || status === 'redirecting') {
    return (
      <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-6">🍺</div>
        <p className="text-amber-800 text-lg font-medium">
          {status === 'redirecting' ? 'Identification réussie, redirection...' : 'Chargement...'}
        </p>
      </main>
    )
  }

  if (status === 'invalid') {
    return (
      <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold text-amber-900 mb-3">Lien invalide</h1>
        <p className="text-amber-700 max-w-xs">
          Ce lien ne correspond à aucun participant de la Route de la Bière en cours.
          Vérifie le lien reçu ou contacte l'organisateur.
        </p>
      </main>
    )
  }

  // status === 'no_token'
  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-6">🍺</div>
      <h1 className="text-2xl font-bold text-amber-900 mb-3">Route de la Bière</h1>
      <p className="text-amber-700 max-w-xs">
        Pour accéder à l'application, utilise le lien personnel qui t'a été envoyé par l'organisateur.
      </p>
    </main>
  )
}