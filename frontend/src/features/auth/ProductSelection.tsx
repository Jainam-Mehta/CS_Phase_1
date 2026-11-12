import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Check, AlertCircle, Sprout, Clock, Package, X, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RoleBackground } from '../../components/common/RoleBackground';
import { SystmLogo } from '../../components/common/SystmLogo';
import { PartnerLogos } from '../../components/common/PartnerLogos';
import type { Product } from '../../lib/supabase';

interface ProductWithType extends Product {
  product_type?: 'I' | 'II' | 'III' | string; // Type in Roman numerals
}

const ProductSelection: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { completeStep } = useOnboarding();
  const [products, setProducts] = useState<ProductWithType[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isExtensionMode = searchParams.get('mode') === 'extension';

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      console.log('Products loaded:', data);
      // Add default product types (I, II, III) based on index
      const productsWithTypes = (data || []).map((p: any, idx: number) => ({
        ...p,
        product_type: idx % 3 === 0 ? 'I' : idx % 3 === 1 ? 'II' : 'III'
      }));
      setProducts(productsWithTypes);
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
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProductDetails = Array.from(selectedProducts)
    .map(id => products.find(p => p.id === id))
    .filter(Boolean) as ProductWithType[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedProducts.size === 0) {
      setError('Please select at least one product');
      return;
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
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        throw new Error('Farmer profile not found');
      }

      // Store selected products in localStorage for next step (room selection)
      // Products will be saved to farmer_batch_products after room is selected
      const storageRequest = localStorage.getItem('storageAccessRequest');
      const request = storageRequest ? JSON.parse(storageRequest) : {};
      
      request.products = Array.from(selectedProducts);
      localStorage.setItem('storageAccessRequest', JSON.stringify(request));

      // Complete onboarding step only if not in extension mode
      if (!isExtensionMode) {
        completeStep('dashboard');
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
    <div className="relative min-h-screen flex flex-col justify-between text-white selection:bg-emerald-500 selection:text-white overflow-hidden">
      {/* Consistent Role-Specific 3D Background Animation */}
      <RoleBackground role="farmer" />

      {/* White Header Bar - 68px, Perfectly Contained */}
      <header className="relative w-full h-[68px] px-6 lg:px-10 flex items-center justify-between z-30 bg-white border-b border-gray-200 shadow-sm shrink-0 overflow-hidden">
        <div className="flex items-center h-full">
          <SystmLogo variant="prominent-header" iconSize={52} showCompanyLogo={true} />
        </div>
        <div className="flex items-center h-full">
          <PartnerLogos theme="light" prominent={true} />
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 z-20 w-full overflow-y-auto">

      <div className="w-full max-w-md">
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
                  {/* Searchable Dropdown */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Search & Select Products
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search for crops..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => setIsDropdownOpen(true)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Dropdown list */}
                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                          {filteredProducts.length === 0 ? (
                            <div className="p-4 text-gray-500 dark:text-gray-400 text-center">
                              No products found
                            </div>
                          ) : (
                            filteredProducts.map(product => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleProductToggle(product.id)}
                                className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-200 dark:border-slate-700 last:border-b-0 ${
                                  selectedProducts.has(product.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Shelf life: {product.shelf_life_days} days
                                    </p>
                                  </div>
                                  {selectedProducts.has(product.id) && (
                                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Products List */}
                  {selectedProducts.size > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Selected Products ({selectedProducts.size})</h3>
                      <div className="space-y-2">
                        {selectedProductDetails.map(product => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Shelf life: {product.shelf_life_days} days
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleProductToggle(product.id)}
                              className="ml-4 p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
                            >
                              <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </button>
                          </div>
                        ))}
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
    
      </main>

      {/* Footer info bar */}
      <footer className="relative w-full py-3.5 text-center text-xs text-gray-600 border-t border-gray-200 bg-white z-30 shadow-sm shrink-0">
        <p className="font-medium tracking-wide">
          SystmII Cold Chain Supply Management Platform &bull; Active Logistics Core
        </p>
      </footer>
    </div>
  );
};

export default ProductSelection;