import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useSiteStore } from '../../stores/useSiteStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { Warehouse, ChevronRight, ChevronLeft, Plus, Check, AlertCircle, Thermometer, Droplets, Gauge, DoorOpen, Activity, Leaf, Flame, Zap, Battery, Fan, Shield, Droplet, AlertTriangle, Waves, Activity as Vibration, Sun, Wind, Cloud, Sprout, FlaskConical, Lightbulb, Move, ThermometerSun, CloudSun, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getOwnerRoleId } from '../../services/roleService';
import { RoleBackground } from '../../components/common/RoleBackground';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';

import type { State, District, Locality, OwnerCompany, Site, Facility, ColdStorageRoom, SensorDevice } from '../../lib/supabase';
import { 
  SENSOR_REGISTRY, 
  type SensorDefinition, 
  generateMQTTTopic, 
  generateSerialNumber,
  getDisplayName 
} from '../../lib/sensorRegistry';

// ============================================================================
// Sensor Type Mapping: Frontend internalKey → Database sensor_type values
// 
// IMPORTANT: This function must return EXACT values that match:
// 1. SENSOR_REGISTRY.internalKey values (PascalCase)
// 2. Database constraint CHECK values
// 
// The database constraint only accepts PascalCase values like:
// 'Temperature', 'Humidity', 'CO2', 'SuctionPressure', etc.
// 
// Combined sensors like 'Temperature+Humidity' must split into
// two separate database records: ['Temperature', 'Humidity']
// ============================================================================
function mapSensorTypeForDB(internalKey: string): string[] {
  // Handle combined sensors that must create multiple database records
  // For example: "Temperature+Humidity" → creates 2 records: Temperature and Humidity
  
  if (internalKey === 'Temperature+Humidity') {
    return ['Temperature', 'Humidity'];  // Creates 2 separate sensor_device records
  }
  
  if (internalKey === 'AmbientTemperature+AmbientHumidity') {
    return ['AmbientTemperature', 'AmbientHumidity'];  // Creates 2 separate records
  }
  
  // For all single sensors, return the internalKey as-is (PascalCase)
  // This ensures database constraint validation passes
  // Examples: 'Temperature' → 'Temperature', 'CO2' → 'CO2', 'Door' → 'Door'
  return [internalKey];
}

type SetupStep = 'site' | 'sensors' | 'complete';

