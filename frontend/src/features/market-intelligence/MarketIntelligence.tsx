import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TrendingUp, Activity, MapPin, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { getProductConfig, PRODUCTS } from '../../utils/productConfig';
import LineChart from '../../components/ui/LineChart';

const MarketIntelligence: React.FC = () => {
  const { user, selectedSite } = useAuthStore();
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

  // Use farmer's selected products instead of site-specific products
  const siteProducts = farmerSelectedProducts.length > 0 ? farmerSelectedProducts : PRODUCTS;

  // Market data with current prices and changes (from requirements)
  const marketData = useMemo(() => {
    return siteProducts.map((product: any) => {
      const priceChanges: Record<string, number> = {
        'Apple': 4, // +4%
        'Avocado': 6, // +6%
        'Dragon Fruit': -2, // -2%
      };

      const change = priceChanges[product.name] || 0;
      const trend = change >= 0 ? 'up' : 'down';

      return {
        productName: product.name,
        currentPrice: product.sellingPrice,
        change,
        trend,
        category: product.category,
      };
    });
  }, [siteProducts]);

  // Nearby markets per site (from requirements)
  const nearbyMarkets = useMemo(() => {
    if (selectedSite?.name === 'Hamirpur') {
      return [
        { name: 'Hamirpur APMC', distance: '2 km', avgPrice: '₹125/kg', demand: 'high' },
        { name: 'Mandi Market', distance: '15 km', avgPrice: '₹130/kg', demand: 'moderate' },
        { name: 'Kullu Market', distance: '30 km', avgPrice: '₹135/kg', demand: 'high' },
        { name: 'Shimla Mandi', distance: '50 km', avgPrice: '₹140/kg', demand: 'moderate' },
      ];
    } else if (selectedSite?.name === 'Bajaura') {
      return [
        { name: 'Bajaura Market', distance: '3 km', avgPrice: '₹82/kg', demand: 'high' },
        { name: 'Kullu Market', distance: '25 km', avgPrice: '₹85/kg', demand: 'moderate' },
        { name: 'Mandi Market', distance: '20 km', avgPrice: '₹88/kg', demand: 'high' },
        { name: 'Aut Market', distance: '10 km', avgPrice: '₹80/kg', demand: 'moderate' },
      ];
    }
    return [];
  }, [selectedSite]);

  // Generate individual graph data for each product
  const productGraphs = useMemo(() => {
    return marketData.map((market: any) => {
      const timestamps = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const basePrice = market.currentPrice;
      const changePerDay = (market.change / 7); // Distribute change over 7 days
      
      const data = timestamps.map((_, index) => {
        const dayChange = changePerDay * index;
        return basePrice * (1 + dayChange / 100);
      });

      return {
        productName: market.productName,
        data,
        timestamps,
        color: market.productName === 'Apple' ? '#10b981' : market.productName === 'Avocado' ? '#8b5cf6' : '#f59e0b',
        currentPrice: market.currentPrice,
        change: market.change,
        trend: market.trend,
      };
    });
  }, [marketData]);

  if (!isFarmer) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Market Intelligence
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Market intelligence features for administrators will be available soon.
          </p>
        </div>

        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Activity className="h-12 w-12 text-primary-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Feature in Development</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Advanced market intelligence for administrators is currently under development.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Market Intelligence
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Real-time market prices, trends, and demand forecasts for your crops
        </p>
      </div>

      {/* Market Table */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Current Market Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Current Price</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Change</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Trend</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Demand</th>
                </tr>
              </thead>
              <tbody>
                {marketData.map((market: any) => (
                  <tr key={market.productName} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{market.productName}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">₹{market.currentPrice}/kg</td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${market.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {market.change >= 0 ? '+' : ''}{market.change}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {market.trend === 'up' ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={market.change >= 0 ? 'success' : 'error'}>
                        {market.change >= 2 ? 'High' : 'Moderate'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Separate Product Graphs - Maximum 3 per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {productGraphs.map((graph: any) => (
          <Card key={graph.productName} variant="default">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{graph.productName}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{graph.currentPrice}/kg</span>
                  {graph.trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LineChart
                title={`${graph.productName} Price Trend`}
                data={graph.data}
                timestamps={graph.timestamps}
                color={graph.color}
                unit="₹"
                minValue={0}
                maxValue={graph.currentPrice * 1.2}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Nearby Markets */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>Nearby Markets</CardTitle>
        </CardHeader>
        <CardContent>
          {nearbyMarkets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No nearby markets found for this site.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearbyMarkets.map((market) => (
                <div key={market.name} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{market.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{market.distance}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Avg Price</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{market.avgPrice}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Demand</span>
                        <Badge variant={market.demand === 'high' ? 'success' : 'warning'} size="sm">
                          {market.demand}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
};

export default MarketIntelligence;
