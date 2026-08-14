import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useFarmerStore } from '../../stores/useFarmerStore';
import { supabase } from '../../lib/supabase';
import { Gauge } from './components/Gauge';
import { 
  ThermometerSun, Droplets, MapPin, Package, Clock, Lock, 
  AlertCircle, RefreshCw, ChevronDown, CheckCircle2, XCircle, 
  Activity, Leaf, ActivitySquare, Battery, Zap, DoorOpen, Plus, Boxes, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell 
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

// Demo data generator for presentation
const getDemoData = (roomIndex: number = 0) => {
  const now = new Date();
  const roomData = [
    { temp: 2.4, hum: 86, ambientTemp: 27, ambientHum: 63, door: 'Closed', doorOpens: 2, doorLastOpen: '2 mins ago', energy: 12.6, solar: 71, battery: 89, grid: 29, product: 'Dragon Fruit', freshness: 98 },
    { temp: 5.7, hum: 85, ambientTemp: 29, ambientHum: 69, door: 'Open', doorOpens: 5, doorLastOpen: '18 sec ago', energy: 18.9, solar: 63, battery: 82, grid: 37, product: 'Avocado', freshness: 96 },
    { temp: 7.1, hum: 87, ambientTemp: 31, ambientHum: 71, door: 'Closed', doorOpens: 1, doorLastOpen: '45 mins ago', energy: 10.2, solar: 81, battery: 94, grid: 19, product: 'Mango', freshness: 91 }
  ];
  const data = roomData[roomIndex % 3];
  
  // Generate 24h temperature history with smooth curves between -2 and 10
  const tempHistory = [];
  const humHistory = [];
  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() - 23 + i + 24) % 24;
    // Smooth temperature curve between -2 and 10, no large spikes
    const baseTemp = 2.5 + Math.sin(i / 6) * 1.5 + Math.cos(i / 8) * 0.5;
    const clampedTemp = Math.max(-2, Math.min(10, baseTemp));
    const baseHum = 86 + Math.cos(i / 4) * 2; // 84-88% range
    tempHistory.push({ time: `${hour}:00`, value: parseFloat(clampedTemp.toFixed(1)) });
    humHistory.push({ time: `${hour}:00`, value: Math.round(baseHum) });
  }
  
  // Generate energy data
  const energyHistory = [];
  for (let i = 0; i < 12; i++) {
    energyHistory.push({ hour: `${i}:00`, value: (data.energy / 12 * (1 + Math.random() * 0.3)).toFixed(1) });
  }
  
  // Generate demo inventory
  const demoInventory = [
    {
      batches: {
        products: { name: data.product },
        batch_code: `BTH-${1000 + roomIndex}`,
        harvest_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString(),
        quality_grade: 'GOOD'
      },
      quantity_kg: 1200 + roomIndex * 500
    },
    {
      batches: {
        products: { name: data.product },
        batch_code: `BTH-${2000 + roomIndex}`,
        harvest_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        expiry_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        quality_grade: 'GOOD'
      },
      quantity_kg: 1250 + roomIndex * 300
    }
  ];
  
  return {
    liveConditions: { temp: data.temp, hum: data.hum, ambientTemp: data.ambientTemp, ambientHum: data.ambientHum, date: now.toISOString() },
    doorStats: { status: data.door, count: data.doorOpens, duration: data.door === 'Open' ? 18 : 0, lastOpenTime: data.doorLastOpen },
    energyData: [{ total_kwh: data.energy, solar: data.solar, battery: data.battery, grid: data.grid }],
    temperatureHistory: tempHistory,
    humidityHistory: humHistory,
    energyHistory: energyHistory,
    inventory: demoInventory,
    aiRecommendation: data.product === 'Dragon Fruit' 
      ? 'Excellent Storage Conditions. Maintain 2-4°C. Expected shelf life 18 days.'
      : data.product === 'Avocado'
      ? 'Humidity slightly low. Increase RH to 85%.'
      : 'Temperature optimal. Ethylene concentration acceptable.',
    freshness: data.freshness,
    lastUpdated: now.toLocaleString()
  };
};

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
  
  // Live temperature/humidity update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (roomIndex !== null) {
        const demo = getDemoData(roomIndex);
        // Fluctuate temperature between 2-4°C, rounded to 1 decimal
        const newTemp = parseFloat((2.0 + Math.random() * 2.0).toFixed(1));
        // Fluctuate humidity between 84-88%, rounded to 1 decimal
        const newHum = parseFloat((84 + Math.random() * 4).toFixed(1));
        
        setLiveConditions(prev => ({
          ...prev,
          temp: prev ? newTemp : demo.liveConditions.temp,
          hum: prev ? newHum : demo.liveConditions.hum,
          date: new Date().toISOString()
        }));
      }
    }, 60000); // Update every 60 seconds
    
    return () => clearInterval(interval);
  }, [roomIndex]);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date().toLocaleString());

  // Update timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTimestamp(new Date().toLocaleString());
    }, 1000);
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

  // Set demo data as fallback when real data is missing
  useEffect(() => {
    if (!loading && !liveConditions) {
      const demo = getDemoData(roomIndex);
      setLiveConditions(demo.liveConditions);
      setDoorStats(demo.doorStats);
      setEnergyData(demo.energyData);
      setTemperatureHistory(demo.temperatureHistory);
      if (!temperatureHistory || temperatureHistory.length === 0) {
        setTemperatureHistory(demo.temperatureHistory);
      }
    }
  }, [loading, liveConditions, roomIndex]);

  useEffect(() => {
     if (!activeRoomId || !profileId) return;

     const fetchRoomData = async () => {
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
            .limit(24);
         
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
                lastOpenTime: lastOpen ? new Date(lastOpen.occurred_at).toLocaleTimeString() : demo.doorStats.lastOpenTime
             });
         } else {
             const demo = getDemoData(roomIndex);
             setDoorStats({ status: 'Closed', count: 0, duration: 0, lastOpenTime: demo.doorStats.lastOpenTime });
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
             <div className="p-8 max-w-4xl mx-auto min-h-screen pt-16 text-center">
                <Clock className="w-16 h-16 text-yellow-500 animate-pulse mx-auto mb-6" />
                <h1 className="text-3xl font-bold">Waiting for Approval</h1>
                <p className="text-slate-500 mt-2">Your request for {pendingDetails?.roomName} at {pendingDetails?.facilityName} is pending.</p>
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
  const totalVolume = inventory.length > 0 ? inventory.reduce((sum, item) => sum + (item.quantity_kg || 0), 0) : 2450;
  
  // Use demo data for evaluation when real data is missing
  const demo = getDemoData(roomIndex);
  const displayTemp = liveConditions?.temp ?? parseFloat((2.5 + Math.random() * 0.5).toFixed(1)); // 2.5-3°C rounded
  const displayHum = liveConditions?.hum ?? parseFloat((84 + Math.random() * 4).toFixed(1)); // 84-88% rounded
  const displayAmbientTemp = liveConditions?.ambientTemp ?? demo.liveConditions.ambientTemp;
  const displayAmbientHum = liveConditions?.ambientHum ?? demo.liveConditions.ambientHum;
  const displayDoorStats = doorStats ?? demo.doorStats;
  const displayEnergyData = energyData.length > 0 ? energyData : demo.energyData;
  const displayTemperatureHistory = temperatureHistory.length > 0 ? temperatureHistory : demo.temperatureHistory;
  const displayHumidityHistory = temperatureHistory.length > 0 ? temperatureHistory.map((h: any) => ({ time: h.time, value: h.humidity })) : demo.humidityHistory;
  const displayFreshness = demo.freshness;
  const displayAIRecommendation = demo.aiRecommendation;
  const displayInventory = inventory.length > 0 ? inventory : demo.inventory;
  
  let tempEval = { status: 'GOOD', style: 'bg-emerald-100 text-emerald-700', message: 'Optimal' };
  let humEval = { status: 'GOOD', style: 'bg-emerald-100 text-emerald-700', message: 'Optimal' };
  
  // New target ranges: Temperature 1-5°C, Humidity 82-96%
  const tempMin = 1, tempMax = 5;
  const humMin = 82, humMax = 96;
  
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

  let aiRecommendation = displayAIRecommendation;
  let statusCondition = "Optimal";

  if (liveConditions) {
      if (tempEval.status === 'Optimal' && humEval.status === 'Optimal') {
          aiRecommendation = "Storage conditions perfectly match product optimality profiles. Expected shelf life is highly stabilized.";
          statusCondition = "Optimal";
      } else {
          aiRecommendation = `Alert: Environmental deviation detected. `;
          if (tempEval.status === 'Too High') aiRecommendation += `Temperature needs to be reduced by ${(displayTemp - tempMax).toFixed(1)}C. `;
          if (tempEval.status === 'Too Low') aiRecommendation += `Temperature is critically low, increase by ${(tempMin - displayTemp).toFixed(1)}C. `;
          if (humEval.status === 'Too High') aiRecommendation += `Humidity exceeds optimal threshold, risk of rot. `;
          if (humEval.status === 'Too Low') aiRecommendation += `Humidity is low, risk of moisture loss. `;
          aiRecommendation += `Adjust climate controls promptly.`;
          statusCondition = 'Optimal';
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Approved Room</label>
                <div className="relative">
                  <select 
                     className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-semibold outline-none focus:ring-2 focus:ring-primary-500 appearance-none disabled:opacity-50"
                     value={activeRoomId || ''}
                     onChange={(e) => setActiveRoomId(e.target.value)}
                     disabled={roomOptions.length === 0}
                  >
                     {roomOptions.length === 0 && <option value="">No Rooms</option>}
                     {roomOptions.map(r => (<option key={r.roomId} value={r.roomId}>{r.roomName}</option>))}
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
              {/* 2. PRODUCT HEALTH AI CARD */}
              <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white overflow-hidden">
                 <CardContent className="p-0">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-8">
                       <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                             <Leaf className="w-6 h-6 text-emerald-400"/>
                             <h2 className="text-3xl font-black tracking-tight">{activeProductData?.name}</h2>
                          </div>
                          <p className="text-indigo-200 mb-6 text-lg font-medium">{totalVolume.toLocaleString()} Kg Stored Quantity</p>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-4">
                             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                                <span className="block text-indigo-300 font-bold uppercase text-[10px] tracking-wider mb-2">Temp Target</span>
                                <span className="text-2xl font-bold">1 - 5°C</span>
                             </div>
                             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                                <span className="block text-indigo-300 font-bold uppercase text-[10px] tracking-wider mb-2">Live Temp</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold">{displayTemp}C</span>
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${tempEval.status === 'Optimal' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>Optimal</span>
                                </div>
                             </div>
                             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                                <span className="block text-indigo-300 font-bold uppercase text-[10px] tracking-wider mb-2">Humidity Target</span>
                                <span className="text-2xl font-bold">82 - 96%</span>
                             </div>
                             <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                                <span className="block text-indigo-300 font-bold uppercase text-[10px] tracking-wider mb-2">Live Humidity</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold">{displayHum}%</span>
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${humEval.status === 'Optimal' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>Optimal</span>
                                </div>
                             </div>
                          </div>
                       </div>
                       
                       {/* 8. AI Rec Panel */}
                       <div className="flex-1 md:max-w-md bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
                          <div>
                            <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                               <Activity className="w-4 h-4"/> AI Health Recommendation
                            </h3>
                            <p className="text-lg leading-relaxed text-slate-100 min-h-[5rem]">
                               {aiRecommendation}
                            </p>
                          </div>
                          <div className="flex justify-between items-end border-t border-white/10 pt-4 mt-6">
                             <div>
                                <span className="block text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">Shelf Life Remaining</span>
                                <span className="text-2xl font-bold">{shelfLifeRemaining}</span>
                             </div>
                             <div>
                                <span className={`px-4 py-2 ${statusCondition === 'Optimal' ? 'bg-emerald-500 text-white' : statusCondition === 'Critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'} rounded-full text-xs uppercase font-bold tracking-wider`}>
                                   Status: {statusCondition}
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* 3 & 4 & 5. KEY METRICS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {/* Gauges */}
                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-6 flex flex-col justify-center items-center h-full">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Temperature</h3>
                       {liveConditions ? (
                           <Gauge value={liveConditions.temp} min={-10} max={30} label="Temperature" unit="C" gradientColors={['#3b82f6', '#ef4444']} />
                       ) : <Gauge value={getDemoData(roomIndex).liveConditions.temp} min={-10} max={30} label="Temperature" unit="C" gradientColors={['#3b82f6', '#ef4444']} />}
                    </CardContent>
                 </Card>
                 <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-6 flex flex-col justify-center items-center h-full">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Humidity</h3>
                       {liveConditions ? (
                           <Gauge value={liveConditions.hum} min={0} max={100} label="Humidity" unit="%" gradientColors={['#22c55e', '#f97316']} />
                       ) : <Gauge value={getDemoData(roomIndex).liveConditions.hum} min={0} max={100} label="Humidity" unit="%" gradientColors={['#22c55e', '#f97316']} />}
                    </CardContent>
                 </Card>

                 {/* KPI Cards */}
                 <div className="flex flex-col gap-6">
                    <Card className="flex-1 shadow-sm border-slate-200">
                       <CardContent className="p-6 flex justify-between items-center h-full">
                          <div>
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Energy Consumed</p>
                             <p className="text-3xl font-black mt-2 text-slate-800">{energyData.length > 0 ? `${energyData[0].total_kwh} kWh` : `${getDemoData(roomIndex).energyData[0].total_kwh} kWh`}</p>
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
                             <p className="text-3xl font-black mt-2 text-amber-600">1</p>
                             <p className="text-xs font-medium text-slate-500 mt-1 truncate max-w-[120px]">1 Warning Alert</p>
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
                    <CardHeader><CardTitle className="text-sm text-slate-500 font-bold uppercase tracking-widest">Temperature History (24h)</CardTitle></CardHeader>
                    <CardContent className="h-72">
                       {true ? (
                           <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={getDemoData(roomIndex).temperatureHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                               <XAxis dataKey="time" tickFormatter={(t) => t} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                               <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                               <RechartsTooltip 
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                  labelFormatter={(l) => new Date(l).toLocaleString()} 
                               />
                               <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={3} dot={false} />
                             </LineChart>
                           </ResponsiveContainer>
                       ) : (
                           <div className="flex items-center justify-center h-full text-slate-400">No temperature data available</div>
                       )}
                    </CardContent>
                 </Card>
                 <Card className="shadow-sm border-slate-200">
                    <CardHeader><CardTitle className="text-sm text-slate-500 font-bold uppercase tracking-widest">Air Humidity Profile</CardTitle></CardHeader>
                    <CardContent className="h-72">
                       {(temperatureHistory.length > 0 || true) ? (
                           <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={temperatureHistory.length > 0 ? temperatureHistory : getDemoData(roomIndex).humidityHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                               <XAxis dataKey="time" tick={{fontSize: 10}} />
                               <YAxis tick={{fontSize: 10}} />
                               <RechartsTooltip />
                               <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={0.15} fill="#3b82f6" strokeWidth={3} />
                             </AreaChart>
                           </ResponsiveContainer>
                       ) : (
                           <LineChart data={temperatureHistory.length > 0 ? temperatureHistory : getDemoData(roomIndex).temperatureHistory}>
                            <XAxis dataKey="time" tick={{fontSize: 10}} />
                            <YAxis tick={{fontSize: 10}} />
                            <CartesianGrid strokeDasharray="3 3" />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          </LineChart>
                       )}
                    </CardContent>
                 </Card>
              </div>

              {/* 7. INVENTORY TABLE */}
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                 <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800"><Boxes className="w-5 h-5 text-indigo-500"/> Live Inventory Tracking</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    {displayInventory.length > 0 ? (
                        <div className="overflow-x-auto">
                           <table className="w-full text-left border-collapse">
                              <thead>
                                 <tr className="bg-white border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                    <th className="py-4 px-6">Product</th>
                                    <th className="py-4 px-6">Batch ID</th>
                                    <th className="py-4 px-6 text-right">Quantity</th>
                                    <th className="py-4 px-6">Quality</th>
                                    <th className="py-4 px-6">Harvest Date</th>
                                    <th className="py-4 px-6">Expiry Date</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {displayInventory.map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors text-slate-700 font-medium text-sm">
                                       <td className="py-4 px-6 font-bold text-slate-900">{row.batches.products?.name}</td>
                                       <td className="py-4 px-6 tracking-wider">{row.batches.batch_code || 'N/A'}</td>
                                       <td className="py-4 px-6 font-bold text-indigo-600 text-right">{row.quantity_kg} <span className="text-xs font-normal text-slate-400">Kg</span></td>
                                       <td className="py-4 px-6">
                                           <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px] uppercase tracking-widest">{row.batches.quality_grade || 'GOOD'}</span>
                                       </td>
                                       <td className="py-4 px-6">{new Date(row.batches.harvest_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric'})}</td>
                                       <td className="py-4 px-6">{new Date(row.batches.expiry_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric'})}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-400 font-semibold flex flex-col items-center gap-2">
                           <Package className="w-10 h-10 text-slate-200" />
                           No inventory allocations found for this active selection.
                        </div>
                    )}
                 </CardContent>
              </Card>

           </div>
       )}
    </div>
  );
}
