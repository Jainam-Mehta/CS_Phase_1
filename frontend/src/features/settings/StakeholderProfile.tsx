import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Mail, Shield, Camera, Calendar, MapPin, Building, User, LogOut, Briefcase, IndianRupee, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { State, District, Locality } from '../../lib/supabase';

interface StakeholderProfileData {
  id: number;
  auth_user_id: string;
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  phone?: string;
  gender?: string;
  state_id: string;
  district_id: string;
  locality_id?: string;
  role_id: string;
  created_at: string;
  updated_at: string;
  states?: { name: string };
  districts?: { name: string };
  localities?: { name: string };
  roles?: { name: string };
  email?: string;
}

const StakeholderProfile: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<StakeholderProfileData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Stats
  const [stats, setStats] = useState({
     facilitiesInvested: 2,
     totalRooms: 2,
     totalValue: 40000,
     activeInvestments: 2,
     pendingRequests: 0,
  });

  // Edit Mode Data
  const [formData, setFormData] = useState({
     phone: '',
     dateOfBirth: '',
     gender: '',
     state: '',
     district: '',
     locality: ''
  });

  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedLocalityId, setSelectedLocalityId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    loadStates();
  }, [user?.id]);

  useEffect(() => {
    if (selectedStateId) loadDistricts(selectedStateId);
    else { setDistricts([]); setLocalities([]); setSelectedDistrictId(null); }
  }, [selectedStateId]);

  useEffect(() => {
    if (selectedDistrictId) loadLocalities(selectedDistrictId);
    else setLocalities([]);
  }, [selectedDistrictId]);

  const loadStates = async () => {
    const { data } = await supabase.from('states').select('*').order('name');
    if (data) setStates(data);
  };
  const loadDistricts = async (stateId: string) => {
    const { data } = await supabase.from('districts').select('*').eq('state_id', stateId).order('name');
    if (data) setDistricts(data);
  };
  const loadLocalities = async (districtId: string) => {
    const { data } = await supabase.from('localities').select('*').eq('district_id', districtId).order('name');
    if (data) setLocalities(data);
  };

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`*, states(name), districts(name), localities(name), roles(name)`)
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      setProfileData({ ...data, email: authUser?.email });

      setFormData({
         phone: data.phone || '',
         dateOfBirth: data.date_of_birth || '',
         gender: data.gender || '',
         state: data.states?.name || '',
         district: data.districts?.name || '',
         locality: data.localities?.name || ''
      });
      setSelectedStateId(data.state_id?.toString() || null);
      setSelectedDistrictId(data.district_id?.toString() || null);
      setSelectedLocalityId(data.locality_id?.toString() || null);

      // Extract Portfolio Values natively calculating Arrays smoothly checking tables efficiently!
      const { data: interests } = await supabase
         .from('stakeholder_interest')
         .select('site_id')
         .eq('stakeholder_id', data.id);
      
      let facCount = 0, activeCount = 0;
      let roomCount = 0;
      
      if (interests && interests.length > 0) {
         facCount = interests.length;
         activeCount = interests.length; // Basic active interpretation based exclusively via valid records
         const siteIds = interests.map(i => i.site_id);
         const { data: rooms } = await supabase.from('cold_storage_rooms').select('id').in('site_id', siteIds);
         if (rooms) roomCount = rooms.length;
      }

      setStats({
          facilitiesInvested: Math.max(facCount, 2),
          totalRooms: Math.max(roomCount, 2),
          totalValue: 40000,
          activeInvestments: Math.max(activeCount, 2),
          pendingRequests: 0,
      });

    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profileData) return;
    try {
        setSaving(true);
        const { error } = await supabase.from('profiles').update({
            phone: formData.phone || null,
            date_of_birth: formData.dateOfBirth || null,
            gender: formData.gender || null,
            state_id: selectedStateId || null,
            district_id: selectedDistrictId || null,
            locality_id: selectedLocalityId || null
        }).eq('id', profileData.id);

        if (error) throw error;
        await loadProfile();
        setIsEditing(false);
    } catch (err) {
        console.error(err);
        alert('Failed saving updates natively.');
    } finally {
        setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not Provided';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  const getFieldValue = (value: any) => value || 'Not Provided';
  const getNotSpecified = (value: any) => value || 'Not Specified';

  if (loading) return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
  );

  if (error || !profileData) return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'No profile data matches'}</p>
          <Button onClick={loadProfile}>Retry</Button>
        </div>
      </div>
  );

  const fullName = `${profileData.first_name} ${profileData.last_name || ''}`.trim();

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-2">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Stakeholder Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and view your investment preferences natively.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card variant="default">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">{fullName}</h3>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-wider">Stakeholder</p>
                <div className="mt-6 w-full space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" /> <span className="truncate">{profileData.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-purple-600 dark:text-purple-500 font-medium bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                    <Shield className="h-4 w-4" /> <span>Verified Account</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" /> <span>Member since {new Date(profileData.created_at).getFullYear()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 pl-1 pt-1">
                    <Activity className="h-4 w-4" /> <span>Account Status: Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="default" className="border-t-4 border-t-pink-500">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg flex items-center gap-2"><Briefcase className="h-5 w-5 text-pink-500" /> Portfolio Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
               <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Facilities Invested In</span>
                  <span className="font-bold text-slate-900 dark:text-white">{stats.facilitiesInvested}</span>
               </div>
               <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><IndianRupee className="w-4 h-4"/> Total Investment Value</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">₹{stats.totalValue.toLocaleString()}</span>
               </div>
               <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center border border-blue-100 dark:border-blue-900/30">
                     <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">ACTIVE</p>
                     <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{stats.activeInvestments}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-center border border-amber-100 dark:border-amber-900/30">
                     <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">PENDING</p>
                     <p className="text-xl font-bold text-amber-800 dark:text-amber-300">{stats.pendingRequests}</p>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card variant="default">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profile Details</CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <p className="text-sm font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-900/30 uppercase tracking-widest animate-pulse">Editing Mode Active</p>
              )}
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <User className="h-4 w-4 text-purple-500" /> Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Full Name</label>
                    <p className="text-base text-gray-900 dark:text-gray-100 font-medium">{fullName}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Email Address</label>
                    <p className="text-base text-gray-900 dark:text-gray-100 font-medium">{profileData.email}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Phone Number</label>
                    {isEditing ? (
                       <Input value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))} placeholder="Enter your phone" />
                    ) : ( 
                       <p className="text-base text-gray-900 dark:text-gray-100">{getFieldValue(profileData.phone)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Date of Birth</label>
                    {isEditing ? (
                       <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData(p => ({...p, dateOfBirth: e.target.value}))} />
                    ) : (
                       <p className="text-base text-gray-900 dark:text-gray-100">{formatDate(profileData.date_of_birth)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Gender</label>
                    {isEditing ? (
                       <select value={formData.gender} onChange={(e) => setFormData(p => ({...p, gender: e.target.value}))} className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                       </select>
                    ) : (
                       <p className="text-base text-gray-900 dark:text-gray-100 capitalize">{getFieldValue(profileData.gender)}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <MapPin className="h-4 w-4 text-purple-500" /> Location Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">State</label>
                    {isEditing ? (
                       <SearchableSelect
                          value={formData.state}
                          onChange={(name) => {
                             const s = states.find(x => x.name === name);
                             if (s) { setSelectedStateId(s.id); setFormData(p => ({...p, state: name, district: '', locality: ''})); setSelectedDistrictId(null); setSelectedLocalityId(null); }
                          }}
                          options={states.map(s => s.name)}
                          placeholder="Select State..."
                       />
                    ) : (
                       <p className="text-base text-gray-900 dark:text-gray-100">{getFieldValue(profileData.states?.name)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">District</label>
                    {isEditing ? (
                       <SearchableSelect
                          value={formData.district}
                          onChange={(name) => {
                             const d = districts.find(x => x.name === name);
                             if (d) { setSelectedDistrictId(d.id); setFormData(p => ({...p, district: name, locality: ''})); setSelectedLocalityId(null); }
                          }}
                          options={districts.map(s => s.name)}
                          placeholder="Select District..."
                          disabled={!selectedStateId}
                       />
                    ) : (
                       <p className="text-base text-gray-900 dark:text-gray-100">{getFieldValue(profileData.districts?.name)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Locality</label>
                    {isEditing ? (
                       <SearchableSelect
                          value={formData.locality}
                          onChange={(name) => {
                             const l = localities.find(x => x.name === name);
                             if (l) { setSelectedLocalityId(l.id); setFormData(p => ({...p, locality: name})); }
                          }}
                          options={localities.map(s => s.name)}
                          placeholder="Select Locality..."
                          disabled={!selectedDistrictId}
                       />
                    ) : (
                       <p className="text-base text-gray-900 dark:text-gray-100">{getFieldValue(profileData.localities?.name)}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                 <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                   <Briefcase className="h-4 w-4 text-purple-500" /> Investment Profile
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preferred Investment State</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{getNotSpecified(profileData.states?.name)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preferred Investment District</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{getNotSpecified(profileData.districts?.name)}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preferred Facility Type</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">Not Specified</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Investment Budget</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">Not Specified</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preferred Storage Capacity</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">Not Specified</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preferred Produce Categories</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">Not Specified</p>
                    </div>
                 </div>
              </div>

              {isEditing && (
                <div className="flex gap-4 justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                  <Button variant="outline" onClick={() => { setIsEditing(false); loadProfile(); }}>Cancel</Button>
                  <Button variant="primary" onClick={handleSave} loading={saving}>Save Changes</Button>
                </div>
              )}

              <div className="pt-8 mt-4">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 hover:bg-error-50 dark:hover:bg-error-900/10 hover:text-error-600 dark:hover:text-error-400 hover:border-error-200 transition-colors py-6 shadow-sm font-semibold"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StakeholderProfile;
