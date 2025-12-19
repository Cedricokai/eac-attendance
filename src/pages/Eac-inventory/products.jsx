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
  BeakerIcon
} from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectionMode, setSelectionMode] = useState('multiple');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  
  // Product view states
  const [productView, setProductView] = useState('all'); // 'all', 'ppes', 'products', 'kitchenStore', 'returnable'
  const [searchTerm, setSearchTerm] = useState('');

 const [updatedProduct, setUpdatedProduct] = useState({
  name: '',
  description: '',
  stock: '',
  userName: '',
  productType: '',
  entryDate: '', // Add this field
  ppe: false,
  kitchenStore: false,
  returnableAfterUse: false,
  unitCost: ''
});
  
  const [newProduct, setNewProduct] = useState({
  name: '',
  description: '',
  stock: '',
  userName: '',
  productType: '',
  entryDate: new Date().toISOString().split('T')[0], // Change to lowercase
  ppe: false,
  kitchenStore: false,
  returnableAfterUse: false,
  unitCost: ''
});


  const navigate = useNavigate();

 const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;

  console.log("🖥️ Current hostname:", hostname);
  console.log("🔌 Current port:", port);

  // If frontend is opened via localhost → use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }

  // Public / Tailscale / Cloudflare IP
  if (hostname === "100.114.178.13") {
    console.log("🌐 Using PUBLIC API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  }

  // Default fallback
  console.log("🌍 Using PUBLIC API URL (fallback)");
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

  const API_BASE_URL = getApiBaseUrl();


  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setError('Authentication token not found. Please login again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched products:', data);
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products based on view and search term
  useEffect(() => {
    let filtered = products;

    // Filter by view type
    if (productView === 'ppes') {
      filtered = filtered.filter(product => product.ppe === true);
    } else if (productView === 'products') {
      filtered = filtered.filter(product => 
        !product.ppe || product.ppe === false
      );
    } else if (productView === 'kitchenStore') {
      filtered = filtered.filter(product => 
        product.kitchenStore === true
      );
    } else if (productView === 'returnable') {
      filtered = filtered.filter(product => 
        product.returnableAfterUse === true
      );
    }

    // Filter by search term
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

  // CSV Export Function
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

  // CSV Import Functions
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
        
        console.log("Detected headers:", headers);
        
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
        console.error('File read error:', err);
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
      
      // Handle PPE field
      const ppe = row.ppe === 'true' || row.ppe === 'yes' || 
                  row.isppe === 'true' || row.isppe === 'yes' || 
                  row.ispersonalprotectiveequipment === 'true' || 
                  row['personal protective equipment'] === 'yes' || false;

      // Handle Kitchen Store field
      const kitchenStore = row.kitchenstore === 'true' || row.kitchenstore === 'yes' || 
                          row.kitchenStore === 'true' || row.kitchenStore === 'yes' ||
                          row['kitchen store'] === 'true' || row['kitchen store'] === 'yes' ||
                          row.iskitchenstore === 'true' || row.iskitchenstore === 'yes' || false;

      // Handle Returnable After Use field
      const returnableAfterUse = row.returnableafteruse === 'true' || row.returnableafteruse === 'yes' ||
                                row.returnable === 'true' || row.returnable === 'yes' ||
                                row['returnable after use'] === 'true' || row['returnable after use'] === 'yes' ||
                                row.mustbereturned === 'true' || row.mustbereturned === 'yes' ||
                                row.tool === 'true' || row.tool === 'yes' || false;
      
      let entryDate = new Date().toISOString().split('T')[0];
      if (row.entrydate || row.date || row.createddate) {
        const dateStr = row.entrydate || row.date || row.createddate;
        try {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            entryDate = parsedDate.toISOString().split('T')[0];
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
    
    console.log(`Input change: ${name} = ${inputValue}`);
    
    if (name === 'ppe' || name === 'kitchenStore' || name === 'returnableAfterUse') {
      setNewProduct(prev => ({ ...prev, [name]: checked }));
      setUpdatedProduct(prev => ({ ...prev, [name]: checked }));
    } else {
      setNewProduct(prev => ({ ...prev, [name]: inputValue }));
      setUpdatedProduct(prev => ({ ...prev, [name]: inputValue }));
    }
  };

  const handleApply = () => {
    if (selectedCategory === "projects") {
      navigate('/products');
    } else if (selectedCategory === "assets") {
      navigate('/assets');
    } else {
      setError('Please select a category');
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

      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        stock: parseInt(newProduct.stock),
        userName: newProduct.userName,
        productType: newProduct.productType,
        entryDate: newProduct.entryDate ? new Date(newProduct.entryDate).toISOString() : new Date().toISOString(),
        ppe: Boolean(newProduct.ppe),
        kitchenStore: Boolean(newProduct.kitchenStore),
        returnableAfterUse: Boolean(newProduct.returnableAfterUse),
        unitCost: newProduct.unitCost ? parseFloat(newProduct.unitCost) : 0
      };
  
      console.log('Sending product data:', productData);

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
        unitCost: ''
      });
      
      setSuccessMessage('Product added successfully!');
      setInputError('');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleModal();
    } catch (err) {
      console.error('Add product error:', err);
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
      const updateData = {
        name: updatedProduct.name,
        description: updatedProduct.description,
        stock: parseInt(updatedProduct.stock),
        userName: updatedProduct.userName,
        productType: updatedProduct.productType,
        ppe: Boolean(updatedProduct.ppe),
        kitchenStore: Boolean(updatedProduct.kitchenStore),
        returnableAfterUse: Boolean(updatedProduct.returnableAfterUse),
        unitCost: updatedProduct.unitCost ? parseFloat(updatedProduct.unitCost) : 0
      };

      console.log('Updating product ID:', currentProduct.id);
      console.log('Update data:', updateData);

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
  
      const updatedProductData = await response.json();
      
      setProducts(prev =>
        prev.map(product => (product.id === updatedProductData.id ? updatedProductData : product))
      );
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleUpdateModal();
    } catch (err) {
      console.error('Update product error:', err);
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
    console.log('Editing product:', product);
    setCurrentProduct(product);
    setUpdatedProduct({
      name: product.name,
      description: product.description,
      stock: product.stock,
      userName: product.userName,
      productType: product.productType,
      ppe: product.ppe || false,
      kitchenStore: product.kitchenStore || false,
      returnableAfterUse: product.returnableAfterUse || false,
      unitCost: product.unitCost || ''
    });
    toggleUpdateModal();
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
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  // Get counts for each category
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

  const counts = getProductCounts();

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <div className="max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2 className="text-lg font-semibold">Error: {error}</h2>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex items-center gap-4">
        <SidebarWithBurgerMenu onToggle={() => {}} />
      </div>

      {/* Main Content */}
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
            
            {/* Import/Export Buttons */}
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

        {/* Product View Tabs and Search */}
        <div className="mb-6 space-y-4">
          {/* View Tabs */}
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

          {/* Search Bar */}
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
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                  {["Name", "Code", "Unit Cost", "Description", "Brand", "Type", "Stock", "PPE", "Kitchen Store", "Returnable", "Entry Date", "Actions"].map((head) => (
                    <th key={head} className="p-3 border-b border-gray-200">
                      <div className="text-xs font-semibold whitespace-nowrap">{head}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
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
                        ${product.unitCost ? parseFloat(product.unitCost).toFixed(2) : '0.00'}
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
                      <div className="flex gap-1">
                        <button 
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          onClick={() => handleEditProduct(product)}
                          title="Edit Product"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          onClick={() => deleteProduct(product.id)}
                          title="Delete Product"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No products match your search' : `No ${productView === 'all' ? '' : productView} products found`}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : productView === 'ppes' 
                  ? 'PPE items will appear here when marked as PPE'
                  : productView === 'kitchenStore'
                    ? 'Kitchen store items will appear here when marked as kitchen store'
                    : productView === 'returnable'
                      ? 'Returnable tools will appear here when marked as returnable after use'
                      : 'Get started by adding your first product'
              }
            </p>
            {!searchTerm && (
              <button 
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                onClick={toggleModal}
              >
                Add First Product
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.length} products • 
            View: {
              productView === 'all' ? 'All Products' : 
              productView === 'ppes' ? 'PPE Only' : 
              productView === 'kitchenStore' ? 'Kitchen Store' : 
              productView === 'returnable' ? 'Returnable Tools' : 
              'Regular Products'
            } • 
            Inventory Management System © {new Date().getFullYear()}
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0118 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0118 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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

      {/* Import Preview Modal */}
      {isImportModalOpen && <ImportPreviewModal />}

      {/* Success Alert */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
          <CheckIcon className="h-5 w-5" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="ml-4 text-green-700 hover:text-green-900">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Products;