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
  const { activeRoomId, setActiveRoomId } = useFarmerStore();
  // Note: Products no longer used - removed product selector from UI
  
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

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
  const [lastSensorReadingTime, setLastSensorReadingTime] = useState<Date | null>(null);
  
  const [hasAnyApproved, setHasAnyApproved] = useState(false);
  const [hasAnyPending, setHasAnyPending] = useState(false);
  const [pendingDetails, setPendingDetails] = useState<any>(null);
  
  const [liveTimestamp, setLiveTimestamp] = useState(new Date().toLocaleString());

  // Update timestamp every second (real-time)
  useEffect(() => {
    // Set initial timestamp
    setLiveTimestamp(new Date().toLocaleString());
    
    // Update every 1 second
    const interval = setInterval(() => {
      setLiveTimestamp(new Date().toLocaleString());
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);

  // When facility changes, update room 
  const handleFacilityChange = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
    const newRoom = rooms.find(r => r.facilityId === facilityId);
    if (newRoom) {
      setActiveRoomId(newRoom.roomId);
    }
  };

  // When room changes
  const handleRoomChange = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  useEffect(() => {
    if (!user?.id) return;

    const initializeDashboard = async () => {
      try {
        setLoading(true);
        
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (!profile) throw new Error("Profile missing");
        setProfileId(profile.id);

        const { data: accessLogs } = await supabase
          .from('farmer_room_access')
          .select('*')
          .eq('farmer_id', profile.id)
          .order('requested_at', { ascending: false });

        const approvedRooms: any[] = [];
        let pFound = false;
        let pDetails: any = null;

        if (accessLogs && accessLogs.length > 0) {
          for (const log of accessLogs) {
            const { data: roomData } = await supabase
              .from('cold_storage_rooms')
              .select('id, room_name, room_code, site_id, sites(id, facility_name)')
              .eq('id', log.room_id)
              .maybeSingle();

            if (roomData) {
              const r = roomData;
              const fac = Array.isArray(r.sites) ? r.sites[0] : r.sites;
              if (log.status === 'Approved' && fac) {
                approvedRooms.push({
                  roomId: r.id,
                  roomName: r.room_name || r.room_code || 'Kullu Storage A',
                  facilityId: fac.id,
                  facilityName: fac.facility_name || 'Kullu Storage A'
                });
              } else if (log.status === 'Pending' && fac) {
                pFound = true;
                if (!pDetails) {
                  pDetails = { roomName: r.room_name || r.room_code, facilityName: fac.facility_name };
                }
              }
            }
          }
        }

        // No fallback - if farmer has no approved rooms, they see nothing
        // They can request access to rooms through the app settings/interface

        setHasAnyApproved(approvedRooms.length > 0);
        setHasAnyPending(pFound);
        setPendingDetails(pDetails);

        if (approvedRooms.length > 0) {
            const facMap = new Map();
            approvedRooms.forEach(r => facMap.set(r.facilityId, { id: r.facilityId, name: r.facilityName }));
            const facs = Array.from(facMap.values());
            setFacilities(facs);
            setRooms(approvedRooms);

            // Fetch farmer's products from localStorage (ProductSelection stores them there)
            const storageRequest = localStorage.getItem('storageAccessRequest');
            const selectedProducts = storageRequest ? JSON.parse(storageRequest).products : [];
            
            const prodList = selectedProducts || [];
            setProducts(prodList.length > 0 ? prodList : []);

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

  // Initialize with empty data
  useEffect(() => {
    if (!loading) {
      if (!liveConditions) {
        setLiveConditions({ temp: 0, hum: 0, ambientTemp: 0, ambientHum: 0, date: new Date().toISOString() });
      }
      if (!doorStats) {
        setDoorStats({ status: 'Unknown', count: 0, duration: 0, lastOpenTime: 'N/A' });
      }
      if (alerts.length === 0) {
        setAlerts([]);
      }
      if (energyData.length === 0) {
        setEnergyData([]);
      }
      if (temperatureHistory.length === 0) {
        setTemperatureHistory([]);
      }
    }
  }, [loading]);

  // Load live conditions and subscribe to real-time updates when active room changes
  useEffect(() => {
    if (!activeRoomId) return;

    console.log('[FarmerDashboard] Loading live conditions for room:', activeRoomId);
    
    // Clear old data immediately when room changes
    setLiveConditions({ temp: 0, hum: 0, ambientTemp: 0, ambientHum: 0, date: new Date().toISOString() });
    setTemperatureHistory([]);
    setLastSensorReadingTime(null);

    const loadLiveConditions = async () => {
      try {
        // Fetch last sensor reading timestamp from dedicated endpoint
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(`${apiUrl}/api/sensors/last-reading-time/${activeRoomId}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const timestampData = await response.json();
            if (timestampData.last_reading_time) {
              setLastSensorReadingTime(new Date(timestampData.last_reading_time));
              console.log('[FarmerDashboard] Last reading time:', timestampData.last_reading_time);
            }
          }
        } catch (error) {
          console.debug('[FarmerDashboard] Last reading endpoint unavailable');
        }

        // Fetch averaged sensor data from backend (like owner dashboard does)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(`${apiUrl}/api/storage/averages/room/${activeRoomId}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const averagesData = await response.json();
            console.log('[FarmerDashboard] Averaged sensor data:', averagesData);
            
            // Values from backend are already formatted (divided by 100)
            const avgTemp = averagesData.avg_temperature !== null ? parseFloat(averagesData.avg_temperature) : 0;
            const avgHum = averagesData.avg_humidity !== null ? parseFloat(averagesData.avg_humidity) : 0;
            
            setLiveConditions({
              temp: avgTemp,
              hum: avgHum,
              ambientTemp: 0,
              ambientHum: 0,
              date: new Date().toISOString()
            });
          }
        } catch (error) {
          console.debug('[FarmerDashboard] Averaging endpoint unavailable, falling back to raw data');
          
          // Fallback: Fetch latest conditions with ALL temperature and humidity sensors + door status
          const { data: condData, error: condError } = await supabase
            .from('cold_storage_conditions')
            .select('temperature_1, temperature_2, temperature_3, temperature_4, humidity_1, humidity_2, humidity_3, humidity_4, door_status_1, door_status_2, door_status_3, door_status_4, recorded_at')
            .eq('room_id', activeRoomId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (condData) {
            // Calculate average temperature from all available sensors
            const temps = [condData.temperature_1, condData.temperature_2, condData.temperature_3, condData.temperature_4]
              .filter(t => t != null)
              .map(t => parseFloat((t).toFixed(2)));
            const temp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length) : 0;

            // Calculate average humidity from all available sensors
            const hums = [condData.humidity_1, condData.humidity_2, condData.humidity_3, condData.humidity_4]
              .filter(h => h != null)
              .map(h => parseFloat((h).toFixed(2)));
            const hum = hums.length > 0 ? (hums.reduce((a, b) => a + b, 0) / hums.length) : 0;
            
            // Get door status - if ANY door shows "closed", display "Closed"
            const doorValues = [condData.door_status_1, condData.door_status_2, condData.door_status_3, condData.door_status_4];
            const anyClosed = doorValues.some(v => v === 'closed' || v === 'Closed');
            const doorStatus = anyClosed ? 'Closed' : (doorValues.some(v => v != null) ? 'Open' : 'Unknown');
            
            // Set last reading time from the condition data
            if (condData.recorded_at) {
              setLastSensorReadingTime(new Date(condData.recorded_at));
            }
            
            setLiveConditions({
              temp,
              hum,
              ambientTemp: 0,
              ambientHum: 0,
              doorStatus,
              date: condData?.recorded_at
            });
          }
        }

        // Fetch temperature history for chart - get ALL temperature sensors
        const { data: tempHistory, error: tempHistError } = await supabase
          .from('cold_storage_conditions')
          .select('temperature_1, temperature_2, temperature_3, temperature_4, recorded_at')
          .eq('room_id', activeRoomId)
          .order('recorded_at', { ascending: true })
          .limit(100);

        console.log('[FarmerDashboard] Temp history query:', { tempHistError, count: tempHistory?.length });

        // Fetch energy data from energy_consumption table for THIS ROOM ONLY (cumulative)
        const { data: energyRecords } = await supabase
          .from('energy_consumption')
          .select('kwh_total, kwh_solar, kwh_grid, recorded_at')
          .eq('room_id', activeRoomId)
          .order('recorded_at', { ascending: true });

        if (energyRecords && energyRecords.length > 0) {
          // Calculate cumulative total across all records for this room
          let cumulativeTotal = 0;
          let cumulativeSolar = 0;
          let cumulativeGrid = 0;
          
          const energyChartData = energyRecords.map((record: any) => {
            cumulativeTotal += Number(record.kwh_total) || 0;
            cumulativeSolar += Number(record.kwh_solar) || 0;
            cumulativeGrid += Number(record.kwh_grid) || 0;

            const date = new Date(record.recorded_at);
            const dateStr = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            
            return {
              date: dateStr,
              total_kwh: cumulativeTotal,
              solar_kwh: cumulativeSolar,
              grid_kwh: cumulativeGrid,
              recorded_at: record.recorded_at
            };
          });

          setEnergyData(energyChartData);
          console.log('[FarmerDashboard] Energy data loaded for room:', activeRoomId, 'records:', energyChartData.length, 'cumulative total:', cumulativeTotal, 'kWh');
        }

        // Fetch energy data from the site level (cumulative total consumed by the facility)
        // Get the site_id from the room first
        const { data: roomData } = await supabase
          .from('cold_storage_rooms')
          .select('site_id')
          .eq('id', activeRoomId)
          .single();

        if (roomData?.site_id) {
          const { data: energyRecords } = await supabase
            .from('energy_consumption')
            .select('kwh_total, kwh_solar, kwh_grid, recorded_at')
            .eq('site_id', roomData.site_id)
            .order('recorded_at', { ascending: true });

          if (energyRecords && energyRecords.length > 0) {
            // Calculate cumulative total across all records
            let cumulativeTotal = 0;
            let cumulativeSolar = 0;
            let cumulativeGrid = 0;
            
            const energyChartData = energyRecords.map((record: any) => {
              cumulativeTotal += Number(record.kwh_total) || 0;
              cumulativeSolar += Number(record.kwh_solar) || 0;
              cumulativeGrid += Number(record.kwh_grid) || 0;

              const date = new Date(record.recorded_at);
              const dateStr = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
              
              return {
                date: dateStr,
                total_kwh: cumulativeTotal,
                solar_kwh: cumulativeSolar,
                grid_kwh: cumulativeGrid,
                recorded_at: record.recorded_at
              };
            });

            setEnergyData(energyChartData);
            console.log('[FarmerDashboard] Energy data loaded:', energyChartData.length, 'records, total:', cumulativeTotal, 'kWh');
          }
        }

        // Fetch humidity history for chart - get ALL humidity sensors
        const { data: humHistory, error: humHistError } = await supabase
          .from('cold_storage_conditions')
          .select('humidity_1, humidity_2, humidity_3, humidity_4, recorded_at')
          .eq('room_id', activeRoomId)
          .order('recorded_at', { ascending: true })
          .limit(100);

        console.log('[FarmerDashboard] Humidity history query:', { humHistError, count: humHistory?.length });

        // Merge temperature and humidity data into timeline
        const mergedHistory: any[] = [];
        const timeMap = new Map();

        if (tempHistory) {
          tempHistory.forEach((t: any) => {
            const utcDate = new Date(t.recorded_at);
            // Don't manually add timezone offset - timestamp is already correct
            const time = utcDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            
            // Average all temperature sensors
            const temps = [t.temperature_1, t.temperature_2, t.temperature_3, t.temperature_4]
              .filter((v: any) => v != null)
              .map((v: any) => parseFloat((v).toFixed(2)));
            const formattedTemp = temps.length > 0 ? (temps.reduce((a: number, b: number) => a + b, 0) / temps.length) : 0;
            
            const timestamp = utcDate.getTime(); // Use milliseconds for proper sorting
            timeMap.set(time, { 
              time, 
              value: formattedTemp, 
              humidity: 0,
              timestamp
            });
          });
        }

        if (humHistory) {
          humHistory.forEach((h: any) => {
            const utcDate = new Date(h.recorded_at);
            // Don't manually add timezone offset - timestamp is already correct
            const time = utcDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            
            // Average all humidity sensors
            const hums = [h.humidity_1, h.humidity_2, h.humidity_3, h.humidity_4]
              .filter((v: any) => v != null)
              .map((v: any) => parseFloat((v).toFixed(2)));
            const formattedHum = hums.length > 0 ? (hums.reduce((a: number, b: number) => a + b, 0) / hums.length) : 0;
            
            const timestamp = utcDate.getTime();
            if (timeMap.has(time)) {
              timeMap.get(time).humidity = formattedHum;
              // Update timestamp if this humidity reading is newer
              if (timestamp > timeMap.get(time).timestamp) {
                timeMap.get(time).timestamp = timestamp;
              }
            } else {
              timeMap.set(time, { 
                time, 
                value: 0, 
                humidity: formattedHum,
                timestamp
              });
            }
          });
        }

        // Convert to array and sort by timestamp (not by formatted time string)
        const finalHistory = Array.from(timeMap.values());
        finalHistory.sort((a, b) => a.timestamp - b.timestamp);

        console.log('[FarmerDashboard] Merged history:', { count: finalHistory.length, sample: finalHistory.slice(0, 3) });

        if (finalHistory.length > 0) {
          setTemperatureHistory(finalHistory);
        }
      } catch (err) {
        console.error('Error loading conditions:', err);
      }
    };

    loadLiveConditions();
    
    // Poll for updates every 10 seconds to keep graphs fresh
    const pollInterval = setInterval(() => {
      loadLiveConditions();
    }, 10000);

    // Subscribe to real-time updates for conditions
    const channel = supabase
      .channel(`room_conditions_${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cold_storage_conditions',
          filter: `room_id=eq.${activeRoomId}`
        },
        (payload: any) => {
          const newCondition = payload.new;
          console.log('[FarmerDashboard] Real-time update:', newCondition);
          
          if (newCondition.temperature !== null && newCondition.temperature !== undefined) {
            console.log('Real-time temperature update:', newCondition.temperature);
            setLiveConditions((prev: any) => ({
              ...prev,
              temp: parseFloat(newCondition.temperature) || 0,
              date: newCondition.recorded_at
            }));
          }
          if (newCondition.temperature !== null && newCondition.temperature !== undefined) {
            console.log('Real-time temperature update:', newCondition.temperature);
            const formattedTemp = parseFloat((newCondition.temperature / 100).toFixed(2));
            setLiveConditions((prev: any) => ({
              ...prev,
              temp: formattedTemp,
              date: newCondition.recorded_at
            }));
          }
          if (newCondition.humidity !== null && newCondition.humidity !== undefined) {
            console.log('Real-time humidity update:', newCondition.humidity);
            const formattedHum = parseFloat((newCondition.humidity / 100).toFixed(2));
            setLiveConditions((prev: any) => ({
              ...prev,
              hum: formattedHum,
              date: newCondition.recorded_at
            }));
          }

          // Update history
          const utcDate = new Date(newCondition.recorded_at);
          // Convert UTC to IST (UTC+5:30) using proper date arithmetic
          const istTime = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
          const time = istTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
          setTemperatureHistory((prev: any[]) => {
            const existing = prev.find(h => h.time === time);
            if (existing) {
              if (newCondition.temperature !== null && newCondition.temperature !== undefined) {
                existing.value = parseFloat((newCondition.temperature / 100).toFixed(2));
              }
              if (newCondition.humidity !== null && newCondition.humidity !== undefined) {
                existing.humidity = parseFloat((newCondition.humidity / 100).toFixed(2));
              }
              return [...prev];
            } else {
              return [
                ...prev,
                {
                  time,
                  value: newCondition.temperature !== null ? parseFloat((newCondition.temperature / 100).toFixed(2)) : 0,
                  humidity: newCondition.humidity !== null ? parseFloat((newCondition.humidity / 100).toFixed(2)) : 0
                }
              ].slice(-100);
            }
          });
        }
      )
      .subscribe();

    // Subscribe to real-time updates for sensor readings to update last reading time
    const sensorReadingChannel = supabase
      .channel(`sensor_readings_${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `room_id=eq.${activeRoomId}`
        },
        (payload: any) => {
          const newReading = payload.new;
          console.log('[FarmerDashboard] New sensor reading:', newReading);
          
          // Update the last reading timestamp
          setLastSensorReadingTime(new Date(newReading.recorded_at));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sensorReadingChannel);
      clearInterval(pollInterval);
    };
  }, [activeRoomId]);

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
  
  // Get door status from liveConditions (from cold_storage_conditions table)
  const getDoorStatusFarmer = () => {
    return (liveConditions as any)?.doorStatus ?? 'Unknown';
  };
  
  // NO DEMO DATA - Use real data or fallback to 0/empty
  const displayTemp = liveConditions?.temp ?? 0;
  const displayHum = liveConditions?.hum ?? 0;
  const displayAmbientTemp = liveConditions?.ambientTemp ?? 0;
  const displayAmbientHum = liveConditions?.ambientHum ?? 0;
  const displayDoorStats = { status: getDoorStatusFarmer(), count: doorStats?.count ?? 0, duration: doorStats?.duration ?? 0, lastOpenTime: doorStats?.lastOpenTime ?? 'N/A' };
  const displayEnergyData = energyData.length > 0 ? energyData : [];
  const displayTemperatureHistory = temperatureHistory.length > 0 ? temperatureHistory : [];
  const displayHumidityHistory = temperatureHistory.length > 0
    ? temperatureHistory.map((h: any) => ({ time: h.time, value: h.humidity }))
    : [];
  
  let tempEval = { status: 'GOOD', style: 'bg-emerald-100 text-emerald-700', message: 'Optimal' };
  let humEval = { status: 'GOOD', style: 'bg-emerald-100 text-emerald-700', message: 'Optimal' };
  
  // Standard cold storage ranges for all products
  const tempMin = 1;
  const tempMax = 5;
  const humMin = 82;
  const humMax = 96;
  
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
                     onChange={(e) => handleFacilityChange(e.target.value)}
                  >
                     {facilities.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
             </div>
             <div className="flex-1 relative">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Storage Room</label>
                <div className="relative">
                  <select 
                     className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 font-semibold outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                     value={activeRoomId || ''}
                     onChange={(e) => handleRoomChange(e.target.value)}
                  >
                     {roomOptions.length === 0 ? (
                       <option value="">No rooms available</option>
                     ) : (
                       roomOptions.map(r => (<option key={r.roomId} value={r.roomId}>{r.roomName}</option>))
                     )}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </CardContent>
       </Card>

       {!selectedFacilityId || !activeRoomId ? (
           <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-xl mt-8">
               <h2 className="text-xl font-bold text-slate-600">Select a Room</h2>
               <p className="text-slate-500">Please select a facility and room above to view storage conditions.</p>
           </div>
       ) : (
           <div className="space-y-6 pt-2">
              {/* 3 & 4 & 5. KEY METRICS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
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
                             <p className="text-3xl font-black mt-2 text-slate-800">{energyData.length > 0 ? `${energyData[energyData.length - 1].total_kwh.toFixed(1)} kWh` : '0 kWh'}</p>
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
                 <div className="flex flex-col gap-6 w-full">
                    {/* 4. Door Monitoring Card */}
                    <Card className="flex-1 shadow-sm border-slate-200 w-full">
                       <CardContent className="p-6 flex justify-between items-center h-full group w-full">
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
                    <Card className="flex-1 shadow-sm border-slate-200 w-full">
                       <CardContent className="p-6 flex flex-col gap-3 w-full">
                          <div className="flex items-center gap-3">
                             <div className="flex flex-col gap-3 flex-1">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last Reading</p>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lastSensorReadingTime ? lastSensorReadingTime.toLocaleDateString() : 'No Date'}</p>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lastSensorReadingTime ? lastSensorReadingTime.toLocaleTimeString() : 'No Time'}</p>
                                <p className="text-xs font-medium text-slate-500">When sensor data</p>
                                <p className="text-xs font-medium text-slate-500">was received</p>
                             </div>
                             <div className={`p-4 rounded-2xl flex-shrink-0 ${lastSensorReadingTime ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                                {lastSensorReadingTime ? <CheckCircle2 className="w-8 h-8"/> : <Clock className="w-8 h-8" />}
                             </div>
                          </div>
                       </CardContent>
                    </Card>
                 </div>
              </div>

              {/* 6. CHARTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                 <Card className="shadow-sm border-slate-200">
                    <CardHeader><CardTitle className="text-sm text-slate-500 font-bold uppercase tracking-widest">Temperature History</CardTitle></CardHeader>
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
