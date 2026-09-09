import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { Snowflake, Apple, Carrot, Star, ChevronRight, Check, AlertCircle, Warehouse } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { State, District, Locality, Facility } from '../../lib/supabase';

const StorageSelection: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, user } = useAuthStore();
  const { loading: onboardingLoading, step: onboardingStep, completeStep } = useOnboarding();
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isExtensionMode = searchParams.get('mode') === 'extension';
  
  // Location data from Supabase
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [sites, setSites] = useState<Facility[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedLocalityId, setSelectedLocalityId] = useState<string | null>(null);

  // Load states on mount
  useEffect(() => {
    loadStates();
  }, []);

  // Load districts when state is selected
  useEffect(() => {
    if (selectedStateId) {
      loadDistricts(selectedStateId);
    } else {
      setDistricts([]);
      setLocalities([]);
      setSites([]);
      setSelectedDistrictId(null);
      setSelectedLocalityId(null);
    }
  }, [selectedStateId]);

  // Load localities when district is selected
  useEffect(() => {
    if (selectedDistrictId) {
      loadLocalities(selectedDistrictId);
    } else {
      setLocalities([]);
      setSites([]);
      setSelectedLocalityId(null);
    }
  }, [selectedDistrictId]);

  // Load sites when locality is selected
  useEffect(() => {
    if (selectedLocalityId) {
      loadSites(selectedLocalityId);
    } else if (selectedDistrictId) {
      // Load sites by district if locality is not selected
      loadSitesByDistrict(selectedDistrictId);
    } else {
      setSites([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocalityId, selectedDistrictId]);

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
      setError('Failed to load states. Please check your internet connection and try again.');
    }
  };

  const loadDistricts = async (stateId: string) => {
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('*')
        .eq('state_id', stateId)
        .order('name');
      
      if (error) throw error;
      setDistricts(data || []);
    } catch (err) {
      console.error('Error loading districts:', err);
      setError('Failed to load districts. Please check your internet connection and try again.');
    }
  };

  const loadLocalities = async (districtId: string) => {
    try {
      const { data, error } = await supabase
        .from('localities')
        .select('*')
        .eq('district_id', districtId)
        .order('name');
      
      if (error) throw error;
      setLocalities(data || []);
    } catch (err) {
      console.error('Error loading localities:', err);
      setError('Failed to load localities. Please check your internet connection and try again.');
    }
  };

  const loadSites = async (localityId: string) => {
    try {
      // Get locality name
      const locality = localities.find(l => l.id === localityId);
      const localityName = locality?.name || '';
      
      // Load facilities by locality (owner-created facilities)
      // Facilities table has city field that matches locality name
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('city', localityName)
        .order('facility_name');
      
      if (error) throw error;
      setSites((data || []) as Facility[]);
    } catch (err) {
      console.error('Error loading sites:', err);
      setError('Failed to load sites. Please check your internet connection and try again.');
    }
  };

  const loadSitesByDistrict = async (districtId: string) => {
    try {
      // Get district name
      const district = districts.find(d => d.id === districtId);
      const districtName = district?.name || '';
      
      // Load facilities by district_id (owner-created facilities)
      // Facilities table has district_id foreign key to districts table
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('district_id', districtId)
        .order('facility_name');
      
      if (error) throw error;
      setSites((data || []) as Facility[]);
    } catch (err) {
      console.error('Error loading sites by district:', err);
      setError('Failed to load sites. Please check your internet connection and try again.');
    }
  };

  const getDistricts = () => {
    return districts.map(d => d.name);
  };

  const getSites = () => {
    return sites.map((s: any) => s.facility_name);
  };

  const handleStateSelect = (stateName: string) => {
    const state = states.find(s => s.name === stateName);
    if (state) {
      setSelectedStateId(state.id);
      setSelectedDistrictId(null);
      setSelectedLocalityId(null);
      setSelectedState(stateName);
      setSelectedDistrict('');
      setSelectedSite('');
    }
  };

  const handleDistrictSelect = (districtName: string) => {
    const district = districts.find(d => d.name === districtName);
    if (district) {
      setSelectedDistrictId(district.id);
      setSelectedLocalityId(null);
      setSelectedDistrict(districtName);
      setSelectedSite('');
    }
  };

  const handleSiteSelect = (siteName: string) => {
    const site = sites.find((s: any) => s.facility_name === siteName);
    if (site) {
      setSelectedSite(siteName);
    }
  };

  // Memoized site loading functions to prevent dependency issues
  const loadSitesCallback = useCallback(loadSites, []);
  const loadSitesByDistrictCallback = useCallback(loadSitesByDistrict, []);

  // Update the useEffect to use the memoized functions
  useEffect(() => {
    if (selectedLocalityId) {
      loadSitesCallback(selectedLocalityId);
    } else if (selectedDistrictId) {
      loadSitesByDistrictCallback(selectedDistrictId);
    } else {
      setSites([]);
    }
  }, [selectedLocalityId, selectedDistrictId, loadSitesCallback, loadSitesByDistrictCallback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedState || !selectedDistrict) {
      setError('Please select state and district');
      return;
    }

    setLoading(true);

    try {
      // Save state and district selection to localStorage for room filtering
      const storageRequest = {
        state: selectedState,
        district: selectedDistrict,
        stateId: selectedStateId,
        districtId: selectedDistrictId,
        sites: [],
        rooms: [],
        products: [],
      };
      localStorage.setItem('storageAccessRequest', JSON.stringify(storageRequest));

      // Only complete onboarding step if not in extension mode
      if (!isExtensionMode) {
        completeStep('site');
      }

      // Navigate to room selection forwarding extension flags if they exist
      navigate(`/room-selection${window.location.search}`);
    } catch (err) {
      console.error('Error submitting location selection:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if still loading onboarding state or if this is not the correct step
  // Allow rendering in extension mode regardless of onboarding step
  if (!isExtensionMode && (onboardingLoading || onboardingStep !== 'site')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="w-full max-w-4xl">
        <Card variant="default" className="w-full">
          <CardHeader className="text-center relative">
            {/* Step Indicator */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full">
                Step 1/3
              </span>
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Warehouse className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Select Your Storage Site</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Choose the cold storage location where you want to store your products
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* State Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  State
                </label>
                <SearchableSelect
                  placeholder="Select state"
                  options={states.map(s => s.name)}
                  value={selectedState}
                  onChange={handleStateSelect}
                />
                {states.length === 0 && (
                  <p className="text-xs text-gray-500">No states available</p>
                )}
              </div>

              {/* District Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  District
                </label>
                <SearchableSelect
                  placeholder="Select district"
                  options={getDistricts()}
                  value={selectedDistrict}
                  onChange={handleDistrictSelect}
                  disabled={!selectedState}
                />
                {selectedState && districts.length === 0 && (
                  <p className="text-xs text-gray-500">No districts available in this state</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!selectedState || !selectedDistrict}
                className="w-full"
              >
                Next
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StorageSelection;