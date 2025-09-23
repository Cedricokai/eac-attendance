import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Select,
  Option,
  Textarea,
  Spinner,
  Checkbox
} from "@material-tailwind/react";
import {
  HomeIcon,
  ClockIcon,
  ArrowRightIcon,
  TruckIcon,
  CubeIcon,
  ArchiveBoxIcon,
  UserCircleIcon
} from "@heroicons/react/24/solid";

const Received = () => {
    // Data states
    const [products, setProducts] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Selection states
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectedItemDetails, setSelectedItemDetails] = useState([]);
    
    // Move dialog states
    const [isMoveToMenuOpen, setIsMoveToMenuOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [numberToMove, setNumberToMove] = useState(1);
    const [moveLoading, setMoveLoading] = useState(false);
    const [moveError, setMoveError] = useState(null);
    const [requestedBy, setRequestedBy] = useState('');
    
    const locations = ['AHAFO_NORTH', 'SITE SERVICES', 'LAYDOWN', 'MKV', 'SUG', 'PROCESS PLANT', 'AROPLANT'];
    const navigate = useNavigate();

    // Fetch Products and Assets
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('jwtToken');
            try {
                const [productsResponse, assetsResponse] = await Promise.all([
                    fetch('http://localhost:8080/api/products', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        }
                    }),
                    fetch('http://localhost:8080/api/assets', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        }
                    })
                ]);

                if (!productsResponse.ok || !assetsResponse.ok) {
                    throw new Error('Failed to fetch data from the server.');
                }

                const productsData = await productsResponse.json();
                const assetsData = await assetsResponse.json();

                setProducts(productsData);
                setAssets(assetsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Selection handler
    const toggleItemSelection = (itemId) => {
        setSelectedItems((prevSelected) => {
            const isSelected = prevSelected.includes(itemId);
            const newSelected = isSelected
                ? prevSelected.filter((id) => id !== itemId)
                : [...prevSelected, itemId];
        
            // Update details
            const updatedDetails = newSelected.map((id) => {
                const product = products.find((p) => p.id === id);
                const asset = assets.find((a) => a.id === id);
                
                if (product || asset) {
                    return {
                        id: product?.id || asset?.id,
                        name: product?.name || asset?.name || '',
                        code: product?.code || asset?.code || '',
                        description: product?.description || asset?.description || '',
                        stock: product?.stock || asset?.stock || 0,
                        userName: product?.userName || asset?.userName || '',
                        productType: product?.productType || asset?.productType || '',
                        phoneNumber: product?.phoneNumber || asset?.phoneNumber || ''
                    };
                }
                return null;
            }).filter(Boolean);
    
            setSelectedItemDetails(updatedDetails);
            return newSelected;
        });
    };

    const toggleAllProducts = () => {
        if (selectedItems.length === products.length) {
            setSelectedItems([]);
            setSelectedItemDetails([]);
        } else {
            setSelectedItems(products.map(p => p.id));
            setSelectedItemDetails(products.map(p => ({
                id: p.id,
                name: p.name,
                code: p.code,
                description: p.description,
                stock: p.stock,
                userName: p.userName,
                productType: p.productType,
                phoneNumber: p.phoneNumber
            })));
        }
    };

    const toggleAllAssets = () => {
        if (selectedItems.length === assets.length) {
            setSelectedItems([]);
            setSelectedItemDetails([]);
        } else {
            setSelectedItems(assets.map(a => a.id));
            setSelectedItemDetails(assets.map(a => ({
                id: a.id,
                name: a.name,
                code: a.code,
                description: a.description,
                stock: a.stock,
                userName: a.userName,
                productType: a.productType,
                phoneNumber: a.phoneNumber
            })));
        }
    };

    // Move items to outgoing
    const moveItemsToOutgoing = async () => {
        setMoveLoading(true);
        setMoveError(null);
    
        // Validate requestedBy
        if (!requestedBy) {
            setMoveError('Please enter the requester name.');
            setMoveLoading(false);
            return;
        }
    
        try {
            const token = localStorage.getItem('jwtToken');
    
            // Validate stock before moving
            for (let selectedId of selectedItems) {
                const selectedItem = [...products, ...assets].find(item => item.id === selectedId);
                if (!selectedItem) {
                    setMoveError(`Item with ID ${selectedId} not found.`);
                    setMoveLoading(false);
                    return;
                }
    
                if (numberToMove > selectedItem.stock) {
                    setMoveError(`Cannot move more than available stock (${selectedItem.stock}).`);
                    setMoveLoading(false);
                    return;
                }
            }
    
            // Prepare outgoing items
            const outgoingItems = selectedItems.map(itemId => {
                const selectedItem = [...products, ...assets].find(item => item.id === itemId);
                return {
                    name: selectedItem.name,
                    code: selectedItem.code,
                    stock: numberToMove,
                    userName: selectedItem.userName,
                    description: selectedItem.description,
                    location: selectedLocation,
                    productId: selectedItem.id,
                    requestedBy: requestedBy,
                    isProduct: products.some(p => p.id === itemId)
                };
            });
    
            // Step 1: Insert into Outgoing Table
            const outgoingResponse = await fetch('http://localhost:8080/api/outgoing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(outgoingItems),
            });
    
            if (!outgoingResponse.ok) {
                throw new Error('Failed to move items to the outgoing database.');
            }
    
            // Step 2: Update Stock in respective tables
            for (let selectedId of selectedItems) {
                const selectedItem = [...products, ...assets].find(item => item.id === selectedId);
                const newStock = selectedItem.stock - numberToMove;
                
                const endpoint = products.some(p => p.id === selectedId) 
                    ? 'http://localhost:8080/api/products/update-stock' 
                    : 'http://localhost:8080/api/assets/update-stock';
                
                const updateStockResponse = await fetch(endpoint, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        productId: selectedId,
                        newStock: newStock
                    }),
                });
    
                if (!updateStockResponse.ok) {
                    throw new Error('Failed to update stock in the database.');
                }
            }
    
            // Update UI with new stock values
            setProducts(prevProducts =>
                prevProducts.map(p =>
                    selectedItems.includes(p.id) ? { ...p, stock: p.stock - numberToMove } : p
                )
            );
            
            setAssets(prevAssets =>
                prevAssets.map(a =>
                    selectedItems.includes(a.id) ? { ...a, stock: a.stock - numberToMove } : a
                )
            );
    
            resetSelections();
            setIsMoveToMenuOpen(false);
        } catch (error) {
            setMoveError(error.message);
        } finally {
            setMoveLoading(false);
        }
    };
    
    const resetSelections = () => {
        setSelectedLocation('');
        setNumberToMove(1);
        setSelectedItems([]);
        setSelectedItemDetails([]);
        setRequestedBy('');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <Spinner className="h-12 w-12" />
        </div>
    );

    if (error) return (
        <Card className="mx-auto mt-10 w-96">
            <CardBody>
                <Typography variant="h5" color="red" className="mb-4">
                    Error
                </Typography>
                <Typography color="red">{error}</Typography>
            </CardBody>
        </Card>
    );

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Enhanced Sidebar */}
            <div className="w-64 bg-gradient-to-b from-blue-800 to-blue-900 shadow-xl text-white transition-all duration-300">
                <div className="p-6 border-b border-blue-700 flex items-center gap-3">
                    <CubeIcon className="h-7 w-7 text-blue-300" />
                    <Typography variant="h5" className="font-bold">
                        StockFlow
                    </Typography>
                </div>
                <nav className="p-4">
                    <ul className="space-y-1">
                        <li>
                            <Button
                                variant="text"
                                color="white"
                                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors"
                                onClick={() => navigate('/MasterPage')}
                            >
                                <HomeIcon className="h-5 w-5" />
                                <span className="font-medium">Dashboard</span>
                            </Button>
                        </li>
                        <li>
                            <Button
                                variant="text"
                                color="white"
                                className="flex items-center gap-3 w-full justify-start hover:bg-blue-700/50 rounded-lg p-3 transition-colors"
                                onClick={() => navigate('/History')}
                            >
                                <ClockIcon className="h-5 w-5" />
                                <span className="font-medium">History</span>
                            </Button>
                        </li>
                        <li>
                            <Button
                                variant="text"
                                color="white"
                                className="flex items-center gap-3 w-full justify-start bg-blue-700/30 rounded-lg p-3 transition-colors"
                            >
                                <ArchiveBoxIcon className="h-5 w-5" />
                                <span className="font-medium">Inventory</span>
                            </Button>
                        </li>
                    </ul>
                </nav>
                <div className="absolute bottom-0 w-full p-4 border-t border-blue-700 bg-blue-800/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <UserCircleIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <Typography variant="small" className="font-semibold">Admin User</Typography>
                            <Typography variant="small" className="text-blue-300">admin@stockflow.com</Typography>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-auto">
                {moveError && (
                    <div className="mb-6 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                        <Typography color="red" className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {moveError}
                        </Typography>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Products Section */}
                    <Card className="overflow-hidden border border-gray-200 shadow-sm">
                        <CardHeader floated={false} shadow={false} className="p-4 bg-gray-50 border-b">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <Checkbox 
                                        checked={selectedItems.length === products.length && products.length > 0}
                                        indeterminate={selectedItems.length > 0 && selectedItems.length < products.length}
                                        onChange={toggleAllProducts}
                                        color="blue"
                                    />
                                    <Typography variant="h5" color="blue-gray">
                                        Products
                                    </Typography>
                                </div>
                                <Chip
                                    value={`${selectedItems.filter(id => products.some(p => p.id === id)).length} selected`}
                                    color="blue"
                                    className="rounded-full"
                                />
                            </div>
                        </CardHeader>
                        <CardBody className="p-0 overflow-x-auto">
                            <table className="w-full min-w-max table-auto">
                                <thead>
                                    <tr>
                                        <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4 w-10">
                                            {/* Checkbox column */}
                                        </th>
                                        {["Name", "Code", "Description", "Brand", "Stock", "Product Type", "Entry Date"].map((head) => (
                                            <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                                                <Typography variant="small" color="blue-gray" className="font-semibold leading-none">
                                                    {head}
                                                </Typography>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr
                                            key={product.id}
                                            className={`hover:bg-blue-gray-50/50 cursor-pointer transition-colors ${
                                                selectedItems.includes(product.id) ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <td className="p-4 border-b border-blue-gray-50" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={selectedItems.includes(product.id)}
                                                    onChange={() => toggleItemSelection(product.id)}
                                                    color="blue"
                                                />
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(product.id)}>
                                                <Typography variant="small" color="blue-gray" className="font-medium">
                                                    {product.name}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(product.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    P0{product.id}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(product.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    {product.description}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(product.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    {product.userName}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(product.id)}>
                                                <Chip
                                                    value={product.stock}
                                                    color={product.stock > 10 ? 'green' : product.stock > 0 ? 'amber' : 'red'}
                                                    className="rounded-full w-min"
                                                />
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(product.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    {product.productType}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(product.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    {formatDate(product.createdDate)}
                                                </Typography>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardBody>
                    </Card>

                    {/* Assets Section */}
                    <Card className="overflow-hidden border border-gray-200 shadow-sm">
                        <CardHeader floated={false} shadow={false} className="p-4 bg-gray-50 border-b">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <Checkbox 
                                        checked={selectedItems.length === assets.length && assets.length > 0}
                                        indeterminate={selectedItems.length > 0 && selectedItems.length < assets.length}
                                        onChange={toggleAllAssets}
                                        color="blue"
                                    />
                                    <Typography variant="h5" color="blue-gray">
                                        Assets
                                    </Typography>
                                </div>
                                <Chip
                                    value={`${selectedItems.filter(id => assets.some(a => a.id === id)).length} selected`}
                                    color="blue"
                                    className="rounded-full"
                                />
                            </div>
                        </CardHeader>
                        <CardBody className="p-0 overflow-x-auto">
                            <table className="w-full min-w-max table-auto">
                                <thead>
                                    <tr>
                                        <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4 w-10">
                                            {/* Checkbox column */}
                                        </th>
                                        {["Name", "Code", "Description", "Brand", "Stock", "Product Type", "Entry Date"].map((head) => (
                                            <th key={head} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">
                                                <Typography variant="small" color="blue-gray" className="font-semibold leading-none">
                                                    {head}
                                                </Typography>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.map((asset) => (
                                        <tr
                                            key={asset.id}
                                            className={`hover:bg-blue-gray-50/50 cursor-pointer transition-colors ${
                                                selectedItems.includes(asset.id) ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <td className="p-4 border-b border-blue-gray-50" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={selectedItems.includes(asset.id)}
                                                    onChange={() => toggleItemSelection(asset.id)}
                                                    color="blue"
                                                />
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(asset.id)}>
                                                <Typography variant="small" color="blue-gray" className="font-medium">
                                                    {asset.name}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(asset.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    A0{asset.id}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(asset.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    {asset.description}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(asset.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    {asset.userName}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(asset.id)}>
                                                <Chip
                                                    value={asset.stock}
                                                    color={asset.stock > 10 ? 'green' : asset.stock > 0 ? 'amber' : 'red'}
                                                    className="rounded-full w-min"
                                                />
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(asset.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    {asset.productType}
                                                </Typography>
                                            </td>
                                            <td className="p-4 border-b border-blue-gray-50" onClick={() => toggleItemSelection(asset.id)}>
                                                <Typography variant="small" color="blue-gray">
                                                    {formatDate(asset.createdDate)}
                                                </Typography>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardBody>
                    </Card>
                </div>

                {/* Enhanced Move Button */}
                {selectedItems.length > 0 && (
                    <div className="fixed bottom-8 right-8 z-10">
                        <Button
                            size="lg"
                            color="green"
                            className="rounded-full px-6 py-5 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                            onClick={() => setIsMoveToMenuOpen(true)}
                        >
                            <TruckIcon className="h-5 w-5" />
                            <span className="font-semibold">Transfer {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}</span>
                            <ArrowRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Enhanced Move Dialog */}
                <Dialog 
                    open={isMoveToMenuOpen} 
                    handler={() => setIsMoveToMenuOpen(false)}
                    size="lg"
                >
                    <DialogHeader className="border-b border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <TruckIcon className="h-6 w-6 text-blue-500" />
                            <Typography variant="h5" color="blue-gray">
                                Transfer Inventory
                            </Typography>
                        </div>
                    </DialogHeader>
                    <DialogBody className="p-6">
                        <div className="mb-6">
                            <Typography variant="h6" color="blue-gray" className="mb-3">
                                Selected Items ({selectedItems.length})
                            </Typography>
                            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto border border-gray-200">
                                {selectedItemDetails.map((item, index) => (
                                    <div key={index} className="py-3 px-4 border-b border-gray-100 last:border-0 hover:bg-gray-100/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Typography variant="small" className="font-semibold">
                                                    {item.name}
                                                </Typography>
                                                <Typography variant="small" color="blue-gray" className="text-sm">
                                                    {item.code} • {item.productType}
                                                </Typography>
                                            </div>
                                            <Chip
                                                value={`Stock: ${item.stock}`}
                                                color={item.stock > 10 ? 'green' : item.stock > 0 ? 'amber' : 'red'}
                                                className="rounded-full"
                                            />
                                        </div>
                                        <Typography variant="small" color="blue-gray" className="mt-1">
                                            Brand: {item.userName}
                                        </Typography>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Typography variant="h6" color="blue-gray" className="mb-3">
                                    Destination Location
                                </Typography>
                                <Select
                                    label="Select destination"
                                    value={selectedLocation}
                                    onChange={(value) => setSelectedLocation(value)}
                                    className="bg-gray-50"
                                    labelProps={{ className: "text-gray-700" }}
                                >
                                    {locations.map((location) => (
                                        <Option 
                                            key={location} 
                                            value={location}
                                            className="hover:bg-blue-50"
                                        >
                                            {location.replace('_', ' ')}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <Typography variant="h6" color="blue-gray" className="mb-3">
                                    Transfer Quantity
                                </Typography>
                                <Input
                                    type="number"
                                    label="Number of items to transfer"
                                    min="1"
                                    max={Math.min(...selectedItemDetails.map(item => item.stock))}
                                    value={numberToMove}
                                    onChange={(e) => setNumberToMove(Number(e.target.value))}
                                    className="bg-gray-50"
                                    labelProps={{ className: "text-gray-700" }}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <Typography variant="h6" color="blue-gray" className="mb-3">
                                Requested By
                            </Typography>
                            <Input
                                type="text"
                                label="Enter requester name"
                                value={requestedBy}
                                onChange={(e) => setRequestedBy(e.target.value)}
                                className="bg-gray-50"
                                labelProps={{ className: "text-gray-700" }}
                            />
                        </div>

                        {moveError && (
                            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                                <Typography color="red" variant="small" className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {moveError}
                                </Typography>
                            </div>
                        )}
                    </DialogBody>
                    <DialogFooter className="flex justify-between p-6 border-t border-gray-200">
                        <Button
                            variant="outlined"
                            color="gray"
                            onClick={() => setIsMoveToMenuOpen(false)}
                            className="mr-2"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="gradient"
                            color="green"
                            onClick={moveItemsToOutgoing}
                            disabled={moveLoading || !selectedLocation || !requestedBy}
                            className="flex items-center gap-2"
                        >
                            {moveLoading ? (
                                <>
                                    <Spinner className="h-4 w-4" />
                                    Processing Transfer...
                                </>
                            ) : (
                                <>
                                    <TruckIcon className="h-4 w-4" />
                                    Confirm Transfer
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </Dialog>
            </div>
        </div>
    );
};

export default Received;