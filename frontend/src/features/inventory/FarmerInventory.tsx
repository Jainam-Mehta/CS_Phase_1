import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { Package, PackageOpen, Plus, X, Loader2, AlertTriangle } from 'lucide-react';
import { convertCratesToKg, convertKgToCrates } from '../../utils/units';

const FarmerInventory: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, setActiveRoomId } = useFarmerStore();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [roomNameMap, setRoomNameMap] = useState<Record<string, string>>({});
  
  // Site and Room selection
  const [approvedSites, setApprovedSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  
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

  const fetchInventory = async (pId: string) => {
       try {
           // Query batch_room_allocations -> batches -> products for all approved rooms
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
                 products(name)
               )
             `)
             .eq('batches.farmer_id', pId)
             .is('removed_at', null)
             .order('assigned_at', { ascending: false });

           // Transform the data to match expected structure
           const transformedBatches = allocationData?.map((allocation: any) => {
             const batchObj = Array.isArray(allocation.batches) ? allocation.batches[0] : allocation.batches;
             const productObj = Array.isArray(batchObj?.products) ? batchObj.products[0] : batchObj?.products;
             return {
               ...batchObj,
               room_id: allocation.room_id,
               quantity_kg: allocation.quantity_kg,
               assigned_at: allocation.assigned_at,
               product: productObj?.name || 'Unknown Product'
             };
           }) || [];

           setBatches(transformedBatches);
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

           // 1. Fetch Approved Rooms from farmer_room_access -> cold_storage_rooms with sites
           const { data: accessLogs } = await supabase
             .from('farmer_room_access')
             .select(`room_id, cold_storage_rooms(room_name, site_id, sites(facility_name))`)
             .eq('farmer_id', profile.id)
             .eq('status', 'Approved');

           // Group rooms by site and build site list
           const siteMap = new Map<string, any>();
           const globalRoomMap: Record<string, string> = {};
           
           if (accessLogs) {
              accessLogs.forEach((log: any) => {
                 const roomData = log.cold_storage_rooms;
                 const siteId = roomData?.site_id;
                 const siteName = roomData?.sites ? (Array.isArray(roomData.sites) ? roomData.sites[0]?.facility_name : roomData.sites?.facility_name) : 'Site';
                 const roomName = roomData?.room_name || 'Room';
                 
                 // Build site map
                 if (siteId && !siteMap.has(siteId)) {
                    siteMap.set(siteId, {
                      id: siteId,
                      name: siteName,
                      rooms: []
                    });
                 }
                 
                 // Add room to site
                 const site = siteMap.get(siteId);
                 if (site) {
                    site.rooms.push({
                      id: log.room_id,
                      name: roomName
                    });
                 }
                 
                 // Global room map for display
                 globalRoomMap[log.room_id] = `${roomName} - ${siteName}`;
              });
              
              const sites = Array.from(siteMap.values());
              setApprovedSites(sites);
              if (sites.length > 0) {
                 setSelectedSiteId(sites[0].id);
              }
              setRoomNameMap(globalRoomMap);
              
              // Initialize approved rooms from first site
              if (sites.length > 0) {
                 setApprovedRooms(sites[0].rooms);
              }
           }

           // 2. Fetch Farmer Selected Products
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
           
           setFarmerProducts(extractedNames.length > 0 ? Array.from(new Set(extractedNames)) : ['Apple', 'Potato', 'Onion']);

           // Fetch all inventory across all rooms
           await fetchInventory(profile.id);
       } catch (err) {
           console.error("Failed initialization:", err);
       } finally {
           setLoading(false);
       }
  };

  useEffect(() => {
    initialize();
  }, [user?.id]);

  useEffect(() => {
     if (activeRoomId) setTargetRoom(activeRoomId);
  }, [activeRoomId]);

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    const site = approvedSites.find(s => s.id === siteId);
    if (site) {
      setApprovedRooms(site.rooms);
      // Auto-select first room (whether single or multiple)
      setTargetRoom(site.rooms.length > 0 ? site.rooms[0].id : '');
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');

      if (!targetRoom || !targetProduct || !qty || !harvestDate) {
          setSubmitError('Please complete all required fields.');
          return;
      }

      setSubmitting(true);
      try {
         console.log('🔍 DEBUG: Adding inventory', { profileId, targetRoom, targetProduct, qty, harvestDate });
         
         // Convert crates to kg using centralized helper
         const quantityInKg = convertCratesToKg(parseFloat(qty));
         console.log('🔍 DEBUG: Converted to KG:', quantityInKg);
         
         // Get product_id from product name
         const { data: productData } = await supabase
           .from('products')
           .select('id, shelf_life_days')
           .eq('name', targetProduct)
           .single();

         if (!productData) {
             throw new Error('Product not found. Please select a valid product.');
         }

         console.log('🔍 DEBUG: Product found:', productData);

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
             initial_quantity_kg: quantityInKg,
             remaining_quantity_kg: quantityInKg,
             quality_grade: 'A', // Default grade
             remarks: null,
         };

         console.log('🔍 DEBUG: Batch payload:', batchPayload);

         const { data: batchData, error: batchError } = await supabase
           .from('batches')
           .insert([batchPayload])
           .select()
           .single();

         if (batchError) {
             console.error('❌ ERROR: Batch insert failed:', batchError);
             throw batchError;
         }

         console.log('✅ DEBUG: Batch created successfully:', batchData);

         // Step 2: Insert into batch_room_allocations
         const allocationPayload = {
             batch_id: batchData.id,
             room_id: targetRoom,
             quantity_kg: quantityInKg,
             assigned_at: new Date().toISOString(),
             removed_at: null,
         };

         console.log('🔍 DEBUG: Allocation payload:', allocationPayload);

         const { error: allocationError } = await supabase
           .from('batch_room_allocations')
           .insert([allocationPayload]);

         if (allocationError) {
             console.error('❌ ERROR: Allocation insert failed:', allocationError);
             throw allocationError;
         }

         console.log('✅ DEBUG: Allocation created successfully');
         
         setIsModalOpen(false);
         setTargetProduct('');
         setQty('');
         
         // Refresh inventory list
         if (profileId) {
             await initialize();
         }

      } catch (err: any) {
          console.error('❌ Inventory creation error:', err);
          setSubmitError(err.message || 'Failed to add inventory.');
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
             </div>
         </div>
         <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 shadow-xl shadow-primary-500/20 transform hover:-translate-y-0.5 transition-all">
             <Plus className="w-5 h-5"/> Add Inventory
         </button>
      </div>
      
      {/* LIVE INVENTORY TRACKING TABLE */}
      <Card className="shadow-sm border-slate-200 overflow-hidden">
         <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
               <Package className="w-5 h-5 text-indigo-500" />
               <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Live Inventory Tracking</h2>
            </div>
         </div>
         <CardContent className="p-0">
            {batches.length > 0 ? (
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="py-4 px-6">Product</th>
                            <th className="py-4 px-6">Batch Code</th>
                            <th className="py-4 px-6 text-right">Quantity</th>
                            <th className="py-4 px-6">Facility</th>
                            {/* <th className="py-4 px-6">Quality</th> */}
                            <th className="py-4 px-6">Stored Date</th>
                            <th className="py-4 px-6">Expiry Date</th>
                         </tr>
                      </thead>
                      <tbody>
                         {batches.map((b, idx) => {
                            // Convert kg to crates (1 crate = 25kg)
                            const crates = convertKgToCrates(b.initial_quantity_kg);
                            const storedDate = new Date(b.harvest_date || b.assigned_at || b.created_at);
                            const expiryDate = new Date(b.expiry_date);
                            
                            return (
                               <tr key={b.id || idx} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-slate-700 dark:text-slate-300 font-medium text-sm">
                                  <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{b.product || 'Unknown Product'}</td>
                                  <td className="py-4 px-6 tracking-wider font-mono text-xs">{b.batch_code || 'N/A'}</td>
                                  <td className="py-4 px-6 font-bold text-indigo-600 dark:text-indigo-400 text-right">
                                     {crates} <span className="text-xs font-normal text-slate-400">Crates</span>
                                  </td>
                                  <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{roomNameMap[b.room_id] || 'Storage Facility'}</td>
                                  {/* Quality column - Hidden for future use
                                  <td className="py-4 px-6">
                                      <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold rounded text-[10px] uppercase tracking-widest">
                                         {b.quality_grade || 'A'}
                                      </span>
                                  </td>
                                  */}
                                  <td className="py-4 px-6">{storedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric'})}</td>
                                  <td className="py-4 px-6">{expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric'})}</td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>
            ) : (
                <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center gap-2">
                   <Package className="w-10 h-10 text-slate-200" />
                   <p>No inventory found. Click "Add Inventory" to get started.</p>
                </div>
            )}
         </CardContent>
      </Card>

      {/* ADD INVENTORY MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)}></div>
              <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Product</h2>
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
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Site</label>
                              <select 
                                  required 
                                  value={selectedSiteId} 
                                  onChange={(e) => handleSiteChange(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                              >
                                  <option value="" disabled>Select a site...</option>
                                  {approvedSites.map(s => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                              </select>
                          </div>

                          {/* Show room selector only if site has multiple rooms */}
                          {approvedRooms.length > 1 && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Room</label>
                                <select 
                                    required 
                                    value={targetRoom} 
                                    onChange={(e) => setTargetRoom(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="" disabled>Select a room...</option>
                                    {approvedRooms.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                          )}

                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Product Type</label>
                              <select 
                                  required 
                                  value={targetProduct} 
                                  onChange={(e) => setTargetProduct(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                              >
                                  <option value="" disabled>Select a product...</option>
                                  {farmerProducts.map(p => (
                                      <option key={p} value={p}>{p}</option>
                                  ))}
                              </select>
                          </div>

                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Quantity (Crates)</label>
                              <input 
                                  type="number" 
                                  min="1" 
                                  required 
                                  value={qty} 
                                  onChange={(e) => setQty(e.target.value)} 
                                  placeholder="Enter number of crates" 
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                              />
                              <p className="text-xs text-slate-500 mt-1.5 font-medium">1 Crate = 25 kg</p>
                          </div>
                          
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Storage Date</label>
                              <input 
                                  type="date" 
                                  required 
                                  value={harvestDate} 
                                  onChange={(e) => setHarvestDate(e.target.value)}
                                  max={new Date().toISOString().split('T')[0]}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                              />
                              <p className="text-xs text-slate-500 mt-1.5 font-medium">Defaults to today. You can change if adding later.</p>
                          </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                          <button type="button" disabled={submitting} onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                          <button type="submit" disabled={submitting} className="px-5 py-2.5 font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20 flex items-center justify-center min-w-[120px] rounded-lg">
                              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Product'}
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

