import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Card, CardContent } from '../../components/ui/Card';
import { Check, X, Clock, MapPin, Building2, User, Briefcase, CheckCircle } from 'lucide-react';
import { logFarmerApproved, logStakeholderApproved, logPaymentReceived } from '../../lib/activityLogger';

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

interface InvestmentRequest {
  id: string;
  stakeholder_id: string;
  stakeholder_name: string;
  facility_id: string;
  facility_name: string;
  created_at: string;
  interest_status: string;
}

interface PaymentRequest {
  id: string;
  investment_id: string;
  stakeholder_id: string;
  stakeholder_name: string;
  facility_name: string;
  amount_inr: number;
  payment_status: string;
  created_at: string;
  remarks: string | null;
}

const OwnerApprovals: React.FC = () => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [investmentRequests, setInvestmentRequests] = useState<InvestmentRequest[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
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
          profiles!farmer_room_access_farmer_id_fkey (
            full_name
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
         const siteId = roomToSiteMap.get(roomId);
         const siteName = siteId ? siteMap.get(siteId) || 'Unknown Site' : 'Unknown Site';
         
         const name = req.profiles?.full_name || 'Unknown Farmer';

         formattedRequests.push({
           id: req.id,
           status: req.status,
           requested_at: req.requested_at,
           remarks: req.remarks,
           farmerName: name,
           farmerEmail: 'Validated User Account', // Email requires hitting Auth users, avoiding RPC blocks gracefully
           facilityName: siteName,
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

  const loadInvestmentRequests = async () => {
    if (!user?.id) return;
    try {
      const profile = await resolveProfile(user.id);
      if (!profile) return;

      // Get sites owned by this owner
      const { data: sites } = await supabase
        .from('sites')
        .select('id, facility_name')
        .eq('owner_profile_id', profile.id);

      if (!sites || sites.length === 0) {
        setInvestmentRequests([]);
        return;
      }

      const siteIds = sites.map(f => f.id);
      const siteMap = new Map(sites.map(f => [f.id, f.facility_name]));

      // Get pending investment interests for these sites
      const { data: interests } = await supabase
        .from('stakeholder_interest')
        .select(`
          id,
          stakeholder_id,
          site_id,
          created_at,
          interest_status,
          profiles!stakeholder_id (
            full_name
          )
        `)
        .in('site_id', siteIds)
        .eq('interest_status', 'Interested');

      if (!interests) {
        setInvestmentRequests([]);
        return;
      }

      const formatted = interests.map((interest: any) => ({
        id: interest.id,
        stakeholder_id: interest.stakeholder_id,
        stakeholder_name: interest.profiles?.full_name || 'Unknown Stakeholder',
        facility_id: interest.site_id,
        facility_name: siteMap.get(interest.site_id) || 'Unknown Site',
        created_at: interest.created_at,
        interest_status: interest.interest_status
      }));

      setInvestmentRequests(formatted);
    } catch (err) {
      console.error('Error loading investment requests:', err);
    }
  };

  const loadPaymentRequests = async () => {
    if (!user?.id) return;
    try {
      const profile = await resolveProfile(user.id);
      if (!profile) return;

      // Get all approved investments for this owner's sites
      const { data: sites } = await supabase
        .from('sites')
        .select('id')
        .eq('owner_profile_id', profile.id);

      if (!sites || sites.length === 0) {
        setPaymentRequests([]);
        return;
      }

      const siteIds = sites.map(f => f.id);

      // Get investments for these sites
      const { data: investments } = await supabase
        .from('stakeholder_investments')
        .select('id, stakeholder_id, site_id')
        .in('site_id', siteIds);

      if (!investments || investments.length === 0) {
        setPaymentRequests([]);
        return;
      }

      const investmentIds = investments.map(i => i.id);

      // Get pending payments for these investments
      const { data: payments } = await supabase
        .from('stakeholder_payments')
        .select(`
          id,
          investment_id,
          stakeholder_id,
          amount_inr,
          payment_status,
          created_at,
          remarks
        `)
        .in('investment_id', investmentIds)
        .in('payment_status', ['Pending', 'Received']);

      if (!payments) {
        setPaymentRequests([]);
        return;
      }

      // Get stakeholder and facility names
      const stakeholderIds = [...new Set(payments.map(p => p.stakeholder_id))];
      const { data: stakeholders } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', stakeholderIds);

      const stakeholderMap = new Map((stakeholders || []).map(s => [
        s.id,
        `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown'
      ]));

      const siteMap = new Map(sites.map(f => [f.id, `Site ${siteIds.indexOf(f.id) + 1}`]));

      // Get site names
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, facility_name')
        .in('id', siteIds);

      if (sitesData) {
        sitesData.forEach(f => siteMap.set(f.id, f.facility_name));
      }

      const formatted = payments.map((p: any) => {
        const investment = investments.find(i => i.id === p.investment_id);
        return {
          id: p.id,
          investment_id: p.investment_id,
          stakeholder_id: p.stakeholder_id,
          stakeholder_name: stakeholderMap.get(p.stakeholder_id) || 'Unknown',
          facility_name: investment ? siteMap.get(investment.site_id) || 'Unknown Site' : 'Unknown Site',
          amount_inr: p.amount_inr,
          payment_status: p.payment_status,
          created_at: p.created_at,
          remarks: p.remarks
        };
      });

      setPaymentRequests(formatted);
    } catch (err) {
      console.error('Error loading payment requests:', err);
    }
  };

  useEffect(() => {
    loadRequests();
    loadInvestmentRequests();
    loadPaymentRequests();
  }, [user?.id]);

  const handleAction = async (requestId: string, action: 'Approved' | 'Rejected') => {
    if (!user?.id) return;
    try {
      setActionLoading(requestId);
      const profile = await resolveProfile(user.id);
      const req = requests.find(r => r.id === requestId);
      
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
      
      // Log farmer approval activity
      if (action === 'Approved' && req && profile) {
        await logFarmerApproved(
          profile.id,
          profile.full_name || 'Owner',
          req.id, // farmer_id would be in the request but we use the request id as reference
          req.farmerName,
          req.id, // roomId
          req.roomName,
          req.id, // facilityId
          req.facilityName
        );
      }

      // Update DOM gracefully instead of reloading page implicitly
      setRequests((prev) => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error(`Failed to natively ${action} request:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvestmentAction = async (interestId: string, stakeholderId: string, facilityId: string, action: 'Approved' | 'Rejected') => {
    if (!user?.id) return;
    try {
      setActionLoading(interestId);
      console.log('Starting investment action:', { interestId, stakeholderId, facilityId, action });
      
      const profile = await resolveProfile(user.id);
      console.log('Resolved profile:', profile);
      
      const req = investmentRequests.find(r => r.id === interestId);
      console.log('Found investment request:', req);

      if (action === 'Approved') {
        // Get owner company ID from the owner's profile
        console.log('Owner profile:', profile);

        // Create entry in stakeholder_investments
        const investmentData: any = {
          stakeholder_id: stakeholderId,
          site_id: facilityId,
          owner_company_id: profile?.owner_company_id
        };
        
        console.log('Inserting stakeholder_investments:', investmentData);
        
        const { data: investData, error: investError } = await supabase
          .from('stakeholder_investments')
          .insert(investmentData)
          .select();

        console.log('Insert response:', { data: investData, error: investError });
        if (investError) throw investError;

        // Log stakeholder approval
        if (profile && req) {
          console.log('Logging stakeholder approval...');
          try {
            await logStakeholderApproved(
              profile.id,
              profile.full_name || 'Owner',
              stakeholderId,
              req.stakeholder_name,
              facilityId,
              req.facility_name,
              0 // investment amount will be updated during payment
            );
            console.log('Stakeholder approval logged successfully');
          } catch (logErr) {
            console.error('Failed to log stakeholder approval:', logErr);
          }
        }
      }

      // Update interest status - use 'Approved' when accepted, 'Rejected' when rejected
      console.log('Updating stakeholder_interest status to:', action === 'Approved' ? 'Approved' : 'Rejected');
      const { error: statusError } = await supabase
        .from('stakeholder_interest')
        .update({ interest_status: action === 'Approved' ? 'Approved' : 'Rejected' })
        .eq('id', interestId);

      console.log('Status update error:', statusError);
      if (statusError) throw statusError;

      console.log('Action successful, filtering requests');
      setInvestmentRequests((prev) => prev.filter(r => r.id !== interestId));
    } catch (err) {
      console.error(`Failed to ${action} investment request:`, err);
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaymentAsReceived = async (paymentId: string) => {
    if (!user?.id) return;
    try {
      setActionLoading(paymentId);
      const profile = await resolveProfile(user.id);
      const payment = paymentRequests.find(p => p.id === paymentId);

      const { error } = await supabase
        .from('stakeholder_payments')
        .update({
          payment_status: 'Received',
          received_by_owner_at: new Date().toISOString(),
          received_by_owner_id: profile?.id
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Log payment received
      if (profile && payment) {
        await logPaymentReceived(
          profile.id,
          profile.full_name || 'Owner',
          payment.stakeholder_id,
          payment.stakeholder_name,
          '', // We don't have facilityId directly, but it's in the investment
          payment.facility_name,
          payment.amount_inr,
          paymentId
        );
      }

      setPaymentRequests((prev) => prev.filter(r => r.id !== paymentId));
    } catch (err) {
      console.error('Failed to mark payment as received:', err);
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

      {/* Investment Requests Section */}
      <div className="mt-10 pt-10 border-t border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Investment Requests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and approve investment requests from stakeholders for your facilities.
          </p>
        </div>

        {investmentRequests.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pending investment requests at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {investmentRequests.map(req => (
              <Card key={req.id} className="border-t-4 border-t-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{req.stakeholder_name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Investment Interest</p>
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
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 flex justify-center text-gray-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Site</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{req.facility_name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => handleInvestmentAction(req.id, req.stakeholder_id, req.facility_id, 'Approved')}
                      disabled={actionLoading !== null}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === req.id ? 'Accepting...' : <><Check className="h-4 w-4" /> Accept</>}
                    </button>
                    <button
                      onClick={() => handleInvestmentAction(req.id, req.stakeholder_id, req.facility_id, 'Rejected')}
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

      {/* Payment Requests Section */}
      <div className="mt-10 pt-10 border-t border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pending Payments</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and confirm payments received from stakeholders for their investments.
          </p>
        </div>

        {paymentRequests.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No pending payments at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {paymentRequests.map(payment => (
              <Card key={payment.id} className="border-t-4 border-t-emerald-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                    <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{payment.stakeholder_name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Payment Received</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{payment.amount_inr.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Facility:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{payment.facility_name}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Submitted:</span>
                      <span className="text-sm text-gray-500">{new Date(payment.created_at).toLocaleDateString()}</span>
                    </div>

                    {payment.remarks && (
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Remarks:</span>
                        <p className="text-sm text-gray-500 mt-1 bg-gray-50 dark:bg-slate-800/50 p-2 rounded">
                          {payment.remarks}
                        </p>
                      </div>
                    )}

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                        Status: {payment.payment_status}
                      </span>
                    </div>
                  </div>

                  {payment.payment_status === 'Pending' && (
                    <button
                      onClick={() => handleMarkPaymentAsReceived(payment.id)}
                      disabled={actionLoading !== null}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === payment.id ? 'Confirming...' : <><Check className="h-4 w-4" /> Mark as Received</>}
                    </button>
                  )}
                  {payment.payment_status === 'Received' && (
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg font-medium">
                      <CheckCircle className="h-4 w-4" /> Confirmed
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerApprovals;
