import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [profil,  setProfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('profils')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setProfil(data)
            setLoading(false)
          })
          .catch(() => {
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          supabase
            .from('profils')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => setProfil(data))
            .catch(() => setProfil(null))
        } else {
          setProfil(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfil(null)
  }

  return { user, profil, loading, login, logout }
}
