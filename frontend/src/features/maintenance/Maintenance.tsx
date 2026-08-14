import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Wrench, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import type { MaintenanceRecord, SensorDevice, ColdStorageRoom } from '../../lib/supabase';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';

const Maintenance: React.FC = () => {
  const { user } = useAuthStore();
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [sensors, setSensors] = useState<SensorDevice[]>([]);
  const [rooms, setRooms] = useState<ColdStorageRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMaintenanceData();
  }, [user]);

  const fetchMaintenanceData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      // Fetch owner's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        setMaintenanceRecords([]);
        setSensors([]);
        setRooms([]);
        setLoading(false);
        return;
      }

      // Fetch farmer's access to rooms
      const { data: accessData } = await supabase
        .from('farmer_room_access')
        .select('room_id')
        .eq('farmer_id', profile.id)
        .eq('status', RoomRequestStatus.Approved);

      if (!accessData || accessData.length === 0) {
        setMaintenanceRecords([]);
        setSensors([]);
        setRooms([]);
        setLoading(false);
        return;
      }

      const roomIds = accessData.map((a) => a.room_id);

      // Fetch rooms for these sites
      const { data: roomsData } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .in('id', roomIds);

      setRooms(roomsData || []);

      // Fetch sensors for these rooms
      const { data: sensorsData } = await supabase
        .from('sensor_devices')
        .select('*')
        .in('room_id', roomIds);

      setSensors(sensorsData || []);

      const sensorIds = sensorsData?.map((s) => s.id) || [];

      // Fetch maintenance records for these sensors (using alert_history)
      const { data: maintenanceData } = await supabase
        .from('alert_history')
        .select('*')
        .in('sensor_device_id', sensorIds)
        .order('created_at', { ascending: false });

      setMaintenanceRecords(maintenanceData || []);
    } catch (err) {
      console.error('Error fetching maintenance data:', err);
      setError('Failed to load maintenance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('alert_history')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) throw error;

      // Refresh data
      await fetchMaintenanceData();
    } catch (err) {
      console.error('Error marking maintenance complete:', err);
      setError('Failed to mark maintenance complete. Please try again.');
    }
  };

  const recordsByRoom = maintenanceRecords.reduce((acc, record) => {
    const sensor = sensors.find((s) => s.id === record.sensor_device_id);
    const roomId = sensor?.room_id || 'unknown';
    
    if (!acc[roomId]) {
      acc[roomId] = [];
    }
    acc[roomId].push(record);
    return acc;
  }, {} as Record<string, any[]>);

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
            Maintenance
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track and manage sensor maintenance
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
          Maintenance
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track and manage sensor maintenance issues
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {Object.keys(recordsByRoom).length === 0 ? (
        <Card variant="default">
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No maintenance records. All sensors are operating normally.
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(recordsByRoom).map(([roomId, records]: any) => {
          const room = rooms.find((r) => r.id === roomId);
          
          return (
            <Card key={roomId} variant="default">
              <CardHeader>
                <CardTitle>{room?.room_name || 'Unknown Room'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {records.map((record: any) => {
                    const sensor = sensors.find((s) => s.id === record.sensor_id);
                    
                    return (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Wrench className="h-5 w-5 text-orange-500" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {sensor?.sensor_name || 'Unknown Sensor'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Issue:</span> {record.alert_type || record.issue || 'Maintenance Required'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Reported:</span> {record.created_at?.substring(0, 10)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={record.is_resolved ? 'success' : 'warning'}
                            className="capitalize"
                          >
                            {record.is_resolved ? 'Resolved' : 'Pending'}
                          </Badge>
                          {!record.is_resolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkComplete(record.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default Maintenance;
