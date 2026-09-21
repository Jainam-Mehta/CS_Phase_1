import React, { useEffect, useState } from 'react';
import { Zap, Sun, IndianRupee, BarChart3, Building } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';


interface FacilityEnergy {
  facility_id: string;
  facility_name: string;
  solar_kwh: number;
  grid_kwh: number;
  total_kwh: number;
}

const OwnerEnergy: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();

  const [loading, setLoading] = useState(true);
  const [facilityEnergy, setFacilityEnergy] = useState<FacilityEnergy[]>([]);
  const [totals, setTotals] = useState({ solar: 0, grid: 0, saved: 0 });
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadEnergyData();
    }
  }, [user?.id, selectedFacilityId, selectedRoomId]);

  const loadEnergyData = async () => {
    try {
      setLoading(true);

      if (!selectedFacilityId) {
        setFacilityEnergy([]);
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

      // Fetch Rooms for selected facility
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('site_id', selectedFacilityId);

      const resolvedRooms = rmData || [];
      setRooms(resolvedRooms);

      // Set default room if not already selected
      if (resolvedRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(resolvedRooms[0].id);
      }

      const roomToUse = selectedRoomId || (resolvedRooms.length > 0 ? resolvedRooms[0].id : null);
      
      if (!roomToUse) {
        setFacilityEnergy([]);
        setTotals({ solar: 0, grid: 0, saved: 0 });
        return;
      }

      // Get latest energy reading for the selected room only
      const { data: energyData } = await supabase
        .from('energy_usage')
        .select('room_id, solar_kwh, grid_kwh, total_kwh, recorded_at')
        .eq('room_id', roomToUse)
        .order('recorded_at', { ascending: false });

      // Use the most recent reading
      const latestReading = energyData && energyData.length > 0 ? energyData[0] : null;
      
      if (!latestReading) {
        setFacilityEnergy([]);
        setTotals({ solar: 0, grid: 0, saved: 0 });
        return;
      }

      const facilityData: FacilityEnergy = {
        facility_id: selectedFacilityId,
        facility_name: siteName || `Site ${selectedFacilityId.slice(0, 4)}`,
        solar_kwh: Number(latestReading.solar_kwh) || 0,
        grid_kwh: Number(latestReading.grid_kwh) || 0,
        total_kwh: Number(latestReading.total_kwh) || 0
      };

      setFacilityEnergy([facilityData]);

      const totalSolar = facilityData.solar_kwh;
      const totalGrid = facilityData.grid_kwh;
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
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Facility Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Please select a facility from the dropdown in the top header.
        </p>
      </div>
    );
  }

  const maxKwh = facilityEnergy.length > 0 ? Math.max(...facilityEnergy.map(f => f.total_kwh), 1) : 1;

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

      {/* Room Selector - Show if multiple rooms */}
      {rooms.length > 1 && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Room:</label>
          <select
            value={selectedRoomId || ''}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.room_name} (Capacity: {room.capacity_kg}kg)
              </option>
            ))}
          </select>
        </div>
      )}

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
            Per Facility Energy Consumption
          </h2>
        </div>

        {facilityEnergy.length === 0 ? (
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
              {facilityEnergy.map((facility) => (
                <div key={facility.facility_id} className="flex items-center gap-4">
                  <div className="w-36 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                    {facility.facility_name}
                  </div>
                  <div className="flex-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 relative">
                    <div
                      className="bg-blue-500 dark:bg-blue-600 h-4 rounded-full transition-all duration-700"
                      style={{ width: `${maxKwh > 0 ? (facility.total_kwh / maxKwh) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm font-bold text-slate-900 dark:text-white">
                    {facility.total_kwh.toFixed(1)} kWh
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
