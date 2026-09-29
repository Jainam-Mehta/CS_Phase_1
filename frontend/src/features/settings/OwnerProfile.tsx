import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Mail, Shield, Camera, Calendar, MapPin, Building, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OwnerProfileData {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  phone?: string;
  owner_company_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  date_of_birth?: string;
  gender?: string;
  state_id?: string;
  district_id?: string;
  locality_id?: string;
}

const OwnerProfile: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<OwnerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    state_id: '',
    district_id: '',
    locality_id: '',
  });
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [localities, setLocalities] = useState<any[]>([]);

  useEffect(() => {
    loadOwnerProfile();
    loadStates();
  }, [user?.id]);

  useEffect(() => {
    if (formData.state_id) {
      loadDistricts(formData.state_id);
    } else {
      setDistricts([]);
      setLocalities([]);
    }
  }, [formData.state_id]);

  useEffect(() => {
    if (formData.district_id) {
      loadLocalities(formData.district_id);
    } else {
      setLocalities([]);
    }
  }, [formData.district_id]);

  const loadOwnerProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError('');

      // Fetch profile data from profiles table (no joins needed - no FK relationships exist)
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Get email from auth user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      setProfileData({
        ...data,
        email: authUser?.email || data.email,
      });

      // Initialize form with profile data
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        date_of_birth: data.date_of_birth || '',
        gender: data.gender || '',
        state_id: data.state_id || '',
        district_id: data.district_id || '',
        locality_id: data.locality_id || '',
      });
    } catch (err) {
      console.error('Error loading owner profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadStates = async () => {
    try {
      const { data } = await supabase.from('states').select('*').order('name');
      if (data) setStates(data);
    } catch (err) {
      console.error('Error loading states:', err);
    }
  };

  const loadDistricts = async (stateId: string) => {
    try {
      const { data } = await supabase
        .from('districts')
        .select('*')
        .eq('state_id', stateId)
        .order('name');
      if (data) setDistricts(data);
    } catch (err) {
      console.error('Error loading districts:', err);
    }
  };

  const loadLocalities = async (districtId: string) => {
    try {
      const { data } = await supabase
        .from('localities')
        .select('*')
        .eq('district_id', districtId)
        .order('name');
      if (data) setLocalities(data);
    } catch (err) {
      console.error('Error loading localities:', err);
    }
  };

  const handleEditClick = () => {
    if (profileData) {
      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        date_of_birth: profileData.date_of_birth || '',
        gender: profileData.gender || '',
        state_id: profileData.state_id || '',
        district_id: profileData.district_id || '',
        locality_id: profileData.locality_id || '',
      });
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileData) return;
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          state_id: formData.state_id || null,
          district_id: formData.district_id || null,
          locality_id: formData.locality_id || null,
        })
        .eq('id', profileData.id);

      if (error) throw error;

      setProfileData({
        ...profileData,
        full_name: formData.full_name,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        state_id: formData.state_id,
        district_id: formData.district_id,
        locality_id: formData.locality_id,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
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

  const getStateNameById = (id: string) => {
    const state = states.find(s => s.id === id);
    return state?.name || 'Not Provided';
  };

  const getDistrictNameById = (id: string) => {
    const district = districts.find(d => d.id === id);
    return district?.name || 'Not Provided';
  };

  const getLocalityNameById = (id: string) => {
    const locality = localities.find(l => l.id === id);
    return locality?.name || 'Not Provided';
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

  const fullName = profileData.full_name || 'Owner';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Profile
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View your profile information
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleEditClick}
          className="flex items-center gap-2"
        >
          <User className="h-4 w-4" />
          Edit Profile
        </Button>
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
                {profileData.role || 'Owner'}
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
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {getFieldValue(profileData.email)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Full Name
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {getFieldValue(profileData.full_name)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Phone
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {getFieldValue(profileData.phone)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date of Birth
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {getFieldValue(profileData.date_of_birth ? formatDate(profileData.date_of_birth) : '')}
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
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {getFieldValue(profileData.email)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Location Information */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Information
              </h4>
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State
                    </label>
                    <select
                      value={formData.state_id}
                      onChange={(e) => {
                        setFormData({ ...formData, state_id: e.target.value, district_id: '', locality_id: '' });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select State</option>
                      {states.map(state => (
                        <option key={state.id} value={state.id}>{state.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      District
                    </label>
                    <select
                      value={formData.district_id}
                      onChange={(e) => {
                        setFormData({ ...formData, district_id: e.target.value, locality_id: '' });
                      }}
                      disabled={!formData.state_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                    >
                      <option value="">Select District</option>
                      {districts.map(district => (
                        <option key={district.id} value={district.id}>{district.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Locality
                    </label>
                    <select
                      value={formData.locality_id}
                      onChange={(e) => setFormData({ ...formData, locality_id: e.target.value })}
                      disabled={!formData.district_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                    >
                      <option value="">Select Locality</option>
                      {localities.map(locality => (
                        <option key={locality.id} value={locality.id}>{locality.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      State
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {formData.state_id ? getStateNameById(formData.state_id) : 'Not Provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      District
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {formData.district_id ? getDistrictNameById(formData.district_id) : 'Not Provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Locality
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {formData.locality_id ? getLocalityNameById(formData.locality_id) : 'Not Provided'}
                    </p>
                  </div>
                </div>
              )}
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
                    {getFieldValue(profileData.role)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Account Status
                  </label>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {profileData.is_active ? 'Active' : 'Inactive'}
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

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800 space-y-2">
              {isEditing ? (
                <>
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerProfile;
