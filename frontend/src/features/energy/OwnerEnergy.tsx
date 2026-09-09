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

  const [loading, setLoading] = useState(true);
  const [facilityEnergy, setFacilityEnergy] = useState<FacilityEnergy[]>([]);
  const [totals, setTotals] = useState({ solar: 0, grid: 0, saved: 0 });

  useEffect(() => {
    if (user?.id) {
      loadEnergyData();
    }
  }, [user?.id]);

  const loadEnergyData = async () => {
    try {
      setLoading(true);

      // Get owner's profile
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single();

      if (!profile) return;

      // Get ALL facilities for this owner
      const { data: facilitiesData } = await supabase
        .from('facilities')
        .select('id, facility_name')
        .eq('owner_profile_id', profile.id);

      const facilities = facilitiesData || [];

      if (facilities.length === 0) {
        setFacilityEnergy([]);
        setTotals({ solar: 0, grid: 0, saved: 0 });
        return;
      }

      const facilityIds = facilities.map(f => f.id);

      // Get all rooms for all facilities
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('id, facility_id, room_name')
        .in('facility_id', facilityIds);

      const rooms = rmData || [];

      if (rooms.length === 0) {
        setFacilityEnergy([]);
        setTotals({ solar: 0, grid: 0, saved: 0 });
        return;
      }

      const roomIds = rooms.map(r => r.id);

      // Get latest energy reading per room from energy_usage table
      const { data: energyData } = await supabase
        .from('energy_usage')
        .select('room_id, solar_kwh, grid_kwh, total_kwh, recorded_at')
        .in('room_id', roomIds)
        .order('recorded_at', { ascending: false });

      // Pick the most recent reading per room
      const latestPerRoom = new Map<string, any>();
      for (const row of energyData || []) {
        if (!latestPerRoom.has(row.room_id)) {
          latestPerRoom.set(row.room_id, row);
        }
      }

      // Aggregate by facility
      const facilityMap = new Map<string, { solar: number; grid: number; total: number }>();
      
      rooms.forEach(room => {
        const e = latestPerRoom.get(room.id);
        const solar = Number(e?.solar_kwh) || 0;
        const grid = Number(e?.grid_kwh) || 0;
        const total = Number(e?.total_kwh) || 0;
        
        const existing = facilityMap.get(room.facility_id) || { solar: 0, grid: 0, total: 0 };
        facilityMap.set(room.facility_id, {
          solar: existing.solar + solar,
          grid: existing.grid + grid,
          total: existing.total + total
        });
      });

      const computed: FacilityEnergy[] = facilities.map(f => {
        const energy = facilityMap.get(f.id) || { solar: 0, grid: 0, total: 0 };
        return {
          facility_id: f.id,
          facility_name: f.facility_name || `Facility ${f.id.slice(0, 4)}`,
          solar_kwh: energy.solar,
          grid_kwh: energy.grid,
          total_kwh: energy.total
        };
      });

      setFacilityEnergy(computed);

      const totalSolar = computed.reduce((s, f) => s + f.solar_kwh, 0);
      const totalGrid = computed.reduce((s, f) => s + f.grid_kwh, 0);
      // Cost saved = solar_kwh * ₹8/kWh (standard grid rate)
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

  const maxKwh = facilityEnergy.length > 0 ? Math.max(...facilityEnergy.map(f => f.total_kwh), 1) : 1;

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Energy Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Track power consumption, renewable generation, and efficiency.
          </p>
        </div>
      </div>

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
