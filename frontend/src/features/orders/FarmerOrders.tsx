import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { ShoppingCart, LayoutDashboard, Truck, CheckCircle2, XCircle, Clock, Plus, Package, Box, Search, Upload, X } from 'lucide-react';
import { useFarmerStore } from '../../stores/useFarmerStore';

const FarmerOrders: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId } = useFarmerStore();
  const [profileId, setProfileId] = useState<string | null>(null);
  
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Sold');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchHistory = async (pId: string) => {
       try {
           // NEW SCHEMA: Query batch_room_allocations -> batches -> cold_storage_rooms
           let query = supabase
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
                 products(name)
               ),
               cold_storage_rooms(room_name)
             `)
             .eq('batches.farmer_id', pId)
             .is('removed_at', null)
             .order('assigned_at', { ascending: false });
           
           if (activeRoomId) query = query.eq('room_id', activeRoomId);

           const { data: allocationData } = await query;
           
           // Transform to match expected structure
           const transformedBatches = allocationData?.map((allocation: any) => {
             const roomData = Array.isArray(allocation.cold_storage_rooms) ? allocation.cold_storage_rooms[0] : allocation.cold_storage_rooms;
             const productsData = Array.isArray(allocation.batches.products) ? allocation.batches.products[0] : allocation.batches.products;
             return {
               ...allocation.batches,
               room_id: allocation.room_id,
               room_name: roomData?.room_name || 'Unknown Room',
               quantity_kg: allocation.quantity_kg,
               assigned_at: allocation.assigned_at,
               product_name: productsData?.name || 'Unknown Product',
               status: 'Stored' // Default status for stored batches
             };
           }) || [];
           
           setBatches(transformedBatches);
       } catch (error) {
           console.error("FarmerOrders history error:", error);
       }
  };

  useEffect(() => {
     if (!user?.id) return;
     const load = async () => {
         setLoading(true);
         const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
         if (!profile) return;
         setProfileId(profile.id);
         await fetchHistory(profile.id);
         setLoading(false);
     };
     load();
  }, [user?.id, activeRoomId]);

  const handleUpdateOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedBatchId || !selectedStatus) return;
      setSubmitting(true);
      try {
          // NEW SCHEMA: Status is not in batches table anymore
          // For now, we'll skip status updates as it would require a separate order tracking system
          // This functionality would need to be implemented with a proper orders table
          console.log('Status update functionality requires orders table implementation');
          
          setIsModalOpen(false);
          setOrderRemarks('');
          setSelectedBatchId('');
          if (profileId) await fetchHistory(profileId);
      } catch (err) {
          console.error("Failed to update status", err);
      } finally {
          setSubmitting(false);
      }
  };

  const getStatusIcon = (status: string) => {
      if (status === 'Sold') return <CheckCircle2 className="w-3.5 h-3.5" />;
      if (status === 'Removed' || status === 'Cancelled') return <XCircle className="w-3.5 h-3.5" />;
      return <Clock className="w-3.5 h-3.5" />;
  };

  const getStatusColor = (status: string) => {
      if (status === 'Sold') return 'bg-emerald-100 text-emerald-700';
      if (status === 'Removed' || status === 'Cancelled') return 'bg-red-100 text-red-700';
      return 'bg-blue-100 text-blue-700';
  };

  if (loading) {
      return <div className="p-8"><div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></div>;
  }

  // Active batches to populate modal
  const activeBatches = batches.filter(b => !b.removed_at);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
           <div className="flex items-center gap-3">
             <ShoppingCart className="w-8 h-8 text-indigo-500" />
             <div>
               <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Inventory History</h1>
               <p className="text-slate-500 dark:text-slate-400 mt-1">Manual order tracking and archival systems mapping real database limits.</p>
             </div>
           </div>
           
           <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transform hover:-translate-y-0.5 transition-all">
               <Plus className="w-5 h-5"/> New Order Event
           </button>
      </div>

      {batches.length === 0 ? (
           <Card className="border border-slate-200 dark:border-slate-800 bg-transparent shadow-none text-center p-16">
             <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-400">History Empty</h3>
             <p className="text-slate-500 text-sm mt-2">No logistical history found. Orders will appear identically when generating explicit tracking.</p>
          </Card>
      ) : (
          <Card className="border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center justify-between">
                 <span>Recent Master Audit</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-sm focus:outline-none">
                          <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider">Product</th>
                          <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider">Facility Room</th>
                          <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider">Date Tracked</th>
                          <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody>
                       {batches.map((b) => (
                           <tr key={b.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                               <td className="px-6 py-4 font-bold text-slate-900 dark:text-white capitalize truncate max-w-[150px]">{b.product}</td>
                               <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{b.cold_storage_rooms?.room_name || 'Room Isolated'}</td>
                               <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{b.initial_quantity_kg} <span className="text-xs text-slate-400">kg</span></td>
                               <td className="px-6 py-4 text-slate-500">{new Date(b.created_at).toLocaleDateString()}</td>
                               <td className="px-6 py-4 text-right">
                                   <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(b.status || 'Stored')}`}>
                                       {getStatusIcon(b.status || 'Stored')}
                                       {b.status || 'Stored'}
                                   </span>
                               </td>
                           </tr>
                       ))}
                   </tbody>
                </table>
             </div>
          </Card>
      )}

      {/* UPDATE STATUS MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)}></div>
              
              <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Modify Batch Status</h2>
                      <button onClick={() => setIsModalOpen(false)} disabled={submitting} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleUpdateOrder} className="p-6">
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Active Inventory Batch</label>
                              <select 
                                  required 
                                  value={selectedBatchId} 
                                  onChange={(e) => setSelectedBatchId(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              >
                                  <option value="" disabled>Choose stored inventory...</option>
                                  {activeBatches.map(b => (
                                      <option key={b.id} value={b.id}>{b.product} - {b.initial_quantity_kg}kg ({new Date(b.created_at).toLocaleDateString()})</option>
                                  ))}
                              </select>
                              {activeBatches.length === 0 && <p className="text-sm text-red-500 mt-2 font-medium">No active inventory found. Please add inventory first.</p>}
                          </div>
                      
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Target Destination Status</label>
                              <select 
                                  required 
                                  value={selectedStatus} 
                                  onChange={(e) => setSelectedStatus(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              >
                                  <option value="Sold">Sold / Shipped</option>
                                  <option value="Removed">Removed (Wasted/Defect)</option>
                                  <option value="Cancelled">Cancelled Booking</option>
                              </select>
                          </div>
                          
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Closing Remarks (Optional)</label>
                              <textarea 
                                  value={orderRemarks}
                                  onChange={(e) => setOrderRemarks(e.target.value)}
                                  placeholder="E.g: Transported via fast-cargo efficiently..."
                                  rows={2}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-900 dark:text-white"
                              />
                          </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                          <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} className="px-5 py-2.5 rounded-lg text-slate-600 bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
                          <button type="submit" disabled={submitting || activeBatches.length===0} className="px-5 py-2.5 rounded-lg text-white bg-indigo-600 font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center">
                              {submitting ? 'Updating...' : 'Commit Change'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default FarmerOrders;
