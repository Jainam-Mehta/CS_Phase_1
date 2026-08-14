import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Mail, Shield, Camera, Calendar, MapPin, Building, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OwnerProfileData {
  id: number;
  auth_user_id: string;
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  state_id: number;
  district_id: number;
  locality_id?: number;
  role_id: string;
  owner_company_id?: string;
  created_at: string;
  updated_at: string;
  state_name?: string;
  district_name?: string;
  locality_name?: string;
  role_name?: string;
  email?: string;
}

const OwnerProfile: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<OwnerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOwnerProfile();
  }, [user?.id]);

  const loadOwnerProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError('');

      // Fetch full profile data with joins based strictly on logged in auth token
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          *,
          states(name),
          districts(name),
          localities(name),
          roles(name)
        `)
        .eq('auth_user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Get email from auth user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      setProfileData({
        ...data,
        email: authUser?.email,
        state_name: data.states?.name,
        district_name: data.districts?.name,
        locality_name: data.localities?.name,
        role_name: data.roles?.name,
      });
    } catch (err) {
      console.error('Error loading owner profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not Provided';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not Provided';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFieldValue = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'Not Provided';
    }
    return value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadOwnerProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">No profile data available</p>
      </div>
    );
  }

  const fullName = `${profileData.first_name} ${profileData.last_name || ''}`.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Profile
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View your profile information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card variant="default" className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <Camera className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">
                {fullName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {profileData.role_name || 'Owner'}
              </p>
              
              <div className="mt-4 w-full space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{profileData.email || 'Not Provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span>Verified Account</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card variant="default" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    First Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getFieldValue(profileData.first_name)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Last Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getFieldValue(profileData.last_name)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Email
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getFieldValue(profileData.email)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Date of Birth
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(profileData.date_of_birth)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Gender
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getFieldValue(profileData.gender)}
                  </p>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    State
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getFieldValue(profileData.state_name)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    District
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getFieldValue(profileData.district_name)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Locality
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getFieldValue(profileData.locality_name)}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Account Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Role
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getFieldValue(profileData.role_name)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Account Status
                  </label>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Active
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Created Date
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDateTime(profileData.created_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDateTime(profileData.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerProfile;
