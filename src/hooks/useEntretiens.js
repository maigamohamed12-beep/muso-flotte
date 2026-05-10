import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useEntretiens(pays = '', site = '') {
  const [entretiens, setE] = useState([])
  const [loading,    setL] = useState(true)

  const fetch = async () => {
    setL(true)
    let q = supabase.from('entretiens').select(`
      id, type, date, km, cout, prestataire, statut, notes, pays, site, created_at,
      vehicule:vehicule_id ( id, immat, marque, modele )
    `)
    if (pays) q = q.eq('pays', pays)
    if (site) q = q.eq('site', site)
    const { data } = await q.order('date', { ascending: false })
    setE(data || [])
    setL(false)
  }

  useEffect(() => {
    fetch()
    const ch = supabase.channel('ent_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entretiens' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [pays, site])

  const ajouter = async (data) => {
    const { error } = await supabase.from('entretiens').insert(data)
    if (error) throw new Error(error.message)
    await supabase.from('vehicules')
      .update({ statut: 'En entretien' }).eq('id', data.vehicule_id)
  }

  const avancer = async (id, vehiculeId, statutActuel) => {
    const next = { 'Planifie': 'En cours', 'En cours': 'Effectue' }
    const ns = next[statutActuel]
    if (!ns) return
    await supabase.from('entretiens').update({ statut: ns }).eq('id', id)
    if (ns === 'Effectue')
      await supabase.from('vehicules')
        .update({ statut: 'Disponible' }).eq('id', vehiculeId)
  }

  return { entretiens, loading, ajouter, avancer, refresh: fetch }
}
