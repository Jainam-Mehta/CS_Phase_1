import React, { useEffect, useState, useMemo } from 'react';
import { Package, TrendingUp, Archive, AlertCircle, HardDrive, MapPin, Layers } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';

const OwnerInventory: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadFacilityRooms();
    }
  }, [user, selectedFacilityId]);

  useEffect(() => {
    if (selectedRoomId) {
      loadInventoryForRoom(selectedRoomId);
    } else {
      setInventory([]);
    }
  }, [selectedRoomId]);

  const loadFacilityRooms = async () => {
    try {
      setLoading(true);
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('facility_id', selectedFacilityId);

      const resolvedRooms = rmData || [];
      setRooms(resolvedRooms);
      
      if (resolvedRooms.length > 0) {
        if (!selectedRoomId || !resolvedRooms.find(r => r.id === selectedRoomId)) {
          setSelectedRoomId(resolvedRooms[0].id);
        }
      } else {
        setSelectedRoomId('');
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      if (!selectedRoomId) setLoading(false);
    }
  };

  const loadInventoryForRoom = async (roomId: string) => {
    try {
      setLoading(true);
      console.log('OwnerInventory: Loading inventory for room:', roomId);

      // NEW SCHEMA: Query batch_room_allocations -> batches -> products for this room
      const { data: allocationData, error: allocationError } = await supabase
        .from('batch_room_allocations')
        .select(`
          quantity_kg,
          assigned_at,
          removed_at,
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
            products(name)
          )
        `)
        .eq('room_id', roomId)
        .is('removed_at', null)
        .order('assigned_at', { ascending: false });

      if (allocationError) {
        console.error('OwnerInventory: Error fetching allocations:', allocationError);
        throw allocationError;
      }

      console.log('OwnerInventory: Raw allocation data:', allocationData);

      // Transform the data to match expected structure
      const transformedInventory = allocationData?.map((allocation: any) => {
        const products = allocation.batches.products;
        const productName = Array.isArray(products) ? products[0]?.name : products?.name;
        return {
          ...allocation.batches,
          room_id: roomId,
          quantity_kg: allocation.quantity_kg,
          assigned_at: allocation.assigned_at,
          product_name: productName || 'Unknown Product'
        };
      }) || [];

      console.log('OwnerInventory: Transformed inventory:', transformedInventory);
      setInventory(transformedInventory);
    } catch (error) {
      console.error('OwnerInventory: Error loading inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Derived KPI Calculations
  const totalProductsStored = useMemo(() => {
    return inventory.reduce((acc, curr) => acc + (Number(curr.quantity_kg) || Number(curr.remaining_quantity_kg) || Number(curr.initial_quantity_kg) || 0), 0);
  }, [inventory]);

  const totalValueEstimate = useMemo(() => {
    // Attempt to compute total value using value_in_inr, price, or fallback to quantity * 100
    return inventory.reduce((acc, curr) => {
      const qty = Number(curr.quantity_kg) || Number(curr.remaining_quantity_kg) || Number(curr.initial_quantity_kg) || 0;
      const val = curr.value_in_inr || curr.total_value || (qty * 10);
      return acc + (Number(val) || 0);
    }, 0);
  }, [inventory]);

  const activeBatches = inventory.length;

  // Selected Room Data
  const currentRoom = rooms.find(r => r.id === selectedRoomId);
  const capacityTotal = currentRoom ? Number(currentRoom.capacity_total) || 0 : 0;
  const capacityUsed = currentRoom ? Number(currentRoom.capacity_used) || 0 : 0;
  
  // Calculate battery percentage based on capacity_used / capacity_total
  // Usually battery is capacity, so green = available, red = occupied
  const occupiedPct = capacityTotal > 0 ? (capacityUsed / capacityTotal) * 100 : 0;
  const availablePct = Math.max(0, 100 - occupiedPct);

  // Products vs Quantity Bar Chart Data
  const productAggregates = useMemo(() => {
    const agg: Record<string, number> = {};
    inventory.forEach(item => {
      const name = item.product_name || item.products?.name || item.commodity || item.crop_type || item.name || 'Unknown Item';
      const qty = Number(item.quantity_kg) || Number(item.remaining_quantity_kg) || Number(item.initial_quantity_kg) || 0;
      agg[name] = (agg[name] || 0) + qty;
    });
    // Convert to sorted array
    return Object.entries(agg).map(([name, quantity]) => ({ name, quantity })).sort((a,b) => b.quantity - a.quantity).slice(0, 5); // top 5
  }, [inventory]);

  const maxQuantity = productAggregates.length > 0 ? Math.max(...productAggregates.map(p => p.quantity)) : 0;

  if (!selectedFacilityId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-64px)]">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Facility Selected</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          Please select a facility from the dropdown in the top header.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Header and Room Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Inventory Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Overview of all products currently stored across facilities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 flex items-center gap-3 shadow-sm">
            <Layers className="w-5 h-5 text-blue-500" />
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white text-sm font-medium focus:ring-0 outline-none w-48"
              disabled={loading || rooms.length === 0}
            >
              {rooms.length === 0 ? (
                <option value="">No Rooms Found</option>
              ) : (
                rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.room_name || `Room ${room.id.slice(0,4)}`}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* KPI Cards */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Products Stored</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalProductsStored} <span className="text-sm text-slate-500 font-normal">units</span></p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Value Estimate</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">₹{totalValueEstimate.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                <Archive className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Active Batches</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{activeBatches}</p>
              </div>
            </div>
          </div>

          {/* Graphs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Graph 1: Horizontal Bar Chart (Products vs Quantity) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col min-h-[300px]">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Products vs Quantity Stored
              </h2>
              
              {productAggregates.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-slate-500 text-sm">No products found in this room.</p>
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
                           style={{ width: `${maxQuantity > 0 ? (item.quantity / maxQuantity) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <div className="w-12 text-right text-sm font-bold text-slate-900 dark:text-white">
                        {item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graph 2: Battery Style Capacity Visualization */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col min-h-[300px]">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-500" />
                Room Capacity Overview
              </h2>
              
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* Battery Shell */}
                <div className="relative w-48 h-24 border-4 border-slate-300 dark:border-slate-600 rounded-lg p-1 flex">
                  {/* Battery Terminal */}
                  <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-2 h-10 bg-slate-300 dark:bg-slate-600 rounded-r-md"></div>
                  
                  {/* Battery Content */}
                  <div className="w-full h-full flex rounded-sm overflow-hidden bg-emerald-100 dark:bg-emerald-900/30">
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
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Occupied / {capacityUsed}kg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{availablePct.toFixed(1)}%</div>
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1">Available / {capacityTotal - capacityUsed}kg</div>
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
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No inventory batches in this room</h3>
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
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value Estimate</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Added At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {inventory.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                          {item.product_name || item.commodity || item.crop_type || item.name || 'Unknown Item'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {item.quantity} units
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{item.value_in_inr || item.total_value || (item.quantity ? Number(item.quantity) * 10 : 0)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                        </td>
                      </tr>
                    ))}
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
