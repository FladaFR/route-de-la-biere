import { Suspense } from 'react'
import TokenHandler from './TokenHandler'

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <div className="text-6xl mb-6">🍺</div>
      <p className="text-amber-800 text-lg font-medium">Chargement...</p>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TokenHandler />
    </Suspense>
  )
}