'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Profil() {
  const router = useRouter()
  const [participant, setParticipant] = useState(null)
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | saving | error
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function loadParticipant() {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('participants')
        .select('participant_id, nickname, avatar_url')
        .eq('access_token', token)
        .single()

      if (error || !data) {
        router.push('/')
        return
      }

      setParticipant(data)
      setNickname(data.nickname)
      setAvatarUrl(data.avatar_url)
      setStatus('ready')
    }

    loadParticipant()
  }, [])

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!nickname.trim()) return
    setStatus('saving')

    let newAvatarUrl = avatarUrl

    // Upload avatar if a new file was selected
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${participant.participant_id}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true })

      if (uploadError) {
        console.error('Avatar upload failed:', uploadError)
        // Don't block — continue without avatar
      } else {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        newAvatarUrl = urlData.publicUrl
      }
    }

    // Update participant record
    const { error: updateError } = await supabase
      .from('participants')
      .update({ nickname: nickname.trim(), avatar_url: newAvatarUrl })
      .eq('participant_id', participant.participant_id)

    if (updateError) {
      setStatus('error')
      return
    }

    router.push('/bieres')
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-6xl">🍺</div>
      </main>
    )
  }

  const displayAvatar = avatarPreview || avatarUrl

  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍺</div>
          <h1 className="text-2xl font-bold text-amber-900">Ton profil</h1>
          <p className="text-amber-600 mt-1 text-sm">Confirme ton pseudo et ajoute une photo</p>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={() => fileInputRef.current.click()}
            className="w-24 h-24 rounded-full bg-amber-200 border-4 border-amber-400 overflow-hidden flex items-center justify-center hover:border-amber-500 transition-colors"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">😀</span>
            )}
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            className="mt-2 text-sm text-amber-700 underline"
          >
            {displayAvatar ? 'Changer la photo' : 'Ajouter une photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Nickname */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-amber-800 mb-1">Pseudo</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-amber-900 bg-white focus:outline-none focus:border-amber-500 text-lg text-center"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={status === 'saving' || !nickname.trim()}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {status === 'saving' ? 'Enregistrement...' : "C'est parti ! 🍺"}
        </button>

        {status === 'error' && (
          <p className="text-red-600 text-center mt-4 text-sm">
            Une erreur est survenue. Réessaie.
          </p>
        )}

      </div>
    </main>
  )
}