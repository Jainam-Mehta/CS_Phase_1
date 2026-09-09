import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { AlertTriangle, Bell, Info, ShieldAlert, LayoutDashboard } from 'lucide-react';
import { getProductOptimality, evaluateCondition } from '../../lib/optimalityEngine';

interface AlertItem {
   id: string;
   level: 'Critical' | 'Warning' | 'Info';
   title: string;
   message: string;
   time: string;
}

const FarmerAlerts: React.FC = () => {
  const { user } = useAuthStore();
  const { activeRoomId, activeProductId } = useFarmerStore();
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
     if (!activeRoomId || !activeProductId || !user?.id) {
         setAlerts([]);
         return;
     }
     
     const generateRealisticAlerts = async () => {
         setLoading(true);
         // 1. Fetch latest conditions from cold_storage_conditions
         const { data: cond } = await supabase
            .from('cold_storage_conditions')
            .select('temperature, humidity, recorded_at')
            .eq('room_id', activeRoomId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

         // 2. Fetch unread DB alerts for this room + farmer
         let profileId: string | null = null;
         if (user?.id) {
           const { data: prof } = await supabase
             .from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
           profileId = prof?.id ?? null;
         }

         const { data: dbAlerts } = profileId
           ? await supabase
               .from('alerts')
               .select('id, alert_type, severity, title, description, created_at')
               .eq('room_id', activeRoomId)
               .eq('farmer_id', profileId)
               .eq('is_read', false)
               .order('created_at', { ascending: false })
               .limit(10)
           : { data: [] };

         const generated: AlertItem[] = [];

         // Convert DB alerts to display format
         for (const al of dbAlerts || []) {
           generated.push({
             id: al.id,
             level: al.severity === 'critical' ? 'Critical' : al.severity === 'warning' ? 'Warning' : 'Info',
             title: al.title || al.alert_type,
             message: al.description || '',
             time: new Date(al.created_at).toLocaleTimeString(),
           });
         }

         // Evaluate conditions if available
         if (cond) {
             const optimal = getProductOptimality(activeProductId);
             const tempStatus = evaluateCondition(cond.temperature, optimal.minTemp, optimal.maxTemp);
             const humStatus = evaluateCondition(cond.humidity, optimal.minHum, optimal.maxHum);

             if (!tempStatus.isOptimal) {
                  generated.push({
                      id: 'temp_alert',
                      level: tempStatus.status === 'Too High' ? 'Critical' : 'Warning',
                      title: 'Temperature Exceeded Threshold',
                      message: `Core temperature is ${cond.temperature}°C, outside recommended ${optimal.minTemp}°C - ${optimal.maxTemp}°C range.`,
                      time: new Date(cond.recorded_at).toLocaleTimeString()
                  });
             }
             if (!humStatus.isOptimal) {
                  generated.push({
                      id: 'hum_alert',
                      level: 'Warning',
                      title: 'Humidity outside recommended bounds',
                      message: `Internal humidity is ${cond.humidity}%, differing from ${optimal.minHum}% - ${optimal.maxHum}% strict bounds.`,
                      time: new Date(cond.recorded_at).toLocaleTimeString()
                  });
             }
         }

         // If nothing found, add informational state
         if (generated.length === 0) {
             generated.push({
                 id: 'optimal_state',
                 level: 'Info',
                 title: 'All Systems Clear',
                 message: 'No active alerts. Storage conditions are within target limits.',
                 time: new Date().toLocaleTimeString()
             });
         }

         setAlerts(generated);
         setLoading(false);
     };

     generateRealisticAlerts();
  }, [user?.id, activeRoomId, activeProductId]);

  if (!activeRoomId || !activeProductId) {
      return (
        <div className="p-8 max-w-[1400px] mx-auto pt-16 h-[80vh] flex items-center justify-center">
           <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur">
              <LayoutDashboard className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Target Found</h2>
              <p className="text-slate-500 max-w-sm mx-auto mt-2">
                 Please select an active storage room AND product on the Dashboard to view accurate contextual tracking Alerts natively securely.
              </p>
           </div>
        </div>
      );
  }

  if (loading) {
      return <div className="p-8"><div className="animate-pulse h-32 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4"></div></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen">
       <div className="flex items-center gap-3 mb-8">
         <Bell className="w-8 h-8 text-blue-500" />
         <div>
           <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Active Alerts Tracking</h1>
         </div>
      </div>
      
      <div className="flex flex-col gap-4">
         {alerts.map((al) => {
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
                                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{al.time}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300">{al.message}</p>
                        </div>
                    </CardContent>
                 </Card>
             );
         })}
      </div>
    </div>
  );
};

export default FarmerAlerts;
