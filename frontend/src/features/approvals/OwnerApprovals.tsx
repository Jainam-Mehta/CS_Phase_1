import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Card, CardContent } from '../../components/ui/Card';
import { Check, X, Clock, MapPin, Building2, User } from 'lucide-react';
import { logRoomRequestApproved, logRoomRequestRejected } from '../../services/activityLogService';
import { notifyRequestApproved, notifyRequestRejected } from '../../services/notificationService';

interface ApprovalRequest {
  id: string;
  status: string;
  requested_at: string;
  remarks: string | null;
  farmerName: string;
  farmerEmail: string;
  facilityName: string;
  roomName: string;
  requestedProducts: Array<{
    name: string;
    shelf_life_days?: number;
  }>;
}

const OwnerApprovals: React.FC = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError('');
      
      console.log('--- DEBUG START: Owner Approvals ---');
      console.log('1. Authenticated Auth User:', user);
      
      const profile = await resolveProfile(user.id);
      console.log('2. Resolved Owner Profile:', profile);
      
      if (!profile) throw new Error('Owner profile map not found');

      console.log('Owner Profile ID:', profile.id);

      // 1. Resolve owned Sites mapped natively across owner_profile_id
      const { data: sites, error: facErr } = await supabase
        .from('sites')
        .select('id, facility_name, owner_profile_id')
        .eq('owner_profile_id', profile.id);

      console.log('3. Supabase Sites Query:', { data: sites, error: facErr, executedProfileId: profile.id });

      if (!sites || sites.length === 0) {
        console.warn('EARLY RETURN: No sites found for this owner_profile_id.');
        setRequests([]);
        return;
      }
      
      const siteIds = sites.map(f => f.id);
      const siteMap = new Map(sites.map(f => [f.id, f.facility_name]));

      // 2. Resolve matching Cold Storage Rooms recursively under strict foreign mappings
      const { data: rooms, error: roomErr } = await supabase
        .from('cold_storage_rooms')
        .select('id, room_name, site_id')
        .in('site_id', siteIds);

      console.log('4. Supabase Rooms Query:', { data: rooms, error: roomErr, executedSiteIds: siteIds });

      if (!rooms || rooms.length === 0) {
        console.warn('EARLY RETURN: No rooms found inside the owned sites.');
        setRequests([]);
        return;
      }

      const roomIds = rooms.map(r => r.id);
      const roomMap = new Map(rooms.map(r => [r.id, r.room_name]));
      const roomToSiteMap = new Map(rooms.map(r => [r.id, r.site_id]));

      // 3. Extract purely Pending room access parameters targeting isolated farmers
      const { data: accessRequests, error: reqError } = await supabase
        .from('farmer_room_access')
        .select(`
          id,
          status,
          requested_at,
          remarks,
          room_id,
          farmer_id
        `)
        .in('room_id', roomIds)
        .eq('status', 'Pending')
        .order('requested_at', { ascending: false });

      console.log('5. Supabase Requests Query:', { data: accessRequests, error: reqError });

      if (reqError) throw reqError;
      if (!accessRequests || accessRequests.length === 0) {
         console.warn('EARLY RETURN: No pending farmer_room_access found for isolated room_ids.');
         setRequests([]);
         return;
      }

      // Generate localized matrix bypassing multiple complex inner mappings
      const formattedRequests: ApprovalRequest[] = [];
      for (const req of accessRequests as any) {
         const roomId = req.room_id;
         const roomName = roomMap.get(roomId) || 'Unknown Room';
         const siteId = roomToSiteMap.get(roomId);
         const siteName = siteId ? siteMap.get(siteId) || 'Unknown Site' : 'Unknown Site';
         
         // Get farmer profile to fetch name
         const { data: farmerProfiles, error: profileErr } = await supabase
           .from('profiles')
           .select('full_name')
           .eq('id', req.farmer_id);
         
         const farmerProfile = Array.isArray(farmerProfiles) ? farmerProfiles[0] : farmerProfiles;
         console.log(`Farmer profile for ${req.farmer_id}:`, { farmerProfile, profileErr });
         
         const name = farmerProfile?.full_name || 'Unknown Farmer';
         console.log(`✓ Farmer name resolved:`, name, `(from profile:`, farmerProfile?.full_name, `)`);

         // Get products farmer requested via farmer_batch_products join
         // farmer_batch_products links via farmer_room_access_id, not farmer_id
         const { data: batchProducts, error: productsErr } = await supabase
           .from('farmer_batch_products')
           .select('product_id')
           .eq('farmer_room_access_id', req.id);

         if (productsErr) {
           console.error(`Error fetching batch products for request ${req.id}:`, productsErr);
         }

         // Now fetch product details
         let requestedProducts: Array<{name: string; avg_shelf_life?: number; product_type?: string}> = [];
         if (batchProducts && batchProducts.length > 0) {
           const productIds = batchProducts.map((bp: any) => bp.product_id);
           const { data: productDetails } = await supabase
             .from('products')
             .select('id, name, shelf_life_days')
             .in('id', productIds);
           
           requestedProducts = (productDetails || []).map((p: any) => ({
             name: p.name || 'Unknown Product',
             shelf_life_days: p.shelf_life_days,
           }));
         }

         formattedRequests.push({
           id: req.id,
           status: req.status,
           requested_at: req.requested_at,
           remarks: req.remarks,
           farmerName: name,
           farmerEmail: 'Validated User Account',
           facilityName: siteName,
           roomName,
           requestedProducts
         });
      }

      setRequests(formattedRequests);
    } catch (err) {
      console.error('Error extracting local requests:', err);
      setError('Unable to fetch requests successfully.');
    } finally {
      setLoading(false);
    }
  };





  useEffect(() => {
    loadRequests();
  }, [user?.id]);

  const handleAction = async (requestId: string, action: 'Approved' | 'Rejected') => {
    if (!user?.id) return;
    try {
      setActionLoading(requestId);
      setError('');
      const profile = await resolveProfile(user.id);
      
      // Fetch complete request data with farmer and room info
      const { data: completeReq, error: fetchErr } = await supabase
        .from('farmer_room_access')
        .select(`
          id, farmer_id, room_id, status, requested_at,
          cold_storage_rooms(room_code, room_name, site_id, sites(facility_name))
        `)
        .eq('id', requestId)
        .maybeSingle();

      if (fetchErr) {
        console.error('Error fetching request:', fetchErr);
        throw new Error(`Failed to fetch request: ${fetchErr.message}`);
      }

      if (!completeReq) {
        throw new Error('Request not found in database');
      }
      
      console.log('Complete request data:', completeReq);

      const payload: any = {
        status: action,
        approved_at: new Date().toISOString(),
        approved_by: profile?.id
      };

      if (action === 'Rejected') {
         payload.remarks = 'Declined natively by owner interface';
      }

      console.log('Updating request with payload:', payload);

      const { error: updateErr } = await supabase
        .from('farmer_room_access')
        .update(payload)
        .eq('id', requestId);

      if (updateErr) {
        console.error('Error updating request:', updateErr);
        throw new Error(`Failed to update request: ${updateErr.message}`);
      }

      console.log('✓ Request updated successfully');
      
      // Extract room and site data
      const room = Array.isArray(completeReq.cold_storage_rooms) 
        ? completeReq.cold_storage_rooms[0] 
        : completeReq.cold_storage_rooms;
      const site = Array.isArray(room?.sites) ? room.sites[0] : room?.sites;
      
      const roomCode = room?.room_code || 'Unknown Room';
      const siteName = site?.facility_name || 'Unknown Site';
      const siteId = room?.site_id;
      const roomId = completeReq.room_id;
      const farmerId = completeReq.farmer_id;
      
      console.log('Extracted data:', { farmerId, siteId, roomId, roomCode, siteName });
      
      // Log the approval/rejection action
      if (action === 'Approved') {
        console.log('Logging approval...');
        await logRoomRequestApproved(
          farmerId,
          siteId,
          roomId,
          roomCode,
          siteName,
          profile?.full_name || 'Owner'
        );
        
        console.log('Notifying farmer...');
        // Notify the farmer
        await notifyRequestApproved(
          farmerId,
          siteId,
          roomId,
          requestId,
          roomCode,
          siteName,
          profile?.full_name || 'Owner'
        );
      } else if (action === 'Rejected') {
        console.log('Logging rejection...');
        await logRoomRequestRejected(
          farmerId,
          siteId,
          roomId,
          roomCode,
          siteName,
          profile?.full_name || 'Owner',
          payload.remarks
        );
        
        console.log('Notifying farmer of rejection...');
        // Notify the farmer
        await notifyRequestRejected(
          farmerId,
          siteId,
          roomId,
          requestId,
          roomCode,
          siteName,
          profile?.full_name || 'Owner',
          payload.remarks
        );
      }

      console.log('✓ Action completed successfully');
      
      // Update DOM gracefully instead of reloading page implicitly
      setRequests((prev) => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      setError(`Failed to ${action} request: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };





  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pending Approvals</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review and authorize incoming space requests from registered farmers.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>You have no pending requests at any of your facilities.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map(req => (
            <Card key={req.id} className="border-t-4 border-t-primary-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                  <div className="h-10 w-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{req.farmerName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{req.farmerEmail}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 flex justify-center text-gray-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Requested</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(req.requested_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 flex justify-center text-gray-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Facility</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{req.facilityName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 flex justify-center text-gray-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Room</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{req.roomName}</p>
                    </div>
                  </div>

                  {/* Requested Products */}
                  {req.requestedProducts && req.requestedProducts.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Requested Products</p>
                      <div className="space-y-1">
                        {req.requestedProducts.map((prod, idx) => (
                          <div key={idx} className="text-sm bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{prod.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {prod.shelf_life_days && `Shelf life: ${prod.shelf_life_days} days`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleAction(req.id, 'Approved')}
                    disabled={actionLoading !== null}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading === req.id ? 'Saving...' : <><Check className="h-4 w-4" /> Approve</>}
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'Rejected')}
                    disabled={actionLoading !== null}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                     <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerApprovals;
