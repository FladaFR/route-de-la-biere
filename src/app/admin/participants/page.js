'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

function generateToken() {
  const rand = Math.random().toString(36).slice(2, 9)
  return `runner-${rand}`
}

function QrCode({ url }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!url || !canvasRef.current) return
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#78350f', light: '#fffbeb' },
      })
    })
  }, [url])

  return <canvas ref={canvasRef} className="rounded-xl mx-auto block" />
}

export default function AdminParticipants() {
  const [participants, setParticipants] = useState([])
  const [editionId, setEditionId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [toggleTarget, setToggleTarget] = useState(null)
  const [newParticipant, setNewParticipant] = useState(null) // { token, url }
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: ed } = await supabase
        .from('editions')
        .select('edition_id')
        .eq('is_active', true)
        .single()

      if (!ed) return
      setEditionId(ed.edition_id)

      const { data } = await supabase
        .from('participants')
        .select('participant_id, nickname, is_admin, avatar_url, access_token')
        .eq('edition_id', ed.edition_id)
        .order('nickname', { ascending: true, nullsFirst: false })

      setParticipants(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function confirmToggleAdmin() {
    const { participant } = toggleTarget
    const newValue = !participant.is_admin

    const { error } = await supabase
      .from('participants')
      .update({ is_admin: newValue })
      .eq('participant_id', participant.participant_id)

    if (!error) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.participant_id === participant.participant_id
            ? { ...p, is_admin: newValue }
            : p
        )
      )
    }
    setToggleTarget(null)
  }

  async function addParticipant() {
    if (!editionId || creating) return
    setCreating(true)

    const token = generateToken()
    const base = typeof window !== 'undefined' ? window.location.origin : ''

    const { data, error } = await supabase
      .from('participants')
      .insert({ edition_id: editionId, access_token: token, is_admin: false })
      .select()
      .single()

    if (!error && data) {
      setParticipants((prev) => [...prev, data])
      setNewParticipant({ token, url: `${base}/?token=${token}` })
    }
    setCreating(false)
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(newParticipant.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="p-4 text-amber-800 text-sm text-center mt-8">Chargement...</div>
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-10 pt-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-amber-900">👥 Participants</h1>
        <button
          onClick={addParticipant}
          disabled={creating}
          className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {creating ? '...' : '+ Ajouter'}
        </button>
      </div>

      <div className="space-y-2">
        {participants.map((p) => (
          <div
            key={p.participant_id}
            className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-amber-100 flex items-center gap-3"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.nickname || '?'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-amber-600 font-bold text-base">
                  {p.nickname ? p.nickname[0].toUpperCase() : '?'}
                </span>
              )}
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 truncate">
                {p.nickname || (
                  <span className="italic text-amber-400 font-normal">En attente…</span>
                )}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {p.is_admin && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                    ⚙️ Admin
                  </span>
                )}
                {!p.nickname && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Lien non activé
                  </span>
                )}
              </div>
            </div>

{/* See link */}
<button
  onClick={() => setNewParticipant({
    token: p.access_token,
    url: `${window.location.origin}/?token=${p.access_token}`,
  })}
  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex-shrink-0"
>
  🔗
</button>
            {/* Toggle admin */}
            <button
              onClick={() => setToggleTarget({ participant: p })}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${
                p.is_admin
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {p.is_admin ? 'Retirer admin' : 'Rendre admin'}
            </button>
          </div>
        ))}
      </div>

      {/* New participant bottom sheet */}
      {newParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-base font-bold text-amber-900">🎉 Nouveau participant</h3>
            <p className="text-sm text-gray-600">
              Partagez ce lien ou faites scanner le QR code. Le participant choisira son pseudo à la première connexion.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
              <p className="text-xs font-mono text-amber-800 flex-1 break-all leading-snug">
                {newParticipant.url}
              </p>
              <button
                onClick={copyUrl}
                className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? '✅ Copié' : '📋 Copier'}
              </button>
            </div>

            <div className="bg-amber-50 rounded-xl p-3">
              <QrCode url={newParticipant.url} />
              <p className="text-xs text-center text-amber-600 mt-2">
                Scanner pour rejoindre la Route 🍺
              </p>
            </div>

            <button
              onClick={() => { setNewParticipant(null); setCopied(false) }}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Toggle admin confirmation */}
      {toggleTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-amber-900 mb-2">
              {toggleTarget.participant.is_admin ? 'Retirer les droits admin' : 'Accorder les droits admin'}
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {toggleTarget.participant.is_admin
                ? `${toggleTarget.participant.nickname || 'Ce participant'} n'aura plus accès au panneau admin.`
                : `${toggleTarget.participant.nickname || 'Ce participant'} pourra accéder au panneau admin et débloquer des brasseries.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setToggleTarget(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmToggleAdmin}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}