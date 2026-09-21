import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Sun, Zap, Plug, IndianRupee } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import type { ColdStorageRoom, SensorDevice } from '../../lib/supabase';

interface RoomEnergyData {
  roomId: string;
  roomName: string;
  solarGenerated: number;
  solarConsumed: number;
  gridConsumed: number;
  cost: number;
}

const Energy: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  const [rooms, setRooms] = useState<ColdStorageRoom[]>([]);
  const [sensors, setSensors] = useState<SensorDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedFacilityId) {
      fetchRoomsAndSensors();
    }
  }, [user?.id, selectedFacilityId]);

  const fetchRoomsAndSensors = async () => {
    if (!user || !selectedFacilityId) return;

    try {
      setLoading(true);
      setError('');

      // Fetch rooms for these sites
      const { data: roomsData, error: roomsError } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('site_id', selectedFacilityId);

      if (roomsError) throw roomsError;

      if (!roomsData || roomsData.length === 0) {
        setRooms([]);
        setSensors([]);
        setLoading(false);
        return;
      }

      setRooms(roomsData);

      const roomIds = roomsData.map((r) => r.id);

      // Fetch sensors for these rooms
      const { data: sensorsData } = await supabase
        .from('sensor_devices')
        .select('*')
        .in('room_id', roomIds);

      setSensors(sensorsData || []);
    } catch (err) {
      console.error('Error fetching energy data:', err);
      setError('Failed to load energy data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate energy data per room from sensors
  const roomEnergyData: RoomEnergyData[] = rooms.map((room) => {
    const roomSensors = sensors.filter((s) => s.room_id === room.id);
    
    const solarSensors = roomSensors.filter((s) => s.sensor_type === 'solar');
    const solarGenerated = solarSensors.reduce((sum, s) => sum + (parseFloat(s.serial_number) || 0), 0);
    const solarConsumed = solarSensors.reduce((sum, s) => sum + (parseFloat(s.firmware_version) || 0), 0);
    
    const electricitySensors = roomSensors.filter((s) => s.sensor_type === 'electricity');
    const gridConsumed = electricitySensors.reduce((sum, s) => sum + (parseFloat(s.serial_number) || 0), 0);
    
    // Calculate cost (simplified: grid * ₹5/kWh)
    const cost = gridConsumed * 5;

    return {
      roomId: room.id,
      roomName: room.room_name,
      solarGenerated,
      solarConsumed,
      gridConsumed,
      cost,
    };
  });

  // Calculate totals
  const totalSolarGenerated = roomEnergyData.reduce((sum, r) => sum + r.solarGenerated, 0);
  const totalSolarConsumed = roomEnergyData.reduce((sum, r) => sum + r.solarConsumed, 0);
  const totalGridConsumed = roomEnergyData.reduce((sum, r) => sum + r.gridConsumed, 0);
  const totalCost = roomEnergyData.reduce((sum, r) => sum + r.cost, 0);

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

  if (rooms.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Energy Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor energy consumption and optimize usage
          </p>
        </div>
        <Card variant="default">
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No rooms available. Please complete the Owner Setup to create rooms and sensors.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Energy Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Monitor energy consumption and optimize usage
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Sun className="h-6 w-6 text-yellow-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Solar Generated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalSolarGenerated.toFixed(1)} kWh
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Zap className="h-6 w-6 text-orange-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Solar Consumed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalSolarConsumed.toFixed(1)} kWh
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Plug className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Grid Consumed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalGridConsumed.toFixed(1)} kWh
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <IndianRupee className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Energy Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ₹{totalCost.toFixed(0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Graph - Per Room */}
      <Card variant="default">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Energy Usage by Room
          </h3>
          {roomEnergyData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No energy data available
            </div>
          ) : (
            <div className="space-y-4">
              {roomEnergyData.map((room) => {
                const maxValue = Math.max(
                  ...roomEnergyData.map((r) => Math.max(r.solarGenerated, r.solarConsumed, r.gridConsumed))
                );
                
                const solarWidth = maxValue > 0 ? (room.solarGenerated / maxValue) * 100 : 0;
                const solarConsumedWidth = maxValue > 0 ? (room.solarConsumed / maxValue) * 100 : 0;
                const gridWidth = maxValue > 0 ? (room.gridConsumed / maxValue) * 100 : 0;
                
                return (
                  <div key={room.roomId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {room.roomName}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Cost: ₹{room.cost.toFixed(0)}
                      </span>
                    </div>
                    
                    {/* Solar Generated Bar */}
                    <div className="relative h-6 bg-gray-200 dark:bg-slate-700 rounded overflow-hidden">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-yellow-500 flex items-center px-2"
                        style={{ width: `${solarWidth}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {room.solarGenerated.toFixed(1)} kWh
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Solar Generated</span>
                    </div>
                    
                    {/* Solar Consumed Bar */}
                    <div className="relative h-6 bg-gray-200 dark:bg-slate-700 rounded overflow-hidden">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-orange-500 flex items-center px-2"
                        style={{ width: `${solarConsumedWidth}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {room.solarConsumed.toFixed(1)} kWh
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Solar Consumed</span>
                    </div>
                    
                    {/* Grid Consumed Bar */}
                    <div className="relative h-6 bg-gray-200 dark:bg-slate-700 rounded overflow-hidden">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-blue-500 flex items-center px-2"
                        style={{ width: `${gridWidth}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {room.gridConsumed.toFixed(1)} kWh
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Grid Consumed</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Energy;
