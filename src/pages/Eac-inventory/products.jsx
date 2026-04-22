import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PencilIcon,
  TrashIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  UserCircleIcon,
  HomeIcon,
  ArrowPathIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  CalendarIcon,
  BellIcon,
  ShoppingCartIcon,
  BellAlertIcon
} from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';
import { toast } from 'react-toastify';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [inputError, setInputError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectionMode, setSelectionMode] = useState('multiple');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    purchaseOrderId: '',
    itemId: '',
    goodQuantity: 0,
    damagedQuantity: 0,
    receivedBy: '',
    notes: ''
  });
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isViewPurchaseOrderModalOpen, setIsViewPurchaseOrderModalOpen] = useState(false);

  // Add new state for active tab
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'purchase-orders'
  const [productView, setProductView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseOrderSearchTerm, setPurchaseOrderSearchTerm] = useState('');

  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: '',
    adjustmentType: 'add',
    reason: '',
    notes: '',
    oldStock: 0,
    newStock: 0
  });

  const [updatedProduct, setUpdatedProduct] = useState({
    name: '',
    description: '',
    stock: '',
    userName: '',
    productType: '',
    entryDate: '',
    ppe: false,
    kitchenStore: false,
    returnableAfterUse: false,
    unitCost: '',
    shelfNumber: ''
  });
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    stock: '',
    userName: '',
    productType: '',
    entryDate: new Date().toISOString().split('T')[0],
    ppe: false,
    kitchenStore: false,
    returnableAfterUse: false,
    unitCost: '',
    shelfNumber: ''
  });

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://localhost:8080";
    }

    if (hostname === "100.114.178.13") {
      return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
    }

    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
  };

  const API_BASE_URL = getApiBaseUrl();
  const navigate = useNavigate();

  const getAuthToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const getUserName = () => {
    return localStorage.getItem('username') || 'Store User';
  };

  const getUserEmail = () => {
    return localStorage.getItem('userEmail') || 'unknown@user.com';
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please login again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const productsData = await response.json();
      setProducts(productsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrdersForStore = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/purchase-orders/for-store`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchPurchaseOrdersForStore();
  }, []);

  useEffect(() => {
    let filtered = products;

    if (productView === 'ppes') {
      filtered = filtered.filter(product => product.ppe === true);
    } else if (productView === 'products') {
      filtered = filtered.filter(product => !product.ppe || product.ppe === false);
    } else if (productView === 'kitchenStore') {
      filtered = filtered.filter(product => product.kitchenStore === true);
    } else if (productView === 'returnable') {
      filtered = filtered.filter(product => product.returnableAfterUse === true);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.userName?.toLowerCase().includes(term) ||
        product.productType?.toLowerCase().includes(term) ||
        product.code?.toLowerCase().includes(term) ||
        (product.unitCost?.toString() || '').toLowerCase().includes(term)
      );
    }

    setFilteredProducts(filtered);
  }, [products, productView, searchTerm]);

  const filteredPurchaseOrders = purchaseOrders.filter(order => {
    if (!purchaseOrderSearchTerm) return true;
    const term = purchaseOrderSearchTerm.toLowerCase();
    return (
      order.purchaseOrderNumber?.toLowerCase().includes(term) ||
      order.items?.some(item => 
        item.productName?.toLowerCase().includes(term) ||
        item.productCode?.toLowerCase().includes(term)
      )
    );
  });

  const handleExportCSV = () => {
    const productsToExport = productView === 'all' ? products : filteredProducts;
    
    if (productsToExport.length === 0) {
      setError("No products to export");
      return;
    }

    const headers = [
      "Name",
      "Code",
      "Description",
      "Brand",
      "Type",
      "Stock",
      "Entry Date",
      "PPE",
      "Kitchen Store",
      "Returnable After Use",
      "Unit Cost"
    ];

    const rows = productsToExport.map(product => [
      product.name || '',
      product.code || '',
      product.description || '',
      product.userName || '',
      product.productType || '',
      product.stock || 0,
      formatDate(product.entryDate || product.createdDate) || '',
      product.ppe ? 'Yes' : 'No',
      product.kitchenStore ? 'Yes' : 'No',
      product.returnableAfterUse ? 'Yes' : 'No',
      product.unitCost || 0
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${productView}-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccessMessage(`Products exported successfully!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportData([]);
    setError('');
    setImportFileName(file.name);
    
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/)) {
      setError("Please select a valid CSV or Excel file");
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd'
        });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false,
          defval: ''
        });
        
        if (jsonData.length < 2) {
          setError("CSV file doesn't contain enough data");
          return;
        }
        
        const headers = jsonData[0].map(header => 
          header.toString().toLowerCase().replace(/\s+/g, '')
        );
        
        const processedData = jsonData.slice(1).map((row, index) => {
          const obj = {};
          headers.forEach((header, colIndex) => {
            obj[header] = row[colIndex];
            const originalHeader = jsonData[0][colIndex];
            obj[originalHeader] = row[colIndex];
          });
          return obj;
        }).filter(row => Object.values(row).some(val => val !== ''));
        
        setImportData(processedData);
        setIsImportModalOpen(true);
        
      } catch (err) {
        setError(`Error reading file: ${err.message}`);
      }
    };
    
    reader.onerror = () => {
      setError("Error reading file. Please try again.");
    };
    
    reader.readAsArrayBuffer(file);
    
    e.target.value = '';
  };

  const mapCSVToProducts = (csvData) => {
    return csvData.map((row, index) => {
      const name = row.name || row.productname || row.product || row['product name'] || '';
      const code = row.code || row.productcode || row.sku || row['product code'] || '';
      const description = row.description || row.desc || row['product description'] || '';
      const userName = row.brand || row.manufacturer || row.userName || row['brand name'] || '';
      const productType = row.type || row.category || row.producttype || row['product type'] || 'General';
      const stock = parseInt(row.stock || row.quantity || row.qty || row.inventory || 0);
      
      const unitCost = parseFloat(row.unitcost || row.cost || row.price || row['unit cost'] || row['unit price'] || 0);
      
      const ppe = row.ppe === 'true' || row.ppe === 'yes' || 
                  row.isppe === 'true' || row.isppe === 'yes' || 
                  row.ispersonalprotectiveequipment === 'true' || 
                  row['personal protective equipment'] === 'yes' || false;

      const kitchenStore = row.kitchenstore === 'true' || row.kitchenstore === 'yes' || 
                          row.kitchenStore === 'true' || row.kitchenStore === 'yes' ||
                          row['kitchen store'] === 'true' || row['kitchen store'] === 'yes' ||
                          row.iskitchenstore === 'true' || row.iskitchenstore === 'yes' || false;

      const returnableAfterUse = row.returnableafteruse === 'true' || row.returnableafteruse === 'yes' ||
                                row.returnable === 'true' || row.returnable === 'yes' ||
                                row['returnable after use'] === 'true' || row['returnable after use'] === 'yes' ||
                                row.mustbereturned === 'true' || row.mustbereturned === 'yes' ||
                                row.tool === 'true' || row.tool === 'yes' || false;
      
      let entryDate = new Date().toISOString().split('T')[0] + 'T00:00:00';
      if (row.entrydate || row.date || row.createddate) {
        const dateStr = row.entrydate || row.date || row.createddate;
        try {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            entryDate = parsedDate.toISOString().split('T')[0] + 'T00:00:00';
          }
        } catch (e) {
          console.warn('Invalid date format:', dateStr);
        }
      }

      return {
        name,
        code: code || undefined,
        description,
        userName,
        productType,
        stock: isNaN(stock) ? 0 : stock,
        unitCost: isNaN(unitCost) ? 0 : unitCost,
        entryDate,
        ppe: Boolean(ppe),
        kitchenStore: Boolean(kitchenStore),
        returnableAfterUse: Boolean(returnableAfterUse)
      };
    }).filter(product => product.name && product.name.trim() !== '');
  };

  const handleImportProducts = async () => {
    if (importData.length === 0) {
      setError("No valid data to import");
      return;
    }

    const productsToImport = mapCSVToProducts(importData);
    
    if (productsToImport.length === 0) {
      setError("No valid products found in the file");
      return;
    }

    try {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      let successCount = 0;
      let errorCount = 0;

      for (const product of productsToImport) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(product),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      await fetchProducts();

      setSuccessMessage(`Import completed: ${successCount} successful, ${errorCount} failed`);
      setTimeout(() => setSuccessMessage(''), 5000);
      setIsImportModalOpen(false);
      setImportData([]);
      setImportFileName('');

    } catch (err) {
      setError(`Import failed: ${err.message}`);
    }
  };

  const ImportPreviewModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Import Preview: {importFileName}</h2>
          <button 
            onClick={() => setIsImportModalOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {importData.length > 0 && Object.keys(importData[0]).map((key) => (
                  <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {importData.slice(0, 10).map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
              {importData.length > 10 && (
                <tr>
                  <td colSpan={Object.keys(importData[0]).length} className="px-6 py-4 text-center text-sm text-gray-500">
                    Showing 10 of {importData.length} rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Found {importData.length} rows, {mapCSVToProducts(importData).length} valid products
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImportProducts}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              Import {mapCSVToProducts(importData).length} Products
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    
    if (name === 'ppe' || name === 'kitchenStore' || name === 'returnableAfterUse') {
      setNewProduct(prev => ({ ...prev, [name]: checked }));
      setUpdatedProduct(prev => ({ ...prev, [name]: checked }));
    } else {
      setNewProduct(prev => ({ ...prev, [name]: inputValue }));
      setUpdatedProduct(prev => ({ ...prev, [name]: inputValue }));
    }
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);
  const toggleUpdateModal = () => setIsUpdateModalOpen(!isUpdateModalOpen);

  const toggleItemSelection = (productId) => {
    setSelectedItems(prevSelected => {
      if (selectionMode === 'single') {
        return prevSelected.includes(productId) ? [] : [productId];
      } else {
        return prevSelected.includes(productId)
          ? prevSelected.filter(id => id !== productId)
          : [...prevSelected, productId];
      }
    });
  };

  // FIX: Format date to ISO string with time component
  const formatDateForBackend = (dateString) => {
    if (!dateString) return new Date().toISOString();
    
    // If date is already in ISO format, return as-is
    if (dateString.includes('T')) {
      return dateString;
    }
    
    // If date is just YYYY-MM-DD, add time component
    return `${dateString}T00:00:00`;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
  
    if (!newProduct.name || !newProduct.description || !newProduct.stock || !newProduct.userName || !newProduct.productType) {
      setInputError('Please fill out all required fields.');
      return;
    }
  
    try {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // FIX: Format entryDate properly for backend
      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        stock: parseInt(newProduct.stock),
        userName: newProduct.userName,
        productType: newProduct.productType,
        entryDate: formatDateForBackend(newProduct.entryDate),
        ppe: Boolean(newProduct.ppe),
        kitchenStore: Boolean(newProduct.kitchenStore),
        returnableAfterUse: Boolean(newProduct.returnableAfterUse),
        unitCost: newProduct.unitCost ? parseFloat(newProduct.unitCost) : 0,
        shelfNumber : newProduct.shelfNumber
      };

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });
  
      if (!response.ok) {
        const errorResponse = await response.text();
        throw new Error(`Failed to create product: ${errorResponse}`);
      }
  
      const addedProduct = await response.json();
      setProducts(prev => [...prev, addedProduct]);
      
      setNewProduct({
        name: '',
        description: '',
        stock: '',
        userName: '',
        productType: '',
        entryDate: new Date().toISOString().split('T')[0],
        ppe: false,
        kitchenStore: false,
        returnableAfterUse: false,
        unitCost: '',
        shelfNumber: ''
      });
      
      setSuccessMessage('Product added successfully!');
      setInputError('');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();

    if (!updatedProduct.name || !updatedProduct.description || !updatedProduct.stock) {
      setInputError('Please fill out all required fields.');
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setError('Authentication token not found');
      return;
    }

    try {
      // FIX: Format entryDate properly for backend
      const updateData = {
        name: updatedProduct.name,
        description: updatedProduct.description,
        stock: parseInt(updatedProduct.stock),
        userName: updatedProduct.userName,
        productType: updatedProduct.productType,
        ppe: Boolean(updatedProduct.ppe),
        kitchenStore: Boolean(updatedProduct.kitchenStore),
        returnableAfterUse: Boolean(updatedProduct.returnableAfterUse),
        unitCost: updatedProduct.unitCost ? parseFloat(updatedProduct.unitCost) : 0,
        entryDate: formatDateForBackend(updatedProduct.entryDate),
        shelfNumber: updatedProduct.shelfNumber
      };

      const response = await fetch(`${API_BASE_URL}/api/products/${currentProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorResponse = await response.text();
        throw new Error(`Failed to update product: ${errorResponse}`);
      }

      await fetchProducts();
      
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleUpdateModal();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const deleteProduct = async (id) => {
    const token = getAuthToken();
    
    if (!token) {
      setError('Authentication token not found');
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;
  
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Failed to delete product');
      }
  
      setProducts(prevProducts => prevProducts.filter(product => product.id !== id));
      setSuccessMessage('Product deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`Error deleting product: ${err.message}`);
    }
  };
  
  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    
    // FIX: Extract just the date part for the input field
    let entryDateValue = '';
    if (product.entryDate) {
      const date = new Date(product.entryDate);
      if (!isNaN(date.getTime())) {
        entryDateValue = date.toISOString().split('T')[0];
      }
    }
    
    setUpdatedProduct({
      name: product.name,
      description: product.description,
      stock: product.stock,
      userName: product.userName,
      productType: product.productType,
      entryDate: entryDateValue,
      ppe: product.ppe || false,
      kitchenStore: product.kitchenStore || false,
      returnableAfterUse: product.returnableAfterUse || false,
      unitCost: product.unitCost || '',
      shelfNumber: product.shelfNumber
    });
    toggleUpdateModal();
  };

  const openStockModal = (product, adjustmentType = 'add') => {
    setCurrentProduct(product);
    setStockAdjustment({
      quantity: '',
      adjustmentType: adjustmentType,
      reason: '',
      notes: '',
      oldStock: product.stock || 0,
      newStock: product.stock || 0
    });
    setIsStockModalOpen(true);
    setError('');
  };

  const handleStockAdjustmentChange = (e) => {
    const { name, value } = e.target;
    setStockAdjustment(prev => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'quantity') {
        const quantity = parseInt(value) || 0;
        if (prev.adjustmentType === 'add') {
          updated.newStock = prev.oldStock + quantity;
        } else if (prev.adjustmentType === 'remove') {
          updated.newStock = Math.max(0, prev.oldStock - quantity);
        }
      } else if (name === 'adjustmentType') {
        const quantity = parseInt(prev.quantity) || 0;
        if (value === 'add') {
          updated.newStock = prev.oldStock + quantity;
        } else if (value === 'remove') {
          updated.newStock = Math.max(0, prev.oldStock - quantity);
        }
      }
      
      return updated;
    });
  };

  const handleAdjustStock = async () => {
    if (!stockAdjustment.quantity || parseInt(stockAdjustment.quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (stockAdjustment.adjustmentType === 'remove' && 
        parseInt(stockAdjustment.quantity) > stockAdjustment.oldStock) {
      setError('Cannot remove more stock than available');
      return;
    }

    if (!stockAdjustment.reason) {
      setError('Please select a reason for the adjustment');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const adjustmentRequest = {
        productId: currentProduct.id,
        productName: currentProduct.name,
        oldStock: stockAdjustment.oldStock,
        newStock: stockAdjustment.newStock,
        quantity: parseInt(stockAdjustment.quantity),
        adjustmentType: stockAdjustment.adjustmentType.toUpperCase(),
        reason: stockAdjustment.reason,
        notes: stockAdjustment.notes || '',
        userEmail: getUserEmail()
      };

      const response = await fetch(`${API_BASE_URL}/api/stock/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(adjustmentRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to adjust stock: ${errorText}`);
      }

      await fetchProducts();

      setSuccessMessage(
        `Stock ${stockAdjustment.adjustmentType === 'add' ? 'added' : 'removed'} successfully! ` +
        `Old: ${stockAdjustment.oldStock}, New: ${stockAdjustment.newStock}`
      );

      setTimeout(() => setSuccessMessage(''), 5000);
      setIsStockModalOpen(false);
      setStockAdjustment({
        quantity: '',
        adjustmentType: 'add',
        reason: '',
        notes: '',
        oldStock: 0,
        newStock: 0
      });

    } catch (err) {
      setError(err.message);
    }
  };

  const viewStockHistory = async (productId) => {
    navigate(`/history?productId=${productId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount || 0);
  };

  const getProductCounts = () => {
    const allCount = products.length;
    const ppesCount = products.filter(p => p.ppe === true).length;
    const kitchenStoreCount = products.filter(k => k.kitchenStore === true).length;
    const returnableCount = products.filter(r => r.returnableAfterUse === true).length;
    const regularCount = products.filter(p => 
      (!p.ppe || p.ppe === false) && 
      (!p.kitchenStore || p.kitchenStore === false) &&
      (!p.returnableAfterUse || p.returnableAfterUse === false)
    ).length;
    
    return { allCount, ppesCount, kitchenStoreCount, returnableCount, regularCount };
  };

  const getPendingReceiptsCount = () => {
    return purchaseOrders.filter(order => 
      order.status === 'DELIVERED' && 
      order.items?.some(item => item.quantity > (item.receivedQuantity || 0))
    ).length;
  };

  // Add function to get pending notification count
  const getPendingNotificationCount = () => {
    return purchaseOrders.filter(order => 
      !order.storeNotified && 
      (order.status === 'ORDERED' || order.status === 'DELIVERED')
    ).length;
  };

  // Add function to get pending add to inventory count
  const getPendingAddToInventoryCount = () => {
    return purchaseOrders.flatMap(order => 
      order.items.filter(item => 
        (item.status === 'DELIVERED' || item.status === 'RECEIVED') &&
        (item.quantity > (item.receivedQuantity || 0) || item.isNewProduct)
      )
    ).length;
  };

  const handleSaveProductToInventory = async (order, item) => {
    try {
      const token = getAuthToken();
      const isNewProduct = item.isNewProduct || !item.productId;
      const pendingQuantity = item.quantity - (item.receivedQuantity || 0);
      
      if (isNewProduct) {
        const productData = {
          name: item.productName,
          code: item.productCode || `PO-${order.purchaseOrderNumber}-${item.id}`,
          description: item.description || `From purchase order ${order.purchaseOrderNumber}`,
          stock: pendingQuantity,
          unitCost: item.unitPrice || 0,
          productType: item.productType || 'GENERAL',
          ppe: item.ppe || false,
          kitchenStore: item.kitchenTools || false,
          returnableAfterUse: item.returnableAfterUse || false,
          entryDate: new Date().toISOString(),
          userName: getUserName()
        };

        const productResponse = await fetch(`${API_BASE_URL}/api/products`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });

        if (productResponse.ok) {
          const createdProduct = await productResponse.json();
          
          await updatePurchaseOrderItem(order.id, item.id, pendingQuantity);
          
          toast.success('Product created and added to inventory!');
          fetchProducts();
          fetchPurchaseOrdersForStore();
        }
      } else {
        const updateResponse = await fetch(`${API_BASE_URL}/api/stock/adjust`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId: item.productId,
            quantity: pendingQuantity,
            adjustmentType: 'ADD',
            reason: 'PURCHASE_ORDER_RECEIPT',
            notes: `Added from purchase order ${order.purchaseOrderNumber}`
          })
        });

        if (updateResponse.ok) {
          await updatePurchaseOrderItem(order.id, item.id, pendingQuantity);
          
          toast.success('Stock added to existing product!');
          fetchProducts();
          fetchPurchaseOrdersForStore();
        }
      }
    } catch (err) {
      toast.error(`Error saving product: ${err.message}`);
    }
  };

  const updatePurchaseOrderItem = async (orderId, itemId, quantity) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/api/purchase-orders/${orderId}/receive/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receivedQuantity: quantity,
          receivedBy: getUserName()
        })
      });
      return response.ok;
    } catch (err) {
      console.error('Error updating purchase order item:', err);
      return false;
    }
  };

  const viewPurchaseOrderItemDetails = (order, item) => {
    setSelectedPurchaseOrder(order);
    setSelectedItem(item);
    setIsViewPurchaseOrderModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ORDERED': return 'bg-blue-100 text-blue-800';
      case 'DELIVERED': return 'bg-purple-100 text-purple-800';
      case 'RECEIVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const viewPurchaseOrderDetails = (order) => {
    setSelectedPurchaseOrder(order);
    setIsViewPurchaseOrderModalOpen(true);
  };

  const counts = getProductCounts();

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="ml-4 text-lg text-gray-600">Loading products...</div>
    </div>
  );

  if (error && !loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="max-w-md p-6 bg-red-50 border border-red-400 text-red-700 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-2">Error Loading Products</h2>
        <p className="mb-4">{error}</p>
        <div className="flex space-x-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex items-center gap-4">
        <SidebarWithBurgerMenu onToggle={() => {}} />
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <UserCircleIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="text-2xl lg:text-3xl text-gray-900">Product Inventory</h3>
              <p className="text-sm text-gray-600">Manage all products, PPE items, kitchen store items, and returnable tools</p>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  name="selectionMode"
                  checked={selectionMode === 'single'}
                  onChange={() => {
                    setSelectionMode('single');
                    setSelectedItems([]);
                  }}
                  className="mr-2"
                />
                <span>Single Select</span>
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  name="selectionMode"
                  checked={selectionMode === 'multiple'}
                  onChange={() => setSelectionMode('multiple')}
                  className="mr-2"
                />
                <span>Multi Select</span>
              </label>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm">
                <ArrowUpTrayIcon className="h-4 w-4" />
                <span>Import CSV</span>
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
              
              <button 
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                onClick={handleExportCSV}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
              
              <button 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors text-sm"
                onClick={toggleModal}
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Product</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div 
            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer transition-all hover:shadow-md ${
              activeTab === 'inventory' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setActiveTab('inventory')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CubeIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{counts.allCount}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer transition-all hover:shadow-md ${
              activeTab === 'inventory' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setActiveTab('inventory')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <ShieldCheckIcon className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">PPE Items</p>
                <p className="text-2xl font-bold text-gray-900">{counts.ppesCount}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer transition-all hover:shadow-md ${
              activeTab === 'purchase-orders' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setActiveTab('purchase-orders')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <TruckIcon className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Products to Add</p>
                <p className="text-2xl font-bold text-gray-900">{getPendingAddToInventoryCount()}</p>
                {getPendingNotificationCount() > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <BellAlertIcon className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-600">
                      {getPendingNotificationCount()} pending notification
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div 
            className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer transition-all hover:shadow-md ${
              activeTab === 'purchase-orders' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setActiveTab('purchase-orders')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <BuildingStorefrontIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Purchase Orders</p>
                <p className="text-2xl font-bold text-gray-900">{purchaseOrders.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'inventory' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <CubeIcon className="h-5 w-5" />
                Inventory Products ({counts.allCount})
              </button>
              <button
                onClick={() => setActiveTab('purchase-orders')}
                className={`flex items-center gap-2 py-4 px-6 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'purchase-orders' 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <TruckIcon className="h-5 w-5" />
                Purchase Orders ({purchaseOrders.length})
                {getPendingAddToInventoryCount() > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {getPendingAddToInventoryCount()} to add
                  </span>
                )}
                {getPendingNotificationCount() > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <BellIcon className="h-3 w-3 mr-1" />
                    {getPendingNotificationCount()} pending
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'inventory' ? (
          <>
            {/* Inventory Management Section */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setProductView('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      productView === 'all' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <BuildingStorefrontIcon className="h-4 w-4" />
                    <span>All Products ({counts.allCount})</span>
                  </button>
                  
                  <button
                    onClick={() => setProductView('ppes')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      productView === 'ppes' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ShieldCheckIcon className="h-4 w-4" />
                    <span>PPE Only ({counts.ppesCount})</span>
                  </button>

                  <button
                    onClick={() => setProductView('kitchenStore')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      productView === 'kitchenStore' 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <HomeIcon className="h-4 w-4" />
                    <span>Kitchen Store ({counts.kitchenStoreCount})</span>
                  </button>

                  <button
                    onClick={() => setProductView('returnable')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      productView === 'returnable' 
                        ? 'bg-teal-500 text-white' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    <span>Returnable Tools ({counts.returnableCount})</span>
                  </button>
                  
                  <button
                    onClick={() => setProductView('products')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      productView === 'products' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <CubeIcon className="h-4 w-4" />
                    <span>Regular Products ({counts.regularCount})</span>
                  </button>
                </div>
              </div>

              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-hidden border border-gray-200 shadow-sm rounded-lg bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 border-b border-gray-200 w-12">
                        <div className="text-xs font-semibold">Select</div>
                      </th>
                      {["Name", "Code", "Unit Cost", "Description", "Brand", "Type", "Stock", "PPE", "Kitchen Store", "Returnable", "Entry Date","shelf", "Actions"].map((head) => (
                        <th key={head} className="p-3 border-b border-gray-200">
                          <div className="text-xs font-semibold whitespace-nowrap">{head}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product, index) => (
                        <tr 
                          key={product.id} 
                          className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50/50 transition-colors`}
                        >
                          <td className="p-3 border-b border-gray-200">
                            <input
                              type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                              name="product-selection"
                              checked={selectedItems.includes(product.id)}
                              onChange={() => toggleItemSelection(product.id)}
                              className="hover:cursor-pointer"
                            />
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              {product.ppe && (
                                <ShieldCheckIcon className="h-4 w-4 text-orange-500" title="PPE Item" />
                              )}
                              {product.kitchenStore && (
                                <HomeIcon className="h-4 w-4 text-pink-500" title="Kitchen Store Item" />
                              )}
                              {product.returnableAfterUse && (
                                <ArrowPathIcon className="h-4 w-4 text-teal-500" title="Returnable After Use" />
                              )}
                              <div className="text-sm font-medium whitespace-nowrap max-w-[150px] truncate" title={product.name}>
                                {product.name}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                              {product.code || 'N/A'}
                            </span>
                          </td>
                         <td className="p-3 border-b border-gray-200">
                          <div className="text-sm whitespace-nowrap">
                            {formatCurrency(product.unitCost)}
                          </div>
                        </td>
                          <td className="p-3 border-b border-gray-200">
                            <div className="text-sm max-w-[200px] truncate" title={product.description}>
                              {product.description}
                            </div>
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <div className="text-sm whitespace-nowrap max-w-[120px] truncate" title={product.userName}>
                              {product.userName}
                            </div>
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize whitespace-nowrap">
                              {product.productType}
                            </span>
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              product.stock > 10 ? 'bg-green-100 text-green-800' : 
                              product.stock > 0 ? 'bg-amber-100 text-amber-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {`${product.stock} units`}
                            </span>
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              product.ppe 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {product.ppe ? 'PPE' : 'Regular'}
                            </span>
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              product.kitchenStore 
                                ? 'bg-pink-100 text-pink-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {product.kitchenStore ? 'Kitchen Store' : 'Regular'}
                            </span>
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              product.returnableAfterUse 
                                ? 'bg-teal-100 text-teal-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {product.returnableAfterUse ? 'Returnable' : 'Consumable'}
                            </span>
                          </td>
                          <td className="p-3 border-b border-gray-200">
                            <div className="text-sm whitespace-nowrap">
                              {formatDate(product.entryDate)}
                            </div>
                          </td>

                           <td className="p-3 border-b border-gray-200">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize whitespace-nowrap">
                              {product.shelfNumber}
                            </span>
                          </td>

                          <td className="p-3 border-b border-gray-200">
                            <div className="flex gap-1">
                              <button
                                className="p-1.5 text-green-600 hover:text-green-800 transition-colors hover:bg-green-50 rounded"
                                onClick={() => openStockModal(product, 'add')}
                                title="Add Stock"
                              >
                                <PlusCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                className={`p-1.5 transition-colors hover:bg-red-50 rounded ${
                                  product.stock <= 0 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : 'text-red-600 hover:text-red-800'
                                }`}
                                onClick={() => product.stock > 0 && openStockModal(product, 'remove')}
                                title={product.stock <= 0 ? "No stock available" : "Remove Stock"}
                                disabled={product.stock <= 0}
                              >
                                <MinusCircleIcon className="h-4 w-4" />
                              </button>
                              <button
                                className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-50 rounded"
                                onClick={() => viewStockHistory(product.id)}
                                title="View Stock History"
                              >
                                <ClockIcon className="h-4 w-4" />
                              </button>
                              <button
                                className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-50 rounded"
                                onClick={() => handleEditProduct(product)}
                                title="Edit Product"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                className="p-1.5 text-red-600 hover:text-red-800 transition-colors hover:bg-red-50 rounded"
                                onClick={() => deleteProduct(product.id)}
                                title="Delete Product"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="p-8 text-center text-gray-500">
                          <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <div className="text-lg font-medium mb-2">No products found</div>
                          <div className="text-sm mb-4">
                            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first product'}
                          </div>
                          {!searchTerm && (
                            <button 
                              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                              onClick={toggleModal}
                            >
                              Add First Product
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Purchase Orders Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <TruckIcon className="h-6 w-6 text-gray-700" />
                <h4 className="text-lg font-semibold text-gray-900">Products from Purchase Orders</h4>
                <span className="text-sm text-gray-500">(Ready to be added to inventory)</span>
                {getPendingNotificationCount() > 0 && (
                  <div className="flex items-center gap-2 ml-4">
                    <BellAlertIcon className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-700">
                      {getPendingNotificationCount()} purchase orders need store notification
                    </span>
                    <button
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                      onClick={() => {
                        // Navigate to procurement purchases page or refresh
                        window.location.href = '/procurement-purchases';
                      }}
                    >
                      Go to Procurement →
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search products in purchase orders..."
                    value={purchaseOrderSearchTerm}
                    onChange={(e) => setPurchaseOrderSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {purchaseOrderSearchTerm && (
                    <button
                      onClick={() => setPurchaseOrderSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-hidden border border-gray-200 shadow-sm rounded-lg bg-white mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-3 border-b border-gray-200">
                          <div className="text-xs font-semibold">Product Name</div>
                        </th>
                        <th className="p-3 border-b border-gray-200">
                          <div className="text-xs font-semibold">Product Code</div>
                        </th>
                        <th className="p-3 border-b border-gray-200">
                          <div className="text-xs font-semibold">Quantity Available</div>
                        </th>
                        <th className="p-3 border-b border-gray-200">
                          <div className="text-xs font-semibold">Unit Cost</div>
                        </th>
                        <th className="p-3 border-b border-gray-200">
                          <div className="text-xs font-semibold">Status</div>
                        </th>
                        <th className="p-3 border-b border-gray-200">
                          <div className="text-xs font-semibold">Actions</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchaseOrders.length > 0 ? (
                        filteredPurchaseOrders.flatMap(order => 
                          order.items
                            .filter(item => item.status === 'DELIVERED' || item.status === 'RECEIVED')
                            .filter(item => item.quantity > (item.receivedQuantity || 0) || item.isNewProduct)
                            .map(item => {
                              const pendingQuantity = item.quantity - (item.receivedQuantity || 0);
                              const isNewProduct = item.isNewProduct || !item.productId;
                              
                              return (
                                <tr key={`${order.id}-${item.id}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-3 border-b border-gray-200">
                                    <div className="font-medium text-sm">
                                      {item.productName}
                                      {isNewProduct && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                          New
                                        </span>
                                      )}
                                    </div>
                                    {item.description && (
                                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                                    )}
                                  </td>
                                  <td className="p-3 border-b border-gray-200">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      {item.productCode || 'No Code'}
                                    </span>
                                  </td>
                                  <td className="p-3 border-b border-gray-200">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-medium">{pendingQuantity} units</div>
                                      {item.receivedQuantity > 0 && (
                                        <div className="text-xs text-gray-500">
                                          ({item.receivedQuantity} already received)
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 border-b border-gray-200">
                                    <div className="text-sm font-medium">
                                      ${item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : '0.00'}
                                    </div>
                                  </td>
                                  <td className="p-3 border-b border-gray-200">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      item.status === 'DELIVERED' 
                                        ? 'bg-purple-100 text-purple-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {item.status === 'DELIVERED' ? 'Ready to Add' : 'Partially Added'}
                                    </span>
                                  </td>
                                  <td className="p-3 border-b border-gray-200">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleSaveProductToInventory(order, item)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                                          isNewProduct
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                        disabled={pendingQuantity <= 0}
                                        title={isNewProduct ? "Add new product to inventory" : "Add stock to existing product"}
                                      >
                                        <PlusIcon className="h-4 w-4" />
                                        {isNewProduct ? 'Create Product' : 'Add Stock'}
                                      </button>
                                      <button
                                        onClick={() => viewPurchaseOrderItemDetails(order, item)}
                                        className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-50 rounded"
                                        title="View Details"
                                      >
                                        <EyeIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                        )
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500">
                            <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <div className="text-lg font-medium mb-2">No products available</div>
                            <div className="text-sm">
                              {purchaseOrderSearchTerm 
                                ? 'No matching products found' 
                                : 'All products have been added to inventory'}
                            </div>
                            {getPendingNotificationCount() > 0 && (
                              <div className="mt-4">
                                <p className="text-sm text-yellow-600 mb-2">
                                  Note: There are {getPendingNotificationCount()} purchase orders waiting for store notification.
                                </p>
                                <button
                                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                                  onClick={() => {
                                    window.location.href = '/procurement-purchases';
                                  }}
                                >
                                  Go to Procurement to notify store →
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            {activeTab === 'inventory' ? (
              <>
                Showing {filteredProducts.length} of {products.length} products • 
                View: {
                  productView === 'all' ? 'All Products' : 
                  productView === 'ppes' ? 'PPE Only' : 
                  productView === 'kitchenStore' ? 'Kitchen Store' : 
                  productView === 'returnable' ? 'Returnable Tools' : 
                  'Regular Products'
                }
              </>
            ) : (
              <>
                Showing {filteredPurchaseOrders.length} of {purchaseOrders.length} purchase orders • 
                {getPendingAddToInventoryCount()} items ready to add • 
                {getPendingNotificationCount()} pending notifications
              </>
            )}
            • Inventory Management System © {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 p-6 flex items-center gap-3">
              <PlusIcon className="h-6 w-6 text-blue-500" />
              <h5 className="text-xl font-semibold text-gray-900">Add New Product</h5>
            </div>
            <div className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text"
                    placeholder="Product Name *"
                    name="name" 
                    value={newProduct.name} 
                    onChange={handleInputChange} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="text"
                    placeholder="Brand *"
                    name="userName" 
                    value={newProduct.userName} 
                    onChange={handleInputChange} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="date"
                    name="entryDate"
                    value={newProduct.entryDate}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="number" 
                    placeholder="Stock Quantity *"
                    name="stock" 
                    value={newProduct.stock} 
                    onChange={handleInputChange} 
                    required
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Unit Cost *"
                    name="unitCost" 
                    value={newProduct.unitCost} 
                    onChange={handleInputChange} 
                    required
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="text"
                    placeholder="Product Type *"
                    name="productType" 
                    value={newProduct.productType} 
                    onChange={handleInputChange} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                   <input 
                    type="Shelf Number"
                    placeholder="10"
                    name="shelfNumber" 
                    value={newProduct.shelfNumber} 
                    onChange={handleInputChange} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <textarea 
                  placeholder="Description *"
                  name="description" 
                  value={newProduct.description} 
                  onChange={handleInputChange} 
                  required 
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="ppe"
                      checked={newProduct.ppe}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ppe" className="ml-2 block text-sm text-gray-900">
                      PPE Item
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="kitchenStore"
                      checked={newProduct.kitchenStore}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <label htmlFor="kitchenStore" className="ml-2 block text-sm text-gray-900">
                      Kitchen Store
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="returnableAfterUse"
                      checked={newProduct.returnableAfterUse}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="returnableAfterUse" className="ml-2 block text-sm text-gray-900">
                      Returnable After Use
                    </label>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  * Required fields. Code will be generated automatically.
                </div>
              </form>
              {inputError && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-red-700 text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {inputError}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mr-2"
                onClick={toggleModal}
              >
                Cancel
              </button>
              <button
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors"
                onClick={handleAddProduct}
              >
                <PlusIcon className="h-4 w-4" />
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Product Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 p-6 flex items-center gap-3">
              <PencilIcon className="h-6 w-6 text-blue-500" />
              <h5 className="text-xl font-semibold text-gray-900">Update Product</h5>
            </div>
            <div className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text"
                    placeholder="Product Name *"
                    name="name" 
                    value={updatedProduct.name} 
                    onChange={handleInputChange} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="text"
                    placeholder="Brand *"
                    name="userName" 
                    value={updatedProduct.userName} 
                    onChange={handleInputChange} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="number" 
                    placeholder="Stock Quantity *"
                    name="stock" 
                    value={updatedProduct.stock} 
                    onChange={handleInputChange} 
                    required
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Unit Cost *"
                    name="unitCost" 
                    value={updatedProduct.unitCost} 
                    onChange={handleInputChange} 
                    required
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                   <input 
                    type="Shelf Number"
                    placeholder="10"
                    name="shelfNumber" 
                    value={updatedProduct.shelfNumber} 
                    onChange={handleInputChange} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="text"
                    placeholder="Product Type *"
                    name="productType" 
                    value={updatedProduct.productType} 
                    onChange={handleInputChange} 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <input 
                    type="date"
                    name="entryDate"
                    value={updatedProduct.entryDate}
                    onChange={handleInputChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
                <textarea 
                  placeholder="Description *"
                  name="description" 
                  value={updatedProduct.description} 
                  onChange={handleInputChange} 
                  required 
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="ppe"
                      checked={updatedProduct.ppe}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ppe" className="ml-2 block text-sm text-gray-900">
                      PPE Item
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="kitchenStore"
                      checked={updatedProduct.kitchenStore}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                    />
                    <label htmlFor="kitchenStore" className="ml-2 block text-sm text-gray-900">
                      Kitchen Store
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="returnableAfterUse"
                      checked={updatedProduct.returnableAfterUse}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="returnableAfterUse" className="ml-2 block text-sm text-gray-900">
                      Returnable After Use
                    </label>
                  </div>
                </div>
              </form>
              {inputError && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-red-700 text-sm flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {inputError}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mr-2"
                onClick={toggleUpdateModal}
              >
                Cancel
              </button>
              <button
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors"
                onClick={handleUpdateProduct}
              >
                <PencilIcon className="h-4 w-4" />
                Update Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b border-gray-200 p-6">
              <h5 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                {stockAdjustment.adjustmentType === 'add' ? (
                  <PlusCircleIcon className="h-6 w-6 text-green-500" />
                ) : (
                  <MinusCircleIcon className="h-6 w-6 text-red-500" />
                )}
                {stockAdjustment.adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
              </h5>
              <p className="text-sm text-gray-600 mt-1">
                Product: {currentProduct?.name}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Current Stock</p>
                    <p className="text-lg font-bold">{stockAdjustment.oldStock} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">New Stock</p>
                    <p className={`text-lg font-bold ${
                      stockAdjustment.newStock > stockAdjustment.oldStock 
                        ? 'text-green-600' 
                        : stockAdjustment.newStock < stockAdjustment.oldStock 
                          ? 'text-red-600' 
                          : 'text-gray-600'
                    }`}>
                      {stockAdjustment.newStock} units
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Type
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => handleStockAdjustmentChange({ 
                      target: { name: 'adjustmentType', value: 'add' }
                    })}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      stockAdjustment.adjustmentType === 'add'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <PlusCircleIcon className="h-5 w-5" />
                      Add Stock
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStockAdjustmentChange({ 
                      target: { name: 'adjustmentType', value: 'remove' }
                    })}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      stockAdjustment.adjustmentType === 'remove'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <MinusCircleIcon className="h-5 w-5" />
                      Remove Stock
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={stockAdjustment.quantity}
                  onChange={handleStockAdjustmentChange}
                  min="1"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Enter quantity to ${stockAdjustment.adjustmentType}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <select
                  name="reason"
                  value={stockAdjustment.reason}
                  onChange={handleStockAdjustmentChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a reason</option>
                  <option value="new_shipment">New Shipment Received</option>
                  <option value="purchase_order">Purchase Order Fulfilled</option>
                  <option value="damaged">Damaged/Expired Items</option>
                  <option value="theft">Theft/Loss</option>
                  <option value="internal_use">Internal Use</option>
                  <option value="customer_return">Customer Return</option>
                  <option value="stock_take">Stock Take Adjustment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={stockAdjustment.notes}
                  onChange={handleStockAdjustmentChange}
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes about this stock adjustment..."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setIsStockModalOpen(false);
                  setError('');
                }}
              >
                Cancel
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAdjustStock}
                disabled={!stockAdjustment.quantity || !stockAdjustment.reason || parseInt(stockAdjustment.quantity) <= 0}
              >
                {stockAdjustment.adjustmentType === 'add' ? (
                  <PlusCircleIcon className="h-4 w-4" />
                ) : (
                  <MinusCircleIcon className="h-4 w-4" />
                )}
                Confirm {stockAdjustment.adjustmentType === 'add' ? 'Add' : 'Remove'} Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Receipt Modal */}
      {isReceiptModalOpen && selectedPurchaseOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="border-b border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900">Store Receipt Confirmation</h3>
              <p className="text-sm text-gray-600">
                PO: {selectedPurchaseOrder.purchaseOrderNumber}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Good Quantity *
                  </label>
                  <input
                    type="number"
                    value={receiptForm.goodQuantity}
                    onChange={(e) => setReceiptForm(prev => ({
                      ...prev,
                      goodQuantity: Math.max(0, parseInt(e.target.value) || 0)
                    }))}
                    min="0"
                    max={receiptForm.goodQuantity}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Damaged Quantity
                  </label>
                  <input
                    type="number"
                    value={receiptForm.damagedQuantity}
                    onChange={(e) => setReceiptForm(prev => ({
                      ...prev,
                      damagedQuantity: Math.max(0, parseInt(e.target.value) || 0)
                    }))}
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received By *
                </label>
                <input
                  type="text"
                  value={receiptForm.receivedBy}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, receivedBy: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="Any notes about condition, packaging, etc."
                />
              </div>
            </div>
            
            <div className="flex justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStoreReceive}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirm Store Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Purchase Order Item Details Modal */}
      {isViewPurchaseOrderModalOpen && selectedPurchaseOrder && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Product Details</h3>
                <button
                  onClick={() => setIsViewPurchaseOrderModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Product Name</label>
                  <p className="font-medium text-gray-900">{selectedItem.productName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Product Code</label>
                  <p className="font-medium text-gray-900">{selectedItem.productCode || 'N/A'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ordered Quantity</label>
                    <p className="font-medium text-gray-900">{selectedItem.quantity} units</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Available to Add</label>
                    <p className="font-medium text-green-600">
                      {selectedItem.quantity - (selectedItem.receivedQuantity || 0)} units
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Unit Cost</label>
                  <p className="font-medium text-gray-900">${selectedItem.unitPrice?.toFixed(2) || '0.00'}</p>
                </div>
                
                {selectedItem.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedItem.description}</p>
                  </div>
                )}
                
                {selectedItem.productType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Product Type</label>
                    <p className="font-medium text-gray-900">{selectedItem.productType}</p>
                  </div>
                )}
                
                <div className="flex gap-4">
                  {selectedItem.ppe && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      PPE Item
                    </span>
                  )}
                  {selectedItem.kitchenTools && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                      Kitchen Store
                    </span>
                  )}
                  {selectedItem.returnableAfterUse && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                      Returnable
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => handleSaveProductToInventory(selectedPurchaseOrder, selectedItem)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                disabled={selectedItem.quantity - (selectedItem.receivedQuantity || 0) <= 0}
              >
                <PlusIcon className="h-4 w-4" />
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {isImportModalOpen && <ImportPreviewModal />}

      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2 z-50">
          <CheckIcon className="h-5 w-5" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="ml-4 text-green-700 hover:text-green-900">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Products;