import React, { useEffect, useState } from 'react';
import { Bell, AlertCircle, Clock, CheckCircle, X, TrendingUp, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';
import { resolveProfile } from '../../lib/profileUtils';

interface Alert {
  id: string;
  room_id: string;
  room_name?: string;
  facility_name?: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  status: 'unresolved' | 'resolved';
  resolved_at?: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  actor_name: string;
  action_type: string;
  action_subtype: string;
  target_type: string;
  target_name: string;
  facility_name: string;
  related_data: Record<string, any>;
  created_at: string;
}

const OwnerAlerts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadAlerts();
      loadActivityLogs();
    }
  }, [user?.id]);

  const loadActivityLogs = async () => {
    if (!user?.id) return;
    try {
      const profile = await resolveProfile(user.id);
      if (!profile) return;

      // Get ALL sites owned by this owner
      const { data: allSites } = await supabase
        .from('sites')
        .select('id, facility_name')
        .eq('owner_profile_id', profile.id);

      if (!allSites || allSites.length === 0) {
        setActivityLogs([]);
        return;
      }

      const siteIds = allSites.map(s => s.id);
      const siteMap = new Map(allSites.map(s => [s.id, s.facility_name]));

      // Get all rooms for ALL sites
      const { data: allRooms } = await supabase
        .from('cold_storage_rooms')
        .select('id, room_code, room_name, site_id')
        .in('site_id', siteIds);

      const roomIds = allRooms?.map(r => r.id) || [];
      const roomMap = new Map(allRooms?.map(r => [r.id, { code: r.room_code, name: r.room_name, site_id: r.site_id }]) || []);

      // Get farmer activity logs for ALL rooms
      const { data: allFarmerLogs } = await supabase
        .from('farmer_activity_logs')
        .select('id, event_type, farmer_id, room_id, title, description, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(100);

      // Get stakeholder logs for ALL sites
      const { data: allStakeholderLogs } = await supabase
        .from('activity_logs')
        .select('*')
        .in('facility_id', siteIds)
        .in('action_type', ['stakeholder_requested', 'stakeholder_active', 'stakeholder_approved', 'stakeholder_interested'])
        .order('created_at', { ascending: false })
        .limit(100);

      // Get farmer names
      const farmerIds = [...new Set((allFarmerLogs || []).map(log => log.farmer_id))];
      let farmerMap = new Map<string, string>();
      if (farmerIds.length > 0) {
        const { data: farmers } = await supabase.from('profiles').select('id, full_name').in('id', farmerIds);
        if (farmers) farmerMap = new Map(farmers.map(f => [f.id, f.full_name || 'Unknown Farmer']));
      }

      // Transform farmer logs with site names
      const transformedFarmerLogs: ActivityLog[] = (allFarmerLogs || []).map(log => {
        const room = roomMap.get(log.room_id);
        const siteName = room ? siteMap.get(room.site_id) || 'Unknown Site' : 'Unknown Site';
        const farmerName = farmerMap.get(log.farmer_id) || 'Unknown Farmer';
        
        let actionSubtype = '';
        if (log.event_type === 'request_submitted') actionSubtype = 'submitted';
        else if (log.event_type === 'request_approved') actionSubtype = 'approved';
        else if (log.event_type === 'request_rejected') actionSubtype = 'rejected';
        
        return {
          id: log.id,
          actor_name: farmerName,
          action_type: 'room_request',
          action_subtype: actionSubtype,
          target_type: 'room_request',
          target_name: room?.code || 'Unknown Room',
          facility_name: siteName,
          related_data: { description: log.description, room_name: room?.name },
          created_at: log.created_at
        };
      });

      // Transform stakeholder logs with site names
      const transformedStakeholderLogs: ActivityLog[] = (allStakeholderLogs || []).map(log => {
        const siteName = siteMap.get(log.facility_id) || 'Unknown Site';
        let actionSubtype = '';
        
        if (log.action_type === 'stakeholder_requested') actionSubtype = 'requested';
        else if (log.action_type === 'stakeholder_active' || log.action_type === 'stakeholder_approved') actionSubtype = 'approved';
        else if (log.action_type === 'stakeholder_interested') actionSubtype = 'interested';
        
        return {
          id: log.id,
          actor_name: log.actor_name || 'Unknown',
          action_type: log.action_type,
          action_subtype: actionSubtype,
          target_type: 'stakeholder',
          target_name: log.target_name || 'Stakeholder',
          facility_name: siteName,
          related_data: log.related_data || {},
          created_at: log.created_at
        };
      });

      // Combine and sort all logs by date (newest first)
      const allLogs = [...transformedFarmerLogs, ...transformedStakeholderLogs].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setActivityLogs(allLogs);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
      setActivityLogs([]);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setLoading(false);
        return;
      }

      const profile = await resolveProfile(user.id);
      if (!profile) {
        setLoading(false);
        return;
      }

      // Get ALL sites owned by this owner
      const { data: allSites } = await supabase
        .from('sites')
        .select('id, facility_name')
        .eq('owner_profile_id', profile.id);

      if (!allSites || allSites.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      const siteIds = allSites.map(s => s.id);
      const siteMap = new Map(allSites.map(s => [s.id, s.facility_name]));

      // Get all rooms for ALL sites
      const { data: allRooms } = await supabase
        .from('cold_storage_rooms')
        .select('id, room_name, site_id')
        .in('site_id', siteIds);

      const roomIds = allRooms?.map(r => r.id) || [];
      const roomMap = new Map(allRooms?.map(r => [r.id, { name: r.room_name, site_id: r.site_id }]) || []);

      // Get all alerts for ALL rooms in ALL sites
      const { data: allAlerts } = await supabase
        .from('alerts')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false });

      // Enrich alerts with site and room names
      const enrichedAlerts = (allAlerts || []).map(alert => {
        const room = roomMap.get(alert.room_id);
        const siteName = room ? siteMap.get(room.site_id) || 'Unknown Site' : 'Unknown Site';
        return {
          ...alert,
          room_name: room?.name || 'Unknown Room',
          facility_name: siteName
        };
      });

      setAlerts(enrichedAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'resolved', resolved_at: new Date().toISOString() }
          : alert
      ));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'unresolved').length;
  const criticalSolved = alerts.filter(a => a.severity === 'critical' && a.status === 'resolved').length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && a.status === 'unresolved').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length + activityLogs.length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertCircle;
      case 'warning': return Clock;
      case 'info': return Bell;
      default: return Bell;
    }
  };

  const getSeverityColor = (severity: string, status: string) => {
    if (status === 'resolved') {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
      };
    }
    switch (severity) {
      case 'critical': return {
        bg: 'bg-red-50 dark:bg-red-900/30',
        text: 'text-red-600 dark:text-red-400',
        badge: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      };
      case 'warning': return {
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        text: 'text-amber-600 dark:text-amber-400',
        badge: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
      };
      case 'info': return {
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        badge: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
      };
      default: return {
        bg: 'bg-slate-50 dark:bg-slate-900/30',
        text: 'text-slate-600 dark:text-slate-400',
        badge: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20'
      };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            All Sites Activity
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Review incidents, warnings, and maintenance notifications across all your sites.
          </p>
        </div>
        <button 
          onClick={() => navigate('/owner/settings')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          Notification Settings
        </button>
      </div>

      {!user?.id ? (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-200px)]">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Not Authenticated</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Please log in to view alerts and activity.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Critical Alerts</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{criticalCount}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{criticalSolved} Solved</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Unresolved Warnings</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{warningCount}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Needs Attention</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Information Logs</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{infoCount}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">System Updates</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity & Alerts</h2>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
              </div>
            ) : alerts.length === 0 && activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No alerts or activity yet</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  You'll see system alerts, warnings, and activity logs here when they occur.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {activityLogs.map((log) => {
                  let Icon = Bell;
                  let badgeColor = 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
                  let title = 'Activity';
                  let description = '';
                  
                  if (log.action_subtype === 'submitted') {
                    Icon = Clock;
                    badgeColor = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
                    title = 'Storage Request Submitted';
                    description = `${log.actor_name} requested access to ${log.target_name} at ${log.facility_name}`;
                  } else if (log.action_subtype === 'approved' && log.target_type === 'room_request') {
                    Icon = CheckCircle;
                    badgeColor = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
                    title = 'Storage Request Approved';
                    description = `${log.actor_name}'s request for ${log.target_name} was approved at ${log.facility_name}`;
                  } else if (log.action_subtype === 'rejected') {
                    Icon = X;
                    badgeColor = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
                    title = 'Storage Request Rejected';
                    description = `${log.actor_name}'s request for ${log.target_name} was rejected at ${log.facility_name}`;
                  } else if (log.action_subtype === 'requested' && log.target_type === 'stakeholder') {
                    Icon = TrendingUp;
                    badgeColor = 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
                    title = 'Investment Requested';
                    const amount = log.related_data?.amount_inr ? `₹${log.related_data.amount_inr.toLocaleString()}` : '';
                    description = `${log.actor_name} requested investment in ${log.facility_name} ${amount}`;
                  } else if (log.action_subtype === 'approved' && log.target_type === 'stakeholder') {
                    Icon = CheckCircle;
                    badgeColor = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
                    title = 'Investment Approved';
                    const amount = log.related_data?.amount_inr ? `₹${log.related_data.amount_inr.toLocaleString()}` : '';
                    description = `Investment request was approved at ${log.facility_name} ${amount}`;
                  }
                  
                  return (
                    <div key={log.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className={`p-3 ${badgeColor.split(' text-')[0]} rounded-xl`}>
                        <Icon className={`w-6 h-6 ${badgeColor.split('bg-')[1]}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {title}
                          </h3>
                          <span className={`text-xs font-semibold uppercase tracking-widest ${badgeColor} px-2 py-1 rounded`}>
                            {log.action_subtype || 'Activity'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {description}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          {getTimeAgo(log.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OwnerAlerts;
