import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { 
  Activity, 
  Thermometer, 
  Droplets, 
  Gauge, 
  Wind, 
  Search, 
  DoorOpen,
  Flame,
  Leaf,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Wrench
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';

interface SensorDevice {
  id: string;
  room_id: string;
  sensor_name: string;
  sensor_type: string;
  serial_number: string;
  mqtt_topic: string;
  firmware_version: string;
  installation_date: string;
  last_calibration: string;
  status: string;
  last_seen: string;
  battery_percentage: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

interface ColdStorageRoom {
  id: string;
  room_code: string;
  facility_id: string;
  room_name: string;
  capacity_kg: number;
  current_utilization_kg: number;
  status: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  site_id: string;
}

const Monitoring: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  const [sensors, setSensors] = useState<SensorDevice[]>([]);
  const [rooms, setRooms] = useState<ColdStorageRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  useEffect(() => {
    if (selectedFacilityId) {
      fetchRoomsAndSensors();
    }
  }, [user, selectedFacilityId]);

  const fetchRoomsAndSensors = async () => {
    if (!user || !selectedFacilityId) return;

    try {
      setLoading(true);
      setError('');

      // Fetch rooms for the selected facility
      const { data: roomsData, error: roomsError } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('facility_id', selectedFacilityId);

      if (roomsError) throw roomsError;

      if (!roomsData || roomsData.length === 0) {
        setRooms([]);
        setSensors([]);
        setLoading(false);
        return;
      }

      setRooms(roomsData);
      // Auto-select first room
      setSelectedRoomId((prev) => (roomsData.find(r => r.id === prev) ? prev : roomsData[0].id));

      const roomIds = roomsData.map((r) => r.id);

      // Fetch sensors for these rooms
      const { data: sensorsData, error: sensorsError } = await supabase
        .from('sensor_devices')
        .select('*')
        .in('room_id', roomIds);

      if (sensorsError) throw sensorsError;

      setSensors(sensorsData || []);
    } catch (err) {
      console.error('Error fetching sensors:', err);
      setError('Failed to load sensors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'temperature':
      case 'outdoor_temperature':
        return Thermometer;
      case 'humidity':
        return Droplets;
      case 'pressure':
        return Gauge;
      case 'co2':
        return Wind;
      case 'o2':
        return Activity;
      case 'ammonia':
        return Flame;
      case 'ethylene':
        return Leaf;
      case 'door':
        return DoorOpen;
      default:
        return Activity;
    }
  };

  const getUnit = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'temperature':
      case 'outdoor_temperature':
        return '°C';
      case 'humidity':
        return '%';
      case 'pressure':
        return 'Bar';
      case 'co2':
        return 'ppm';
      case 'o2':
        return '%';
      case 'ammonia':
        return 'ppm';
      case 'ethylene':
        return 'ppm';
      case 'door':
        return '';
      default:
        return '';
    }
  };

  const filteredSensors = selectedRoom
    ? sensors.filter((s) => s.room_id === selectedRoomId)
    : sensors;

  const searchedSensors = filteredSensors.filter((s) =>
    s.sensor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.sensor_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSensors = filteredSensors.length;
  const onlineSensors = filteredSensors.filter((s) => s.status === 'Online').length;
  const offlineSensors = filteredSensors.filter((s) => s.status === 'Offline').length;
  const criticalSensors = filteredSensors.filter((s) => s.status === 'Faulty').length;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Monitoring
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Real-time monitoring of sensors and equipment
        </p>
      </div>

      {/* Room Selection */}
      {rooms.length > 0 ? (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Room:</label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.room_name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No rooms available. Please complete the Owner Setup to create rooms and sensors.
        </div>
      )}

      {/* Summary Cards - Only 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="default" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Activity className="h-6 w-6 text-blue-500 dark:text-blue-400 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Sensors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalSensors}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{onlineSensors}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <XCircle className="h-6 w-6 text-orange-500 dark:text-orange-400 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Offline</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{offlineSensors}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalSensors}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search sensors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Sensor Monitoring Table */}
      <Card variant="default" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Sr No</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Sensor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Last Seen</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Maintenance</th>
                </tr>
              </thead>
              <tbody>
                {searchedSensors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No sensors found
                    </td>
                  </tr>
                ) : (
                  searchedSensors.map((sensor, index) => {
                    const Icon = getIcon(sensor.sensor_type);
                    const needsMaintenance = sensor.status === 'Faulty' || sensor.status === 'Maintenance';
                    
                    return (
                      <tr 
                        key={sensor.id} 
                        className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <Icon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{sensor.sensor_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">{sensor.sensor_type.replace('_', ' ')}</td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={sensor.status === 'Online' ? 'success' : sensor.status === 'Faulty' ? 'error' : 'warning'}
                            className="capitalize"
                          >
                            {sensor.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {sensor.last_seen ? new Date(sensor.last_seen).toLocaleString() : '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Wrench className={`h-4 w-4 ${needsMaintenance ? 'text-orange-500 dark:text-orange-400' : 'text-green-500 dark:text-green-400'}`} />
                            <span className={`text-sm font-medium ${needsMaintenance ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                              {needsMaintenance ? 'Maintenance Required' : 'No Maintenance Required'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Monitoring;
