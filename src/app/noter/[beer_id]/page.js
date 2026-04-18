'use client'

import { useParams, useRouter } from 'next/navigation'

export default function NoterPage() {
  const { beer_id } = useParams()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6 gap-4">
      <p className="text-4xl">🚧</p>
      <p className="text-gray-600 text-center">
        Fiche de dégustation à venir.
      </p>
      <p className="text-xs text-gray-400">beer_id: {beer_id}</p>
      <button
        onClick={() => router.back()}
        className="mt-4 bg-amber-600 text-white px-6 py-2 rounded-full font-semibold"
      >
        ← Retour
      </button>
    </div>
  )
}