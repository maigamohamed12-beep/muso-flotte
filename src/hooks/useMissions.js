import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useMissions(pays = '', site = '') {
  const [missions, setM] = useState([])
  const [loading,  setL] = useState(true)

  const fetch = async () => {
    setL(true)
    let q = supabase.from('missions').select(`
      id, destination, depart, retour, objet, passagers,
      statut, km_depart, km_retour, pays, site, combinee, created_at,
      vehicule:vehicule_id ( id, immat, marque, modele ),
      chauffeur:chauffeur_id ( id, nom ),
      demandeurs:mission_demandeurs (
        demandeur:demandeur_id ( id, nom, initiales )
      )
    `)
    if (pays) q = q.eq('pays', pays)
    if (site) q = q.eq('site', site)
    const { data } = await q.order('created_at', { ascending: false })
    setM(data || [])
    setL(false)
  }

  useEffect(() => {
    fetch()
    const ch = supabase.channel('mis_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [pays, site])

  const creer = async (data, demandeurId) => {
    const { data: m, error } = await supabase
      .from('missions').insert(data).select().single()
    if (error) throw new Error(error.message)
    await supabase.from('mission_demandeurs')
      .insert({ mission_id: m.id, demandeur_id: demandeurId })
    return m
  }

  const valider = async (missionId, vehiculeId, chauffeurId) => {
    const { error } = await supabase.from('missions').update({
      statut: 'Validee', vehicule_id: vehiculeId, chauffeur_id: chauffeurId
    }).eq('id', missionId)
    if (error) throw new Error(error.message)
    await supabase.from('vehicules')
      .update({ statut: 'En mission' }).eq('id', vehiculeId)
  }

  const cloturer = async (missionId, vehiculeId, kmRetour) => {
    await supabase.from('missions').update({
      statut: 'Terminee', km_retour: parseInt(kmRetour)
    }).eq('id', missionId)
    await supabase.from('vehicules').update({
      statut: 'Disponible', km: parseInt(kmRetour)
    }).eq('id', vehiculeId)
  }

  const rejeter = async (missionId) => {
    const { error } = await supabase.from('missions')
      .update({ statut: 'Rejetee' }).eq('id', missionId)
    if (error) throw new Error(error.message)
  }

  const combiner = async (missionIds, data, demandeurIds) => {
    const { data: nm, error } = await supabase
      .from('missions').insert({ ...data, combinee: true }).select().single()
    if (error) throw new Error(error.message)
    await supabase.from('mission_demandeurs').insert(
      demandeurIds.map(uid => ({ mission_id: nm.id, demandeur_id: uid }))
    )
    await supabase.from('missions').delete().in('id', missionIds)
    return nm
  }

  return { missions, loading, creer, valider, cloturer, rejeter, combiner, refresh: fetch }
}
