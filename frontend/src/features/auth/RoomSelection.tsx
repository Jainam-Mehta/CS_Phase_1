import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Check, AlertCircle, Warehouse, Clock, Sprout } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RoleBackground } from '../../components/common/RoleBackground';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';

import type { FarmerRoomAccess } from '../../lib/supabase';

import { RoomRequestStatus } from '../../constants/roomRequestStatus';
import { logRoomRequestSubmitted } from '../../services/activityLogService';

const RoomSelection: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { loading: onboardingLoading, step, completeStep } = useOnboarding();
  const [rooms, setRooms] = useState<any[]>([]);
  // Room IDs are UUIDs (strings) from Supabase — never numbers
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [localityId, setLocalityId] = useState<string | null>(null);
  const isExtensionMode = searchParams.get('mode') === 'extension';

  useEffect(() => {
    // Load rooms filtered by location
    // Priority: 1) Session selection (extension mode), 2) Farmer's profile location
    loadRoomsForLocation();
  }, []);

  const loadRoomsForLocation = async () => {
    try {
      if (!user?.id) {
        console.warn('[RoomSelection] No user ID, showing empty rooms');
        throw new Error('No authenticated user found');
      }

      console.log('[RoomSelection] User ID:', user.id);

      // Check if we're in extension mode with a new location selection
      const storageRequest = localStorage.getItem('storageAccessRequest');
      const request = storageRequest ? JSON.parse(storageRequest) : {};
      
      console.log('[RoomSelection] Storage request from session:', request);

      let districtIdToUse = null;
      let localityIdToUse = null;

      // Priority 1: Use selected district/locality from current session (extension mode)
      if (isExtensionMode && request.districtId) {
        console.log('[RoomSelection] Using district from current session:', request.districtId);
        districtIdToUse = request.districtId;
      } else if (isExtensionMode && request.localityId) {
        console.log('[RoomSelection] Using locality from current session:', request.localityId);
        localityIdToUse = request.localityId;
      } else {
        // Priority 2: Use farmer's profile location
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('locality_id, district_id')
          .eq('id', user.id)
          .maybeSingle();

        console.log('[RoomSelection] Farmer profile fetched:', { profile, profileError });
        districtIdToUse = profile?.district_id || null;
        localityIdToUse = profile?.locality_id || null;
      }

      // Load rooms based on available location data
      if (localityIdToUse) {
        console.log('[RoomSelection] Loading rooms by locality_id:', localityIdToUse);
        setLocalityId(localityIdToUse);
        await loadRooms(localityIdToUse);
      } else if (districtIdToUse) {
        console.log('[RoomSelection] Loading rooms by district_id:', districtIdToUse);
        await loadRoomsByDistrict(districtIdToUse);
      } else {
        console.warn('[RoomSelection] No location found, showing empty rooms');
        setRooms([]);
      }
    } catch (err) {
      console.error('Error loading rooms for location:', err);
      setRooms([]);
    }
  };

  const loadRooms = async (localityId: string) => {
    try {
      console.log('[RoomSelection.loadRooms] Querying with localityId:', localityId);
      
      // First, try querying through sites with a regular join (not inner join)
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('id, facility_name, owner_profile_id, profiles:owner_profile_id(full_name)')
        .eq('locality_id', localityId);
      
      console.log('[RoomSelection.loadRooms] Sites query result:', { siteError, siteCount: siteData?.length });

      if (!siteError && siteData && siteData.length > 0) {
        // Now get rooms for these sites
        const siteIds = siteData.map(s => s.id);
        console.log('[RoomSelection.loadRooms] Site IDs for this locality:', siteIds);
        
        const { data: roomData, error: roomError } = await supabase
          .from('cold_storage_rooms')
          .select('*')
          .in('site_id', siteIds);
        
        console.log('[RoomSelection.loadRooms] Rooms query result:', { roomError, roomCount: roomData?.length });
        
        if (!roomError && roomData) {
          // Merge site data into room data
          const roomsWithSites = roomData.map(room => {
            const site = siteData.find(s => s.id === room.site_id);
            return {
              ...room,
              sites: site
            };
          });
          setRooms(roomsWithSites);
          return;
        }
      }
      
      // NO FALLBACK: If locality has no sites or no rooms, show empty state
      // This ensures filtering is strict and farmers only see rooms from selected locality
      console.warn('[RoomSelection.loadRooms] No rooms found for this locality');
      setRooms([]);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setRooms([]);
    }
  };

  const loadRoomsByDistrict = async (districtId: string) => {
    try {
      console.log('[RoomSelection.loadRoomsByDistrict] Querying with districtId:', districtId);
      
      // First, try querying through sites
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('id, facility_name, owner_profile_id, profiles:owner_profile_id(full_name)')
        .eq('district_id', districtId);
      
      console.log('[RoomSelection.loadRoomsByDistrict] Sites query result:', { siteError, siteCount: siteData?.length });

      if (!siteError && siteData && siteData.length > 0) {
        // Now get rooms for these sites
        const siteIds = siteData.map(s => s.id);
        console.log('[RoomSelection.loadRoomsByDistrict] Site IDs for this district:', siteIds);
        
        const { data: roomData, error: roomError } = await supabase
          .from('cold_storage_rooms')
          .select('*')
          .in('site_id', siteIds);
        
        console.log('[RoomSelection.loadRoomsByDistrict] Rooms query result:', { roomError, roomCount: roomData?.length });
        
        if (!roomError && roomData) {
          // Merge site data into room data
          const roomsWithSites = roomData.map(room => {
            const site = siteData.find(s => s.id === room.site_id);
            return {
              ...room,
              sites: site
            };
          });
          setRooms(roomsWithSites);
          return;
        }
      }
      
      // NO FALLBACK: If district has no sites or no rooms, show empty state
      // This ensures filtering is strict and farmers only see rooms from selected district
      console.warn('[RoomSelection.loadRoomsByDistrict] No rooms found for this district');
      setRooms([]);
    } catch (err) {
      console.error('Error loading rooms by district:', err);
      setRooms([]);
    }
  };

  const loadAllRooms = async () => {
    try {
      console.log('[RoomSelection.loadAllRooms] Fetching all rooms as fallback');
      
      const { data, error } = await supabase
        .from('cold_storage_rooms')
        .select(`
          *,
          sites!inner(
            facility_name,
            locality_id,
            district_id,
            owner_profile_id,
            profiles:owner_profile_id(
              full_name
            )
          )
        `);

      console.log('[RoomSelection.loadAllRooms] Query result:', { error, dataLength: data?.length });
      
      if (data && data.length > 0) {
        console.log('[RoomSelection.loadAllRooms] Sample data:', data.slice(0, 3));
      }

      if (!error && data) {
        setRooms(data);
      } else {
        setError('No rooms currently available in the database.');
      }
    } catch (err) {
      console.error('Error loading all rooms:', err);
      setError('Failed to load available rooms.');
    }
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedRooms.size === 0) {
      setError('Please select at least one room');
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error('No authenticated user found');
      }

      // Get farmer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        throw new Error('Farmer profile not found');
      }

      // Get selected products from localStorage
      const storageRequest = localStorage.getItem('storageAccessRequest');
      const selectedProducts = storageRequest ? JSON.parse(storageRequest).products || [] : [];
      console.log('✓ Products fetched from localStorage:', selectedProducts);

      // Create pending room requests
      const roomRequests = Array.from(selectedRooms).map(roomId => ({
        farmer_id: profile.id,
        room_id: roomId,
        status: RoomRequestStatus.Pending,
      }));

      const { error: insertError } = await supabase
        .from('farmer_room_access')
        .insert(roomRequests);

      if (insertError) throw insertError;

      // Now save selected products to farmer_batch_products for each room request
      // Get the newly created farmer_room_access records
      const { data: createdRequests } = await supabase
        .from('farmer_room_access')
        .select('id, room_id')
        .eq('farmer_id', profile.id)
        .in('room_id', Array.from(selectedRooms));

      if (createdRequests && createdRequests.length > 0 && selectedProducts.length > 0) {
        // Create batch product records for each room request
        const batchProducts = createdRequests.flatMap((req: any) =>
          (selectedProducts as any[]).map((product: any) => ({
            farmer_room_access_id: req.id,
            product_id: typeof product === 'string' ? product : product.id,
            quantity_kg: 100, // Default quantity to satisfy CHECK constraint (quantity_kg > 0)
          }))
        );

        const { error: batchError } = await supabase
          .from('farmer_batch_products')
          .insert(batchProducts);

        if (batchError) {
          console.error('ERROR: Could not save batch products:', batchError);
          // Don't throw - the room request was created successfully
        } else {
          console.log('✓ Successfully saved', batchProducts.length, 'products to farmer_batch_products');
        }
      }

      // Log each room request submission
      for (const roomId of selectedRooms) {
        const { data: room } = await supabase
          .from('cold_storage_rooms')
          .select('room_code, site_id, sites(facility_name)')
          .eq('id', roomId)
          .maybeSingle();

        if (room) {
          const site = Array.isArray(room.sites) ? room.sites[0] : room.sites;
          await logRoomRequestSubmitted(
            profile.id,
            room.site_id,
            roomId,
            room.room_code,
            site?.facility_name || 'Unknown Site'
          );
        }
      }

      // In extension mode, navigate to product selection to continue the flow
      // In normal onboarding mode, complete the step and navigate to product selection
      if (isExtensionMode) {
          navigate('/product-selection?mode=extension');
      } else {
          // Notify onboarding hook that this step is complete
          completeStep('dashboard');
          // Navigate to product selection
          navigate('/product-selection');
      }
    } catch (err) {
      console.error('Error submitting room requests:', err);
      setError('Failed to submit room requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if still loading onboarding state
  // Allow rendering in extension mode regardless of onboarding step
  if (!isExtensionMode && onboardingLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-white selection:bg-emerald-500 selection:text-white overflow-hidden">
      {/* Consistent Role-Specific 3D Background Animation */}
      <RoleBackground role="farmer" />

      {/* White Header Bar - 68px, Perfectly Contained */}
      <header className="relative w-full h-[68px] px-6 lg:px-10 flex items-center justify-between z-30 bg-white border-b border-gray-200 shadow-sm shrink-0 overflow-hidden">
        <div className="flex items-center h-full">
          <SystmLogo variant="prominent-header" iconSize={52} showCompanyLogo={true} />
        </div>
        <div className="flex items-center h-full">
          <PartnerLogos theme="light" prominent={true} />
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 z-20 w-full overflow-y-auto">

      <div className="w-full max-w-3xl">
        <Card variant="default" className="w-full">
          <CardHeader className="text-center relative">
            {/* Step Indicator */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full">
                Step 2/3
              </span>
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Warehouse className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Select Storage Rooms</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Choose the cold storage rooms you want to request access to for storing your products
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <Warehouse className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No rooms available in your locality. Please contact support.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomToggle(room.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedRooms.has(room.id)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                            {room.room_name || room.room_code || 'Storage Room'}
                          </span>
                        </div>
                        {selectedRooms.has(room.id) && (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 line-clamp-1">
                        {room.sites?.facility_name || 'Unknown Site'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {room.sites?.profiles?.full_name || 
                          `${room.sites?.profiles?.first_name || ''} ${room.sites?.profiles?.last_name || ''}`.trim() || 
                          'Owner'}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Approval Required
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Your room requests will be reviewed by the Owner. You will be notified once access is granted.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedRooms.size} room{selectedRooms.size !== 1 ? 's' : ''} selected
                </p>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={selectedRooms.size === 0 || rooms.length === 0}
                >
                  Continue to Product Selection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    
      </main>

      {/* Footer info bar */}
      <footer className="relative w-full py-3.5 text-center text-xs text-gray-600 border-t border-gray-200 bg-white z-30 shadow-sm shrink-0">
        <p className="font-medium tracking-wide">
          SystmII Cold Chain Supply Management Platform &bull; Active Logistics Core
        </p>
      </footer>
    </div>
  );
};

export default RoomSelection;