import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Plus, Building, User, Warehouse, Clock, CheckCircle, XCircle, Briefcase, Users, IndianRupee, Save, Edit2, CreditCard, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

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

  useEffect(() => {
    if (user?.role === 'farmer') {
         loadMyRequests();
    } else if (user?.role === 'stakeholder') {
         loadStakeholderRequests();
    } else if (user?.role === 'owner') {
         loadFacilitiesWithFarmers();
    }
  }, [user?.id]);

  const loadMyRequests = async () => {
    if (!user?.id) return;
    try {
        setLoadingReqs(true);
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
        if (!profile) return;
        
        const { data } = await supabase
          .from('farmer_room_access')
          .select(`
            id, status, requested_at, remarks,
            cold_storage_rooms(room_name, facilities(facility_name))
          `)
          .eq('farmer_id', profile.id)
          .order('requested_at', { ascending: false });
          
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
         const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
         if (!profile) return;
         
         const { data } = await supabase
            .from('stakeholder_investments')
            .select(`
               id, facility_id, investment_amount, investment_date,
               facilities(facility_name)
            `)
            .eq('stakeholder_id', profile.id)
            .order('investment_date', { ascending: false });
            
         if (data) setStakeholderRequests(data);
         
         // Load payments for these investments
         loadStakeholderPayments(profile.id);
     } catch (err) {
         console.error('Failed loading investments', err);
     } finally {
         setLoadingReqs(false);
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
          created_at
        `)
        .eq('stakeholder_id', stakeholderId)
        .order('created_at', { ascending: false });

      if (data) setStakeholderPayments(data);
    } catch (err) {
      console.error('Failed loading payments', err);
    }
  };

  const handleAddPayment = async () => {
    if (!user?.id || !selectedPaymentInvestment || !paymentAmount) return;

    setPaymentLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('stakeholder_payments')
        .insert({
          investment_id: selectedPaymentInvestment,
          stakeholder_id: profile.id,
          amount_inr: parseInt(paymentAmount),
          payment_status: 'Pending',
          remarks: paymentRemarks || null,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

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
        .eq('auth_user_id', authUser.id)
        .single();

      if (!profile) return;
      
      // Get all facilities owned by this owner using owner_profile_id
      const { data: facilitiesData, error: facilityError } = await supabase
        .from('facilities')
        .select('id, facility_name, capacity_kg, current_utilization_kg, created_at')
        .eq('owner_profile_id', profile.id)
        .order('facility_name');
      
      if (facilityError) throw facilityError;
      if (!facilitiesData || facilitiesData.length === 0) {
        setFacilities([]);
        return;
      }
      
      // For each facility, get approved farmers with their pricing
      const facilitiesWithFarmers = await Promise.all(
        facilitiesData.map(async (facility) => {
          // Get rooms for this facility
          const { data: rooms } = await supabase
            .from('cold_storage_rooms')
            .select('id')
            .eq('facility_id', facility.id);
          
          // If no rooms, show facility anyway (empty farmers list)
          if (!rooms || rooms.length === 0) {
            return { ...facility, farmers: [] };
          }
          
          const roomIds = rooms.map(r => r.id);
          
          // Get approved farmer accesses for these rooms
          const { data: accesses } = await supabase
            .from('farmer_room_access')
            .select(`
              id,
              farmer_id,
              price_per_crate,
              profiles!farmer_room_access_farmer_id_fkey(
                id,
                full_name,
                auth_user_id
              )
            `)
            .in('room_id', roomIds)
            .eq('status', 'Approved');
          
          // Group by farmer (since we're treating 1 facility = 1 room concept)
          const farmerMap = new Map();
          if (accesses) {
            accesses.forEach(access => {
              const farmerProfile = Array.isArray(access.profiles) ? access.profiles[0] : access.profiles;
              if (farmerProfile && !farmerMap.has(access.farmer_id)) {
                farmerMap.set(access.farmer_id, {
                  farmerId: access.farmer_id,
                  farmerName: farmerProfile.full_name || 'Unknown Farmer',
                  pricePerCrate: access.price_per_crate || null,
                  accessId: access.id
                });
              }
            });
          }
          
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
      if (isNaN(price) || price < 0) {
        alert('Please enter a valid price');
        return;
      }
      
      // Update the farmer_room_access record with the new pricing
      const { error } = await supabase
        .from('farmer_room_access')
        .update({ price_per_crate: price })
        .eq('id', accessId);
      
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

      {/* Facilities Management (Owner Only) */}
      {user?.role === 'owner' && (
        <>
          <Card variant="default" className="border-blue-100 dark:border-blue-900/30">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-50 dark:border-blue-900/20">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Building className="w-5 h-5" />
                Facilities Management
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Add New Site</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-1">
                    Register a new cold storage facility to your network. This will begin the setup process for new rooms and sensor gateways.
                  </p>
                </div>
                <Button variant="primary" onClick={() => navigate('/owner-setup')} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Facility
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Facilities Details Section */}
          <Card variant="default" className="border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-50 dark:border-emerald-900/20">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Users className="w-5 h-5" />
                Facilities Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingFacilities ? (
                <div className="text-center py-8 text-gray-500">Loading facilities...</div>
              ) : facilities.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No facilities found. Add your first facility to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {facilities.map((facility) => (
                    <div key={facility.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-5 bg-gray-50/30 dark:bg-slate-800/30">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Building className="w-5 h-5 text-emerald-600" />
                            {facility.facility_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Created {new Date(facility.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                          <Users className="w-4 h-4" />
                          {facility.farmers.length} Farmer{facility.farmers.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      {facility.farmers.length === 0 ? (
                        <div className="text-center py-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                          <User className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">No farmers currently using this facility</p>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Farmer Name</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Price per Crate</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                              {facility.farmers.map((farmer: any) => {
                                const isEditing = editingPricing?.facilityId === facility.id && editingPricing?.farmerId === farmer.farmerId;
                                
                                return (
                                  <tr key={farmer.farmerId} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                      <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        {farmer.farmerName}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      {isEditing ? (
                                        <div className="flex items-center gap-2">
                                          <div className="relative flex-1 max-w-[120px]">
                                            <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                              type="number"
                                              value={pricingInput}
                                              onChange={(e) => setPricingInput(e.target.value)}
                                              className="w-full pl-9 pr-3 py-1.5 border border-emerald-300 dark:border-emerald-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                              placeholder="0.00"
                                              autoFocus
                                            />
                                          </div>
                                          <span className="text-gray-500 dark:text-gray-400">/ crate</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                                          {farmer.pricePerCrate !== null ? (
                                            <>
                                              <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                              <span className="font-semibold">{farmer.pricePerCrate.toFixed(2)}</span>
                                              <span className="text-gray-500 dark:text-gray-400">/ crate</span>
                                            </>
                                          ) : (
                                            <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      {isEditing ? (
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            variant="primary"
                                            onClick={() => handleSavePricing(facility.id, farmer.farmerId, farmer.accessId)}
                                            className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                                          >
                                            <Save className="w-3 h-3" /> Save
                                          </Button>
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              setEditingPricing(null);
                                              setPricingInput('');
                                            }}
                                            className="px-3 py-1.5 text-xs"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          onClick={() => startEditingPricing(facility.id, farmer.farmerId, farmer.pricePerCrate)}
                                          className="px-3 py-1.5 text-xs flex items-center gap-1"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          {farmer.pricePerCrate !== null ? 'Edit' : 'Set'} Price
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Note:</strong> Multiple farmers can use the same facility at different times. Set individual pricing per farmer per facility based on your agreement. Price is charged per crate (25kg).
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

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
                       <th className="px-6 py-4 font-semibold">Facility</th>
                       <th className="px-6 py-4 font-semibold">Room</th>
                       <th className="px-6 py-4 font-semibold">Requested On</th>
                       <th className="px-6 py-4 font-semibold">Status</th>
                       <th className="px-6 py-4 font-semibold text-right">Remarks</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {requests.length > 0 ? (
                        requests.map((req, idx) => {
                          // Extract facility name from nested structure
                          const room = Array.isArray(req.cold_storage_rooms) ? req.cold_storage_rooms[0] : req.cold_storage_rooms;
                          const facilities = Array.isArray(room?.facilities) ? room?.facilities[0] : room?.facilities;
                          const facilityName = facilities?.facility_name || room?.facilities?.facility_name || 'Unknown Facility';
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{facilityName}</td>
                              <td className="px-6 py-4 text-gray-500">{room?.room_name || '—'}</td>
                              <td className="px-6 py-4 text-gray-500">{new Date(req.requested_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                              <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                              <td className="px-6 py-4 text-right text-gray-500 text-xs max-w-[200px] truncate">{req.remarks || '—'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
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

      {/* Investment Management (Stakeholder Only) */}
      {user?.role === 'stakeholder' && (
        <div className="space-y-6">
           <Card variant="default" className="border-t-4 border-t-purple-500 shadow-md">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-purple-50/30 dark:bg-purple-900/10">
               <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-400">
                 <Briefcase className="w-5 h-5" /> Explore More Investments
               </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                   <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed">
                     Browse additional cold storage facilities and submit investment requests to expand your portfolio.
                   </p>
                 </div>
                 <Button variant="primary" onClick={() => navigate('/stakeholder-investment-preferences?mode=extension')} className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 shadow-sm border-transparent flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Find Investment Opportunities
                 </Button>
               </div>
               {location.search.includes('extended') && (
                  <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg flex items-center gap-3 border border-purple-100 dark:border-purple-800/30">
                     <CheckCircle className="w-5 h-5" />
                     <div>
                         <p className="font-semibold text-sm">Investment Request Submitted!</p>
                         <p className="text-xs">Your request has been sent successfully. Current Status: <span className="font-bold">Pending Approval</span></p>
                     </div>
                  </div>
               )}
             </CardContent>
           </Card>

           <Card variant="default">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800">
               <CardTitle className="text-lg">My Investment Requests</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-800/50">
                     <tr>
                       <th className="px-6 py-4 font-semibold">Facility</th>
                       <th className="px-6 py-4 font-semibold">Requested On</th>
                       <th className="px-6 py-4 font-semibold">Investment Amount</th>
                       <th className="px-6 py-4 font-semibold">Status</th>
                       <th className="px-6 py-4 font-semibold text-right">Remarks</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {stakeholderRequests.length > 0 ? (
                        stakeholderRequests.map((req: any) => (
                          <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                              {req.facilities?.facility_name || 'Unknown Facility'}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {new Date(req.investment_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 text-gray-900 dark:text-gray-400 font-medium">
                              ₹{req.investment_amount?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4">{getStatusBadge('Invested')}</td>
                            <td className="px-6 py-4 text-right text-gray-500 text-xs max-w-[200px] truncate">—</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No investments yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                 </table>
               </div>
             </CardContent>
           </Card>

           {/* My Payments Section - for Stakeholders */}
           <Card variant="default">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
               <CardTitle className="text-lg flex items-center gap-2">
                 <CreditCard className="w-5 h-5" /> My Payments
               </CardTitle>
               <Button 
                 variant="primary" 
                 size="sm"
                 onClick={() => setShowPaymentModal(true)}
                 className="flex items-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Add Payment
               </Button>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-800/50">
                     <tr>
                       <th className="px-6 py-4 font-semibold">Amount</th>
                       <th className="px-6 py-4 font-semibold">Status</th>
                       <th className="px-6 py-4 font-semibold">Paid On</th>
                       <th className="px-6 py-4 font-semibold">Approved On</th>
                       <th className="px-6 py-4 font-semibold">Remarks</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {stakeholderPayments.length > 0 ? (
                        stakeholderPayments.map((payment: any) => (
                          <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                              ₹{payment.amount_inr?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                payment.payment_status === 'Received' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                payment.payment_status === 'Verified' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }`}>
                                {payment.payment_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Not yet'}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {payment.received_by_owner_at ? new Date(payment.received_by_owner_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-4 text-gray-500 text-xs max-w-[200px] truncate">{payment.remarks || '—'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No payments yet
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
                      {inv.facilities?.facility_name} - ₹{inv.investment_amount?.toLocaleString() || '0'}
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
                  placeholder="e.g., Bank transfer reference, payment method, etc."
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Payment will be marked as "Pending" until owner verifies receipt.
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

      {/* Notifications Section */}
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
