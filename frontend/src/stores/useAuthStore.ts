import { create } from 'zustand';
import { supabase } from '../lib/supabase';

type UserRole = 'farmer' | 'owner' | 'stakeholder' | 'admin';

interface Site {
  id: string;
  name: string;
  location: string;
  category: string;
  is_primary: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    sites: Site[];
    primarySite?: Site;
    selectedSite?: Site;
  } | null;
  selectedSite?: Site | null;
  selectedRole: UserRole | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => void;
  setSelectedRole: (role: UserRole | null) => void;
  clearSelectedRole: () => void;
  setUser: (user: AuthState['user']) => void;
  setSelectedSite: (site: Site) => void;
  setToken: (token: string) => void;
  checkSession: () => Promise<void>;
}

// Helper functions for localStorage persistence
const SELECTED_ROLE_KEY = 'selectedRole';

const getStoredRole = (): UserRole | null => {
  try {
    const stored = localStorage.getItem(SELECTED_ROLE_KEY);
    return stored as UserRole | null;
  } catch {
    return null;
  }
};

const setStoredRole = (role: UserRole | null) => {
  try {
    if (role) {
      localStorage.setItem(SELECTED_ROLE_KEY, role);
    } else {
      localStorage.removeItem(SELECTED_ROLE_KEY);
    }
  } catch (error) {
    console.error('Failed to persist selectedRole:', error);
  }
};

export const useAuthStore = create<AuthState>()((set) => ({
      isAuthenticated: false,
      user: null,
      selectedSite: null,
      selectedRole: getStoredRole(), // Initialize from localStorage
      token: null,
      login: async (email: string, password: string) => {
        // Note: This method is kept for compatibility but direct Supabase auth
        // is recommended. Use supabase.auth.signInWithPassword() directly in components.
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user && data.session) {
            set({
              isAuthenticated: true,
              user: {
                id: data.user.id,
                name: data.user.user_metadata?.name || email.split('@')[0],
                email: data.user.email || email,
                role: 'farmer', // CRITICAL FIX: Default, will be updated from profile
                sites: [],
              },
              token: data.session.access_token,
            });
          }
        } catch (error) {
          console.error('Login error:', error);
          throw error;
        }
      },
      logout: async () => {
        await supabase.auth.signOut();
        setStoredRole(null); // Clear persisted role
        set({
          isAuthenticated: false,
          user: null,
          selectedRole: null,
          token: null,
          selectedSite: null,
        });
      },
      clearSelectedRole: () => {
        setStoredRole(null); // Clear persisted role
        set({ selectedRole: null });
      },
      setRole: (role) => {
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        }));
      },
      setSelectedRole: (role) => {
        setStoredRole(role); // Persist to localStorage
        set({ selectedRole: role });
      },
      setUser: (user) => {
        set({
          isAuthenticated: !!user,
          user: user ? {
            ...user,
            // Ensure name is from profile, not email
            name: user.name || user.email?.split('@')[0] || 'User',
          } : null,
        });
      },
      setSelectedSite: (site) => {
        set((state) => ({
          user: state.user ? { ...state.user, selectedSite: site } : null,
        }));
      },
      setToken: (token) => {
        set({ token });
      },
      checkSession: async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (session && session.user) {
            set({
              isAuthenticated: true,
              user: {
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
                email: session.user.email || '',
                role: 'farmer', // CRITICAL FIX: Default, will be updated from profile
                sites: [],
              },
              token: session.access_token,
            });
          } else {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
            });
          }
        } catch (error) {
          console.error('Session check error:', error);
          set({
            isAuthenticated: false,
            user: null,
            token: null,
          });
        }
      },
}));