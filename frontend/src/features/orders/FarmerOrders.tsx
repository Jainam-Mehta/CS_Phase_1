import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { ShoppingCart, Truck, Plus, X, Loader2, Calendar, Package, IndianRupee, Hash } from 'lucide-react';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { useMarketPrices } from '../../hooks/useMarketPrices';

const FarmerOrders: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId } = useFarmerStore();
  const [profileId, setProfileId] = useState<string | null>(null);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantityCrates, setQuantityCrates] = useState('');
  const [priceMode, setPriceMode] = useState<'market' | 'manual'>('market');
  const [manualPrice, setManualPrice] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Get market prices for calculation - update when batch selection changes
  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const productName = selectedBatch?.product_name || '';
  const productsForPricing = productName ? [productName] : [];
  const { getTrend } = useMarketPrices(productsForPricing);
  const marketPrice = productsForPricing.length > 0 ? getTrend(productName).current : 0;

  const fetchBatches = async (pId: string) => {
       try {
           // Fetch active batches for the dropdown
           let query = supabase
             .from('batch_room_allocations')
             .select(`
               batches!inner(
                 id,
                 batch_code,
                 farmer_id,
                 initial_quantity_kg,
                 remaining_quantity_kg,
                 products!inner(id, name)
               )
             `)
             .eq('batches.farmer_id', pId)
             .is('removed_at', null);
           
           if (activeRoomId) query = query.eq('room_id', activeRoomId);

           const { data: allocationData } = await query;
           
           const transformedBatches = allocationData?.map((allocation: any) => {
             const batch = allocation.batches;
             const products = Array.isArray(batch.products) ? batch.products[0] : batch.products;
             return {
               id: batch.id,
               batch_code: batch.batch_code,
               initial_quantity_kg: batch.initial_quantity_kg,
               remaining_quantity_kg: batch.remaining_quantity_kg,
               product_name: products?.name || 'Unknown Product',
               product_id: products?.id
             };
           }) || [];
           
           setBatches(transformedBatches);
       } catch (error) {
           console.error("Fetch batches error:", error);
       }
  };

  const fetchOrders = async (pId: string) => {
       try {
           // TODO: Fetch from actual orders table when implemented
           // For now, showing placeholder data structure
           setOrders([]);
       } catch (error) {
           console.error("Fetch orders error:", error);
       }
  };

  useEffect(() => {
     if (!user?.id) return;
     const load = async () => {
         setLoading(true);
         const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
         if (!profile) return;
         setProfileId(profile.id);
         await fetchBatches(profile.id);
         await fetchOrders(profile.id);
         setLoading(false);
     };
     load();
  }, [user?.id, activeRoomId]);

  const handleCreateOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');
      
      if (!selectedBatchId || !quantityCrates || !dispatchDate || !buyerName) {
          setSubmitError('Please fill all required fields.');
          return;
      }
      
      if (priceMode === 'manual' && (!manualPrice || parseFloat(manualPrice) <= 0)) {
          setSubmitError('Please enter a valid manual price.');
          return;
      }
      
      setSubmitting(true);
      try {
          const quantityKg = parseFloat(quantityCrates) * 25; // Convert crates to kg
          const pricePerKg = priceMode === 'market' ? marketPrice : parseFloat(manualPrice);
          const totalAmount = quantityKg * pricePerKg;
          
          // TODO: Insert into orders table when implemented
          // For now, just log the order data
          console.log('Order Data:', {
              farmerId: profileId,
              batchId: selectedBatchId,
              batch_code: selectedBatch?.batch_code,
              product_name: selectedBatch?.product_name,
              quantity_crates: parseFloat(quantityCrates),
              quantity_kg: quantityKg,
              dispatch_date: dispatchDate,
              buyer_name: buyerName,
              price_mode: priceMode,
              price_per_kg: pricePerKg,
              total_amount: totalAmount,
              remarks: orderRemarks,
              created_at: new Date().toISOString()
          });
          
          // Reset form
          setIsModalOpen(false);
          setSelectedBatchId('');
          setQuantityCrates('');
          setManualPrice('');
          setBuyerName('');
          setOrderRemarks('');
          setDispatchDate(new Date().toISOString().split('T')[0]);
          setPriceMode('market');
          
          if (profileId) {
              await fetchBatches(profileId);
              await fetchOrders(profileId);
          }
      } catch (err: any) {
          console.error("Failed to create order", err);
          setSubmitError(err.message || 'Failed to create order.');
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) {
      return <div className="p-8"><div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div></div>;
  }

  // Calculate total selling price based on mode
  const calculatedTotal = selectedBatch && quantityCrates 
    ? (parseFloat(quantityCrates) * 25 * (priceMode === 'market' ? marketPrice : parseFloat(manualPrice || '0')))
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
           <div className="flex items-center gap-3">
             <ShoppingCart className="w-8 h-8 text-indigo-500" />
             <div>
               <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Orders</h1>
               <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your product orders and dispatches</p>
             </div>
           </div>
           
           <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transform hover:-translate-y-0.5 transition-all">
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
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-6 py-4 text-slate-400 font-semibold uppercase tracking-wider text-xs">Batch Code</th>
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
                               <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">{order.batch_code}</td>
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

      {/* CREATE ORDER MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)}></div>
              
              <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                          <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Order</h2>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} disabled={submitting} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleCreateOrder} className="p-6">
                      {submitError && (
                          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-900/40 rounded-xl text-sm font-medium">
                             {submitError}
                          </div>
                      )}

                      <div className="space-y-5">
                          {/* Batch Selection */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <Hash className="w-4 h-4" /> Select Batch
                              </label>
                              <select 
                                  required 
                                  value={selectedBatchId} 
                                  onChange={(e) => setSelectedBatchId(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              >
                                  <option value="" disabled>Choose a batch...</option>
                                  {batches.map(b => (
                                      <option key={b.id} value={b.id}>
                                        {b.batch_code} - {b.product_name} ({b.remaining_quantity_kg}kg available)
                                      </option>
                                  ))}
                              </select>
                              {batches.length === 0 && (
                                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">
                                  No batches available. Please add inventory first.
                                </p>
                              )}
                          </div>
                      
                          <div className="grid grid-cols-2 gap-4">
                              {/* Quantity in Crates */}
                              <div>
                                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <Package className="w-4 h-4" /> Quantity (Crates)
                                  </label>
                                  <input 
                                      type="number"
                                      min="1"
                                      required
                                      value={quantityCrates}
                                      onChange={(e) => setQuantityCrates(e.target.value)}
                                      placeholder="Enter crates"
                                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                  />
                                  <p className="text-xs text-slate-500 mt-1.5 font-medium">1 Crate = 25 kg</p>
                              </div>
                              
                              {/* Dispatch Date */}
                              <div>
                                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Dispatch Date
                                  </label>
                                  <input 
                                      type="date"
                                      required
                                      value={dispatchDate}
                                      onChange={(e) => setDispatchDate(e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                  />
                              </div>
                          </div>
                          
                          {/* Buyer Name */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Buyer Name
                              </label>
                              <input 
                                  type="text"
                                  required
                                  value={buyerName}
                                  onChange={(e) => setBuyerName(e.target.value)}
                                  placeholder="Enter buyer or company name"
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                          </div>
                          
                          {/* Price Mode Selection */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <IndianRupee className="w-4 h-4" /> Selling Price
                              </label>
                              <div className="flex gap-4 mb-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                          type="radio" 
                                          name="priceMode" 
                                          value="market"
                                          checked={priceMode === 'market'}
                                          onChange={(e) => setPriceMode('market')}
                                          className="w-4 h-4 text-indigo-600"
                                      />
                                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Market Price (₹{marketPrice}/kg)
                                      </span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                          type="radio" 
                                          name="priceMode" 
                                          value="manual"
                                          checked={priceMode === 'manual'}
                                          onChange={(e) => setPriceMode('manual')}
                                          className="w-4 h-4 text-indigo-600"
                                      />
                                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Manual Price
                                      </span>
                                  </label>
                              </div>
                              
                              {priceMode === 'manual' && (
                                  <input 
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      required={priceMode === 'manual'}
                                      value={manualPrice}
                                      onChange={(e) => setManualPrice(e.target.value)}
                                      placeholder="Enter price per kg"
                                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                  />
                              )}
                              
                              {quantityCrates && selectedBatch && (
                                  <div className="mt-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                                        Total Amount: ₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                                        {quantityCrates} crates × 25 kg × ₹{priceMode === 'market' ? marketPrice : (manualPrice || 0)}/kg
                                      </p>
                                  </div>
                              )}
                          </div>
                          
                          {/* Remarks */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Remarks (Optional)
                              </label>
                              <textarea 
                                  value={orderRemarks}
                                  onChange={(e) => setOrderRemarks(e.target.value)}
                                  placeholder="Add any notes about this order..."
                                  rows={2}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-900 dark:text-white"
                              />
                          </div>
                      </div>

                      <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                          <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)} 
                            disabled={submitting} 
                            className="px-6 py-3 rounded-lg text-slate-600 bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={submitting || batches.length === 0} 
                            className="px-6 py-3 rounded-lg text-white bg-indigo-600 font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
                          >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Creating...
                                </>
                              ) : 'Create Order'}
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
