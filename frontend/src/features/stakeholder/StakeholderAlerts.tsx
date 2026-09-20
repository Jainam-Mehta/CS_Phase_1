import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { AlertTriangle, Bell, Info, ShieldAlert } from 'lucide-react';

interface AlertItem {
   id: string;
   level: 'Critical' | 'Warning' | 'Info';
   title: string;
   message: string;
   time: string;
   is_acknowledged?: boolean;
}

const StakeholderAlerts: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
     if (!user?.id) {
         setAlerts([]);
         return;
     }
     
     const loadAlertsAndLogs = async () => {
         try {
           setLoading(true);
           
           // Get stakeholder profile
           const { data: profile } = await supabase
             .from('profiles')
             .select('id')
             .eq('auth_user_id', user.id)
             .maybeSingle();
           
           if (!profile) {
             setAlerts([]);
             return;
           }

           // Fetch activity logs where stakeholder is actor OR target
           const { data: logs } = await supabase
             .from('activity_logs')
             .select('*')
             .or(`actor_id.eq.${profile.id},target_id.eq.${profile.id}`)
             .order('created_at', { ascending: false })
             .limit(50);

           // Transform logs to alert items
           const alertItems: AlertItem[] = (logs || []).map((log: any) => ({
             id: log.id,
             level: log.action_type.includes('accepted') ? 'Info' : 
                    log.action_type.includes('rejected') ? 'Warning' : 'Info',
             title: log.action_type === 'stakeholder_interested' ? 'Investment Interest' :
                    log.action_type === 'stakeholder_accepted' ? 'Investment Approved' :
                    log.action_type === 'stakeholder_rejected' ? 'Investment Rejected' :
                    log.action_subtype || 'Activity',
             message: `${log.actor_name}: ${log.related_data?.status || log.action_subtype}`,
             time: new Date(log.created_at).toLocaleTimeString(),
             is_acknowledged: true
           }));

           setAlerts(alertItems);
         } catch (err) {
           console.error('Failed to load alerts:', err);
           setAlerts([]);
         } finally {
           setLoading(false);
         }
     };

     loadAlertsAndLogs();
  }, [user?.id]);

  if (loading) {
      return <div className="p-8"><div className="animate-pulse h-32 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4"></div></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex items-center gap-3 mb-8">
         <Bell className="w-8 h-8 text-blue-500" />
         <div>
           <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Investment & Activity Alerts</h1>
         </div>
      </div>
      
      <div className="flex flex-col gap-4">
         {alerts.length === 0 ? (
           <Card className="border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10">
             <CardContent className="p-8 text-center">
               <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                 <Info className="w-6 h-6 text-emerald-600" />
               </div>
               <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-2">No Activity Yet</h3>
               <p className="text-sm text-emerald-700 dark:text-emerald-200">{new Date().toLocaleTimeString()}</p>
               <p className="text-emerald-600 dark:text-emerald-300 mt-2">No investment or activity notifications at this time.</p>
             </CardContent>
           </Card>
         ) : (
           alerts.map((al, idx) => {
               let borderCls = '';
               let iconCls = '';
               let textCls = '';
               let bgCls = '';
               let Icon = Info;

               if (al.level === 'Critical') {
                   borderCls = 'border-l-4 border-l-red-500 border-red-200 dark:border-red-900/40 ring-1 ring-red-500/10';
                   iconCls = 'text-red-500';
                   textCls = 'text-red-900 dark:text-red-100';
                   bgCls = 'bg-red-50 dark:bg-red-900/10';
                   Icon = ShieldAlert;
               } else if (al.level === 'Warning') {
                   borderCls = 'border-l-4 border-l-orange-500 border-orange-200 dark:border-orange-900/40 ring-1 ring-orange-500/10';
                   iconCls = 'text-orange-500';
                   textCls = 'text-orange-900 dark:text-orange-100';
                   bgCls = 'bg-orange-50 dark:bg-orange-900/10';
                   Icon = AlertTriangle;
               } else {
                   borderCls = 'border-l-4 border-l-blue-500 border-blue-200 dark:border-blue-900/40 ring-1 ring-blue-500/10';
                   iconCls = 'text-blue-500';
                   textCls = 'text-blue-900 dark:text-blue-100';
                   bgCls = 'bg-blue-50 dark:bg-blue-900/10';
                   Icon = Info;
               }

               return (
                   <Card key={al.id} className={`${borderCls} ${bgCls} shadow-sm`}>
                      <CardContent className="p-6 flex items-start gap-4">
                          <div className={`p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm shrink-0 ${iconCls}`}>
                              <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                  <h3 className={`text-lg font-bold ${textCls}`}>{al.title}</h3>
                                  <div className="flex items-center gap-2">
                                    {al.is_acknowledged && (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                        ✓ Seen
                                      </span>
                                    )}
                                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{al.time}</span>
                                  </div>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300">{al.message}</p>
                          </div>
                      </CardContent>
                   </Card>
               );
           })
         )}
      </div>
    </div>
  );
};

export default StakeholderAlerts;
