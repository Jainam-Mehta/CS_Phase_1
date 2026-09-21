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
  
  // Number of rooms
  numRooms: number; // Default 1, can be 1-20
  
  // Sensor data - per-room if multiple rooms, otherwise global
  sensorQuantities: Record<string, number>; // sensor type -> quantity (for single room or all rooms)
  roomSensorQuantities?: Record<string, Record<string, number>>; // room_index -> sensor_type -> quantity (for multi-room)
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
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0); // Track which room's sensors we're configuring
  
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
    numRooms: 1, // Default 1 room
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
          .select('*')
          .eq('id', session.user.id)
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

    if (!setupData.numRooms || setupData.numRooms < 1 || setupData.numRooms > 20) {
      setError('Number of rooms must be between 1 and 20');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, owner_company_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (!profile) throw new Error('Owner profile not found');

      // Check for duplicate sites under this owner profile
      const siteName = `${setupData.siteName} Facility`;
      const { data: existingSite, error: existingSiteError } = await supabase
        .from('sites')
        .select('id')
        .eq('owner_profile_id', profile.id)
        .eq('facility_name', siteName)
        .eq('state_id', selectedStateId)
        .eq('district_id', selectedDistrictId)
        .maybeSingle();

      if (existingSiteError) {
        console.error('Error checking for existing site:', existingSiteError);
        throw existingSiteError;
      }

      if (existingSite) {
        setError('A site with this name already exists in this location.');
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

      // Create site linked centrally manually via owner_profile_id
      const sitePayload = {
        owner_profile_id: profile.id,
        facility_name: siteName,
        address: '',
        state_id: selectedStateId,
        district_id: selectedDistrictId,
        locality_id: selectedLocalityId || null,
        latitude: null,
        longitude: null,
        is_active: true,
      };

      const { data: site, error: siteError } = await supabase
        .from('sites')
        .insert(sitePayload)
        .select()
        .single();

      if (siteError) {
        console.error('Site creation error:', siteError);
        throw siteError;
      }

      setCreatedFacilityId(site.id);

      // Create multiple rooms with distributed capacity
      const totalCapacityKg = setupData.storageCapacityTons * 1000; // Convert tons to kg
      const capacityPerRoomKg = Math.floor(totalCapacityKg / setupData.numRooms); // Distribute equally
      
      const roomsToCreate = [];
      for (let i = 1; i <= setupData.numRooms; i++) {
        const roomCode = `RM-${Math.floor(1000 + Math.random() * 9000)}`;
        roomsToCreate.push({
          room_code: roomCode,
          site_id: site.id,
          capacity_kg: capacityPerRoomKg,
          current_utilization_kg: 0,
          status: 'active',
          is_active: true
        });
      }
      
      const { data: rooms, error: roomError } = await supabase
        .from('cold_storage_rooms')
        .insert(roomsToCreate)
        .select();

      if (roomError) throw roomError;
      
      console.log(`✓ Created ${setupData.numRooms} rooms with ${capacityPerRoomKg}kg capacity each`);
      setCreatedRoomId(rooms?.[0]?.id || null); // Store first room ID for sensors
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
    let totalSensors = 0;
    
    if (setupData.numRooms > 1) {
      // For multi-room: check at least one sensor per room
      const roomSensors = setupData.roomSensorQuantities || {};
      for (let i = 0; i < setupData.numRooms; i++) {
        const roomKey = `room_${i}`;
        const roomTotal = Object.values(roomSensors[roomKey] || {}).reduce((sum: number, qty: number) => sum + qty, 0);
        totalSensors += roomTotal;
      }
      if (totalSensors === 0) {
        setError('Please select at least one sensor for each room');
        return;
      }
    } else {
      // For single room: use sensorQuantities
      totalSensors = Object.values(setupData.sensorQuantities).reduce((sum, qty) => sum + qty, 0);
      if (totalSensors === 0) {
        setError('Please select at least one sensor type');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const createdRoomIds = Array.isArray(createdRoomId) ? createdRoomId : [createdRoomId].filter(Boolean);
      
      if (setupData.numRooms > 1) {
        // Multi-room: create sensors for each room separately
        const roomSensors = setupData.roomSensorQuantities || {};
        for (let roomIndex = 0; roomIndex < createdRoomIds.length; roomIndex++) {
          const roomId = createdRoomIds[roomIndex];
          const roomKey = `room_${roomIndex}`;
          const sensorsForRoom = roomSensors[roomKey] || {};
          
          for (const [internalKey, quantity] of Object.entries(sensorsForRoom)) {
            if (quantity === 0) continue;

            const sensorDef = SENSOR_REGISTRY.find(s => s.internalKey === internalKey);
            if (!sensorDef) continue;

            for (let i = 0; i < quantity; i++) {
              const serialNumber = generateSerialNumber();
              const mqttTopic = generateMQTTTopic(roomId, internalKey, i + 1);
              
              const { error: sensorError } = await supabase
                .from('sensor_devices')
                .insert({
                  room_id: roomId,
                  sensor_name: sensorDef.displayName,
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
        }
      } else {
        // Single room: use existing logic
        for (const [internalKey, quantity] of Object.entries(setupData.sensorQuantities)) {
          if (quantity === 0) continue;

          const sensorDef = SENSOR_REGISTRY.find(s => s.internalKey === internalKey);
          if (!sensorDef) continue;

          for (let i = 0; i < quantity; i++) {
            const serialNumber = generateSerialNumber();
            const mqttTopic = generateMQTTTopic(createdRoomIds[0], internalKey, i + 1);
            
            const { error: sensorError } = await supabase
              .from('sensor_devices')
              .insert({
                room_id: createdRoomIds[0],
                sensor_name: sensorDef.displayName,
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
      }

      const totalSensorsCreated = totalSensors;
      console.log(`✓ Created ${totalSensorsCreated} sensor devices`);

      // Mark onboarding as complete
      completeStep('profile');
      
      // Clear selected site to force reload of sites list
      setSelectedFacilityId(null);
      
      // Navigate to dashboard
      navigate('/owner/dashboard', { replace: true });
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

        {/* Number of Rooms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Rooms *
          </label>
          <input
            type="number"
            min="1"
            max="20"
            step="1"
            value={setupData.numRooms}
            onChange={(e) => setSetupData(prev => ({ ...prev, numRooms: Math.max(1, parseInt(e.target.value) || 1) }))}
            placeholder="1"
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Number of cold storage rooms (1-20 rooms)
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
        disabled={!setupData.state || !setupData.district || !setupData.siteName || setupData.storageCapacityTons < 1 || setupData.numRooms < 1 || setupData.numRooms > 20}
      >
        Continue to Sensor Setup
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  const renderSensorsStep = () => {
    const isMultiRoom = setupData.numRooms > 1;
    const roomSensors = setupData.roomSensorQuantities || {};
    const currentRoomKey = `room_${currentRoomIndex}`;
    
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Configure Sensors
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {isMultiRoom 
              ? `Select sensor types for each room (${setupData.numRooms} rooms total)`
              : 'Select sensor types and quantities'}
          </p>
        </div>

        {/* Room Tabs - Only show if multiple rooms */}
        {isMultiRoom && (
          <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 mb-4">
            {Array.from({ length: setupData.numRooms }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentRoomIndex(index)}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  currentRoomIndex === index
                    ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Room {index + 1}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SENSOR_REGISTRY.map((sensor) => {
            const Icon = ICON_MAP[sensor.defaultIcon] || Thermometer;
            let quantity = 0;
            
            if (isMultiRoom) {
              quantity = roomSensors[currentRoomKey]?.[sensor.internalKey] || 0;
            } else {
              quantity = setupData.sensorQuantities[sensor.internalKey] || 0;
            }
            
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
                      if (isMultiRoom) {
                        const updatedRoomSensors = {
                          ...roomSensors,
                          [currentRoomKey]: {
                            ...(roomSensors[currentRoomKey] || {}),
                            [sensor.internalKey]: newSelected ? 1 : 0
                          }
                        };
                        setSetupData(prev => ({
                          ...prev,
                          roomSensorQuantities: updatedRoomSensors
                        }));
                      } else {
                        setSetupData(prev => ({
                          ...prev,
                          sensorQuantities: {
                            ...prev.sensorQuantities,
                            [sensor.internalKey]: newSelected ? 1 : 0
                          }
                        }));
                      }
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
                        if (isMultiRoom) {
                          const updatedRoomSensors = {
                            ...roomSensors,
                            [currentRoomKey]: {
                              ...(roomSensors[currentRoomKey] || {}),
                              [sensor.internalKey]: newQuantity
                            }
                          };
                          setSetupData(prev => ({
                            ...prev,
                            roomSensorQuantities: updatedRoomSensors
                          }));
                        } else {
                          setSetupData(prev => ({
                            ...prev,
                            sensorQuantities: {
                              ...prev.sensorQuantities,
                              [sensor.internalKey]: newQuantity
                            }
                          }));
                        }
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
            disabled={
              isMultiRoom
                ? false // Don't disable for multi-room, validation happens in handleConfigureSensors
                : Object.values(setupData.sensorQuantities).reduce((sum, qty) => sum + qty, 0) === 0
            }
          >
            Complete Setup
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

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
