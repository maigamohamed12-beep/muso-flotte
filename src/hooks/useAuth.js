import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [profil,  setProfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfil(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfil(session.user.id)
        } else {
          setProfil(null)
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfil(uid) {
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('*')
        .eq('id', uid)
        .single()
      if (error) {
        console.error('Erreur profil:', error)
        setProfil(null)
      } else {
        console.log('Profil chargé:', data)
        setProfil(data)
      }
    } catch (e) {
      console.error('Exception profil:', e)
      setProfil(null)
    } finally {
      setLoading(false)
    }
  }

  const login  = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = () => supabase.auth.signOut()

  return { user, profil, loading, login, logout }
}
