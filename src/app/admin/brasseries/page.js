'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminBrasseries() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  // Unlock dialog
  const [unlockTarget, setUnlockTarget] = useState(null) // { brewery, beer, isOutOfOrder }

  // Edit form
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
  const { data: ed } = await supabase
    .from('editions')
    .select('edition_id')
    .eq('is_active', true)
    .single()

  if (!ed) return

  const { data: beers } = await supabase
    .from('beers')
    .select('beer_id, name, style, abv, description, is_unlocked, visit_order, breweries(brewery_id, name, logo_url)')
    .eq('edition_id', ed.edition_id)
    .order('visit_order', { ascending: true })

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

  // ── Unlock ────────────────────────────────────────────────
  function handleUnlockClick(brewery, beer, index) {
    const isOutOfOrder = rows.slice(0, index).some((r) => r.beer && !r.beer.is_unlocked)
    setUnlockTarget({ brewery, beer, isOutOfOrder })
  }

  async function confirmUnlock() {
    const { beer } = unlockTarget
    const { error } = await supabase
      .from('beers')
      .update({ is_unlocked: true })
      .eq('beer_id', beer.beer_id)

    if (!error) {
      setRows((prev) =>
        prev.map((r) =>
          r.beer?.beer_id === beer.beer_id
            ? { ...r, beer: { ...r.beer, is_unlocked: true } }
            : r
        )
      )
    }
    setUnlockTarget(null)
  }

  // ── Edit ──────────────────────────────────────────────────
  function startEdit(beer) {
    setEditingId(beer.beer_id)
    setEditForm({
      name: beer.name || '',
      style: beer.style || '',
      abv: beer.abv ?? '',
      description: beer.description || '',
    })
  }

  async function saveEdit(beerId) {
    setSaving(true)
    const { error } = await supabase
      .from('beers')
      .update({
        name: editForm.name.trim(),
        style: editForm.style.trim(),
        abv: editForm.abv !== '' ? parseFloat(editForm.abv) : null,
        description: editForm.description.trim(),
      })
      .eq('beer_id', beerId)

    if (!error) {
      setRows((prev) =>
        prev.map((r) =>
          r.beer?.beer_id === beerId
            ? {
                ...r,
                beer: {
                  ...r.beer,
                  name: editForm.name.trim(),
                  style: editForm.style.trim(),
                  abv: editForm.abv !== '' ? parseFloat(editForm.abv) : null,
                  description: editForm.description.trim(),
                },
              }
            : r
        )
      )
      setEditingId(null)
    }
    setSaving(false)
  }

  // ─────────────────────────────────────────────────────────
  if (loading) {
    return <div className="p-4 text-amber-800 text-sm text-center mt-8">Chargement...</div>
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-10 pt-5">
      <h1 className="text-xl font-bold text-amber-900 mb-4">🍺 Brasseries</h1>

      <div className="space-y-3">
        {rows.map(({ brewery, beer }, index) => {
          const isEditing = editingId === beer?.beer_id
          const isUnlocked = beer?.is_unlocked

          return (
            <div
              key={brewery.brewery_id}
              className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden"
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {brewery.visit_order}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900 truncate">{brewery.name}</p>
                  <p className="text-sm text-amber-700 truncate">
                    {beer?.name || <span className="italic text-amber-400">Bière non renseignée</span>}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                    isUnlocked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isUnlocked ? '🔓 Débloquée' : '🔒 Verrouillée'}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 px-4 pb-3">
                {!isUnlocked && beer && (
                  <button
                    onClick={() => handleUnlockClick(brewery, beer, index)}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                  >
                    🔓 Débloquer
                  </button>
                )}
                {beer && !isEditing && (
                  <button
                    onClick={() => startEdit(beer)}
                    className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-semibold py-2 rounded-xl transition-colors"
                  >
                    ✏️ Modifier
                  </button>
                )}
              </div>

              {/* Inline edit form */}
              {isEditing && beer && (
                <div className="border-t border-amber-100 px-4 py-3 space-y-2 bg-amber-50">
                  <label className="block">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                      Nom de la bière
                    </span>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="mt-1 w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Ex: La Gallia IPA"
                    />
                  </label>

                  <div className="flex gap-2">
                    <label className="flex-1 block">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        Style
                      </span>
                      <input
                        type="text"
                        value={editForm.style}
                        onChange={(e) => setEditForm({ ...editForm, style: e.target.value })}
                        className="mt-1 w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="IPA, Stout..."
                      />
                    </label>
                    <label className="w-24 block">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                        ABV (%)
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={editForm.abv}
                        onChange={(e) => setEditForm({ ...editForm, abv: e.target.value })}
                        className="mt-1 w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="5.5"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                      Description
                    </span>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="mt-1 w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                      placeholder="Notes de brasseur, arômes..."
                    />
                  </label>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => saveEdit(beer.beer_id)}
                      disabled={saving}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Enregistrement...' : '✅ Enregistrer'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2 rounded-xl transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Unlock confirmation dialog */}
      {unlockTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            {unlockTarget.isOutOfOrder && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-4 text-sm text-orange-700">
                ⚠️ <strong>Attention :</strong> l'étape précédente n'est pas encore débloquée.
              </div>
            )}
            <h3 className="text-base font-bold text-amber-900 mb-1">
              Débloquer — Étape {unlockTarget.brewery.visit_order}
            </h3>
            <p className="text-sm text-amber-700 mb-2">
              <span className="font-semibold">{unlockTarget.brewery.name}</span>
              {unlockTarget.beer?.name ? ` · ${unlockTarget.beer.name}` : ''}
            </p>
            <p className="text-sm text-gray-500 mb-5">
              Cette brasserie sera visible par tous les participants. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setUnlockTarget(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmUnlock}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                🔓 Débloquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}