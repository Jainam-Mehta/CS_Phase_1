import React, { useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { DoorOpen, Clock, TrendingUp, AlertTriangle, Brain } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSensorData } from '../../hooks/useSensorData';
import { useDoorData } from '../../hooks/useDoorData';
import { getProductConfig, PRODUCTS } from '../../utils/productConfig';

const AlertsInsights: React.FC = () => {
  const { user, selectedSite } = useAuthStore();
  const { sensorData } = useSensorData();
  const { doorStatus } = useDoorData();
  const isFarmer = user?.role === 'farmer';

  // Get farmer's selected products from storage selection
  const storageRequest = useMemo(() => {
    const request = localStorage.getItem('storageAccessRequest');
    return request ? JSON.parse(request) : null;
  }, []);
  
  // Get farmer's selected products
  const farmerSelectedProducts = useMemo(() => {
    if (storageRequest?.products) {
      return storageRequest.products.map((productName: string) => 
        PRODUCTS.find(p => p.name === productName)
      ).filter(Boolean);
    }
    return [];
  }, [storageRequest]);

  // Card 1: Door Status
  const doorCard = useMemo(() => {
    const isOpen = (doorStatus?.total_duration || 0) > 0;
    const duration = doorStatus?.total_duration || 0;
    
    return {
      title: 'Door',
      icon: DoorOpen,
      status: isOpen ? 'Open' : 'Safe',
      color: isOpen ? 'yellow' : 'blue',
      value: isOpen ? `${duration.toFixed(0)} min` : 'Closed',
      description: isOpen ? 'Door is currently open' : 'Door is securely closed',
    };
  }, [doorStatus]);

  // Card 2: Expiry Status
  const expiryCard = useMemo(() => {
    if (farmerSelectedProducts.length === 0) {
      return {
        title: 'Expiry',
        icon: Clock,
        status: 'Healthy',
        color: 'blue',
        value: 'N/A',
        description: 'No products selected',
      };
    }

    const shortestShelfLife = Math.min(...farmerSelectedProducts.map((p: any) => p.shelfLifeDays));
    
    if (shortestShelfLife <= 2) {
      return {
        title: 'Expiry',
        icon: Clock,
        status: '2 days',
        color: 'red',
        value: `${shortestShelfLife} days`,
        description: 'Critical: Sell immediately',
      };
    } else if (shortestShelfLife <= 6) {
      return {
        title: 'Expiry',
        icon: Clock,
        status: '6 days',
        color: 'yellow',
        value: `${shortestShelfLife} days`,
        description: 'Warning: Plan sales soon',
      };
    } else {
      return {
        title: 'Expiry',
        icon: Clock,
        status: 'Healthy',
        color: 'blue',
        value: `${shortestShelfLife} days`,
        description: 'All products healthy',
      };
    }
  }, [farmerSelectedProducts]);

  // Card 3: Market Status
  const marketCard = useMemo(() => {
    // Market data will be loaded from Supabase
    return {
      title: 'Market',
      icon: TrendingUp,
      status: 'N/A',
      color: 'gray',
      value: 'No data',
      description: 'Market data not available',
    };
  }, []);

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'yellow':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'red':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIconColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600 dark:text-blue-400';
      case 'yellow':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'red':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!isFarmer) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Alerts & Insights
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Alerts and insights features for administrators will be available soon.
          </p>
        </div>

        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-12 w-12 text-primary-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Feature in Development</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Advanced alerts and insights for administrators are currently under development.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cards = [doorCard, expiryCard, marketCard];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Alerts & Insights
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Real-time alerts and insights for your storage operations
        </p>
      </div>

      {/* 3 Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} variant="default">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-12 w-12 rounded-lg ${getStatusColor(card.color).split(' ')[0]} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${getStatusIconColor(card.color)}`} />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(card.color)}`}>
                    {card.status}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {card.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {card.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsInsights;
