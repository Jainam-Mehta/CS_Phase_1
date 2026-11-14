import { SystmIcon } from '../components/common/SystmLogo';
import { AppFooter } from '../components/common/AppFooter';
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import { useSidebarStore } from '../stores/useSidebarStore';
import {
  LayoutDashboard,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Map as MapIcon,
  LogOut,
  Menu,
} from 'lucide-react';

const stakeholderNavigation = [
  { name: 'India Map', href: '/stakeholder/map', icon: MapIcon },
];

const settingsNavigation = [
  { name: 'Settings', href: '/stakeholder/settings', icon: Settings },
  { name: 'Profile', href: '/stakeholder/profile', icon: User },
];

const StakeholderLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname]);
  const { collapsed, toggleSidebar, isMobileOpen, toggleMobileSidebar, closeMobileSidebar } = useSidebarStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [...stakeholderNavigation, ...settingsNavigation];

  const filteredNavigation = navigation.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchResultClick = (href: string) => {
    navigate(href);
    setSearchQuery('');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}
      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 z-50',
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          'w-72 md:translate-x-0',
          collapsed ? 'md:w-20' : 'md:w-72'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-800">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <SystmIcon size={36} />
              <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white leading-tight">
                Systm<span className="text-sky-500 dark:text-sky-400">II</span>
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto">
              <SystmIcon size={36} />
            </div>
          )}
          <button
            onClick={closeMobileSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-auto text-gray-600 dark:text-gray-400"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={toggleSidebar}
            className="hidden md:block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ml-auto">
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
                  {user?.email?.[0].toUpperCase() || 'S'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.email || 'Stakeholder'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stakeholder</p>
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
      <div className={cn('flex flex-col flex-1 h-screen overflow-y-auto transition-all duration-300 ml-0', collapsed ? 'md:ml-20' : 'md:ml-72')}>
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMobileSidebar}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-300"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <SystmIcon size={28} />
              <span className="font-extrabold text-lg tracking-tight text-gray-900 dark:text-white leading-tight">
                Systm<span className="text-sky-500 dark:text-sky-400">II</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center text-xs font-semibold text-primary-600 dark:text-primary-400">
              {user?.email?.[0].toUpperCase() || 'S'}
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <Outlet />
          </div>
          <AppFooter />
        </div>
      </div>
    </div>
  );
};

export default StakeholderLayout;
