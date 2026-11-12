import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { User, MapPin, Calendar, Check, AlertCircle, Building, Phone } from 'lucide-react';
import { RoleBackground } from '../../components/common/RoleBackground';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';
import { supabase } from '../../lib/supabase';
import { getOwnerRoleId } from '../../services/roleService';
import type { State, District, Locality } from '../../lib/supabase';

const OwnerProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setUser, setSelectedRole } = useAuthStore();
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

  // Load districts when state is selected
  useEffect(() => {
    if (selectedStateId) {
      loadDistricts(selectedStateId);
    } else {
      setDistricts([]);
      setLocalities([]);
      setSelectedDistrictId(null);
      setSelectedLocalityId(null);
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

      // Get auth user from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('No authenticated session found. Please complete signup first.');
      }

      const user = session.user;

      // Check if profile already exists to prevent duplicates
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profile already exists');
        localStorage.removeItem('signupData');
        setUser({
          id: user.id,
          name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
          email: signupData.email || user.email || '',
          role: 'owner',
          sites: [],
        });
        navigate('/owner-setup');
        return;
      }

      // Get Owner role UUID from database
      const ownerRoleId = await getOwnerRoleId();
      if (!ownerRoleId) {
        throw new Error('Owner role not found in database. Please contact administrator.');
      }

      const fullName = `${formData.firstName} ${formData.lastName || ''}`.trim();
      const userEmail = signupData.email || user.email || '';

      // Save profile to Supabase using canonical profiles schema (id = user.id)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: userEmail,
          full_name: fullName,
          role_id: ownerRoleId,
          user_type: 'owner',
          phone_number: formData.phoneNumber || null,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          state_id: selectedStateId || null,
          district_id: selectedDistrictId || null,
          locality_id: selectedLocalityId || null,
          is_active: true,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Owner profile creation error:', profileError);
        throw profileError;
      }

      console.log('✓ Owner profile created successfully in public.profiles');

      // Clear signup data to prevent stale data
      localStorage.removeItem('signupData');

      // Clear selected role from store to prevent stale data on refresh
      setSelectedRole(null);

      // Update user in store
      setUser({
        id: user.id,
        name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
        email: signupData.email || user.email || '',
        role: 'owner',
        sites: [],
      });

      // Navigate to owner setup wizard
      navigate('/owner-setup');
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

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-white selection:bg-sky-500 selection:text-white overflow-hidden">
      {/* Role-Specific Background Animation (Cold Storage Facility: +30% brightness, warehouse, AGVs, cyan lasers) */}
      <RoleBackground role="owner" />

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
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/25">
              <Building className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Owner Profile Setup</h2>
            <p className="text-slate-300 text-sm mt-1">
              Step 2/2 &bull; Setup your facility telemetry and operations hub
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-xl text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  First Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter your first name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="" className="bg-slate-900 text-slate-300">Select gender</option>
                  <option value="male" className="bg-slate-900 text-white">Male</option>
                  <option value="female" className="bg-slate-900 text-white">Female</option>
                  <option value="other" className="bg-slate-900 text-white">Other</option>
                  <option value="prefer_not_to_say" className="bg-slate-900 text-white">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Location Information Section */}
            <div className="border-t border-slate-700 pt-5">
              <h3 className="text-base font-semibold text-white mb-3.5 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-400" />
                Location Information
              </h3>
              
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    State <span className="text-rose-400">*</span>
                  </label>
                  <SearchableSelect
                    placeholder="Select state"
                    options={states.map(s => s.name)}
                    value={formData.state}
                    onChange={handleStateSelect}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    District <span className="text-rose-400">*</span>
                  </label>
                  <SearchableSelect
                    placeholder="Select district"
                    options={districts.map(d => d.name)}
                    value={formData.district}
                    onChange={handleDistrictSelect}
                    disabled={!selectedStateId}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Locality
                  </label>
                  <SearchableSelect
                    placeholder="Select locality"
                    options={localities.map(l => l.name)}
                    value={formData.locality}
                    onChange={handleLocalitySelect}
                    disabled={!selectedDistrictId}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500"
                required
              />
              <label htmlFor="terms" className="text-xs text-slate-300">
                I accept the Terms &amp; Conditions <span className="text-rose-400">*</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 transition-all text-sm"
              loading={loading}
            >
              Continue to Setup Wizard &rarr;
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

export default OwnerProfileSetup;
