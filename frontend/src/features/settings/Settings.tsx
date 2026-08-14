import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Plus, Building, User, Warehouse, Clock, CheckCircle, XCircle, Briefcase } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [stakeholderRequests, setStakeholderRequests] = useState<any[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);

  const {
    doorAlerts,
    marketUpdates,
    weeklyReports,
    aiRecommendations,
    appearance,
    language,
    setDoorAlerts,
    setMarketUpdates,
    setWeeklyReports,
    setAiRecommendations,
    setAppearance,
    setLanguage,
    resetSettings,
  } = useSettingsStore();

  useEffect(() => {
    if (user?.role === 'farmer') {
         loadMyRequests();
    } else if (user?.role === 'stakeholder') {
         loadStakeholderRequests();
    }
  }, [user]);

  const loadMyRequests = async () => {
    if (!user?.id) return;
    try {
        setLoadingReqs(true);
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
        if (!profile) return;
        
        const { data } = await supabase
          .from('farmer_room_access')
          .select(`
            id, status, requested_at, remarks,
            cold_storage_rooms(room_name, facilities(facility_name))
          `)
          .eq('farmer_id', profile.id)
          .order('requested_at', { ascending: false });
          
        if (data) setRequests(data);
    } catch (err) {
        console.error('Request loading failure', err);
    } finally {
        setLoadingReqs(false);
    }
  };

  const loadStakeholderRequests = async () => {
     if (!user?.id) return;
     try {
         setLoadingReqs(true);
         const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
         if (!profile) return;
         
         const { data } = await supabase
            .from('stakeholder_interest')
            .select(`
               id, facility_id, created_at,
               facilities(facility_name)
            `)
            .eq('stakeholder_id', profile.id)
            .order('created_at', { ascending: false });
            
         if (data) setStakeholderRequests(data);
     } catch (err) {
         console.error('Failed loading investments', err);
     } finally {
         setLoadingReqs(false);
     }
  };

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) resetSettings();
  };

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'Approved': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800"><CheckCircle className="w-3 h-3" /> Approved</span>;
          case 'Rejected': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium border border-red-200 dark:border-red-800"><XCircle className="w-3 h-3" /> Rejected</span>;
          default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800"><Clock className="w-3 h-3" /> Pending</span>;
      }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pt-6 px-4 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and application logic
        </p>
      </div>

      {/* Facilities Management (Owner Only) */}
      {user?.role === 'owner' && (
        <Card variant="default" className="border-blue-100 dark:border-blue-900/30">
          <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-50 dark:border-blue-900/20">
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Building className="w-5 h-5" />
              Facilities Management
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Add New Site</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-1">
                  Register a new cold storage facility to your network. This will begin the setup process for new rooms and sensor gateways.
                </p>
              </div>
              <Button variant="primary" onClick={() => navigate('/owner-setup')} className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Facility
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Access Management (Farmer Only) */}
      {user?.role === 'farmer' && (
        <div className="space-y-6">
           <Card variant="default" className="border-t-4 border-t-emerald-500 shadow-md">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-900/10">
               <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                 <Warehouse className="w-5 h-5" /> Request More Storage
               </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                   <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed">
                     Need more capacity or another cold storage? Send a new room access request to another facility in your network area seamlessly securely without duplicating profile requirements.
                   </p>
                 </div>
                 <Button variant="primary" onClick={() => navigate('/storage-selection?mode=extension')} className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 shadow-sm border-transparent flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Request Storage Access
                 </Button>
               </div>
               {location.search.includes('extended') && (
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-3 border border-emerald-100 dark:border-emerald-800/30">
                     <CheckCircle className="w-5 h-5" />
                     <div>
                         <p className="font-semibold text-sm">Request Submitted successfully!</p>
                         <p className="text-xs">Your request has been sent to the Cold Storage Owner. Check requests below for status updates instantly.</p>
                     </div>
                  </div>
               )}
             </CardContent>
           </Card>

           <Card variant="default">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800">
               <CardTitle className="text-lg">My Storage Requests</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-800/50">
                     <tr>
                       <th className="px-6 py-4 font-semibold">Facility</th>
                       <th className="px-6 py-4 font-semibold">Room</th>
                       <th className="px-6 py-4 font-semibold">Requested On</th>
                       <th className="px-6 py-4 font-semibold">Status</th>
                       <th className="px-6 py-4 font-semibold text-right">Remarks</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                     {loadingReqs ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading requests...</td></tr>
                     ) : requests.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No storage requests found natively.</td></tr>
                     ) : (
                       requests.map((req, idx) => {
                          const dt = new Date(req.requested_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                          const rm = Array.isArray(req.cold_storage_rooms) ? req.cold_storage_rooms[0] : req.cold_storage_rooms;
                          const fn = rm?.facilities ? (Array.isArray(rm.facilities) ? rm.facilities[0]?.facility_name : rm.facilities.facility_name) : 'Unknown Facility';
                          const rn = rm?.room_name || 'Unknown Room';

                          return (
                            <tr key={req.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                               <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{fn}</td>
                               <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{rn}</td>
                               <td className="px-6 py-4 text-gray-500">{dt}</td>
                               <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                               <td className="px-6 py-4 text-right text-gray-500 text-xs max-w-[200px] truncate">{req.remarks || '—'}</td>
                            </tr>
                          );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
             </CardContent>
           </Card>
        </div>
      )}

      {/* Investment Management (Stakeholder Only) */}
      {user?.role === 'stakeholder' && (
        <div className="space-y-6">
           <Card variant="default" className="border-t-4 border-t-purple-500 shadow-md">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-purple-50/30 dark:bg-purple-900/10">
               <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-400">
                 <Briefcase className="w-5 h-5" /> Explore More Investments
               </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                   <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed">
                     Browse additional cold storage facilities and submit investment requests to expand your portfolio.
                   </p>
                 </div>
                 <Button variant="primary" onClick={() => navigate('/stakeholder-investment-preferences?mode=extension')} className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 shadow-sm border-transparent flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Find Investment Opportunities
                 </Button>
               </div>
               {location.search.includes('extended') && (
                  <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg flex items-center gap-3 border border-purple-100 dark:border-purple-800/30">
                     <CheckCircle className="w-5 h-5" />
                     <div>
                         <p className="font-semibold text-sm">Investment Request Submitted!</p>
                         <p className="text-xs">Your request has been sent successfully. Current Status: <span className="font-bold">Pending Approval</span></p>
                     </div>
                  </div>
               )}
             </CardContent>
           </Card>

           <Card variant="default">
             <CardHeader className="border-b border-gray-100 dark:border-slate-800">
               <CardTitle className="text-lg">My Investment Requests</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-800/50">
                     <tr>
                       <th className="px-6 py-4 font-semibold">Facility</th>
                       <th className="px-6 py-4 font-semibold">Requested On</th>
                       <th className="px-6 py-4 font-semibold">Investment Amount</th>
                       <th className="px-6 py-4 font-semibold">Status</th>
                       <th className="px-6 py-4 font-semibold text-right">Remarks</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                     {loadingReqs ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading requests...</td></tr>
                     ) : stakeholderRequests.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No investment requests found.</td></tr>
                     ) : (
                       stakeholderRequests.map((req, idx) => {
                          const dt = new Date(req.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                          const fn = req.facilities ? (Array.isArray(req.facilities) ? req.facilities[0]?.facility_name : req.facilities.facility_name) : 'Unknown Facility';

                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                               <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{fn}</td>
                               <td className="px-6 py-4 text-gray-500">{dt}</td>
                               <td className="px-6 py-4 text-gray-900 dark:text-gray-400 font-medium">—</td>
                               <td className="px-6 py-4">{getStatusBadge('Pending')}</td>
                               <td className="px-6 py-4 text-right text-gray-500 text-xs max-w-[200px] truncate">—</td>
                            </tr>
                          );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
             </CardContent>
           </Card>
        </div>
      )}
      
      {/* Profile Management (Generic roles outside Farmer constraint hooks) */}
      {user?.role !== 'farmer' && user?.role !== 'stakeholder' && (
        <Card variant="default">
          <CardHeader>
            <CardTitle>Profile Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">View & Edit Profile</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-1">
                  Manage your personal information, location details, and account settings in the dedicated profile page.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/owner/profile')} className="flex items-center gap-2">
                <User className="w-4 h-4" /> Go to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Section */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Door Alerts</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when storage door is left open</p>
              </div>
              <button
                onClick={() => setDoorAlerts(!doorAlerts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ doorAlerts ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700' }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ doorAlerts ? 'translate-x-6' : 'translate-x-1' }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Market Updates</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive market price changes and trends</p>
              </div>
              <button
                onClick={() => setMarketUpdates(!marketUpdates)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ marketUpdates ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700' }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ marketUpdates ? 'translate-x-6' : 'translate-x-1' }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Weekly Reports</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get weekly summary reports via email</p>
              </div>
              <button
                onClick={() => setWeeklyReports(!weeklyReports)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ weeklyReports ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700' }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ weeklyReports ? 'translate-x-6' : 'translate-x-1' }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">AI Recommendations</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive AI-powered insights and suggestions</p>
              </div>
              <button
                onClick={() => setAiRecommendations(!aiRecommendations)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ aiRecommendations ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700' }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ aiRecommendations ? 'translate-x-6' : 'translate-x-1' }`} />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
              <input type="radio" name="appearance" value="light" checked={appearance === 'light'} onChange={(e) => setAppearance(e.target.value as 'light' | 'dark' | 'system')} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-slate-600" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">Light</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
              <input type="radio" name="appearance" value="dark" checked={appearance === 'dark'} onChange={(e) => setAppearance(e.target.value as 'light' | 'dark' | 'system')} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-slate-600" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">Dark</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
              <input type="radio" name="appearance" value="system" checked={appearance === 'system'} onChange={(e) => setAppearance(e.target.value as 'light' | 'dark' | 'system')} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-slate-600" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">System Auto</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Language Section */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Language</CardTitle>
        </CardHeader>
        <CardContent>
          <select value={language} onChange={(e) => setLanguage(e.target.value as 'english' | 'hindi')} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white font-medium transition-colors">
            <option value="english">🇺🇸 English</option>
            <option value="hindi">🇮🇳 Hindi - हिंदी</option>
          </select>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <Button variant="primary" onClick={handleSave} className="flex-1 sm:flex-none">Save Changes</Button>
        <Button variant="outline" onClick={handleReset} className="flex-1 sm:flex-none">Reset Configuration</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
