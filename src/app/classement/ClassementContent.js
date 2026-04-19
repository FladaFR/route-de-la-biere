'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'
import NavBar from '@/components/NavBar';

export default function ClassementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newBeerId = searchParams.get('newBeer');

  const [rankedBeers, setRankedBeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [participantId, setParticipantId] = useState(null);
  const [editionId, setEditionId] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── 1. Identify participant ──────────────────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('access_token');
      if (!token) { router.replace('/'); return; }

      const { data: participant, error: pErr } = await supabase
        .from('participants')
        .select('participant_id, edition_id')
        .eq('access_token', token)
        .single();

      if (pErr || !participant) { router.replace('/'); return; }
      setParticipantId(participant.participant_id);
      setEditionId(participant.edition_id);
    }
    bootstrap();
  }, [router]);

  // ── 2. Load rankings ─────────────────────────────────────────────────────────
  const loadRankings = useCallback(async (pId, eId) => {
    
    const { data: tested, error: tErr } = await supabase
      .from('ratings')
      .select(`
        beer_id,
        note_etoiles,
        beers (
          beer_id, name,
          breweries ( name, logo_url )
        )
      `)
      .eq('participant_id', pId)
      .eq('is_tested', true);
console.log('pId:', pId)
console.log('tested:', tested, 'error:', tErr)
    if (tErr) { setError('Impossible de charger tes bières.'); setLoading(false); return; }
    if (!tested || tested.length === 0) { setRankedBeers([]); setLoading(false); return; }

    const { data: rankings } = await supabase
      .from('rankings')
      .select('ranking_id, beer_id, rank_position')
      .eq('participant_id', pId)
      .eq('edition_id', eId)
      .order('rank_position', { ascending: true });
console.log('rankings:', rankings)
    const rankMap = {};
    (rankings || []).forEach(r => { rankMap[r.beer_id] = r; });

    // Insert missing ranking rows (beers tested but not yet in rankings)
    const testedIds = tested.map(t => t.beer_id);
    const unrankedIds = testedIds.filter(id => !rankMap[id]);

    if (unrankedIds.length > 0) {
      const currentMax = rankings && rankings.length > 0
        ? Math.max(...rankings.map(r => r.rank_position))
        : 0;

      const toInsert = unrankedIds.map((id, i) => ({
        participant_id: pId,
        edition_id: eId,
        beer_id: id,
        rank_position: currentMax + i + 1,
      }));

      const { data: inserted } = await supabase
        .from('rankings')
        .insert(toInsert)
        .select('ranking_id, beer_id, rank_position');

      (inserted || []).forEach(r => { rankMap[r.beer_id] = r; });
    }

    const testedMap = {};
    tested.forEach(t => { testedMap[t.beer_id] = t; });

    const ordered = Object.values(rankMap)
      .sort((a, b) => a.rank_position - b.rank_position)
      .map(r => ({
        ranking_id: r.ranking_id,
        beer_id: r.beer_id,
        rank_position: r.rank_position,
        beer_name: testedMap[r.beer_id]?.beers?.name,
        brewery_name: testedMap[r.beer_id]?.beers?.breweries?.name,
        logo_url: testedMap[r.beer_id]?.beers?.breweries?.logo_url,
        note_etoiles: testedMap[r.beer_id]?.note_etoiles,
      }))
      .filter(r => r.beer_name);

    setRankedBeers(ordered);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (participantId && editionId) loadRankings(participantId, editionId);
  }, [participantId, editionId, loadRankings]);

  async function swap(indexA, indexB) {
  const beerA = rankedBeers[indexA];
  const beerB = rankedBeers[indexB];

  const updated = [...rankedBeers];
  updated[indexA] = { ...beerA, rank_position: beerB.rank_position };
  updated[indexB] = { ...beerB, rank_position: beerA.rank_position };
  updated.sort((a, b) => a.rank_position - b.rank_position);
  setRankedBeers(updated);
}

async function saveRankings() {
  setSaving(true);
  await Promise.all(
    rankedBeers.map((beer, index) =>
      supabase
        .from('rankings')
        .update({ rank_position: index + 1 })
        .eq('ranking_id', beer.ranking_id)
    )
  );
  setSaving(false);
}

  const moveUp   = (i) => { if (i > 0) swap(i, i - 1); };
  const moveDown = (i) => { if (i < rankedBeers.length - 1) swap(i, i + 1); };

  // ── 4. Stars ─────────────────────────────────────────────────────────────────
  function renderStars(n) {
    if (!n) return <span className="text-gray-300 text-sm">—</span>;
    return (
      <span className="text-amber-400 text-sm tracking-tight">
        {'★'.repeat(n)}{'☆'.repeat(5 - n)}
      </span>
    );
  }

  // ── 5. Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-amber-700 text-lg animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center px-6">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-24">

      <div className="bg-amber-600 text-white px-4 pt-10 pb-5 shadow-md">
        <h1 className="text-2xl font-bold tracking-tight">📋 Mon Classement</h1>
        {rankedBeers.length > 0 && (
          <p className="text-amber-100 text-sm mt-1">
            {rankedBeers.length} bière{rankedBeers.length > 1 ? 's' : ''} classée{rankedBeers.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {rankedBeers.length === 0 && (
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <span className="text-6xl mb-4">🍺</span>
          <p className="text-gray-600 text-lg leading-relaxed">
            Tes bières classées apparaîtront ici après ta première dégustation
          </p>
          <button
            onClick={() => router.push('/bieres')}
            className="mt-8 bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold shadow-md active:scale-95 transition-transform"
          >
            Voir les bières
          </button>
        </div>
      )}

      {rankedBeers.length > 0 && (
  <div className="px-4 pt-4">
    <button
      onClick={saveRankings}
      disabled={saving}
      className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold shadow-md disabled:opacity-50 active:scale-95 transition-transform"
    >
      {saving ? 'Enregistrement…' : '💾 Enregistrer mon classement'}
    </button>
  </div>
)}

{rankedBeers.length > 0 && (
  <div className="px-4 pt-3 space-y-3">
          {rankedBeers.map((beer, index) => {
            const isNew    = beer.beer_id === newBeerId;
            const isSaving = savingId === beer.beer_id;

            return (
              <div
                key={beer.beer_id}
                className={`
                  flex items-center gap-3 bg-white rounded-2xl shadow-sm px-3 py-3 border
                  transition-all duration-200
                  ${isNew    ? 'border-amber-400 ring-2 ring-amber-300' : 'border-transparent'}
                  ${isSaving ? 'opacity-60' : 'opacity-100'}
                `}
              >
                {/* Position badge */}
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-amber-700 font-bold text-sm">{index + 1}</span>
                </div>

                {/* Brewery logo */}
                {beer.logo_url ? (
                  <img
                    src={beer.logo_url}
                    alt={beer.brewery_name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-gray-400 text-lg">🏭</span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 truncate">{beer.brewery_name}</p>
                  <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{beer.beer_name}</p>
                  <div className="mt-0.5">{renderStars(beer.note_etoiles)}</div>
                </div>

                {/* ▲ / ▼ */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0 || isSaving}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold transition-colors active:scale-90
                      ${index === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                    aria-label="Monter"
                  >▲</button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === rankedBeers.length - 1 || isSaving}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold transition-colors active:scale-90
                      ${index === rankedBeers.length - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                    aria-label="Descendre"
                  >▼</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NavBar active="classement" />
    </div>
  );
}