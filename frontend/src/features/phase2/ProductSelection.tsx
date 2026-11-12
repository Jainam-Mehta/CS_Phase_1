/**
 * Phase 2.1: Product Selection Component
 * Farmer selects products to store (Type 1-5 fruits/vegetables)
 * Multiselect with quantity input + temp/humidity display
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Trash2, ChevronDown } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  storage_temp_min: number;
  storage_temp_max: number;
  storage_humidity_min: number;
  storage_humidity_max: number;
  shelf_life_days: number;
  ethylene_producer: boolean;
  ethylene_sensitive: boolean;
  category_id: string;
}

interface SelectedProduct {
  product_id: string;
  product_name: string;
  quantity_kg: number;
  product_type?: string;
}

interface ProductSelectionProps {
  onSelect: (products: SelectedProduct[]) => void;
  maxProducts?: number;
}

const ProductSelection: React.FC<ProductSelectionProps> = ({ 
  onSelect, 
  maxProducts = 10 
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Call parent callback whenever selection changes
  useEffect(() => {
    onSelect(selectedProducts);
  }, [selectedProducts, onSelect]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v2/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = (product: Product) => {
    // Check if already selected
    if (selectedProducts.some(p => p.product_id === product.id)) {
      return;
    }

    // Check max limit
    if (selectedProducts.length >= maxProducts) {
      setError(`Maximum ${maxProducts} products allowed`);
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        product_id: product.id,
        product_name: product.name,
        quantity_kg: 1000, // Default 1000 kg
        product_type: 'Standard'
      }
    ]);

    setShowDropdown(false);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
    setError(null);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map(p =>
        p.product_id === productId
          ? { ...p, quantity_kg: Math.max(1, quantity) }
          : p
      )
    );
  };

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedProducts.some(sp => sp.product_id === p.id)
  );

  const getProductDetails = (productId: string): Product | undefined => {
    return products.find(p => p.id === productId);
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg border border-gray-200 max-w-xl mx-auto">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Select Products to Store
        </label>

        {/* Dropdown for selecting products */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="text-sm font-medium">
              {selectedProducts.length > 0
                ? `${selectedProducts.length} product(s) selected`
                : 'Select products...'}
            </span>
            <ChevronDown
              size={18}
              className={`transform transition-transform ${
                showDropdown ? 'rotate-180' : ''
              } text-gray-500`}
            />
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute z-10 w-full mt-2 border border-gray-300 rounded-lg bg-white shadow-lg">
              <div className="p-3 border-b">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">
                  {searchTerm ? 'No products found' : 'All products selected'}
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Temp: {product.storage_temp_min}°C to {product.storage_temp_max}°C
                            | Humidity: {product.storage_humidity_min}% to {product.storage_humidity_max}%
                          </p>
                          <p className="text-xs text-gray-500">
                            Shelf life: {product.shelf_life_days} days
                          </p>
                        </div>
                        <Plus size={16} className="text-blue-500 mt-1 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-gray-900 text-sm">
            Selected Products ({selectedProducts.length})
          </h3>

          {selectedProducts.map(selected => {
            const productDetail = getProductDetails(selected.product_id);
            return (
              <div
                key={selected.product_id}
                className="bg-white p-4 rounded border border-gray-200 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {selected.product_name}
                    </h4>
                    {productDetail && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                        <div>
                          <span className="font-medium">Temperature:</span>
                          <br />
                          {productDetail.storage_temp_min}°C to {productDetail.storage_temp_max}°C
                        </div>
                        <div>
                          <span className="font-medium">Humidity:</span>
                          <br />
                          {productDetail.storage_humidity_min}% to {productDetail.storage_humidity_max}%
                        </div>
                        <div>
                          <span className="font-medium">Shelf Life:</span>
                          <br />
                          {productDetail.shelf_life_days} days
                        </div>
                        {productDetail.ethylene_producer && (
                          <div className="text-orange-600">
                            <span className="font-medium">⚠️ Ethylene Producer</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemoveProduct(selected.product_id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Quantity input */}
                <div className="border-t pt-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={selected.quantity_kg}
                    onChange={(e) =>
                      handleQuantityChange(selected.product_id, parseInt(e.target.value) || 1)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            );
          })}

          <div className="bg-white p-3 rounded border border-gray-200">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Total Quantity:</span>{' '}
              {selectedProducts.reduce((sum, p) => sum + p.quantity_kg, 0).toLocaleString()} kg
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelection;
