import React, { useEffect, useState } from 'react';
import { Route, Search, Box, Milestone, History, Layers, ClipboardList } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { supabase } from '../../lib/supabase';
import { RoomRequestStatus } from '../../constants/roomRequestStatus';

const OwnerBatchHistory: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedFacilityId } = useSiteStore();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadBatchHistory();
    }
  }, [user?.id]);

  const loadBatchHistory = async () => {
    try {
      setLoading(true);
      
      // Get ALL facilities for this owner, not just the selected one
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Get owner's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (!profile) return;

      // Get all sites for this owner
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, facility_name')
        .eq('owner_profile_id', profile.id);

      if (!sitesData || sitesData.length === 0) {
        setInventory([]);
        return;
      }

      const siteIds = sitesData.map(s => s.id);

      // Get all rooms for all sites
      const { data: rmData } = await supabase
        .from('cold_storage_rooms')
        .select('id, site_id, room_name')
        .in('site_id', siteIds);

      const resolvedRooms = rmData || [];
      
      if (resolvedRooms.length > 0) {
        const roomIds = resolvedRooms.map((r) => r.id);
        
        // Find farmers that have access to these rooms
        const { data: accessData } = await supabase
          .from('farmer_room_access')
          .select('farmer_id')
          .in('room_id', roomIds)
          .eq('status', RoomRequestStatus.Approved);

        if (!accessData || accessData.length === 0) {
          setInventory([]);
          return;
        }
        
        const farmerIds = accessData.map(a => a.farmer_id);

        // Query batch_room_allocations -> batches -> products -> profiles
        const { data: allocationData } = await supabase
          .from('batch_room_allocations')
          .select(`
            quantity_kg,
            assigned_at,
            removed_at,
            room_id,
            cold_storage_rooms(room_name, site_id),
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
          .in('batches.farmer_id', farmerIds)
          .is('removed_at', null)
          .order('assigned_at', { ascending: false });
          
        // Transform to match expected structure and add site name
        const transformedInventory = allocationData?.map(allocation => {
          const roomData = allocation.cold_storage_rooms;
          const room = Array.isArray(roomData) ? roomData[0] : roomData;
          const siteId = room?.site_id;
          const site = sitesData.find(s => s.id === siteId);
          
          return {
            ...allocation.batches,
            room_id: allocation.room_id,
            quantity_kg: allocation.quantity_kg,
            assigned_at: allocation.assigned_at,
            room_name: room?.room_name,
            facility_name: site?.facility_name || 'Unknown Site',
            product_name: (() => {
              const products = (allocation.batches as any)?.products;
              if (Array.isArray(products)) {
                return products[0]?.name || 'Unknown Product';
              }
              return products?.name || 'Unknown Product';
            })()
          };
        }) || [];

        setInventory(transformedInventory);
      } else {
        setInventory([]);
      }
    } catch (error) {
      console.error('Error loading batch history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove facility selection guard - show all facilities

  const activeBatches = inventory.length;
  const uniqueFarmers = new Set(inventory.filter((i) => i.farmer_id).map((i) => i.farmer_id)).size;
  const totalQuantity = inventory.reduce((acc, curr) => acc + (Number(curr.initial_quantity_kg) || Number(curr.remaining_quantity_kg) || 0), 0);

  const filteredInventory = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    const batchId = item.id.substring(0, 8);
    const prodName = (item.products?.name || item.product_name || item.commodity || item.crop_type || item.name || '').toLowerCase();
    const farmerName = ((item.profiles?.first_name || '') + ' ' + (item.profiles?.last_name || '') || 'Unknown Farmer').toLowerCase();
    return batchId.includes(q) || prodName.includes(q) || farmerName.includes(q);
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Batch Traceability
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Track all batches across all your facilities.
          </p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search by ID, product, or farmer..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
            className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none w-72 dark:text-white"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Recorded Batches</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{activeBatches}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
            <Layers className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Quantity Processed</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalQuantity} <span className="text-lg text-slate-500 font-medium">units</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
            <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Unique Farmers</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{uniqueFarmers}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Batch History Log</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center h-80">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
              <Box className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No batches recorded</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              When farmers or staff members add products to rooms, the historical tracking records will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Batch ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Farmer</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Facility</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                      #{item.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {item.product_name || item.commodity || item.crop_type || item.name || 'Unknown Item'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {/* profiles join returns first_name + last_name, no full_name column */}
                      {item.profiles
                        ? `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim() || 'Unknown Farmer'
                        : 'Unknown Farmer'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {item.facility_name || 'Unknown Facility'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white text-right">
                      {item.quantity_kg ?? item.remaining_quantity_kg ?? 0} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerBatchHistory;
