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
        .eq('auth_user_id', session.user.id)
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No authenticated session found');
      }

      // Get stakeholder role ID
      const stakeholderRoleId = await getStakeholderRoleId();
      if (!stakeholderRoleId) {
        throw new Error('Stakeholder role not found in database');
      }

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: session.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phoneNumber,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          state_id: selectedStateId,
          district_id: selectedDistrictId,
          locality_id: selectedLocalityId || null,
          role_id: stakeholderRoleId,
          owner_company_id: null, // Stakeholders don't have owner_company_id
        })
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Illustration Section */}
        <div className="hidden lg:flex flex-col items-center justify-center">
          <svg viewBox="0 0 400 400" className="w-full h-full max-w-md">
            <defs>
              <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#667EEA" />
                <stop offset="100%" stopColor="#764BA2" />
              </linearGradient>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#48BB78" />
                <stop offset="100%" stopColor="#38A169" />
              </linearGradient>
            </defs>
            
            {/* Background */}
            <rect x="0" y="0" width="400" height="400" fill="url(#skyGradient)" />
            
            {/* Globe/Map background */}
            <circle cx="200" cy="200" r="150" fill="rgba(255,255,255,0.1)" />
            <circle cx="200" cy="200" r="120" fill="rgba(255,255,255,0.1)" />
            
            {/* Investment Chart Bars */}
            <g transform="translate(100, 250)">
              <rect x="0" y="-80" width="40" height="80" fill="url(#chartGradient)" rx="5" />
              <rect x="60" y="-120" width="40" height="120" fill="url(#chartGradient)" rx="5" />
              <rect x="120" y="-100" width="40" height="100" fill="url(#chartGradient)" rx="5" />
              <rect x="180" y="-140" width="40" height="140" fill="url(#chartGradient)" rx="5" />
            </g>
            
            {/* Trend Arrow */}
            <g transform="translate(150, 120)">
              <path d="M 0,50 L 30,30 L 60,40 L 90,10" 
                    stroke="#FFD700" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <polygon points="90,10 80,5 85,15" fill="#FFD700" />
            </g>
            
            {/* Rupee Signs */}
            <g fill="#FFD700" opacity="0.8">
              <text x="80" y="100" fontSize="30" fontWeight="bold">₹</text>
              <text x="280" y="140" fontSize="25" fontWeight="bold">₹</text>
              <text x="320" y="240" fontSize="20" fontWeight="bold">₹</text>
            </g>
            
            {/* Investment Icons - Briefcase */}
            <g transform="translate(200, 200)">
              <rect x="-30" y="-20" width="60" height="40" fill="rgba(255,255,255,0.3)" rx="5" />
              <rect x="-15" y="-30" width="30" height="15" fill="rgba(255,255,255,0.3)" rx="3" />
              <line x1="-20" y1="-5" x2="20" y2="-5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
            </g>
          </svg>
          
          <div className="text-center mt-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome, Investor!</h2>
            <p className="text-white/80">Start investing in cold storage opportunities</p>
          </div>
        </div>

        {/* Form Card */}
        <Card variant="default" className="w-full max-w-lg">
          <CardHeader className="text-center relative">
            {/* Step Indicator */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
                Step 2/2
              </span>
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Stakeholder Profile Setup</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Complete your profile to start viewing cold storage opportunities
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
              
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter your first name"
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter your last name"
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="Enter your phone number"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    className="w-full pl-10 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">10 digits only</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.dateOfBirth ? formData.dateOfBirth.split('-').reverse().join('/') : ''}
                      onChange={(e) => handleDateChange(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full pl-10 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Format: DD/MM/YYYY</p>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Location - State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedStateId || ''}
                    onChange={(e) => setSelectedStateId(e.target.value || null)}
                    className="w-full pl-10 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select state</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location - District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  District *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedDistrictId || ''}
                    onChange={(e) => setSelectedDistrictId(e.target.value || null)}
                    disabled={!selectedStateId}
                    className="w-full pl-10 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">Select district</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location - Locality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Locality
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedLocalityId || ''}
                    onChange={(e) => setSelectedLocalityId(e.target.value || null)}
                    disabled={!selectedDistrictId}
                    className="w-full pl-10 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select locality</option>
                    {localities.map((locality) => (
                      <option key={locality.id} value={locality.id}>
                        {locality.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                  I accept the Terms & Conditions and Privacy Policy
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Creating Profile...' : 'Continue to Dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StakeholderProfileSetup;
