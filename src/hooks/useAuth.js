import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [profil,  setProfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (session?.user) {
          setUser(session.user)
          await fetchProfil(session.user.id, mounted)
        }
      } catch (e) {
        console.error('Init error:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfil(session.user.id, mounted)
        } else {
          setProfil(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfil(uid, mounted = true) {
    try {
      const { data, error } = await supabase
        .from('profils')
        .select('*')
        .eq('id', uid)
        .single()

      if (!mounted) return

      if (error) {
        console.error('Erreur profil:', error)
        setProfil(null)
      } else {
        console.log('Profil chargé:', data)
        setProfil(data)
      }
    } catch (e) {
      console.error('Exception:', e)
      if (mounted) setProfil(null)
    } finally {
      if (mounted) setLoading(false)
    }
  }

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfil(null)
  }

  return { user, profil, loading, login, logout }
}
