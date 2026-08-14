import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Mail, Lock, AlertCircle, ArrowLeft, Sprout, BarChart3, ShieldCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, setUser, clearSelectedRole, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to role selection if no role is selected
  useEffect(() => {
    if (!selectedRole) {
      navigate('/role-selection');
    }
  }, [selectedRole, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const roleConfig = {
    farmer: {
      title: 'Welcome Farmer',
      subtitle: 'Sign in to access your Farmer Dashboard',
      accent: 'green',
      gradient: 'from-green-500 to-emerald-600',
      icon: Sprout,
    },
    owner: {
      title: 'Welcome Owner',
      subtitle: 'Full system access and management controls',
      accent: 'purple',
      gradient: 'from-purple-500 to-pink-600',
      icon: ShieldCheck,
    },
    stakeholder: {
      title: 'Welcome Stakeholder',
      subtitle: 'View reports, analytics, and business insights',
      accent: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
      icon: BarChart3,
    },
    admin: {
      title: 'Welcome Admin',
      subtitle: 'System administration and configuration',
      accent: 'red',
      gradient: 'from-red-500 to-orange-600',
      icon: ShieldAlert,
    },
  };

  const currentRole = selectedRole ? roleConfig[selectedRole] : roleConfig.farmer;
  const RoleIcon = currentRole.icon;
  const roleTitle = selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : 'User';

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-accent-500 p-4">
        <div className="text-white text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Login response:', { data, error: signInError });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before logging in');
        } else {
          setError(signInError.message || 'Login failed. Please try again.');
        }
        throw signInError;
      }

      // Verify session was established
      if (!data.session) {
        setError('Login failed: No session established. Please try again.');
        throw new Error('No session established during login');
      }

      // Verify user exists
      if (!data.user) {
        setError('Login failed: No user found. Please try again.');
        throw new Error('No user found during login');
      }

      console.log('Login successful:', { user: data.user, session: data.session });

      // Set user with Supabase data
      setUser({
        id: data.user.id,
        name: data.user.user_metadata?.name || email.split('@')[0],
        email: data.user.email || email,
        role: selectedRole,
        sites: [],
      });

      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      // Error is already set above
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = () => {
    clearSelectedRole();
    navigate('/role-selection');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-accent-500 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Illustration Section - Desktop Only */}
        <div className="hidden lg:flex flex-col items-center justify-center">
          <div className={`w-64 h-64 bg-gradient-to-br ${currentRole.gradient} rounded-3xl flex items-center justify-center shadow-2xl mb-6`}>
            <RoleIcon className="h-32 w-32 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">ColdSense AI</h2>
            <p className="text-white/80">Smart Cold Storage Management</p>
          </div>
        </div>

        {/* Login Card */}
        <Card variant="default" className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeRole}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Change Role
              </Button>
              <div className={`w-12 h-12 bg-gradient-to-br ${currentRole.gradient} rounded-xl flex items-center justify-center`}>
                <RoleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">{currentRole.title}</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {currentRole.subtitle}
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
                  Email Address
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
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
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <input type="checkbox" className="rounded" />
                  Remember me
                </label>
                <a href="#" className="text-primary-600 hover:text-primary-700">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
              >
                Continue as {roleTitle}
              </Button>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Sign Up
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

export default Login;