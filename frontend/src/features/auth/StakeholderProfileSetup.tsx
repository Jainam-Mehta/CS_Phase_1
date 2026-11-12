import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { getStakeholderRoleId } from '../../services/roleService';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { User, MapPin, Calendar, Phone, Check, AlertCircle, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { State, District, Locality } from '../../lib/supabase';
import { RoleBackground } from '../../components/common/RoleBackground';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';


const StakeholderProfileSetup: React.FC = () => {
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
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profile already exists - AuthProvider will handle navigation');
        setError('Profile already exists. Redirecting...');
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStateSelect = (stateName: string) => {
    setFormData(prev => ({
      ...prev,
      state: stateName,
      district: '',
      locality: ''
    }));
    const selectedState = states.find(s => s.name === stateName);
    setSelectedStateId(selectedState?.id || null);
    setSelectedDistrictId(null);
    setSelectedLocalityId(null);
  };

  const handleDistrictSelect = (districtName: string) => {
    setFormData(prev => ({
      ...prev,
      district: districtName,
      locality: ''
    }));
    const selectedDistrict = districts.find(d => d.name === districtName);
    setSelectedDistrictId(selectedDistrict?.id || null);
    setSelectedLocalityId(null);
  };

  const handleLocalitySelect = (localityName: string) => {
    setFormData(prev => ({
      ...prev,
      locality: localityName
    }));
    const selectedLocality = localities.find(l => l.name === localityName);
    setSelectedLocalityId(selectedLocality?.id || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Required fields validation
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber || !selectedStateId || !selectedDistrictId) {
      setError('Please fill in all required fields');
      return;
    }

    // Phone number validation (must be exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    setLoading(true);

    try {
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

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No authenticated session found');
      }

      // Get stakeholder role ID
      const stakeholderRoleId = await getStakeholderRoleId();
      if (!stakeholderRoleId) {
        throw new Error('Stakeholder role not found in database');
      }

      const fullName = `${formData.firstName} ${formData.lastName || ''}`.trim();

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email || '',
          full_name: fullName,
          role_id: stakeholderRoleId,
          user_type: 'stakeholder',
          phone_number: formData.phoneNumber || null,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          state_id: selectedStateId || null,
          district_id: selectedDistrictId || null,
          locality_id: selectedLocalityId || null,
          is_active: true,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (profileError) throw profileError;

      console.log('✓ Stakeholder profile created:', profile);

      // Update auth store
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: `${formData.firstName} ${formData.lastName}`,
        role: 'stakeholder',
        sites: [],
      });

      // Navigate directly to stakeholder map dashboard (skip investment preferences)
      navigate('/stakeholder/map');
    } catch (err: any) {
      console.error('Profile creation error:', err);
      setError(err.message || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (value: string) => {
    // Validate DD/MM/YYYY format
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(dateRegex);
    
    if (match) {
      const [, day, month, year] = match;
      // Convert to YYYY-MM-DD for storage
      setFormData({ ...formData, dateOfBirth: `${year}-${month}-${day}` });
    } else {
      setFormData({ ...formData, dateOfBirth: value });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-white selection:bg-amber-500 selection:text-white overflow-hidden">
      {/* Role-Specific Background Animation (Stakeholder: Financial Growth, +35% brightness, golden trends, glowing charts) */}
      <RoleBackground role="stakeholder" />

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
              <span className="px-3 py-1 bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-full">
                Step 2/2
              </span>
            </div>
            
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/25">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Stakeholder Profile Setup</h2>
            <p className="text-slate-300 text-sm mt-1">
              Join the verified cold chain investment network
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
                  First Name <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter your first name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Last Name <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter your last name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    State <span className="text-amber-400">*</span>
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
                    District <span className="text-amber-400">*</span>
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
                className="mt-1 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                required
              />
              <label htmlFor="terms" className="text-xs text-slate-300">
                I accept the Terms &amp; Conditions and Privacy Policy <span className="text-amber-400">*</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all text-sm"
              loading={loading}
            >
              Continue to Dashboard &rarr;
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

export default StakeholderProfileSetup;
