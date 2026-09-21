/**
 * AuthCallback Component
 * Handles Supabase authentication callbacks (email verification, OAuth)
 * This component processes the callback response from Supabase after email verification
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole } = useAuthStore();

  // Helper function to get role from user metadata (primary source)
  const getRoleFromUserMetadata = (user: any): string | null => {
    try {
      // Try to get role from user metadata first (most reliable)
      if (user?.user_metadata?.role) {
        console.log('✓ Role found in user metadata:', user.user_metadata.role);
        return user.user_metadata.role;
      }
      return null;
    } catch (error) {
      console.error('Error reading role from user metadata:', error);
      return null;
    }
  };

  // Helper function to get role from localStorage fallback
  const getRoleFromStorage = (): string | null => {
    try {
      const signupData = localStorage.getItem('signupData');
      if (signupData) {
        const parsed = JSON.parse(signupData);
        return parsed.role || null;
      }
    } catch (error) {
      console.error('Error reading signup data from localStorage:', error);
    }
    return null;
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('=== AUTH CALLBACK HANDLER ===');
      console.log('Current URL:', window.location.href);
      console.log('Hash:', window.location.hash);
      console.log('Search params:', window.location.search);

      try {
        // Check if there's an access token in the URL hash (Supabase OAuth flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        const type = hashParams.get('type');

        console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, error, type });

        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          // Redirect to login with error
          navigate('/login?error=' + encodeURIComponent(errorDescription || error));
          return;
        }

        if (type === 'signup' || type === 'recovery') {
          console.log('Email verification callback detected');
          
          // For email verification, Supabase doesn't return tokens in the hash
          // Instead, we need to check if the session is now established
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Error getting session after verification:', sessionError);
            navigate('/login?error=' + encodeURIComponent('Session check failed after verification'));
            return;
          }

          if (session) {
            console.log('✓ Session established after email verification');
            console.log('User:', session.user?.email);
            console.log('User ID:', session.user?.id);
            console.log('User metadata:', session.user?.user_metadata);
            
            // Check if user already has a profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            
            // Clear the hash from URL
            window.location.hash = '';
            
            if (profile && !profileError) {
              console.log('✓ Profile found, redirecting to dashboard');
              navigate('/');
            } else {
              console.log('No profile found, determining role for routing');
              
              // Get role from user metadata (primary source)
              const roleFromMetadata = getRoleFromUserMetadata(session.user);
              // Fallback to localStorage
              const roleFromStorage = getRoleFromStorage();
              // Fallback to store
              const roleFromStore = selectedRole;
              
              const effectiveRole = roleFromMetadata || roleFromStorage || roleFromStore;
              console.log('Effective role for routing:', effectiveRole, '(metadata:', roleFromMetadata, ', storage:', roleFromStorage, ', store:', roleFromStore, ')');
              
              // Route according to role
              if (effectiveRole === 'owner') {
                console.log('Redirecting owner to owner profile setup');
                navigate('/owner-profile-setup');
              } else if (effectiveRole === 'stakeholder') {
                console.log('Redirecting stakeholder to stakeholder profile setup');
                navigate('/stakeholder-profile-setup');
              } else if (effectiveRole === 'farmer') {
                console.log('Redirecting farmer to farmer profile setup');
                navigate('/farmer-profile-setup');
              } else if (effectiveRole === 'admin') {
                console.log('Redirecting admin to role selection (future implementation)');
                navigate('/role-selection');
              } else {
                console.log('No role found, redirecting to role selection');
                navigate('/role-selection');
              }
            }
            return;
          }

          console.log('No session after email verification - user may need to login');
          navigate('/login?message=' + encodeURIComponent('Email verified. Please login to continue.'));
          return;
        }

        if (accessToken) {
          console.log('Access token found in URL hash');
          console.log('Setting session from callback...');

          // Set the session using the tokens from the callback
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            navigate('/login?error=' + encodeURIComponent('Failed to establish session'));
            return;
          }

          console.log('✓ Session established from callback:', data.session);
          console.log('User:', data.session?.user?.email);
          console.log('User metadata:', data.session?.user?.user_metadata);

          if (!data.session) {
            console.error('Session is null after setting session');
            navigate('/login?error=' + encodeURIComponent('Session establishment failed'));
            return;
          }

          // Get role from user metadata (primary source)
          const roleFromMetadata = getRoleFromUserMetadata(data.session.user);
          // Fallback to localStorage
          const roleFromStorage = getRoleFromStorage();
          // Fallback to store
          const roleFromStore = selectedRole;
          
          const effectiveRole = roleFromMetadata || roleFromStorage || roleFromStore;
          console.log('Effective role for routing:', effectiveRole, '(metadata:', roleFromMetadata, ', storage:', roleFromStorage, ', store:', roleFromStore, ')');

          // Clear the hash from URL
          window.location.hash = '';

          // Role-aware routing
          if (effectiveRole === 'owner') {
            console.log('Redirecting owner to owner profile setup');
            navigate('/owner-profile-setup');
          } else if (effectiveRole === 'stakeholder') {
            console.log('Redirecting stakeholder to stakeholder profile setup');
            navigate('/stakeholder-profile-setup');
          } else if (effectiveRole === 'farmer') {
            console.log('Redirecting farmer to farmer profile setup');
            navigate('/farmer-profile-setup');
          } else if (effectiveRole === 'admin') {
            console.log('Redirecting admin to role selection (future implementation)');
            navigate('/role-selection');
          } else {
            console.log('No role selected, redirecting to role selection');
            navigate('/role-selection');
          }
          return;
        }

        // If no access token in hash, check if we already have a session
        // This handles the case where email verification happens and user is already logged in
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          navigate('/login?error=' + encodeURIComponent('Session check failed'));
          return;
        }

        if (session) {
          console.log('✓ Existing session found after callback');
          console.log('User:', session.user?.email);
          console.log('User metadata:', session.user?.user_metadata);

          // Get role from user metadata (primary source)
          const roleFromMetadata = getRoleFromUserMetadata(session.user);
          // Fallback to localStorage
          const roleFromStorage = getRoleFromStorage();
          // Fallback to store
          const roleFromStore = selectedRole;
          
          const effectiveRole = roleFromMetadata || roleFromStorage || roleFromStore;
          console.log('Effective role for routing:', effectiveRole, '(metadata:', roleFromMetadata, ', storage:', roleFromStorage, ', store:', roleFromStore, ')');

          // Role-aware routing
          if (effectiveRole === 'owner') {
            console.log('Redirecting owner to owner profile setup');
            navigate('/owner-profile-setup');
          } else if (effectiveRole === 'stakeholder') {
            console.log('Redirecting stakeholder to stakeholder profile setup');
            navigate('/stakeholder-profile-setup');
          } else if (effectiveRole === 'farmer') {
            console.log('Redirecting farmer to farmer profile setup');
            navigate('/farmer-profile-setup');
          } else if (effectiveRole === 'admin') {
            console.log('Redirecting admin to role selection (future implementation)');
            navigate('/role-selection');
          } else {
            console.log('No role selected, redirecting to role selection');
            navigate('/role-selection');
          }
          return;
        }

        // No session and no tokens - redirect to login
        console.log('No session or tokens found in callback');
        navigate('/login?error=' + encodeURIComponent('No session established'));

      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=' + encodeURIComponent('Authentication failed'));
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;