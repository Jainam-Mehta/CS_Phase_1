import React, { useEffect, useState } from 'react';
import { Bell, ShieldCheck, AlertCircle, Clock, CheckCircle, User, Wrench, Check, TrendingUp, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSiteStore } from '../../stores/useSiteStore';
import { useDemoData } from '../../hooks/useDemoData';
import { resolveProfile } from '../../lib/profileUtils';


interface Alert {
  id: string;
  room_id: string;
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
  const { selectedFacilityId } = useSiteStore();
  const { isDemoMode, getOwnerData } = useDemoData();
  const demoData = getOwnerData();
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');

  useEffect(() => {
    if (user?.id && selectedFacilityId) {
      loadAlerts();
      loadActivityLogs();
    }
  }, [user?.id, selectedFacilityId, selectedRoomId, isDemoMode]);

  const loadActivityLogs = async () => {
    if (!user?.id) return;
    try {
      // CHECK DEMO MODE FIRST
      if (isDemoMode && demoData) {
        // Transform demo activity logs to match expected format
        const demoLogs = demoData.activityLogs.map((log: any, idx: number) => ({
          id: `log-${idx}`,
          actor_name: 'Suresh Kumar',
          action_type: 'inventory',
          action_subtype: 'batch_added',
          target_type: 'farmer',
          target_name: log.action.split(' ')[1] || 'Roy',
          facility_name: demoData.sites[0].facility_name,
          related_data: {},
          created_at: log.timestamp
        }));
        setActivityLogs(demoLogs);
        return;
      }
      
      // NORMAL DATABASE FLOW
      const profile = await resolveProfile(user.id);
      if (!profile) return;

      console.log('Loading activity logs for profile:', profile.id);

      // Get activities where user is the actor (owner/approver)
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('actor_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('Activity logs loaded:', logs?.length);
      setActivityLogs(logs as ActivityLog[] || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      // CHECK DEMO MODE FIRST
      if (isDemoMode && demoData) {
        const currentSite = demoData.sites.find((s: any) => s.id === selectedFacilityId) || demoData.sites[0];
        setSiteName(currentSite.facility_name);
        
        // Set rooms
        const siteRooms = demoData.rooms.filter((r: any) => r.site_id === currentSite.id);
        setRooms(siteRooms);
        
        if (siteRooms.length > 0 && !selectedRoomId) {
          setSelectedRoomId(siteRooms[0].id);
        }
        
        // Transform demo alerts to match expected format
        const demoAlerts = demoData.alerts.map((alert: any) => ({
          id: alert.id,
          room_id: siteRooms[0]?.id || 'room-kullu-a-1',
          alert_type: alert.message.includes('Temperature') ? 'temperature' : 'info',
          severity: alert.severity as 'critical' | 'warning' | 'info',
          title: alert.message.split('-')[0] || alert.message,
          description: alert.message,
          status: alert.status as 'unresolved' | 'resolved',
          resolved_at: alert.status === 'resolved' ? alert.created_at : undefined,
          created_at: alert.created_at
        }));
        
        setAlerts(demoAlerts);
        setLoading(false);
        return;
      }
      
      // NORMAL DATABASE FLOW
      // Fetch Site Name
      const { data: siteData } = await supabase
        .from('sites')
        .select('facility_name')
        .eq('id', selectedFacilityId)
        .single();

      setSiteName(siteData?.facility_name || 'Your Site');

      // Fetch Rooms for selected facility
      const { data: rmData, error: rmError } = await supabase
        .from('cold_storage_rooms')
        .select('*')
        .eq('site_id', selectedFacilityId);

      console.log('Rooms query error:', rmError);
      console.log('Rooms fetched:', rmData?.length || 0);

      const resolvedRooms = rmData || [];
      setRooms(resolvedRooms);

      // Set default room if not already selected
      if (resolvedRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(resolvedRooms[0].id);
      }

      const roomToUse = selectedRoomId || (resolvedRooms.length > 0 ? resolvedRooms[0].id : null);
      
      if (!roomToUse || resolvedRooms.length === 0) {
        setAlerts([]);
        return;
      }

      const roomIds = [roomToUse];

      // Get all alerts for these rooms
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false });

      setAlerts(alertsData || []);
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

      // Update local state
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
  const infoCount = alerts.filter(a => a.severity === 'info').length + activityLogs.length; // Include activity logs

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
            {siteName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Review incidents, warnings, and maintenance notifications.
          </p>
        </div>
        <button 
          onClick={() => navigate('/owner/settings')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          Notification Settings
        </button>
      </div>

      {/* Room Selector - Show if multiple rooms */}
      {rooms.length > 1 && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Room:</label>
          <select
            value={selectedRoomId || ''}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.room_name} (Capacity: {room.capacity_kg}kg)
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedFacilityId ? (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-200px)]">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Facility Selected</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Please select a facility from the dropdown in the top header.
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
                {/* Activity Logs */}
                {activityLogs.length > 0 && (
                  <>
                    {activityLogs.map((log) => {
                      let Icon = Bell;
                      let badgeColor = 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
                      
                      if (log.action_type === 'stakeholder_approved') {
                        Icon = CheckCircle;
                        badgeColor = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
                      } else if (log.action_type === 'stakeholder_requested') {
                        Icon = Clock;
                        badgeColor = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
                      } else if (log.action_type === 'payment_received') {
                        Icon = CreditCard;
                        badgeColor = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
                      }
                      
                      return (
                        <div key={log.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className={`p-3 ${badgeColor.split(' text-')[0]} rounded-xl`}>
                            <Icon className={`w-6 h-6 ${badgeColor.split('bg-')[1]}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {log.action_type === 'stakeholder_approved' ? '✓ Investment Approved' : 
                                 log.action_type === 'stakeholder_requested' ? 'Investment Request' :
                                 log.action_type === 'payment_received' ? 'Payment Received' :
                                 log.action_type}
                              </h3>
                              <span className={`text-xs font-semibold uppercase tracking-widest ${badgeColor} px-2 py-1 rounded`}>
                                {log.related_data?.status || 'Activity'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              <strong>{log.actor_name}</strong> {
                                log.action_type === 'stakeholder_approved' ? 'approved investment from' :
                                log.action_type === 'payment_received' ? 'received payment from' :
                                'requested investment from'
                              } <strong>{log.target_name}</strong> for {log.facility_name}
                            </p>
                            {log.related_data?.investment_amount_inr && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Amount: ₹{log.related_data.investment_amount_inr.toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                              {getTimeAgo(log.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* System Alerts */}
                {alerts.length > 0 && (
                  <>
                    {alerts.map((alert) => {
                      const Icon = alert.status === 'resolved' ? CheckCircle : getSeverityIcon(alert.severity);
                      const colors = getSeverityColor(alert.severity, alert.status);
                      
                      return (
                        <div key={alert.id} className="p-6 flex items-start gap-4">
                          <div className={`p-3 ${colors.bg} rounded-xl`}>
                            <Icon className={`w-6 h-6 ${colors.text}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-slate-900 dark:text-white">{alert.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold uppercase tracking-widest ${colors.badge} px-2 py-1 rounded`}>
                                  {alert.status === 'resolved' ? 'Resolved' : alert.severity}
                                </span>
                                {alert.status === 'unresolved' && (
                                  <button
                                    onClick={() => handleResolveAlert(alert.id)}
                                    className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                    <Check className="w-3 h-3" />
                                    Mark Resolved
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{alert.description}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                              {alert.status === 'resolved' && alert.resolved_at 
                                ? `Resolved ${getTimeAgo(alert.resolved_at)}`
                                : getTimeAgo(alert.created_at)
                              }
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OwnerAlerts;
