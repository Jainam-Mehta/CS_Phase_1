import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Plus, Building, User, Warehouse, Clock, CheckCircle, XCircle, Briefcase, Users, IndianRupee, Save, Edit2, CreditCard, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logPaymentReceived } from '../../lib/activityLogger';

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [stakeholderRequests, setStakeholderRequests] = useState<any[]>([]);
  const [stakeholderPayments, setStakeholderPayments] = useState<any[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentInvestment, setSelectedPaymentInvestment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Facilities Details State
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [editingPricing, setEditingPricing] = useState<{facilityId: string, farmerId: string} | null>(null);
  const [pricingInput, setPricingInput] = useState<string>('');

  const {
    doorAlerts,
    marketUpdates,
    weeklyReports,
    aiRecommendations,
    appearance,
    language,
    setDoorAlerts,
    setMarketUpdates,
    setWeeklyReports,
    setAiRecommendations,
    setAppearance,
    setLanguage,
    resetSettings,
  } = useSettingsStore();

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (user?.role === 'farmer') {
         loadMyRequests();
    } else if (user?.role === 'stakeholder') {
         loadStakeholderRequests();
         
         // Setup real-time listener for stakeholder_investments changes
         const setupRealtimeListener = async () => {
           const { data: { user: authUser } } = await supabase.auth.getUser();
           if (authUser?.id) {
             // Unsubscribe from old channel if exists
             if (channelRef.current) {
               await supabase.removeChannel(channelRef.current);
             }

             // Create new channel with callback BEFORE subscribe
             const channel = supabase.channel(`stakeholder-investments-${authUser.id}`)
               .on(
                 'postgres_changes',
                 {
                   event: '*',
                   schema: 'public',
                   table: 'stakeholder_investments',
                   filter: `stakeholder_id=eq.${authUser.id}`
                 },
                 () => {
                   console.log('Real-time update detected for investments');
                   fetchStakeholderInvestmentsData(authUser.id);
                 }
               )
               .subscribe();
             
             channelRef.current = channel;
           }
         };
         
         setupRealtimeListener();
         
         // Cleanup on unmount
         return () => {
           if (channelRef.current) {
             supabase.removeChannel(channelRef.current);
             channelRef.current = null;
           }
         };
    }
    // Sites Details section moved to dedicated SitesDetails component
  }, [user?.id]);

  const loadMyRequests = async () => {
    if (!user?.id) return;
    try {
        setLoadingReqs(true);
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (!profile) {
          console.error('Profile not found for user:', user.id);
          return;
        }
        
        const { data, error } = await supabase
          .from('farmer_room_access')
          .select(`
            id, status, requested_at, remarks,
            cold_storage_rooms(room_name, room_code, site_id, sites(facility_name, owner_profile_id, profiles!owner_profile_id(full_name)))
          `)
          .eq('farmer_id', profile.id)
          .order('requested_at', { ascending: false });
        
        if (error) {
          console.error('Error loading requests:', error);
          return;
        }
        
        // Fetch pricing separately for each access record
        if (data && data.length > 0) {
          const accessIds = (data as any[]).map(req => req.id);
          const { data: pricingData } = await supabase
            .from('room_access_pricing')
            .select('room_access_id, price_per_crate, approved_at')
            .in('room_access_id', accessIds);
          
          const pricingMap = new Map((pricingData || []).map(p => [
            p.room_access_id,
            [{ price_per_crate: p.price_per_crate, approved_at: p.approved_at }]
          ]));
          
          // Add pricing data to each request
          (data as any[]).forEach(req => {
            req.room_access_pricing = pricingMap.get(req.id) || [];
          });
        }
          
        // Fetch owner names for each request
        if (data && data.length > 0) {
          // Build a map of owner names from the nested data
          const ownerNameMap = new Map<string, string>();
          
          (data as any[]).forEach(req => {
            const room = Array.isArray(req.cold_storage_rooms) ? req.cold_storage_rooms[0] : req.cold_storage_rooms;
            const site = Array.isArray(room?.sites) ? room?.sites[0] : room?.sites;
            const ownerProfileId = site?.owner_profile_id;
            
            // Get owner name from nested profiles data if available
            if (ownerProfileId && site) {
              // Try to get full_name from the profiles object if it exists
              const profiles = site.profiles || site;
              const fullName = profiles?.full_name || 
                              `${profiles?.first_name || ''} ${profiles?.last_name || ''}`.trim() ||
                              'Unknown Owner';
              ownerNameMap.set(ownerProfileId, fullName);
            }
          });
          
          // Enrich data with owner names
          (data as any[]).forEach(req => {
            const room = Array.isArray(req.cold_storage_rooms) ? req.cold_storage_rooms[0] : req.cold_storage_rooms;
            const site = Array.isArray(room?.sites) ? room?.sites[0] : room?.sites;
            const ownerProfileId = site?.owner_profile_id;
            const ownerName = ownerProfileId ? ownerNameMap.get(ownerProfileId) : undefined;
            (req as any)._ownerName = ownerName || 'Unknown Owner';
          });
        }
        
        console.log('Requests loaded:', data);
        if (data) setRequests(data);
    } catch (err) {
        console.error('Request loading failure', err);
    } finally {
        setLoadingReqs(false);
    }
  };

  const loadStakeholderRequests = async () => {
     if (!user?.id) return;
     try {
         setLoadingReqs(true);
         const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
         if (!profile) return;
         
         await fetchStakeholderInvestmentsData(profile.id);
         
         // Load payments for these investments
         loadStakeholderPayments(profile.id);
     } catch (err) {
         console.error('Failed loading investments', err);
     } finally {
         setLoadingReqs(false);
     }
  };

  const fetchStakeholderInvestmentsData = async (stakeholderId: string) => {
     try {
         // Get ONLY approved/pending investments (not interests)
         // stakeholder_interest is just for browsing, investments are actual money
         let investments: any[] = [];
         try {
           const { data: investmentsData } = await supabase
              .from('stakeholder_investments')
              .select(`
                 id, site_id, investment_amount_inr, investment_date, status,
                 sites(
                   id,
                   facility_name,
                   owner_profile_id,
                   profiles(full_name)
                 )
              `)
              .eq('stakeholder_id', stakeholderId)
              .order('investment_date', { ascending: false });

           if (investmentsData && investmentsData.length > 0) {
             investments = investmentsData.map(inv => {
               const siteData = Array.isArray(inv.sites) ? inv.sites[0] : inv.sites;
               const profilesData = siteData?.profiles;
               const ownerProfile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
               return {
                 ...inv,
                 site_name: siteData?.facility_name || 'Unknown Facility',
                 owner_name: (ownerProfile as any)?.full_name || 'Unknown Owner'
               };
             });
           }
         } catch (err) {
           console.warn('Could not fetch stakeholder investments:', err);
         }

         // Transform investments for display
         const combined = (investments || []).map(inv => ({
           id: inv.id,
           site_id: inv.site_id,
           facility_name: inv.site_name,
           owner_name: inv.owner_name,
           created_at: inv.investment_date,
           investment_amount: inv.investment_amount_inr,
           status: inv.status === 'Active' || inv.status === 'active' ? 'Approved' : (inv.status || 'Pending')
         }));

         console.log('Investments from DB:', investments.map(i => ({ id: i.id, site: i.site_name, owner: i.owner_name, status: i.status })));
         console.log('Transformed display data:', combined.map(c => ({ id: c.id, facility: c.facility_name, owner: c.owner_name, status: c.status })));

         setStakeholderRequests(combined);
     } catch (err) {
         console.error('Failed fetching investments data', err);
     }
  };

  const loadStakeholderPayments = async (stakeholderId: string) => {
    try {
      const { data } = await supabase
        .from('stakeholder_payments')
        .select(`
          id,
          investment_id,
          amount_inr,
          payment_status,
          payment_date,
          received_by_owner_at,
          remarks,
          created_at,
          stakeholder_investments(
            site_id,
            sites(
              facility_name,
              owner_profile_id,
              profiles(full_name)
            )
          )
        `)
        .eq('stakeholder_id', stakeholderId)
        .order('created_at', { ascending: false });

      if (data) {
        const enrichedPayments = data.map(payment => {
          const investment = Array.isArray(payment.stakeholder_investments) 
            ? payment.stakeholder_investments[0] 
            : payment.stakeholder_investments;
          const siteData = Array.isArray(investment?.sites) 
            ? investment?.sites[0] 
            : investment?.sites;
          const profilesData = siteData?.profiles;
          const ownerProfile = Array.isArray(profilesData) ? profilesData[0] : profilesData;
          
          return {
            ...payment,
            facility_name: siteData?.facility_name || 'Unknown Facility',
            owner_name: (ownerProfile as any)?.full_name || 'Unknown Owner'
          };
        });
        setStakeholderPayments(enrichedPayments);
      }
    } catch (err) {
      console.error('Failed loading payments', err);
    }
  };

  const handleAddPayment = async () => {
    if (!user?.id || !selectedPaymentInvestment || !paymentAmount) return;

    setPaymentLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('id, full_name').eq('id', user.id).maybeSingle();
      if (!profile) throw new Error('Profile not found');

      // Get the investment to retrieve stakeholder name, facility name, and owner info
      const investment = stakeholderRequests.find(inv => inv.id === selectedPaymentInvestment);
      if (!investment) throw new Error('Investment not found');

      const { error } = await supabase
        .from('stakeholder_payments')
        .insert({
          investment_id: selectedPaymentInvestment,
          stakeholder_id: profile.id,
          amount_inr: parseInt(paymentAmount),
          payment_status: 'Completed', // Auto-complete on submission
          payment_date: new Date().toISOString(),
          remarks: paymentRemarks || null,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Log payment received activity for owner notification
      try {
        // Get owner info for this site
        const { data: site } = await supabase
          .from('sites')
          .select('id, owner_profile_id, facility_name, profiles(full_name)')
          .eq('id', investment.site_id)
          .single();

        if (site && site.owner_profile_id) {
          const ownerData = Array.isArray(site.profiles) ? site.profiles[0] : site.profiles;
          const ownerName = (ownerData as any)?.full_name || 'Owner';
          
          await logPaymentReceived(
            site.owner_profile_id,
            ownerName,
            profile.id,
            profile.full_name || 'Stakeholder',
            investment.site_id,
            investment.facility_name || site.facility_name || 'Unknown Site',
            parseInt(paymentAmount),
            selectedPaymentInvestment
          );
        }
      } catch (logErr) {
        console.error('Failed to log payment activity:', logErr);
        // Don't throw - payment was still created successfully
      }

      // Reload payments
      loadStakeholderPayments(profile.id);
      
      // Reset form
      setShowPaymentModal(false);
      setSelectedPaymentInvestment(null);
      setPaymentAmount('');
      setPaymentRemarks('');
    } catch (err) {
      console.error('Failed to add payment:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const loadFacilitiesWithFarmers = async () => {
    if (!user?.id) return;
    try {
      setLoadingFacilities(true);
      
      // Get owner's profile
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (!profile) return;
      
      // Get all sites owned by this owner using owner_profile_id
      const { data: sitesData, error: siteError } = await supabase
        .from('sites')
        .select('id, facility_name, created_at')
        .eq('owner_profile_id', profile.id)
        .order('facility_name');
      
      if (siteError) throw siteError;
      if (!sitesData || sitesData.length === 0) {
        setFacilities([]);
        return;
      }
      
      // For each site, get approved farmers with their pricing
      const facilitiesWithFarmers = await Promise.all(
        sitesData.map(async (facility: any) => {
          console.log('Processing site:', facility.facility_name);
          
          // Get rooms for this site
          const { data: rooms, error: roomError } = await supabase
            .from('cold_storage_rooms')
            .select('id')
            .eq('site_id', facility.id);
          
          console.log('Rooms query result:', { rooms, roomError, siteId: facility.id });
          
          // If no rooms, show site anyway (empty farmers list)
          if (!rooms || rooms.length === 0) {
            console.log('No rooms found for site, returning empty farmers');
            return { ...facility, farmers: [] };
          }
          
          const roomIds = rooms.map(r => r.id);
          console.log('Room IDs:', roomIds);
          
          // Get approved farmer accesses for these rooms
          const { data: accesses, error: accessError } = await supabase
            .from('farmer_room_access')
            .select('id, farmer_id')
            .in('room_id', roomIds)
            .eq('status', 'Approved');

          console.log('Farmer accesses query result:', { accesses, accessError, roomIds });
          
          if (accessError) {
            console.error('Error fetching farmer accesses:', accessError);
            return { ...facility, farmers: [] };
          }
          
          // For each access, get the farmer name from profiles table
          if (!accesses || accesses.length === 0) {
            return { ...facility, farmers: [] };
          }

          const farmerIds = accesses.map(a => a.farmer_id);
          const { data: farmerProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', farmerIds);

          const farmerNameMap = new Map((farmerProfiles || []).map(f => [
            f.id,
            f.full_name || 'Unknown Farmer'
          ]));
          
          // Now get pricing for each access record
          const accessIds = accesses.map(a => a.id);
          const { data: pricingData } = await supabase
            .from('room_access_pricing')
            .select('room_access_id, price_per_crate')
            .in('room_access_id', accessIds);
          
          const pricingMap = new Map((pricingData || []).map(p => [
            p.room_access_id,
            p.price_per_crate
          ]));
          
          // Group by farmer
          const farmerMap = new Map();
          accesses.forEach((access: any) => {
            const farmerName = farmerNameMap.get(access.farmer_id) || 'Unknown Farmer';
            const pricePerCrate = pricingMap.get(access.id) || null;
              
            if (!farmerMap.has(access.farmer_id)) {
              farmerMap.set(access.farmer_id, {
                farmerId: access.farmer_id,
                farmerName: farmerName,
                pricePerCrate: pricePerCrate,
                accessId: access.id
              });
            }
          });
          
          return {
            ...facility,
            farmers: Array.from(farmerMap.values())
          };
        })
      );
      
      setFacilities(facilitiesWithFarmers);
    } catch (err) {
      console.error('Failed loading facilities with farmers:', err);
    } finally {
      setLoadingFacilities(false);
    }
  };

  const handleSavePricing = async (facilityId: string, farmerId: string, accessId: string) => {
    try {
      const price = parseFloat(pricingInput);
      if (isNaN(price) || price <= 0) {
        alert('Please enter a valid price greater than 0');
        return;
      }
      
      console.log('Saving pricing:', { accessId, price });
      
      // First check if pricing record exists for this room_access_id
      const { data: existingPricing, error: checkError } = await supabase
        .from('room_access_pricing')
        .select('id')
        .eq('room_access_id', accessId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      let error;
      
      if (existingPricing) {
        // Update existing record
        const result = await supabase
          .from('room_access_pricing')
          .update({ 
            price_per_crate: price,
            approved_at: new Date().toISOString()
          })
          .eq('room_access_id', accessId);
        error = result.error;
        console.log('Updated existing pricing record:', existingPricing.id);
      } else {
        // Insert new record
        const result = await supabase
          .from('room_access_pricing')
          .insert({ 
            room_access_id: accessId,
            price_per_crate: price,
            approved_at: new Date().toISOString()
          });
        error = result.error;
        console.log('Inserted new pricing record for accessId:', accessId);
      }
      
      if (error) throw error;
      
      // Update local state
      setFacilities(prev => prev.map(facility => {
        if (facility.id === facilityId) {
          return {
            ...facility,
            farmers: facility.farmers.map((f: any) => 
              f.farmerId === farmerId ? { ...f, pricePerCrate: price } : f
            )
          };
        }
        return facility;
      }));
      
      setEditingPricing(null);
      setPricingInput('');
      
      // Reload facilities data to verify persistence
      await loadFacilitiesWithFarmers();
      
      console.log('✓ Pricing saved successfully:', { facilityId, farmerId, price });
    } catch (err) {
      console.error('Failed to update pricing:', err);
      alert('Failed to update pricing. Please try again.');
    }
  };

  const startEditingPricing = (facilityId: string, farmerId: string, currentPrice: number | null) => {
    setEditingPricing({ facilityId, farmerId });
    setPricingInput(currentPrice?.toString() || '');
  };

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleSave = () => {
    // Settings are already persisted reactively via useSettingsStore (Zustand persist)
    // Show a brief success banner instead of a blocking alert()
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setResetConfirm(true);
  };

  const confirmReset = () => {
    resetSettings();
    setResetConfirm(false);
  };

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'Approved':
          case 'Invested': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800"><CheckCircle className="w-3 h-3" /> {status}</span>;
          case 'Rejected': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium border border-red-200 dark:border-red-800"><XCircle className="w-3 h-3" /> Rejected</span>;
          default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800"><Clock className="w-3 h-3" /> Pending</span>;
      }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pt-6 px-4 pb-12">
      {/* Save success banner */}
      {saveSuccess && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-xl">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium text-sm">Settings saved successfully!</span>
        </div>
      )}

      {/* Reset confirmation modal */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Reset Settings?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              This will restore all settings to their defaults. Your account data won't be affected.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setResetConfirm(false)} className="flex-1">Cancel</Button>
              <Button variant="primary" onClick={confirmReset} className="flex-1 bg-red-600 hover:bg-red-700 border-red-600">Reset</Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and application logic
        </p>
      </div>

      {/* Sites Management (Owner Only) - MOVED TO SitesDetails.tsx */}

      {/* Storage Access Management (Farmer Only) */}
      {user?.role === 'farmer' && (
        <div className="space-y-6">
           <Card variant="default" className="border-t-4 border-t-emerald-500 shadow-md">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-900/10">
               <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                 <Warehouse className="w-5 h-5" /> Request More Storage
               </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                   <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed">
                     Need more capacity or another cold storage? Send a new room access request to another facility in your network area seamlessly securely without duplicating profile requirements.
                   </p>
                 </div>
                 <Button variant="primary" onClick={() => navigate('/storage-selection?mode=extension')} className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 shadow-sm border-transparent flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Request Storage Access
                 </Button>
               </div>
               {location.search.includes('extended') && (
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-3 border border-emerald-100 dark:border-emerald-800/30">
                     <CheckCircle className="w-5 h-5" />
                     <div>
                         <p className="font-semibold text-sm">Request Submitted successfully!</p>
                         <p className="text-xs">Your request has been sent to the Cold Storage Owner. Check requests below for status updates instantly.</p>
                     </div>
                  </div>
               )}
             </CardContent>
           </Card>

           <Card variant="default">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800">
               <CardTitle className="text-lg">My Storage Requests</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-800/50">
                     <tr>
                       <th className="px-6 py-4 font-semibold">Owner Name</th>
                       <th className="px-6 py-4 font-semibold">Site</th>
                       <th className="px-6 py-4 font-semibold">Room</th>
                       <th className="px-6 py-4 font-semibold">Requested On</th>
                       <th className="px-6 py-4 font-semibold">Status</th>
                       <th className="px-6 py-4 font-semibold text-right">Price per Crate</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {requests.length > 0 ? (
                        requests.map((req, idx) => {
                          // Extract data from nested structure
                          const room = req.cold_storage_rooms;
                          const site = room?.sites;
                          const ownerName = req._ownerName || 'Unknown Owner';
                          const siteName = site?.facility_name || 'Unknown Site';
                          const roomName = room?.room_name || 'Unknown Room';
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{ownerName}</td>
                              <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{siteName}</td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">{roomName}</td>
                              <td className="px-6 py-4 text-gray-500">{new Date(req.requested_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                              <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                              <td className="px-6 py-4 text-right text-gray-900 dark:text-white font-semibold">
                                {req.room_access_pricing?.[0]?.price_per_crate ? (
                                  <span className="flex items-center justify-end gap-1">
                                    <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    {req.room_access_pricing[0].price_per_crate.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            No storage requests yet. Submit your first request to get started!
                          </td>
                        </tr>
                      )}
                    </tbody>
                 </table>
               </div>
             </CardContent>
           </Card>
        </div>
      )}

      {/* Payment Modal - REMOVED FOR STAKEHOLDERS */}
      
      {/* Payment Modal */}
      {showPaymentModal && user?.role === 'stakeholder' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Investment
                </label>
                <select
                  value={selectedPaymentInvestment || ''}
                  onChange={(e) => setSelectedPaymentInvestment(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select an investment</option>
                  {stakeholderRequests.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.facility_name} - {inv.owner_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Bank transfer reference, payment method, etc."
                  rows={3}
                />
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Payment will be credited directly to your investment account.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleAddPayment}
                  disabled={paymentLoading || !selectedPaymentInvestment || !paymentAmount}
                >
                  {paymentLoading ? 'Adding...' : 'Add Payment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Profile Management (Generic roles outside Farmer constraint hooks) */}
      {user?.role !== 'farmer' && user?.role !== 'stakeholder' && (
        <Card variant="default">
          <CardHeader>
            <CardTitle>Profile Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">View & Edit Profile</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-1">
                  Manage your personal information, location details, and account settings in the dedicated profile page.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/owner/profile')} className="flex items-center gap-2">
                <User className="w-4 h-4" /> Go to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Section - Only for Owners/Farmers */}
      {user?.role !== 'stakeholder' && (
        <Card variant="default">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Door Alerts</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when storage door is left open</p>
                </div>
                <button
                  onClick={() => setDoorAlerts(!doorAlerts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ doorAlerts ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700' }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ doorAlerts ? 'translate-x-6' : 'translate-x-1' }`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Market Updates</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive market price changes and trends</p>
                </div>
                <button
                  onClick={() => setMarketUpdates(!marketUpdates)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ marketUpdates ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700' }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ marketUpdates ? 'translate-x-6' : 'translate-x-1' }`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Weekly Reports</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get weekly summary reports via email</p>
                </div>
                <button
                  onClick={() => setWeeklyReports(!weeklyReports)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ weeklyReports ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700' }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ weeklyReports ? 'translate-x-6' : 'translate-x-1' }`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">AI Recommendations</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive AI-powered insights and suggestions</p>
                </div>
                <button
                  onClick={() => setAiRecommendations(!aiRecommendations)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ aiRecommendations ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700' }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ aiRecommendations ? 'translate-x-6' : 'translate-x-1' }`} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance Section */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
              <input type="radio" name="appearance" value="light" checked={appearance === 'light'} onChange={(e) => setAppearance(e.target.value as 'light' | 'dark' | 'system')} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-slate-600" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">Light</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
              <input type="radio" name="appearance" value="dark" checked={appearance === 'dark'} onChange={(e) => setAppearance(e.target.value as 'light' | 'dark' | 'system')} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-slate-600" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">Dark</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
              <input type="radio" name="appearance" value="system" checked={appearance === 'system'} onChange={(e) => setAppearance(e.target.value as 'light' | 'dark' | 'system')} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-slate-600" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">System Auto</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Language Section */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Language</CardTitle>
        </CardHeader>
        <CardContent>
          <select value={language} onChange={(e) => setLanguage(e.target.value as 'english' | 'hindi')} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white font-medium transition-colors">
            <option value="english">🇺🇸 English</option>
            <option value="hindi">🇮🇳 Hindi - हिंदी</option>
          </select>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <Button variant="primary" onClick={handleSave} className="flex-1 sm:flex-none">Save Changes</Button>
        <Button variant="outline" onClick={handleReset} className="flex-1 sm:flex-none">Reset Configuration</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
