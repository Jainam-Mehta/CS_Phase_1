/**
 * AuthProvider - Single Source of Truth for Authentication
 *
 * CRITICAL: This provider ONLY sets auth state
 * It does NOT navigate (except on logout)
 * Navigation is handled by RoleRedirect in routes
 *
 * Flow:
 * 1. AuthProvider loads session
 * 2. AuthProvider resolves profile
 * 3. AuthProvider sets role from profile
 * 4. RoleRedirect handles navigation based on role
 * 5. ProtectedRoute prevents unauthorized access
 * 6. OnboardingRoute gates based on onboarding completion
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthLoadingState {
  loading: boolean;
  isLoadingRole: boolean;
}

// Context exposes the loading state so consumers (ProtectedRoute, Login) can
// wait for the async session check AND role resolution before making redirect decisions.
const AuthLoadingContext = createContext<AuthLoadingState>({ loading: true, isLoadingRole: true });

export const useAuthLoading = () => useContext(AuthLoadingContext);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  useEffect(() => {
    console.log('=== AUTH PROVIDER INITIALIZED ===');

    const initializeAuth = async (currentSession: Session | null = null) => {
      try {
        console.log('Checking for existing session...');
        setIsLoadingRole(true); // Start role loading
        
        let sessionToUse = currentSession;
        if (!sessionToUse) {
          const { data, error } = await supabase.auth.getSession();
          if (error) console.error('Session check error:', error);
          sessionToUse = data.session;
        }

        if (sessionToUse) {
          console.log('✓ Existing session found:', sessionToUse.user?.email);
          const metaRole = sessionToUse.user.user_metadata?.role;

          // DON'T set user yet - wait for profile fetch to complete
          console.log('Fetching profile to get real role...');

          // Check if user has a profile to get the real role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, roles!inner(name)')
            .eq('auth_user_id', sessionToUse.user.id)
            .maybeSingle();

          if (profile && !profileError) {
            console.log('✓ Profile found with role:', profile.roles?.name);
            // Set user with complete role information
            setUser({
              id: sessionToUse.user.id,
              name:
                `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                sessionToUse.user.email?.split('@')[0] ||
                '',
              email: sessionToUse.user.email || '',
              role: profile.roles?.name?.toLowerCase() || null,
              sites: [],
            });
            setIsLoadingRole(false); // Role fully loaded
          } else {
            console.log('No profile found, using metadata role or null');
            // No profile yet (user in signup flow), set temporary user with metadata role
            setUser({
              id: sessionToUse.user.id,
              name:
                sessionToUse.user.user_metadata?.name ||
                sessionToUse.user.email?.split('@')[0] ||
                '',
              email: sessionToUse.user.email || '',
              role: metaRole || null,
              sites: [],
            });
            setIsLoadingRole(false); // No role to load (signup flow)
          }
        } else {
          console.log('No session found');
          setUser(null);
          setIsLoadingRole(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsLoadingRole(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('=== AUTH STATE CHANGE ===', event);

      if (event === 'SIGNED_IN' && session) {
        // Re-run full initialization so profile/role are always resolved
        setLoading(true);
        setIsLoadingRole(true);
        await initializeAuth(session);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        setIsLoadingRole(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Don't change loading states on token refresh
        const { user: currentUser } = useAuthStore.getState();
        setUser({
          id: session.user.id,
          name:
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            '',
          email: session.user.email || '',
          role:
            currentUser?.role ||
            session.user.user_metadata?.role ||
            null,
          sites: [],
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  // IMPORTANT: The Provider must wrap everything — including the spinner —
  // so that consumers (ProtectedRoute, Login) can always read the loading state.
  return (
    <AuthLoadingContext.Provider value={{ loading, isLoadingRole }}>
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : (
        children
      )}
    </AuthLoadingContext.Provider>
  );
};
