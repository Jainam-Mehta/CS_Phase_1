import React, { useEffect, useState, useMemo } from 'react';
import { Package, TrendingUp, Archive, AlertCircle, HardDrive, MapPin, Layers } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';
import { convertKgToCrates, KG_PER_CRATE } from '../../utils/units';


const OwnerInventory: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId, selectedRoomId } = useSiteStore();
  
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  const [farmerActions, setFarmerActions] = useState<any[]>([]);
  const [siteName, setSiteName] = useState<string>('');

  useEffect(() => {
    if (user?.id && selectedFacilityId && selectedRoomId) {
      loadFacilityData();
    }
  }, [user?.id, selectedFacilityId, selectedRoomId]);

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

      if (!selectedRoomId) {
        setInventory([]);
        setFarmerActions([]);
        setLoading(false);
        return;
      }

      // Simple query first - just get the allocations without nested joins
      console.log('📍 Starting batch_room_allocations query for room:', selectedRoomId);
      const { data: allocationData, error: allocError } = await supabase
        .from('batch_room_allocations')
        .select('*')
        .eq('room_id', selectedRoomId)
        .order('assigned_at', { ascending: false });

      if (allocError) {
        console.error('❌ Error loading allocations:', allocError);
        console.error('Error details:', { code: allocError.code, message: allocError.message });
        setInventory([]);
        setFarmerActions([]);
        setLoading(false);
        return;
      }

      console.log('✅ Allocations found:', allocationData?.length || 0);

      // If no allocations, we're done
      if (!allocationData || allocationData.length === 0) {
        console.log('📭 No allocations in this room');
        setInventory([]);
        setFarmerActions([]);
        setLoading(false);
        return;
      }

      // Now fetch batch details for each allocation
      const batchIds = allocationData.map((a: any) => a.batch_id);
      console.log('🔗 Fetching batch details for', batchIds.length, 'batches');

      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*, products(name)')
        .in('id', batchIds);

      if (batchError) {
        console.error('❌ Error loading batches:', batchError);
        setInventory([]);
        setFarmerActions([]);
        setLoading(false);
        return;
      }

      console.log('✅ Batches found:', batchData?.length || 0);

      // Fetch sales data for these batches - to show what was removed
      console.log('💰 Fetching sales for these batches...');
      const { data: salesData } = await supabase
        .from('sales')
        .select('batch_id, quantity_kg, selling_price, buyer, sold_at')
        .in('batch_id', batchIds)
        .order('sold_at', { ascending: false });

      console.log('✅ Sales found:', salesData?.length || 0);

      // Get unique farmer IDs and fetch their profiles
      const farmerIds = [...new Set((batchData || []).map((b: any) => b.farmer_id).filter(Boolean))];
      let farmerMap = new Map();
      
      if (farmerIds.length > 0) {
        const { data: farmerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', farmerIds);
        
        farmerMap = new Map((farmerProfiles || []).map((p: any) => [p.id, p.full_name]));
      }

      // Create maps for quick lookup
      const batchMap = new Map((batchData || []).map((b: any) => [b.id, b]));
      const salesByBatch = new Map();
      (salesData || []).forEach((sale: any) => {
        if (!salesByBatch.has(sale.batch_id)) {
          salesByBatch.set(sale.batch_id, []);
        }
        salesByBatch.get(sale.batch_id).push(sale);
      });

      // Transform the data
      const storedInventory: any[] = [];
      const removedActions: any[] = [];

      (allocationData || []).forEach((allocation: any) => {
        const batch = batchMap.get(allocation.batch_id);
        if (!batch) return; // Skip if batch not found

        const products = batch.products;
        const productName = Array.isArray(products) ? products[0]?.name : products?.name;
        const farmerName = farmerMap.get(batch.farmer_id) || 'Unknown Farmer';
        
        // Get sales for this batch
        const batchSales = salesByBatch.get(allocation.batch_id) || [];
        const totalSoldKg = batchSales.reduce((sum: number, sale: any) => sum + (Number(sale.quantity_kg) || 0), 0);

        const transformedItem = {
          ...batch,
          room_id: allocation.room_id,
          quantity_kg: allocation.quantity_kg,
          assigned_at: allocation.assigned_at,
          removed_at: allocation.removed_at,
          product_name: productName || 'Unknown Product',
          farmer_name: farmerName,
          display_date: allocation.assigned_at || batch.created_at,
          sales: batchSales,
          total_sold_kg: totalSoldKg
        };

        // If batch has sales, add removal log entry (one entry per total sales, not per individual sale)
        if (batchSales.length > 0) {
          removedActions.push({
            id: `removed-${batch.id}`,
            batch_code: batch.batch_code,
            farmer_name: farmerName,
            product_name: productName || 'Unknown Product',
            quantity_kg: totalSoldKg,
            quantity_crates: totalSoldKg / KG_PER_CRATE,
            action_type: 'removed',
            action_date: batchSales[0].sold_at, // Use earliest sale date
            total_sales: batchSales.length
          });
        }

        // Add the batch itself (whether stored or removed from room)
        if (allocation.removed_at === null) {
          storedInventory.push(transformedItem);
        } else {
          removedActions.push({
            ...transformedItem,
            action_type: 'removed',
            action_date: allocation.removed_at
          });
        }
      });

      console.log('✅ Stored inventory:', storedInventory.length);
      console.log('✅ Removed actions:', removedActions.length);

      setInventory(storedInventory);
      setFarmerActions(removedActions);
    } catch (error) {
      console.error('❌ Catch-all error loading inventory:', error);
      setInventory([]);
      setFarmerActions([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate remaining quantity after accounting for sales
  const inventoryWithRemaining = useMemo(() => {
    return inventory.map(item => {
      const initialKg = item.initial_quantity_kg || item.quantity_kg || 0;
      const soldKg = item.total_sold_kg || 0;
      const remainingKg = Math.max(0, initialKg - soldKg);
      return {
        ...item,
        remaining_kg: remainingKg,
        sold_kg: soldKg
      };
    });
  }, [inventory]);

  const totalCrates = useMemo(() => {
    const totalKg = inventoryWithRemaining.reduce((acc, curr) => acc + (curr.remaining_kg || 0), 0);
    return convertKgToCrates(totalKg);
  }, [inventoryWithRemaining]);

  const activeBatches = inventoryWithRemaining.length;

  // Products vs Quantity in Crates Bar Chart Data - Shows REMAINING after sales
  const productAggregates = useMemo(() => {
    const agg: Record<string, number> = {};
    inventoryWithRemaining.forEach(item => {
      const name = item.product_name || item.products?.name || item.commodity || item.crop_type || item.name || 'Unknown Item';
      const remainingKg = item.remaining_kg || 0;
      const crates = remainingKg / KG_PER_CRATE;
      agg[name] = (agg[name] || 0) + crates;
    });
    // Convert to sorted array
    return Object.entries(agg).map(([name, crates]) => ({ name, crates })).sort((a,b) => b.crates - a.crates).slice(0, 5); // top 5
  }, [inventoryWithRemaining]);

  const maxCrates = productAggregates.length > 0 ? Math.max(...productAggregates.map(p => p.crates)) : 0;

  const [capacityData, setCapacityData] = useState({ total: 0, used: 0 });

  useEffect(() => {
    const loadCapacityData = async () => {
      try {
        if (!selectedFacilityId || !selectedRoomId) {
          setCapacityData({ total: 0, used: 0 });
          return;
        }

        // Get capacity for the selected room
        const { data: roomData } = await supabase
          .from('cold_storage_rooms')
          .select('capacity_kg')
          .eq('id', selectedRoomId)
          .single();

        const totalCapacity = roomData?.capacity_kg || 0;

        // Calculate used capacity based on remaining inventory (after sales)
        const usedCapacity = inventoryWithRemaining.reduce((sum, item) => sum + (item.remaining_kg || 0), 0);
        
        console.log('Capacity Debug:', { totalCapacity, usedCapacity, items: inventoryWithRemaining.length });
        setCapacityData({ total: totalCapacity, used: usedCapacity });
      } catch (error) {
        console.error('Error loading capacity data:', error);
      }
    };
    
    if (selectedFacilityId && selectedRoomId) {
      loadCapacityData();
    }
  }, [selectedFacilityId, selectedRoomId, inventoryWithRemaining]);

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

      {/* Room Selector Removed - Using global useSiteStore selection */}

      {!selectedFacilityId ? (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-64px)]">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Site Selected</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Please select a site from the dropdown in the top header.
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
                Site Capacity Overview
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
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Farmer Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {inventory.map((item, idx) => {
                      const kg = item.quantity_kg ?? item.remaining_quantity_kg ?? 0;
                      const crates = (kg / KG_PER_CRATE).toFixed(1);
                      
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.farmer_name || 'Unknown Farmer'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                            {item.product_name || item.commodity || item.crop_type || item.name || 'Unknown Item'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {crates} crates ({kg} kg)
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                              Stored
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

          {/* Farmer Removal Actions */}
          {farmerActions.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mt-8">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Farmer Product Removals</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Farmer Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity Removed</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Removal Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {farmerActions.map((item, idx) => {
                      const crates = item.quantity_crates ? item.quantity_crates.toFixed(1) : (item.quantity_kg / KG_PER_CRATE).toFixed(1);
                      const kg = item.quantity_kg ?? 0;
                      
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.farmer_name || 'Unknown Farmer'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                            {item.product_name || 'Unknown Product'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {crates} crates ({kg.toFixed(1)} kg)
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {item.action_date ? new Date(item.action_date).toLocaleDateString() : 'Date unavailable'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OwnerInventory;
