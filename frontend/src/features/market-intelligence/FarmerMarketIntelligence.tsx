import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { useMarketPrices } from '../../hooks/useMarketPrices';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { TrendingUp, ArrowUpRight, ArrowDownRight, PackageSearch, LayoutDashboard, IndianRupee, Wallet, Receipt, CheckCircle2 } from 'lucide-react';
import { FEATURE_FLAGS } from '../../config/features.config';
import { convertKgToCrates } from '../../utils/units';

const FarmerMarketIntelligence: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, activeProductId } = useFarmerStore();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [totalRevenueFromSales, setTotalRevenueFromSales] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [roomDetails, setRoomDetails] = useState<Map<string, {name: string; siteName: string; cost: number}>>(new Map()); // room_id -> details
  const [netWorthSnapshot, setNetWorthSnapshot] = useState<number>(0); // Value of all crates at snapshot (when stored)
  const [netWorthDynamic, setNetWorthDynamic] = useState<number>(0); // Current market value

  // Store market prices with their source market names
  const [marketPrices, setMarketPrices] = useState<Record<string, {price: number; market: string}>>(
    {}
  );
  
  const { getTrend, loading: pricesLoading, error: pricesError } = useMarketPrices(uniqueProducts);
  
  // Fetch live prices using site-based endpoint (by locality)
  useEffect(() => {
    const fetchLivePrices = async () => {
      if (!batches || batches.length === 0) {
        console.log('No batches to fetch prices for');
        return;
      }
      
      console.log('Fetching prices for batches:', batches);
      
      try {
        const prices: Record<string, {price: number; market: string}> = {};
        const roomToSite = new Map<string, string>();
        
        // Map rooms to sites and get site details
        for (const batch of batches) {
          if (!roomToSite.has(batch.room_id)) {
            const { data: roomData } = await supabase
              .from('cold_storage_rooms')
              .select('site_id')
              .eq('id', batch.room_id)
              .single();
            
            console.log('Room:', batch.room_id, 'Site:', roomData?.site_id);
            
            if (roomData?.site_id) {
              roomToSite.set(batch.room_id, roomData.site_id);
            }
          }
        }
        
        // Fetch site details and get locality/state info
        const siteIds = Array.from(new Set(roomToSite.values()));
        console.log('Unique sites:', siteIds);
        
        for (const siteId of siteIds) {
          try {
            // Get site locality and state
            const { data: siteData } = await supabase
              .from('sites')
              .select('locality_id, state_id')
              .eq('id', siteId)
              .single();
            
            console.log('Site data for', siteId, ':', siteData);
            
            if (!siteData?.locality_id || !siteData?.state_id) {
              console.log('Site missing locality or state');
              continue;
            }
            
            // Get locality name
            const { data: localityData } = await supabase
              .from('localities')
              .select('name')
              .eq('id', siteData.locality_id)
              .single();
            
            // Get state name
            const { data: stateData } = await supabase
              .from('states')
              .select('name')
              .eq('id', siteData.state_id)
              .single();
            
            console.log('Location:', localityData?.name, stateData?.name);
            
            if (!localityData?.name || !stateData?.name) {
              console.log('Could not resolve locality or state name');
              continue;
            }
            
            // Query market prices directly from Supabase
            // Note: market_name format is: "ProductName at LocationName Mandi"
            const { data: priceData } = await supabase
              .from('market_prices')
              .select('market_name, price_per_kg')
              .eq('state', stateData.name)
              .limit(500);
            
            console.log('Price records found for state', stateData.name, ':', priceData?.length || 0);
            
            // Extract prices - group by product name and track market source
            if (priceData && Array.isArray(priceData)) {
              const pricesByProduct: Record<string, {prices: number[]; markets: string[]}> = {};
              priceData.forEach((priceEntry: any) => {
                // Extract product name from market_name: "ProductName at LocationName Mandi"
                const match = priceEntry.market_name?.match(/^(.+?)\s+at\s+(.+?)$/);
                const productName = match ? match[1].trim() : '';
                const marketName = match ? match[2].trim() : priceEntry.market_name || 'Unknown Market';
                
                if (productName) {
                  if (!pricesByProduct[productName]) {
                    pricesByProduct[productName] = {prices: [], markets: []};
                  }
                  pricesByProduct[productName].prices.push(priceEntry.price_per_kg || 0);
                  pricesByProduct[productName].markets.push(marketName);
                }
              });
              
              // Calculate average price per product and pick first market as source
              Object.entries(pricesByProduct).forEach(([productName, data]) => {
                const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
                prices[productName] = {
                  price: avgPrice,  // Keep full precision to avoid rounding errors when multiplied by quantity
                  market: data.markets[0] || 'Market'
                };
              });
            }
          } catch (err) {
            console.log('Error fetching prices for site:', siteId, err);
          }
        }
        
        console.log('Final prices object:', prices);
        setMarketPrices(prices);
        
        // Also save to farmer store so other components (Orders) can use the same prices
        useFarmerStore.setState({ marketPrices: prices });
      } catch (err) {
        console.error('Error fetching live prices:', err);
      }
    };
    
    fetchLivePrices();
  }, [batches, supabase]);

  useEffect(() => {
     if (!user?.id) return;
     const load = async () => {
        setLoading(true);
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (!profile) return;
        setProfileId(profile.id);

        // Step 1: Get actual stored batches for this farmer
        const { data: farmerBatches } = await supabase
          .from('batches')
          .select('id, product_id')
          .eq('farmer_id', profile.id);
        
        if (!farmerBatches || farmerBatches.length === 0) {
          console.log('No batches found for farmer');
          setUniqueProducts([]);
          setLoading(false);
          return;
        }
        
        const batchIds = farmerBatches.map(b => b.id);
        const productIds = Array.from(new Set(farmerBatches.map(b => b.product_id).filter(Boolean))) as string[];
        
        console.log('DEBUG: farmerBatches:', farmerBatches);
        console.log('DEBUG: productIds from batches:', productIds);
        
        // Step 2: Fetch product names for all stored batches
        let productMap = new Map<string, {name: string; currentPrice: number}>();
        if (productIds.length > 0) {
          const { data: productsData, error: prodError } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds);
          
          console.log('DEBUG: products query error:', prodError);
          console.log('DEBUG: products query result:', productsData);
          
          if (productsData) {
            productMap = new Map(productsData.map(p => [p.id, {
              name: p.name,
              currentPrice: 0  // Will be set from market store later
            }]));
          }
        }
        
        console.log('DEBUG: productMap:', Array.from(productMap.entries()));
        
        // Step 3: Extract unique product names for display
        const productNames = Array.from(new Set(
          farmerBatches.map((b: any) => {
            const name = productMap.get(b.product_id)?.name || 'Unknown';
            console.log('DEBUG: batch product_id', b.product_id, '-> name:', name);
            return name;
          }).filter(Boolean)
        )) as string[];
        
        setUniqueProducts(productNames);
        console.log(`Farmer products: ${productNames.join(', ')}`);
        
        // Step 4: Get batch_room_allocations for storage costs and net worth
        let query = supabase
          .from('batch_room_allocations')
          .select(`
            quantity_kg,
            room_id,
            batches(
              id,
              product_id,
              initial_quantity_kg,
              snapshot_price_per_kg
            )
          `)
          .in('batch_id', batchIds)
          .is('removed_at', null);
        
        if (activeRoomId) {
          query = query.eq('room_id', activeRoomId);
        }
        
        const { data: allocationData } = await query;
        
        if (allocationData && allocationData.length > 0) {
          // Set batches for finance calculations
          const transformedBatches = allocationData.map((allocation: any) => {
            const batch = Array.isArray(allocation.batches) ? allocation.batches[0] : allocation.batches;
            const productInfo = productMap.get(batch?.product_id) || {name: 'Unknown', currentPrice: 0};
            return {
              product: productInfo.name,
              product_id: batch?.product_id,
              initial_quantity_kg: batch.initial_quantity_kg,
              quantity_kg: allocation.quantity_kg,
              room_id: allocation.room_id,
              snapshot_price_per_kg: batch.snapshot_price_per_kg || 0,
              current_price: productInfo.currentPrice
            };
          });
          setBatches(transformedBatches);
          
          // Calculate storage costs per room with full details
          const roomIds = Array.from(new Set(transformedBatches.map(b => b.room_id))) as string[];
          let detailsMap = new Map<string, {name: string; siteName: string; cost: number}>();
          
          for (const roomId of roomIds) {
            const { data: roomData } = await supabase
              .from('cold_storage_rooms')
              .select('room_name, site_id, storage_rate_per_kg_month')
              .eq('id', roomId)
              .single();
            
            if (!roomData) continue;
            
            const { data: siteData } = await supabase
              .from('sites')
              .select('facility_name')
              .eq('id', roomData.site_id)
              .single();
            
            const ratePerCrate = roomData.storage_rate_per_kg_month || 0; // Stored as per-crate despite column name
            const roomBatches = transformedBatches.filter(b => b.room_id === roomId);
            const totalKg = roomBatches.reduce((sum, b) => sum + b.quantity_kg, 0);
            // Convert kg to crates (1 crate = 25kg) then multiply by rate per crate
            const totalCrates = totalKg / 25;
            const totalCost = totalCrates * ratePerCrate;
            
            detailsMap.set(roomId, {
              name: roomData.room_name || 'Unnamed Room',
              siteName: siteData?.facility_name || 'Unknown Site',
              cost: totalCost
            });
          }
          
          setRoomDetails(detailsMap);
        }
        
        // Step 5: Fetch sales revenue
        try {
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('quantity_kg, selling_price')
            .in('batch_id', batchIds);
          
          if (!salesError && salesData) {
            let totalRevenue = 0;
            if (salesData.length > 0) {
              totalRevenue = salesData.reduce((sum: number, sale: any) => {
                const qty = parseFloat(sale.quantity_kg) || 0;
                const price = parseFloat(sale.selling_price) || 0;
                return sum + (qty * price);
              }, 0);
            }
            setTotalRevenueFromSales(totalRevenue);
          }
        } catch (err) {
          console.error('Error in sales fetch:', err);
        }
        
        setLoading(false);
     };
     load();
  }, [user?.id, activeRoomId]);

  // Calculate net worth directly from batches (don't wait for trigger)
  useEffect(() => {
    const calculateNetWorth = () => {
      if (batches.length === 0) {
        setNetWorthSnapshot(0);
        setNetWorthDynamic(0);
        console.log('📊 No batches, net worth = 0');
        return;
      }

      let totalSnapshotValue = 0;
      let totalDynamicValue = 0;

      for (const batch of batches) {
        // Snapshot value: initial_quantity_kg * snapshot_price_per_kg (saved when batch created)
        const snapshotValue = batch.initial_quantity_kg * (batch.snapshot_price_per_kg || 0);
        totalSnapshotValue += snapshotValue;

        // Current market value: initial_quantity_kg * current_market_price (live)
        const priceData = marketPrices[batch.product];
        const currentPrice = priceData?.price || 0;
        const dynamicValue = batch.initial_quantity_kg * currentPrice;
        totalDynamicValue += dynamicValue;

        console.log('📈 Batch:', {
          product: batch.product,
          qty_kg: batch.initial_quantity_kg,
          snapshot_price: batch.snapshot_price_per_kg,
          snapshot_value: snapshotValue,
          current_price: currentPrice,
          dynamic_value: dynamicValue
        });
      }

      console.log('💰 Net Worth Calculated:', {
        total_snapshot: totalSnapshotValue,
        total_dynamic: totalDynamicValue,
        batches_count: batches.length
      });

      setNetWorthSnapshot(totalSnapshotValue);
      setNetWorthDynamic(totalDynamicValue);
    };

    calculateNetWorth();
  }, [batches, marketPrices]);

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
                 const livePriceData = marketPrices[p];
                 const livePrice = livePriceData?.price || 0;
                 const trend = getTrend(p);
                 const displayPrice = livePrice > 0 ? livePrice : trend.current;
                 
                 return (
                    <Card key={p} className="border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                             <div className="flex items-start justify-between mb-6">
                                 <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p}</h3>
                                    <p className="text-sm font-semibold text-slate-400 mt-0.5 tracking-widest uppercase">
                                      Live Market Price / KG
                                    </p>
                                 </div>
                             </div>

                             <div className="flex items-end gap-3 mb-6">
                                <span className="text-4xl font-extrabold tracking-tight">₹{displayPrice.toFixed(2)}</span>
                                <span className="text-sm text-slate-500 mb-1">
                                  {marketPrices[p]?.market ? `from ${marketPrices[p].market}` : '(fallback)'}
                                </span>
                             </div>
                        </CardContent>
                    </Card>
                 );
             })}
          </div>
      )}
      
      {/* Financial Overview Section - 2 Columns (removed Net Profit) */}
      {displayProducts.length > 0 && batches.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-12 mb-6">
            <IndianRupee className="w-7 h-7 text-emerald-500" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Financial Overview
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Track your storage costs and revenue
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Storage Costs - Per Room Breakdown */}
             <Card className="border border-orange-200 dark:border-orange-800 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 transform transition hover:scale-105 hover:shadow-xl">
                 <CardContent className="p-8">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                             <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                         </div>
                     </div>
                     <p className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Storage Costs</p>
                     
                     {roomDetails.size > 0 ? (
                       <div className="space-y-3">
                         {Array.from(roomDetails.entries()).map(([roomId, details]) => (
                           <div key={roomId} className="bg-white/50 dark:bg-white/10 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30">
                             <div className="flex flex-col gap-1">
                               <p className="text-xs text-orange-700 dark:text-orange-300">
                                 {details.name}
                               </p>
                               <p className="text-xs text-orange-600 dark:text-orange-400 italic">
                                 {details.siteName}
                               </p>
                             </div>
                             <p className="text-lg font-bold text-orange-900 dark:text-orange-100 mt-2">
                               ₹{details.cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                             </p>
                           </div>
                         ))}
                         <div className="border-t-2 border-orange-300 dark:border-orange-700 pt-3 mt-3">
                           <p className="text-xs text-orange-700 dark:text-orange-300 font-bold mb-1">Total Storage Cost</p>
                           <p className="text-3xl font-extrabold text-orange-900 dark:text-orange-100">
                             ₹{Array.from(roomDetails.values()).reduce((a, b) => a + b.cost, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                           </p>
                         </div>
                       </div>
                     ) : (
                       <p className="text-sm text-orange-700 dark:text-orange-300">No storage costs calculated</p>
                     )}
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
                     <p className="text-4xl font-extrabold tracking-tight mb-1 text-emerald-900 dark:text-emerald-100">₹{totalRevenueFromSales.toLocaleString('en-IN')}</p>
                     <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">From orders</p>
                 </CardContent>
             </Card>

             {/* Net Worth */}
             <Card className="border border-blue-200 dark:border-blue-800 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 transform transition hover:scale-105 hover:shadow-xl">
                 <CardContent className="p-8">
                     <div className="flex items-start justify-between mb-4">
                         <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                             <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                         </div>
                     </div>
                     <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">Net Worth</p>
                     
                     <div className="space-y-3">
                       {/* Snapshot Value */}
                       <div className="bg-white/50 dark:bg-white/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                         <p className="text-xs text-blue-600 dark:text-blue-300 font-bold mb-1">When Stored</p>
                         <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                           ₹{netWorthSnapshot.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                         </p>
                       </div>
                       
                       {/* Dynamic Value */}
                       <div className="bg-white/50 dark:bg-white/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                         <p className="text-xs text-blue-600 dark:text-blue-300 font-bold mb-1">Current Market Value</p>
                         <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                           ₹{netWorthDynamic.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                         </p>
                       </div>
                     </div>
                 </CardContent>
             </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default FarmerMarketIntelligence;
