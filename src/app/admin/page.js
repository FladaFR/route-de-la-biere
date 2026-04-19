'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [edition, setEdition] = useState(null)
  const [stats, setStats] = useState({ unlocked: 0, total: 0, participants: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
  const { data: ed } = await supabase
    .from('editions')
    .select('edition_id')
    .eq('is_active', true)
    .single()
console.log('edition:', ed, edError)
  if (!ed) return

  const { data: beers } = await supabase
    .from('beers')
    .select('beer_id, name, style, abv, description, is_unlocked, visit_order, breweries(brewery_id, name, logo_url)')
    .eq('edition_id', ed.edition_id)
    .order('visit_order', { ascending: true })
console.log('beers:', beers, beersError)
  setRows(
    (beers || []).map((beer) => ({
      brewery: beer.breweries,
      beer: {
        beer_id: beer.beer_id,
        name: beer.name,
        style: beer.style,
        abv: beer.abv,
        description: beer.description,
        is_unlocked: beer.is_unlocked,
        visit_order: beer.visit_order,
      },
    }))
  )
  setLoading(false)
}

    load()
  }, [])

  if (loading) {
    return (
      <div className="p-4 text-amber-800 text-sm text-center mt-8">
        Chargement...
      </div>
    )
  }

  const dateLabel = edition?.group_date
    ? new Date(edition.group_date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pt-5">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
        <h2 className="text-lg font-bold text-amber-900">{edition?.name}</h2>
        <p className="text-sm text-amber-700 capitalize mt-0.5">{dateLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
          <p className="text-3xl font-bold text-amber-600">
            {stats.unlocked}
            <span className="text-lg font-normal text-amber-400">/{stats.total}</span>
          </p>
          <p className="text-xs text-amber-800 mt-1 leading-tight">
            Brasseries<br />débloquées
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats.participants}</p>
          <p className="text-xs text-amber-800 mt-1 leading-tight">
            Participants<br />actifs
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <Link
          href="/admin/brasseries"
          className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-2xl p-4 text-center font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <span>🍺</span>
          <span>Gérer les Brasseries</span>
        </Link>
        <Link
          href="/admin/participants"
          className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-2xl p-4 text-center font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <span>👥</span>
          <span>Gérer les Participants</span>
        </Link>
      </div>
    </div>
  )
}