import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useNotifications(userId) {
  const [notifs, setN] = useState([])

  useEffect(() => {
    if (!userId) return
    supabase.from('notifications').select('*')
      .eq('destinataire_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setN(data || []))

    const ch = supabase.channel(`notif_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `destinataire_id=eq.${userId}`
      }, (payload) => setN(prev => [payload.new, ...prev]))
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [userId])

  const envoyer = (destinataireId, message) =>
    supabase.from('notifications').insert({ destinataire_id: destinataireId, message })

  const marquerLu = async (id) => {
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
    setN(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
  }

  const toutMarquerLu = async () => {
    if (!userId) return
    await supabase.from('notifications')
      .update({ lu: true }).eq('destinataire_id', userId).eq('lu', false)
    setN(prev => prev.map(n => ({ ...n, lu: true })))
  }

  return {
    notifs,
    nonLues: notifs.filter(n => !n.lu).length,
    envoyer,
    marquerLu,
    toutMarquerLu
  }
}
