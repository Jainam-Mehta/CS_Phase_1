import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Mail, Lock, ArrowLeft, Check, X, AlertCircle, User, Phone, MapPin, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setUser, isAuthenticated } = useAuthStore();
  
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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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
            role: selectedRole,
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

      if (!data.session) {
        setError('Please check your email to confirm your account before continuing.');
        return;
      }

      // Store user ID and move to step 2
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
      // Create profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: userId,
          first_name: firstName,
          last_name: lastName,
          mobile_number: mobile,
          role_id: selectedRole === 'owner' ? 1 : selectedRole === 'farmer' ? 2 : 3,
        });

      if (profileError) {
        setError('Failed to create profile: ' + profileError.message);
        throw profileError;
      }

      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: selectedRole,
        });
      }

      // Navigate based on role
      if (selectedRole === 'owner') {
        // Owner goes to facility setup
        navigate('/owner-setup');
      } else {
        // Farmer and Stakeholder go to dashboard
        navigate('/');
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
      <div className="w-full max-w-md">
        {/* Signup Card */}
        <Card variant="default" className="w-full">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeRole}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="text-sm font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full">
                Step {currentStep}/2
              </div>
            </div>
            <CardTitle className="text-2xl">
              {currentStep === 1 ? 'Create Account' : 'Complete Your Profile'}
            </CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
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
