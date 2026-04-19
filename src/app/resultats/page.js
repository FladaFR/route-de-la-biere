'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar'

// ─── Score computation ────────────────────────────────────────────────────────

function computeScores(beers, rankings, myParticipantId) {
  const byParticipant = {}
  for (const r of rankings) {
    if (!byParticipant[r.participant_id]) byParticipant[r.participant_id] = []
    byParticipant[r.participant_id].push(r)
  }

  const beerScores = {}
  for (const [pid, pRankings] of Object.entries(byParticipant)) {
    const total = pRankings.length
    for (const r of pRankings) {
      if (!beerScores[r.beer_id]) beerScores[r.beer_id] = []
      const norm = total === 1 ? 0.5 : (total - r.rank_position) / (total - 1)
      beerScores[r.beer_id].push(norm)
    }
  }

  const myRankings = (byParticipant[myParticipantId] || []).reduce((acc, r) => {
    acc[r.beer_id] = r.rank_position
    return acc
  }, {})

  const enriched = beers.map(beer => {
    const scores = beerScores[beer.beer_id] || []
    const avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    return {
      ...beer,
      avgScore,
      voterCount: scores.length,
      myPosition: myRankings[beer.beer_id] ?? null,
    }
  })

  enriched.sort((a, b) => {
    if (a.avgScore !== null && b.avgScore !== null) return b.avgScore - a.avgScore
    if (a.avgScore !== null) return -1
    if (b.avgScore !== null) return 1
    return a.name.localeCompare(b.name)
  })

  return enriched
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreBar({ score }) {
  if (score === null)
    return <span className="text-xs text-gray-400 italic">Pas encore classé</span>
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-9 text-right">{pct}%</span>
    </div>
  )
}

function PositionBadge({ position }) {
  if (position === null) return null
  return (
    <span className="text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 whitespace-nowrap">
      Mon #{position}
    </span>
  )
}

function MedalEmoji({ rank }) {
  if (rank === 1) return <span className="text-xl">🥇</span>
  if (rank === 2) return <span className="text-xl">🥈</span>
  if (rank === 3) return <span className="text-xl">🥉</span>
  return (
    <span className="w-7 text-center text-sm font-bold text-gray-500 tabular-nums">
      {rank}
    </span>
  )
}

function BreweryLogo({ logoUrl, name }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
      />
    )
  }
  return (
    <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
      <span className="text-lg">🍺</span>
    </div>
  )
}

// ─── Detail bottom sheet ─────────────────────────────────────────────────────

