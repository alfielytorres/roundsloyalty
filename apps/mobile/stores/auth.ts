import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@rounds/types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  role: UserRole | null
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  role: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile, role: profile?.role ?? null }),
  setLoading: (isLoading) => set({ isLoading }),
}))
