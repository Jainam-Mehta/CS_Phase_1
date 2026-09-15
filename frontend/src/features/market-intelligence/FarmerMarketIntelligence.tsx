import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { useMarketPrices } from '../../hooks/useMarketPrices';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { TrendingUp, ArrowUpRight, ArrowDownRight, PackageSearch, LayoutDashboard, IndianRupee, Wallet, Receipt, CheckCircle2 } from 'lucide-react';
import { FEATURE_FLAGS } from '../../config/features.config';
import { convertKgToCrates } from '../../utils/units';
import { DEMO_ENABLED, DEMO_PRODUCTS, DEMO_MARKET_PRICE, DEMO_REVENUE_EARNED, DEMO_INVENTORY } from '../../utils/demoData';

const FarmerMarketIntelligence: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, activeProductId } = useFarmerStore();
  
  // DEMO: Use hardcoded data if DEMO_ENABLED
  if (DEMO_ENABLED) {
    return (
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
         <div className="flex items-center gap-3 mb-8">
           <TrendingUp className="w-8 h-8 text-primary-500" />
           <div>
             <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
               Market
             </h1>
             <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
               Live daily market prices
             </p>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {DEMO_PRODUCTS.map(p => {
               const variance = 2.5; // Demo variance
               const positive = true;
               
               return (
                  <Card key={p.id} className="border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                           <div className="flex items-start justify-between mb-6">
                              <div>
                                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p.name}</h3>
                                 <p className="text-sm font-semibold text-slate-400 mt-0.5 tracking-widest uppercase">
                                   Today's Price / KG
                                 </p>
                              </div>
                              <div className={`p-2 rounded-lg ${positive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-50 text-red-600 dark:bg-red-900/30'}`}>
                                 {positive ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                              </div>
                           </div>

                           <div className="flex items-end gap-3 mb-6">
                              <span className="text-4xl font-extrabold tracking-tight">₹{DEMO_MARKET_PRICE}</span>
                              <span className={`text-sm font-bold flex items-center mb-1 ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {positive ? '+' : ''}{variance.toFixed(1)}% <span className="text-slate-400 font-medium ml-1">Next 7 Days</span>
                              </span>
                           </div>
                           
                           <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                               <div>
                                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Predicted Value</p>
                                 <p className="font-bold text-lg dark:text-slate-200">₹{(DEMO_MARKET_PRICE * 1.025).toFixed(0)} / kg</p>
                               </div>
                               
                               <div className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm bg-indigo-500 text-white`}>
                                   ACTION: HOLD
                               </div>
                           </div>
                      </CardContent>
                  </Card>
               );
           })}
        </div>
        
        {/* Financial Overview Section */}
        <div className="flex items-center gap-3 mt-12 mb-6">
          <IndianRupee className="w-7 h-7 text-emerald-500" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Financial Overview
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Track your storage costs, revenue, and profit
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Storage Costs */}
           <Card className="border border-orange-200 dark:border-orange-800 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 transform transition hover:scale-105 hover:shadow-xl">
               <CardContent className="p-8">
                   <div className="flex items-start justify-between mb-4">
                       <div className="p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                           <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                       </div>
                       <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                         <p className="text-xs font-bold text-orange-700 dark:text-orange-300">₹1.2/crate/month</p>
                       </div>
                   </div>
                   <p className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Storage Costs</p>
                   <p className="text-4xl font-extrabold tracking-tight mb-1 text-orange-900 dark:text-orange-100">₹{(DEMO_INVENTORY.reduce((acc, inv) => acc + (inv.initial_quantity_kg / 25 * 1.2), 0)).toLocaleString('en-IN')}</p>
                   <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">{Math.round(DEMO_INVENTORY.reduce((acc, inv) => acc + inv.initial_quantity_kg / 25, 0))} crates stored</p>
               </CardContent>
           </Card>

           {/* Revenue Earned */}
           <Card className="border border-emerald-200 dark:border-emerald-800 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 transform transition hover:scale-105 hover:shadow-xl">
               <CardContent className="p-8">
                   <div className="flex items-start justify-between mb-4">
                       <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                           <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                       </div>
                       <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                         <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                       </div>
                   </div>
                   <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Revenue Earned</p>
                   <p className="text-4xl font-extrabold tracking-tight mb-1 text-emerald-900 dark:text-emerald-100">₹{DEMO_REVENUE_EARNED.toLocaleString('en-IN')}</p>
                   <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">From completed orders</p>
               </CardContent>
           </Card>

           {/* Net Profit */}
           <Card className="border border-indigo-200 dark:border-indigo-800 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950/20 dark:to-purple-900/20 transform transition hover:scale-105 hover:shadow-xl">
               <CardContent className="p-8">
                   <div className="flex items-start justify-between mb-4">
                       <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                           <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                       </div>
                       <ArrowUpRight className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                   </div>
                   <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Net Profit</p>
                   <p className={`text-4xl font-extrabold tracking-tight mb-1 text-indigo-900 dark:text-indigo-100`}>
                       ₹{(DEMO_REVENUE_EARNED - (DEMO_INVENTORY.reduce((acc, inv) => acc + (inv.initial_quantity_kg / 25 * 1.2), 0))).toLocaleString('en-IN')}
                   </p>
                   <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Revenue - Storage Costs</p>
               </CardContent>
           </Card>
        </div>
      </div>
    );
  }
  const [profileId, setProfileId] = useState<string | null>(null);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Use market prices hook (fetches from API/store with 24hr cache)
  const { getTrend, loading: pricesLoading, error: pricesError } = useMarketPrices(uniqueProducts);

  useEffect(() => {
     if (!user?.id) return;
     const load = async () => {
        setLoading(true);
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
        if (!profile) return;
        setProfileId(profile.id);

        // Query batch_room_allocations -> batches -> products
        let query = supabase
          .from('batch_room_allocations')
          .select(`
            quantity_kg,
            batches!inner(
              product_id,
              initial_quantity_kg,
              products!inner(id, name)
            )
          `)
          .eq('batches.farmer_id', profile.id)
          .is('removed_at', null);
        
        // If a room is active, limit the scope
        if (activeRoomId) {
            query = query.eq('room_id', activeRoomId);
        }
        
        const { data: allocationData } = await query;
        if (allocationData) {
            // Extract unique product names (not IDs)
            const productNames = Array.from(new Set(allocationData.map((a: any) => {
                const products = a.batches?.products;
                if (Array.isArray(products)) {
                    return products[0]?.name;
                }
                return products?.name;
            }).filter(Boolean))) as string[];
            
            setUniqueProducts(productNames);
            
            // Set batches for finance calculations
            const transformedBatches = allocationData.map((allocation: any) => {
              const products = allocation.batches?.products;
              const productName = Array.isArray(products) ? products[0]?.name : products?.name;
              return {
                product: productName || 'Unknown',
                initial_quantity_kg: allocation.batches.initial_quantity_kg,
                quantity_kg: allocation.quantity_kg
              };
            });
            setBatches(transformedBatches);
        }
        setLoading(false);
     };
     load();
  }, [user?.id, activeRoomId]);

  if (!activeRoomId) {
      return (
        <div className="p-8 max-w-[1400px] mx-auto pt-16 h-[80vh] flex items-center justify-center">
           <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <LayoutDashboard className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Target Found</h2>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">
                 Please select an active storage room on the Dashboard to view accurate Market Predictions structurally.
              </p>
           </div>
        </div>
      );
  }

  // Filter further if they have a specific product selected, otherwise show all in the room.
  // uniqueProducts now contains product names, not IDs
  const displayProducts = uniqueProducts;

  // Calculate Finances using real/simulated market data
  let totalStorageCosts = 0;
  let totalRevenueEarned = 0;
  let totalCrates = 0;

  batches.forEach(b => {
      const kg = b.initial_quantity_kg || 0;
      const crates = convertKgToCrates(kg); // Convert kg to crates using centralized helper
      totalCrates += crates;
  });

  // Storage costs calculation
  // TODO: Fetch from cold_storage_facilities.storage_rate_per_crate_month table
  const storageRatePerCrate = 1.2; // ₹/crate/month - Will be set by owner
  totalStorageCosts = totalCrates * storageRatePerCrate;
  
  // Revenue earned calculation
  // TODO: Fetch from completed orders in the orders table
  totalRevenueEarned = 0; // Will be calculated from orders table
  
  const netProfit = totalRevenueEarned - totalStorageCosts;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex items-center gap-3 mb-8">
         <TrendingUp className="w-8 h-8 text-primary-500" />
         <div>
           <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
             Market
           </h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
             Live daily market prices
           </p>
         </div>
      </div>
      
      {loading || pricesLoading ? (
           <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
      ) : displayProducts.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 bg-transparent shadow-none text-center p-16">
             <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-700 dark:text-slate-400">No Products Found</h3>
             <p className="text-slate-500 text-sm mt-2">
               Add batches to this facility to view market prices and insights.
             </p>
          </Card>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {displayProducts.map(p => {
                 const trend = getTrend(p); // Now fetches from market store
                 const variance = ((trend.predicted - trend.current) / trend.current) * 100;
                 const positive = variance >= 0;
                 
                 // Determine action based on variance (simplified logic - ML will replace later)
                 const action = positive ? 'Hold' : 'Sell';

                 return (
                    <Card key={p} className="border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                             <div className="flex items-start justify-between mb-6">
                                 <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p}</h3>
                                    <p className="text-sm font-semibold text-slate-400 mt-0.5 tracking-widest uppercase">
                                      {FEATURE_FLAGS.LIVE_MARKET_PRICES ? 'Today\'s Price / KG' : 'Current Price / KG'}
                                    </p>
                                 </div>
                                 {/* Show trend indicator only if predictions are enabled */}
                                 {FEATURE_FLAGS.MARKET_PRICE_PREDICTIONS && (
                                   <div className={`p-2 rounded-lg ${positive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-50 text-red-600 dark:bg-red-900/30'}`}>
                                      {positive ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                                   </div>
                                 )}
                             </div>

                             <div className="flex items-end gap-3 mb-6">
                                <span className="text-4xl font-extrabold tracking-tight">₹{trend.current}</span>
                                {/* Show predicted variance only if predictions are enabled */}
                                {FEATURE_FLAGS.MARKET_PRICE_PREDICTIONS && (
                                  <span className={`text-sm font-bold flex items-center mb-1 ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {positive ? '+' : ''}{variance.toFixed(1)}% <span className="text-slate-400 font-medium ml-1">Next 7 Days</span>
                                  </span>
                                )}
                             </div>
                             
                             {/* Show prediction section only if predictions are enabled */}
                             {FEATURE_FLAGS.MARKET_PRICE_PREDICTIONS ? (
                               <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                   <div>
                                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Predicted Value</p>
                                     <p className="font-bold text-lg dark:text-slate-200">₹{trend.predicted} / kg</p>
                                   </div>
                                   
                                   <div className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm ${action === 'Hold' ? 'bg-indigo-500 text-white' : 'bg-orange-500 text-white'}`}>
                                       ACTION: {action.toUpperCase()}
                                   </div>
                               </div>
                             ) : null}
                        </CardContent>
                    </Card>
                 );
             })}
          </div>
      )}
      
      {/* Financial Overview Section - 3 Columns */}
      {displayProducts.length > 0 && batches.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-12 mb-6">
            <IndianRupee className="w-7 h-7 text-emerald-500" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Financial Overview
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Track your storage costs, revenue, and profit
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Storage Costs */}
             <Card className="border border-orange-200 dark:border-orange-800 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 transform transition hover:scale-105 hover:shadow-xl">
                 <CardContent className="p-8">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                             <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                         </div>
                         <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                           <p className="text-xs font-bold text-orange-700 dark:text-orange-300">₹{storageRatePerCrate}/crate/month</p>
                         </div>
                     </div>
                     <p className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Storage Costs</p>
                     <p className="text-4xl font-extrabold tracking-tight mb-1 text-orange-900 dark:text-orange-100">₹{totalStorageCosts.toLocaleString('en-IN')}</p>
                     <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">{Math.round(totalCrates)} crates stored</p>
                 </CardContent>
             </Card>

             {/* Revenue Earned */}
             <Card className="border border-emerald-200 dark:border-emerald-800 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 transform transition hover:scale-105 hover:shadow-xl">
                 <CardContent className="p-8">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                             <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                         </div>
                         <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                           <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                         </div>
                     </div>
                     <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Revenue Earned</p>
                     <p className="text-4xl font-extrabold tracking-tight mb-1 text-emerald-900 dark:text-emerald-100">₹{totalRevenueEarned.toLocaleString('en-IN')}</p>
                     <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">From completed orders</p>
                 </CardContent>
             </Card>

             {/* Net Profit */}
             <Card className="border border-indigo-200 dark:border-indigo-800 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950/20 dark:to-purple-900/20 transform transition hover:scale-105 hover:shadow-xl">
                 <CardContent className="p-8">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                             <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                         </div>
                         {netProfit >= 0 ? (
                           <ArrowUpRight className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                         ) : (
                           <ArrowDownRight className="w-6 h-6 text-red-600 dark:text-red-400" />
                         )}
                     </div>
                     <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Net Profit</p>
                     <p className={`text-4xl font-extrabold tracking-tight mb-1 ${netProfit >= 0 ? 'text-indigo-900 dark:text-indigo-100' : 'text-red-600 dark:text-red-400'}`}>
                         ₹{netProfit.toLocaleString('en-IN')}
                     </p>
                     <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Revenue - Storage Costs</p>
                 </CardContent>
             </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default FarmerMarketIntelligence;
