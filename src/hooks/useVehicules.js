import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useVehicules(pays = '', site = '') {
  const [vehicules, setV] = useState([])
  const [loading,   setL] = useState(true)

  const fetch = async () => {
    setL(true)
    let q = supabase.from('vehicules').select(`
      id, immat, marque, modele, annee, statut, km,
      pays, site, assurance, visite, created_at,
      chauffeur:chauffeur_id ( id, nom, initiales )
    `)
    if (pays) q = q.eq('pays', pays)
    if (site) q = q.eq('site', site)
    const { data } = await q.order('immat')
    setV(data || [])
    setL(false)
  }

  useEffect(() => {
    fetch()
    const ch = supabase.channel('veh_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicules' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [pays, site])

  const ajouter  = async (data) => {
    const { error } = await supabase.from('vehicules').insert(data)
    if (error) throw new Error(error.message)
  }

  const modifier = async (id, data) => {
    const { error } = await supabase.from('vehicules').update(data).eq('id', id)
    if (error) throw new Error(error.message)
  }

  const supprimer = async (id) => {
    const { error } = await supabase.from('vehicules').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  return { vehicules, loading, ajouter, modifier, supprimer, refresh: fetch }
}
