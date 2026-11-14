import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { ShoppingCart, Truck, Plus, X, Loader2, Calendar, Package, IndianRupee, ChevronRight } from 'lucide-react';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { convertCratesToKg, convertKgToCrates } from '../../utils/units';
import { useState, useEffect } from 'react';

const FarmerOrders: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId } = useFarmerStore();
  const [profileId, setProfileId] = useState<string | null>(null);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Site & Room filters
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  
  // Sorting
  const [sortBy, setSortBy] = useState<'expiry' | 'price'>('expiry');
  
  // Two-step modal flow
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<'inventory' | 'summary'>('inventory');
  
  // Step 1: Inventory table with cart quantities
  const [cartItems, setCartItems] = useState<Array<{batchId: string; quantity: number}>>([]);
  const [tempQtyValues, setTempQtyValues] = useState<Record<string, number>>({});
  
  // Step 2: Order details
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [priceMode, setPriceMode] = useState<'market' | 'manual'>('market');
  const [manualPrice, setManualPrice] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const { marketPrices } = useFarmerStore();

  // Get unique products in cart
  const cartProducts = Array.from(new Set(
    cartItems.map(item => {
      const batch = batches.find(b => b.id === item.batchId);
      return batch?.product_name;
    }).filter(Boolean)
  ));

  // Calculate totals per product
  const totals = cartProducts.map(productName => {
    const productBatches = cartItems
      .map(item => {
        const batch = batches.find(b => b.id === item.batchId);
        return batch?.product_name === productName ? { batch, quantity: item.quantity } : null;
      })
      .filter(Boolean);
    
    const totalCrates = productBatches.reduce((sum, item) => sum + (item?.quantity || 0), 0);
    const totalKg = convertCratesToKg(totalCrates);
    const priceData = marketPrices[productName];
    const pricePerKg = priceMode === 'market' ? (priceData?.price || 0) : parseFloat(manualPrice || '0');
    const totalPrice = totalKg * pricePerKg;
    
    return {
      product: productName,
      totalCrates,
      totalKg,
      totalPrice,
      pricePerKg
    };
  });

  const grandTotal = totals.reduce((sum, t) => sum + t.totalPrice, 0);

  // Filtered and sorted batches
  const filteredBatches = selectedRoomId 
    ? batches.filter(b => b.room_id === selectedRoomId)
    : [];
  
  const sortedBatches = [...filteredBatches].sort((a, b) => {
    if (sortBy === 'expiry') {
      return a.expiry_days - b.expiry_days; // Earlier expiry first
    } else {
      const priceA = marketPrices[a.product_name]?.price || 0;
      const priceB = marketPrices[b.product_name]?.price || 0;
      return priceB - priceA; // Higher price first
    }
  });

  useEffect(() => {
     if (!user?.id) return;
     const load = async () => {
         setLoading(true);
         try {
             const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
             if (!profile) return;
             setProfileId(profile.id);
             
             // Fetch farmer's accessible rooms and their sites
             const { data: farmerAccessData, error: accessError } = await supabase
               .from('farmer_room_access')
               .select(`
                 room_id,
                 cold_storage_rooms(site_id, sites(id, facility_name))
               `)
               .eq('farmer_id', profile.id)
               .eq('status', 'Approved');
             
             if (accessError) {
               console.error('Error fetching farm access:', accessError);
             }
             
             // Extract unique sites from room access
             const uniqueSites = new Map<string, any>();
             if (farmerAccessData) {
               farmerAccessData.forEach((access: any) => {
                 const room = access.cold_storage_rooms;
                 const site = Array.isArray(room?.sites) ? room.sites[0] : room?.sites;
                 if (site && !uniqueSites.has(site.id)) {
                   uniqueSites.set(site.id, { id: site.id, name: site.facility_name });
                 }
               });
             }
             
             const sitesList = Array.from(uniqueSites.values());
             if (sitesList.length > 0) {
               setSites(sitesList);
               setSelectedSiteId(sitesList[0].id);
             }
             
             // Fetch all rooms for this farmer's accessible sites
             if (sitesList.length > 0) {
               const { data: roomsList, error: roomsError } = await supabase
                 .from('cold_storage_rooms')
                 .select('id, room_name, site_id')
                 .in('site_id', sitesList.map(s => s.id))
                 .order('room_name');
               
               if (roomsError) {
                 console.error('Error fetching rooms:', roomsError);
               }
               
               if (roomsList) {
                 setRooms(roomsList);
                 // Auto-select first room from first site
                 const firstRoom = roomsList.find(r => r.site_id === sitesList[0].id);
                 if (firstRoom) {
                   setSelectedRoomId(firstRoom.id);
                 }
               }
             }
             
             const { data: farmerBatches, error: batchError } = await supabase
               .from('batches')
               .select('id')
               .eq('farmer_id', profile.id);
             
             if (batchError) {
               console.error('Error fetching batches:', batchError);
               setLoading(false);
               return;
             }
             
             if (!farmerBatches || farmerBatches.length === 0) {
               setBatches([]);
               setLoading(false);
               return;
             }
             
             const batchIds = farmerBatches.map(b => b.id);
             
             const { data: allocations, error: allocError } = await supabase
               .from('batch_room_allocations')
               .select(`
                 id,
                 batch_id,
                 room_id,
                 quantity_kg,
                 batches(
                   id,
                   batch_code,
                   alphanumeric_code,
                   product_id,
                   remaining_quantity_kg,
                   initial_quantity_kg,
                   expiry_date,
                   created_at,
                   snapshot_price_per_kg
                 )
               `)
               .in('batch_id', batchIds)
               .is('removed_at', null);

             if (allocError) {
               console.error('Error fetching allocations:', allocError);
               setLoading(false);
               return;
             }

             const productIds = Array.from(new Set(
               allocations?.map((a: any) => {
                 const batch = Array.isArray(a.batches) ? a.batches[0] : a.batches;
                 return batch?.product_id;
               }).filter(Boolean)
             )) as string[];
             
             let productMap = new Map<string, any>();
             if (productIds.length > 0) {
               const { data: productsData } = await supabase
                 .from('products')
                 .select('id, name')
                 .in('id', productIds);
               
               if (productsData) {
                 productMap = new Map(productsData.map(p => [p.id, p.name]));
               }
             }

             const batchList: any[] = [];
             if (allocations && allocations.length > 0) {
               allocations.forEach((alloc: any) => {
                 const batch = Array.isArray(alloc.batches) ? alloc.batches[0] : alloc.batches;
                 const productName = productMap.get(batch?.product_id) || 'Unknown';
                 if (batch && batch.remaining_quantity_kg > 0 && !batchList.find(b => b.id === batch.id)) {
                   const expiryDate = new Date(batch.expiry_date);
                   const now = new Date();
                   const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                   const expiryDays = Math.max(0, daysUntilExpiry);
                   
                   batchList.push({
                     id: batch.id,
                     batch_code: batch.batch_code,
                     alphanumeric_code: batch.alphanumeric_code,
                     product_name: productName,
                     room_id: alloc.room_id,
                     remaining_quantity_kg: batch.remaining_quantity_kg,
                     remaining_crates: convertKgToCrates(batch.remaining_quantity_kg),
                     expiry_date: expiryDate,
                     expiry_days: expiryDays
                   });
                 }
               });
             }
             setBatches(batchList);
             
             const { data: sales, error: salesError } = await supabase
               .from('sales')
               .select(`
                 id,
                 batch_id,
                 quantity_kg,
                 selling_price,
                 buyer,
                 sold_at
               `)
               .in('batch_id', batchIds)
               .order('sold_at', { ascending: false });

             if (salesError) {
               console.error('Error fetching sales:', salesError);
               setOrders([]);
             } else {
               const ordersList: any[] = [];
               if (sales && batchList.length > 0) {
                 const batchMap = new Map(batchList.map(b => [b.id, b]));
                 
                 sales.forEach((sale: any) => {
                   const batch = batchMap.get(sale.batch_id);
                   if (batch) {
                     ordersList.push({
                       id: sale.id,
                       batch_code: batch.batch_code,
                       alphanumeric_code: batch.alphanumeric_code,
                       product_name: batch.product_name,
                       quantity_crates: convertKgToCrates(sale.quantity_kg),
                       buyer_name: sale.buyer,
                       dispatch_date: sale.sold_at,
                       total_amount: sale.quantity_kg * sale.selling_price
                     });
                   }
                 });
               }
               setOrders(ordersList);
             }
         } catch (err) {
           console.error('Error loading orders:', err);
         } finally {
           setLoading(false);
         }
     };
     load();
  }, [user?.id]);

  const handleAddToCart = (batchId: string, quantity: number) => {
    if (quantity <= 0) return;
    
    const batch = batches.find(b => b.id === batchId);
    if (!batch || quantity > batch.remaining_crates) {
      alert('Invalid quantity');
      return;
    }

    const existingItem = cartItems.find(item => item.batchId === batchId);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.batchId === batchId 
          ? { ...item, quantity: Math.min(quantity, batch.remaining_crates) }
          : item
      ));
    } else {
      setCartItems([...cartItems, { batchId, quantity }]);
    }
  };

  const handleRemoveFromCart = (batchId: string) => {
    setCartItems(cartItems.filter(item => item.batchId !== batchId));
  };

  const handleProceedToSummary = () => {
    console.log('🟢 handleProceedToSummary called, cartItems:', cartItems.length);
    if (cartItems.length === 0) {
      console.log('❌ Cart is empty, showing error');
      setSubmitError('Please add at least one item to cart');
      return;
    }
    console.log('✅ Proceeding to summary');
    setStep('summary');
    setSubmitError('');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
      console.log('🟡 handleCreateOrder called, e.type:', e.type);
      e.preventDefault();
      setSubmitError('');
      console.log('🟡 cartItems:', cartItems.length, 'dispatchDate:', dispatchDate, 'buyerName:', buyerName);
      
      if (cartItems.length === 0 || !dispatchDate || !buyerName) {
          console.log('❌ Missing required fields');
          setSubmitError('Please fill all required fields.');
          return;
      }
      
      if (priceMode === 'manual' && (!manualPrice || parseFloat(manualPrice) <= 0)) {
          setSubmitError('Please enter a valid manual price.');
          return;
      }
      
      setSubmitting(true);
      try {
          // Calculate price per kg
          let pricePerKg = 0;
          if (priceMode === 'market') {
              const firstProduct = cartProducts[0];
              const priceData = marketPrices[firstProduct];
              pricePerKg = priceData?.price || 0;
          } else {
              pricePerKg = parseFloat(manualPrice);
          }

          // Create sales records for each batch
          for (const item of cartItems) {
              const batch = batches.find(b => b.id === item.batchId);
              if (!batch) continue;

              const quantityKg = convertCratesToKg(item.quantity);

              const { error: saleError } = await supabase
                  .from('sales')
                  .insert([{
                      batch_id: item.batchId,
                      quantity_kg: quantityKg,
                      selling_price: pricePerKg,
                      buyer: buyerName,
                      sold_at: new Date().toISOString()
                  }]);

              if (saleError) throw saleError;

              const newRemaining = Math.max(0, batch.remaining_quantity_kg - quantityKg);
              await supabase
                  .from('batches')
                  .update({ remaining_quantity_kg: newRemaining })
                  .eq('id', item.batchId);
          }

          console.log('Order created successfully with', cartItems.length, 'batches');
          
          // Reset form
          setIsModalOpen(false);
          setStep('inventory');
          setCartItems([]);
          setManualPrice('');
          setBuyerName('');
          setOrderRemarks('');
          setDispatchDate(new Date().toISOString().split('T')[0]);
          setPriceMode('market');

          window.location.reload();
      } catch (err: any) {
          console.error("Failed to create order", err);
          setSubmitError(err.message || 'Failed to create order. Please try again.');
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) {
      return <div className="p-8"><div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
           <div className="flex items-center gap-3">
             <ShoppingCart className="w-8 h-8 text-indigo-500 shrink-0" />
             <div>
               <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Orders</h1>
               <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your product orders and dispatches</p>
             </div>
           </div>
           
           <button onClick={() => { console.log('🔵 CREATE ORDER BUTTON CLICKED'); setIsModalOpen(true); setStep('inventory'); setCartItems([]); }} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transform hover:-translate-y-0.5 transition-all">
               <Plus className="w-5 h-5"/> Create Order
           </button>
      </div>

      {orders.length === 0 ? (
           <Card className="border border-slate-200 dark:border-slate-800 bg-transparent shadow-none text-center p-16">
             <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-400">No Orders Yet</h3>
             <p className="text-slate-500 text-sm mt-2">Create your first order by clicking "Create Order" above.</p>
          </Card>
      ) : (
          <Card className="border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                 <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <Truck className="w-4 h-4" /> Order History
                 </h2>
             </div>
             <div className="block md:hidden p-4 space-y-3">
                 {orders.map((order, idx) => (
                   <div
                     key={idx}
                     className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3"
                   >
                     <div className="flex items-start justify-between gap-2">
                       <div>
                         <h3 className="font-bold text-slate-900 dark:text-white text-base">
                           {order.product_name}
                         </h3>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                           Buyer: <span className="font-medium text-slate-700 dark:text-slate-300">{order.buyer_name}</span>
                         </p>
                       </div>
                       <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 shrink-0">
                         {order.alphanumeric_code || order.batch_code}
                       </span>
                     </div>

                     <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                       <div>
                         <span className="text-xs text-slate-400 block font-medium">Quantity</span>
                         <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                           {order.quantity_crates} Crates
                         </span>
                       </div>
                       <div className="text-right">
                         <span className="text-xs text-slate-400 block font-medium">Total Amount</span>
                         <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                           ₹{order.total_amount.toLocaleString('en-IN')}
                         </span>
                       </div>
                     </div>

                     <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                       Dispatched: {new Date(order.dispatch_date).toLocaleDateString()}
                     </div>
                   </div>
                 ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="border-b border-slate-100 dark:border-slate-800">
                           <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider text-xs">Crate Code</th>
                           <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider text-xs">Product</th>
                           <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider text-xs">Quantity</th>
                           <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider text-xs">Buyer</th>
                           <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider text-xs">Dispatch Date</th>
                           <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider text-xs text-right">Total Amount</th>
                       </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, idx) => (
                            <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">{order.alphanumeric_code || order.batch_code}</td>
                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{order.product_name}</td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{order.quantity_crates} Crates</td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{order.buyer_name}</td>
                                <td className="px-6 py-4 text-slate-500">{new Date(order.dispatch_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600">₹{order.total_amount.toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
              </div>
          </Card>
      )}

      {/* TWO-STEP CREATE ORDER MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)}></div>
              
              <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[94vh] sm:max-h-[90vh] flex flex-col">
                  <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 z-10 shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-indigo-600 rounded-lg flex-shrink-0">
                          <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                          {step === 'inventory' ? 'Select Products' : 'Order Summary'}
                        </h2>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} disabled={submitting} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 flex-shrink-0">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col space-y-4">
                      {submitError && (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-900/40 rounded-xl text-sm font-medium">
                             {submitError}
                          </div>
                      )}

                      {step === 'inventory' ? (
                          // STEP 1: INVENTORY TABLE
                          <div className="space-y-4">
                              {/* SITE & ROOM SELECTORS */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Site</label>
                                      <select 
                                          value={selectedSiteId}
                                          onChange={(e) => {
                                              const siteId = e.target.value;
                                              setSelectedSiteId(siteId);
                                              // Auto-select first room of this site
                                              const firstRoom = rooms.find(r => r.site_id === siteId);
                                              if (firstRoom) setSelectedRoomId(firstRoom.id);
                                          }}
                                          className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                      >
                                          <option value="">Select site...</option>
                                          {sites.map(site => (
                                              <option key={site.id} value={site.id}>{site.name}</option>
                                          ))}
                                      </select>
                                  </div>
                                  
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Room</label>
                                      <select 
                                          value={selectedRoomId}
                                          onChange={(e) => setSelectedRoomId(e.target.value)}
                                          className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                      >
                                          <option value="">Select room...</option>
                                          {rooms.filter(r => r.site_id === selectedSiteId).map(room => (
                                              <option key={room.id} value={room.id}>{room.room_name}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>

                              {/* SORT OPTIONS */}
                              <div className="flex flex-col sm:flex-row gap-2">
                                  <button
                                      type="button"
                                      onClick={() => setSortBy('expiry')}
                                      className={`flex-1 px-3 py-2 rounded-lg font-bold text-sm transition-colors ${
                                          sortBy === 'expiry'
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                      }`}
                                  >
                                      Sort by Expiry (Earliest First)
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => setSortBy('price')}
                                      className={`flex-1 px-3 py-2 rounded-lg font-bold text-sm transition-colors ${
                                          sortBy === 'price'
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                      }`}
                                  >
                                      Sort by Price (Highest First)
                                  </button>
                              </div>

                              <p className="text-sm text-slate-600 dark:text-slate-400">Select products and enter quantity to add to cart</p>
                              
                              {sortedBatches.length === 0 ? (
                                  <div className="text-center py-8 text-slate-500">
                                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                    <p>{selectedRoomId ? 'No batches in this room' : 'Please select a room'}</p>
                                  </div>
                              ) : (
                                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                                      <table className="w-full text-sm">
                                          <thead>
                                              <tr className="bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Product</th>
                                                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Crate Code</th>
                                                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Stored Price</th>
                                                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Market Price</th>
                                                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Expiry</th>
                                                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Available</th>
                                                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Qty to Add</th>
                                                  <th className="px-4 py-3"></th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {sortedBatches.map((batch) => {
                                                  const cartItem = cartItems.find(item => item.batchId === batch.id);
                                                  const priceData = marketPrices[batch.product_name];
                                                  const marketPrice = priceData?.price || 0;
                                                  // Use snapshot_price_per_kg if available, otherwise use current market price
                                                  const storedPrice = batch.snapshot_price_per_kg && batch.snapshot_price_per_kg > 0 ? batch.snapshot_price_per_kg : marketPrice;
                                                  const tempQty = tempQtyValues[batch.id] ?? (cartItem?.quantity || 1);
                                                  
                                                  return (
                                                      <tr key={batch.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{batch.product_name}</td>
                                                          <td className="px-4 py-3 font-mono text-xs text-purple-600 dark:text-purple-400">{batch.alphanumeric_code || batch.batch_code}</td>
                                                          <td className="px-4 py-3 text-center text-amber-600 dark:text-amber-400 font-semibold">₹{storedPrice.toFixed(2)}</td>
                                                          <td className="px-4 py-3 text-center text-indigo-600 dark:text-indigo-400 font-semibold">₹{marketPrice.toFixed(2)}</td>
                                                          <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{batch.expiry_days} days</td>
                                                          <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{batch.remaining_crates.toFixed(1)}</td>
                                                          <td className="px-4 py-3">
                                                              <input
                                                                  type="number"
                                                                  min="0"
                                                                  step="1"
                                                                  max={batch.remaining_crates}
                                                                  value={tempQty}
                                                                  onChange={(e) => setTempQtyValues({...tempQtyValues, [batch.id]: parseFloat(e.target.value) || 0})}
                                                                  className="w-20 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-center text-slate-900 dark:text-white"
                                                              />
                                                          </td>
                                                          <td className="px-4 py-3">
                                                              <button
                                                                  type="button"
                                                                  onClick={() => handleAddToCart(batch.id, tempQty)}
                                                                  className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 whitespace-nowrap"
                                                              >
                                                                  {cartItem ? 'Update' : 'Add to Cart'}
                                                              </button>
                                                          </td>
                                                      </tr>
                                                  );
                                              })}
                                          </tbody>
                                      </table>
                                  </div>
                              )}

                              {/* CART PREVIEW */}
                              {cartItems.length > 0 && (
                                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900/40">
                                      <h3 className="font-bold text-slate-900 dark:text-white mb-3">Cart ({cartItems.length} items)</h3>
                                      <div className="space-y-2">
                                          {cartItems.map(item => {
                                              const batch = batches.find(b => b.id === item.batchId);
                                              if (!batch) return null;
                                              return (
                                                  <div key={item.batchId} className="flex justify-between items-center text-sm">
                                                      <span className="text-slate-700 dark:text-slate-300">
                                                        {batch.product_name} ({batch.alphanumeric_code}) - {item.quantity} crates
                                                      </span>
                                                      <button
                                                          type="button"
                                                          onClick={() => handleRemoveFromCart(item.batchId)}
                                                          className="text-red-600 hover:text-red-700 text-xs"
                                                      >
                                                          Remove
                                                      </button>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                          </div>
                      ) : (
                          // STEP 2: ORDER SUMMARY
                          <form id="order-form" onSubmit={handleCreateOrder} className="space-y-5">
                              <div>
                                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Order Summary</h3>
                                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg mb-4">
                                      <table className="w-full text-sm">
                                          <thead>
                                              <tr className="bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Product</th>
                                                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Total Crates</th>
                                                  <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Price/kg</th>
                                                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Total Amount</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {totals.map((total, idx) => (
                                                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                                                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{total.product}</td>
                                                      <td className="px-4 py-3 text-center font-semibold text-indigo-600 dark:text-indigo-400">{total.totalCrates.toFixed(1)}</td>
                                                      <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">₹{total.pricePerKg.toFixed(2)}</td>
                                                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{total.totalPrice.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                                                  </tr>
                                              ))}
                                              <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                  <td colSpan={3} className="px-4 py-3 font-bold text-slate-900 dark:text-white text-right">Grand Total:</td>
                                                  <td className="px-4 py-3 text-right font-bold text-lg text-emerald-600 dark:text-emerald-400">₹{grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </div>
                              </div>

                              {/* ORDER DETAILS */}
                              <div>
                                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    <Calendar className="w-4 h-4 inline mr-2" /> Dispatch Date
                                  </label>
                                  <input 
                                      type="date" 
                                      required 
                                      value={dispatchDate} 
                                      onChange={(e) => setDispatchDate(e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                              </div>

                              <div>
                                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Buyer Name *</label>
                                  <input 
                                      type="text" 
                                      required 
                                      value={buyerName}
                                      onChange={(e) => setBuyerName(e.target.value)}
                                      placeholder="Enter buyer or company name"
                                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                              </div>

                              <div>
                                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                                    <IndianRupee className="w-4 h-4 inline mr-2" /> Selling Price
                                  </label>
                                  <div className="flex flex-col gap-3 mb-3">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                          <input 
                                              type="radio" 
                                              value="market" 
                                              checked={priceMode === 'market'}
                                              onChange={() => setPriceMode('market')}
                                          />
                                          <span className="text-sm text-slate-700 dark:text-slate-300">Use Market Price</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                          <input 
                                              type="radio" 
                                              value="manual" 
                                              checked={priceMode === 'manual'}
                                              onChange={() => setPriceMode('manual')}
                                          />
                                          <span className="text-sm text-slate-700 dark:text-slate-300">Manual Price</span>
                                      </label>
                                  </div>
                                  {priceMode === 'manual' && (
                                      <input 
                                          type="number" 
                                          min="0" 
                                          step="0.01"
                                          value={manualPrice}
                                          onChange={(e) => setManualPrice(e.target.value)}
                                          placeholder="Enter price per kg"
                                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                      />
                                  )}
                              </div>
                          </form>
                      )}
                  </div>

                  {/* MODAL FOOTER */}
                  <div className="flex gap-3 p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                      <button
                          onClick={() => {
                              if (step === 'summary') {
                                  setStep('inventory');
                              } else {
                                  setIsModalOpen(false);
                              }
                          }}
                          disabled={submitting}
                          className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
                      >
                          {step === 'summary' ? 'Back' : 'Cancel'}
                      </button>
                      <button
                          onClick={step === 'inventory' ? handleProceedToSummary : undefined}
                          type={step === 'summary' ? 'submit' : 'button'}
                          form={step === 'summary' ? 'order-form' : undefined}
                          disabled={submitting || (step === 'inventory' && cartItems.length === 0)}
                          className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          {submitting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                              <>
                                  {step === 'inventory' ? 'Next' : 'Create Order'}
                                  <ChevronRight className="w-4 h-4" />
                              </>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FarmerOrders;