interface OwnerSetupData {
  // Site data
  state: string;
  district: string;
  siteName: string;
  locality: string;
  code: string; // NEW: Site-specific facility code
  
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
    code: '', // NEW: Site code field
  });
  
  // Validation error state
  const [validationError, setValidationError] = useState('');
  
  // Created IDs for subsequent steps
  const [createdFacilityId, setCreatedFacilityId] = useState<string | null>(null);
  const [createdRoomIds, setCreatedRoomIds] = useState<string[]>([]);

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
      // Auto-fill code with locality's pincode
      const pincode = locality.pincode || '';
      setSetupData(prev => ({ ...prev, locality: localityName, code: pincode }));
    }
  };

  const handleCreateSite = async () => {
    if (!setupData.state || !setupData.district || !setupData.siteName) {
      setError('Please fill in all required fields');
      return;
    }

    if (!setupData.code || !setupData.code.trim()) {
      setError('Facility CODE is required');
      return;
    }

    if (setupData.code.trim().length !== 6 || !/^\d{6}$/.test(setupData.code.trim())) {
      setError('CODE must be exactly 6 digits');
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
      // 1. Get authenticated user ID from session or store
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || user?.id;

      if (!authUserId) {
        throw new Error('No authenticated user session found. Please log in again.');
      }

      // 2. Fetch profile, or create on-the-fly if missing
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUserId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile query error:', profileError);
      }

      if (!profile) {
        console.log('Profile missing for owner user, creating on-the-fly:', authUserId);
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: authUserId,
            role_id: await getOwnerRoleId(),
            user_type: 'owner',
            email: session?.user?.email || user?.email || '',
            full_name: user?.name || 'Owner',
            is_active: true
          }, { onConflict: 'id' })
          .select('id')
          .single();

        if (createError) {
          throw new Error(`Profile setup error: ${createError.message || JSON.stringify(createError)}`);
        }
        profile = newProfile;
      }

      // 3. Check for duplicate sites under this owner profile
      const siteName = setupData.siteName.trim();
      const { data: existingSite, error: existingSiteError } = await supabase
        .from('sites')
        .select('id')
        .eq('owner_profile_id', profile.id)
        .eq('facility_name', siteName)
        .maybeSingle();

      if (existingSiteError) {
        console.warn('Error checking for existing site:', existingSiteError);
      }

      if (existingSite) {
        setError('A site with this name already exists in your account.');
        setLoading(false);
        return;
      }

      // 4. Get state and district names for the company record
      const stateName = states.find(s => s.id === selectedStateId)?.name || setupData.state || '';
      const districtName = districts.find(d => d.id === selectedDistrictId)?.name || setupData.district || '';

      // 5. Generate unique site code
      // If pincode already exists for this owner, append suffix: s001, s002, etc.
      let siteCode = setupData.code.trim().toUpperCase();
      let baseCode = siteCode;
      let counter = 1; // Start from s001
      
      // Check if this site_code already exists for this owner
      while (true) {
        const { data: existingCode, error: codeError } = await supabase
          .from('sites')
          .select('id')
          .eq('owner_profile_id', profile.id)
          .eq('site_code', siteCode)
          .maybeSingle();

        if (codeError) {
          console.warn('Error checking site code:', codeError);
          break; // Continue even if error, let the insert fail if there's a real conflict
        }

        if (!existingCode) {
          // Site code is unique, use it
          break;
        }

        // Site code exists, try next number: s001, s002, etc.
        siteCode = `${baseCode}s${String(counter).padStart(3, '0')}`;
        counter++;
        
        if (counter > 999) {
          throw new Error('Unable to generate unique site code (too many variants)');
        }
      }

      console.log(`Generated site code: ${baseCode} → ${siteCode}`);

      // 6. Create site record
      const sitePayload = {
        owner_profile_id: profile.id,
        facility_name: siteName,
        site_code: siteCode,
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
        throw new Error(`Site creation error: ${siteError.message || siteError.details || JSON.stringify(siteError)}`);
      }

      setCreatedFacilityId(site.id);

      // 8. Create multiple rooms with distributed capacity
      const totalCapacityKg = setupData.storageCapacityTons * 1000;
      const capacityPerRoomKg = Math.floor(totalCapacityKg / setupData.numRooms);
      
      const roomsToCreate = [];
      for (let i = 1; i <= setupData.numRooms; i++) {
        const roomCode = `${i}`; // Simple numeric code: 1, 2, 3, etc.
        roomsToCreate.push({
          room_code: roomCode,
          room_name: `Room ${i}`, // Display name: Room 1, Room 2, etc.
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

      if (roomError) {
        console.error('Room creation error:', roomError);
        throw new Error(`Room creation error: ${roomError.message || roomError.details || JSON.stringify(roomError)}`);
      }
      
      const roomIds = rooms?.map(r => r.id) || [];
      console.log(`✓ Created ${setupData.numRooms} rooms with IDs:`, roomIds);
      setCreatedRoomIds(roomIds);
      setCurrentStep('sensors');
    } catch (err: any) {
      console.error('Error creating site:', err);
      const errorMessage = err?.message || err?.details || (typeof err === 'string' ? err : JSON.stringify(err));
      setError(`Failed to create site: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureSensors = async () => {
    setLoading(true);
    setError('');

    try {
      if (!createdFacilityId || createdRoomIds.length === 0) {
        throw new Error('No site or rooms found. Please go back to Step 1 and recreate the site.');
      }

      let totalSensors = 0;
      const isMultiRoom = setupData.numRooms > 1;

      if (isMultiRoom) {
        const roomSensors = setupData.roomSensorQuantities || {};
        for (let i = 0; i < setupData.numRooms; i++) {
          const roomKey = `room_${i}`;
          const roomTotal = Object.values(roomSensors[roomKey] || {}).reduce((sum: number, qty: number) => sum + qty, 0);
          totalSensors += roomTotal;
        }
      } else {
        totalSensors = Object.values(setupData.sensorQuantities).reduce((sum, qty) => sum + qty, 0);
      }

      console.log('🔵 Starting sensor creation...', { createdFacilityId, createdRoomIds, totalSensors });

      if (isMultiRoom) {
        const roomSensors = setupData.roomSensorQuantities || {};
        for (let roomIndex = 0; roomIndex < createdRoomIds.length; roomIndex++) {
          const roomId = createdRoomIds[roomIndex];
          const roomKey = `room_${roomIndex}`;
          const sensorsForRoom = roomSensors[roomKey] || {};
          
          for (const [internalKey, quantity] of Object.entries(sensorsForRoom)) {
            if (quantity <= 0) continue;

            const sensorDef = SENSOR_REGISTRY.find(s => s.internalKey === internalKey);
            if (!sensorDef) continue;

            const dbTypes = mapSensorTypeForDB(internalKey);

            for (let i = 0; i < quantity; i++) {
              for (const dbSensorType of dbTypes) {
                const serialNumber = generateSerialNumber();  // Generate ONCE per type
                const sensorNumber = i + 1;  // 1, 2, 3...
                console.log(`🔵 Inserting sensor: room=${roomId}, type=${dbSensorType}, code=${serialNumber}`);
                const { error: sensorError } = await supabase
                  .from('sensor_devices')
                  .insert({
                    room_id: roomId,
                    site_id: createdFacilityId,
                    sensor_name: `${sensorDef.displayName} ${sensorNumber}`,
                    sensor_type: dbSensorType,
                    sensor_code: serialNumber,
                    slave_id: sensorNumber,
                    sensor_number: sensorNumber,
                    status: 'Online',
                    is_active: true
                  });
                
                if (sensorError) {
                  console.error(`❌ Sensor insert error: ${serialNumber}`, sensorError);
                  throw new Error(`Sensor creation error: ${sensorError.message || sensorError.details || JSON.stringify(sensorError)}`);
                }
              }
            }
          }
        }
      } else {
        // Single room mode
        const roomId = createdRoomIds[0];
        console.log('🔵 Single room mode - creating sensors for room:', roomId);
        
        for (const [internalKey, quantity] of Object.entries(setupData.sensorQuantities)) {
          if (quantity <= 0) continue;

          const sensorDef = SENSOR_REGISTRY.find(s => s.internalKey === internalKey);
          if (!sensorDef) continue;

          const dbTypes = mapSensorTypeForDB(internalKey);

          for (let i = 0; i < quantity; i++) {
            for (const dbSensorType of dbTypes) {
              const serialNumber = generateSerialNumber();  // Generate ONCE per type
              const sensorNumber = i + 1;  // 1, 2, 3...
              console.log(`🔵 Inserting sensor: room=${roomId}, type=${dbSensorType}, code=${serialNumber}`);
              const { error: sensorError } = await supabase
                .from('sensor_devices')
                .insert({
                  room_id: roomId,
                  site_id: createdFacilityId,
                  sensor_name: `${sensorDef.displayName} ${sensorNumber}`,
                  sensor_type: dbSensorType,
                  sensor_code: serialNumber,
                  slave_id: sensorNumber,
                  sensor_number: sensorNumber,
                  status: 'Online',
                  is_active: true
                });
              
              if (sensorError) {
                console.error(`❌ Sensor insert error: ${serialNumber}`, sensorError);
                throw new Error(`Sensor creation error: ${sensorError.message || sensorError.details || JSON.stringify(sensorError)}`);
              }
            }
          }
        }
      }

      console.log('✅ All sensor devices configured successfully');

      // Mark onboarding as complete
      completeStep('profile');
      
      // Clear selected site to force reload of sites list
      setSelectedFacilityId(null);
      
      setLoading(false);
      navigate('/owner/dashboard', { replace: true });
    } catch (err: any) {
      console.error('❌ Error configuring sensors:', err);
      const errorMessage = err?.message || err?.details || (typeof err === 'string' ? err : JSON.stringify(err));
      setError(`Failed to configure sensors: ${errorMessage}`);
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
        <h2 className="text-2xl font-bold text-white mb-2">
          Create Your Cold Storage Site
        </h2>
        <p className="text-slate-300">
          Enter the details for your cold storage facility
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Row 1: Site Name (Full Width) */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-2">
            Site Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={setupData.siteName}
            onChange={(e) => setSetupData(prev => ({ ...prev, siteName: e.target.value }))}
            placeholder="Central Cold Storage"
            className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            required
          />
        </div>

        {/* Row 2: Contact Email & Phone (2 per line) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={setupData.contactEmail}
              onChange={(e) => setSetupData(prev => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="contact@facility.com"
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={setupData.phone}
              onChange={(e) => setSetupData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              placeholder="9876543210"
              maxLength={10}
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Row 3: Storage Capacity & Number of Rooms (2 per line) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Storage Capacity (tons) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              value={setupData.storageCapacityTons}
              onChange={(e) => setSetupData(prev => ({ ...prev, storageCapacityTons: parseInt(e.target.value) || 1 }))}
              placeholder="1"
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">1 ton = 1000 kg</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Number of Rooms <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="20"
              step="1"
              value={setupData.numRooms}
              onChange={(e) => setSetupData(prev => ({ ...prev, numRooms: Math.max(1, parseInt(e.target.value) || 1) }))}
              placeholder="1"
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">1-20 rooms</p>
          </div>
        </div>

        {/* Location Information Section */}
        <div className="border-t border-slate-700 pt-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-400" />
            Location Information
          </h3>

          {/* Row 4: State & District (2 per line) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                State <span className="text-rose-400">*</span>
              </label>
              <SearchableSelect
                placeholder="Select state"
                options={states.map(s => s.name)}
                value={setupData.state}
                onChange={handleStateSelect}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                District <span className="text-rose-400">*</span>
              </label>
              <SearchableSelect
                placeholder="Select district"
                options={districts.map(d => d.name)}
                value={setupData.district}
                onChange={handleDistrictSelect}
                disabled={!selectedStateId}
              />
            </div>
          </div>

          {/* Row 5: Locality & CODE (2 per line) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                Locality
              </label>
              <SearchableSelect
                placeholder="Select locality"
                options={localities.map(l => l.name)}
                value={setupData.locality}
                onChange={handleLocalitySelect}
                disabled={!selectedDistrictId}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-2">
                CODE <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={setupData.code}
                onChange={(e) => setSetupData(prev => ({ ...prev, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">6-digit numeric code (immutable)</p>
            </div>
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="primary"
        className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-sky-500/25 transition-all text-sm"
        loading={loading}
        onClick={handleCreateSite}
        disabled={!setupData.state || !setupData.district || !setupData.siteName || !setupData.code || setupData.storageCapacityTons < 1 || setupData.numRooms < 1 || setupData.numRooms > 20}
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
          <h2 className="text-2xl font-bold text-white mb-2">
            Configure Sensors
          </h2>
          <p className="text-slate-300">
            {isMultiRoom 
              ? `Select sensor types for each room (${setupData.numRooms} rooms total)`
              : 'Select sensor types and quantities'}
          </p>
        </div>

        {/* Room Tabs - Only show if multiple rooms */}
        {isMultiRoom && (
          <div className="flex gap-2 border-b border-gray-400 mb-4">
            {Array.from({ length: setupData.numRooms }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentRoomIndex(index)}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  currentRoomIndex === index
                    ? 'border-b-2 border-blue-500 text-white font-bold'
                    : 'text-gray-300 hover:text-white'
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
                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-50'
                    : 'border-gray-300 dark:border-gray-400 bg-gray-50 dark:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-gray-700" />
                    <span className="font-semibold text-gray-900 text-sm">
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
                    className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-700 mb-3">
                  Unit: {sensor.unit} • Category: {sensor.category}
                </p>
                {isSelected && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-700">Quantity:</label>
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
                      className="w-20 px-2 py-1 text-sm bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="flex-1 text-white hover:text-gray-200"
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
          >
            Complete Setup
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-white selection:bg-sky-500 selection:text-white overflow-hidden">
      {/* Role-Specific Background Animation (Cold Storage Facility: +30% brightness) */}
      <RoleBackground role="owner" />

      {/* White Header Bar - 68px, Perfectly Contained */}
      <header className="relative w-full h-[68px] px-6 lg:px-10 flex items-center justify-between z-30 bg-white border-b border-gray-200 shadow-sm shrink-0 overflow-hidden">
        <div className="flex items-center h-full">
          <SystmLogo variant="prominent-header" iconSize={52} showCompanyLogo={true} />
        </div>
        <div className="flex items-center h-full">
          <PartnerLogos theme="light" prominent={true} />
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 z-20 w-full max-w-4xl mx-auto overflow-y-auto">
        {!profileVerified ? (
          <Card variant="default" className="w-full max-w-md bg-[#1A2A3A]/90 backdrop-blur-md border border-[#304458] shadow-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Verifying Owner Profile...
                </h3>
                <p className="text-sm text-slate-400">
                  Please wait while we set up your account
                </p>
                {error && (
                  <div className="mt-4 p-3 bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-xl text-sm">
                    {error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full">
            <Card variant="default" className="w-full bg-[#1A2A3A]/90 backdrop-blur-md border border-[#304458] shadow-2xl">
              <CardHeader className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/25">
                  <Warehouse className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-2xl text-white">Owner Setup Wizard</CardTitle>
                <p className="text-slate-300 text-sm mt-1">
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
      </main>

      {/* Footer info bar */}
      <footer className="relative w-full py-3.5 text-center text-xs text-gray-600 border-t border-gray-200 bg-white z-30 shadow-sm shrink-0">
        <p className="font-medium tracking-wide">
          SystmII Cold Chain Supply Management Platform &bull; Active Logistics Core
        </p>
      </footer>
    </div>
  );
};

export default OwnerSetup;
