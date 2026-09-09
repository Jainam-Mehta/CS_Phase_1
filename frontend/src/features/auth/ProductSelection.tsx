import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Apple, Carrot, Grape, Milk, Check, AlertCircle, Sprout, Thermometer, Droplets, Clock, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../lib/supabase';

interface ProductCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
}

const PRODUCT_CATEGORIES: ProductCategory[] = [
  { name: 'Fruits', icon: <Apple className="h-5 w-5" />, color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  { name: 'Vegetables', icon: <Carrot className="h-5 w-5" />, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  { name: 'Exotic Fruits', icon: <Grape className="h-5 w-5" />, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  { name: 'Dairy', icon: <Milk className="h-5 w-5" />, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
];

interface ProductDetails {
  quantity: number | string; // quantity in crates (1 crate = 25 kg)
}

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { completeStep } = useOnboarding();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [productDetails, setProductDetails] = useState<Record<string, ProductDetails>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const isExtensionMode = searchParams.get('mode') === 'extension';

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(name)')
        .order('name');
      
      if (error) throw error;
      console.log('Products loaded:', data);
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products. Please check your internet connection and try again.');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
        // Remove details when deselected
        setProductDetails(prev => {
          const updated = { ...prev };
          delete updated[productId];
          return updated;
        });
      } else {
        newSet.add(productId);
        // Initialize with empty quantity when selected (no default 0)
        setProductDetails(prev => ({
          ...prev,
          [productId]: {
            quantity: '' as any, // Empty string instead of 0
          }
        }));
      }
      return newSet;
    });
  };

  const handleDetailChange = (productId: string, field: keyof ProductDetails, value: any) => {
    setProductDetails(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const getProductsByCategory = (category: string) => {
    return products.filter(p => (p as any).product_categories?.name === category || p.category === category);
  };

  const getTotalQuantity = () => {
    return Array.from(selectedProducts).reduce((total, productId) => {
      const details = productDetails[productId];
      if (!details || !details.quantity || details.quantity === '') return total;
      
      // Each crate = 25 kg
      const qty = typeof details.quantity === 'string' ? parseInt(details.quantity) : details.quantity;
      return total + (qty * 25);
    }, 0);
  };

  const getAverageShelfLife = () => {
    if (selectedProducts.size === 0) return 0;
    const totalShelfLife = Array.from(selectedProducts).reduce((total, productId) => {
      const product = products.find(p => p.id === productId);
      return total + (product?.shelf_life_days || 0);
    }, 0);
    return Math.round(totalShelfLife / selectedProducts.size);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedProducts.size === 0) {
      setError('Please select at least one product');
      return;
    }

    // Validate that all selected products have quantity > 0
    for (const productId of selectedProducts) {
      const details = productDetails[productId];
      if (!details || !details.quantity || details.quantity === '' || (typeof details.quantity === 'number' && details.quantity <= 0)) {
        setError('Please specify quantity for all selected products');
        return;
      }
    }

    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error('No authenticated user found');
      }

      // Get farmer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!profile) {
        throw new Error('Farmer profile not found');
      }

      // Get farmer's room access request natively bypass Approved status bounds
      const { data: roomAccess } = await supabase
        .from('farmer_room_access')
        .select('room_id')
        .eq('farmer_id', profile.id)
        .order('requested_at', { ascending: false })
        .limit(1);

      if (!roomAccess || roomAccess.length === 0) {
        throw new Error('No room access bounds found. Please ensure you select a storage room natively before confirming.');
      }

      // Use the first approved room for now
      const roomId = roomAccess[0].room_id;

      // Save product selections to farmer_products
      const productInserts = Array.from(selectedProducts).map(productId => ({
        farmer_id: profile.id,
        product_id: productId,
      }));

      const { error: productInsertError } = await supabase
        .from('farmer_products')
        .insert(productInserts);

      if (productInsertError) throw productInsertError;

      // Create batches for each selected product
      // NEW SCHEMA: batches table doesn't have room_id anymore
      // Since this is product selection (before room assignment), we only create batches
      // Room allocation will happen later when farmer selects a room
      const batchInserts = Array.from(selectedProducts).map(productId => {
        const details = productDetails[productId];
        const product = products.find(p => p.id === productId);
        
        // Generate unique batch_code
        const batchCode = `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Calculate quantity in kg (1 crate = 25 kg), handle string/number
        const crateQty = typeof details.quantity === 'string' ? parseInt(details.quantity) : details.quantity;
        const quantityKg = crateQty * 25;
        
        // Calculate expiry_date based on product shelf life
        const harvestDate = new Date();
        const expiryDate = new Date(harvestDate);
        const shelfLifeDays = product?.shelf_life_days || 30;
        expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);

        return {
          batch_code: batchCode,
          farmer_id: profile.id,
          product_id: productId,
          harvest_date: harvestDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          initial_quantity_kg: quantityKg,
          remaining_quantity_kg: quantityKg,
          quality_grade: 'A',
          remarks: null,
        };
      });

      const { error: batchInsertError } = await supabase
        .from('batches')
        .insert(batchInserts);

      if (batchInsertError) throw batchInsertError;

      // Complete onboarding step only if not in extension mode
      if (!isExtensionMode) {
        completeStep('products');
      }

      // Navigate based on mode
      if (isExtensionMode) {
        navigate('/farmer/settings?extended=true');
      } else {
        navigate('/farmer/dashboard');
      }
    } catch (err) {
      console.error('Error saving product selections:', err);
      setError(err instanceof Error ? err.message : 'Failed to save product selections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if products are still loading
  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-4">
      <div className="w-full max-w-7xl">
        <Card variant="default" className="w-full">
          <CardHeader className="text-center relative">
            {/* Step Indicator */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-full">
                Step 3/3
              </span>
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sprout className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl">Select Your Products</CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Choose the products you want to store in cold storage
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No products available. Please contact support.
                  </p>
                </div>
              ) : (
                <>
                  {PRODUCT_CATEGORIES.map((category) => {
                    const categoryProducts = getProductsByCategory(category.name);
                    if (categoryProducts.length === 0) return null;

                    return (
                      <div key={category.name} className="space-y-3">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${category.color}`}>
                          {category.icon}
                          <h3 className="font-semibold">{category.name}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          {categoryProducts.map((product) => {
                            const isSelected = selectedProducts.has(product.id);
                            const details = productDetails[product.id];
                            
                            return (
                              <div
                                key={product.id}
                                className={`border-2 rounded-lg transition-all ${
                                  isSelected
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-slate-700'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    // Only toggle if clicking outside of input fields
                                    if (!(e.target instanceof HTMLInputElement)) {
                                      handleProductToggle(product.id);
                                    }
                                  }}
                                  className="w-full p-3 text-left"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                                      {product.name}
                                    </span>
                                    {isSelected && (
                                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    )}
                                  </div>
                                  
                                  {!isSelected && (
                                    <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                      <div className="flex items-center gap-1">
                                        <Thermometer className="h-3 w-3" />
                                        <span>{product.optimal_temp}°C</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Droplets className="h-3 w-3" />
                                        <span>{product.min_humidity}-{product.max_humidity}%</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{product.shelf_life_days} days</span>
                                      </div>
                                    </div>
                                  )}
                                </button>
                                
                                {isSelected && details && (
                                  <div className="px-3 pb-3 space-y-2 border-t border-gray-200 dark:border-slate-600 pt-2">
                                    <div>
                                      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                                        Quantity (Crates)
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={details.quantity}
                                        onChange={(e) => handleDetailChange(product.id, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-800"
                                        placeholder="Enter quantity"
                                        required
                                      />
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        1 crate = 25 kg
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Live Summary */}
                  {selectedProducts.size > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Selection Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-blue-700 dark:text-blue-300">Products Selected</p>
                          <p className="font-semibold text-blue-900 dark:text-blue-100">{selectedProducts.size}</p>
                        </div>
                        <div>
                          <p className="text-blue-700 dark:text-blue-300">Total Quantity</p>
                          <p className="font-semibold text-blue-900 dark:text-blue-100">
                            {Array.from(selectedProducts).reduce((total, productId) => {
                              const details = productDetails[productId];
                              if (!details || !details.quantity || details.quantity === '') return total;
                              const qty = typeof details.quantity === 'string' ? parseInt(details.quantity) : details.quantity;
                              return total + qty;
                            }, 0)} crates ({getTotalQuantity()} kg)
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-700 dark:text-blue-300">Avg Shelf Life</p>
                          <p className="font-semibold text-blue-900 dark:text-blue-100">{getAverageShelfLife()} days</p>
                        </div>
                        <div>
                          <p className="text-blue-700 dark:text-blue-300">Storage</p>
                          <p className="font-semibold text-blue-900 dark:text-blue-100">Cold Storage</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                    </p>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={loading}
                      disabled={selectedProducts.size === 0}
                    >
                      {isExtensionMode ? 'Complete Request' : 'Continue to Dashboard'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductSelection;
