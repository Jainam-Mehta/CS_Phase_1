import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/useAuthStore';
import {
  LayoutDashboard,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Map as MapIcon,
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
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();

  const navigation = [...stakeholderNavigation, ...settingsNavigation];

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
                  {user?.email?.[0].toUpperCase() || 'S'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.email || 'Stakeholder'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stakeholder</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={cn('flex-1 transition-all duration-300', collapsed ? 'ml-20' : 'ml-72')}>
        <Outlet />
      </div>
    </div>
  );
};

export default StakeholderLayout;
