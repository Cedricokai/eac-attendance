import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ClockIcon,
  CubeIcon,
  UserCircleIcon,
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  FunnelIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

const History = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState('actionDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [productFilter, setProductFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    if (hostname === "100.114.178.13") {
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('jwtToken');

      try {
        // Fetch products
        const productsResponse = await fetch(`${API_BASE_URL}/api/products`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch products: ${productsResponse.status}`);
        }

        const productsData = await productsResponse.json();
        setProducts(productsData);

        // Fetch both product history and stock history
        const [historyResponse, stockHistoryResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/product-history`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_BASE_URL}/api/stock/history`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }).catch(err => {
            console.log('Stock history endpoint not available, continuing...');
            return { ok: false };
          })
        ]);

        if (!historyResponse.ok) {
          throw new Error(`Failed to fetch history: ${historyResponse.status}`);
        }

        const historyData = await historyResponse.json();
        const stockHistoryData = stockHistoryResponse.ok ? await stockHistoryResponse.json() : [];

        // Combine both histories
        const combinedHistory = [
          ...historyData.map(record => ({
            ...record,
            type: 'PRODUCT_HISTORY',
            stockDetails: null,
            productName: productsData.find(p => p.id === record.productId)?.name || `Product ID: ${record.productId}`,
            productCode: productsData.find(p => p.id === record.productId)?.code || 'N/A',
            productType: productsData.find(p => p.id === record.productId)?.productType || 'N/A',
            // Ensure parsedActionType exists
            parsedActionType: record.actionType || 'UNKNOWN'
          })),
          ...stockHistoryData.map(record => ({
            ...record,
            type: 'STOCK_HISTORY',
            id: `stock-${record.id}`,
            actionType: 'STOCK_ADJUSTMENT',
            parsedActionType: 'STOCK_ADJUSTMENT',
            actionDate: record.adjustmentDate,
            productId: record.productId,
            description: `Stock ${record.adjustmentType === 'ADD' ? 'added' : 'removed'}: ${record.quantityChanged} units. ` +
                       `Changed from ${record.oldStock} to ${record.newStock}. ` +
                       `Reason: ${record.reason}. Notes: ${record.notes}`,
            stockDetails: {
              oldStock: record.oldStock,
              newStock: record.newStock,
              adjustmentQuantity: record.quantityChanged,
              adjustmentType: record.adjustmentType,
              reason: record.reason,
              notes: record.notes
            }
          }))
        ];

        // Sort by date
        const sortedHistory = combinedHistory.sort((a, b) => 
          new Date(b.actionDate) - new Date(a.actionDate)
        );
        
        setHistory(sortedHistory);

        // Check for product filter in URL
        const params = new URLSearchParams(location.search);
        const productId = params.get('productId');
        if (productId) {
          const product = productsData.find(p => p.id === parseInt(productId));
          if (product) {
            setSelectedProduct(product);
            setProductFilter(product.id.toString());
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location.search]);

  // Filter and sort history
  const filteredAndSortedHistory = history
    .filter(record => {
      const matchesSearch = 
        record.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.parsedActionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.productCode?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = 
        filterType === 'all' || 
        (filterType === 'STOCK_ADJUSTMENT' ? record.stockDetails : 
         record.parsedActionType?.toLowerCase() === filterType.toLowerCase());

      const matchesProduct = 
        productFilter === 'all' || 
        record.productId?.toString() === productFilter ||
        (selectedProduct && record.productId === selectedProduct.id);

      return matchesSearch && matchesFilter && matchesProduct;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'actionDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getActionTypeColor = (actionType, stockDetails) => {
    if (stockDetails) {
      return stockDetails.adjustmentType === 'ADD' 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-red-100 text-red-800 border border-red-200';
    }
    
    const type = actionType?.toLowerCase() || '';
    if (type.includes('add') || type.includes('create')) return 'bg-green-100 text-green-800';
    if (type.includes('edit') || type.includes('update')) return 'bg-blue-100 text-blue-800';
    if (type.includes('delete') || type.includes('remove')) return 'bg-red-100 text-red-800';
    if (type.includes('transfer') || type.includes('move')) return 'bg-purple-100 text-purple-800';
    if (type.includes('stock')) return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (actionType, stockDetails) => {
    if (stockDetails) {
      return stockDetails.adjustmentType === 'ADD' 
        ? <PlusCircleIcon className="h-4 w-4" /> 
        : <MinusCircleIcon className="h-4 w-4" />;
    }
    
    const type = (actionType || '').toLowerCase();
    if (type.includes('add') || type.includes('create')) return <PlusCircleIcon className="h-4 w-4" />;
    if (type.includes('edit') || type.includes('update')) return <PencilIcon className="h-4 w-4" />;
    if (type.includes('delete') || type.includes('remove')) return <TrashIcon className="h-4 w-4" />;
    if (type.includes('transfer') || type.includes('move')) return <ArrowPathIcon className="h-4 w-4" />;
    if (type.includes('stock')) return <CubeIcon className="h-4 w-4" />;
    return <DocumentTextIcon className="h-4 w-4" />;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const handleProductFilterChange = (e) => {
    const value = e.target.value;
    setProductFilter(value);
    if (value === 'all') {
      setSelectedProduct(null);
    } else {
      const product = products.find(p => p.id.toString() === value);
      setSelectedProduct(product || null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setProductFilter('all');
    setSelectedProduct(null);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="ml-4 text-lg text-gray-600">Loading history...</div>
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <div className="max-w-md p-6 bg-red-50 border border-red-400 text-red-700 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Error loading history</h2>
        <p className="mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Enhanced Sidebar */}
      <div className="w-64 bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl text-white transition-all duration-300">
        <div className="p-6 border-b border-blue-700 flex items-center gap-3">
          <CubeIcon className="h-7 w-7 text-blue-300" />
          <h5 className="text-xl font-bold">StockFlow</h5>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            <li>
              <button
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors text-white"
                onClick={() => navigate('/MasterPage')}
              >
                <HomeIcon className="h-5 w-5" />
                <span className="font-medium">Dashboard</span>
              </button>
            </li>
            <li>
              <button
                className="flex items-center gap-3 w-full justify-start bg-blue-700/30 rounded-lg p-3 transition-colors text-white"
              >
                <ClockIcon className="h-5 w-5" />
                <span className="font-medium">History</span>
              </button>
            </li>
            <li>
              <button
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors text-white"
                onClick={() => navigate('/Products')}
              >
                <ArchiveBoxIcon className="h-5 w-5" />
                <span className="font-medium">Inventory</span>
              </button>
            </li>
            <li>
              <button
                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors text-white"
                onClick={() => navigate('/Search')}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span className="font-medium">Search</span>
              </button>
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-blue-700 bg-blue-800/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <UserCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold">Admin User</div>
              <div className="text-sm text-blue-300">admin@stockflow.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity History</h1>
            <p className="text-sm text-gray-600 mt-2">
              Track all product activities including stock adjustments, updates, and deletions
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredAndSortedHistory.length} records found
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              />
            </div>

            {/* Filter by Action Type */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none"
              >
                <option value="all">All Actions</option>
                <option value="ADD">Created</option>
                <option value="EDIT">Updated</option>
                <option value="STOCK_ADJUSTMENT">Stock Adjustments</option>
                <option value="DELETE">Deleted</option>
              </select>
            </div>

            {/* Filter by Product */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={productFilter}
                onChange={handleProductFilterChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none"
              >
                <option value="all">All Products</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.code || 'No Code'})
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-center">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>

          {/* Selected Product Info */}
          {selectedProduct && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CubeIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">{selectedProduct.name}</h3>
                    <div className="text-sm text-blue-700">
                      Code: {selectedProduct.code || 'N/A'} • 
                      Type: {selectedProduct.productType || 'N/A'} • 
                      Current Stock: <span className="font-bold">{selectedProduct.stock}</span> units
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/Products`)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View in Inventory →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    { key: 'productName', label: 'Product Name' },
                    { key: 'actionType', label: 'Action' },
                    { key: 'stockChange', label: 'Stock Change' },
                    { key: 'actionDate', label: 'Date & Time' },
                    { key: 'userEmail', label: 'User' },
                    { key: 'details', label: 'Details' }
                  ].map(({ key, label }) => (
                    <th 
                      key={key}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <ClockIcon className="h-16 w-16 text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No history records found</p>
                        <p className="text-sm text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedHistory.map((record) => {
                    const { stockDetails } = record;
                    
                    return (
                      <tr 
                        key={record.id || `record-${record.productId}-${record.actionDate}`} 
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                              {getActionIcon(record.parsedActionType, stockDetails)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {record.productName}
                              </div>
                              {record.productCode && record.productCode !== 'N/A' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Code: {record.productCode}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Type: {record.productType || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(record.parsedActionType, stockDetails)}`}>
                              {getActionIcon(record.parsedActionType, stockDetails)}
                              {stockDetails ? 'STOCK_ADJUSTMENT' : (record.parsedActionType || 'Unknown')}
                            </span>
                            {stockDetails && stockDetails.reason && (
                              <div className="text-xs text-gray-600 max-w-[150px] truncate">
                                Reason: {stockDetails.reason}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stockDetails ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">Old Stock</div>
                                  <div className="text-lg font-bold text-gray-700">{stockDetails.oldStock}</div>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className={`p-1 rounded-full ${stockDetails.adjustmentType === 'ADD' ? 'bg-green-100' : 'bg-red-100'}`}>
                                    {stockDetails.adjustmentType === 'ADD' ? (
                                      <ArrowUpIcon className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <ArrowDownIcon className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  <div className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded ${
                                    stockDetails.adjustmentType === 'ADD' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {stockDetails.adjustmentType === 'ADD' ? '+' : '-'}{stockDetails.adjustmentQuantity}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-gray-500 mb-1">New Stock</div>
                                  <div className={`text-lg font-bold ${
                                    stockDetails.newStock > stockDetails.oldStock 
                                      ? 'text-green-600' 
                                      : stockDetails.newStock < stockDetails.oldStock 
                                        ? 'text-red-600' 
                                        : 'text-gray-700'
                                  }`}>
                                    {stockDetails.newStock}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 text-center">
                                {stockDetails.adjustmentType === 'ADD' ? 'Stock Added' : 'Stock Removed'}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 italic">No stock change</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {formatDateTime(record.actionDate)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {record.actionDate ? new Date(record.actionDate).toLocaleDateString('en-US', {
                              weekday: 'short'
                            }) : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{record.userEmail || 'Unknown'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">
                            {record.description || 'No description available'}
                            {stockDetails && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start gap-2">
                                  <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="text-xs font-semibold text-gray-700 mb-1">Stock Adjustment Details:</div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div>Changed from {stockDetails.oldStock} to {stockDetails.newStock} units</div>
                                      {stockDetails.adjustmentType === 'ADD' ? (
                                        <div className="text-green-600">Added {stockDetails.adjustmentQuantity} units</div>
                                      ) : (
                                        <div className="text-red-600">Removed {stockDetails.adjustmentQuantity} units</div>
                                      )}
                                      {stockDetails.reason && (
                                        <div className="mt-2">
                                          <span className="font-medium">Reason:</span> {stockDetails.reason}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        {filteredAndSortedHistory.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">Total Records</div>
              <div className="text-2xl font-bold text-gray-900">{filteredAndSortedHistory.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">Stock Adjustments</div>
              <div className="text-2xl font-bold text-amber-600">
                {filteredAndSortedHistory.filter(h => h.stockDetails).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">Stock Added</div>
              <div className="text-2xl font-bold text-green-600">
                {filteredAndSortedHistory
                  .filter(h => h.stockDetails?.adjustmentType === 'ADD')
                  .reduce((sum, h) => sum + (h.stockDetails?.adjustmentQuantity || 0), 0)} units
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">Stock Removed</div>
              <div className="text-2xl font-bold text-red-600">
                {filteredAndSortedHistory
                  .filter(h => h.stockDetails?.adjustmentType === 'REMOVE')
                  .reduce((sum, h) => sum + (h.stockDetails?.adjustmentQuantity || 0), 0)} units
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            Inventory Management System • StockFlow © {new Date().getFullYear()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Showing history for {selectedProduct ? `"${selectedProduct.name}"` : 'all products'} • 
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;