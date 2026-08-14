import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Card, CardContent } from '../../components/ui/Card';
import { Check, X, Clock, MapPin, Building2, User } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  status: string;
  requested_at: string;
  remarks: string | null;
  farmerName: string;
  farmerEmail: string;
  facilityName: string;
  roomName: string;
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

      // 1. Resolve owned Facilities mapped natively across owner_profile_id
      const { data: facilities, error: facErr } = await supabase
        .from('facilities')
        .select('id, facility_name, owner_profile_id')
        .eq('owner_profile_id', profile.id);

      console.log('3. Supabase Facilities Query:', { data: facilities, error: facErr, executedProfileId: profile.id });

      if (!facilities || facilities.length === 0) {
        console.warn('EARLY RETURN: No facilities found for this owner_profile_id.');
        setRequests([]);
        return;
      }
      
      const facilityIds = facilities.map(f => f.id);
      const facilityMap = new Map(facilities.map(f => [f.id, f.facility_name]));

      // 2. Resolve matching Cold Storage Rooms recursively under strict foreign mappings
      const { data: rooms, error: roomErr } = await supabase
        .from('cold_storage_rooms')
        .select('id, room_name, facility_id')
        .in('facility_id', facilityIds);

      console.log('4. Supabase Rooms Query:', { data: rooms, error: roomErr, executedFacilityIds: facilityIds });

      if (!rooms || rooms.length === 0) {
        console.warn('EARLY RETURN: No rooms found inside the owned facilities.');
        setRequests([]);
        return;
      }

      const roomIds = rooms.map(r => r.id);
      const roomMap = new Map(rooms.map(r => [r.id, r.room_name]));
      const roomToFacilityMap = new Map(rooms.map(r => [r.id, r.facility_id]));

      // 3. Extract purely Pending room access parameters targeting isolated farmers
      const { data: accessRequests, error: reqError } = await supabase
        .from('farmer_room_access')
        .select(`
          id,
          status,
          requested_at,
          remarks,
          room_id,
          profiles!farmer_room_access_farmer_id_fkey (
            first_name,
            last_name,
            auth_user_id
          )
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
         const facilityId = roomToFacilityMap.get(roomId);
         const facilityName = facilityId ? facilityMap.get(facilityId) || 'Unknown Facility' : 'Unknown Facility';
         
         const firstName = req.profiles?.first_name || '';
         const lastName = req.profiles?.last_name || '';
         const name = `${firstName} ${lastName}`.trim() || 'Unknown Farmer';

         formattedRequests.push({
           id: req.id,
           status: req.status,
           requested_at: req.requested_at,
           remarks: req.remarks,
           farmerName: name,
           farmerEmail: 'Validated User Account', // Email requires hitting Auth users, avoiding RPC blocks gracefully
           facilityName,
           roomName
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
      const profile = await resolveProfile(user.id);
      
      const payload: any = {
        status: action,
        approved_at: new Date().toISOString(),
        approved_by: profile?.id
      };

      if (action === 'Rejected') {
         payload.remarks = 'Declined natively by owner interface';
      }

      const { error } = await supabase
        .from('farmer_room_access')
        .update(payload)
        .eq('id', requestId);

      if (error) throw error;
      
      // Update DOM gracefully instead of reloading page implicitly
      setRequests((prev) => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error(`Failed to natively ${action} request:`, err);
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
