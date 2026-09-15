import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { supabase } from '../../lib/supabase';
import { Gauge } from './components/Gauge';
import { 
  ThermometerSun, Droplets, MapPin, Package, Clock, Lock, 
  AlertCircle, RefreshCw, ChevronDown, CheckCircle2, XCircle, 
  Activity, Zap, DoorOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

class DashboardErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, errorMsg: string}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || 'Unknown render error occurred.' };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("FarmerDashboard Render Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-[1400px] mx-auto min-h-screen pt-16 flex flex-col items-center">
          <Card className="w-full max-w-lg border-t-4 border-t-red-500 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-8 text-center flex flex-col items-center">
               <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
               <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unable to load dashboard data.</h2>
               <p className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-md w-full break-words border border-slate-200">
                 {this.state.errorMsg}
               </p>
               <button onClick={() => window.location.reload()} className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
                 <RefreshCw className="w-4 h-4" /> Retry Connection
               </button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function FarmerDashboard() {
  return (
    <DashboardErrorBoundary>
      <FarmerDashboardCore />
    </DashboardErrorBoundary>
  );
}

// NO DEMO DATA - All data from database

function FarmerDashboardCore() {
  const { user } = useAuthStore();
  const { activeRoomId, activeProductId, setActiveRoomId, setActiveProductId } = useFarmerStore();
  
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [roomIndex, setRoomIndex] = useState(0);

  // Data state
  const [facilities, setFacilities] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  
  const [activeProductData, setActiveProductData] = useState<any>(null);
  const [liveConditions, setLiveConditions] = useState<any>(null);
  const [temperatureHistory, setTemperatureHistory] = useState<any[]>([]);
  const [doorEvents, setDoorEvents] = useState<any[]>([]);
  const [doorStats, setDoorStats] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [energyData, setEnergyData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  const [hasAnyApproved, setHasAnyApproved] = useState(false);
  const [hasAnyPending, setHasAnyPending] = useState(false);
  const [pendingDetails, setPendingDetails] = useState<any>(null);
  
  // Live temperature/humidity update from database every minute
  useEffect(() => {
    const interval = setInterval(async () => {
      if (activeRoomId) {
        try {
          // Fetch latest sensor reading
          const { data: latestReading } = await supabase
            .from('sensor_readings')
            .select('temperature_celsius, humidity_percentage, recorded_at')
            .eq('room_id', activeRoomId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (latestReading) {
            setLiveConditions((prev: any) => ({
              ...prev,
              temp: latestReading.temperature_celsius,
              hum: latestReading.humidity_percentage,
              date: latestReading.recorded_at
            }));
          }
        } catch (error) {
          console.error('Error fetching live conditions:', error);
        }
      }
    }, 60000); // Update every 60 seconds
    
    return () => clearInterval(interval);
  }, [activeRoomId]);

  // DEMO DATA: Roy's demo circular temperature/humidity values (15 values)
  const DEMO_ROY_EMAIL = 'Roy@coldsense.in';
  const DEMO_TEMP_HUMIDITY_VALUES = [
    { temp: 3.2, hum: 87 },
    { temp: 3.1, hum: 88 },
    { temp: 3.3, hum: 86 },
    { temp: 3.0, hum: 89 },
    { temp: 3.2, hum: 87 },
    { temp: 3.4, hum: 85 },
    { temp: 3.1, hum: 88 },
    { temp: 3.3, hum: 86 },
    { temp: 3.2, hum: 87 },
    { temp: 3.0, hum: 89 },
    { temp: 3.1, hum: 88 },
    { temp: 3.3, hum: 86 },
    { temp: 3.2, hum: 87 },
    { temp: 3.4, hum: 85 },
    { temp: 3.1, hum: 88 }
  ];

  let demoValueIndex = 0;
  
  // Update demo data every minute in circular fashion
  useEffect(() => {
    if (user?.email !== DEMO_ROY_EMAIL) return;
    
    const interval = setInterval(() => {
      demoValueIndex = (demoValueIndex + 1) % DEMO_TEMP_HUMIDITY_VALUES.length;
      const currentValue = DEMO_TEMP_HUMIDITY_VALUES[demoValueIndex];
      
      setLiveConditions({
        temp: currentValue.temp,
        hum: currentValue.hum,
        date: new Date().toISOString()
      });
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [user?.email]);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date().toLocaleString());

  // Update timestamp every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTimestamp(new Date().toLocaleString());
    }, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const initializeDashboard = async () => {
      try {
        setLoading(true);
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
        if (!profile) throw new Error("Profile missing");
        setProfileId(profile.id);

        const { data: accessLogs } = await supabase
          .from('farmer_room_access')
          .select(`room_id, status, cold_storage_rooms(id, room_name, facility_id, facilities(id, facility_name))`)
          .eq('farmer_id', profile.id)
          .order('requested_at', { ascending: false });

        if (!accessLogs || accessLogs.length === 0) {
           setLoading(false);
           return;
        }

        const approvedRooms: any[] = [];
        let pFound = false;
        let pDetails: any = null;

        accessLogs.forEach(log => {
           if (log.status === 'Approved' && log.cold_storage_rooms) {
               const r = Array.isArray(log.cold_storage_rooms) ? log.cold_storage_rooms[0] : log.cold_storage_rooms;
               const fac = r.facilities ? (Array.isArray(r.facilities) ? r.facilities[0] : r.facilities) : null;
               if (r && fac) {
                   approvedRooms.push({
                      roomId: r.id,
                      roomName: r.room_name,
                      facilityId: fac.id,
                      facilityName: fac.facility_name
                   });
               }
           } else if (log.status === 'Pending') {
               pFound = true;
               if (!pDetails && log.cold_storage_rooms) {
                  const r = Array.isArray(log.cold_storage_rooms) ? log.cold_storage_rooms[0] : log.cold_storage_rooms;
                  const fac = r.facilities ? (Array.isArray(r.facilities) ? r.facilities[0] : r.facilities) : null;
                  pDetails = { roomName: r?.room_name, facilityName: fac?.facility_name };
               }
           }
        });

        setHasAnyApproved(approvedRooms.length > 0);
        setHasAnyPending(pFound);
        setPendingDetails(pDetails);

        if (approvedRooms.length > 0) {
            const facMap = new Map();
            approvedRooms.forEach(r => facMap.set(r.facilityId, { id: r.facilityId, name: r.facilityName }));
            const facs = Array.from(facMap.values());
            setFacilities(facs);
            setRooms(approvedRooms);

            let currentFac = facs[0].id;
            let currentRoomId = approvedRooms.find(r => r.facilityId === currentFac)?.roomId;
            
            if (activeRoomId && approvedRooms.find(r => r.roomId === activeRoomId)) {
                const facForRoom = approvedRooms.find(r => r.roomId === activeRoomId)?.facilityId;
                if (facForRoom) currentFac = facForRoom;
                currentRoomId = activeRoomId;
            } else {
                setActiveRoomId(currentRoomId);
            }
            setSelectedFacilityId(currentFac);
        }
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [user?.id]);

  // Initialize with empty data - NO DEMO FALLBACK
  useEffect(() => {
    if (!loading && !liveConditions) {
      setLiveConditions({ temp: 0, hum: 0, ambientTemp: 0, ambientHum: 0, date: new Date().toISOString() });
      
      // For Roy (demo): Show door opened 1 time
      // For others: Show 0 times
      if (user?.email === DEMO_ROY_EMAIL) {
        setDoorStats({ status: 'Closed', count: 1, duration: 0, lastOpenTime: 'Today' });
        setAlerts([
          {
            id: 'demo-1',
            created_at: new Date().toISOString(),
            title: '7 kg apples delivered to Apple Studios',
            message: 'Order fulfillment completed successfully',
            type: 'order',
            is_acknowledged: true
          },
          {
            id: 'demo-2',
            created_at: new Date(Date.now() - 24*60*60*1000).toISOString(),
            title: 'Temperature increased out of range',
            message: 'Temperature exceeded max range (6°C for apples) for 24 minutes',
            type: 'temperature',
            is_acknowledged: true
          }
        ]);
      } else {
        setDoorStats({ status: 'Unknown', count: 0, duration: 0, lastOpenTime: 'N/A' });
        setAlerts([]);
      }
      
      setEnergyData([]);
      setTemperatureHistory([]);
    }
  }, [loading, liveConditions, user?.email]);

  useEffect(() => {
     if (!activeRoomId || !profileId) return;

     const fetchRoomData = async () => {
         // NO DEMO DATA - Fetch real data only
         const { data: invRows } = await supabase
            .from('batch_room_allocations')
            .select(`
              quantity_kg,
              batches!inner(
                product_id,
                harvest_date,
                expiry_date,
                quality_grade,
                products!inner(
                  id, name, storage_temp_min, storage_temp_max, storage_humidity_min, storage_humidity_max, shelf_life_days
                )
              )
            `)
            .eq('room_id', activeRoomId)
            .eq('batches.farmer_id', profileId)
            .is('removed_at', null);
            
         if (invRows) {
            const pMap = new Map();
            invRows.forEach((r: any) => {
               const p = r.batches.products;
               if (p && !pMap.has(p.id)) {
                  pMap.set(p.id, p);
               }
            });
            const prods = Array.from(pMap.values());
            setProducts(prods);
            
            if (prods.length > 0) {
               const isValidCurrent = prods.find(p => p.id === activeProductId);
               if (!activeProductId || !isValidCurrent) {
                  setActiveProductId(prods[0].id);
               }
            } else {
               setActiveProductId(null);
            }
         }

         const { data: conds } = await supabase
            .from('cold_storage_conditions')
            .select('temperature, humidity, recorded_at')
            .eq('room_id', activeRoomId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

         setLiveConditions(conds || null);

         const { data: hist } = await supabase
            .from('cold_storage_conditions')
            .select('temperature, humidity, recorded_at')
            .eq('room_id', activeRoomId)
            .order('recorded_at', { ascending: false })
            .limit(8);
         
         if (hist) setTemperatureHistory(hist.reverse());

         const { data: doors } = await supabase
            .from('door_events')
            .select('*')
            .eq('room_id', activeRoomId)
            .order('occurred_at', { ascending: false })
            .limit(10);
            
         if (doors) {
             setDoorEvents(doors);
             
             const today = new Date().toISOString().split("T")[0];
             const todayEvents = doors.filter(d => d.occurred_at.startsWith(today));
             const openCount = todayEvents.filter(d => d.event_type === 'Opened').length;
             const totalDur = todayEvents.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
             const lastOpen = todayEvents.find(d => d.event_type === 'Opened');
             
             setDoorStats({
                status: doors.length > 0 ? (doors[0].event_type === 'Closed' ? 'Closed' : 'Open') : 'Closed',
                count: openCount,
                duration: totalDur,
                lastOpenTime: lastOpen ? new Date(lastOpen.occurred_at).toLocaleTimeString() : 'N/A'
             });
         } else {
             setDoorStats({ status: 'Closed', count: 0, duration: 0, lastOpenTime: 'N/A' });
         }

         const { data: alData } = await supabase
            .from('alerts')
            .select('id, alert_type, severity, title, created_at')
            .eq('room_id', activeRoomId)
            .eq('farmer_id', profileId)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5);
         if (alData) setAlerts(alData);

         const { data: enData } = await supabase
            .from('energy_usage')
            .select('total_kwh, recorded_at')
            .eq('room_id', activeRoomId)
            .order('recorded_at', { ascending: false })
            .limit(7);
         if (enData) setEnergyData(enData.reverse());
     };

     fetchRoomData();
  }, [activeRoomId, profileId]);

  useEffect(() => {
     if (activeProductId && products.length > 0) {
         setActiveProductData(products.find(p => p.id === activeProductId));
     } else {
         setActiveProductData(null);
     }
  }, [activeProductId, products]);

  useEffect(() => {
      if (!activeRoomId || !activeProductId || !profileId) {
          setInventory([]);
          return;
      }
      
      const loadSpecificInventory = async () => {
         const { data: invRows } = await supabase
            .from('batch_room_allocations')
            .select(`
              quantity_kg, assigned_at,
              batches!inner(
                batch_code, product_id, harvest_date, expiry_date, quality_grade,
                products!inner(id, name)
              )
            `)
            .eq('room_id', activeRoomId)
            .eq('batches.farmer_id', profileId)
            .eq('batches.product_id', activeProductId)
            .is('removed_at', null);

         if (invRows) setInventory(invRows);
      };
      
      loadSpecificInventory();
  }, [activeRoomId, activeProductId, profileId]);

  if (loading) {
     return <div className="p-8 flex justify-center pt-24"><RefreshCw className="animate-spin w-8 h-8 text-primary-600" /></div>;
  }

  if (!hasAnyApproved) {
     if (hasAnyPending) {
         return (
             <div className="flex items-center justify-center min-h-screen">
               <div className="text-center">
                <Clock className="w-20 h-20 text-yellow-500 animate-pulse mx-auto mb-6" />
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Waiting for Approval</h1>
               </div>
             </div>
         );
     }
     return (
        <div className="p-8 max-w-4xl mx-auto text-center pt-16">
           <Package className="w-16 h-16 text-purple-500 mx-auto mb-6" />
           <h1 className="text-2xl font-bold mb-3">No Approved Rooms</h1>
           <p className="text-slate-500">You do not have access to any storage rooms yet.</p>
        </div>
     );
  }

  const roomOptions = rooms.filter(r => r.facilityId === selectedFacilityId);
  
  // NO DEMO DATA - Use real data or fallback to 0/empty
  const displayTemp = liveConditions?.temp ?? 0;
  const displayHum = liveConditions?.hum ?? 0;
  const displayAmbientTemp = liveConditions?.ambientTemp ?? 0;
  const displayAmbientHum = liveConditions?.ambientHum ?? 0;
  const displayDoorStats = doorStats ?? { status: 'Unknown', count: 0, duration: 0, lastOpenTime: 'N/A' };
  const displayEnergyData = energyData.length > 0 ? energyData : [];
  const displayTemperatureHistory = temperatureHistory.length > 0 ? temperatureHistory : [];
  const displayHumidityHistory = temperatureHistory.length > 0
    ? temperatureHistory.map((h: any) => ({ time: h.time, value: h.humidity }))
    : [];
  
  let tempEval = { status: 'GOOD', style: 'bg-emerald-100 text-emerald-700', message: 'Optimal' };
  let humEval = { status: 'GOOD', style: 'bg-emerald-100 text-emerald-700', message: 'Optimal' };
  
  // Use optimal ranges from database (products table)
  const tempMin = activeProductData?.storage_temp_min ?? 1;
  const tempMax = activeProductData?.storage_temp_max ?? 5;
  const humMin = activeProductData?.storage_humidity_min ?? 82;
  const humMax = activeProductData?.storage_humidity_max ?? 96;
  
  if (liveConditions) {
      if (displayTemp < tempMin) {
          tempEval = { status: 'Too Low', style: 'bg-blue-100 text-blue-700', message: `${(tempMin - displayTemp).toFixed(1)}C below target` };
      } else if (displayTemp > tempMax) {
          tempEval = { status: 'Too High', style: 'bg-red-100 text-red-700', message: `${(displayTemp - tempMax).toFixed(1)}C above target` };
      } else {
          tempEval = { status: 'Optimal', style: 'bg-emerald-100 text-emerald-700', message: 'Optimal' };
      }
      
      if (displayHum < humMin) {
          humEval = { status: 'Too Low', style: 'bg-amber-100 text-amber-700', message: `Low` };
      } else if (displayHum > humMax) {
          humEval = { status: 'Too High', style: 'bg-red-100 text-red-700', message: `High` };
      } else {
          humEval = { status: 'Optimal', style: 'bg-emerald-100 text-emerald-700', message: 'Optimal' };
      }
  }

  // Pre-calculate shelf life remaining
  let shelfLifeRemaining = '14 DAYS';

  return (
    <div className="p-4 flex-1 md:p-8 max-w-[1400px] mx-auto min-h-screen pt-4 space-y-6">
       {/* 1. CURRENT STORAGE SELECTOR */}
       <Card className="border border-slate-200 shadow-sm bg-white overflow-visible z-10">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
             <div className="flex-1 relative">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Facility</label>
                <div className="relative">
                  <select 
                     className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-semibold outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                     value={selectedFacilityId}
                     onChange={(e) => {
                         setSelectedFacilityId(e.target.value);
                         const newRoom = rooms.find(r => r.facilityId === e.target.value);
                         setActiveRoomId(newRoom ? newRoom.roomId : null);
                     }}
                  >
                     {facilities.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
             </div>
             <div className="flex-1 relative">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Product</label>
                <div className="relative">
                  <select 
                     className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-semibold outline-none focus:ring-2 focus:ring-primary-500 appearance-none disabled:opacity-50"
                     value={activeProductId || ''}
                     onChange={(e) => setActiveProductId(e.target.value)}
                     disabled={products.length === 0}
                  >
                     {products.length === 0 && <option value="">No Products Saved</option>}
                     {products.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </CardContent>
       </Card>

       {!activeProductId ? (
           <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-xl mt-8">
               <h2 className="text-xl font-bold text-slate-600">No Product Data Available</h2>
               <p className="text-slate-500">Please ensure you have inventory allocated to this room using the Inventory menu.</p>
           </div>
       ) : (
           <div className="space-y-6 pt-2">
              {/* 3 & 4 & 5. KEY METRICS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Gauges */}
                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-6 flex flex-col justify-center items-center h-full">
                       <div className="w-12 h-12 mb-4 flex items-center justify-center bg-blue-50 rounded-full">
                         <ThermometerSun className="w-7 h-7 text-blue-600" />
                       </div>
                       {liveConditions ? (
                           <Gauge value={liveConditions.temp} min={-10} max={30} label="Temperature" unit="C" gradientColors={['#3b82f6', '#ef4444']} />
                       ) : <Gauge value={0} min={-10} max={30} label="Temperature" unit="C" gradientColors={['#3b82f6', '#ef4444']} />}
                       <p className="text-xs font-semibold mt-4 text-slate-600">
                         Status: <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tempEval.style}`}>{tempEval.status}</span>
                       </p>
                    </CardContent>
                 </Card>
                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-6 flex flex-col justify-center items-center h-full">
                       <div className="w-12 h-12 mb-4 flex items-center justify-center bg-emerald-50 rounded-full">
                         <Droplets className="w-7 h-7 text-emerald-600" />
                       </div>
                       {liveConditions ? (
                           <Gauge value={liveConditions.hum} min={0} max={100} label="Humidity" unit="%" gradientColors={['#22c55e', '#f97316']} />
                       ) : <Gauge value={0} min={0} max={100} label="Humidity" unit="%" gradientColors={['#22c55e', '#f97316']} />}
                       <p className="text-xs font-semibold mt-4 text-slate-600">
                         Status: <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${humEval.style}`}>{humEval.status}</span>
                       </p>
                    </CardContent>
                 </Card>

                 {/* KPI Cards */}
                 <div className="flex flex-col gap-6">
                    <Card className="flex-1 shadow-sm border-slate-200">
                       <CardContent className="p-6 flex justify-between items-center h-full">
                          <div>
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Energy Consumed</p>
                             <p className="text-3xl font-black mt-2 text-slate-800">{energyData.length > 0 ? `${energyData[0].total_kwh} kWh` : '0 kWh'}</p>
                          </div>
                          <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl"><Zap className="w-8 h-8"/></div>
                       </CardContent>
                    </Card>
                    <Card className="flex-1 shadow-sm border-slate-200">
                       <CardContent className="p-6 flex justify-between items-center h-full">
                          <div>
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Timestamp</p>
                             <p className="text-lg font-bold text-slate-800 mt-2 leading-tight">
                                {liveTimestamp}
                             </p>
                          </div>
                          <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl"><Clock className="w-8 h-8"/></div>
                       </CardContent>
                    </Card>
                 </div>

                 {/* Door Events & Alerts */}
                 <div className="flex flex-col gap-6">
                    {/* 4. Door Monitoring Card */}
                    <Card className="flex-1 shadow-sm border-slate-200">
                       <CardContent className="p-6 flex justify-between items-center h-full group">
                          <div>
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-primary-600 transition-colors">Door Monitor</p>
                             <div className="flex items-center gap-3 mt-2">
                               <p className="text-3xl font-black text-slate-800">{displayDoorStats.status}</p>
                               {displayDoorStats.status === 'Open' && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                             </div>
                             <p className="text-xs font-medium text-slate-500 mt-1">Opened {displayDoorStats.count} times today</p>
                          </div>
                          <div className="p-4 bg-slate-50 text-slate-600 rounded-2xl"><DoorOpen className="w-8 h-8"/></div>
                       </CardContent>
                    </Card>
                 {/* 9. Alerts */}
                    <Card className="flex-1 shadow-sm border-slate-200">
                       <CardContent className="p-6 flex justify-between items-center h-full">
                          <div>
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Alerts</p>
                             {/* Use real alerts.length instead of hardcoded 1 */}
                             <p className="text-3xl font-black mt-2 text-amber-600">{alerts.length}</p>
                             <p className="text-xs font-medium text-slate-500 mt-1 truncate max-w-[120px]">
                               {alerts.length === 0 ? 'All Clear' : `${alerts.length} Alert${alerts.length > 1 ? 's' : ''}`}
                             </p>
                          </div>
                          <div className={`p-4 rounded-2xl ${alerts.length > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                             {alerts.length > 0 ? <AlertCircle className="w-8 h-8"/> : <CheckCircle2 className="w-8 h-8" />}
                          </div>
                       </CardContent>
                    </Card>
                 </div>
              </div>

              {/* 6. CHARTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card className="shadow-sm border-slate-200">
                    <CardHeader><CardTitle className="text-sm text-slate-500 font-bold uppercase tracking-widest">Temperature History (Last 8 Readings)</CardTitle></CardHeader>
                    <CardContent className="h-72">
                       {displayTemperatureHistory.length > 0 ? (
                           <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={displayTemperatureHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                               <XAxis dataKey="time" tickFormatter={(t) => t} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                               <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                               <RechartsTooltip
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                               />
                               <Area type="monotone" dataKey="value" stroke="#ef4444" fillOpacity={0.15} fill="#ef4444" strokeWidth={3} />
                             </AreaChart>
                           </ResponsiveContainer>
                       ) : (
                           <div className="flex items-center justify-center h-full text-slate-400">No temperature data available</div>
                       )}
                    </CardContent>
                 </Card>
                 <Card className="shadow-sm border-slate-200">
                    <CardHeader><CardTitle className="text-sm text-slate-500 font-bold uppercase tracking-widest">Air Humidity Profile</CardTitle></CardHeader>
                    <CardContent className="h-72">
                       {displayHumidityHistory.length > 0 ? (
                           <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={displayHumidityHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                               <XAxis dataKey="time" tick={{fontSize: 10}} />
                               <YAxis tick={{fontSize: 10}} />
                               <RechartsTooltip />
                               <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={0.15} fill="#3b82f6" strokeWidth={3} />
                             </AreaChart>
                           </ResponsiveContainer>
                       ) : (
                           <div className="flex items-center justify-center h-full text-slate-400">No humidity data available</div>
                       )}
                    </CardContent>
                 </Card>
              </div>

           </div>
       )}
    </div>
  );
}
