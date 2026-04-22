'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StarSlider from '@/components/StarSlider'

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'aspect',  label: 'Aspect', emoji: '👁️' },
  { key: 'nez',     label: 'Nez',    emoji: '👃' },
  { key: 'bouche',  label: 'Bouche', emoji: '👄' },
  { key: 'general', label: 'Général',emoji: '⭐' },
]

const BEER_COLORS = [
  { value: 1,  hex: '#F9E84C' },
  { value: 2,  hex: '#F5C518' },
  { value: 3,  hex: '#F0A500' },
  { value: 4,  hex: '#E07800' },
  { value: 5,  hex: '#C85A00' },
  { value: 6,  hex: '#A03800' },
  { value: 7,  hex: '#782000' },
  { value: 8,  hex: '#4E0D00' },
  { value: 9,  hex: '#2A0500' },
  { value: 10, hex: '#0A0000' },
]

const INTENSITY_LABELS = {
  1: 'Très faible', 2: 'Faible', 3: 'Moyenne', 4: 'Intense', 5: 'Très intense'
}

const AROMA_GROUPS = [
  { label: 'Malt',    items: ['Pain', 'Biscuit', 'Caramel', 'Café', 'Chocolat'] },
  { label: 'Houblon', items: ['Herbes', 'Agrumes', 'Résine', 'Fruits', 'Florales'] },
  { label: 'Levure',  items: ['Épices', 'Banane', 'Clou de girofle', 'Phénols'] },
  { label: 'Autres',  items: ['Boisé', 'Fumé', 'Alcool', 'Terreux', 'Cuir', 'Vanille', 'Miel'] },
]

const INTENSITY_OPTIONS = [
  { value: 1, label: 'Légère' },
  { value: 2, label: 'Moyenne' },
  { value: 3, label: 'Intense' },
]

