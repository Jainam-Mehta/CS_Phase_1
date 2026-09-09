import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTheme } from '../hooks/useTheme';
import { Search, Bell, Moon, Sun, User, Menu, ChevronDown, MapPin } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  location: string;
  category: string;
  is_primary: boolean;
}

interface TopbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ sidebarCollapsed, onToggleSidebar }) => {
  const navigate = useNavigate();
  const { logout, user, selectedSite, setSelectedSite } = useAuthStore();
  const { appearance, setAppearance } = useSettingsStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSiteSelector, setShowSiteSelector] = useState(false);

  // Initialize theme
  useTheme();

  const toggleTheme = () => {
    const newAppearance = appearance === 'dark' ? 'light' : 'dark';
    setAppearance(newAppearance);
  };

  const isDarkMode = appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleSignOut = () => {
    logout();
    navigate('/login');
    setShowProfileMenu(false);
  };

  const handleSiteChange = (site: Site) => {
    setSelectedSite(site);
    setShowSiteSelector(false);
    // No full-page reload — Zustand state updates reactively
  };

  // Farmer 1 has only 1 site (Hamirpur) - no selector needed
  // Farmer 2 has 2 sites (Hamirpur, Bajaura) - show selector
  const showSiteSelectorButton = user?.role === 'farmer' && user?.sites && user.sites.length > 1;

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-all duration-300 z-40',
        sidebarCollapsed ? 'left-20' : 'left-72'
      )}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Mobile menu toggle, Site display/selector, and Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* Site Display / Selector */}
          {user?.role === 'farmer' && selectedSite && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              {showSiteSelectorButton ? (
                <div className="relative">
                  <button
                    onClick={() => setShowSiteSelector(!showSiteSelector)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                      {selectedSite.name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  </button>

                  {/* Site Selector Dropdown */}
                  {showSiteSelector && (
                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 py-2 z-50">
                      {user?.sites?.map((site) => (
                        <button
                          key={site.id}
                          onClick={() => handleSiteChange(site)}
                          className={cn(
                            'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors',
                            selectedSite?.id === site.id
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                              : 'text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {site.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {selectedSite.name}
                </span>
              )}
            </div>
          )}

          <nav className="hidden md:flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Dashboard</span>
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Overview</span>
          </nav>
        </div>

        {/* Right side - Search, Notifications, Theme, Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative"
            >
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-error-500 rounded-full" />
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 py-2">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-800">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Temperature alert in {selectedSite?.name || 'Cold Storage'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 minutes ago</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      New order received
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">15 minutes ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-800">
                  <button 
                    onClick={() => navigate('/notifications')}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 py-2">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'Admin'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate(`/${user?.role}/profile`); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate(`/${user?.role}/settings`); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate(`/${user?.role}/preferences`); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Preferences
                  </button>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-800 py-1">
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export { Topbar };
