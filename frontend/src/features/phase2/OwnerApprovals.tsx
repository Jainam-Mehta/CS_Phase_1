/**
 * Phase 2.2: Owner Approvals Component
 * Owner reviews pending farmer requests with products
 * Shows product details, quantities, and investment amounts
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader, Eye, EyeOff } from 'lucide-react';

interface Product {
  product_id: string;
  product_name: string;
  quantity_kg: number;
  storage_temp_min: number;
  storage_temp_max: number;
  storage_humidity_min: number;
  storage_humidity_max: number;
  estimated_investment: number;
}

interface PendingRequest {
  request_id: string;
  farmer_id: string;
  farmer_name: string;
  room_id: string;
  requested_at: string;
  products: Product[];
  total_investment_estimate: number;
  remarks?: string;
}

interface OwnerApprovalsProps {
  ownerId: string;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
}

const OwnerApprovals: React.FC<OwnerApprovalsProps> = ({ ownerId, onApprove, onReject }) => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [pricingInputs, setPricingInputs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, [ownerId]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/v2/owner/approvals/pending?owner_id=${ownerId}`);
      
      if (!response.ok) throw new Error('Failed to fetch approvals');
      
      const data = await response.json();
      setRequests(data);

      // Initialize pricing inputs with default values
      const initialPricing: Record<string, number> = {};
      data.forEach((req: PendingRequest) => {
        initialPricing[req.request_id] = 5; // Default ₹5 per crate
      });
      setPricingInputs(initialPricing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setError(null);
    setSuccess(null);

    const price = pricingInputs[requestId];
    if (!price || price <= 0) {
      setError('Please enter a valid price per crate');
      return;
    }

    try {
      setSubmitting(requestId);

      const payload = {
        request_id: requestId,
        approved: true,
        price_per_crate: price,
        remarks: 'Approved by owner'
      };

      const response = await fetch(
        `http://localhost:8000/api/v2/owner/approvals/${requestId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to approve request');
      }

      setSuccess(`Request ${requestId.slice(0, 8)} approved!`);
      setRequests(requests.filter(r => r.request_id !== requestId));

      if (onApprove) onApprove(requestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setError(null);
    setSuccess(null);

    if (!window.confirm('Are you sure you want to reject this request?')) return;

    try {
      setSubmitting(requestId);

      const response = await fetch(
        `http://localhost:8000/api/v2/owner/approvals/${requestId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remarks: 'Rejected by owner' })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reject request');
      }

      setSuccess(`Request ${requestId.slice(0, 8)} rejected`);
      setRequests(requests.filter(r => r.request_id !== requestId));

      if (onReject) onReject(requestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setSubmitting(null);
    }
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 mt-1">
          Review and approve farmer storage requests ({requests.length} pending)
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-green-900">Success</h3>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <CheckCircle className="mx-auto text-blue-600 mb-3" size={32} />
          <h3 className="font-semibold text-blue-900">No Pending Requests</h3>
          <p className="text-sm text-blue-700 mt-1">All requests have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <div
              key={request.request_id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Request Header */}
              <button
                onClick={() =>
                  setExpandedRequest(
                    expandedRequest === request.request_id ? null : request.request_id
                  )
                }
                className="w-full p-4 flex items-start justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {request.farmer_name}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium">
                      Pending
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    {request.products.length} product(s) • Requested:{' '}
                    {new Date(request.requested_at).toLocaleDateString()}
                  </p>

                  <div className="flex items-baseline gap-4 mt-2">
                    <span className="text-sm font-medium text-gray-700">
                      Total Investment: <span className="text-lg font-bold text-green-600">
                        ₹{request.total_investment_estimate.toLocaleString()}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {request.products.reduce((sum, p) => sum + p.quantity_kg, 0).toLocaleString()} kg total
                    </span>
                  </div>
                </div>

                <button
                  className="ml-4 text-gray-500 hover:text-gray-700 flex-shrink-0 mt-1"
                >
                  {expandedRequest === request.request_id ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </button>

              {/* Expanded Details */}
              {expandedRequest === request.request_id && (
                <>
                  <div className="border-t bg-gray-50 p-4 space-y-4">
                    {/* Products Table */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Products</h4>
                      <div className="space-y-2">
                        {request.products.map(product => (
                          <div
                            key={product.product_id}
                            className="p-3 bg-white border border-gray-200 rounded"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-semibold text-gray-900">
                                  {product.product_name}
                                </h5>
                                <p className="text-sm text-gray-600">
                                  {product.quantity_kg.toLocaleString()} kg
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">
                                  ₹{product.estimated_investment.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 border-t pt-2">
                              <div>
                                <span className="font-medium">Temperature:</span>
                                <br />
                                {product.storage_temp_min}°C to {product.storage_temp_max}°C
                              </div>
                              <div>
                                <span className="font-medium">Humidity:</span>
                                <br />
                                {product.storage_humidity_min}% to {product.storage_humidity_max}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remarks */}
                    {request.remarks && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Remarks:</span> {request.remarks}
                        </p>
                      </div>
                    )}

                    {/* Pricing Input */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Set Price Per Crate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={pricingInputs[request.request_id] || ''}
                        onChange={(e) =>
                          setPricingInputs({
                            ...pricingInputs,
                            [request.request_id]: parseFloat(e.target.value) || 0
                          })
                        }
                        placeholder="Enter price per crate..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        1 crate = 25 kg of product
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2 border-t">
                      <button
                        onClick={() => handleApprove(request.request_id)}
                        disabled={submitting === request.request_id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center gap-2 transition-colors"
                      >
                        {submitting === request.request_id ? (
                          <>
                            <Loader size={16} className="animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            Approve
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleReject(request.request_id)}
                        disabled={submitting === request.request_id}
                        className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center justify-center gap-2 transition-colors"
                      >
                        {submitting === request.request_id ? (
                          <>
                            <Loader size={16} className="animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle size={16} />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerApprovals;
