import React, { useEffect, useState, useMemo } from 'react';
import { Package, TrendingUp, Archive, AlertCircle, HardDrive, MapPin, Layers } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';
import { convertKgToCrates, KG_PER_CRATE } from '../../utils/units';


const OwnerInventory: React.FC = () => {
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadAllInventory();
    }
  }, [user?.id]);

  const loadAllInventory = async () => {
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

      console.log('🔍 DEBUG Owner: Profile ID:', profile.id);

      // Get ALL facilities for this owner
      const { data: facilitiesData } = await supabase
        .from('facilities')
        .select('id, facility_name, capacity_kg, current_utilization_kg')
        .eq('owner_profile_id', profile.id);

      console.log('🔍 DEBUG Owner: Facilities found:', facilitiesData?.length || 0, facilitiesData);

      if (!facilitiesData || facilitiesData.length === 0) {
        setInventory([]);
        setLoading(false);
        return;
      }

      const facilityIds = facilitiesData.map(f => f.id);

      // Get all rooms for all facilities
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('id, facility_id, room_name')
        .in('facility_id', facilityIds);

      const rooms = rmData || [];
      console.log('🔍 DEBUG Owner: Rooms found:', rooms.length, rooms);

      if (rooms.length === 0) {
        setInventory([]);
        setLoading(false);
        return;
      }

      const roomIds = rooms.map(r => r.id);

      // Find farmers that have APPROVED access to these rooms
      const { data: accessData } = await supabase
        .from('farmer_room_access')
        .select('farmer_id')
        .in('room_id', roomIds)
        .eq('status', RoomRequestStatus.Approved);

      console.log('🔍 DEBUG Owner: Approved farmers:', accessData?.length || 0, accessData);

      if (!accessData || accessData.length === 0) {
        setInventory([]);
        setLoading(false);
        return;
      }

      const farmerIds = accessData.map(a => a.farmer_id);
      console.log('🔍 DEBUG Owner: Farmer IDs to query:', farmerIds);

      // Query batch_room_allocations -> batches -> products -> profiles for farmer name
      const { data: allocationData } = await supabase
        .from('batch_room_allocations')
        .select(`
          quantity_kg,
          assigned_at,
          removed_at,
          room_id,
          batches!inner(
            id,
            batch_code,
            farmer_id,
            product_id,
            harvest_date,
            expiry_date,
            initial_quantity_kg,
            remaining_quantity_kg,
            quality_grade,
            remarks,
            created_at,
            products(name),
            profiles(first_name, last_name)
          )
        `)
        .in('batches.farmer_id', farmerIds)
        .is('removed_at', null)
        .order('assigned_at', { ascending: false });

      console.log('🔍 DEBUG Owner: Allocations found:', allocationData?.length || 0, allocationData);

      // Transform the data
      const transformedInventory = allocationData?.map((allocation: any) => {
        const products = allocation.batches.products;
        const productName = Array.isArray(products) ? products[0]?.name : products?.name;
        const profile = allocation.batches.profiles;
        const farmerName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Farmer'
          : 'Unknown Farmer';
        
        return {
          ...allocation.batches,
          room_id: allocation.room_id,
          quantity_kg: allocation.quantity_kg,
          assigned_at: allocation.assigned_at,
          product_name: productName || 'Unknown Product',
          farmer_name: farmerName
        };
      }) || [];

      console.log('✅ DEBUG Owner: Final inventory:', transformedInventory.length, transformedInventory);
      setInventory(transformedInventory);
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCrates = useMemo(() => {
    const totalKg = inventory.reduce((acc, curr) => acc + (Number(curr.quantity_kg) || Number(curr.remaining_quantity_kg) || Number(curr.initial_quantity_kg) || 0), 0);
    return convertKgToCrates(totalKg);
  }, [inventory]);

  const activeBatches = inventory.length;

  // Products vs Quantity in Crates Bar Chart Data
  const productAggregates = useMemo(() => {
    const agg: Record<string, number> = {};
    inventory.forEach(item => {
      const name = item.product_name || item.products?.name || item.commodity || item.crop_type || item.name || 'Unknown Item';
      const kg = Number(item.quantity_kg) || Number(item.remaining_quantity_kg) || Number(item.initial_quantity_kg) || 0;
      const crates = kg / KG_PER_CRATE;
      agg[name] = (agg[name] || 0) + crates;
    });
    // Convert to sorted array
    return Object.entries(agg).map(([name, crates]) => ({ name, crates })).sort((a,b) => b.crates - a.crates).slice(0, 5); // top 5
  }, [inventory]);

  const maxCrates = productAggregates.length > 0 ? Math.max(...productAggregates.map(p => p.crates)) : 0;

  // Room Capacity - using occupied kg (red) vs available (green)
  // Since we're showing all facilities, let's aggregate all facility capacity
  const [capacityData, setCapacityData] = useState({ total: 0, used: 0 });

  useEffect(() => {
    const loadCapacityData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .single();

        if (!profile) return;

        const { data: facilitiesData } = await supabase
          .from('facilities')
          .select('capacity_kg, current_utilization_kg')
          .eq('owner_id', profile.id);

        if (facilitiesData) {
          const total = facilitiesData.reduce((sum, f) => sum + (Number(f.capacity_kg) || 0), 0);
          const used = facilitiesData.reduce((sum, f) => sum + (Number(f.current_utilization_kg) || 0), 0);
          setCapacityData({ total, used });
        }
      } catch (error) {
        console.error('Error loading capacity data:', error);
      }
    };
    
    if (user?.id) {
      loadCapacityData();
    }
  }, [user?.id]);

  const occupiedPct = capacityData.total > 0 ? (capacityData.used / capacityData.total) * 100 : 0;
  const availablePct = Math.max(0, 100 - occupiedPct);

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Header - Remove Room Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Inventory Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Overview of all products currently stored across all your facilities.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          {/* Graphs Section - Remove KPI boxes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Graph 1: Horizontal Bar Chart (Products vs Quantity in Crates) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col min-h-[300px]">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Products vs Quantity (Crates)
              </h2>
              
              {productAggregates.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-slate-500 text-sm">No products found.</p>
                </div>
              ) : (
                <div className="space-y-5 flex-1">
                  {productAggregates.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-32 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item.name}
                      </div>
                      <div className="flex-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden relative">
                        <div 
                           className="bg-blue-500 dark:bg-blue-600 h-4 rounded-full transition-all duration-1000"
                           style={{ width: `${maxCrates > 0 ? (item.crates / maxCrates) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="w-16 text-right text-sm font-bold text-slate-900 dark:text-white">
                        {item.crates.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graph 2: Battery Style Capacity Visualization - Shows Occupied (Red) vs Available (Green) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col min-h-[300px]">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-500" />
                Facility Capacity Overview
              </h2>
              
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* Battery Shell */}
                <div className="relative w-48 h-24 border-4 border-slate-300 dark:border-slate-600 rounded-lg p-1 flex">
                  {/* Battery Terminal */}
                  <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-2 h-10 bg-slate-300 dark:bg-slate-600 rounded-r-md"></div>
                  
                  {/* Battery Content */}
                  <div className="w-full h-full flex rounded-sm overflow-hidden bg-slate-100 dark:bg-slate-900/30">
                    {/* Occupied Area (Red) */}
                    <div 
                      className="h-full bg-red-400 dark:bg-red-500 transition-all duration-1000"
                      style={{ width: `${occupiedPct}%` }}
                    ></div>
                    {/* Available Area (Green) */}
                    <div 
                      className="h-full bg-emerald-400 dark:bg-emerald-500 transition-all duration-1000"
                      style={{ width: `${availablePct}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-8 w-full flex justify-between px-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500 dark:text-red-400">{occupiedPct.toFixed(1)}%</div>
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Occupied / {capacityData.used}kg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{availablePct.toFixed(1)}%</div>
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Available / {capacityData.total - capacityData.used}kg</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Inventory Batches</h2>
            </div>
            
            {inventory.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No inventory batches</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                  There are currently no products recorded in the system. When batches are added by farmers or staff, they will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Farmer Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {inventory.map((item, idx) => {
                      const kg = item.quantity_kg ?? item.remaining_quantity_kg ?? 0;
                      const crates = (kg / KG_PER_CRATE).toFixed(1);
                      
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                            {item.product_name || item.commodity || item.crop_type || item.name || 'Unknown Item'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {crates} crates ({kg} kg)
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.farmer_name || 'Unknown Farmer'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OwnerInventory;
