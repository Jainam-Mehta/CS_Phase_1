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

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [roleLogged, setRoleLogged] = useState(false);

  useEffect(() => {
    console.log('=== AUTH PROVIDER INITIALIZED ===');
    
    const initializeAuth = async (currentSession: Session | null = null) => {
      try {
        console.log('Checking for existing session...');
        let sessionToUse = currentSession;
        if (!sessionToUse) {
          const { data, error } = await supabase.auth.getSession();
          if (error) console.error('Session check error:', error);
          sessionToUse = data.session;
        }
        
        if (sessionToUse) {
          console.log('✓ Existing session found:', sessionToUse.user?.email);
          const metaRole = sessionToUse.user.user_metadata?.role;
          
          setUser({
            id: sessionToUse.user.id,
            name: sessionToUse.user.user_metadata?.name || sessionToUse.user.email?.split('@')[0] || '',
            email: sessionToUse.user.email || '',
            role: metaRole || null,
            sites: [],
          });
          
          // Check if user has a profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, roles!inner(name)')
            .eq('auth_user_id', sessionToUse.user.id)
            .maybeSingle();
            
          if (profile && !profileError) {
             setUser({
              id: sessionToUse.user.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || sessionToUse.user.email?.split('@')[0] || '',
              email: sessionToUse.user.email || '',
              role: profile.roles?.name?.toLowerCase() || metaRole || null,
              sites: [],
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== AUTH STATE CHANGE ===', event);
        
        if (event === 'SIGNED_IN' && session) {
           initializeAuth(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRoleLogged(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          const { user: currentUser } = useAuthStore.getState();
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
            email: session.user.email || '',
            role: currentUser?.role || session.user.user_metadata?.role || null,
            sites: [],
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return <>{children}</>;
};
