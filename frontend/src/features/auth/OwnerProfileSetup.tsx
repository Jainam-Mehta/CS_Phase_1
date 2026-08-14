import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { User, MapPin, Calendar, Check, AlertCircle, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getOwnerRoleId } from '../../services/roleService';
import type { State, District, Locality } from '../../lib/supabase';

const OwnerProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setUser, setSelectedRole } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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
        .eq('auth_user_id', session.user.id)
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

    if (!acceptTerms) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    setLoading(true);

    try {
      // Get signup data from localStorage
      const signupData = JSON.parse(localStorage.getItem('signupData') || '{}');

      // Verify session exists first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No authenticated session found. Please complete signup first.');
      }

      // Get auth user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No authenticated user found');
      }

      // Check if profile already exists to prevent duplicates
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
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

      // Save profile to Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName || null,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          state_id: selectedStateId,
          district_id: selectedDistrictId,
          locality_id: selectedLocalityId || null,
          role_id: ownerRoleId,
        });

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Illustration Section */}
        <div className="hidden lg:flex flex-col items-center justify-center">
          <svg viewBox="0 0 400 400" className="w-full h-full max-w-md">
            <defs>
              <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#87CEEB" />
                <stop offset="100%" stopColor="#E0F7FA" />
              </linearGradient>
              <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4A90E2" />
                <stop offset="100%" stopColor="#357ABD" />
              </linearGradient>
            </defs>
            
            {/* Sky */}
            <rect x="0" y="0" width="400" height="400" fill="url(#skyGradient)" />
            
            {/* Sun */}
            <circle cx="320" cy="80" r="50" fill="#FFD700" />
            
            {/* Building */}
            <rect x="100" y="150" width="200" height="200" fill="url(#buildingGradient)" rx="10" />
            
            {/* Windows */}
            <rect x="120" y="170" width="40" height="50" fill="#87CEEB" rx="5" />
            <rect x="180" y="170" width="40" height="50" fill="#87CEEB" rx="5" />
            <rect x="240" y="170" width="40" height="50" fill="#87CEEB" rx="5" />
            <rect x="120" y="240" width="40" height="50" fill="#87CEEB" rx="5" />
            <rect x="180" y="240" width="40" height="50" fill="#87CEEB" rx="5" />
            <rect x="240" y="240" width="40" height="50" fill="#87CEEB" rx="5" />
            
            {/* Door */}
            <rect x="170" y="310" width="60" height="40" fill="#8B4513" rx="5" />
          </svg>
          
          <div className="text-center mt-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome, Owner!</h2>
            <p className="text-white/80">Your journey to smart cold storage management begins here</p>
          </div>
        </div>

        {/* Form Card */}
        <Card variant="default" className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Owner Profile Setup</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Let's set up your profile to get started
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter your first name"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter your last name"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth (Optional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender (Optional)
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State *
                    </label>
                    <SearchableSelect
                      placeholder="Select state"
                      options={states.map(s => s.name)}
                      value={formData.state}
                      onChange={handleStateSelect}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      District *
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Locality (Optional)
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

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 rounded"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                  I accept the Terms & Conditions *
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
              >
                Continue to Setup Wizard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerProfileSetup;
