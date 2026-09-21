import React, { useEffect, useState, useMemo } from 'react';
import { Package, TrendingUp, Archive, AlertCircle, HardDrive, MapPin, Layers } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';
import { convertKgToCrates, KG_PER_CRATE } from '../../utils/units';


const OwnerInventory: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadFacilityData();
    }
  }, [user?.id, selectedFacilityId]);

  const loadFacilityData = async () => {
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
      const { data: rmData, error: rmError } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('site_id', selectedFacilityId);

      console.log('Rooms query error:', rmError);
      console.log('Rooms fetched:', rmData?.length || 0);

      const resolvedRooms = rmData || [];
      setRooms(resolvedRooms);

      // Set default room if not already selected
      if (resolvedRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(resolvedRooms[0].id);
      }

      // Use the currently selected room or the first room
      const roomToUse = selectedRoomId || (resolvedRooms.length > 0 ? resolvedRooms[0].id : null);
      
      if (!roomToUse || resolvedRooms.length === 0) {
        setInventory([]);
        setLoading(false);
        return;
      }

      const roomIds = [roomToUse];

      // Query batch_room_allocations for the selected room
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
            profiles(full_name)
          )
        `)
        .eq('room_id', roomToUse)
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
          removed_at: allocation.removed_at,
          product_name: productName || 'Unknown Product',
          farmer_name: farmerName,
          display_date: allocation.created_at || allocation.assigned_at  // Use batch created_at first
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

  const [capacityData, setCapacityData] = useState({ total: 0, used: 0 });

  useEffect(() => {
    const loadCapacityData = async () => {
      try {
        if (!selectedFacilityId) return;

        // Get all rooms for this facility
        const { data: roomsData } = await supabase
          .from('cold_storage_rooms')
          .select('id, capacity_kg')
          .eq('site_id', selectedFacilityId);

        if (!roomsData || roomsData.length === 0) {
          setCapacityData({ total: 0, used: 0 });
          return;
        }

        const totalCapacity = roomsData.reduce((sum, r) => sum + (Number(r.capacity_kg) || 0), 0);
        const roomIds = roomsData.map(r => r.id);

        // Calculate actual occupancy from batch_room_allocations for selected room only
        const roomIdToQuery = selectedRoomId || (roomIds.length > 0 ? roomIds[0] : null);
        if (!roomIdToQuery) {
          setCapacityData({ total: totalCapacity, used: 0 });
          return;
        }

        const { data: allocationsData } = await supabase
          .from('batch_room_allocations')
          .select('quantity_kg')
          .eq('room_id', roomIdToQuery)
          .is('removed_at', null);

        const usedCapacity = (allocationsData || []).reduce((sum, alloc) => sum + (Number(alloc.quantity_kg) || 0), 0);
        
        console.log('Capacity Debug:', { totalCapacity, usedCapacity, allocations: allocationsData?.length || 0 });
        setCapacityData({ total: totalCapacity, used: usedCapacity });
      } catch (error) {
        console.error('Error loading capacity data:', error);
      }
    };
    
    if (selectedFacilityId) {
      loadCapacityData();
    }
  }, [selectedFacilityId, selectedRoomId]);

  const occupiedPct = capacityData.total > 0 ? (capacityData.used / capacityData.total) * 100 : 0;
  const availablePct = Math.max(0, 100 - occupiedPct);

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {siteName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Overview of all products currently stored in this room.
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

      {!selectedFacilityId ? (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-64px)]">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Facility Selected</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Please select a facility from the dropdown in the top header.
          </p>
        </div>
      ) : loading ? (
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
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
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
                          <td className="px-6 py-4 text-sm">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                              In Storage
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {item.display_date ? new Date(item.display_date).toLocaleDateString() : 'Date unavailable'}
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
