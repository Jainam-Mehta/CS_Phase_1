import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Mail, Lock, AlertCircle, ArrowLeft, Sprout, Building2, TrendingUp, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthLoading } from '../../providers/AuthProvider';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';
import { RoleBackground } from '../../components/common/RoleBackground';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRole, clearSelectedRole, isAuthenticated, user } = useAuthStore();
  const authLoadingState = useAuthLoading();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to role selection if no role is selected
  useEffect(() => {
    if (!selectedRole) {
      navigate('/role-selection');
    }
  }, [selectedRole, navigate]);

  // Only redirect when auth is fully resolved, user is authenticated, AND role is loaded
  useEffect(() => {
    const { loading: authLoading, isLoadingRole } = authLoadingState;

    if (!authLoading && !isLoadingRole && isAuthenticated && user?.role) {
      console.log('All conditions met, navigating to dashboard');
      navigate('/');
    }
  }, [authLoadingState, isAuthenticated, user, navigate]);

  const roleConfig = {
    farmer: {
      title: 'Farmer Access',
      accent: 'emerald',
      icon: Sprout,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    owner: {
      title: 'Facility Owner Access',
      accent: 'sky',
      icon: Building2,
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    stakeholder: {
      title: 'Stakeholder Access',
      accent: 'indigo',
      icon: TrendingUp,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
    admin: {
      title: 'Admin Access',
      accent: 'rose',
      icon: ShieldAlert,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      btnColor: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
  };

  const currentRole = roleConfig[selectedRole as keyof typeof roleConfig] || roleConfig.farmer;
  const RoleIcon = currentRole.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before logging in.');
        } else {
          throw authError;
        }
      }

      if (!authData.user) {
        throw new Error('No user data returned');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }

      if (profile) {
        if (profile.role !== selectedRole && selectedRole !== 'admin') {
          console.warn(`Role mismatch: user is ${profile.role}, but selected ${selectedRole}`);
        }
      }

      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
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
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 z-20 w-full max-w-md mx-auto">
        <div className="w-full rounded-2xl bg-white border border-gray-200/90 p-8 shadow-lg shadow-slate-200/50">
          {/* Header Row with Change Role button */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <button
              onClick={handleChangeRole}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Role</span>
            </button>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${currentRole.badgeColor}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span className="capitalize">{selectedRole}</span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
              Welcome Back to SystmII
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Sign in to manage and monitor your cold chain facility
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  name="email-input"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  name="password-input"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Remember Me
              </label>
              <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors font-medium">
                Forgot Password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              className={`w-full py-3 mt-2 ${currentRole.btnColor} font-semibold rounded-xl shadow-sm transition-all text-sm`}
              loading={loading}
            >
              Log In to SystmII
            </Button>

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </form>
        </div>
      </main>

            {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-gray-500 dark:text-gray-400 mt-12 bg-white dark:bg-slate-900 shrink-0 z-30">
        &copy; 2026 Systm II | Powered by 1Accord Technologies | v1.0
      </footer>
    </div>
  );
};

export default Login;
