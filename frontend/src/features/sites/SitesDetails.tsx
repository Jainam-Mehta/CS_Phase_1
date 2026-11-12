import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Building, User, Users, Edit2, SaveIcon, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SitesDetails: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [editingPricing, setEditingPricing] = useState<{facilityId: string, farmerId: string} | null>(null);
  const [pricingInput, setPricingInput] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      loadFacilitiesWithFarmers();
    }
  }, [user?.id]);

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

  if (loadingFacilities) {
    return (
      <div className="text-center py-8 text-gray-500">Loading sites...</div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-8">
          <Building className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No sites found. Add your first site to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pt-6 px-4 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Sites Details
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View and manage farmers and pricing for your cold storage sites.
        </p>
      </div>

      {/* Sites Management Section */}
      <Card variant="default" className="border-blue-100 dark:border-blue-900/30">
        <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-50 dark:border-blue-900/20">
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Building className="w-5 h-5" />
            Sites Management
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Add New Site</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-1">
                Register a new cold storage site to your network. This will begin the setup process for new rooms and sensor gateways.
              </p>
            </div>
            <Button variant="primary" onClick={() => navigate('/owner-setup')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Site
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {facilities.map((facility) => (
          <Card key={facility.id} variant="default" className="border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-50 dark:border-emerald-900/20">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400">{facility.facility_name}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                  <Users className="w-4 h-4" />
                  {facility.farmers.length} Farmer{facility.farmers.length !== 1 ? 's' : ''}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Created {new Date(facility.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              
              {facility.farmers.length === 0 ? (
                <div className="text-center py-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                  <User className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No farmers currently using this site</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Farmer Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Price per Crate</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {facility.farmers.map((farmer: any) => (
                        <tr key={farmer.farmerId} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{farmer.farmerName}</td>
                          <td className="px-4 py-3">
                            {editingPricing?.facilityId === facility.id && editingPricing?.farmerId === farmer.farmerId ? (
                              <input
                                type="number"
                                value={pricingInput}
                                onChange={(e) => setPricingInput(e.target.value)}
                                autoFocus
                                className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white bg-white dark:bg-slate-800 w-32"
                              />
                            ) : (
                              <span className="text-gray-600 dark:text-gray-400">
                                ₹{farmer.pricePerCrate?.toFixed(2) || '-'} / crate
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingPricing?.facilityId === facility.id && editingPricing?.farmerId === farmer.farmerId ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="primary"
                                  onClick={() => handleSavePricing(facility.id, farmer.farmerId, farmer.accessId)}
                                  className="flex items-center gap-1 text-xs px-3 py-1"
                                >
                                  <SaveIcon className="w-3 h-3" />
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPricing(null);
                                    setPricingInput('');
                                  }}
                                  className="text-xs px-3 py-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                onClick={() => startEditingPricing(facility.id, farmer.farmerId, farmer.pricePerCrate)}
                                className="flex items-center gap-1 text-xs px-3 py-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit Price
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SitesDetails;
