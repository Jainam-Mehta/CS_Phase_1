import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Mail, Lock, ArrowLeft, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setUser, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      console.log('=== SIGNUP ATTEMPT ===');
      console.log('Email:', email);
      console.log('Password length:', password.length);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Supabase Anon Key present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

      // Sign up with Supabase and store role in user metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole, // Store role in user metadata
          },
        },
      });

      console.log('=== COMPLETE SUPABASE RESPONSE ===');
      console.log('Full data object:', JSON.stringify(data, null, 2));
      console.log('Full error object:', JSON.stringify(signUpError, null, 2));
      console.log('data.user:', data.user);
      console.log('data.session:', data.session);
      console.log('signUpError:', signUpError);

      // Check for error FIRST - this is the primary condition
      if (signUpError) {
        console.error('Supabase returned an error:', signUpError);
        const errorMessage = signUpError.message || 'Signup failed. Please try again.';
        console.error('Error message to display:', errorMessage);
        setError(errorMessage);
        throw signUpError;
      }

      // Only after confirming no error, check if user was created
      if (!data.user) {
        console.error('No error returned, but no user was created either');
        console.error('This indicates a silent failure in Supabase');
        setError('Signup failed: No user was created by Supabase. Please try again.');
        throw new Error('No user created during signup despite no error');
      }

      console.log('✓ User successfully created:', data.user);
      console.log('User ID:', data.user.id);
      console.log('User email:', data.user.email);

      // Check if email confirmation is required
      if (!data.session) {
        console.log('No session created - email confirmation likely required');
        console.log('User was created but awaits email confirmation');
        setError('Please check your email to confirm your account before continuing.');
        // Do not navigate to profile setup
        return;
      }

      console.log('✓ Session created:', data.session);

      // Verify session was established
      if (!data.session) {
        console.log('No session created - email confirmation likely required');
        setError('Please check your email to confirm your account before continuing.');
        return;
      }

      // Store signup data in localStorage for profile setup
      // This persists across email verification callback
      localStorage.setItem('signupData', JSON.stringify({
        email,
        role: selectedRole,
      }));

      console.log('✓ Navigating to profile setup');
      // Navigate to appropriate profile setup based on role
      if (selectedRole === 'owner') {
        navigate('/owner-profile-setup');
      } else if (selectedRole === 'stakeholder') {
        navigate('/stakeholder-profile-setup');
      } else {
        navigate('/farmer-profile-setup');
      }
    } catch (err: any) {
      console.error('=== SIGNUP ERROR ===');
      console.error('Error:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      // Error is already set above
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
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Sign up as {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : 'User'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="•••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                Create Account
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
