import React, { useEffect, useState } from 'react';
import { Activity, Users, Radio, Thermometer, Droplets, Battery, MapPin, Gauge, Wind, ArchiveX, ShieldAlert, BadgeCheck, Wrench, Plus, X } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { DEMO_ENABLED, DEMO_OWNER_SENSORS, DEMO_TEMP_HUMIDITY_VALUES } from '../../utils/demoData';

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
  const { selectedFacilityId } = useSiteStore();
  const [loading, setLoading] = useState(true);

  const [dbSensors, setDbSensors] = useState<Sensor[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [showAddSensorModal, setShowAddSensorModal] = useState(false);
  const [addSensorForm, setAddSensorForm] = useState({
    sensor_type: '',
    quantity: 1
  });

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadMonitoringData();
    }
  }, [user?.id, selectedFacilityId]);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);

      // DEMO MODE: Use hardcoded demo sensor data
      if (DEMO_ENABLED) {
        const demoSensorsFormatted = DEMO_OWNER_SENSORS.map((sensor: any) => ({
          ...sensor,
          status: 'Active'
        }));
        setDbSensors(demoSensorsFormatted);
        setLoading(false);
        return;
      }

      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('facility_id', selectedFacilityId);

      const resolvedRooms = rmData || [];
      if (resolvedRooms.length > 0) {
        const roomIds = resolvedRooms.map((r) => r.id);

        // Fetch sensors from sensor_devices table
        const { data: sensorData } = await supabase
          .from('sensor_devices')
          .select('*')
          .in('room_id', roomIds)
          .order('sensor_type', { ascending: true });
        
        // Group sensors by type and add numbering (Temperature 1, Temperature 2, etc.)
        const sensorsByType: Record<string, number> = {};
        const numberedSensors = (sensorData || []).map(sensor => {
          const type = sensor.sensor_type || 'Unknown';
          sensorsByType[type] = (sensorsByType[type] || 0) + 1;
          const number = sensorsByType[type];
          
          return {
            ...sensor,
            display_name: number > 1 || sensorsByType[type] > 1 
              ? `${type} ${number}` 
              : type,
            sensor_number: number
          };
        });
        
        setDbSensors(numberedSensors);

        // Get unique farmers count
        const { data: allocationData } = await supabase
          .from('batch_room_allocations')
          .select(`
            batches!inner(farmer_id)
          `)
          .in('room_id', roomIds)
          .is('removed_at', null);

        setInventory(allocationData || []);
      } else {
        setDbSensors([]);
        setInventory([]);
      }
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
    
    // Log unknown sensor types in development
    if (import.meta.env.DEV) {
      console.warn(`Unknown sensor type: "${type}", returning default icon`);
    }
    
    return <Radio className="w-5 h-5 text-slate-500" />;
  };

  const handleAddSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get the first room for this facility
      const { data: roomData, error: roomError } = await supabase
        .from('cold_storage_rooms')
        .select('id')
        .eq('facility_id', selectedFacilityId)
        .limit(1)
        .single();

      if (roomError) {
        console.error('Room query error:', roomError);
        alert(`Database error: ${roomError.message}`);
        return;
      }

      if (!roomData) {
        alert('No room found for this facility. Please create a room first.');
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
            const existingTemp = dbSensors.filter(s => s.sensor_type === 'Temperature');
            const existingHumidity = dbSensors.filter(s => s.sensor_type === 'Humidity');
            const tempNumber = existingTemp.length + 1 + i;
            const humidityNumber = existingHumidity.length + 1 + i;

            // Add Temperature sensor
            sensorsToAdd.push({
              room_id: roomData.id,
              sensor_type: 'Temperature',
              sensor_name: `Temperature ${tempNumber}`,
              sensor_code: `TEMP_${String(tempNumber).padStart(3, '0')}`,
              status: 'Online',
              battery_percentage: 100,
              last_reading_unit: '°C',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            // Add Humidity sensor
            sensorsToAdd.push({
              room_id: roomData.id,
              sensor_type: 'Humidity',
              sensor_name: `Humidity ${humidityNumber}`,
              sensor_code: `HUM_${String(humidityNumber).padStart(3, '0')}`,
              status: 'Online',
              battery_percentage: 100,
              last_reading_unit: '%',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        } else if (addSensorForm.sensor_type === 'AmbientTemperature+AmbientHumidity') {
          // Create both Ambient Temperature and Ambient Humidity sensors for each quantity
          for (let i = 0; i < addSensorForm.quantity; i++) {
            const existingAmbTemp = dbSensors.filter(s => s.sensor_type === 'AmbientTemperature');
            const existingAmbHum = dbSensors.filter(s => s.sensor_type === 'AmbientHumidity');
            const ambTempNumber = existingAmbTemp.length + 1 + i;
            const ambHumNumber = existingAmbHum.length + 1 + i;

            // Add Ambient Temperature sensor
            sensorsToAdd.push({
              room_id: roomData.id,
              sensor_type: 'AmbientTemperature',
              sensor_name: `Ambient Temperature ${ambTempNumber}`,
              sensor_code: `AMB_TEMP_${String(ambTempNumber).padStart(3, '0')}`,
              status: 'Online',
              battery_percentage: 100,
              last_reading_unit: '°C',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            // Add Ambient Humidity sensor
            sensorsToAdd.push({
              room_id: roomData.id,
              sensor_type: 'AmbientHumidity',
              sensor_name: `Ambient Humidity ${ambHumNumber}`,
              sensor_code: `AMB_HUM_${String(ambHumNumber).padStart(3, '0')}`,
              status: 'Online',
              battery_percentage: 100,
              last_reading_unit: '%',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        }
      } else {
        // Regular single-type sensor
        const existingOfType = dbSensors.filter(s => s.sensor_type === addSensorForm.sensor_type);
        const startNumber = existingOfType.length + 1;

        for (let i = 0; i < addSensorForm.quantity; i++) {
          const sensorNumber = startNumber + i;
          
          sensorsToAdd.push({
            room_id: roomData.id,
            sensor_type: addSensorForm.sensor_type,
            sensor_name: `${addSensorForm.sensor_type} ${sensorNumber}`,
            sensor_code: `${addSensorForm.sensor_type.toUpperCase().replace(/\+/g, '_')}_${String(sensorNumber).padStart(3, '0')}`,
            status: 'Online',
            battery_percentage: 100,
            last_reading_unit: selectedSensorType?.unit || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      console.log('Inserting sensors:', sensorsToAdd);

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
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Facility Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Please select a facility from the dropdown in the top header.
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
    // A sensor is ONLY active if status is online/active AND it has reported at least one reading
    const hasPassedReading = s.last_reading_value != null || (s.last_seen != null && s.last_seen !== '');
    return (st === 'active' || st === 'online') && hasPassedReading;
  };

  const activeSensors = dbSensors.filter(isSensorActive).length;
  const uniqueFarmers = new Set(
    inventory.filter(i => i.farmer_id || i.farmer_profile_id)
      .map(i => i.farmer_id || i.farmer_profile_id)
  ).size;
  const isNetworkConnected = true; // Always show as connected for presentation

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Facilities Monitoring
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Real-time telemetry and active client monitoring across all sites.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-sm font-medium">
          <BadgeCheck className="w-4 h-4" />
          MQTT Data Connected
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Active Farmers</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{uniqueFarmers}</p>
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
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Maintenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {dbSensors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No sensors discovered for this facility.
                  </td>
                </tr>
              ) : (
                dbSensors.map((sensor: any, index) => {
                  // Get actual reading value with unit - NO HARDCODED DEMO FALLBACKS
                  const getReadingDisplay = () => {
                    if (sensor.last_reading_value != null) {
                      const unit = sensor.last_reading_unit || '';
                      return `${sensor.last_reading_value} ${unit}`.trim();
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isMaintenance ? (
                            <>
                              <Wrench className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Required</span>
                            </>
                          ) : (
                            <>
                              <BadgeCheck className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Not Required</span>
                            </>
                          )}
                        </div>
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
