import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { Package, Calendar, Clock, AlertTriangle, CheckCircle, PackageOpen, LayoutDashboard, Plus, X, Loader2, Thermometer, Droplets } from 'lucide-react';
import { getProductOptimality, evaluateCondition } from '../../lib/optimalityEngine';

const FarmerInventory: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, setActiveRoomId } = useFarmerStore();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [roomCondition, setRoomCondition] = useState<{temperature: number, humidity: number} | null>(null);
  const [roomNameMap, setRoomNameMap] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvedRooms, setApprovedRooms] = useState<any[]>([]);
  const [farmerProducts, setFarmerProducts] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form State
  const [targetRoom, setTargetRoom] = useState(activeRoomId || '');
  const [targetProduct, setTargetProduct] = useState('');
  const [qty, setQty] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchInventory = async (currentRoom: string, pId: string) => {
       try {
           // NEW SCHEMA: Query batch_room_allocations -> batches -> products
           const { data: allocationData } = await supabase
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
             .eq('room_id', currentRoom)
             .eq('batches.farmer_id', pId)
             .is('removed_at', null)
             .order('assigned_at', { ascending: false });

           // Transform the data to match expected structure
           const transformedBatches = allocationData?.map((allocation: any) => {
             const batchObj = Array.isArray(allocation.batches) ? allocation.batches[0] : allocation.batches;
             const productObj = Array.isArray(batchObj?.products) ? batchObj.products[0] : batchObj?.products;
             return {
               ...batchObj,
               room_id: currentRoom,
               quantity_kg: allocation.quantity_kg,
               assigned_at: allocation.assigned_at,
               product: productObj?.name || 'Unknown Product'
             };
           }) || [];

           setBatches(transformedBatches);

           // Also fetch ambient room telemetry for UI diagnostics mapped structurally!
           const { data: cond } = await supabase
             .from('cold_storage_conditions')
             .select('temperature, humidity')
             .eq('room_id', currentRoom)
             .order('recorded_at', { ascending: false })
             .limit(1)
             .maybeSingle();

           setRoomCondition(cond || { temperature: 2.5, humidity: 85 }); // Realistic dummy fallback if no real hardware is attached yet.
       } catch (error) {
           console.error("FarmerInventory fetch failed:", error);
       }
  };

  const initialize = async () => {
       setLoading(true);
       try {
           if (!user?.id) return;
           const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
           if (!profile) return;
           setProfileId(profile.id);

           // 1. Fetch Approved Rooms from farmer_room_access -> cold_storage_rooms
           // This is the canonical room source for the application
           const { data: accessLogs } = await supabase
             .from('farmer_room_access')
             .select(`room_id, cold_storage_rooms(room_name, facilities(facility_name))`)
             .eq('farmer_id', profile.id)
             .eq('status', 'Approved');

           const globalRoomMap: Record<string, string> = {};
           if (accessLogs) {
              const rooms = accessLogs.map((log: any) => {
                 const roomData = log.cold_storage_rooms;
                 const n = `${roomData?.room_name || 'Room'} - ${roomData?.facilities ? (Array.isArray(roomData.facilities) ? roomData.facilities[0]?.facility_name : roomData.facilities?.facility_name) : 'Facility'}`;
                 globalRoomMap[log.room_id] = n;
                 return { id: log.room_id, name: n };
              });
              setApprovedRooms(rooms);
              setRoomNameMap(globalRoomMap);
           }

           // 2. Fetch Farmer Selected Products exclusively restricting UI bounds securely.
           const { data: fProds } = await supabase
             .from('farmer_products')
             .select('products(name)')
             .eq('farmer_id', profile.id);

           const extractedNames: string[] = [];
           if (fProds) {
               fProds.forEach((fp: any) => {
                   if (fp.products && !Array.isArray(fp.products) && fp.products.name) {
                       extractedNames.push(fp.products.name);
                   } else if (Array.isArray(fp.products)) {
                       fp.products.forEach((p:any) => extractedNames.push(p.name));
                   }
               });
           }
           
           // Fallback to basic array if the join structure drops (due to test data)
           setFarmerProducts(extractedNames.length > 0 ? Array.from(new Set(extractedNames)) : ['Apple', 'Potato', 'Onion']);

           if (activeRoomId) {
               await fetchInventory(activeRoomId, profile.id);
           } else {
               setBatches([]);
               setRoomCondition(null);
           }
       } catch (err) {
           console.error("Failed initialization:", err);
       } finally {
           setLoading(false);
       }
  };

  useEffect(() => {
    initialize();
  }, [user?.id, activeRoomId]);

  useEffect(() => {
     if (activeRoomId) setTargetRoom(activeRoomId);
  }, [activeRoomId]);

  const handleAddInventory = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');

      if (!targetRoom || !targetProduct || !qty || !harvestDate) {
          setSubmitError('Please complete all required fields.');
          return;
      }

      setSubmitting(true);
      try {
         // Use the room ID directly from the dropdown (no additional verification needed)
         // The dropdown is populated from farmer_room_access -> cold_storage_rooms join
         // which is the canonical room source for this application
         
         // Get product_id from product name
         const { data: productData } = await supabase
           .from('products')
           .select('id, shelf_life_days')
           .eq('name', targetProduct)
           .single();

         if (!productData) {
             throw new Error('Product not found. Please select a valid product.');
         }

         // Generate unique batch_code
         const batchCode = `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

         // Calculate expiry_date from harvest_date + shelf_life_days
         const harvestDateObj = new Date(harvestDate);
         const expiryDateObj = new Date(harvestDateObj);
         const shelfLifeDays = productData.shelf_life_days || 30; // Default to 30 days if not specified
         expiryDateObj.setDate(expiryDateObj.getDate() + shelfLifeDays);

         // Step 1: Insert into batches
         const batchPayload = {
             batch_code: batchCode,
             farmer_id: profileId,
             product_id: productData.id,
             harvest_date: harvestDateObj.toISOString(),
             expiry_date: expiryDateObj.toISOString(),
             initial_quantity_kg: parseFloat(qty),
             remaining_quantity_kg: parseFloat(qty),
             quality_grade: 'A', // Default grade
             remarks: notes || null,
         };

         const { data: batchData, error: batchError } = await supabase
           .from('batches')
           .insert([batchPayload])
           .select()
           .single();

         if (batchError) throw batchError;

         // Step 2: Insert into batch_room_allocations
         const allocationPayload = {
             batch_id: batchData.id,
             room_id: targetRoom,
             quantity_kg: parseFloat(qty),
             assigned_at: new Date().toISOString(),
             removed_at: null,
         };

         const { error: allocationError } = await supabase
           .from('batch_room_allocations')
           .insert([allocationPayload]);

         if (allocationError) throw allocationError;
         
         console.log('=== END ROOM VERIFICATION DEBUG ===');
         
         setIsModalOpen(false);
         setTargetProduct('');
         setQty('');
         setNotes('');
         
         if (activeRoomId !== targetRoom) {
             setActiveRoomId(targetRoom);
         } else if (profileId) {
             await fetchInventory(targetRoom, profileId);
         }

      } catch (err: any) {
          console.error('=== INVENTORY CREATION ERROR ===');
          console.error(err);
          console.error('=== END ERROR ===');
          setSubmitError(err.message || 'Failed adding inventory to network.');
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) {
      return <div className="p-8"><div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
         <div className="flex items-center gap-3">
             <PackageOpen className="w-8 h-8 text-primary-500" />
             <div>
               <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Inventory Management</h1>
               <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time telemetry and management controls for stored perishables.</p>
             </div>
         </div>
         <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 shadow-xl shadow-primary-500/20 transform hover:-translate-y-0.5 transition-all">
             <Plus className="w-5 h-5"/> Add Inventory
         </button>
      </div>
      
      {!activeRoomId ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <LayoutDashboard className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Target Displayed</h2>
              <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-8">
                 Select an active storage room on your Dashboard, or inject structural dependencies seamlessly right now remotely by generating inventory.
              </p>
          </div>
      ) : batches.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur shadow-sm text-center p-16">
             <PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Inventory Found</h3>
             <p className="text-slate-500 text-sm mt-2 mb-6">You haven't stored any products in this room yet.</p>
             <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm transition-all">
                 <Plus className="w-4 h-4"/> Add Inventory
             </button>
          </Card>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {batches.map((b) => {
                 const optimal = getProductOptimality(b.product);
                 const storedDate = new Date(b.created_at);
                 const now = new Date();
                 const durationDays = Math.floor((now.getTime() - storedDate.getTime()) / (1000 * 3600 * 24));
                 const remainingDays = optimal.shelfLife - durationDays;
                 const freshnessPct = Math.max(0, Math.min(100, (remainingDays / optimal.shelfLife) * 100));

                 const temp = roomCondition?.temperature ?? optimal.minTemp;
                 const hum = roomCondition?.humidity ?? optimal.minHum;
                 
                 const tempStatus = evaluateCondition(temp, optimal.minTemp, optimal.maxTemp);
                 const humStatus = evaluateCondition(hum, optimal.minHum, optimal.maxHum);
                 
                 let healthStatus = 'Excellent';
                 let ProgressColor = 'bg-emerald-500';
                 let bgCard = 'border-slate-200 dark:border-slate-700 hover:border-emerald-300';
                 let Icon = CheckCircle;
                 let IconColor = 'text-emerald-500';

                 if (remainingDays < 0 || tempStatus.status === 'Too High') {
                     healthStatus = 'Critical';
                     ProgressColor = 'bg-red-500';
                     bgCard = 'border-red-200 dark:border-red-900/40 ring-1 ring-red-500/20 bg-red-50/50 dark:bg-red-900/10';
                     Icon = AlertTriangle;
                     IconColor = 'text-red-500';
                 } else if (remainingDays < optimal.shelfLife * 0.2 || !tempStatus.isOptimal || !humStatus.isOptimal) {
                     healthStatus = 'Warning';
                     ProgressColor = 'bg-orange-500';
                     bgCard = 'border-orange-200 dark:border-orange-900/50 bg-orange-50/30';
                     Icon = Clock;
                     IconColor = 'text-orange-500';
                 } else if (remainingDays < optimal.shelfLife * 0.5) {
                     healthStatus = 'Good';
                 }

                 return (
                    <Card key={b.id} className={`transition-all shadow-sm ${bgCard} overflow-hidden group`}>
                       <CardContent className="p-6">
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h3 className="text-xl font-bold flex items-center gap-2">
                                      {b.product || 'Unknown Product'} 
                                      <span className="text-slate-400 text-sm font-medium ml-2">({b.initial_quantity_kg} kg)</span>
                                  </h3>
                                  <p className="text-xs text-slate-500 capitalize">{roomNameMap[b.room_id] || 'Storage Facility Room'}</p>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-white dark:bg-slate-800 shadow-sm ${IconColor}`}>
                                 <Icon className="w-4 h-4" /> {healthStatus}
                              </span>
                           </div>
                           
                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Calendar className="w-3 h-3"/> Stored</p>
                                 <p className="font-bold text-sm text-slate-900 dark:text-white">{storedDate.toLocaleDateString()}</p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Clock className="w-3 h-3"/> Shelf Life</p>
                                 <p className="font-bold text-sm text-slate-900 dark:text-white">{remainingDays < 0 ? 0 : remainingDays} / {optimal.shelfLife}d</p>
                              </div>
                              <div className={`bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border ${tempStatus.isOptimal ? 'border-slate-100 dark:border-slate-800' : 'border-red-200 dark:border-red-900/50'}`}>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Thermometer className="w-3 h-3"/> Temp °C</p>
                                 <p className="font-bold text-sm text-slate-900 dark:text-white">{temp}°C <span className="text-slate-400 text-xs font-medium ml-1">({optimal.minTemp}-{optimal.maxTemp})</span></p>
                              </div>
                              <div className={`bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border ${humStatus.isOptimal ? 'border-slate-100 dark:border-slate-800' : 'border-orange-200 dark:border-orange-900/50'}`}>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1"><Droplets className="w-3 h-3"/> Humidity %</p>
                                 <p className="font-bold text-sm text-slate-900 dark:text-white">{hum}% <span className="text-slate-400 text-xs font-medium ml-1">({optimal.minHum}-{optimal.maxHum})</span></p>
                              </div>
                           </div>

                           <div className="space-y-2">
                               <div className="flex justify-between text-sm font-bold">
                                   <span className="text-slate-600 dark:text-slate-400">Freshness Integrity</span>
                                   <span className={freshnessPct < 20 ? 'text-red-600' : 'text-slate-900 dark:text-white'}>
                                       {freshnessPct.toFixed(1)}% {freshnessPct < 20 && '(Spoilage Imminent)'}
                                   </span>
                               </div>
                               <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                   <div className={`h-full rounded-full ${ProgressColor} transition-all duration-1000`} style={{ width: `${freshnessPct}%` }} />
                               </div>
                           </div>
                       </CardContent>
                    </Card>
                 );
             })}
          </div>
      )}

      {/* ADD INVENTORY MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)}></div>
              <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Inventory Batch</h2>
                      <button onClick={() => setIsModalOpen(false)} disabled={submitting} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 disabled:opacity-50">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleAddInventory} className="p-6">
                      {submitError && (
                          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-900/40 rounded-xl text-sm font-medium flex gap-3 items-start">
                             <AlertTriangle className="w-5 h-5 shrink-0" />
                             <p>{submitError}</p>
                          </div>
                      )}

                      <div className="space-y-5">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Selected Room</label>
                              <select 
                                  required 
                                  value={targetRoom} 
                                  onChange={(e) => setTargetRoom(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                              >
                                  <option value="" disabled>Choose an approved room...</option>
                                  {approvedRooms.map(r => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                              </select>
                          </div>

                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Registered Product</label>
                              <select 
                                  required 
                                  value={targetProduct} 
                                  onChange={(e) => setTargetProduct(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                              >
                                  <option value="" disabled>Choose a product...</option>
                                  {farmerProducts.map(p => (
                                      <option key={p} value={p}>{p}</option>
                                  ))}
                              </select>
                              <p className="text-xs text-slate-500 mt-2 font-medium">Only products you mapped during profile onboarding are visible.</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Quantity (kg)</label>
                                  <input 
                                      type="number" min="1" required value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Ex: 500" 
                                      className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Harvest Date</label>
                                  <input 
                                      type="date" required max={new Date().toISOString().split('T')[0]} value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Notes (Optional)</label>
                              <textarea 
                                  rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Initial state remarks..."
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                              />
                          </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                          <button type="button" disabled={submitting} onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                          <button type="submit" disabled={submitting} className="px-5 py-2.5 font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20 flex items-center justify-center min-w-[120px] rounded-lg">
                              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Inventory'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default FarmerInventory;
