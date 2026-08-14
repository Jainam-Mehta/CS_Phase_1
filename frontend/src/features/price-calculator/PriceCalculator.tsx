import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Calculator, TrendingUp, AlertCircle, CheckCircle, Box, Package } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { getProductConfig, PRODUCTS } from '../../utils/productConfig';

const PriceCalculator: React.FC = () => {
  const { user, selectedSite } = useAuthStore();
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [daysToWait, setDaysToWait] = useState(0);
  const [result, setResult] = useState<{
    currentPrice: number;
    predictedPrice: number;
    storageExpense: number;
    revenue: number;
    predictedRevenue: number;
    storageCost: number;
    expectedProfit: number;
    recommendation: string;
    reason: string;
  } | null>(null);

  const isFarmer = user?.role === 'farmer';

  // Get site-specific products
  const siteProducts = useMemo(() => {
    if (selectedSite) {
      return PRODUCTS.filter(p => {
        if (selectedSite.name === 'Hamirpur') {
          return p.name === 'Dragon Fruit' || p.name === 'Avocado';
        } else if (selectedSite.name === 'Bajaura') {
          return p.name === 'Apple';
        }
        return true;
      });
    }
    return PRODUCTS;
  }, [selectedSite]);

  // Set default product when products change
  React.useEffect(() => {
    if (siteProducts.length > 0 && !product) {
      setProduct(siteProducts[0].id);
    }
  }, [siteProducts, product]);

  // Calculate prediction with specific formula
  const calculatePrediction = () => {
    const selectedProduct = siteProducts.find((p) => p.id === product);
    if (!selectedProduct) return;

    const currentPrice = selectedProduct.sellingPrice;
    
    // Price trends based on product (from requirements)
    const priceTrends: Record<string, number> = {
      'Apple': 0.04, // +4%
      'Avocado': 0.06, // +6%
      'Dragon Fruit': -0.02, // -2%
    };

    const trend = priceTrends[selectedProduct.name] || 0;
    const predictedPrice = currentPrice * (1 + trend);

    // Storage cost calculations
    const crateChargePerKg = 1.5 / 25; // ₹1.5 per 25kg = ₹0.06 per kg
    const totalCrateCharge = quantity * crateChargePerKg;
    
    // Storage expense (based on product-specific daily cost)
    const dailyStorageCostPerKg: Record<string, number> = {
      'Apple': 0.5,
      'Avocado': 0.7,
      'Dragon Fruit': 0.6,
    };
    const storageCostPerKg = dailyStorageCostPerKg[selectedProduct.name] || 0.5;
    const totalStorageCost = quantity * storageCostPerKg * daysToWait;

    // Storage expense = crate charge + storage cost
    const storageExpense = totalCrateCharge + totalStorageCost;

    // Revenue calculations
    const revenue = quantity * currentPrice;
    const predictedRevenue = quantity * predictedPrice;

    // Expected profit = predicted revenue - storage expense
    const expectedProfit = predictedRevenue - storageExpense;

    // Recommendation logic
    let recommendation = '';
    let reason = '';

    if (trend > 0) {
      if (daysToWait > 7) {
        recommendation = 'Sell Now';
        reason = 'Price increase may not justify storage costs beyond 7 days';
      } else {
        recommendation = 'Hold and Sell';
        reason = `Prices expected to rise by ${(trend * 100).toFixed(0)}%`;
      }
    } else {
      recommendation = 'Sell Now';
      reason = `Prices expected to decline by ${(Math.abs(trend) * 100).toFixed(0)}%`;
    }

    setResult({
      currentPrice,
      predictedPrice,
      storageExpense,
      revenue,
      predictedRevenue,
      storageCost: totalStorageCost,
      expectedProfit,
      recommendation,
      reason,
    });
  };

  const selectedProductData = siteProducts.find((p) => p.id === product);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Price Calculator
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Calculate storage costs, revenue, and expected profit for your products
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Form */}
        <Card variant="default">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product
              </label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {siteProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity (kg)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Days to Wait Before Selling
              </label>
              <input
                type="number"
                value={daysToWait}
                onChange={(e) => setDaysToWait(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <Button onClick={calculatePrediction} className="w-full">
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card variant="default">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Calculation Results
                </h3>
                <Badge variant={result.recommendation === 'Sell Now' ? 'error' : 'success'}>
                  {result.recommendation}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Price</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ₹{result.currentPrice.toFixed(2)}/kg
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Predicted Price</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ₹{result.predictedPrice.toFixed(2)}/kg
                  </span>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Revenue (Current)</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      ₹{result.revenue.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Predicted Revenue</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      ₹{result.predictedRevenue.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Storage Cost</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      ₹{result.storageCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Crate Charge</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      ₹{(quantity * 1.5 / 25).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Storage Expense</span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      ₹{result.storageExpense.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected Profit</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      ₹{result.expectedProfit.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Recommendation
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {result.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Info Card */}
      {selectedProductData && (
        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-2xl">
                {selectedProductData.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{selectedProductData.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Optimal Temp</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedProductData.minTemp}°C - {selectedProductData.maxTemp}°C
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Shelf Life</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedProductData.shelfLifeDays} days
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Selling Price</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      ₹{selectedProductData.sellingPrice}/kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Humidity</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedProductData.minHumidity}% - {selectedProductData.maxHumidity}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PriceCalculator;
