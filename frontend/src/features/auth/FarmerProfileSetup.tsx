import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { getFarmerRoleId } from '../../services/roleService';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { User, MapPin, Calendar, Check, AlertCircle, Sprout, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { State, District, Locality } from '../../lib/supabase';

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
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profile already exists');
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
      const farmerRoleId = await getFarmerRoleId();
      if (!farmerRoleId) {
        throw new Error('Farmer role not found in database. Please contact administrator.');
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
          role: 'farmer',
          phone: formData.phoneNumber || null,
          is_active: true,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Illustration Section */}
        <div className="hidden lg:flex flex-col items-center justify-center">
          <svg viewBox="0 0 400 400" className="w-full h-full max-w-md">
            <defs>
              <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#87CEEB" />
                <stop offset="100%" stopColor="#E0F7FA" />
              </linearGradient>
              <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#90EE90" />
                <stop offset="100%" stopColor="#228B22" />
              </linearGradient>
              <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FFA500" />
              </linearGradient>
            </defs>
            
            {/* Sky */}
            <rect x="0" y="0" width="400" height="400" fill="url(#skyGradient)" />
            
            {/* Sun */}
            <circle cx="320" cy="80" r="50" fill="url(#sunGradient)" />
            <g stroke="#FFD700" strokeWidth="3">
              <line x1="320" y1="20" x2="320" y2="0" />
              <line x1="320" y1="140" x2="320" y2="160" />
              <line x1="260" y1="80" x2="240" y2="80" />
              <line x1="380" y1="80" x2="400" y2="80" />
              <line x1="280" y1="40" x2="265" y2="25" />
              <line x1="360" y1="120" x2="375" y2="135" />
              <line x1="280" y1="120" x2="265" y2="135" />
              <line x1="360" y1="40" x2="375" y2="25" />
            </g>
            
            {/* Clouds */}
            <g fill="white" opacity="0.9">
              <ellipse cx="100" cy="60" rx="40" ry="25" />
              <ellipse cx="130" cy="50" rx="30" ry="20" />
              <ellipse cx="70" cy="55" rx="25" ry="18" />
              
              <ellipse cx="250" cy="100" rx="35" ry="22" />
              <ellipse cx="275" cy="92" rx="28" ry="18" />
              <ellipse cx="225" cy="95" rx="22" ry="15" />
            </g>
            
            {/* Mountains */}
            <g fill="#6B8E23">
              <polygon points="0,280 100,180 200,280" />
              <polygon points="150,280 280,160 410,280" />
              <polygon points="300,280 380,220 460,280" />
            </g>
            
            {/* Grass/Fields */}
            <rect x="0" y="280" width="400" height="120" fill="url(#grassGradient)" />
            
            {/* Trees */}
            <g>
              <rect x="45" y="260" width="10" height="40" fill="#8B4513" />
              <ellipse cx="50" cy="250" rx="25" ry="30" fill="#228B22" />
              
              <rect x="320" y="250" width="12" height="50" fill="#8B4513" />
              <ellipse cx="326" cy="235" rx="30" ry="35" fill="#006400" />
              
              <rect x="180" y="270" width="8" height="30" fill="#8B4513" />
              <ellipse cx="184" cy="260" rx="20" ry="25" fill="#32CD32" />
            </g>
            
            {/* Crops */}
            <g fill="#FFD700">
              <ellipse cx="80" cy="300" rx="5" ry="8" />
              <ellipse cx="120" cy="310" rx="5" ry="8" />
              <ellipse cx="160" cy="295" rx="5" ry="8" />
              <ellipse cx="200" cy="305" rx="5" ry="8" />
              <ellipse cx="240" cy="300" rx="5" ry="8" />
              <ellipse cx="280" cy="310" rx="5" ry="8" />
              <ellipse cx="320" cy="295" rx="5" ry="8" />
              <ellipse cx="360" cy="305" rx="5" ry="8" />
            </g>
            
            {/* Irrigation */}
            <g stroke="#4169E1" strokeWidth="2" opacity="0.6">
              <path d="M40 340 Q80 330 120 340 Q160 350 200 340 Q240 330 280 340 Q320 350 360 340" fill="none" />
              <path d="M60 350 Q100 340 140 350 Q180 360 220 350 Q260 340 300 350 Q340 360 380 350" fill="none" />
            </g>
            
            {/* Farmer silhouette */}
            <g fill="#8B4513">
              <ellipse cx="100" cy="320" rx="15" ry="12" />
              <rect x="90" y="330" width="20" height="30" rx="3" />
              <rect x="85" y="332" width="8" height="20" rx="2" />
              <rect x="107" y="332" width="8" height="20" rx="2" />
            </g>
          </svg>
          
          <div className="text-center mt-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome, Farmer!</h2>
            <p className="text-white/80">Your journey to smart farming begins here</p>
          </div>
        </div>

        {/* Form Card */}
        <Card variant="default" className="w-full max-w-lg">
          <CardHeader className="text-center relative">
            {/* Step Indicator */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full">
                Step 2/2
              </span>
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sprout className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Farmer Profile Setup</CardTitle>
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
                    Last Name
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="Enter your phone number"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional - 10 digits if provided</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
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
                    Gender
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
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <SearchableSelect
                    value={formData.state}
                    onChange={handleStateSelect}
                    options={states.map(s => s.name)}
                    placeholder="Search for your state..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  District *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <SearchableSelect
                    value={formData.district}
                    onChange={handleDistrictSelect}
                    options={districts.map(d => d.name)}
                    placeholder="Search for your district..."
                    disabled={!selectedStateId}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Locality
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <SearchableSelect
                    value={formData.locality}
                    onChange={handleLocalitySelect}
                    options={localities.map(l => l.name)}
                    placeholder="Search for your locality..."
                    disabled={!selectedDistrictId}
                  />
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
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerProfileSetup;
