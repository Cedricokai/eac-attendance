import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TruckIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  CalendarIcon
} from "@heroicons/react/24/solid";
import {
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';

const Received = () => {
    // Data states
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Selection states
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectedItemDetails, setSelectedItemDetails] = useState([]);
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    
    // Move dialog states
    const [isMoveToMenuOpen, setIsMoveToMenuOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [requestedBy, setRequestedBy] = useState('');
    const [movementDate, setMovementDate] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [moveLoading, setMoveLoading] = useState(false);
    const [moveError, setMoveError] = useState(null);
    const [individualQuantities, setIndividualQuantities] = useState({});

    const locations = ['AHAFO_NORTH', 'NPI', 'LAYDOWN', 'MKV', 'SUG', 'PROCESS PLANT', 'AROPLANT', 'PLANT SITE'];
    const navigate = useNavigate();

    const getApiBaseUrl = () => {
        const hostname = window.location.hostname;
        if (hostname.startsWith("192.168.") || hostname === "localhost") {
            return import.meta.env.VITE_API_BASE_URL_LOCAL;
        } else {
            return import.meta.env.VITE_API_BASE_URL_PUBLIC;
        }
    };

    // Get auth token
    const getAuthToken = () => {
        return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
    };

    // Fetch Products
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();
            const API_BASE_URL = getApiBaseUrl();

            if (!token) {
                setError('Authentication token not found. Please login again.');
                return;
            }

            const productsResponse = await fetch(`${API_BASE_URL}/api/products`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!productsResponse.ok) {
                throw new Error(`Failed to fetch products: ${productsResponse.status}`);
            }

            const productsData = await productsResponse.json();
            setProducts(productsData);
            setFilteredProducts(productsData);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Search functionality
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProducts(products);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = products.filter(product => 
                product.name?.toLowerCase().includes(query) ||
                product.code?.toLowerCase().includes(query) ||
                product.description?.toLowerCase().includes(query)
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, products]);

    // Selection handler
    const toggleItemSelection = (itemId) => {
        setSelectedItems((prevSelected) => {
            const isSelected = prevSelected.includes(itemId);
            const newSelected = isSelected
                ? prevSelected.filter((id) => id !== itemId)
                : [...prevSelected, itemId];
        
            // Update details based on selected products only
            const updatedDetails = newSelected.map((id) => {
                const product = products.find((p) => p.id === id);
                
                if (product) {
                    return {
                        id: product.id,
                        name: product.name,
                        code: product.code,
                        description: product.description,
                        stock: product.stock,
                        userName: product.userName,
                        productType: product.productType
                    };
                }
                return null;
            }).filter(Boolean);
    
            setSelectedItemDetails(updatedDetails);
            
            // Initialize quantities for newly selected items
            if (!isSelected) {
                setIndividualQuantities(prev => ({
                    ...prev,
                    [itemId]: 1
                }));
            } else {
                setIndividualQuantities(prev => {
                    const newQuantities = { ...prev };
                    delete newQuantities[itemId];
                    return newQuantities;
                });
            }
            
            return newSelected;
        });
    };

    const toggleAllProducts = () => {
        if (selectedItems.length === filteredProducts.length) {
            setSelectedItems([]);
            setSelectedItemDetails([]);
            setIndividualQuantities({});
        } else {
            const allProductIds = filteredProducts.map(p => p.id);
            setSelectedItems(allProductIds);
            setSelectedItemDetails(filteredProducts.map(p => ({
                id: p.id,
                name: p.name,
                code: p.code,
                description: p.description,
                stock: p.stock,
                userName: p.userName,
                productType: p.productType
            })));
            // Initialize all quantities to 1
            const initialQuantities = {};
            allProductIds.forEach(id => {
                initialQuantities[id] = 1;
            });
            setIndividualQuantities(initialQuantities);
        }
    };

    const updateQuantity = (productId, quantity) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Ensure quantity is within valid range
        const validQuantity = Math.max(1, Math.min(product.stock, quantity));
        
        setIndividualQuantities(prev => ({
            ...prev,
            [productId]: validQuantity
        }));
    };

    const moveItemsToOutgoing = async () => {
        setMoveLoading(true);
        setMoveError(null);

        try {
            if (!requestedBy) {
                setMoveError("Please enter the requester name.");
                setMoveLoading(false);
                return;
            }

            if (!selectedLocation) {
                setMoveError("Please select a destination location.");
                setMoveLoading(false);
                return;
            }

            const token = getAuthToken();
            if (!token) {
                setMoveError("Authentication token not found. Please log in again.");
                setMoveLoading(false);
                return;
            }

            // ✅ Step 1: Validate quantities
            for (let itemId of selectedItems) {
                const product = products.find(p => p.id === itemId);
                const quantity = individualQuantities[itemId] || 1;

                if (!product) {
                    setMoveError(`Product with ID ${itemId} not found.`);
                    setMoveLoading(false);
                    return;
                }

                if (quantity > product.stock) {
                    setMoveError(`Cannot move ${quantity} items of ${product.name}. Only ${product.stock} available.`);
                    setMoveLoading(false);
                    return;
                }

                if (quantity <= 0) {
                    setMoveError(`Quantity must be at least 1 for ${product.name}.`);
                    setMoveLoading(false);
                    return;
                }
            }

            // ✅ Step 2: Create outgoing items with custom date
            const outgoingItems = selectedItems.map(itemId => {
                const product = products.find(p => p.id === itemId);
                const quantity = individualQuantities[itemId] || 1;
                
                return {
                    name: product.name,
                    code: product.code,
                    description: product.description,
                    location: selectedLocation,
                    requestedBy: requestedBy,
                    stock: quantity,
                    productId: product.id,
                    userName: product.userName,
                    movementDate: movementDate ? new Date(movementDate).toISOString() : new Date().toISOString()
                };
            });

            console.log('Sending outgoing items:', outgoingItems);

            const API_BASE_URL = getApiBaseUrl();

            // ✅ Step 3: Send outgoing records to backend
            const outgoingResponse = await fetch(`${API_BASE_URL}/api/outgoing`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(outgoingItems),
            });

            console.log('Outgoing response status:', outgoingResponse.status);

            if (!outgoingResponse.ok) {
                const errorText = await outgoingResponse.text();
                console.error('Outgoing server error:', errorText);
                throw new Error(`Failed to save outgoing records: ${outgoingResponse.status}`);
            }

            // ✅ Step 4: Update each product's stock individually in backend
            for (const itemId of selectedItems) {
                const product = products.find(p => p.id === itemId);
                const quantityMoved = individualQuantities[itemId] || 1;
                const newStock = product.stock - quantityMoved;

                // Update product stock via individual PUT endpoint
                const updateResponse = await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...product,
                        stock: newStock
                    }),
                });

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    console.error(`Failed to update product ${product.id}:`, errorText);
                    throw new Error(`Failed to update stock for ${product.name}`);
                }
            }

            const result = await outgoingResponse.text();
            console.log('Move successful:', result);

            // ✅ Step 5: Update frontend state with new stock values
            const updatedProducts = products.map(product => {
                if (selectedItems.includes(product.id)) {
                    const quantityMoved = individualQuantities[product.id] || 1;
                    return {
                        ...product,
                        stock: product.stock - quantityMoved
                    };
                }
                return product;
            });

            setProducts(updatedProducts);
            setFilteredProducts(updatedProducts);

            resetSelections();
            setIsMoveToMenuOpen(false);

            const totalMoved = selectedItems.reduce((sum, id) => sum + (individualQuantities[id] || 1), 0);
            setSuccessMessage(`Successfully transferred ${totalMoved} item(s) to outgoing.`);
            setTimeout(() => setSuccessMessage(""), 4000);

        } catch (error) {
            console.error("Move to outgoing failed:", error);

            let userFriendlyError = error.message;
            if (error.message.includes('Failed to fetch')) {
                userFriendlyError = 'Cannot connect to server. Please check if backend is running.';
            } else if (error.message.includes('404')) {
                userFriendlyError = 'Server endpoint not found. Please check the API URL.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                userFriendlyError = 'Authentication failed. Please log in again.';
            }

            setMoveError(userFriendlyError);
        } finally {
            setMoveLoading(false);
        }
    };

    const resetSelections = () => {
        setSelectedLocation('');
        setSelectedItems([]);
        setSelectedItemDetails([]);
        setIndividualQuantities({});
        setRequestedBy('');
        setMovementDate('');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    // Get today's date for the date input max attribute
    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="mx-auto mt-10 w-96 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6">
                <h2 className="text-xl text-red-600 font-semibold mb-4">Error</h2>
                <p className="text-red-600">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Fixed Header with Burger Menu at TOP */}
            <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <SidebarWithBurgerMenu onToggle={() => {}} />
                        <h1 className="text-2xl font-bold text-gray-900">Inventory Transfer</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            Welcome, Admin
                        </div>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCircleIcon className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 mt-16">
                <div className="p-6 overflow-auto">
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                            <div className="text-green-600 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {successMessage}
                            </div>
                        </div>
                    )}

                    {moveError && (
                        <div className="mb-6 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                            <div className="text-red-600 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {moveError}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div className="flex-1 w-full sm:max-w-md">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search products by name, code, or description..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            >
                                                <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="font-medium">{filteredProducts.length}</span>
                                    <span>products found</span>
                                    {searchQuery && (
                                        <span className="text-blue-600">(filtered)</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Products Section */}
                        <div className="overflow-hidden border border-gray-200 shadow-sm bg-white rounded-lg">
                            <div className="p-4 bg-gray-50 border-b">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="checkbox"
                                            checked={selectedItems.length === filteredProducts.length && filteredProducts.length > 0}
                                            onChange={toggleAllProducts}
                                            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">Products ({filteredProducts.length})</h2>
                                            {searchQuery && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Showing results for: "{searchQuery}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {selectedItems.length} selected
                                    </span>
                                </div>
                            </div>
                            <div className="p-0 overflow-x-auto">
                                {filteredProducts.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        {searchQuery ? 'No products found matching your search.' : 'No products found'}
                                    </div>
                                ) : (
                                    <table className="w-full min-w-max table-auto">
                                        <thead>
                                            <tr>
                                                <th className="border-b border-gray-200 bg-gray-50 p-4 w-10">
                                                    {/* Checkbox column */}
                                                </th>
                                                {["Name", "Code", "Description", "Brand", "Stock", "Product Type", "Entry Date"].map((head) => (
                                                    <th key={head} className="border-b border-gray-200 bg-gray-50 p-4">
                                                        <div className="text-sm font-semibold text-gray-700">
                                                            {head}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.map((product) => (
                                                <tr
                                                    key={product.id}
                                                    className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${
                                                        selectedItems.includes(product.id) ? 'bg-blue-50' : ''
                                                    }`}
                                                >
                                                    <td className="p-4 border-b border-gray-200" onClick={(e) => e.stopPropagation()}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={selectedItems.includes(product.id)}
                                                            onChange={() => toggleItemSelection(product.id)}
                                                            className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {product.name}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                        <div className="text-sm text-gray-700">
                                                            {product.code || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                        <div className="text-sm text-gray-700">
                                                            {product.description}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                        <div className="text-sm text-gray-700">
                                                            {product.userName}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                            product.stock > 10 ? 'bg-green-100 text-green-800' : 
                                                            product.stock > 0 ? 'bg-amber-100 text-amber-800' : 
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                            {product.stock}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                        <div className="text-sm text-gray-700">
                                                            {product.productType}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 border-b border-gray-200" onClick={() => toggleItemSelection(product.id)}>
                                                        <div className="text-sm text-gray-700">
                                                            {formatDate(product.entryDate)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Move Button */}
                    {selectedItems.length > 0 && (
                        <div className="fixed bottom-8 right-8 z-10">
                            <button
                                className="rounded-full px-6 py-5 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 text-lg font-semibold"
                                onClick={() => setIsMoveToMenuOpen(true)}
                            >
                                <TruckIcon className="h-5 w-5" />
                                <span>Transfer {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}</span>
                            </button>
                        </div>
                    )}

                    {/* Enhanced Move Dialog */}
                    {isMoveToMenuOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
                                <div className="border-b border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <TruckIcon className="h-6 w-6 text-blue-500" />
                                            <h3 className="text-xl font-semibold text-gray-900">Transfer Inventory</h3>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6 overflow-y-auto max-h-[60vh]">
                                    <div className="mb-6">
                                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                            Selected Items ({selectedItems.length})
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            {selectedItemDetails.map((item, index) => (
                                                <div key={index} className="py-3 px-4 border-b border-gray-100 last:border-0 hover:bg-gray-100/50 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="text-sm font-semibold">
                                                                {item.name}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                {item.code} • {item.productType}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4 ml-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-600">Qty:</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={item.stock}
                                                                    value={individualQuantities[item.id] || 1}
                                                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                                                    className="w-20 p-1 border border-gray-300 rounded text-sm text-center"
                                                                />
                                                                <span className="text-xs text-gray-500">
                                                                    Max: {item.stock}
                                                                </span>
                                                            </div>
                                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                                item.stock > 10 ? 'bg-green-100 text-green-800' : 
                                                                item.stock > 0 ? 'bg-amber-100 text-amber-800' : 
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                Stock: {item.stock}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        Brand: {item.userName}
                                                    </div>
                                                    <div className="text-xs text-blue-600 mt-1">
                                                        Will transfer {individualQuantities[item.id] || 1} item(s), leaving {item.stock - (individualQuantities[item.id] || 1)} in stock
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                Destination Location
                                            </h4>
                                            <select
                                                value={selectedLocation}
                                                onChange={(e) => setSelectedLocation(e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                            >
                                                <option value="">Select destination</option>
                                                {locations.map((location) => (
                                                    <option key={location} value={location}>
                                                        {location.replace('_', ' ')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                Requested By
                                            </h4>
                                            <input
                                                type="text"
                                                value={requestedBy}
                                                onChange={(e) => setRequestedBy(e.target.value)}
                                                placeholder="Enter requester name"
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                            />
                                        </div>

                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                                Movement Date
                                            </h4>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    value={movementDate}
                                                    onChange={(e) => setMovementDate(e.target.value)}
                                                    max={getTodayDate()}
                                                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                                />
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Leave empty to use current date and time
                                            </p>
                                        </div>
                                    </div>

                                    {moveError && (
                                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                                            <div className="text-red-600 text-sm flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {moveError}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-between p-6 border-t border-gray-200">
                                    <button
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mr-2"
                                        onClick={() => {
                                            setIsMoveToMenuOpen(false);
                                            setIndividualQuantities({});
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={moveItemsToOutgoing}
                                        disabled={moveLoading || !selectedLocation || !requestedBy}
                                    >
                                        {moveLoading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Processing Transfer...
                                            </>
                                        ) : (
                                            <>
                                                <TruckIcon className="h-4 w-4" />
                                                Confirm Transfer
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Received;