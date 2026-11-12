import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { Package, PackageOpen, Plus, X, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { convertCratesToKg, convertKgToCrates } from '../../utils/units';
import { generateCrateCode } from '../../utils/crateCodeGenerator';

const FarmerInventory: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, setActiveRoomId } = useFarmerStore();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [roomNameMap, setRoomNameMap] = useState<Record<string, string>>({});
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [batchSites, setBatchSites] = useState<Record<string, string>>({});
  
  // Site and Room selection
  const [approvedSites, setApprovedSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [roomPricing, setRoomPricing] = useState<Record<string, number | null>>({});
  
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvedRooms, setApprovedRooms] = useState<any[]>([]);
  const [approvedProducts, setApprovedProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form State
  const [targetRoom, setTargetRoom] = useState(activeRoomId || '');
  const [targetProduct, setTargetProduct] = useState('');
  const [qty, setQty] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  
  // QR Scanner state
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [scannedBatches, setScannedBatches] = useState<Array<{uniqueCode: string; alphanumericCode: string}>>([]);
  
  // Crate code state
  const [hasExistingCode, setHasExistingCode] = useState(false);
  const [manualCrateCode, setManualCrateCode] = useState('');

  const fetchInventory = async (pId: string) => {
       try {
           // Query batch_room_allocations with batches only (no products join here)
           const { data: allocationData, error: allocErr } = await supabase
             .from('batch_room_allocations')
             .select(`
               quantity_kg,
               assigned_at,
               removed_at,
               room_id,
               batches(
                 id,
                 batch_code,
                 alphanumeric_code,
                 farmer_id,
                 product_id,
                 harvest_date,
                 expiry_date,
                 initial_quantity_kg,
                 remaining_quantity_kg,
                 quality_grade,
                 remarks,
                 created_at
               )
             `)
             .eq('batches.farmer_id', pId)
             .is('removed_at', null)
             .order('assigned_at', { ascending: false });

           if (allocErr) {
             console.error('Error fetching inventory:', allocErr);
             setBatches([]);
             return;
           }

           if (!allocationData || allocationData.length === 0) {
             setBatches([]);
             return;
           }

           // Extract product_ids
           const productIds = allocationData
             .map((a: any) => {
               const batch = Array.isArray(a.batches) ? a.batches[0] : a.batches;
               return batch?.product_id;
             })
             .filter(Boolean);

           // Fetch all products in one query
           let productMap: Record<string, string> = {};
           if (productIds.length > 0) {
             const { data: products } = await supabase
               .from('products')
               .select('id, name')
               .in('id', productIds);
             
             if (products) {
               productMap = Object.fromEntries(products.map(p => [p.id, p.name]));
             }
           }

           // Transform the data
           const transformedBatches = allocationData.map((allocation: any) => {
             const batchObj = Array.isArray(allocation.batches) ? allocation.batches[0] : allocation.batches;
             return {
               ...batchObj,
               room_id: allocation.room_id,
               quantity_kg: allocation.quantity_kg,
               assigned_at: allocation.assigned_at,
               product: productMap[batchObj?.product_id] || 'Unknown Product'
             };
           }) || [];

           setBatches(transformedBatches);
           
           // Fetch market prices for each batch based on site locality
           await fetchBatchMarketPrices(transformedBatches);
           
       } catch (error) {
           console.error("FarmerInventory fetch failed:", error);
           setBatches([]);
       }
  };

  const fetchBatchMarketPrices = async (batchList: any[]) => {
    try {
      // Get room info to find site
      const roomIds = [...new Set(batchList.map(b => b.room_id))];
      
      const { data: roomData } = await supabase
        .from('cold_storage_rooms')
        .select('id, site_id')
        .in('id', roomIds);
      
      if (!roomData) return;
      
      const roomToSite: Record<string, string> = {};
      roomData.forEach((room: any) => {
        roomToSite[room.id] = room.site_id;
      });
      
      setBatchSites(roomToSite);
      
      // Fetch prices for each site
      const pricesMap: Record<string, number> = {};
      const uniqueSites = [...new Set(Object.values(roomToSite))];
      
      for (const siteId of uniqueSites) {
        try {
          // Get site locality and state
          const { data: siteData } = await supabase
            .from('sites')
            .select('locality_id, state_id')
            .eq('id', siteId)
            .single();
          
          if (!siteData?.locality_id || !siteData?.state_id) continue;
          
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
          
          if (!localityData?.name || !stateData?.name) continue;
          
          // Query market prices directly from Supabase
          const { data: priceData } = await supabase
            .from('market_prices')
            .select('market_name, price_per_kg')
            .eq('state', stateData.name)
            .eq('city', localityData.name)
            .limit(500);
          
          // Extract prices
          if (priceData && Array.isArray(priceData)) {
            priceData.forEach((priceEntry: any) => {
              const productName = priceEntry.market_name?.split(' Mandi')[0] || '';
              const key = `${siteId}-${productName}`;
              pricesMap[key] = priceEntry.price_per_kg || 0;
            });
          }
        } catch (err) {
          console.log('Error fetching prices for site:', siteId, err);
        }
      }
      
      setMarketPrices(pricesMap);
      
    } catch (error) {
      console.log('Error fetching batch market prices:', error);
    }
  };

  const initialize = async () => {
       setLoading(true);
       try {
           if (!user?.id) return;
           const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
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

           // 2. Products will be fetched when room is selected (from farmer_batch_products table)

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

  // Fetch pricing when modal opens
  useEffect(() => {
    if (isModalOpen && profileId) {
      console.log('🔔 [FarmerInventory] Modal opened, initializing...');
      
      const fetchRoomPricing = async () => {
        const { data: accessData } = await supabase
          .from('farmer_room_access')
          .select('id, room_id, room_access_pricing!left(price_per_crate)')
          .eq('farmer_id', profileId)
          .eq('status', 'Approved');
        
        if (accessData) {
          const pricingMap: Record<string, number | null> = {};
          accessData.forEach((access: any) => {
            const pricing = Array.isArray(access.room_access_pricing) 
              ? access.room_access_pricing[0] 
              : access.room_access_pricing;
            pricingMap[access.room_id] = pricing ? pricing.price_per_crate : null;
          });
          setRoomPricing(pricingMap);
        }
      };
      fetchRoomPricing();

      // Trigger room change to fetch products if a room is already selected
      if (targetRoom) {
        console.log('🔔 [FarmerInventory] Target room already selected, fetching products:', targetRoom);
        handleRoomChange(targetRoom);
      }
    }
  }, [isModalOpen, profileId]);

  const handleSiteChange = (siteId: string) => {
    console.log('🎯 [FarmerInventory] handleSiteChange called with siteId:', siteId);
    setSelectedSiteId(siteId);
    setApprovedProducts([]);
    setTargetProduct('');
    
    const site = approvedSites.find(s => s.id === siteId);
    if (site) {
      console.log('✅ [FarmerInventory] Found site:', site.name, 'with', site.rooms.length, 'rooms');
      setApprovedRooms(site.rooms);
      // Auto-select first room (whether single or multiple)
      if (site.rooms.length > 0) {
        console.log('📍 [FarmerInventory] Auto-selecting first room:', site.rooms[0].id);
        handleRoomChange(site.rooms[0].id);
      } else {
        setTargetRoom('');
      }
    }
  };

  const handleRoomChange = async (roomId: string) => {
    setTargetRoom(roomId);
    setTargetProduct('');
    setApprovedProducts([]);
    
    // Fetch products approved for this room
    if (profileId && roomId) {
      try {
        console.log('🔍 [FarmerInventory] Fetching products for room:', roomId, 'farmer:', profileId);
        
        // Step 1: Get the farmer_room_access record for this room
        const { data: accessData, error: accessErr } = await supabase
          .from('farmer_room_access')
          .select('id, status')
          .eq('farmer_id', profileId)
          .eq('room_id', roomId)
          .eq('status', 'Approved')
          .maybeSingle();

        console.log('📋 [FarmerInventory] farmer_room_access query result:', { accessData, accessErr });

        if (accessErr) {
          console.error('❌ Error querying farmer_room_access:', accessErr);
          setApprovedProducts([]);
          return;
        }

        if (!accessData) {
          console.warn('⚠️ No Approved farmer_room_access record found for this room');
          setApprovedProducts([]);
          return;
        }

        const accessId = accessData.id;
        console.log('✅ Found Approved access record with ID:', accessId);

        // Step 2: Get product_ids from farmer_batch_products
        console.log('🔎 [FarmerInventory] Querying farmer_batch_products for access_id:', accessId);
        const { data: batchProducts, error: batchErr } = await supabase
          .from('farmer_batch_products')
          .select('product_id', { count: 'exact' })
          .eq('farmer_room_access_id', accessId);

        console.log('📊 [FarmerInventory] farmer_batch_products query result:', { 
          count: batchProducts?.length, 
          data: batchProducts, 
          error: batchErr 
        });

        if (batchErr) {
          console.error('❌ Error querying farmer_batch_products:', batchErr);
          setApprovedProducts([]);
          return;
        }

        if (!batchProducts || batchProducts.length === 0) {
          console.warn('⚠️ No products found in farmer_batch_products');
          setApprovedProducts([]);
          return;
        }

        // Step 3: Extract product IDs and fetch product names
        const productIds = batchProducts.map((bp: any) => bp.product_id).filter(Boolean);
        console.log('🆔 Product IDs to fetch:', productIds);

        if (productIds.length === 0) {
          setApprovedProducts([]);
          return;
        }

        const { data: productDetails, error: prodErr } = await supabase
          .from('products')
          .select('id, name, shelf_life_days')
          .in('id', productIds);

        console.log('📦 [FarmerInventory] products query result:', { 
          count: productDetails?.length,
          data: productDetails, 
          error: prodErr 
        });

        if (prodErr) {
          console.error('❌ Error querying products:', prodErr);
          setApprovedProducts([]);
          return;
        }

        const productNames = (productDetails || [])
          .map((p: any) => p.name)
          .filter(Boolean);
        
        console.log('✅ [FarmerInventory] Product names found:', productNames);
        setApprovedProducts(productNames);
      } catch (err) {
        console.error('❌ [FarmerInventory] Unexpected error:', err);
        setApprovedProducts([]);
      }
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError('');

      console.log('📝 [FarmerInventory] handleAddInventory called');

      if (!targetRoom || !targetProduct || !qty || !harvestDate) {
          setSubmitError('Please complete all required fields.');
          console.warn('❌ Missing fields:', { targetRoom, targetProduct, qty, harvestDate });
          return;
      }
      
      // Validate crate code if using existing code
      if (hasExistingCode && !manualCrateCode.trim()) {
          setSubmitError('Please enter the crate code.');
          return;
      }
      
      if (hasExistingCode && !/^[0-9][A-Z]$/.test(manualCrateCode.trim())) {
          setSubmitError('Invalid crate code format. Use format like 3K, 0A, 9Z');
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
         
         // Generate unique alphanumeric code for farmer (0A-9Z format)
         let crateCode = '';
         let codeExists = true;
         let attempts = 0;
         const maxAttempts = 10;
         
         if (hasExistingCode) {
           // Use the code farmer entered
           crateCode = manualCrateCode.trim().toUpperCase();
           console.log('✅ Using farmer-provided crate code:', crateCode);
         } else {
           // Generate new code
           while (codeExists && attempts < maxAttempts) {
             crateCode = generateCrateCode();
             console.log('🎲 Generated crate code attempt:', { crateCode, attempts });
             
             const { data: existingCode } = await supabase
               .from('batches')
               .select('id')
               .eq('farmer_id', profileId)
               .eq('alphanumeric_code', crateCode)
               .maybeSingle();
             
             codeExists = !!existingCode;
             console.log('✅ Code uniqueness check:', { crateCode, codeExists, attempts });
             attempts++;
           }
           
           console.log('✅ Final crate code selected:', crateCode);
           
           if (attempts >= maxAttempts) {
             throw new Error('Could not generate unique crate code. Please try again.');
           }
         }

         // Calculate expiry_date from harvest_date + shelf_life_days
         const harvestDateObj = new Date(harvestDate);
         const expiryDateObj = new Date(harvestDateObj);
         const shelfLifeDays = productData.shelf_life_days || 30; // Default to 30 days if not specified
         expiryDateObj.setDate(expiryDateObj.getDate() + shelfLifeDays);

         // Fetch current market price for snapshot (when stored)
         let snapshotPrice = 0;
         console.log('🔍 Starting snapshot price fetch for product:', targetProduct);
         try {
           // Get farmer's state/locality for market price lookup
           const { data: profile, error: profileErr } = await supabase.from('profiles').select('state, state_id').eq('id', profileId).single();
           console.log('👤 Profile data:', { state: profile?.state, state_id: profile?.state_id, error: profileErr });
           
           let stateName = profile?.state;
           
           // If state name is null, fetch it from states table using state_id
           if (!stateName && profile?.state_id) {
             console.log('📍 state is null, fetching state name from state_id:', profile.state_id);
             const { data: stateData } = await supabase.from('states').select('name').eq('id', profile.state_id).single();
             stateName = stateData?.name;
             console.log('✓ State name resolved to:', stateName);
           }
           
           if (stateName) {
             // Query market prices for this farmer's state and the specific product
             const { data: prices, error: priceErr } = await supabase
               .from('market_prices')
               .select('price_per_kg, market_name')
               .eq('state', stateName)
               .limit(500);
             
             console.log('📊 Market prices query result:', { state: stateName, found: prices?.length || 0, error: priceErr });
             
             if (prices && prices.length > 0) {
               // Find price entry that matches the product name
               const productPrice = prices.find((p: any) => 
                 p.market_name?.toLowerCase().includes(targetProduct.toLowerCase()) || false
               );
               
               if (productPrice) {
                 snapshotPrice = productPrice.price_per_kg;
                 console.log('✅ Snapshot price FOUND from market:', { product: targetProduct, price: snapshotPrice, market: productPrice.market_name });
               } else {
                 // If exact match not found, use average of all prices
                 const validPrices = prices.filter((p: any) => p.price_per_kg && p.price_per_kg > 0);
                 if (validPrices.length > 0) {
                   const avgPrice = validPrices.reduce((sum: number, p: any) => sum + p.price_per_kg, 0) / validPrices.length;
                   snapshotPrice = Math.round(avgPrice * 100) / 100;
                   console.log('⚠️ Using AVERAGE market price:', { product: targetProduct, price: snapshotPrice, avgOf: validPrices.length });
                 }
               }
             } else {
               console.warn('❌ NO market prices found for state:', stateName);
             }
           } else {
             console.warn('❌ Cannot determine state from farmer profile');
           }
         } catch (err) {
           console.error('❌ Error fetching snapshot price:', err);
         }
         
         console.log('🎯 FINAL snapshot_price_per_kg:', snapshotPrice, 'for product:', targetProduct);

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
             snapshot_price_per_kg: snapshotPrice, // Snapshot of market price when stored
             alphanumeric_code: crateCode, // Farmer-friendly crate code (0A-9Z format)
         };

         console.log('🔍 DEBUG: Batch payload:', batchPayload);
         console.log('📌 CRATE CODE IN PAYLOAD:', { crateCode, inPayload: batchPayload.alphanumeric_code });

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
         setHasExistingCode(false);
         setManualCrateCode('');
         
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
         
         <button onClick={() => setIsQRScannerOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-xl shadow-purple-500/20 transform hover:-translate-y-0.5 transition-all">
             <Package className="w-5 h-5"/> Scan Products
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
                            <th className="py-4 px-6">Crate Code</th>
                            <th className="py-4 px-6 text-right">Quantity</th>
                            <th className="py-4 px-6">Facility</th>
                            {/* <th className="py-4 px-6">Quality</th> */}
                            <th className="py-4 px-6">Stored Date</th>
                            <th className="py-4 px-6">Expiry Date</th>
                         </tr>
                      </thead>
                      <tbody>
                         {batches.filter(b => (b.remaining_quantity_kg || 0) > 0).map((b, idx) => {
                            // Convert kg to crates (1 crate = 25kg)
                            const crates = convertKgToCrates(b.initial_quantity_kg);
                            const storedDate = new Date(b.harvest_date || b.assigned_at || b.created_at);
                            const expiryDate = new Date(b.expiry_date);
                            
                            return (
                               <tr key={b.id || idx} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors text-slate-700 dark:text-slate-300 font-medium text-sm">
                                  <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{b.product || 'Unknown Product'}</td>
                                  <td className="py-4 px-6 tracking-wider font-mono text-lg font-bold text-purple-600 dark:text-purple-400">{b.alphanumeric_code || 'N/A'}</td>
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

      {/* CURRENT STOCK SUMMARY SECTION */}
      {batches.filter(b => (b.remaining_quantity_kg || 0) > 0).length > 0 && (
      <Card className="shadow-sm border-slate-200 overflow-hidden mt-6">
         <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
               <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Current Stock Summary</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Overview of available inventory by product</p>
         </div>
         <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {batches.filter(b => (b.remaining_quantity_kg || 0) > 0).map((batch) => {
                  const totalCrates = convertKgToCrates(batch.initial_quantity_kg);
                  const remainingCrates = convertKgToCrates(batch.remaining_quantity_kg || 0);
                  const soldCrates = totalCrates - remainingCrates;
                  const soldPercentage = ((soldCrates / totalCrates) * 100).toFixed(0);
                  const expiryDate = new Date(batch.expiry_date);
                  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                  const isExpired = daysUntilExpiry <= 0;
                  
                  // Get market price for this batch
                  const siteId = batchSites[batch.room_id] || '';
                  const priceKey = `${siteId}-${batch.product}`;
                  const currentMarketPrice = marketPrices[priceKey] || 0;
                  const snapshotPrice = batch.snapshot_price_per_kg || 0;
                  
                  // Calculate values
                  const snapshotValue = (batch.remaining_quantity_kg || 0) * snapshotPrice;
                  const currentValue = (batch.remaining_quantity_kg || 0) * currentMarketPrice;

                  return (
                     <div key={batch.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow">
                        {/* Product & Batch */}
                        <div className="mb-4">
                           <h3 className="font-bold text-slate-900 dark:text-white text-base">{batch.product || 'Unknown'}</h3>
                           <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1">Code: {batch.alphanumeric_code || 'N/A'}</p>
                        </div>

                        {/* Stock Progress */}
                        <div className="mb-4">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Stock Level</span>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{remainingCrates} / {totalCrates} Crates</span>
                           </div>
                           <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                 className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all"
                                 style={{ width: `${Math.min((remainingCrates / totalCrates) * 100, 100)}%` }}
                              ></div>
                           </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                           <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded">
                              <p className="text-slate-500 dark:text-slate-400 font-medium">Sold</p>
                              <p className="text-lg font-bold text-slate-900 dark:text-white">{soldCrates}</p>
                              <p className="text-slate-400 text-[10px]">{soldPercentage}% delivered</p>
                           </div>
                           <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                              <p className="text-emerald-700 dark:text-emerald-400 font-medium">Available</p>
                              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{remainingCrates}</p>
                              <p className="text-slate-400 text-[10px]">to sell</p>
                           </div>
                        </div>

                        {/* Expiry Status */}
                        <div className={`p-2 rounded text-xs font-medium text-center ${
                           isExpired 
                              ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
                              : isExpiringSoon 
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                        }`}>
                           {isExpired 
                              ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                              : isExpiringSoon
                              ? `Expires in ${daysUntilExpiry} days`
                              : `Expires in ${daysUntilExpiry} days`
                           }
                        </div>
                     </div>
                  );
               })}
            </div>
         </CardContent>
      </Card>
      )}

      {/* ADD INVENTORY MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)}></div>
              <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
                  <div className="sticky top-0 flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shrink-0">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Add New Product</h2>
                      <button onClick={() => setIsModalOpen(false)} disabled={submitting} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 disabled:opacity-50 flex-shrink-0">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <form onSubmit={handleAddInventory} className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col">
                      {submitError && (
                          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-900/40 rounded-xl text-sm font-medium flex gap-3 items-start">
                             <AlertTriangle className="w-5 h-5 shrink-0" />
                             <p>{submitError}</p>
                          </div>
                      )}

                      <div className="space-y-5">
                          <div>
                              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Site</label>
                              <select 
                                  required 
                                  value={selectedSiteId} 
                                  onChange={(e) => handleSiteChange(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                              >
                                  <option value="" disabled>Select a site...</option>
                                  {approvedSites.map(s => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                              </select>
                          </div>

                          {/* Always show room selector */}
                          <div>
                              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Storage Room</label>
                              <select 
                                  required 
                                  value={targetRoom} 
                                  onChange={(e) => handleRoomChange(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                              >
                                  <option value="" disabled>Select a room...</option>
                                  {approvedRooms.length > 0 ? (
                                    approvedRooms.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))
                                  ) : (
                                    <option disabled>No rooms available</option>
                                  )}
                              </select>
                          </div>

                          {/* Show room pricing if available */}
                          {targetRoom && roomPricing[targetRoom] !== undefined && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {roomPricing[targetRoom] !== null 
                                  ? `₹${roomPricing[targetRoom]}/crate (Owner Set)` 
                                  : '⏳ Owner has not set pricing yet'}
                              </p>
                            </div>
                          )}

                          <div>
                              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Product Type (Owner Approved)</label>
                              <select 
                                  required 
                                  value={targetProduct} 
                                  onChange={(e) => setTargetProduct(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                              >
                                  <option value="" disabled>
                                    {!targetRoom ? 'Select a room first...' : approvedProducts.length === 0 ? 'No products approved for this room' : 'Select a product...'}
                                  </option>
                                  {approvedProducts.map(p => (
                                      <option key={p} value={p}>{p}</option>
                                  ))}
                              </select>
                          </div>

                          <div>
                              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Quantity (Crates)</label>
                              <input 
                                  type="number" 
                                  min="1" 
                                  required 
                                  value={qty} 
                                  onChange={(e) => setQty(e.target.value)} 
                                  placeholder="Enter number of crates" 
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                              />
                              <p className="text-xs text-slate-500 mt-1.5 font-medium">1 Crate = 25 kg</p>
                          </div>
                          
                          <div>
                              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Storage Date</label>
                              <input 
                                  type="date" 
                                  required 
                                  value={harvestDate} 
                                  onChange={(e) => setHarvestDate(e.target.value)}
                                  max={new Date().toISOString().split('T')[0]}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                              />
                              <p className="text-xs text-slate-500 mt-1.5 font-medium">Defaults to today. You can change if adding later.</p>
                          </div>

                          {/* Crate Code Selection */}
                          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                                  <input 
                                      type="checkbox" 
                                      checked={hasExistingCode}
                                      onChange={(e) => {
                                          setHasExistingCode(e.target.checked);
                                          if (!e.target.checked) setManualCrateCode('');
                                      }}
                                      className="w-4 h-4 accent-purple-600 cursor-pointer"
                                  />
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                      I have an existing crate code (written on physical crate)
                                  </span>
                              </label>

                              {hasExistingCode ? (
                                  <div>
                                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Enter Crate Code (Format: 0A-9Z)</label>
                                      <input 
                                          type="text" 
                                          maxLength={2}
                                          value={manualCrateCode}
                                          onChange={(e) => setManualCrateCode(e.target.value.toUpperCase())}
                                          className="w-full bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded-lg p-3 text-center text-lg font-bold text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500 outline-none"
                                      />
                                      <p className="text-xs text-slate-500 mt-2">Enter the code written on your physical crate</p>
                                  </div>
                              ) : null}
                          </div>
                      </div>

                      <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                          <button type="button" disabled={submitting} onClick={() => setIsModalOpen(false)} className="px-4 sm:px-5 py-2.5 font-bold text-xs sm:text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                          <button type="submit" disabled={submitting} className="px-4 sm:px-5 py-2.5 font-bold text-xs sm:text-sm text-white bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20 flex items-center justify-center min-w-[100px] rounded-lg">
                              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Product'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      
      {/* QR SCANNER MODAL - PLACEHOLDER */}
      {isQRScannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md max-h-96 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Scan Product Barcode</h2>
                      <button
                          onClick={() => setIsQRScannerOpen(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Scanner Area - Placeholder */}
                  <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800">
                      <div className="w-32 h-32 border-4 border-dashed border-purple-400 rounded-lg flex items-center justify-center mb-4 bg-purple-50 dark:bg-purple-900/20">
                          <Package className="w-16 h-16 text-purple-400" />
                      </div>
                      <p className="text-center text-slate-600 dark:text-slate-300 font-semibold mb-2">
                          QR Scanner Placeholder
                      </p>
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-4">
                          Ready to scan barcodes from product packaging
                      </p>
                      <p className="text-center text-xs text-slate-400 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
                          Scanner functionality coming soon
                      </p>
                  </div>

                  {/* Scanned Items Preview */}
                  {scannedBatches.length > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Scanned Items:</p>
                          <div className="space-y-2">
                              {scannedBatches.map((batch, idx) => (
                                  <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                      <p className="text-xs font-mono text-slate-600 dark:text-slate-400">Batch: {batch.uniqueCode}</p>
                                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1">Code: {batch.alphanumericCode}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Footer */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                      <button
                          type="button"
                          onClick={() => {
                              setIsQRScannerOpen(false);
                              setScannedBatches([]);
                          }}
                          className="px-4 py-2.5 font-bold text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                      >
                          Close
                      </button>
                      <button
                          type="button"
                          disabled={scannedBatches.length === 0}
                          className="px-4 py-2.5 font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-lg shadow-purple-500/20"
                      >
                          Process Scans ({scannedBatches.length})
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FarmerInventory;

