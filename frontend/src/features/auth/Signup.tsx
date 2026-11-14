import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import {
  Mail,
  Lock,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  User,
  Phone,
  Building,
  Sprout,
  Building2,
  TrendingUp,
  ShieldAlert,
  Key,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';
import { RoleBackground } from '../../components/common/RoleBackground';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setUser, isAuthenticated, user, clearSelectedRole } = useAuthStore();

  // Redirect to role selection if no role is selected
  useEffect(() => {
    if (!selectedRole) {
      navigate('/role-selection');
    }
  }, [selectedRole, navigate]);

  // Step management
  const [currentStep, setCurrentStep] = useState(1); // 1 or 2
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 fields (profile)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [locality, setLocality] = useState('');
  const [companyName, setCompanyName] = useState(''); // For owner only

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Prevent redirect during signup flow
  useEffect(() => {
    // If userId is set, we're in the middle of signup flow - DO NOT REDIRECT
    if (userId) {
      return;
    }

    // Only redirect if user already has complete profile (landed here by mistake)
    if (isAuthenticated && user?.role && currentStep === 1) {
      navigate('/');
    }
  }, [isAuthenticated, user, currentStep, userId, navigate]);

  const roleConfig = {
    farmer: {
      title: 'Farmer Registration',
      tagline: 'Connect your harvest to intelligent cold chain storage',
      accent: 'emerald',
      icon: Sprout,
      color: 'from-emerald-500 to-teal-600',
      pillColor: 'text-emerald-700 border-emerald-200 bg-emerald-50',
      btnGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20',
    },
    owner: {
      title: 'Facility Owner Registration',
      tagline: 'Setup your facility telemetry and operations hub',
      accent: 'sky',
      icon: Building2,
      color: 'from-sky-500 to-blue-600',
      pillColor: 'text-sky-700 border-sky-200 bg-sky-50',
      btnGradient: 'from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 shadow-blue-500/20',
    },
    stakeholder: {
      title: 'Stakeholder Registration',
      tagline: 'Join the verified cold chain investment network',
      accent: 'indigo',
      icon: TrendingUp,
      color: 'from-indigo-500 to-purple-600',
      pillColor: 'text-indigo-700 border-indigo-200 bg-indigo-50',
      btnGradient: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20',
    },
    admin: {
      title: 'Admin Registration',
      tagline: 'System governance and administrative access',
      accent: 'rose',
      icon: ShieldAlert,
      color: 'from-rose-500 to-red-600',
      pillColor: 'text-rose-700 border-rose-200 bg-rose-50',
      btnGradient: 'from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/20',
    },
  };

  const currentRole = (selectedRole && roleConfig[selectedRole as keyof typeof roleConfig]) || roleConfig.farmer;
  const RoleIcon = currentRole.icon;

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
      </div>
    );
  }

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (pass.length >= 12) strength++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-400'];

  // Step 1: Create account with email/password
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole || 'farmer',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || 'Signup failed. Please try again.');
        throw signUpError;
      }

      if (!data.user) {
        setError('Signup failed: No user was created. Please try again.');
        throw new Error('No user created during signup');
      }

      console.log('✓ Auth user created successfully:', { userId: data.user.id, email: data.user.email });

      // Store user ID and move to profile setup based on role
      if (selectedRole === 'farmer') {
        // Farmers use FarmerProfileSetup which collects location data
        localStorage.setItem('signupData', JSON.stringify({ email }));
        navigate('/farmer-profile-setup');
        return;
      }

      // Other roles use Step 2 of Signup
      setUserId(data.user.id);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete profile
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('Step 2 form submitted with:', { firstName, lastName, mobile, selectedRole, companyName });

    if (!firstName || !lastName || !mobile) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedRole === 'owner') {
      if (!companyName) {
        setError('Company name is required for facility owners');
        return;
      }
    }

    setLoading(true);

    try {
      const fullName = `${firstName} ${lastName || ''}`.trim();

      // Get the role_id from roles table
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', selectedRole)
        .single();

      if (!roleData) {
        setError(`Role '${selectedRole}' not found in database`);
        throw new Error('Role not found');
      }

      // Create profile in database and WAIT for confirmation
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId, // This IS the auth.users.id (profiles.id references auth.users.id)
            role_id: roleData.id,
            user_type: selectedRole,
            email: email,
            full_name: fullName,
            phone_number: mobile || null,
            is_active: true,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (profileError) {
        console.error('Profile upsert error details:', { profileError, userId, fullName, mobile, roleDataId: roleData.id });
        setError('Failed to create profile: ' + profileError.message);
        throw profileError;
      }

      if (!profileData) {
        console.warn('Profile upsert succeeded but returned no data, retrying select...');
        // Retry fetching the profile
        const { data: fetchedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!fetchedProfile) {
          setError('Profile creation failed: Could not retrieve profile data');
          throw new Error('Profile data not found after insert');
        }
        console.log('✓ Profile created successfully (retrieved on retry):', fetchedProfile);
      } else {
        console.log('✓ Profile created successfully:', profileData);
      }

      // Set user in store
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: `${firstName} ${lastName}`.trim(),
          email: session.user.email!,
          role: selectedRole || 'farmer',
          sites: [],
        });
      }

      // Navigate to role dashboard directly - no intermediate pages
      if (selectedRole === 'owner') {
        navigate('/owner/dashboard');
      } else if (selectedRole === 'stakeholder') {
        navigate('/stakeholder/map');
      } else {
        navigate('/farmer/dashboard');
      }
    } catch (err: any) {
      console.error('Profile creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = () => {
    clearSelectedRole();
    navigate('/role-selection');
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-gray-900 selection:bg-blue-500 selection:text-white bg-[#f4f5f7]">
      {/* Role-Specific Background */}
      <RoleBackground role={selectedRole} />

      {/* Clean White Header Bar */}
      <header className="relative w-full h-[68px] px-3 sm:px-6 lg:px-12 flex items-center justify-between z-30 bg-white border-b border-gray-200/80 shadow-sm shrink-0">
        <div className="flex items-center h-full">
          <SystmLogo variant="prominent-header" iconSize={44} showCompanyLogo={true} />
        </div>
        <div className="flex items-center h-full">
          <PartnerLogos theme="light" prominent={true} />
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 z-20 w-full max-w-lg mx-auto">
        <div className="w-full rounded-2xl bg-white border border-gray-200/90 p-6 sm:p-8 shadow-lg shadow-slate-200/50">
          {/* Top Control Bar inside card */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            {currentStep === 1 ? (
              <button
                onClick={handleChangeRole}
                type="button"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Role</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(1)}
                type="button"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Step 1</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${currentRole.pillColor}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                <span className="capitalize">{selectedRole}</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700">
                Step {currentStep}/2
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
              {currentStep === 1 ? (
                <>Create Your SystmII Account</>
              ) : (
                <>Complete Your Profile</>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {currentStep === 1
                ? currentRole.tagline
                : 'Provide your facility and contact credentials to complete activation'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {currentStep === 1 ? (
            // =================================================================
            // STEP 1: EMAIL & PASSWORD
            // =================================================================
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@coldstorage.com"
                    autoComplete="off"
                    name="email-signup"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                {email && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    {validateEmail(email) ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={validateEmail(email) ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                      {validateEmail(email) ? 'Valid email format' : 'Invalid email format'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    name="password-signup"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                {password && (
                  <div className="mt-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strengthColors[passwordStrength - 1] || 'bg-gray-400'} transition-all duration-300`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {strengthLabels[passwordStrength - 1] || 'Too weak'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-500">
                      <div className="flex items-center gap-1">
                        {password.length >= 8 ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span>8+ characters</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/[a-z]/.test(password) && /[A-Z]/.test(password) ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span>Upper & lower case</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/\d/.test(password) ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span>Number digit</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    name="password-confirm"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                {confirmPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    {password === confirmPassword ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={password === confirmPassword ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                      {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                className={`w-full py-3 mt-2 bg-gradient-to-r ${currentRole.btnGradient} text-white font-semibold rounded-xl shadow-sm transition-all text-sm`}
                loading={loading}
                disabled={!validateEmail(email) || password.length < 8 || password !== confirmPassword}
              >
                {selectedRole === 'farmer' ? 'Proceed to Farmer Setup' : 'Continue to Step 2'}
              </Button>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">
                  Already have a SystmII account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Log In
                  </button>
                </p>
              </div>
            </form>
          ) : (
            // =================================================================
            // STEP 2: PROFILE DETAILS
            // =================================================================
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      className="w-full pl-10 pr-3.5 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="w-full pl-10 pr-3.5 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mobile Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              {selectedRole === 'owner' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Company / Warehouse Entity Name</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Apex Cold Storage Ltd."
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location / Regional Hub</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District"
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="City / Village"
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className={`w-full py-3 mt-2 bg-gradient-to-r ${currentRole.btnGradient} text-white font-semibold rounded-xl shadow-sm transition-all text-sm`}
                loading={loading}
              >
                Complete Profile &amp; Launch SystmII
              </Button>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  &larr; Return to Step 1 (Account Credentials)
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

            {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-gray-500 dark:text-gray-400 mt-12 bg-white dark:bg-slate-900 shrink-0 z-30">
        &copy; 2026 Systm II | Powered by 1Accord Technologies | v1.0
      </footer>
    </div>
  );
};

export default Signup;