const EMPTY_FORM = {
  couleur: null,
  clarte: null,
  mousse: null,
  effervescence: null,
  commentaire_aspect: '',
  familles_aromatiques: [],
  intensite_nez: null,
  commentaire_nez: '',
  attaque: null,
  equilibre: [],        // was null
  corps: [],            // was null
  longueur_bouche: null,
  commentaire_bouche: '',
  note_etoiles: null,
  notes_libres: '',
  public_note: '',
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NotePage() {
  const router = useRouter()
  const { beer_id: beerId } = useParams()

  const [status, setStatus]       = useState('loading') // loading | ready | saving | error
  const [participant, setParticipant] = useState(null)
  const [beer, setBeer]           = useState(null)
  const [brewery, setBrewery]     = useState(null)
  const [options, setOptions]     = useState({}) // { category: [option, ...] }
  const [step, setStep]           = useState(0)
  const [ratingId, setRatingId]   = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)

  // ─── Load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('access_token')
      if (!token) { router.push('/'); return }

      // Participant
      const { data: part, error: partErr } = await supabase
        .from('participants')
        .select('participant_id, nickname')
        .eq('access_token', token)
        .single()
      if (partErr || !part) { router.push('/'); return }
      setParticipant(part)

      // Beer + brewery
      const { data: beerData, error: beerErr } = await supabase
        .from('beers')
        .select('*, breweries(*)')
        .eq('beer_id', beerId)
        .single()

console.log('beer_id:', beerId)
console.log('beerData:', beerData, 'beerErr:', beerErr)

      if (beerErr || !beerData) { router.push('/bieres'); return }
      if (!beerData.is_unlocked) { router.push('/bieres'); return }
      setBeer(beerData)
      setBrewery(beerData.breweries)

      // Rating options grouped by category
      const { data: opts } = await supabase
        .from('rating_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      const grouped = {}
      ;(opts || []).forEach(o => {
        if (!grouped[o.category]) grouped[o.category] = []
        grouped[o.category].push(o)
      })
      setOptions(grouped)

      // Existing rating (draft or final)
      const { data: existing } = await supabase
        .from('ratings')
        .select('*')
        .eq('participant_id', part.participant_id)
        .eq('beer_id', beerId)
        .maybeSingle()

      if (existing) {
        setRatingId(existing.rating_id)
        setForm({
          couleur: existing.couleur != null ? Number(existing.couleur) : null,
          clarte:              existing.clarte     ?? null,
          mousse:              existing.mousse     ?? null,
          effervescence:       existing.effervescence ?? null,
          commentaire_aspect:  existing.commentaire_aspect  || '',
          familles_aromatiques: existing.familles_aromatiques || [],
          intensite_nez:       existing.intensite_nez ?? null,
          commentaire_nez:     existing.commentaire_nez || '',
          // Unwrap JSONB singles
          attaque:             existing.attaque?.option_id       ?? null,
          equilibre: existing.equilibre || [],
corps:     existing.corps     || [],
          longueur_bouche:     existing.longueur_bouche?.option_id ?? null,
          commentaire_bouche:  existing.commentaire_bouche || '',
          note_etoiles:        existing.note_etoiles ?? null,
          notes_libres:        existing.notes_libres || '',
          public_note:         existing.public_note  || '',
        })
      }

      setStatus('ready')
    }
    load()
  }, [beerId])

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleArray(field, optionId) {
    setForm(prev => {
      const arr = prev[field] || []
      return {
        ...prev,
        [field]: arr.includes(optionId)
          ? arr.filter(v => v !== optionId)
          : [...arr, optionId],
      }
    })
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function save(isFinal = false) {
    if (!participant) return false
    setStatus('saving')

    const payload = {
      participant_id: participant.participant_id,
      beer_id: beerId,
      is_tested: isFinal,
      // Aspect
      couleur:            form.couleur,
      clarte:             form.clarte,
      mousse:             form.mousse,
      effervescence:      form.effervescence,
      commentaire_aspect: form.commentaire_aspect || null,
      // Nez
      familles_aromatiques: form.familles_aromatiques,
      intensite_nez:      form.intensite_nez,
      commentaire_nez:    form.commentaire_nez || null,
      // Bouche — wrap JSONB singles
      attaque:        form.attaque       ? { option_id: form.attaque }       : null,
      equilibre: form.equilibre?.length ? form.equilibre : null,
corps:     form.corps?.length     ? form.corps     : null,
      longueur_bouche: form.longueur_bouche
                        ? { option_id: form.longueur_bouche } : null,
      commentaire_bouche: form.commentaire_bouche || null,
      // Général
      note_etoiles: form.note_etoiles,
      notes_libres: form.notes_libres || null,
      public_note:  form.public_note  || null,
    }

    let error = null

    if (ratingId) {
      const { error: e } = await supabase
        .from('ratings')
        .update(payload)
        .eq('rating_id', ratingId)
      error = e
    } else {
      const { data: inserted, error: e } = await supabase
        .from('ratings')
        .insert(payload)
        .select('rating_id')
        .single()
      if (inserted) setRatingId(inserted.rating_id)
      error = e
    }

    if (error) { setStatus('error'); return false }
    setStatus('ready')
    return true
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async function handleNext() {
    const ok = await save(false)
    if (ok) setStep(s => s + 1)
  }

  async function handleBack() {
    setStep(s => s - 1)
  }

  async function handleSubmit() {
    const ok = await save(true)
    if (ok) router.push('/bieres')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-amber-700 animate-pulse text-lg">Chargement…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 gap-4 p-6">
        <p className="text-red-600 text-center">Une erreur est survenue. Vérifie ta connexion.</p>
        <button
          onClick={() => setStatus('ready')}
          className="px-5 py-2 bg-amber-700 text-white rounded-xl"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">

      {/* ── Header ── */}
<div className="bg-amber-800 text-white sticky top-0 z-10">
  
  {/* Top bar — back + draft status */}
  <div className="flex items-center gap-3 px-4 pt-3 pb-2">
    <button
      onClick={() => router.push('/bieres')}
      className="text-amber-200 text-xl leading-none shrink-0"
      aria-label="Retour"
    >
      ←
    </button>
    <span className="text-xs text-amber-300 ml-auto shrink-0">
      {ratingId ? '💾 Brouillon sauvegardé' : ''}
    </span>
  </div>

  {/* Beer info card */}
  <div className="px-4 pb-4 flex gap-3 items-start">
    
    {/* Brewery logo */}
    {brewery?.logo_url ? (
      <img
        src={brewery.logo_url}
        alt={brewery.name}
        className="w-14 h-14 rounded-xl object-contain bg-white p-1 shrink-0"
      />
    ) : (
      <div className="w-14 h-14 rounded-xl bg-amber-700 flex items-center justify-center shrink-0">
        <span className="text-2xl">🍺</span>
      </div>
    )}

    {/* Text info */}
    <div className="flex-1 min-w-0">
      {/* Brewery name */}
      <p className="text-xs text-amber-300 font-medium uppercase tracking-wide truncate">
        {brewery?.name}
      </p>
      {/* Beer name + ABV */}
      <p className="text-xl font-bold leading-tight">
        {beer?.name}
        {beer?.abv && (
          <span className="text-sm font-normal text-amber-300 ml-2">
            {beer.abv} % ABV
          </span>
        )}
      </p>
      {/* Style */}
      {beer?.style && (
        <p className="text-xs text-amber-400 mt-0.5">{beer.style}</p>
      )}
      {/* Description */}
      {beer?.description && (
        <p className="text-xs text-amber-200 mt-1.5 leading-relaxed line-clamp-3">
          "{beer.description}"
        </p>
      )}
    </div>

  </div>
</div>

      
      {/* ── Form body ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {step === 0 && (
          <StepAspect
            form={form}
            setField={setField}
            options={options}
          />
        )}
        {step === 1 && (
          <StepNez
            form={form}
            setField={setField}
            toggleArray={toggleArray}
            options={options}
          />
        )}
        {step === 2 && (
  <StepBouche
    form={form}
    setField={setField}
    toggleArray={toggleArray}
    options={options}
  />
)}
        {step === 3 && (
          <StepGeneral
            form={form}
            setField={setField}
          />
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-amber-200">
        <div className="flex border-b border-amber-100">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => i < step && setStep(i)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                i === step
                  ? 'text-amber-800 border-b-2 border-amber-800'
                  : i < step
                  ? 'text-amber-500 cursor-pointer'
                  : 'text-amber-300 cursor-default'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="px-4 py-3 flex gap-3">
        
        {step < STEPS.length - 1 ? (
  <button
    onClick={handleNext}
    disabled={status === 'saving'}
    className="flex-1 py-3 rounded-xl bg-amber-700 text-white font-semibold disabled:opacity-50"
  >
    {status === 'saving' ? 'Sauvegarde…' : 'Suivant →'}
  </button>
) : (
  <>
    <button
      onClick={handleBack}
      className="px-4 py-3 rounded-xl border border-amber-300 text-amber-700 font-medium shrink-0"
    >
      ← Retour
    </button>
    <button
      onClick={async () => {
        const ok = await save(true)
        if (ok) router.push('/bieres')
      }}
      disabled={status === 'saving'}
      className="flex-1 py-3 rounded-xl bg-amber-700 text-white font-semibold disabled:opacity-50 text-sm"
    >
      {status === 'saving' ? '…' : '💾 Enregistrer'}
    </button>
    <button
      onClick={async () => {
        const ok = await save(true)
        if (ok) router.push(`/classement?newBeer=${beerId}`);
      }}
      disabled={status === 'saving'}
      className="flex-1 py-3 rounded-xl bg-amber-900 text-white font-semibold disabled:opacity-50 text-sm"
    >
      {status === 'saving' ? '…' : '🏆 Classer'}
    </button>
  </>
)}
      </div>

    </div></div>
  )
}

// ─── Step 1 — Aspect ─────────────────────────────────────────────────────────

function StepAspect({ form, setField, options }) {
  return (
    <div className="space-y-7">
      <SectionTitle emoji="👁️" title="Aspect" />

      {/* Couleur */}
      <div>
  <FieldLabel>Couleur</FieldLabel>
  <div className="flex gap-1.5 mt-2">
    {BEER_COLORS.map(c => (
      <button
  key={c.value}
  onClick={() => setField('couleur', c.value)}
  className={`flex-1 h-10 rounded-md transition-all ${
    form.couleur === c.value
      ? 'ring-2 ring-gray-900 ring-offset-2 scale-125 z-10 relative'
      : ''
  }`}
  style={{ backgroundColor: c.hex }}
  aria-label={`Couleur ${c.value}`}
/>
    ))}
  </div>
</div>

      <Chips
        label="Clarté"
        options={options['clarte']}
        value={form.clarte}
        onChange={v => setField('clarte', v)}
      />
      <Chips
        label="Mousse"
        options={options['mousse']}
        value={form.mousse}
        onChange={v => setField('mousse', v)}
      />
      <Chips
        label="Effervescence"
        options={options['effervescence']}
        value={form.effervescence}
        onChange={v => setField('effervescence', v)}
      />

      <Textarea
  label="Commentaires visuels"
  value={form.commentaire_aspect}
  onChange={v => setField('commentaire_aspect', v)}
  placeholder="Commentaires sur l'aspect, la couleur, la mousse…"
/>
    </div>
  )
}

// ─── Step 2 — Nez ────────────────────────────────────────────────────────────
function StepNez({ form, setField, toggleArray, options }) {
  const allOptions = options['familles_aromatiques'] || []

  return (
    <div className="space-y-7">
      <SectionTitle emoji="👃" title="Nez" />

      {/* Familles aromatiques — grouped multi-select */}
      <div>
        <FieldLabel>Familles aromatiques</FieldLabel>
        <p className="text-xs text-amber-500 mb-3">Plusieurs choix possibles</p>
        <div className="space-y-4">
          {AROMA_GROUPS.map(group => {
            // Match DB options to this group's item list
            const groupOptions = group.items
              .map(itemLabel => allOptions.find(o => o.label === itemLabel))
              .filter(Boolean)

            if (!groupOptions.length) return null

            return (
              <div key={group.label}>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupOptions.map(opt => {
                    const selected = form.familles_aromatiques?.includes(opt.option_id)
                    return (
                      <button
                        key={opt.option_id}
                        onClick={() => toggleArray('familles_aromatiques', opt.option_id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          selected
                            ? 'bg-amber-700 text-white border-amber-700'
                            : 'bg-white text-amber-800 border-amber-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Intensité — 3 pills */}
      <div>
        <FieldLabel>Intensité</FieldLabel>
        <div className="flex gap-2 mt-2">
          {INTENSITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setField('intensite_nez', 
                form.intensite_nez === opt.value ? null : opt.value
              )}
              className={`flex-1 py-2 rounded-full text-sm font-medium border transition-all ${
                form.intensite_nez === opt.value
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-white text-amber-800 border-amber-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Commentaire */}
      <Textarea
        label="Commentaires olfactifs"
        value={form.commentaire_nez}
        onChange={v => setField('commentaire_nez', v)}
        placeholder="Arômes perçus, impressions générales…"
      />
    </div>
  )
}

// ─── Step 3 — Bouche ─────────────────────────────────────────────────────────

function StepBouche({ form, setField, toggleArray, options }) {
  return (
    <div className="space-y-7">
      <SectionTitle emoji="👄" title="Bouche" />

      {/* Attaque — single select, label updated */}
      <Chips
        label="Attaque en bouche"
        options={options['attaque']}
        value={form.attaque}
        onChange={v => setField('attaque', v)}
      />

      {/* Équilibre — multi-select */}
      <div>
        <FieldLabel>Équilibre</FieldLabel>
        <p className="text-xs text-amber-500 mb-2">Plusieurs choix possibles</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {(options['equilibre'] || []).map(opt => {
            const selected = form.equilibre?.includes(opt.option_id)
            return (
              <button
                key={opt.option_id}
                onClick={() => toggleArray('equilibre', opt.option_id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selected
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-white text-amber-800 border-amber-300'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Corps — multi-select */}
      <div>
        <FieldLabel>Corps</FieldLabel>
        <p className="text-xs text-amber-500 mb-2">Plusieurs choix possibles</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {(options['corps'] || []).map(opt => {
            const selected = form.corps?.includes(opt.option_id)
            return (
              <button
                key={opt.option_id}
                onClick={() => toggleArray('corps', opt.option_id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selected
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-white text-amber-800 border-amber-300'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Longueur en bouche — single select, unchanged */}
      <Chips
        label="Longueur en bouche"
        options={options['longueur_bouche']}
        value={form.longueur_bouche}
        onChange={v => setField('longueur_bouche', v)}
      />

      {/* Commentaire */}
      <Textarea
        label="Commentaires gustatifs"
        value={form.commentaire_bouche}
        onChange={v => setField('commentaire_bouche', v)}
        placeholder="Impressions en bouche, finale…"
      />
    </div>
  )
}

// ─── Step 4 — Général ────────────────────────────────────────────────────────

function StepGeneral({ form, setField }) {
  return (
    <div className="space-y-7">
      <SectionTitle emoji="⭐" title="Général" />

      {/* Star rating */}
      {/* Star rating */}
      <div>
        <FieldLabel>Note globale</FieldLabel>
        <div className="mt-3">
          <StarSlider
            value={form.note_etoiles ?? 0}
            onChange={v => setField('note_etoiles', v)}
          />
        </div>
      </div>

      {/* Public note */}
      <div>
        <FieldLabel>Notes publiques</FieldLabel>
<p className="text-xs text-amber-500 mb-2">Visibles par tous les participants</p>
        <textarea
          value={form.public_note}
          onChange={e => setField('public_note', e.target.value)}
          placeholder="Un mot à partager sur cette bière…"
          rows={3}
          className="w-full rounded-xl border border-amber-200 p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </div>

      {/* Private notes */}
      <div>
        <FieldLabel>Notes privées</FieldLabel>
        <p className="text-xs text-amber-500 mb-2">Seulement visibles par toi</p>
        <textarea
          value={form.notes_libres}
          onChange={e => setField('notes_libres', e.target.value)}
          placeholder="Notes personnelles, comparaisons…"
          rows={3}
          className="w-full rounded-xl border border-amber-200 p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </div>

      <p className="text-xs text-center text-amber-400 pb-2">
        En validant, ta fiche est enregistrée définitivement. Tu pourras toujours la modifier.
      </p>
    </div>
  )
}

// ─── Shared UI atoms ─────────────────────────────────────────────────────────

function SectionTitle({ emoji, title }) {
  return (
    <h2 className="text-2xl font-bold text-amber-900">
      {emoji} {title}
    </h2>
  )
}

function FieldLabel({ children }) {
  return (
    <p className="text-sm font-semibold text-amber-800">{children}</p>
  )
}

function Chips({ label, options = [], value, onChange }) {
  if (!options.length) return null
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2 mt-2">
        {options.map(opt => (
          <button
            key={opt.option_id}
            onClick={() => onChange(value === opt.option_id ? null : opt.option_id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              value === opt.option_id
                ? 'bg-amber-700 text-white border-amber-700'
                : 'bg-white text-amber-800 border-amber-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full mt-2 rounded-xl border border-amber-200 p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
      />
    </div>
  )
}