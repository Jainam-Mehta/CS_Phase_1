import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { User, MapPin, Calendar, Check, AlertCircle, Sprout, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getFarmerRoleId } from '../../services/roleService';
import type { State, District, Locality } from '../../lib/supabase';
import { RoleBackground } from '../../components/common/RoleBackground';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';


const FarmerProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setUser, setSelectedRole } = useAuthStore();
  const { loading: onboardingLoading, step, completeStep } = useOnboarding();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    state: '',
    district: '',
    locality: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Location data from Supabase
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedLocalityId, setSelectedLocalityId] = useState<string | null>(null);

  // Load states on mount and verify authentication
  useEffect(() => {
    loadStates();
    verifyAuthentication();
  }, []);

  const verifyAuthentication = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        setError('No authenticated session found. Please complete signup first.');
        setTimeout(() => navigate('/signup'), 3000);
        return;
      }

      // DO NOT redirect if profile exists - AuthProvider handles navigation
      // Just check and show error if needed
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profile already exists - AuthProvider will handle navigation');
        setError('Profile already exists. Redirecting...');
        // AuthProvider will redirect, don't navigate here
      }
    } catch (err) {
      console.error('Authentication verification failed:', err);
      setError('Authentication verification failed. Please complete signup first.');
    }
  };

  // Load districts when state is selected
  useEffect(() => {
    if (selectedStateId) {
      loadDistricts(selectedStateId);
    } else {
      setDistricts([]);
      setLocalities([]);
      setSelectedDistrictId(null);
    }
  }, [selectedStateId]);

  // Load localities when district is selected
  useEffect(() => {
    if (selectedDistrictId) {
      loadLocalities(selectedDistrictId);
    } else {
      setLocalities([]);
    }
  }, [selectedDistrictId]);

  const loadStates = async () => {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setStates(data || []);
    } catch (err) {
      console.error('Error loading states:', err);
      setError('Failed to load states. Please check your internet connection and try again.');
    }
  };

  const loadDistricts = async (stateId: string) => {
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('*')
        .eq('state_id', stateId)
        .order('name');
      
      if (error) throw error;
      setDistricts(data || []);
    } catch (err) {
      console.error('Error loading districts:', err);
      setError('Failed to load districts. Please check your internet connection and try again.');
    }
  };

  const loadLocalities = async (districtId: string) => {
    try {
      const { data, error } = await supabase
        .from('localities')
        .select('*')
        .eq('district_id', districtId)
        .order('name');
      
      if (error) throw error;
      setLocalities(data || []);
    } catch (err) {
      console.error('Error loading localities:', err);
      setError('Failed to load localities. Please check your internet connection and try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Required fields validation
    if (!formData.firstName || !selectedStateId || !selectedDistrictId) {
      setError('Please fill in all required fields');
      return;
    }

    // Optional phone validation (if provided, must be 10 digits)
    if (formData.phoneNumber && !/^[0-9]{10}$/.test(formData.phoneNumber)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    setLoading(true);

    try {
      // Get signup data from localStorage
      const signupData = JSON.parse(localStorage.getItem('signupData') || '{}');

      // Validate date of birth if provided
      if (formData.dateOfBirth) {
        const [day, month, year] = formData.dateOfBirth.split('/').map(Number);
        const isValidDate = day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2040;
        if (!isValidDate) {
          setError('Please enter a valid date of birth (dd/mm/yyyy)');
          setLoading(false);
          return;
        }
      }

      // Verify session exists first (reads from localStorage, no network call)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No authenticated session found. Please complete signup first.');
      }

      // Use session.user instead of making another network call to getUser()
      const user = session.user;
      if (!user) {
        throw new Error('No authenticated user found in session');
      }

      // Check if profile already exists to prevent duplicates
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profile already exists, updating with location if needed');
        
        // Update existing profile with location data
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            state_id: selectedStateId || null,
            district_id: selectedDistrictId || null,
            locality_id: selectedLocalityId || null,
          })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Error updating profile location:', updateError);
          // Don't throw - continue anyway
        }
        
        localStorage.removeItem('signupData');
        setUser({
          id: user.id,
          name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
          email: signupData.email || user.email || '',
          role: 'farmer',
          sites: [],
        });
        // Onboarding hook will handle navigation
        completeStep('profile');
        return;
      }

      // Get Farmer role UUID from database
      const { data: roles, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'farmer')
        .single();

      if (roleError || !roles) {
        throw new Error('Farmer role not found in database. Please contact administrator.');
      }

      const farmerRoleId = roles.id;
      const userEmail = signupData.email || user.email || '';

      // Save profile to Supabase using profiles table schema
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          role_id: farmerRoleId,  // Required: UUID reference to roles table
          email: userEmail,
          user_type: 'farmer',
          full_name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
          phone_number: formData.phoneNumber || null,
          is_active: true,
          state_id: selectedStateId || null,
          district_id: selectedDistrictId || null,
          locality_id: selectedLocalityId || null,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Farmer profile creation error:', profileError);
        throw profileError;
      }

      console.log('✓ Farmer profile created successfully in public.profiles');

      // Clear signup data and any old storage request data to prevent stale data
      localStorage.removeItem('signupData');
      localStorage.removeItem('storageAccessRequest');

      // Clear selected role from store to prevent stale data on refresh
      setSelectedRole(null);

      // Update user in store
      setUser({
        id: user.id,
        name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
        email: signupData.email || user.email || '',
        role: 'farmer',
        sites: [],
      });

      // Navigate directly to farmer dashboard (skip storage selection)
      navigate('/farmer');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStateSelect = (stateName: string) => {
    const state = states.find(s => s.name === stateName);
    if (state) {
      setSelectedStateId(state.id);
      setSelectedDistrictId(null);
      setSelectedLocalityId(null);
      handleInputChange('state', stateName);
      handleInputChange('district', '');
      handleInputChange('locality', '');
    }
  };

  const handleDistrictSelect = (districtName: string) => {
    const district = districts.find(d => d.name === districtName);
    if (district) {
      setSelectedDistrictId(district.id);
      setSelectedLocalityId(null);
      handleInputChange('district', districtName);
      handleInputChange('locality', '');
    }
  };

  const handleLocalitySelect = (localityName: string) => {
    const locality = localities.find(l => l.name === localityName);
    if (locality) {
      setSelectedLocalityId(locality.id);
      handleInputChange('locality', localityName);
    }
  };

  // Don't render if still loading onboarding state
  if (onboardingLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-white selection:bg-emerald-500 selection:text-white overflow-hidden">
      {/* Role-Specific Background Animation (Farmer: Agricultural Landscape, +70% brightness, sunny sky, dual windmills, vibrant crops) */}
      <RoleBackground role="farmer" />

      {/* White Header Bar - 68px, Perfectly Contained */}
      <header className="relative w-full h-[68px] px-6 lg:px-10 flex items-center justify-between z-30 bg-white border-b border-gray-200 shadow-sm shrink-0 overflow-hidden">
        <div className="flex items-center h-full">
          <SystmLogo variant="prominent-header" iconSize={52} showCompanyLogo={true} />
        </div>
        <div className="flex items-center h-full">
          <PartnerLogos theme="light" prominent={true} />
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 z-20 w-full max-w-2xl mx-auto">
        <div className="w-full rounded-2xl bg-[#1A2A3A]/90 backdrop-blur-md border border-[#304458] p-6 sm:p-8 shadow-2xl">
          {/* Header inside card */}
          <div className="text-center mb-6 relative">
            <div className="absolute top-0 right-0">
              <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-full">
                Step 2/2
              </span>
            </div>
            
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/25">
              <Sprout className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Farmer Profile Setup</h2>
            <p className="text-slate-300 text-sm mt-1">
              Connect your harvest to intelligent cold chain storage
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-xl text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  First Name <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter your first name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter your last name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number (10 digits)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                      if (val.length >= 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);
                      handleInputChange('dateOfBirth', val);
                    }}
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" className="bg-slate-900 text-slate-300">Select gender</option>
                  <option value="male" className="bg-slate-900 text-white">Male</option>
                  <option value="female" className="bg-slate-900 text-white">Female</option>
                  <option value="other" className="bg-slate-900 text-white">Other</option>
                  <option value="prefer_not_to_say" className="bg-slate-900 text-white">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Location Section */}
            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    State <span className="text-emerald-400">*</span>
                  </label>
                  <SearchableSelect
                    value={formData.state}
                    onChange={handleStateSelect}
                    options={states.map(s => s.name)}
                    placeholder="Search for your state..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    District <span className="text-emerald-400">*</span>
                  </label>
                  <SearchableSelect
                    value={formData.district}
                    onChange={handleDistrictSelect}
                    options={districts.map(d => d.name)}
                    placeholder="Search for your district..."
                    disabled={!selectedStateId}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Locality
                  </label>
                  <SearchableSelect
                    value={formData.locality}
                    onChange={handleLocalitySelect}
                    options={localities.map(l => l.name)}
                    placeholder="Search for your locality..."
                    disabled={!selectedDistrictId}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                required
              />
              <label htmlFor="terms" className="text-xs text-slate-300">
                I accept the Terms &amp; Conditions <span className="text-emerald-400">*</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-sm"
              loading={loading}
            >
              Complete Registration &rarr;
            </Button>
          </form>
        </div>
      </main>

      {/* Footer info bar */}
      <footer className="relative w-full py-3.5 text-center text-xs text-gray-600 border-t border-gray-200 bg-white z-30 shadow-sm shrink-0">
        <p className="font-medium tracking-wide">
          SystmII Cold Chain Supply Management Platform &bull; Active Logistics Core
        </p>
      </footer>
    </div>
  );
};

export default FarmerProfileSetup;
