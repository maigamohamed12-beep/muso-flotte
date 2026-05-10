import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCarburant(pays = '', site = '') {
  const [carburant, setC] = useState([])
  const [loading,   setL] = useState(true)

  const fetch = async () => {
    setL(true)
    let q = supabase.from('carburant').select(`
      id, date, litres, cout, station, km, pays, site, created_at,
      vehicule:vehicule_id ( id, immat, marque )
    `)
    if (pays) q = q.eq('pays', pays)
    if (site) q = q.eq('site', site)
    const { data } = await q.order('date', { ascending: false })
    setC(data || [])
    setL(false)
  }

  useEffect(() => {
    fetch()
    const ch = supabase.channel('carb_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carburant' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [pays, site])

  const ajouter = async (data) => {
    const { error } = await supabase.from('carburant').insert(data)
    if (error) throw new Error(error.message)
  }

  return { carburant, loading, ajouter, refresh: fetch }
}