function DetailSheet({ beer, onClose }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!beer) return
    async function loadNotes() {
      setLoading(true)
      const { data } = await supabase
        .from('ratings')
        .select('public_note, participants(nickname, avatar_url)')
        .eq('beer_id', beer.beer_id)
        .not('public_note', 'is', null)
        .neq('public_note', '')
      setNotes(data || [])
      setLoading(false)
    }
    loadNotes()
  }, [beer])

  if (!beer) return null
  const brewery = beer.breweries

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-16 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="overflow-y-auto flex-1 pb-8">
          {/* Beer header */}
          <div className="px-5 pt-2 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <BreweryLogo logoUrl={brewery?.logo_url} name={brewery?.name} />
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  {brewery?.name}
                </p>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{beer.name}</h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {beer.style && (
                <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1">
                  {beer.style}
                </span>
              )}
              {beer.abv && (
                <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-3 py-1 font-medium">
                  {beer.abv}% ABV
                </span>
              )}
              {beer.voterCount > 0 && (
                <span className="text-xs bg-green-50 text-green-700 rounded-full px-3 py-1">
                  {beer.voterCount} vote{beer.voterCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Public notes */}
          <div className="px-5 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Notes publiques</h3>
            {loading ? (
              <p className="text-sm text-gray-400 italic">Chargement…</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                Aucune note publique pour cette bière.
              </p>
            ) : (
              <div className="space-y-3">
                {notes.map((n, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="shrink-0">
                      {n.participants?.avatar_url ? (
                        <img
                          src={n.participants.avatar_url}
                          alt={n.participants.nickname}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm">
                          🍺
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">
                        {n.participants?.nickname ?? 'Anonyme'}
                      </p>
                      <p className="text-sm text-gray-800 leading-snug">{n.public_note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── States ──────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="text-4xl animate-bounce">🍺</div>
      <p className="text-gray-400 text-sm">Calcul du classement…</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-4">
      <div className="text-5xl">🔒</div>
      <h2 className="text-lg font-semibold text-gray-700">Pas encore de brasseries débloquées</h2>
      <p className="text-sm text-gray-400 leading-relaxed">
        Le classement général apparaîtra dès que la première brasserie sera débloquée par l'admin.
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-4">
      <div className="text-4xl">⚠️</div>
      <p className="text-sm text-gray-600">{message}</p>
      <button
        onClick={onRetry}
        className="bg-amber-500 text-white px-5 py-2 rounded-full text-sm font-medium"
      >
        Réessayer
      </button>
    </div>
  )
}

// ─── Beer list ───────────────────────────────────────────────────────────────

function BeerList({ beers, onSelect }) {
  return (
    <ul className="divide-y divide-gray-100 bg-white">
      {beers.map((beer, index) => {
        const rank = index + 1
        return (
          <li key={beer.beer_id}>
            <button
              className="w-full text-left px-4 py-3.5 flex items-center gap-3 active:bg-amber-50 transition-colors"
              onClick={() => onSelect(beer)}
            >
              <div className="shrink-0 w-7 flex justify-center">
                <MedalEmoji rank={rank} />
              </div>
              <BreweryLogo logoUrl={beer.breweries?.logo_url} name={beer.breweries?.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 truncate leading-tight">
                      {beer.breweries?.name}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                      {beer.name}
                    </p>
                  </div>
                  <PositionBadge position={beer.myPosition} />
                </div>
                <div className="mt-1.5">
                  <ScoreBar score={beer.avgScore} />
                </div>
              </div>
              <span className="text-gray-300 text-sm shrink-0">›</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ResultatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rankedBeers, setRankedBeers] = useState([])
  const [selectedBeer, setSelectedBeer] = useState(null)

  const init = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/'); return }

    const { data: participant, error: authErr } = await supabase
      .from('participants')
      .select('participant_id, nickname, edition_id')
      .eq('access_token', token)
      .single()

    if (authErr || !participant) { router.push('/'); return }

    const { data: beers, error: beersErr } = await supabase
      .from('beers')
      .select('beer_id, name, style, abv, breweries(brewery_id, name, logo_url)')
      .eq('edition_id', participant.edition_id)
      .eq('is_unlocked', true)

    if (beersErr) {
      setError('Impossible de charger les bières.')
      setLoading(false)
      return
    }

    if (!beers || beers.length === 0) {
      setRankedBeers([])
      setLoading(false)
      return
    }

    const { data: rankings } = await supabase
      .from('rankings')
      .select('participant_id, beer_id, rank_position')
      .eq('edition_id', participant.edition_id)

    const scored = computeScores(beers, rankings || [], participant.participant_id)
    setRankedBeers(scored)
    setLoading(false)
  }, [router])

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-amber-600 text-white px-4 py-4 sticky top-0 z-30 shadow-md">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-xl font-bold">🏆 Classement Général</h1>
      {!loading && rankedBeers.length > 0 && (
        <p className="text-amber-100 text-sm mt-0.5">
          {rankedBeers.length} brasserie{rankedBeers.length > 1 ? 's' : ''} débloquée{rankedBeers.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  </div>
</header>

      <main className="flex-1 pb-24">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={init} />
        ) : rankedBeers.length === 0 ? (
          <EmptyState />
        ) : (
          <BeerList beers={rankedBeers} onSelect={setSelectedBeer} />
        )}
      </main>

      {selectedBeer && (
        <DetailSheet beer={selectedBeer} onClose={() => setSelectedBeer(null)} />
      )}

      <NavBar active="resultats" />
    </div>
  )
}