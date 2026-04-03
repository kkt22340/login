import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'

type ProfileRow = {
  id: string
  created_at: string
  display_name: string | null
  is_admin: boolean | null
  phone?: string | null
  remaining_credits?: number | null
}

export type AuthContextValue = {
  session: Session | null
  profile: ProfileRow | null
  /** getSession 최초 1회 완료 — 로그인/라우트 가드용 (프로필과 무관) */
  ready: boolean
  /** profiles 행 로딩 중 (관리자 판별 전에만 의미 있음) */
  profileLoading: boolean
  isAdmin: boolean
  userId: string
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [ready, setReady] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, created_at, display_name, is_admin, phone, remaining_credits')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.warn('[auth] profiles load', error.message)
        setProfile(null)
        return
      }
      setProfile((data as ProfileRow) ?? null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  /** 세션만 즉시 반영. 프로필은 백그라운드 로드 → 로그인 체감 지연 방지 */
  const applySession = useCallback(
    (nextSession: Session | null) => {
      setSession(nextSession)
      if (nextSession?.user?.id) {
        void loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
    },
    [loadProfile]
  )

  useEffect(() => {
    let alive = true

    void (async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession()
        if (!alive) return
        applySession(s)
      } finally {
        if (alive) setReady(true)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!alive) return
      applySession(s)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [applySession])

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id
    if (!uid) return
    await loadProfile(uid)
  }, [session?.user?.id, loadProfile])

  const value = useMemo(
    (): AuthContextValue => ({
      session,
      profile,
      ready,
      profileLoading,
      isAdmin: Boolean(profile?.is_admin),
      userId: session?.user?.id ?? '',
      refreshProfile,
    }),
    [session, profile, ready, profileLoading, refreshProfile]
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용하세요.')
  }
  return ctx
}
