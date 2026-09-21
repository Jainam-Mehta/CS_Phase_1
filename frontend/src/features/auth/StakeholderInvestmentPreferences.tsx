import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { MapPin, Building2, Plus, Check, AlertCircle, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logStakeholderRequest } from '../../lib/activityLogger';
import type { State, Site, ColdStorageRoom } from '../../lib/supabase';

interface Facility {
  id: string;
  name: string;
  ownerName: string;
  siteName: string;
  district: string;
  state: string;
  roomCount: number;
  totalCapacity: number;
}

interface SelectedFacilityWithAmount extends Facility {
  investmentAmount: number;
}

const StakeholderInvestmentPreferences: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [states, setStates] = useState<State[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedFacilities, setSelectedFacilities] = useState<SelectedFacilityWithAmount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, roles(name)')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!profile || (profile.roles as any)?.name !== 'Stakeholder') {
        setError('Invalid profile. Please complete stakeholder profile setup first.');
        setTimeout(() => navigate('/stakeholder-profile-setup'), 3000);
        return;
      }
    } catch (err) {
      console.error('Authentication verification failed:', err);
      setError('Authentication verification failed.');
    } finally {
      setLoading(false);
    }
  };

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
      setError('Failed to load states. Please check your internet connection.');
    }
  };

  const loadFacilities = async (stateId: string) => {
    try {
      setLoading(true);
      setError('');

      // Fetch sites in this state directly mapped
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, facility_name, owner_profile_id, state_id, district_id, profiles(full_name, owner_company_id)')
        .eq('state_id', stateId)
        .eq('is_active', true);

      if (sitesError) throw sitesError;
      if (!sitesData || sitesData.length === 0) {
        setFacilities([]);
        return;
      }

      // Fetch room counts and capacity for each site
      const siteIds = sitesData.map((s: any) => s.id);
      const { data: rooms } = await supabase
        .from('cold_storage_rooms')
        .select('site_id, capacity_kg')
        .in('site_id', siteIds);

      const roomData = rooms?.reduce((acc, room) => {
        if (!acc.has(room.site_id)) {
          acc.set(room.site_id, { count: 0, capacity: 0 });
        }
        const data = acc.get(room.site_id)!;
        data.count++;
        data.capacity += room.capacity_kg || 0;
        return acc;
      }, new Map<string, { count: number; capacity: number }>()) || new Map();

      // Fetch district names
      const districtIds = [...new Set(sitesData.map((s: any) => s.district_id).filter(Boolean))];
      const { data: districts } = await supabase
        .from('districts')
        .select('id, name')
        .in('id', districtIds);

      const districtMap = new Map(districts?.map((d) => [d.id, d.name]) || []);

      // Build native facility array
      const facilityList: Facility[] = sitesData.map((f: any) => {
        const roomInfo = roomData.get(f.id) || { count: 0, capacity: 0 };
        const districtName = districtMap.get(f.district_id) || 'Unknown';
        
        let ownerName = 'Unknown Owner';
        if (f.profiles) {
           ownerName = `${f.profiles.first_name || ''} ${f.profiles.last_name || ''}`.trim() || 'Unknown Owner';
        }

        return {
          id: f.id,
          name: f.facility_name,
          ownerName: ownerName,
          siteName: f.facility_name,
          district: districtName,
          state: states.find((s) => s.id === stateId)?.name || 'Unknown',
          roomCount: roomInfo.count,
          totalCapacity: roomInfo.capacity,
        };
      });

      setFacilities(facilityList);
    } catch (err) {
      console.error('Error loading facilities:', err);
      setError('Failed to load facilities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId || null);
    if (stateId) {
      loadFacilities(stateId);
    } else {
      setFacilities([]);
    }
  };

  const handleFacilitySelect = (facility: Facility) => {
    // Check for duplicate
    if (selectedFacilities.some((f) => f.id === facility.id)) {
      setError('You have already selected this facility');
      return;
    }

    setSelectedFacilities([...selectedFacilities, { ...facility, investmentAmount: 100000 }]);
    setError('');
  };

  const handleUpdateInvestmentAmount = (facilityId: string, amount: number) => {
    setSelectedFacilities(selectedFacilities.map(f =>
      f.id === facilityId ? { ...f, investmentAmount: amount } : f
    ));
  };

  const handleRemoveFacility = (facilityId: string) => {
    setSelectedFacilities(selectedFacilities.filter((f) => f.id !== facilityId));
  };

  const handleAddAnother = () => {
    setSelectedStateId(null);
    setFacilities([]);
  };

  const handleSubmit = async () => {
    if (selectedFacilities.length === 0) {
      setError('Please select at least one facility');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No authenticated session found');
      }

      // Get stakeholder profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Insert into stakeholder_interest with investment amounts
      const interests = selectedFacilities.map((facility) => ({
        stakeholder_id: profile.id,
        facility_id: facility.id,
        interest_status: 'Interested'
      }));

      const { error: insertError } = await supabase
        .from('stakeholder_interest')
        .insert(interests);

      if (insertError) throw insertError;

      // Log stakeholder requests for each facility
      for (const facility of selectedFacilities) {
        await logStakeholderRequest(
          profile.id,
          `${session.user.email || 'Unknown'}`,
          facility.id,
          facility.name,
          facility.investmentAmount
        );
      }

      setSuccess(true);
      setTimeout(() => {
        // Always go to stakeholder map after saving preferences
        navigate('/stakeholder/map');
      }, 2000);
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      setError(err.message || 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Briefcase className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Investment Preferences</h1>
            <div className="text-sm font-semibold text-purple-600 bg-white px-3 py-1 rounded-full">
              Step 3/3
            </div>
          </div>
          <p className="text-white/90">Tell us where you'd like to invest</p>
        </div>

        {success ? (
          <Card variant="default" className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Success!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your investment preferences have been saved successfully.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                Redirecting to dashboard...
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Section 1: State Selection */}
            <Card variant="default">
              <CardHeader>
                <CardTitle>Select State</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedStateId || ''}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full pl-10 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a state</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Available Facilities */}
            {selectedStateId && facilities.length > 0 && (
              <Card variant="default">
                <CardHeader>
                  <CardTitle>Available Facilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {facilities.map((facility) => {
                      const isSelected = selectedFacilities.some((f) => f.id === facility.id);
                      
                      return (
                        <div
                          key={facility.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'
                          }`}
                          onClick={() => handleFacilitySelect(facility)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <Building2 className="h-6 w-6 text-purple-600" />
                            {isSelected && <Check className="h-5 w-5 text-green-500" />}
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {facility.name}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p><span className="font-medium">Owner:</span> {facility.ownerName}</p>
                            <p><span className="font-medium">Site:</span> {facility.siteName}</p>
                            <p><span className="font-medium">District:</span> {facility.district}</p>
                            <p><span className="font-medium">State:</span> {facility.state}</p>
                            <p><span className="font-medium">Rooms:</span> {facility.roomCount}</p>
                            {facility.totalCapacity > 0 && (
                              <p><span className="font-medium">Capacity:</span> {facility.totalCapacity.toLocaleString()} kg</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedStateId && facilities.length === 0 && (
              <Card variant="default">
                <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No facilities available in this state.
                </CardContent>
              </Card>
            )}

            {/* Selected Facilities */}
            {selectedFacilities.length > 0 && (
              <Card variant="default">
                <CardHeader>
                  <CardTitle>Selected Facilities ({selectedFacilities.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedFacilities.map((facility) => (
                      <div
                        key={facility.id}
                        className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg gap-4"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{facility.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {facility.siteName}, {facility.district}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Investment:</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">₹</span>
                            <input
                              type="number"
                              min="10000"
                              step="10000"
                              value={facility.investmentAmount}
                              onChange={(e) => handleUpdateInvestmentAmount(facility.id, parseInt(e.target.value) || 0)}
                              className="pl-6 pr-3 py-1 w-32 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFacility(facility.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleAddAnother}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Facility
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StakeholderInvestmentPreferences;
