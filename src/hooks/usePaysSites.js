import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePaysSites() {
  const [ps,      setPs] = useState({})
  const [loading, setL]  = useState(true)

  const fetch = async () => {
    const { data } = await supabase
      .from('pays_sites').select('*').order('pays').order('site')
    const grouped = (data || []).reduce((acc, row) => {
      if (!acc[row.pays]) acc[row.pays] = []
      acc[row.pays].push({ id: row.id, site: row.site })
      return acc
    }, {})
    setPs(grouped)
    setL(false)
  }

  useEffect(() => { fetch() }, [])

  const psNoms = Object.fromEntries(
    Object.entries(ps).map(([p, sites]) => [p, sites.map(s => s.site)])
  )

  const ajouterPays = async (pays) => {
    const { error } = await supabase
      .from('pays_sites').insert({ pays, site: 'Capitale' })
    if (error) throw new Error(error.message)
    await fetch()
  }

  const ajouterSite = async (pays, site) => {
    const { error } = await supabase
      .from('pays_sites').insert({ pays, site })
    if (error) throw new Error(error.message)
    await fetch()
  }

  const supprimerSite = async (id) => {
    const { error } = await supabase
      .from('pays_sites').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const renommerPays = async (ancien, nouveau) => {
    const { error } = await supabase
      .from('pays_sites').update({ pays: nouveau }).eq('pays', ancien)
    if (error) throw new Error(error.message)
    await supabase.from('vehicules')
      .update({ pays: nouveau }).eq('pays', ancien)
    await fetch()
  }

  const renommerSite = async (id, pays, ancien, nouveau) => {
    const { error } = await supabase
      .from('pays_sites').update({ site: nouveau }).eq('id', id)
    if (error) throw new Error(error.message)
    await supabase.from('vehicules')
      .update({ site: nouveau }).eq('site', ancien).eq('pays', pays)
    await fetch()
  }

  return {
    ps, psNoms, loading,
    ajouterPays, ajouterSite, supprimerSite,
    renommerPays, renommerSite, refresh: fetch
  }
}
