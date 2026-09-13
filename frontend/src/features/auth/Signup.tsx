import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Mail, Lock, ArrowLeft, Check, X, AlertCircle, User, Phone, MapPin, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setUser, isAuthenticated, user } = useAuthStore();
  
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
    console.log('=== SIGNUP REDIRECT CHECK ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user.role:', user?.role);
    console.log('currentStep:', currentStep);
    console.log('userId:', userId);
    
    // CRITICAL: If userId is set, we're in the middle of signup flow - DO NOT REDIRECT
    if (userId) {
      console.log('→ userId is set, staying on signup (in middle of flow)');
      return;
    }
    
    // Only redirect if user already has complete profile (landed here by mistake)
    if (isAuthenticated && user?.role && currentStep === 1) {
      console.log('→ User already authenticated, redirecting to dashboard');
      navigate('/');
    } else {
      console.log('→ Staying on signup page');
    }
  }, [isAuthenticated, user, currentStep, userId, navigate]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];

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

      // Store user ID and move cleanly to step 2 without unmounting/redirecting
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

    if (!firstName || !lastName || !mobile) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedRole === 'owner' && !companyName) {
      setError('Company name is required for owners');
      return;
    }

    setLoading(true);

    try {
      // Determine role ID
      const roleId = selectedRole === 'owner' ? 1 : selectedRole === 'farmer' ? 2 : 3;

      // Create profile in database and WAIT for confirmation
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: userId,
          first_name: firstName,
          last_name: lastName,
          mobile_number: mobile,
          role_id: roleId,
        })
        .select()
        .single();

      if (profileError) {
        setError('Failed to create profile: ' + profileError.message);
        throw profileError;
      }

      if (!profileData) {
        setError('Profile creation failed: No profile data returned');
        throw new Error('Profile data is null after insert');
      }

      console.log('✓ Profile created successfully:', profileData);

      // Set user in store
      const { data: { session } } = await supabase.auth.getSession();
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
    navigate('/role-selection');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* 2D Role-Specific Visual Illustration Section */}
        <div className="hidden lg:flex flex-col items-center justify-center">
          {selectedRole === 'owner' ? (
            // Industrial Cold Storage Illustration for Owner
            <svg viewBox="0 0 400 400" className="w-full h-full max-w-md filter drop-shadow-xl">
              <defs>
                <linearGradient id="skyGradientOwner" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="buildingGradientOwner" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="roofGradientOwner" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
              </defs>
              
              {/* Sky Background */}
              <rect x="0" y="0" width="400" height="400" fill="url(#skyGradientOwner)" rx="16" />
              
              {/* Glowing Cold Storage Indicator */}
              <circle cx="320" cy="70" r="40" fill="#38bdf8" opacity="0.2" />
              <circle cx="320" cy="70" r="25" fill="#38bdf8" opacity="0.4" />
              
              {/* Ground */}
              <rect x="0" y="300" width="400" height="100" fill="#334155" rx="4" />
              
              {/* Cold Storage Building */}
              <rect x="100" y="160" width="200" height="140" fill="url(#buildingGradientOwner)" rx="8" />
              
              {/* Roof */}
              <polygon points="100,160 200,120 300,160" fill="url(#roofGradientOwner)" />
              
              {/* Loading Dock Door */}
              <rect x="160" y="220" width="80" height="80" fill="#0f172a" rx="4" />
              <line x1="160" y1="260" x2="240" y2="260" stroke="#334155" strokeWidth="2" />
              
              {/* Windows */}
              <rect x="115" y="180" width="30" height="35" fill="#93c5fd" rx="4" opacity="0.9" />
              <rect x="255" y="180" width="30" height="35" fill="#93c5fd" rx="4" opacity="0.9" />
              
              {/* Logistics Truck */}
              <g transform="translate(30, 260)">
                <rect x="0" y="15" width="50" height="25" fill="#ef4444" rx="3" />
                <rect x="40" y="10" width="25" height="15" fill="#b91c1c" rx="3" />
                <circle cx="12" cy="40" r="6" fill="#0f172a" />
                <circle cx="45" cy="40" r="6" fill="#0f172a" />
              </g>
              
              {/* Snowflake Graphic */}
              <g transform="translate(200, 190)">
                <circle cx="0" cy="0" r="18" fill="rgba(255,255,255,0.2)" />
                <path d="M 0,-12 L 0,12 M -12,0 L 12,0 M -8,-8 L 8,8 M -8,8 L 8,-8" 
                      stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            </svg>
          ) : selectedRole === 'stakeholder' ? (
            // Investment & Growth Analytics Illustration for Stakeholder
            <svg viewBox="0 0 400 400" className="w-full h-full max-w-md filter drop-shadow-xl">
              <defs>
                <linearGradient id="skyGradientStakeholder" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4c1d95" />
                  <stop offset="100%" stopColor="#2e1065" />
                </linearGradient>
                <linearGradient id="chartGradientStakeholder" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              
              {/* Background */}
              <rect x="0" y="0" width="400" height="400" fill="url(#skyGradientStakeholder)" rx="16" />
              
              {/* Global Investment Circles */}
              <circle cx="200" cy="200" r="150" fill="rgba(255,255,255,0.05)" />
              <circle cx="200" cy="200" r="110" fill="rgba(255,255,255,0.08)" />
              
              {/* Investment Growth Chart Bars */}
              <g transform="translate(90, 260)">
                <rect x="0" y="-70" width="35" height="70" fill="url(#chartGradientStakeholder)" rx="6" />
                <rect x="55" y="-120" width="35" height="120" fill="url(#chartGradientStakeholder)" rx="6" />
                <rect x="110" y="-95" width="35" height="95" fill="url(#chartGradientStakeholder)" rx="6" />
                <rect x="165" y="-150" width="35" height="150" fill="url(#chartGradientStakeholder)" rx="6" />
              </g>
              
              {/* Upward Growth Trend Line & Arrow */}
              <g transform="translate(100, 110)">
                <path d="M 0,90 L 55,40 L 110,60 L 165,10" 
                      stroke="#fbbf24" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <polygon points="165,10 150,5 155,20" fill="#fbbf24" />
              </g>
              
              {/* Currency Symbols */}
              <g fill="#fbbf24" opacity="0.9 font-sans">
                <text x="75" y="90" fontSize="32" fontWeight="bold">₹</text>
                <text x="270" y="120" fontSize="28" fontWeight="bold">₹</text>
                <text x="310" y="230" fontSize="22" fontWeight="bold">₹</text>
              </g>
              
              {/* Portfolio Briefcase */}
              <g transform="translate(200, 195)">
                <rect x="-28" y="-18" width="56" height="36" fill="rgba(255,255,255,0.25)" rx="6" />
                <rect x="-14" y="-26" width="28" height="12" fill="rgba(255,255,255,0.25)" rx="3" />
                <line x1="-18" y1="-4" x2="18" y2="-4" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
              </g>
            </svg>
          ) : (
            // Scenic Mountain Valley Farm View for Farmer
            <svg viewBox="0 0 400 400" className="w-full h-full max-w-md filter drop-shadow-xl">
              <defs>
                <linearGradient id="skyGradientFarmer" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#bae6fd" />
                </linearGradient>
                <linearGradient id="grassGradientFarmer" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                <linearGradient id="sunGradientFarmer" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              
              {/* Sky */}
              <rect x="0" y="0" width="400" height="400" fill="url(#skyGradientFarmer)" rx="16" />
              
              {/* Golden Sun */}
              <circle cx="320" cy="80" r="45" fill="url(#sunGradientFarmer)" />
              
              {/* Fluffy Clouds */}
              <g fill="white" opacity="0.9">
                <ellipse cx="90" cy="65" rx="35" ry="20" />
                <ellipse cx="120" cy="55" rx="25" ry="16" />
              </g>
              
              {/* Mountain Valley Peaks */}
              <g fill="#166534" opacity="0.85">
                <polygon points="0,280 110,170 220,280" />
                <polygon points="140,280 270,140 400,280" />
              </g>
              
              {/* Lush Green Fields */}
              <rect x="0" y="275" width="400" height="125" fill="url(#grassGradientFarmer)" rx="4" />
              
              {/* Trees */}
              <g>
                <rect x="45" y="255" width="10" height="35" fill="#78350f" />
                <ellipse cx="50" cy="245" rx="22" ry="26" fill="#15803d" />
              </g>
              
              {/* Growing Agricultural Crops */}
              <g fill="#fef08a">
                <ellipse cx="80" cy="310" rx="6" ry="10" />
                <ellipse cx="160" cy="305" rx="6" ry="10" />
                <ellipse cx="240" cy="310" rx="6" ry="10" />
                <ellipse cx="320" cy="305" rx="6" ry="10" />
              </g>
            </svg>
          )}
          
          <div className="text-center mt-6">
            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-md">
              {selectedRole === 'owner' 
                ? 'Welcome to ColdSense Business!' 
                : selectedRole === 'stakeholder'
                ? 'Welcome, Investor!'
                : 'Welcome to ColdSense!'}
            </h2>
            <p className="text-white/90 font-medium max-w-sm">
              {selectedRole === 'owner' 
                ? 'Your journey to smart cold storage management begins here' 
                : selectedRole === 'stakeholder'
                ? 'Start investing in verified cold storage opportunities'
                : 'Your journey to smart farming begins here'}
            </p>
          </div>
        </div>

        {/* Signup Card Component */}
        <Card variant="default" className="w-full max-w-md mx-auto shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeRole}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="text-sm font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
                Step {currentStep}/2
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              {currentStep === 1 ? 'Create Account' : 'Complete Your Profile'}
            </CardTitle>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              {currentStep === 1 
                ? `Sign up as ${selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : 'User'}`
                : 'Tell us more about yourself'}
            </p>
          </CardHeader>
          <CardContent>
            {currentStep === 1 ? (
              // STEP 1: Email & Password
              <form onSubmit={handleStep1Submit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      autoComplete="off"
                      name="email-signup"
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      required
                    />
                  </div>
                  {email && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      {validateEmail(email) ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-red-500" />
                      )}
                      <span className={validateEmail(email) ? 'text-green-600' : 'text-red-600'}>
                        {validateEmail(email) ? 'Valid email' : 'Invalid email format'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="new-password"
                      name="password-signup"
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      required
                    />
                  </div>
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${strengthColors[passwordStrength - 1] || 'bg-gray-300'}`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {strengthLabels[passwordStrength - 1] || 'Too weak'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div className="flex items-center gap-1">
                          {password.length >= 8 ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                          <span>At least 8 characters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/[a-z]/.test(password) && /[A-Z]/.test(password) ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                          <span>Uppercase and lowercase letters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/\d/.test(password) ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                          <span>At least one number</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      autoComplete="new-password"
                      name="password-confirm"
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      required
                    />
                  </div>
                  {confirmPassword && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      {password === confirmPassword ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-red-500" />
                      )}
                      <span className={password === confirmPassword ? 'text-green-600' : 'text-red-600'}>
                        {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={loading}
                  disabled={!validateEmail(email) || password.length < 8 || password !== confirmPassword}
                >
                  Next
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Login
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              // STEP 2: Profile Information
              <form onSubmit={handleStep2Submit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      required
                    />
                  </div>
                </div>

                {selectedRole === 'owner' && (
                  <div>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Company Name"
                        className="w-full pl-10 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                      className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="District"
                      className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      placeholder="City"
                      className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-900 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={loading}
                >
                  Complete Profile
                </Button>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 font-medium"
                  >
                    ← Back to Step 1
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
