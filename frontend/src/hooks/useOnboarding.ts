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
  | 'site' 
  | 'rooms' 
  | 'products' 
  | 'dashboard';

interface OnboardingState {
  step: OnboardingStep;
  loading: boolean;
  hasProfile: boolean;
  hasSite: boolean;
  hasRooms: boolean;
  hasProducts: boolean;
  profile: any;
  sites: any[];
  rooms: any[];
  products: any[];
}

export const useOnboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [state, setState] = useState<OnboardingState>({
    step: 'profile',
    loading: true,
    hasProfile: false,
    hasSite: false,
    hasRooms: false,
    hasProducts: false,
    profile: null,
    sites: [],
    rooms: [],
    products: [],
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
        .select('*, roles!inner(name)')
        .eq('auth_user_id', user.id)
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
      console.log('User role:', profile.roles?.name);

      // Owners: Check if they have a facility, if not, send to owner-setup
      if (profile.roles?.name === 'Owner') {
        console.log('Owner role detected, checking for facility...');
        
        // Check if owner has created a facility
        const { data: facilities } = await supabase
          .from('facilities')
          .select('id')
          .eq('owner_profile_id', profile.id)
          .limit(1);
        
        if (!facilities || facilities.length === 0) {
          console.log('Owner has no facility -> step: site (owner-setup)');
          setState(prev => ({
            ...prev,
            step: 'site', // This will map to /owner-setup
            loading: false,
            hasProfile: true,
            hasSite: false,
            profile,
          }));
          return;
        }
        
        console.log('✓ Owner has facility -> step: dashboard');
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

      // Farmers skip storage selection onboarding - they go directly to dashboard
      // They can add cold storage later via Settings tab
      if (profile.roles?.name === 'Farmer') {
        console.log('Farmer role detected -> skip storage selection, go to dashboard');
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

      // 2. Check if user has sites (from localStorage or backend)
      const storageRequest = localStorage.getItem('storageAccessRequest');
      let hasSelectedSite = false;
      let selectedSites: any[] = [];

      if (storageRequest) {
        try {
          const parsed = JSON.parse(storageRequest);
          hasSelectedSite = !!(parsed.sites && parsed.sites.length > 0);
          selectedSites = parsed.sites || [];
        } catch (e) {
          console.error('Error parsing storage request:', e);
        }
      }

      if (!hasSelectedSite) {
        console.log('No site selected -> step: site');
        setState(prev => ({
          ...prev,
          step: 'site',
          loading: false,
          hasProfile: true,
          hasSite: false,
          profile,
        }));
        return;
      }

      console.log('✓ Site selected');

      // 3. Check if user has selected rooms
      let hasSelectedRooms = false;
      let selectedRooms: any[] = [];

      if (storageRequest) {
        try {
          const parsed = JSON.parse(storageRequest);
          hasSelectedRooms = !!(parsed.rooms && parsed.rooms.length > 0);
          selectedRooms = parsed.rooms || [];
        } catch (e) {
          console.error('Error parsing storage request:', e);
        }
      }

      if (!hasSelectedRooms) {
        console.log('No rooms selected -> step: rooms');
        setState(prev => ({
          ...prev,
          step: 'rooms',
          loading: false,
          hasProfile: true,
          hasSite: true,
          hasRooms: false,
          profile,
          sites: selectedSites,
        }));
        return;
      }

      console.log('✓ Rooms selected');

      // 4. Check if user has selected products
      let hasSelectedProducts = false;
      let selectedProducts: any[] = [];

      if (storageRequest) {
        try {
          const parsed = JSON.parse(storageRequest);
          hasSelectedProducts = !!(parsed.products && parsed.products.length > 0);
          selectedProducts = parsed.products || [];
        } catch (e) {
          console.error('Error parsing storage request:', e);
        }
      }

      if (!hasSelectedProducts) {
        console.log('No products selected -> step: products');
        setState(prev => ({
          ...prev,
          step: 'products',
          loading: false,
          hasProfile: true,
          hasSite: true,
          hasRooms: true,
          hasProducts: false,
          profile,
          sites: selectedSites,
          rooms: selectedRooms,
        }));
        return;
      }

      console.log('✓ Products selected');

      console.log('✓ All onboarding steps complete -> step: dashboard');
      setState(prev => ({
        ...prev,
        step: 'dashboard',
        loading: false,
        hasProfile: true,
        hasSite: true,
        hasRooms: true,
        hasProducts: true,
        profile,
        sites: selectedSites,
        rooms: selectedRooms,
        products: selectedProducts,
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
        return '/owner-setup'; // Owner goes to facility setup
      } else if (userRole === 'stakeholder') {
        return '/stakeholder-profile-setup';
      } else if (userRole === 'farmer') {
        return '/farmer-profile-setup';
      }
      // Default to farmer profile setup if role is unknown
      return '/farmer-profile-setup';
    }

    // Handle site step - for owners, this means facility setup
    if (state.step === 'site') {
      const userRole = user?.role || state.profile?.roles?.name?.toLowerCase();
      if (userRole === 'owner' || userRole === 'Owner') {
        return '/owner-setup'; // Owner creates facility
      }
      return '/storage-selection'; // Farmers select storage
    }

    const stepRoutes: Record<Exclude<OnboardingStep, 'dashboard' | 'profile' | 'site'>, string> = {
      'rooms': '/room-selection',
      'products': '/product-selection',
    };

    return stepRoutes[state.step as Exclude<OnboardingStep, 'dashboard' | 'profile' | 'site'>] ?? null;
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