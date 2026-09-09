import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  Zap,
  Leaf,
  AlertTriangle,
  GitBranch,
  Wrench,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Download,
  Building2,
  Moon,
  Sun,
  Bell,
  LogOut,
  Plus,
  CheckSquare,
  IndianRupee,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { resolveProfile } from '../lib/profileUtils';
import { useSiteStore } from '../stores/useSiteStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import SearchableSelect from '../components/ui/SearchableSelect';

const ownerNavigation = [
  { name: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
  { name: 'Monitoring', href: '/owner/monitoring', icon: Activity },
  { name: 'Inventory', href: '/owner/inventory', icon: TrendingUp },
  { name: 'Energy', href: '/owner/energy', icon: Zap },
  { name: 'Profits', href: '/owner/finance', icon: IndianRupee },
  // Hidden for future use - Carbon Credits feature
  // { name: 'Carbon Credits', href: '/owner/carbon-credits', icon: Leaf },
  { name: 'Alerts & Insights', href: '/owner/alerts', icon: AlertTriangle },
  { name: 'Batch Traceability', href: '/owner/batch-traceability', icon: GitBranch },
  { name: 'Maintenance', href: '/owner/maintenance', icon: Wrench },
  { name: 'Approvals', href: '/owner/approvals', icon: CheckSquare },
];

const settingsNavigation = [
  { name: 'Settings', href: '/owner/settings', icon: Settings },
  { name: 'Profile', href: '/owner/profile', icon: User },
];

const OwnerLayout: React.FC = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuthStore();
  const { selectedFacilityId, setSelectedFacilityId } = useSiteStore();
  const { appearance, setAppearance } = useSettingsStore();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [fetchingSites, setFetchingSites] = useState(true);

  // Header Dropdown States
  // Derive isDark from the persisted settings store — stays correct after refresh
  const isDark = appearance === 'dark' || (appearance === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleTheme = () => {
    // Write through the store so ThemeProvider and localStorage stay in sync
    setAppearance(isDark ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  React.useEffect(() => {
    async function loadFacilities() {
      if (!user?.id) return;
      try {
        setFetchingSites(true);
        
        const profile = await resolveProfile(user.id);
        if (!profile) {
          console.error('Profile not found for user');
          return;
        }
        
        // Query facilities by owner_profile_id (primary method)
        const { data, error } = await supabase
          .from('facilities')
          .select('*')
          .eq('owner_profile_id', profile.id);
          
        if (error) {
          console.error('Error loading facilities:', error);
          return;
        }
          
        if (data && data.length > 0) {
          setFacilities(data);
          // Auto-select first facility if none selected or if current selection is invalid
          if (!selectedFacilityId || !data.find(f => f.id === selectedFacilityId)) {
            setSelectedFacilityId(data[0].id);
          }
        } else {
          // No facilities found, clear selection
          setFacilities([]);
          setSelectedFacilityId(null);
        }
      } catch (err) {
        console.error('Error loading facilities in layout', err);
      } finally {
        setFetchingSites(false);
      }
    }
    loadFacilities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-run when the logged-in user changes

  const navigation = [...ownerNavigation, ...settingsNavigation];

  const filteredNavigation = navigation.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchResultClick = (href: string) => {
    navigate(href);
    setSearchQuery('');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 z-50',
          collapsed ? 'w-20' : 'w-72'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-800">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-gray-100">
                ColdSense
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-lg">C</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => handleSearchResultClick(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800',
                    collapsed && 'justify-center'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                <span className="text-primary-600 dark:text-primary-400 font-semibold">
                  {user?.email?.[0].toUpperCase() || 'O'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.email || 'Owner'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={cn('flex flex-col flex-1 transition-all duration-300 h-screen', collapsed ? 'ml-20' : 'ml-72')}>
        {/* Unified Top Header */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-40">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-gray-400" />
            <div className="w-64 flex items-center gap-2">
              <SearchableSelect
                value={facilities.find(f => f.id === selectedFacilityId)?.facility_name || ''}
                onChange={(facilityName) => {
                  const facility = facilities.find(f => f.facility_name === facilityName);
                  if (facility) setSelectedFacilityId(facility.id);
                }}
                options={facilities.map(f => f.facility_name)}
                placeholder={fetchingSites ? 'Loading sites...' : facilities.length === 0 ? 'No Facilities Available' : 'Select facility...'}
                disabled={fetchingSites || facilities.length === 0}
              />
              {facilities.length === 0 && !fetchingSites && (
                <button
                  onClick={() => navigate('/owner-setup')}
                  title="Add Facility"
                  className="flex items-center justify-center p-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm font-medium">
            <Download className="w-4 h-4" />
            Download Report
          </button>

          <div className="flex items-center gap-4 border-l border-gray-200 dark:border-slate-800 pl-4 ml-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-slate-900" />
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  </div>
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No new notifications</p>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center border border-primary-200 dark:border-primary-800">
                  <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                    {user?.email?.[0].toUpperCase() || 'O'}
                  </span>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/owner/profile');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/owner/settings');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-slate-700 my-1 sticky top-0" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;
