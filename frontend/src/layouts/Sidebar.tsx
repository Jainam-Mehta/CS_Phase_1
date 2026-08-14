import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import RupeeIcon from '../components/icons/RupeeIcon';
import {
  LayoutDashboard,
  Activity,
  Package,
  TrendingUp,
  Brain,
  FileText,
  AlertTriangle,
  ShoppingCart,
  Zap,
  Leaf,
  Award,
  GitBranch,
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Calculator,
  Wrench,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const adminNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Monitoring', href: '/monitoring', icon: Activity },
  { name: 'Inventory', href: '/inventory', icon: TrendingUp },
  { name: 'Energy', href: '/energy', icon: Zap },
  { name: 'Carbon Credits', href: '/carbon-credits', icon: Leaf },
  { name: 'Alerts & Insights', href: '/alerts', icon: AlertTriangle },
  { name: 'Batch Traceability', href: '/batch-traceability', icon: GitBranch },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
];

const ownerNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Monitoring', href: '/monitoring', icon: Activity },
  { name: 'Inventory', href: '/inventory', icon: TrendingUp },
  { name: 'Energy', href: '/energy', icon: Zap },
  { name: 'Carbon Credits', href: '/carbon-credits', icon: Leaf },
  { name: 'Alerts & Insights', href: '/alerts', icon: AlertTriangle },
  { name: 'Batch Traceability', href: '/batch-traceability', icon: GitBranch },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
];

const farmerNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Price Calculator', href: '/price-calculator', icon: Calculator },
  { name: 'Market Intelligence', href: '/market-intelligence', icon: TrendingUp },
  { name: 'Alerts & Insights', href: '/alerts', icon: AlertTriangle },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Finance', href: '/finance', icon: RupeeIcon },
];

const settingsNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Profile', href: '/profile', icon: User },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { user } = useAuthStore();

  const navigation = user?.role === 'farmer' 
    ? farmerNavigation 
    : user?.role === 'owner' 
    ? ownerNavigation 
    : adminNavigation;

  const filteredNavigation = navigation.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    
    // Search only navigation items
    const results = navigation
      .filter((item) => item.name.toLowerCase().includes(query))
      .map((item) => ({ type: 'navigation' as const, id: item.name, name: item.name, location: undefined, href: item.href }));

    return results.slice(0, 10);
  }, [searchQuery, navigation]);

  const handleSearchResultClick = (result: { type: string; id: string; name: string; location?: string; href: string }) => {
    navigate(result.href);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
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
          onClick={onToggle}
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
              placeholder="Search storages, sensors, inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
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
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSearchResultClick(result)}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase">
                        {result.type}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {result.name}
                      </span>
                    </div>
                    {result.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{result.location}</p>
                    )}
                  </div>
                ))}
              </div>
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
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800',
                    collapsed && 'justify-center'
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-8 px-3">
          <div className="border-t border-gray-200 dark:border-slate-800 pt-4">
            <nav className="space-y-1">
              {settingsNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800',
                        collapsed && 'justify-center'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">{item.name}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Sidebar };
