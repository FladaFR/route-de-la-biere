import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('test').select('*')

  if (error) return <p>Connection failed: {error.message}</p>
  return <p>Bienvenue à l'app de La Route de la Biere! 🎉</p>
}