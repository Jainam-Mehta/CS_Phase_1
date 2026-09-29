import React, { useEffect, useState } from 'react';
import { Zap, Sun, IndianRupee, BarChart3, Building } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';


interface RoomEnergy {
  room_id: string;
  room_name: string;
  site_name: string;
  solar_kwh: number;
  grid_kwh: number;
  total_kwh: number;
}

const OwnerEnergy: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();

  const [loading, setLoading] = useState(true);
  const [roomEnergy, setRoomEnergy] = useState<RoomEnergy[]>([]);
  const [totals, setTotals] = useState({ solar: 0, grid: 0, saved: 0 });
  const [siteName, setSiteName] = useState<string>('');

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadEnergyData();
    }
  }, [user?.id, selectedFacilityId]);

  const loadEnergyData = async () => {
    try {
      setLoading(true);

      if (!selectedFacilityId) {
        setRoomEnergy([]);
        setTotals({ solar: 0, grid: 0, saved: 0 });
        setLoading(false);
        return;
      }

      // Fetch Site Name
      const { data: siteData } = await supabase
        .from('sites')
        .select('facility_name')
        .eq('id', selectedFacilityId)
        .single();

      setSiteName(siteData?.facility_name || 'Your Site');

      // Fetch ALL rooms for selected facility
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('id, room_name, room_code, site_id')
        .eq('site_id', selectedFacilityId);

      const resolvedRooms = rmData || [];
      
      if (resolvedRooms.length === 0) {
        setRoomEnergy([]);
        setTotals({ solar: 0, grid: 0, saved: 0 });
        return;
      }

      const roomIds = resolvedRooms.map(r => r.id);
      const roomMap = new Map(resolvedRooms.map(r => [r.id, { name: r.room_name || r.room_code, site_name: siteData?.facility_name || 'Your Site' }]));

      // Get latest energy readings for ALL rooms
      const { data: energyData } = await supabase
        .from('energy_usage')
        .select('room_id, solar_kwh, grid_kwh, total_kwh, recorded_at')
        .in('room_id', roomIds)
        .order('recorded_at', { ascending: false });

      // Group by room and get latest reading for each
      const latestByRoom = new Map<string, any>();
      (energyData || []).forEach((reading: any) => {
        if (!latestByRoom.has(reading.room_id)) {
          latestByRoom.set(reading.room_id, reading);
        }
      });

      // Build room energy data
      const roomEnergyData: RoomEnergy[] = [];
      let totalSolar = 0;
      let totalGrid = 0;

      resolvedRooms.forEach((room: any) => {
        const latest = latestByRoom.get(room.id);
        const solar = latest ? Number(latest.solar_kwh) || 0 : 0;
        const grid = latest ? Number(latest.grid_kwh) || 0 : 0;
        const total = latest ? Number(latest.total_kwh) || 0 : 0;

        roomEnergyData.push({
          room_id: room.id,
          room_name: room.room_name || room.room_code,
          site_name: siteData?.facility_name || 'Your Site',
          solar_kwh: solar,
          grid_kwh: grid,
          total_kwh: total
        });

        totalSolar += solar;
        totalGrid += grid;
      });

      setRoomEnergy(roomEnergyData);
      setTotals({ solar: totalSolar, grid: totalGrid, saved: Math.round(totalSolar * 8) });
    } catch (error) {
      console.error('Error loading energy data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove facility selection guard - show all facilities

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!selectedFacilityId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-64px)]">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Site Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Please select a site from the dropdown in the top header.
        </p>
      </div>
    );
  }

      const maxKwh = roomEnergy.length > 0 ? Math.max(...roomEnergy.map(f => f.total_kwh), 1) : 1;

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {siteName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Track power consumption, renewable generation, and efficiency.
          </p>
        </div>
      </div>

      {/* Room Selector Removed - Show all rooms across the selected site */}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
            <Sun className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Solar Generated</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
              {totals.solar.toFixed(1)} <span className="text-lg text-slate-500 font-medium">kWh</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
            <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Grid Consumed</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
              {totals.grid.toFixed(1)} <span className="text-lg text-slate-500 font-medium">kWh</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
            <IndianRupee className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Cost Saved</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">₹{totals.saved.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Per Room Energy Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Per Room Energy Consumption
          </h2>
        </div>

        {roomEnergy.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center h-80">
            <Building className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Energy Data Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Energy readings will appear here once sensors start publishing data.
            </p>
          </div>
        ) : (
          <div className="p-8">
            <div className="space-y-6">
              {roomEnergy.map((room) => (
                <div key={room.room_id} className="flex items-center gap-4">
                  <div className="w-48">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {room.site_name} - {room.room_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Solar: {room.solar_kwh.toFixed(1)} kWh | Grid: {room.grid_kwh.toFixed(1)} kWh
                    </div>
                  </div>
                  <div className="flex-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 relative">
                    <div
                      className="bg-blue-500 dark:bg-blue-600 h-4 rounded-full transition-all duration-700"
                      style={{ width: `${maxKwh > 0 ? (room.total_kwh / maxKwh) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm font-bold text-slate-900 dark:text-white">
                    {room.total_kwh.toFixed(1)} kWh
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerEnergy;
