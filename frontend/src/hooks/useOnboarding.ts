/**
 * useOnboarding Hook
 * Single source of truth for onboarding state and routing decisions
 * Determines which onboarding step the user should be on based on backend data
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

export type OnboardingStep = 
  | 'profile' 
  | 'dashboard';

interface OnboardingState {
  step: OnboardingStep;
  loading: boolean;
  hasProfile: boolean;
  profile: any;
}

export const useOnboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [state, setState] = useState<OnboardingState>({
    step: 'profile',
    loading: true,
    hasProfile: false,
    profile: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    checkOnboardingState();
  }, [user?.id]);

  const checkOnboardingState = async () => {
    try {
      console.log('=== CHECKING ONBOARDING STATE ===');
      
      if (!user?.id) {
        setState(prev => ({ ...prev, loading: false, step: 'profile' }));
        return;
      }
      
      // 1. Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.log('No profile found -> checking role from user state');
        
        const userRole = user?.role;
        console.log('Role from user state:', userRole);
        
        if (userRole === 'owner') {
          console.log('Owner without profile -> should go to owner profile setup');
          setState(prev => ({
            ...prev,
            step: 'profile',
            loading: false,
            hasProfile: false,
          }));
          return;
        } else if (userRole === 'stakeholder') {
          console.log('Stakeholder without profile -> should go to stakeholder profile setup');
          setState(prev => ({
            ...prev,
            step: 'profile',
            loading: false,
            hasProfile: false,
          }));
          return;
        } else if (userRole === 'farmer') {
          console.log('Farmer without profile -> should go to farmer profile setup');
          setState(prev => ({
            ...prev,
            step: 'profile',
            loading: false,
            hasProfile: false,
          }));
          return;
        } else {
          console.log('Unknown or no role -> step: profile');
          setState(prev => ({
            ...prev,
            step: 'profile',
            loading: false,
            hasProfile: false,
          }));
          return;
        }
      }

      console.log('✓ Profile found');
      console.log('User role from profile.roles?.name:', profile.roles?.name);
      console.log('Full profile object:', profile);

      // Owners: Check if they have sites in database
      // If they do, go to dashboard. If not, go to site setup.
      if (profile.roles?.name === 'Owner' || user?.role === 'owner') {
        console.log('Owner role detected, checking for existing sites...');
        
        const { data: sites, error: sitesError } = await supabase
          .from('sites')
          .select('id')
          .eq('owner_profile_id', profile.id)
          .limit(1);
        
        if (!sitesError && sites && sites.length > 0) {
          console.log('✓ Owner has existing sites -> step: dashboard');
          setState(prev => ({
            ...prev,
            step: 'dashboard',
            loading: false,
            hasProfile: true,
            hasSite: true,
            hasRooms: true,
            hasProducts: true,
            profile,
            sites: sites,
          }));
          return;
        } else {
          console.log('Owner has no sites -> step: profile (OwnerSetup)');
          setState(prev => ({
            ...prev,
            step: 'profile',
            loading: false,
            hasProfile: true,
            profile,
          }));
          return;
        }
      }

      // Stakeholders skip farmer onboarding
      if (profile.roles?.name === 'Stakeholder') {
        console.log('Stakeholder role detected, skipping farmer onboarding');
        setState(prev => ({
          ...prev,
          step: 'dashboard',
          loading: false,
          hasProfile: true,
          hasSite: true,
          hasRooms: true,
          hasProducts: true,
          profile,
        }));
        return;
      }

      // Farmers: Skip onboarding entirely after profile creation
      // They go directly to dashboard. Room requests happen later via Settings
      if (profile.role === 'farmer') {
        console.log('Farmer role detected -> skip onboarding, go to dashboard');
        setState(prev => ({
          ...prev,
          step: 'dashboard',
          loading: false,
          hasProfile: true,
          hasSite: true,
          hasRooms: true,
          hasProducts: true,
          profile,
        }));
        return;
      }

      // 1.5 Database Override Check (Option B natively applied locking into Dashboard directly avoiding localstorage wipes)
      const { data: remoteAccess } = await supabase.from('farmer_room_access').select('id').eq('farmer_id', profile.id).limit(1);
      if (remoteAccess && remoteAccess.length > 0) {
         console.log('✓ Found Native Room Request mapping bypassing localstorage validations completely! -> step: dashboard');
         setState(prev => ({
           ...prev,
           step: 'dashboard',
           loading: false,
           hasProfile: true,
           profile,
         }));
         return;
      }

      // For non-farmer roles, default to dashboard as well
      console.log('Reached end of role checks - defaulting to dashboard');
      setState(prev => ({
        ...prev,
        step: 'dashboard',
        loading: false,
        hasProfile: true,
        profile,
      }));

    } catch (error) {
      console.error('Error checking onboarding state:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        step: 'profile', // Default to profile on error
      }));
    }
  };

  const navigateToCurrentStep = () => {
    if (state.loading) return null;

    // Return null when onboarding is complete — no redirect needed
    if (state.step === 'dashboard') return null;

    // Handle profile step based on user role
    if (state.step === 'profile') {
      const userRole = user?.role;
      if (userRole === 'owner') {
        return '/owner-profile-setup';
      } else if (userRole === 'stakeholder') {
        return '/stakeholder-profile-setup';
      } else if (userRole === 'farmer') {
        return '/farmer-profile-setup';
      }
      return '/farmer-profile-setup';
    }

    return null;
  };

  const completeStep = (step: OnboardingStep) => {
    // Force re-check onboarding state after completing a step
    checkOnboardingState();
  };

  return {
    ...state,
    navigateToCurrentStep,
    completeStep,
    refresh: checkOnboardingState,
    targetRoute: navigateToCurrentStep(),
  };
};