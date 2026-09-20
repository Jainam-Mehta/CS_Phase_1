import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { resolveProfile } from '../../lib/profileUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Bell, CheckCircle, AlertCircle, Clock, Building2, TrendingUp, CreditCard, Trash2, Filter } from 'lucide-react';

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

const ActivityAlerts: React.FC = () => {
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    console.log('ActivityAlerts mounted, user:', user);
    loadActivities();
  }, [user?.id]);

  const loadActivities = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const profile = await resolveProfile(user.id);
      if (!profile) return;

      console.log('Loading activities for profile:', profile.id);

      // Get activities where user is the actor (owner/approver)
      const { data: actorActivities, error: actorError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('actor_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('Actor activities:', { count: actorActivities?.length, error: actorError });

      // Get activities where user is the target (stakeholder/farmer being acted upon)
      const { data: targetActivities, error: targetError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('target_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('Target activities:', { count: targetActivities?.length, error: targetError });

      // Combine and deduplicate
      const combined = [...(actorActivities || []), ...(targetActivities || [])];
      const uniqueActivities = Array.from(
        new Map(combined.map(a => [a.id, a])).values()
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('Total unique activities:', uniqueActivities.length);
      setActivities(uniqueActivities as ActivityLog[]);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'farmer_requested':
      case 'stakeholder_requested':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'farmer_approved':
      case 'stakeholder_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'payment_received':
        return <CreditCard className="h-5 w-5 text-emerald-500" />;
      case 'farmer_rejected':
      case 'stakeholder_rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getActivityLabel = (actionType: string): string => {
    switch (actionType) {
      case 'farmer_requested':
        return 'Farmer Requested Access';
      case 'farmer_approved':
        return 'Farmer Access Approved';
      case 'farmer_rejected':
        return 'Farmer Access Rejected';
      case 'stakeholder_requested':
        return 'Stakeholder Investment Request';
      case 'stakeholder_approved':
        return 'Stakeholder Investment Approved';
      case 'stakeholder_rejected':
        return 'Stakeholder Investment Rejected';
      case 'payment_received':
        return 'Payment Received';
      default:
        return actionType;
    }
  };

  const getActivityColor = (
    actionType: string
  ): 'bg-yellow-50' | 'bg-green-50' | 'bg-emerald-50' | 'bg-red-50' | 'bg-blue-50' => {
    switch (actionType) {
      case 'farmer_requested':
      case 'stakeholder_requested':
        return 'bg-yellow-50';
      case 'farmer_approved':
      case 'stakeholder_approved':
        return 'bg-green-50';
      case 'payment_received':
        return 'bg-emerald-50';
      case 'farmer_rejected':
      case 'stakeholder_rejected':
        return 'bg-red-50';
      default:
        return 'bg-blue-50';
    }
  };

  const getDarkActivityColor = (
    actionType: string
  ): 'dark:bg-yellow-900/20' | 'dark:bg-green-900/20' | 'dark:bg-emerald-900/20' | 'dark:bg-red-900/20' | 'dark:bg-blue-900/20' => {
    switch (actionType) {
      case 'farmer_requested':
      case 'stakeholder_requested':
        return 'dark:bg-yellow-900/20';
      case 'farmer_approved':
      case 'stakeholder_approved':
        return 'dark:bg-green-900/20';
      case 'payment_received':
        return 'dark:bg-emerald-900/20';
      case 'farmer_rejected':
      case 'stakeholder_rejected':
        return 'dark:bg-red-900/20';
      default:
        return 'dark:bg-blue-900/20';
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      setDeleting(activityId);
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      setActivities(activities.filter(a => a.id !== activityId));
    } catch (err) {
      console.error('Failed to delete activity:', err);
    } finally {
      setDeleting(null);
    }
  };

  const filteredActivities = filterType === 'all' 
    ? activities 
    : activities.filter(a => a.action_type === filterType);

  const actionTypes = [...new Set(activities.map(a => a.action_type))];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Activity & Alerts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View all system activities including farmer requests, investment approvals, and payment confirmations.
        </p>
      </div>

      {/* Filter */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filter Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              All Activities ({activities.length})
            </button>
            {actionTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {getActivityLabel(type)} ({activities.filter(a => a.action_type === type).length})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No activities yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map(activity => (
            <Card
              key={activity.id}
              className={`${getActivityColor(activity.action_type)} ${getDarkActivityColor(activity.action_type)} border-l-4 transition-all hover:shadow-md`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {getActivityLabel(activity.action_type)}
                        </h3>
                        <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          {activity.action_subtype}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <p>
                          <span className="font-medium">By:</span> {activity.actor_name}
                        </p>
                        {activity.target_name && (
                          <p>
                            <span className="font-medium">For:</span> {activity.target_name}
                          </p>
                        )}
                        {activity.facility_name && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>{activity.facility_name}</span>
                          </div>
                        )}

                        {/* Show related data */}
                        {activity.related_data && (
                          <div className="mt-2 pt-2 border-t border-current border-opacity-10">
                            {activity.related_data.investment_amount_inr && (
                              <p className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                <span>Amount: ₹{activity.related_data.investment_amount_inr.toLocaleString()}</span>
                              </p>
                            )}
                            {activity.related_data.amount_inr && (
                              <p className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                <span>Payment: ₹{activity.related_data.amount_inr.toLocaleString()}</span>
                              </p>
                            )}
                            {activity.related_data.status && (
                              <p>
                                <span className="font-medium">Status:</span> {activity.related_data.status}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteActivity(activity.id)}
                    disabled={deleting === activity.id}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete activity log"
                  >
                    <Trash2 className="h-5 w-5" />
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

export default ActivityAlerts;
