import React, { useEffect, useState } from 'react';
import { Activity, Users, Radio, Thermometer, Droplets, Battery, MapPin, Gauge, Wind, ArchiveX, ShieldAlert, BadgeCheck, Wrench, Plus, X, Zap, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';


interface Sensor {
  id: string;
  sensor_type: string;
  sensor_name: string;
  status: string;
  battery_percentage: number | null;
  last_reading_value: number | null;
  last_reading_unit: string | null;
  last_seen: string | null;
  room_id: string;
}

const AVAILABLE_SENSOR_TYPES = [
  { value: 'Temperature+Humidity', label: 'Temperature+Humidity Sensor (Internal Combined)', unit: '', icon: 'Thermometer', isCombined: true, types: ['Temperature', 'Humidity'] },
  { value: 'AmbientTemperature+AmbientHumidity', label: 'Temperature+Humidity Sensor (Ambient Combined)', unit: '', icon: 'Sun', isCombined: true, types: ['AmbientTemperature', 'AmbientHumidity'] },
  { value: 'Temperature', label: 'Temperature Sensor (Internal)', unit: '°C', icon: 'Thermometer' },
  { value: 'Humidity', label: 'Humidity Sensor (Internal)', unit: '%', icon: 'Droplets' },
  { value: 'AmbientTemperature', label: 'Ambient Temperature Sensor', unit: '°C', icon: 'Sun' },
  { value: 'AmbientHumidity', label: 'Ambient Humidity Sensor', unit: '%', icon: 'CloudSun' },
  { value: 'SuctionPressure', label: 'Suction Pressure Sensor', unit: 'Psi', icon: 'Gauge' },
  { value: 'DischargePressure', label: 'Discharge Pressure Sensor', unit: 'Psi', icon: 'Gauge' },
  { value: 'Battery', label: 'Battery Monitor', unit: '%', icon: 'Battery' },
  { value: 'Door', label: 'Door Sensor', unit: '', icon: 'MapPin' },
  { value: 'CO2', label: 'CO2 Sensor', unit: 'ppm', icon: 'Wind' },
  { value: 'Oxygen', label: 'Oxygen Sensor', unit: '%', icon: 'Wind' },
  { value: 'Ammonia', label: 'Ammonia Sensor', unit: 'ppm', icon: 'ShieldAlert' },
  { value: 'Ethylene', label: 'Ethylene Sensor', unit: 'ppm', icon: 'ArchiveX' },
];

const OwnerMonitoring: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId, selectedRoomId, setSelectedRoomId } = useSiteStore();
  const [loading, setLoading] = useState(true);

  const [dbSensors, setDbSensors] = useState<Sensor[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [showAddSensorModal, setShowAddSensorModal] = useState(false);
  const [addSensorForm, setAddSensorForm] = useState({
    sensor_type: '',
    quantity: 1
  });
  const [rooms, setRooms] = useState<any[]>([]);
  const [siteName, setSiteName] = useState<string>('');
  const [sensorAverages, setSensorAverages] = useState<any>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadMonitoringData();
      
      // AUTO-REFRESH DISABLED: Only refresh on manual button click
      // Users can click the "Refresh" button to update data manually
      // Previously this auto-refreshed every 5-10 seconds which interrupted scrolling
      
      return () => {};
    }
  }, [user?.id, selectedFacilityId, selectedRoomId]);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await loadMonitoringData();
    setLastRefreshTime(new Date());
    setIsManualRefreshing(false);
  };

  const loadMonitoringData = async () => {
    try {
      setLoading(true);

      // Fetch Site Name
      const { data: siteData } = await supabase
        .from('sites')
        .select('facility_name')
        .eq('id', selectedFacilityId)
        .single();

      setSiteName(siteData?.facility_name || 'Your Site');

      // Fetch Rooms for selected facility
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('site_id', selectedFacilityId);

      const resolvedRooms = (rmData || []).map((room: any) => ({
        ...room,
        display_name: room.room_name || `Room ${room.room_code}`  // Use database room_name (e.g., "Room 1")
      }));
      setRooms(resolvedRooms);

      // Set default room if not already selected
      if (resolvedRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(resolvedRooms[0].id);
      }

      const roomToUse = selectedRoomId || (resolvedRooms.length > 0 ? resolvedRooms[0].id : null);

      if (!roomToUse || resolvedRooms.length === 0) {
        setDbSensors([]);
        setInventory([]);
        setSensorAverages(null);
        setLoading(false);
        return;
      }

      const roomIds = [roomToUse];

      // ✅ FIX: Fetch sensors from sensor_devices table
      // Each sensor now has its OWN last_reading_value (not overwritten)
      const { data: sensorData } = await supabase
        .from('sensor_devices')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: true });
      
      // ✅ FIX: Display name now uses slave_id if available
      const numberedSensors = (sensorData || []).map(sensor => {
        const type = sensor.sensor_type || 'Unknown';
        
        // Use slave_id or sensor_number for unique identification if available
        const sensorNum = sensor.slave_id || sensor.sensor_number;
        const displayName = sensorNum 
          ? `${type} ${sensorNum}`  // e.g., "Temperature 1", "Temperature 3"
          : type;
        
        return {
          ...sensor,
          display_name: displayName,
          // ✅ Each sensor has distinct last_reading_value now
          sensor_value: sensor.last_reading_value,
          sensor_unit: sensor.last_reading_unit,
          is_active: sensor.status?.toLowerCase() === 'online' && sensor.last_reading_value !== null,
        };
      });
      
      setDbSensors(numberedSensors);

      // ✅ NEW: Fetch sensor averages from the averaging endpoint (NON-BLOCKING)
      // This runs in the background without blocking the main sensor fetch
      if (roomToUse) {
        (async () => {
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch(`${apiUrl}/api/storage/averages/room/${roomToUse}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const averagesData = await response.json();
              setSensorAverages(averagesData);
            }
          } catch (error) {
            // Silently fail - not critical for display
            console.debug('Averaging endpoint unavailable (non-blocking)');
          }
        })();
      }

      // ✅ SIMPLIFIED: Fetch sensor data from sensor_devices (primary source)
      // cold_storage_conditions is a complex sparse table - skip for now
      // If sensor_devices doesn't have readings, they'll show "No Telemetry"
      try {
        // Additional context: cold_storage_conditions could be queried later if needed,
        // but sensor_devices.last_reading_value is the cleaner source for individual sensors
        console.debug('Using sensor_devices as primary reading source');
      } catch (error) {
        console.warn('Error in sensor reading fallback:', error);
      }

      // Get unique farmers count
      const { data: allocationData } = await supabase
        .from('batch_room_allocations')
        .select(`
          batches!inner(farmer_id)
        `)
        .in('room_id', roomIds)
        .is('removed_at', null);

      setInventory(allocationData || []);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSensorIcon = (type: string | null | undefined) => {
    // Handle null/undefined sensor types gracefully
    if (!type) {
      if (import.meta.env.DEV) {
        console.warn('getSensorIcon called with null/undefined type, returning default icon');
      }
      return <Radio className="w-5 h-5 text-slate-500" />;
    }

    const t = type.toLowerCase();
    if (t.includes('temp')) return <Thermometer className="w-5 h-5 text-red-500" />;
    if (t.includes('hum')) return <Droplets className="w-5 h-5 text-blue-500" />;
    if (t.includes('battery')) return <Battery className="w-5 h-5 text-emerald-500" />;
    if (t.includes('press')) return <Gauge className="w-5 h-5 text-purple-500" />;
    if (t.includes('door')) return <MapPin className="w-5 h-5 text-amber-500" />;
    if (t.includes('co2') || t.includes('wind')) return <Wind className="w-5 h-5 text-gray-500" />;
    if (t.includes('ethylene')) return <ArchiveX className="w-5 h-5 text-yellow-600" />;
    if (t.includes('ammonia')) return <ShieldAlert className="w-5 h-5 text-orange-500" />;
    if (t.includes('oxygen')) return <Wind className="w-5 h-5 text-cyan-500" />;
    if (t.includes('motion')) return <Radio className="w-5 h-5 text-indigo-500" />;
    if (t.includes('vibration')) return <Radio className="w-5 h-5 text-violet-500" />;
    if (t.includes('smoke')) return <AlertCircle className="w-5 h-5 text-orange-600" />;
    if (t.includes('water') || t.includes('leak')) return <Droplets className="w-5 h-5 text-blue-600" />;
    if (t.includes('power') || t.includes('grid') || t.includes('solar')) return <Zap className="w-5 h-5 text-yellow-500" />;
    if (t.includes('compressor')) return <Gauge className="w-5 h-5 text-gray-600" />;
    
    // Log unknown sensor types in development
    if (import.meta.env.DEV) {
      console.warn(`Unknown sensor type: "${type}", returning default icon`);
    }
    
    return <Radio className="w-5 h-5 text-slate-500" />;
  };

  const handleAddSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Normalize sensor type to snake_case (database format)
      const normalizeSensorType = (type: string): string => {
        return type
          .replace(/([A-Z])/g, '_$1')  // Insert _ before capitals
          .toLowerCase()
          .replace(/^_/, '');  // Remove leading _
      };

      // Use the currently selected room, not the first room
      if (!selectedRoomId) {
        alert('Please select a room first.');
        return;
      }

      // Verify the room exists and belongs to this facility
      const { data: roomData, error: roomError } = await supabase
        .from('cold_storage_rooms')
        .select('id')
        .eq('id', selectedRoomId)
        .eq('site_id', selectedFacilityId)
        .single();

      if (roomError) {
        console.error('Room query error:', roomError);
        alert(`Database error: ${roomError.message}`);
        return;
      }

      if (!roomData) {
        alert('No room found. Please create a room first.');
        return;
      }

      // Check if this is a combined sensor
      const selectedSensorType = AVAILABLE_SENSOR_TYPES.find(t => t.value === addSensorForm.sensor_type);
      const isCombinedSensor = selectedSensorType?.isCombined;

      const sensorsToAdd = [];

      if (isCombinedSensor) {
        // Handle both internal and ambient combined sensors
        if (addSensorForm.sensor_type === 'Temperature+Humidity') {
          // Create both Temperature and Humidity sensors for each quantity
          for (let i = 0; i < addSensorForm.quantity; i++) {
            const existingTemp = dbSensors.filter(s => s.sensor_type === 'temperature');
            const existingHumidity = dbSensors.filter(s => s.sensor_type === 'humidity');
            const tempNumber = existingTemp.length + 1 + i;
            const humidityNumber = existingHumidity.length + 1 + i;

            // Add Temperature sensor
            sensorsToAdd.push({
              room_id: roomData.id,
              site_id: selectedFacilityId,
              sensor_type: 'Temperature',  // ← TitleCase for consistency
              sensor_name: `Temperature ${tempNumber}`,
              sensor_code: `TEMP_${String(tempNumber).padStart(3, '0')}`,
              slave_id: tempNumber,
              sensor_number: tempNumber,
              status: 'Online',
              is_active: true,
              created_at: new Date().toISOString()
            });

            // Add Humidity sensor
            sensorsToAdd.push({
              room_id: roomData.id,
              site_id: selectedFacilityId,
              sensor_type: 'Humidity',  // ← TitleCase for consistency
              sensor_name: `Humidity ${humidityNumber}`,
              sensor_code: `HUM_${String(humidityNumber).padStart(3, '0')}`,
              slave_id: humidityNumber,
              sensor_number: humidityNumber,
              status: 'Online',
              is_active: true,
              created_at: new Date().toISOString()
            });
          }
        } else if (addSensorForm.sensor_type === 'AmbientTemperature+AmbientHumidity') {
          // Create both Ambient Temperature and Ambient Humidity sensors for each quantity
          for (let i = 0; i < addSensorForm.quantity; i++) {
            const existingAmbTemp = dbSensors.filter(s => s.sensor_type === 'ambient_temperature');
            const existingAmbHum = dbSensors.filter(s => s.sensor_type === 'ambient_humidity');
            const ambTempNumber = existingAmbTemp.length + 1 + i;
            const ambHumNumber = existingAmbHum.length + 1 + i;

            // Add Ambient Temperature sensor
            sensorsToAdd.push({
              room_id: roomData.id,
              site_id: selectedFacilityId,
              sensor_type: 'AmbientTemperature',
              sensor_name: `Ambient Temperature ${ambTempNumber}`,
              sensor_code: `AMB_TEMP_${String(ambTempNumber).padStart(3, '0')}`,
              slave_id: ambTempNumber,
              sensor_number: ambTempNumber,
              status: 'Online',
              is_active: true,
              created_at: new Date().toISOString()
            });

            // Add Ambient Humidity sensor
            sensorsToAdd.push({
              room_id: roomData.id,
              site_id: selectedFacilityId,
              sensor_type: 'AmbientHumidity',
              sensor_name: `Ambient Humidity ${ambHumNumber}`,
              sensor_code: `AMB_HUM_${String(ambHumNumber).padStart(3, '0')}`,
              slave_id: ambHumNumber,
              sensor_number: ambHumNumber,
              status: 'Online',
              is_active: true,
              created_at: new Date().toISOString()
            });
          }
        }
      } else {
        // Regular single-type sensor
        const normalizedType = normalizeSensorType(addSensorForm.sensor_type);
        // Filter by ORIGINAL sensor_type (as stored in DB), not normalized
        const existingOfType = dbSensors.filter(s => s.sensor_type === addSensorForm.sensor_type);
        const startNumber = existingOfType.length + 1;

        for (let i = 0; i < addSensorForm.quantity; i++) {
          const sensorNumber = startNumber + i;
          
          sensorsToAdd.push({
            room_id: roomData.id,
            site_id: selectedFacilityId,
            sensor_type: addSensorForm.sensor_type,  // Use as-is (already TitleCase from AVAILABLE_SENSOR_TYPES)
            sensor_name: `${addSensorForm.sensor_type} ${sensorNumber}`,
            sensor_code: `${normalizedType.toUpperCase().replace(/_/g, '-')}_${String(sensorNumber).padStart(3, '0')}`,
            slave_id: sensorNumber,
            sensor_number: sensorNumber,  // ← Also set sensor_number as fallback
            status: 'Online',
            is_active: true,
            created_at: new Date().toISOString()
          });
        }
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('sensor_devices')
        .insert(sensorsToAdd)
        .select();

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      console.log('Sensors added successfully:', insertedData);
      
      setShowAddSensorModal(false);
      setAddSensorForm({ sensor_type: '', quantity: 1 });
      await loadMonitoringData(); // Reload data
      
      alert(`Successfully added ${sensorsToAdd.length} sensor(s)!`);
    } catch (error: any) {
      console.error('Error adding sensors:', error);
      alert(`Failed to add sensors: ${error.message || 'Please try again.'}`);
    }
  };

  if (!selectedFacilityId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Site Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Please select a site from the dropdown in the top header.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const isSensorActive = (s: any) => {
    const st = s.status?.toLowerCase();
    // A sensor is active if status is online/active AND it has a reading (from any source)
    const hasPassedReading = 
      s.last_reading_value != null ||      // From sensor_devices
      s.sensor_value != null ||            // From cold_storage_conditions fallback
      s.reading != null ||                 // From frontend state
      (s.last_seen != null && s.last_seen !== '');
    return (st === 'active' || st === 'online') && hasPassedReading;
  };

  const activeSensors = dbSensors.filter(isSensorActive).length;
  const uniqueFarmers = new Set(
    inventory.filter(i => i.farmer_id || i.farmer_profile_id)
      .map(i => i.farmer_id || i.farmer_profile_id)
  ).size;
  
  // Calculate Network Status: Connected if any sensor has data in last 30 minutes
  const NETWORK_TIMEOUT_MINUTES = 30;
  let isNetworkConnected = false;
  
  if (dbSensors.length > 0) {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - NETWORK_TIMEOUT_MINUTES * 60000);
    
    isNetworkConnected = dbSensors.some(sensor => {
      if (!sensor.last_seen) return false;
      const lastReadingTime = new Date(sensor.last_seen);
      return lastReadingTime >= thirtyMinutesAgo;
    });
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {siteName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Real-time telemetry and active client monitoring across all sites.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Last Refreshed</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">{lastRefreshTime.toLocaleString()}</p>
          </div>
          <button 
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors text-sm"
            title="Manually refresh sensor data"
          >
            <svg 
              className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Room Selector removed - use header selector instead */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* KPI Cards */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <Radio className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Active Sensors</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{activeSensors}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
            <Activity className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Network Status</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {isNetworkConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
      </div>

      {/* Sensor Averages - NEW */}
      {sensorAverages && (sensorAverages.avg_temperature !== null || sensorAverages.avg_humidity !== null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {sensorAverages.avg_temperature !== null && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6 shadow-sm border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Average Temperature</h3>
                <Thermometer className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-4xl font-bold text-red-900 dark:text-red-100">{sensorAverages.avg_temperature}°C</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                {sensorAverages.temp_sensor_count} sensor{sensorAverages.temp_sensor_count !== 1 ? 's' : ''} • Last {sensorAverages.time_window_minutes}m
              </p>
            </div>
          )}
          
          {sensorAverages.avg_humidity !== null && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 shadow-sm border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Average Humidity</h3>
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{sensorAverages.avg_humidity}%</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                {sensorAverages.humidity_sensor_count} sensor{sensorAverages.humidity_sensor_count !== 1 ? 's' : ''} • Last {sensorAverages.time_window_minutes}m
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sensor Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sensor Directory</h2>
          <button 
            onClick={() => setShowAddSensorModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Sensor
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sr No</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Icon</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sensor Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reading</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {dbSensors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No sensors discovered for this facility.
                  </td>
                </tr>
              ) : (
                dbSensors.map((sensor: any, index) => {
                  // Get actual reading value with unit - NO HARDCODED DEMO FALLBACKS
                  const getReadingDisplay = () => {
                    // Check all possible sources of reading value (priority order)
                    const val = sensor.last_reading_value ?? sensor.sensor_value ?? sensor.reading;
                    
                    if (val != null) {
                      // Use unit from primary field, then fallback field
                      const unit = sensor.last_reading_unit ?? sensor.sensor_unit ?? '';
                      return `${val} ${unit}`.trim();
                    }
                    
                    if (sensor.sensor_type?.toLowerCase().includes('battery') && sensor.battery_percentage != null) {
                      return `${sensor.battery_percentage}%`;
                    }
                    
                    return 'No Telemetry';
                  };

                  const isActive = isSensorActive(sensor);
                  const isMaintenance = sensor.status?.toLowerCase() === 'maintenance';
                  const isFaulty = sensor.status?.toLowerCase() === 'faulty';
                  
                  // Map database status to display text
                  let displayStatus = 'Offline';
                  let statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                  
                  if (isActive) {
                    displayStatus = 'Active';
                    statusColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                  } else if (isMaintenance) {
                    displayStatus = 'Maintenance';
                    statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                  } else if (isFaulty) {
                    displayStatus = 'Faulty';
                    statusColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
                  }
                  
                  return (
                    <tr key={sensor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        {getSensorIcon(sensor.sensor_type)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {sensor.display_name || sensor.sensor_name || sensor.sensor_type}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                        {getReadingDisplay()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {displayStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sensor Modal */}
      {showAddSensorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add New Sensor</h2>
              <button 
                onClick={() => setShowAddSensorModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSensor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Sensor Type
                </label>
                <select
                  required
                  value={addSensorForm.sensor_type}
                  onChange={(e) => setAddSensorForm({ ...addSensorForm, sensor_type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select sensor type...</option>
                  {AVAILABLE_SENSOR_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={addSensorForm.quantity}
                  onChange={(e) => setAddSensorForm({ ...addSensorForm, quantity: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sensors will be numbered automatically (e.g., Temperature 1, Temperature 2)
                </p>
              </div>

              {addSensorForm.sensor_type && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {(() => {
                      const selectedType = AVAILABLE_SENSOR_TYPES.find(t => t.value === addSensorForm.sensor_type);
                      const isCombined = selectedType?.isCombined;
                      
                      if (isCombined) {
                        const totalSensors = addSensorForm.quantity * 2;
                        
                        if (addSensorForm.sensor_type === 'Temperature+Humidity') {
                          return (
                            <>
                              <strong>Preview:</strong> Will create {totalSensors} internal sensors ({addSensorForm.quantity} Temperature + {addSensorForm.quantity} Humidity):
                              <br />
                              {Array.from({ length: Math.min(addSensorForm.quantity, 2) }, (_, i) => {
                                const existingTemp = dbSensors.filter(s => s.sensor_type === 'Temperature');
                                const existingHumidity = dbSensors.filter(s => s.sensor_type === 'Humidity');
                                return (
                                  <span key={i} className="block ml-2 mt-1">
                                    • Temperature {existingTemp.length + i + 1} & Humidity {existingHumidity.length + i + 1}
                                  </span>
                                );
                              })}
                              {addSensorForm.quantity > 2 && <span className="block ml-2 mt-1">• ... and {(addSensorForm.quantity - 2) * 2} more sensors</span>}
                            </>
                          );
                        } else if (addSensorForm.sensor_type === 'AmbientTemperature+AmbientHumidity') {
                          return (
                            <>
                              <strong>Preview:</strong> Will create {totalSensors} ambient sensors ({addSensorForm.quantity} Ambient Temp + {addSensorForm.quantity} Ambient Humidity):
                              <br />
                              {Array.from({ length: Math.min(addSensorForm.quantity, 2) }, (_, i) => {
                                const existingAmbTemp = dbSensors.filter(s => s.sensor_type === 'AmbientTemperature');
                                const existingAmbHum = dbSensors.filter(s => s.sensor_type === 'AmbientHumidity');
                                return (
                                  <span key={i} className="block ml-2 mt-1">
                                    • Ambient Temperature {existingAmbTemp.length + i + 1} & Ambient Humidity {existingAmbHum.length + i + 1}
                                  </span>
                                );
                              })}
                              {addSensorForm.quantity > 2 && <span className="block ml-2 mt-1">• ... and {(addSensorForm.quantity - 2) * 2} more sensors</span>}
                            </>
                          );
                        }
                      } else {
                        return (
                          <>
                            <strong>Preview:</strong> Will create {addSensorForm.quantity} sensor{addSensorForm.quantity > 1 ? 's' : ''} named:
                            <br />
                            {Array.from({ length: Math.min(addSensorForm.quantity, 3) }, (_, i) => {
                              const existingOfType = dbSensors.filter(s => s.sensor_type === addSensorForm.sensor_type);
                              return (
                                <span key={i} className="block ml-2 mt-1">
                                  • {addSensorForm.sensor_type} {existingOfType.length + i + 1}
                                </span>
                              );
                            })}
                            {addSensorForm.quantity > 3 && <span className="block ml-2 mt-1">• ... and {addSensorForm.quantity - 3} more</span>}
                          </>
                        );
                      }
                    })()}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddSensorModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add Sensor{addSensorForm.quantity > 1 ? 's' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerMonitoring;
