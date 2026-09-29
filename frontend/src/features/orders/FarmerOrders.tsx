import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { ShoppingCart, Truck, Plus, X, Loader2, Calendar, Package, IndianRupee, Hash, Trash2 } from 'lucide-react';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { useMarketPrices } from '../../hooks/useMarketPrices';
import { convertCratesToKg, convertKgToCrates } from '../../utils/units';
import { useState, useEffect } from 'react';

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
  
  // Multi-batch selection
  const [selectedBatches, setSelectedBatches] = useState<Array<{batchId: string; quantity: string}>>([]);
  const [batchToAdd, setBatchToAdd] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState('');
  
  const [priceMode, setPriceMode] = useState<'market' | 'manual'>('market');
  const [manualPrice, setManualPrice] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [orderRemarks, setOrderRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Get market prices - use first batch's product for pricing
  const firstSelectedBatch = selectedBatches.length > 0 ? batches.find(b => b.id === selectedBatches[0].batchId) : null;
  const productName = firstSelectedBatch?.product_name || '';
  const productsForPricing = productName ? [productName] : [];
  const { getTrend } = useMarketPrices(productsForPricing);
  const marketPrice = productsForPricing.length > 0 ? getTrend(productName).current : 0;

  // Calculate total quantity and amount
  const totalCrates = selectedBatches.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0);
  }, 0);
  const totalQuantityKg = convertCratesToKg(totalCrates);
  const totalAmount = totalQuantityKg * (priceMode === 'market' ? marketPrice : parseFloat(manualPrice || '0'));

  useEffect(() => {
     if (!user?.id) return;
     const load = async () => {
         setLoading(true);
         try {
             const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
             if (!profile) return;
             setProfileId(profile.id);
             
             // Load farmer's batches from batch_room_allocations
             const { data: allocations } = await supabase
               .from('batch_room_allocations')
               .select(`
                 batches(
                   id,
                   batch_code,
                   product_id,
                   remaining_quantity_kg,
                   initial_quantity_kg,
                   products(name)
                 )
               `)
               .eq('batches.farmer_id', profile.id)
               .is('removed_at', null);

             const batchList: any[] = [];
             if (allocations) {
               allocations.forEach((alloc: any) => {
                 const batch = Array.isArray(alloc.batches) ? alloc.batches[0] : alloc.batches;
                 const product = Array.isArray(batch?.products) ? batch.products[0] : batch?.products;
                 if (batch && !batchList.find(b => b.id === batch.id)) {
                   batchList.push({
                     id: batch.id,
                     batch_code: batch.batch_code,
                     product_name: product?.name || 'Unknown',
                     remaining_quantity_kg: batch.remaining_quantity_kg || 0
                   });
                 }
               });
             }
             setBatches(batchList);
             
             // Load existing orders (sales)
             const { data: sales } = await supabase
               .from('sales')
               .select(`
                 id,
                 batch_id,
                 quantity_kg,
                 selling_price,
                 buyer,
                 sold_at
               `)
               .order('sold_at', { ascending: false });

             const ordersList: any[] = [];
             if (sales && batchList.length > 0) {
               const batchMap = new Map(batchList.map(b => [b.id, b]));
               
               sales.forEach((sale: any) => {
                 const batch = batchMap.get(sale.batch_id);
                 if (batch) {
                   ordersList.push({
                     id: sale.id,
                     batch_code: batch.batch_code,
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
         } catch (err) {
           console.error('Error loading orders:', err);
         } finally {
           setLoading(false);
         }
     };
     load();
  }, [user?.id]);

  const handleAddBatchToOrder = () => {
    if (!batchToAdd || !quantityToAdd || parseFloat(quantityToAdd) <= 0) {
      setSubmitError('Please select a batch and enter a valid quantity');
      return;
    }

    const selectedBatch = batches.find(b => b.id === batchToAdd);
    if (!selectedBatch) return;

    const quantityNum = parseFloat(quantityToAdd);
    const maxAvailable = convertKgToCrates(selectedBatch.remaining_quantity_kg);
    if (quantityNum > maxAvailable) {
      setSubmitError(`Requested quantity exceeds available (${maxAvailable} crates)`);
      return;
    }

    // Check if batch already added
    if (selectedBatches.find(s => s.batchId === batchToAdd)) {
      setSubmitError('This batch is already in the order');
      return;
    }

    setSelectedBatches([...selectedBatches, { batchId: batchToAdd, quantity: quantityToAdd }]);
    setBatchToAdd('');
    setQuantityToAdd('');
    setSubmitError('');
  };

  const handleRemoveBatchFromOrder = (batchId: string) => {
    setSelectedBatches(selectedBatches.filter(s => s.batchId !== batchId));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');
      
      if (selectedBatches.length === 0 || !dispatchDate || !buyerName) {
          setSubmitError('Please add at least one batch and fill required fields.');
          return;
      }
      
      if (priceMode === 'manual' && (!manualPrice || parseFloat(manualPrice) <= 0)) {
          setSubmitError('Please enter a valid manual price.');
          return;
      }
      
      setSubmitting(true);
      try {
          const pricePerKg = priceMode === 'market' ? marketPrice : parseFloat(manualPrice);

          // Create sales records for each batch
          for (const item of selectedBatches) {
              const batch = batches.find(b => b.id === item.batchId);
              if (!batch) continue;

              const quantityKg = convertCratesToKg(parseFloat(item.quantity));

              // Create sale record
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

              // Update batch remaining quantity
              const newRemaining = Math.max(0, batch.remaining_quantity_kg - quantityKg);
              await supabase
                  .from('batches')
                  .update({ remaining_quantity_kg: newRemaining })
                  .eq('id', item.batchId);
          }

          console.log('Order created successfully with', selectedBatches.length, 'batches');
          
          // Reset form and reload
          setIsModalOpen(false);
          setSelectedBatches([]);
          setBatchToAdd('');
          setQuantityToAdd('');
          setManualPrice('');
          setBuyerName('');
          setOrderRemarks('');
          setDispatchDate(new Date().toISOString().split('T')[0]);
          setPriceMode('market');

          // Reload data
          if (profileId) {
            setLoading(true);
            // Could reload here
          }
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
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Order (Multi-Batch)</h2>
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
                          {/* BATCH SELECTION SECTION */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5" /> Add Batches to Order
                              </h3>
                              
                              <div className="space-y-4">
                                  {/* Add batch row */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <select 
                                          value={batchToAdd}
                                          onChange={(e) => setBatchToAdd(e.target.value)}
                                          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white text-sm"
                                      >
                                          <option value="">Select batch...</option>
                                          {batches.filter(b => !selectedBatches.find(s => s.batchId === b.id)).map(b => (
                                              <option key={b.id} value={b.id}>
                                                {b.batch_code} ({b.product_name}) - {convertKgToCrates(b.remaining_quantity_kg)} crates left
                                              </option>
                                          ))}
                                      </select>
                                      <input 
                                          type="number"
                                          min="0.1"
                                          step="0.1"
                                          value={quantityToAdd}
                                          onChange={(e) => setQuantityToAdd(e.target.value)}
                                          placeholder="Quantity (crates)"
                                          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white text-sm"
                                      />
                                      <button
                                          type="button"
                                          onClick={handleAddBatchToOrder}
                                          className="bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 px-4 py-3 text-sm"
                                      >
                                          <Plus className="w-4 h-4 inline mr-1" /> Add
                                      </button>
                                  </div>

                                  {/* Selected batches table */}
                                  {selectedBatches.length > 0 && (
                                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                                          <table className="w-full text-sm">
                                              <thead>
                                                  <tr className="bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                                      <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Batch</th>
                                                      <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Product</th>
                                                      <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Available</th>
                                                      <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">To Sell</th>
                                                      <th className="px-4 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">Remaining</th>
                                                      <th className="px-4 py-2"></th>
                                                  </tr>
                                              </thead>
                                              <tbody>
                                                  {selectedBatches.map((item) => {
                                                      const batch = batches.find(b => b.id === item.batchId);
                                                      if (!batch) return null;
                                                      const available = convertKgToCrates(batch.remaining_quantity_kg);
                                                      const toSell = parseFloat(item.quantity);
                                                      const remaining = available - toSell;
                                                      return (
                                                          <tr key={item.batchId} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                              <td className="px-4 py-2 font-mono text-xs">{batch.batch_code}</td>
                                                              <td className="px-4 py-2">{batch.product_name}</td>
                                                              <td className="px-4 py-2 font-bold text-indigo-600 dark:text-indigo-400">{available}</td>
                                                              <td className="px-4 py-2 font-bold text-emerald-600 dark:text-emerald-400">{toSell}</td>
                                                              <td className={`px-4 py-2 font-bold ${remaining < 0 ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'}`}>
                                                                {remaining.toFixed(1)}
                                                              </td>
                                                              <td className="px-4 py-2">
                                                                  <button
                                                                      type="button"
                                                                      onClick={() => handleRemoveBatchFromOrder(item.batchId)}
                                                                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                  >
                                                                      <Trash2 className="w-4 h-4" />
                                                                  </button>
                                                              </td>
                                                          </tr>
                                                      );
                                                  })}
                                              </tbody>
                                          </table>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* ORDER DETAILS */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Dispatch Date
                              </label>
                              <input 
                                  type="date" 
                                  required 
                                  value={dispatchDate} 
                                  onChange={(e) => setDispatchDate(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                          </div>

                          <div>
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Buyer Name</label>
                              <input 
                                  type="text" 
                                  required 
                                  value={buyerName}
                                  onChange={(e) => setBuyerName(e.target.value)}
                                  placeholder="Enter buyer or company name"
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                          </div>

                          {/* PRICING */}
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <IndianRupee className="w-4 h-4" /> Selling Price
                              </label>
                              <div className="flex gap-4 mb-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                          type="radio" 
                                          value="market" 
                                          checked={priceMode === 'market'}
                                          onChange={() => setPriceMode('market')}
                                      />
                                      <span className="text-sm text-slate-700 dark:text-slate-300">Market Price (₹{marketPrice}/kg)</span>
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

                          {/* TOTAL */}
                          {selectedBatches.length > 0 && (
                              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-900/40">
                                  <div className="flex justify-between items-center">
                                      <div>
                                          <p className="text-sm text-slate-600 dark:text-slate-400">Total Quantity:</p>
                                          <p className="text-lg font-bold text-slate-900 dark:text-white">{totalCrates} Crates ({totalQuantityKg} kg)</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm text-slate-600 dark:text-slate-400">Total Amount:</p>
                                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{totalAmount.toLocaleString('en-IN')}</p>
                                      </div>
                                  </div>
                              </div>
                          )}

                          <div className="flex gap-3 pt-4">
                              <button 
                                  type="button"
                                  onClick={() => setIsModalOpen(false)} 
                                  disabled={submitting}
                                  className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                              >
                                  Cancel
                              </button>
                              <button 
                                  type="submit"
                                  disabled={submitting || selectedBatches.length === 0}
                                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                  {submitting ? 'Creating...' : 'Create Order'}
                              </button>
                          </div>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default FarmerOrders;
