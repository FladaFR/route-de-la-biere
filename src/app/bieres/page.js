'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BieresPage() {
  const router = useRouter()
  const [beers, setBeers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [counts, setCounts] = useState({ rated: 0, toRate: 0 })

  useEffect(() => {
    async function load() {
      // 1. Get token from localStorage
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.replace('/')
        return
      }

      // 2. Validate token + get participant (only if edition is active)
      const { data: participant, error: pError } = await supabase
  .from('participants')
  .select('participant_id, edition_id, nickname, editions(is_active)')
  .eq('access_token', token)
  .single()

console.log('participant:', participant, 'error:', pError)

if (pError || !participant || !participant.editions?.is_active) {
  localStorage.removeItem('access_token')
  router.replace('/')
  return
}

      // 3. Fetch beers for this edition, with brewery name
      const { data: beersData, error: beersError } = await supabase
        .from('beers')
        .select('beer_id, name, style, abv, is_unlocked, visit_order, breweries(name)')
        .eq('edition_id', participant.edition_id)
        .order('visit_order', { ascending: true })

      if (beersError) {
        setError('Impossible de charger les bières.')
        setLoading(false)
        return
      }

      // 4. Fetch this participant's ratings (just beer_id is enough)
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('beer_id')
        .eq('participant_id', participant.participant_id)

      const ratedIds = new Set((ratingsData || []).map(r => r.beer_id))

      // 5. Compute status per beer
      const enriched = (beersData || []).map(beer => ({
        ...beer,
        status: !beer.is_unlocked
          ? 'locked'
          : ratedIds.has(beer.beer_id)
          ? 'rated'
          : 'to_rate',
      }))

      setCounts({
        rated: enriched.filter(b => b.status === 'rated').length,
        toRate: enriched.filter(b => b.status === 'to_rate').length,
      })
      setBeers(enriched)
      setLoading(false)
    }

    load()
  }, [router])

  function handleTap(beer) {
    if (beer.status === 'locked') {
      // Subtle visual feedback — nothing to navigate to
      return
    }
    router.push(`/noter/${beer.beer_id}`)
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-amber-700 text-lg animate-pulse">Chargement des bières... 🍺</p>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-amber-50 pb-24">
      {/* Sticky header */}
      <div className="bg-amber-600 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold">🍺 Mes Bières</h1>
        <p className="text-amber-100 text-sm mt-0.5">
          {counts.rated} notée{counts.rated !== 1 ? 's' : ''}
          {counts.toRate > 0 && ` · ${counts.toRate} à noter`}
        </p>
      </div>

      {/* Beer cards */}
      <div className="p-4 space-y-3">
        {beers.map((beer, i) => (
          <BeerCard
            key={beer.beer_id}
            beer={beer}
            visitNumber={i + 1}
            onTap={() => handleTap(beer)}
          />
        ))}
      </div>
    </div>
  )
}

// ── BeerCard component ───────────────────────────────────────

function BeerCard({ beer, visitNumber, onTap }) {
  const isLocked = beer.status === 'locked'
  const isRated  = beer.status === 'rated'
  const isToRate = beer.status === 'to_rate'

  const cardStyle = isLocked
    ? 'bg-gray-100 border border-gray-200 opacity-55 cursor-default'
    : isRated
    ? 'bg-white border-2 border-green-400 shadow-sm active:opacity-80 cursor-pointer'
    : 'bg-white border-2 border-amber-400 shadow-md active:opacity-80 cursor-pointer'

  const numberStyle = isLocked
    ? 'bg-gray-200 text-gray-400'
    : isRated
    ? 'bg-green-100 text-green-700'
    : 'bg-amber-100 text-amber-700'

  const breweryStyle = isLocked ? 'text-gray-400' : 'text-gray-800'
  const beerStyle    = isLocked ? 'text-gray-400' : 'text-gray-500'

  const badge = isLocked ? '🔒' : isRated ? '✅' : '⭐'

  return (
    <div
      onClick={onTap}
      className={`rounded-xl p-4 flex items-center gap-3 transition-opacity ${cardStyle}`}
    >
      {/* Visit order bubble */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${numberStyle}`}>
        {visitNumber}
      </div>

      {/* Names */}
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-base leading-tight truncate ${breweryStyle}`}>
          {beer.breweries?.name ?? '—'}
        </p>
        <p className={`text-sm truncate mt-0.5 ${beerStyle}`}>
          {[beer.name, beer.style, beer.abv ? `${beer.abv}%` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {/* Status badge */}
      <span className="text-2xl flex-shrink-0">{badge}</span>
    </div>
  )
}