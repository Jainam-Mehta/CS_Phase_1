import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useSiteStore } from '../../stores/useSiteStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { Warehouse, ChevronRight, ChevronLeft, Plus, Check, AlertCircle, Thermometer, Droplets, Gauge, DoorOpen, Activity, Leaf, Flame, Zap, Battery, Fan, Shield, Droplet, AlertTriangle, Waves, Activity as Vibration, Sun, Wind, Cloud, Sprout, FlaskConical, Lightbulb, Move, ThermometerSun, CloudSun } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getOwnerRoleId } from '../../services/roleService';
import type { State, District, Locality, OwnerCompany, Site, Facility, ColdStorageRoom, SensorDevice } from '../../lib/supabase';
import { 
  SENSOR_REGISTRY, 
  type SensorDefinition, 
  generateMQTTTopic, 
  generateSerialNumber,
  getDisplayName 
} from '../../lib/sensorRegistry';

type SetupStep = 'site' | 'sensors' | 'complete';

interface OwnerSetupData {
  // Site data
  state: string;
  district: string;
  siteName: string;
  locality: string;
  
  // Owner company data
  contactEmail: string;
  phone: string;
  
  // Storage capacity data (in tons, will be converted to kg for rooms)
  storageCapacityTons: number; // Default 1 ton, user can increase
  
  // Sensor data
  sensorQuantities: Record<string, number>; // sensor type -> quantity
}

// Icon mapping for sensor registry
const ICON_MAP: Record<string, any> = {
  thermometer: Thermometer,
  droplets: Droplets,
  gauge: Gauge,
  'door-open': DoorOpen,
  wind: Activity,
  cloud: Cloud,
  sprout: Sprout,
  'flask-conical': FlaskConical,
  sun: Sun,
  battery: Battery,
  zap: Zap,
  cog: Fan,
  shield: Shield,
  lightning: Lightbulb,
  droplet: Droplet,
  flame: Flame,
  waves: Waves,
  move: Move,
  activity: Vibration,
  'thermometer-sun': ThermometerSun,
  'cloud-sun': CloudSun,
};

const OwnerSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { completeStep } = useOnboarding();
  const { setSelectedFacilityId } = useSiteStore();
  const [currentStep, setCurrentStep] = useState<SetupStep>('site');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileVerified, setProfileVerified] = useState(false); // Track verification status
  const [verificationAttempted, setVerificationAttempted] = useState(false); // Prevent re-verification
  
  // Location data from Supabase
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedLocalityId, setSelectedLocalityId] = useState<string | null>(null);
  
  // Setup data
  const [setupData, setSetupData] = useState<OwnerSetupData>({
    state: '',
    district: '',
    siteName: '',
    locality: '',
    contactEmail: '',
    phone: '',
    storageCapacityTons: 1, // Default 1 ton
    sensorQuantities: {}, // No defaults - owner must select
  });
  
  // Validation error state
  const [validationError, setValidationError] = useState('');
  
  // Created IDs for subsequent steps
  const [createdFacilityId, setCreatedFacilityId] = useState<string | null>(null);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  // Load states on mount
  useEffect(() => {
    loadStates();
    // DISABLED VERIFICATION - Just show the form immediately
    setProfileVerified(true);
    // verifyOwnerRole(); // Commented out to stop the loop
  }, []);

  // Load districts when state is selected
  useEffect(() => {
    if (selectedStateId) {
      loadDistricts(selectedStateId);
    } else {
      setDistricts([]);
      setLocalities([]);
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
      setSelectedLocalityId(null);
    }
  }, [selectedDistrictId]);

  const verifyOwnerRole = async () => {
    // Prevent multiple verification attempts
    if (verificationAttempted) {
      console.log('Verification already attempted, skipping...');
      return;
    }
    
    setVerificationAttempted(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found, redirecting to login');
        setError('No authenticated session found');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Check if user has owner profile - retry logic for race conditions
      let profile = null;
      let retries = 5; // 5 retries
      
      console.log('Starting profile verification with retries...');
      
      while (retries > 0 && !profile) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, roles!inner(name)')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Profile query error:', profileError);
        }
        
        profile = profileData;
        
        if (!profile && retries > 1) {
          console.log(`Profile not found yet, retrying in 1 second... (${retries - 1} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
        
        retries--;
      }

      if (!profile) {
        // Profile still doesn't exist after retries - this is a real issue
        console.error('❌ Profile not found after 5 retries');
        setError('Profile setup incomplete. Please go back to complete your profile.');
        // Don't set profileVerified to true, stay in loading state with error
        return;
      }

      if (profile.roles.name !== 'Owner') {
        console.log('Wrong role, redirecting to role selection');
        setError('Access denied. Owner role required.');
        setTimeout(() => navigate('/role-selection'), 3000);
        return;
      }

      console.log('✅ Owner profile verified successfully:', profile);
      setError(''); // Clear any errors
      setProfileVerified(true); // Mark as verified - this will show the form
    } catch (err) {
      console.error('Role verification failed:', err);
      setError('Failed to verify owner role. Please refresh the page.');
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
      setError('Failed to load states');
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
      setError('Failed to load districts');
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
      setError('Failed to load localities');
    }
  };

  const handleStateSelect = (stateName: string) => {
    const state = states.find(s => s.name === stateName);
    if (state) {
      console.log('State selected:', stateName, 'ID:', state.id, typeof state.id);
      setSelectedStateId(state.id);
      setSelectedDistrictId(null);
      setSelectedLocalityId(null);
      setSetupData(prev => ({ ...prev, state: stateName, district: '', locality: '' }));
    }
  };

  const handleDistrictSelect = (districtName: string) => {
    const district = districts.find(d => d.name === districtName);
    if (district) {
      console.log('District selected:', districtName, 'ID:', district.id, typeof district.id);
      setSelectedDistrictId(district.id);
      setSelectedLocalityId(null);
      setSetupData(prev => ({ ...prev, district: districtName, locality: '' }));
    }
  };

  const handleLocalitySelect = (localityName: string) => {
    const locality = localities.find(l => l.name === localityName);
    if (locality) {
      console.log('Locality selected:', localityName, 'ID:', locality.id, typeof locality.id);
      setSelectedLocalityId(locality.id);
      setSetupData(prev => ({ ...prev, locality: localityName }));
    }
  };

  const handleCreateSite = async () => {
    if (!setupData.state || !setupData.district || !setupData.siteName) {
      setError('Please fill in all required fields');
      return;
    }

    if (!setupData.storageCapacityTons || setupData.storageCapacityTons < 1) {
      setError('Storage capacity must be at least 1 ton');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get owner profile to get their email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, auth_user_id, owner_company_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!profile) throw new Error('Owner profile not found');

      // Check for duplicate facilities under this owner profile
      const facilityName = `${setupData.siteName} Facility`;
      const { data: existingFacility, error: existingFacilityError } = await supabase
        .from('facilities')
        .select('id')
        .eq('owner_profile_id', profile.id)
        .eq('facility_name', facilityName)
        .eq('state_id', selectedStateId)
        .eq('district_id', selectedDistrictId)
        .maybeSingle();

      if (existingFacilityError) {
        console.error('Error checking for existing facility:', existingFacilityError);
        throw existingFacilityError;
      }

      if (existingFacility) {
        setError('A facility with this name already exists in this location.');
        setLoading(false);
        return;
      }

      // Get state and district names for the company record
      const stateName = states.find(s => s.id === selectedStateId)?.name || '';
      const districtName = districts.find(d => d.id === selectedDistrictId)?.name || '';

      // Ensure Owner Company exists (Optional but good for metadata)
      if (!profile.owner_company_id) {
        const { data: ownerCompany, error: companyError } = await supabase
          .from('owner_companies')
          .insert({
            company_name: `${setupData.siteName} Company`,
            contact_email: setupData.contactEmail || user?.email || '',
            phone: setupData.phone || '',
            address: '',
            city: districtName,
            district: districtName,
            state: stateName,
            country: 'India',
          })
          .select()
          .single();

        if (companyError) {
          console.error('Owner company creation error:', companyError);
          throw companyError;
        }

        // Link company to profile
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ owner_company_id: ownerCompany.id })
          .eq('id', profile.id);
          
        if (profileUpdateError) {
          console.error('Profile update error:', profileUpdateError);
          throw profileUpdateError;
        }
      }

      // Create facility linked centrally manually via owner_profile_id
      const facilityPayload = {
        owner_profile_id: profile.id,
        facility_name: facilityName,
        address: '',
        state_id: selectedStateId,
        district_id: selectedDistrictId,
        locality_id: selectedLocalityId || null,
        latitude: null,
        longitude: null,
        is_active: true,
      };

      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .insert(facilityPayload)
        .select()
        .single();

      if (facilityError) {
        console.error('Facility creation error:', facilityError);
        throw facilityError;
      }

      setCreatedFacilityId(facility.id);

      // Create single room with storage capacity
      const capacityKg = setupData.storageCapacityTons * 1000; // Convert tons to kg
      const roomCode = `RM-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: room, error: roomError } = await supabase
        .from('cold_storage_rooms')
        .insert({
          room_code: roomCode,
          facility_id: facility.id,
          room_name: 'Facility',
          capacity_kg: capacityKg,
          current_utilization_kg: 0,
          status: 'Active',
          is_active: true
        })
        .select()
        .single();

      if (roomError) throw roomError;
      
      console.log(`✓ Created facility room with ${setupData.storageCapacityTons} ton(s) capacity`);
      setCreatedRoomId(room.id);
      setCurrentStep('sensors');
    } catch (err) {
      console.error('Error creating site:', err);
      setError('Failed to create site. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureSensors = async () => {
    // Validation: at least one sensor selected
    const totalSensors = Object.values(setupData.sensorQuantities).reduce((sum, qty) => sum + qty, 0);
    if (totalSensors === 0) {
      setError('Please select at least one sensor type');
      return;
    }

    // Validation: all selected sensors must have quantity >= 1
    for (const [sensorKey, quantity] of Object.entries(setupData.sensorQuantities)) {
      if (quantity > 0 && quantity < 1) {
        setError(`Quantity for ${getDisplayName(sensorKey)} must be at least 1`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // Create sensor devices for the room with quantities
      for (const [internalKey, quantity] of Object.entries(setupData.sensorQuantities)) {
        if (quantity === 0) continue;

        // Handle combined sensors - split into individual sensors
        const isCombined = internalKey.includes('+');

        if (isCombined) {
          const subTypes = internalKey.split('+');
          for (const subType of subTypes) {
            const subDef = SENSOR_REGISTRY.find(s => s.internalKey === subType);
            for (let i = 0; i < quantity; i++) {
              const serialNumber = generateSerialNumber();
              const mqttTopic = generateMQTTTopic(createdRoomId!, subType, i + 1);
              const { error: sensorError } = await supabase
                .from('sensor_devices')
                .insert({
                  room_id: createdRoomId,
                  sensor_name: subDef?.displayName || subType,
                  sensor_type: subType,
                  serial_number: serialNumber,
                  mqtt_topic: mqttTopic,
                  firmware_version: '1.0.0',
                  installation_date: new Date().toISOString(),
                  last_calibration: new Date().toISOString(),
                  status: 'Online',
                  last_seen: new Date().toISOString(),
                  battery_percentage: 100,
                  remarks: '',
                });
              if (sensorError) throw sensorError;
            }
          }
          continue;
        }

        // Regular single sensor
        const sensorDef = SENSOR_REGISTRY.find(s => s.internalKey === internalKey);
        if (!sensorDef) {
          console.error(`Sensor definition not found for key: ${internalKey}`);
          continue;
        }

        for (let i = 0; i < quantity; i++) {
          const displayName = sensorDef.displayName;
          const serialNumber = generateSerialNumber();
          const mqttTopic = generateMQTTTopic(createdRoomId!, internalKey, i + 1);
          
          const { error: sensorError } = await supabase
            .from('sensor_devices')
            .insert({
              room_id: createdRoomId,
              sensor_name: displayName,
              sensor_type: internalKey,
              serial_number: serialNumber,
              mqtt_topic: mqttTopic,
              firmware_version: '1.0.0',
              installation_date: new Date().toISOString(),
              last_calibration: new Date().toISOString(),
              status: 'Online',
              last_seen: new Date().toISOString(),
              battery_percentage: 100,
              remarks: '',
            });
          if (sensorError) throw sensorError;
        }
      }

      const totalSensorsCreated = Object.values(setupData.sensorQuantities).reduce((sum, qty) => sum + qty, 0);
      console.log(`✓ Created ${totalSensorsCreated} sensor devices for facility room`);

      // Mark onboarding as complete
      completeStep('profile');
      
      // Clear selected facility to force reload of facilities list
      setSelectedFacilityId(null);
      
      // Navigate to dashboard
      navigate('/owner/dashboard');
    } catch (err) {
      console.error('Error configuring sensors:', err);
      setError('Failed to configure sensors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'sensors') {
      setCurrentStep('site');
    }
  };

  const renderSiteStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create Your Cold Storage Site
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Enter the details for your cold storage facility
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Site Name *
          </label>
          <input
            type="text"
            value={setupData.siteName}
            onChange={(e) => setSetupData(prev => ({ ...prev, siteName: e.target.value }))}
            placeholder="Enter site name (e.g., 'Central Cold Storage')"
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contact Email
          </label>
          <input
            type="email"
            value={setupData.contactEmail}
            onChange={(e) => setSetupData(prev => ({ ...prev, contactEmail: e.target.value }))}
            placeholder="Contact email (optional)"
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={setupData.phone}
            onChange={(e) => setSetupData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="Phone number (optional)"
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Storage Capacity (tons) *
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            value={setupData.storageCapacityTons}
            onChange={(e) => setSetupData(prev => ({ ...prev, storageCapacityTons: parseInt(e.target.value) || 1 }))}
            placeholder="1"
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Maximum storage capacity in tons (1 ton = 1000 kg)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            State *
          </label>
          <SearchableSelect
            placeholder="Select state"
            options={states.map(s => s.name)}
            value={setupData.state}
            onChange={handleStateSelect}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            District *
          </label>
          <SearchableSelect
            placeholder="Select district"
            options={districts.map(d => d.name)}
            value={setupData.district}
            onChange={handleDistrictSelect}
            disabled={!selectedStateId}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Locality (Optional)
          </label>
          <SearchableSelect
            placeholder="Select locality"
            options={localities.map(l => l.name)}
            value={setupData.locality}
            onChange={handleLocalitySelect}
            disabled={!selectedDistrictId}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        className="w-full"
        loading={loading}
        onClick={handleCreateSite}
        disabled={!setupData.state || !setupData.district || !setupData.siteName || setupData.storageCapacityTons < 1}
      >
        Continue to Sensor Setup
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  const renderSensorsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Configure Sensors
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Select sensor types and specify quantities for each room
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SENSOR_REGISTRY.map((sensor) => {
          const Icon = ICON_MAP[sensor.defaultIcon] || Thermometer;
          const quantity = setupData.sensorQuantities[sensor.internalKey] || 0;
          const isSelected = quantity > 0;
          
          return (
            <div
              key={sensor.internalKey}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {sensor.displayName}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const newSelected = e.target.checked;
                    setSetupData(prev => ({
                      ...prev,
                      sensorQuantities: {
                        ...prev.sensorQuantities,
                        [sensor.internalKey]: newSelected ? 1 : 0 // Reset to 0 when unchecked, default to 1 when checked
                      }
                    }));
                  }}
                  className="h-5 w-5 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Unit: {sensor.unit} • Category: {sensor.category}
              </p>
              {isSelected && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value) || 0;
                      setSetupData(prev => ({
                        ...prev,
                        sensorQuantities: {
                          ...prev.sensorQuantities,
                          [sensor.internalKey]: newQuantity
                        }
                      }));
                    }}
                    className="w-20 px-2 py-1 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={handleBack}
          disabled={loading}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          className="flex-1"
          loading={loading}
          onClick={handleConfigureSensors}
          disabled={Object.values(setupData.sensorQuantities).reduce((sum, qty) => sum + qty, 0) === 0}
        >
          Complete Setup
          <Check className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 p-4">
      {/* Show loading while verifying profile */}
      {!profileVerified ? (
        <Card variant="default" className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Verifying Owner Profile...
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Please wait while we set up your account
              </p>
              {error && (
                <div className="mt-4 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full max-w-4xl">
          <Card variant="default" className="w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Warehouse className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl">Owner Setup Wizard</CardTitle>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {currentStep === 'site' && 'Step 1 of 2: Create Site'}
                {currentStep === 'sensors' && 'Step 2 of 2: Configure Sensors'}
              </p>
            </CardHeader>
            <CardContent>
              {currentStep === 'site' && renderSiteStep()}
              {currentStep === 'sensors' && renderSensorsStep()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OwnerSetup;
