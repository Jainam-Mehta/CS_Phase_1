import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { MapPin, Building2, Plus, Check, AlertCircle, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logStakeholderRequest } from '../../lib/activityLogger';
import type { State, Site, ColdStorageRoom } from '../../lib/supabase';
import { RoleBackground } from '../../components/common/RoleBackground';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';


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

      // Check if profile exists and is a stakeholder
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError);
        setError('Invalid profile. Please complete stakeholder profile setup first.');
        setTimeout(() => navigate('/stakeholder-profile-setup'), 3000);
        return;
      }

      if (profile.user_type !== 'stakeholder') {
        console.error('Invalid user type:', profile.user_type);
        setError('Access denied. Stakeholder role required.');
        setTimeout(() => navigate('/stakeholder/map'), 3000);
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
        .select('id, facility_name, owner_profile_id, state_id, district_id, profiles(full_name)')
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
           ownerName = f.profiles.full_name || 'Unknown Owner';
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
      console.error('Error loading sites:', err);
      setError('Failed to load sites. Please try again.');
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
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Create investment objects
      const investments = selectedFacilities.map((facility) => ({
        stakeholder_id: profile.id,
        site_id: facility.id,
        investment_amount_inr: facility.investmentAmount,
        investment_date: new Date().toISOString().split('T')[0], // Send only date part (YYYY-MM-DD)
        status: 'Pending', // Awaiting owner approval
        roi_percentage_estimate: 0,
        carbon_credits: 0
      }));

      // Insert into stakeholder_investments (one at a time to catch errors better)
      console.log('Attempting to insert investments:', investments);
      
      for (const investment of investments) {
        console.log('Inserting investment:', investment);
        const { error: investmentError, data: investmentData } = await supabase
          .from('stakeholder_investments')
          .insert([investment]);

        console.log(`Investment insert for ${investment.site_id}:`, { data: investmentData, error: investmentError });

        if (investmentError) {
          console.error(`Failed to insert investment for site ${investment.site_id}:`, investmentError);
          throw new Error(`Failed to save investment for facility: ${investmentError.message}`);
        }
      }

      // Also create stakeholder_interest records (one at a time)
      // NOTE: Removed - we only create stakeholder_investments now
      // stakeholder_interest is kept only for future "express interest" feature
      // const interests = selectedFacilities.map((facility) => ({
      //   stakeholder_id: profile.id,
      //   site_id: facility.id,
      //   interest_percentage: 0,
      //   created_at: new Date().toISOString()
      // }));

      // console.log('Attempting to insert interests:', interests);

      // for (const interest of interests) {
      //   console.log('Inserting interest:', interest);
      //   const { error: interestError, data: interestData } = await supabase
      //     .from('stakeholder_interest')
      //     .insert([interest]);

      //   console.log(`Interest insert for ${interest.site_id}:`, { data: interestData, error: interestError });

      //   if (interestError) {
      //     console.warn(`Warning: Could not create interest record for site ${interest.site_id}:`, interestError);
      //     // Don't throw - investments are the main data, interests are secondary
      //   }
      // }

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
      <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <RoleBackground role="stakeholder" />
        <div className="relative z-20 flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
          <p className="text-sm text-slate-300">Loading investment opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-white selection:bg-amber-500 selection:text-white overflow-hidden">
      {/* Role-Specific Background Animation (Stakeholder: Financial Growth) */}
      <RoleBackground role="stakeholder" />

      {/* Sleek Dark Header Bar (#1A2A3A - 68px, Perfectly Contained) */}
      <header className="relative w-full h-[68px] px-6 lg:px-10 flex items-center justify-between z-30 bg-[#1A2A3A] border-b border-[#2C3E50] shadow-xl shrink-0 overflow-hidden">
        <div className="flex items-center h-full">
          <SystmLogo variant="prominent-header" iconSize={52} showCompanyLogo={true} />
        </div>
        <div className="flex items-center h-full">
          <PartnerLogos theme="dark" prominent={true} />
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="relative flex-1 flex flex-col px-4 py-8 z-20 w-full max-w-6xl mx-auto overflow-y-auto">

      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Briefcase className="h-8 w-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Investment Preferences</h1>
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
                <CardTitle className="text-gray-900 dark:text-white">Select State</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedStateId || ''}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full pl-10 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="" className="text-gray-900">Select a state</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id} className="text-gray-900">
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
                  <CardTitle className="text-gray-900 dark:text-white">Available Facilities</CardTitle>
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
                  No sites available in this state.
                </CardContent>
              </Card>
            )}

            {/* Selected Facilities */}
            {selectedFacilities.length > 0 && (
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-white">Selected Facilities ({selectedFacilities.length})</CardTitle>
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
                          className="text-gray-900 dark:text-gray-100"
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
                      className="flex-1 text-gray-900 dark:text-gray-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Facility
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex-1 text-white"
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
    
      </main>

      {/* Footer info bar */}
      <footer className="relative w-full py-3.5 text-center text-xs text-[#CBD5E1] border-t border-[#2C3E50] bg-[#1A2A3A]/95 backdrop-blur-md z-30 shadow-lg shrink-0">
        <p className="font-medium tracking-wide">
          SystmII Cold Chain Supply Management Platform &bull; Active Logistics Core
        </p>
      </footer>
    </div>
  );
};

export default StakeholderInvestmentPreferences;