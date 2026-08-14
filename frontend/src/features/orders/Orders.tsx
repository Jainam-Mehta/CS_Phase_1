import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ShoppingCart, Truck, Clock, CheckCircle, Package, TrendingUp, Calendar, User, IndianRupee } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { getProductConfig, PRODUCTS } from '../../utils/productConfig';

const Orders: React.FC = () => {
  const { user, selectedSite } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer: '',
    product: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [orders, setOrders] = useState<any[]>([]);

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

  // Nearby markets per site
  const nearbyMarkets = useMemo(() => {
    if (selectedSite?.name === 'Hamirpur') {
      return ['Hamirpur APMC', 'Mandi Market', 'Kullu Market', 'Shimla Mandi', 'Custom Buyer'];
    } else if (selectedSite?.name === 'Bajaura') {
      return ['Bajaura Market', 'Kullu Market', 'Mandi Market', 'Aut Market', 'Custom Buyer'];
    }
    return ['Custom Buyer'];
  }, [selectedSite]);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      // Replaced localhost:8000 endpoints with zero-state UI mock
      setOrders([]);
    };

    fetchOrders();
  }, [user?.id]);

  // Calculate KPIs from actual order data
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const inTransitOrders = orders.filter((o) => o.status === 'in_transit').length;
    const returnedOrders = orders.filter((o) => o.status === 'returned').length;

    const totalRevenue = orders.reduce((sum, o) => sum + (o.revenue || 0), 0);
    const deliveredRevenue = orders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + (o.revenue || 0), 0);

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      inTransitOrders,
      returnedOrders,
      totalRevenue,
      deliveredRevenue,
    };
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="success">Delivered</Badge>;
      case 'in_transit':
        return <Badge variant="info">In Transit</Badge>;
      case 'returned':
        return <Badge variant="error">Returned</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  // Handle add order
  const handleAddOrder = async () => {
    // Mocked add order to avoid local endpoints missing
    setShowAddModal(false);
    setNewOrder({
      customer: '',
      product: '',
      quantity: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Orders
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage orders from nearby markets and custom buyers
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          New Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <ShoppingCart className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.totalOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Clock className="h-6 w-6 text-yellow-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{kpis.pendingOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Truck className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">In Transit</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kpis.inTransitOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.deliveredOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <Package className="h-6 w-6 text-red-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Returned</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{kpis.returnedOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <IndianRupee className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Revenue Earned</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{kpis.deliveredRevenue.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card variant="default">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Order ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No orders found. Create your first order to get started.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{order.order_id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{order.customer}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{order.product_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{order.quantity} kg</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{order.order_date}</td>
                      <td className="py-3 px-4 text-sm font-medium text-green-600 dark:text-green-400">₹{order.revenue?.toFixed(0) || 0}</td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Order Modal */}
      {showAddModal && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Order">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer
              </label>
              <select
                value={newOrder.customer}
                onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select customer</option>
                {nearbyMarkets.map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product
              </label>
              <select
                value={newOrder.product}
                onChange={(e) => setNewOrder({ ...newOrder, product: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select product</option>
                {siteProducts.map((product) => (
                  <option key={product.id} value={product.name}>
                    {product.icon} {product.name}
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
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                placeholder="Enter quantity in kg"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Date
              </label>
              <input
                type="date"
                value={newOrder.date}
                onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddOrder}>
                Create Order
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Orders;
