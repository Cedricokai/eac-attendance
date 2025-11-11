import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HomeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  ArchiveBoxIcon,
  UserCircleIcon,
  CubeIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';

const Products = () => {
  const [products, setProducts] = useState([]);
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

  const [updatedProduct, setUpdatedProduct] = useState({
    name: '',
    description: '',
    stock: '',
    userName: '',
    productType: ''
  });
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    stock: '',
    userName: '',
    productType: '',
    entryDate: new Date().toISOString().split('T')[0]
  });

  // Mock data for demonstration
  const mockProducts = [
    {
      id: 1,
      name: 'Steel Beams',
      code: 'STL-BM-001',
      description: 'High-grade steel construction beams',
      userName: 'ACME Steel',
      productType: 'Construction',
      stock: 15,
      entryDate: '2024-01-15T10:30:00Z',
      createdDate: '2024-01-15T10:30:00Z'
    },
    {
      id: 2,
      name: 'Electrical Wiring',
      code: 'ELEC-WR-002',
      description: 'Copper electrical wiring 2.5mm',
      userName: 'ElectroCorp',
      productType: 'Electrical',
      stock: 8,
      entryDate: '2024-01-14T14:20:00Z',
      createdDate: '2024-01-14T14:20:00Z'
    },
    {
      id: 3,
      name: 'PVC Pipes',
      code: 'PVC-PP-003',
      description: '3-inch PVC plumbing pipes',
      userName: 'PipeMasters',
      productType: 'Plumbing',
      stock: 25,
      entryDate: '2024-01-13T09:15:00Z',
      createdDate: '2024-01-13T09:15:00Z'
    },
    {
      id: 4,
      name: 'Safety Helmets',
      code: 'SFY-HL-004',
      description: 'Industrial safety helmets',
      userName: 'SafeWork',
      productType: 'Safety',
      stock: 3,
      entryDate: '2024-01-12T16:45:00Z',
      createdDate: '2024-01-12T16:45:00Z'
    }
  ];

  // Mock fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use mock data
      setProducts(mockProducts);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // CSV Export Function
  const handleExportCSV = () => {
    if (products.length === 0) {
      setError("No products to export");
      return;
    }

    // Define CSV headers matching your Product entity
    const headers = [
      "Name",
      "Code",
      "Description",
      "Brand",
      "Type",
      "Stock",
      "Entry Date"
    ];

    // Build CSV rows
    const rows = products.map(product => [
      product.name || '',
      product.code || '',
      product.description || '',
      product.userName || '',
      product.productType || '',
      product.stock || 0,
      formatDate(product.entryDate || product.createdDate) || ''
    ]);

    // Convert to CSV string
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Trigger file download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccessMessage('Products exported successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // CSV Import Functions
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset previous state
    setImportData([]);
    setError('');
    setImportFileName(file.name);
    
    // Validate file type
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
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false,
          defval: ''
        });
        
        if (jsonData.length < 2) {
          setError("CSV file doesn't contain enough data (needs at least 1 data row)");
          return;
        }
        
        // Get headers from first row
        const headers = jsonData[0].map(header => 
          header.toString().toLowerCase().replace(/\s+/g, '')
        );
        
        console.log("Detected headers:", headers);
        
        // Map remaining rows to objects using headers
        const processedData = jsonData.slice(1).map((row, index) => {
          const obj = {};
          headers.forEach((header, colIndex) => {
            obj[header] = row[colIndex];
            // Also add original column names for flexibility
            const originalHeader = jsonData[0][colIndex];
            obj[originalHeader] = row[colIndex];
          });
          return obj;
        }).filter(row => Object.values(row).some(val => val !== '')); // Remove empty rows
        
        setImportData(processedData);
        setIsImportModalOpen(true);
        
      } catch (err) {
        console.error('File read error:', err);
        setError(`Error reading file: ${err.message}. Please check the file format.`);
      }
    };
    
    reader.onerror = () => {
      setError("Error reading file. Please try again.");
    };
    
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    e.target.value = '';
  };

  const mapCSVToProducts = (csvData) => {
    return csvData.map((row, index) => {
      // Flexible column mapping - matching your Product entity
      const name = row.name || row.productname || row.product || row['product name'] || '';
      const code = row.code || row.productcode || row.sku || row['product code'] || '';
      const description = row.description || row.desc || row['product description'] || '';
      const userName = row.brand || row.manufacturer || row.userName || row['brand name'] || '';
      const productType = row.type || row.category || row.producttype || row['product type'] || 'General';
      const stock = parseInt(row.stock || row.quantity || row.qty || row.inventory || 0);
      
      // Handle date from CSV
      let entryDate = new Date().toISOString().split('T')[0]; // Default to today
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
        code: code || undefined, // Let backend generate if empty
        description,
        userName,
        productType,
        stock: isNaN(stock) ? 0 : stock,
        entryDate
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
      setError("No valid products found in the file. Please check the format.");
      return;
    }

    try {
      // Simulate import process
      let successCount = 0;
      let errorCount = 0;

      // Add imported products to existing products
      const newProducts = productsToImport.map((product, index) => ({
        ...product,
        id: Date.now() + index, // Generate unique ID
        code: product.code || `IMP-${Date.now() + index}`,
        createdDate: new Date().toISOString()
      }));

      setProducts(prev => [...prev, ...newProducts]);
      successCount = newProducts.length;

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
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
    setUpdatedProduct(prev => ({ ...prev, [name]: value }));
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
  
    // Validation
    if (!newProduct.name || !newProduct.description || !newProduct.stock || !newProduct.userName || !newProduct.productType) {
      setInputError('Please fill out all required fields.');
      return;
    }
  
    try {
      // Create new product with mock data
      const newProductData = {
        id: Date.now(), // Generate unique ID
        name: newProduct.name,
        description: newProduct.description,
        stock: parseInt(newProduct.stock),
        userName: newProduct.userName,
        productType: newProduct.productType,
        code: `PROD-${Date.now()}`,
        entryDate: new Date().toISOString(),
        createdDate: new Date().toISOString()
      };

      // Add to products list
      setProducts(prev => [...prev, newProductData]);
      
      // Reset form
      setNewProduct({
        name: '',
        description: '',
        stock: '',
        userName: '',
        productType: '',
        entryDate: new Date().toISOString().split('T')[0]
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
  
    // Validation
    if (!updatedProduct.name || !updatedProduct.description || !updatedProduct.stock) {
      setInputError('Please fill out all required fields.');
      return;
    }
  
    try {
      // Update product in the list
      const updatedProductData = {
        ...currentProduct,
        name: updatedProduct.name,
        description: updatedProduct.description,
        stock: parseInt(updatedProduct.stock),
        userName: updatedProduct.userName,
        productType: updatedProduct.productType
      };

      setProducts(prev =>
        prev.map(product => (product.id === currentProduct.id ? updatedProductData : product))
      );
      
      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleUpdateModal();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const deleteProduct = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;
  
    try {
      // Remove product from list
      setProducts(prevProducts => prevProducts.filter(product => product.id !== id));
      setSuccessMessage('Product deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`Error deleting product: ${err.message}`);
    }
  };
  
  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    setUpdatedProduct({
      name: product.name,
      description: product.description,
      stock: product.stock,
      userName: product.userName,
      productType: product.productType
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
          <h3 className="text-2xl lg:text-3xl text-gray-900">Product Inventory</h3>
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

        {/* Products Table */}
        <div className="overflow-hidden border border-gray-200 shadow-sm rounded-lg bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border-b border-gray-200 w-12">
                    <div className="text-xs font-semibold">Select</div>
                  </th>
                  {["Name", "Code", "Description", "Brand", "Type", "Stock", "Entry Date", "Actions"].map((head) => (
                    <th key={head} className="p-3 border-b border-gray-200">
                      <div className="text-xs font-semibold whitespace-nowrap">{head}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
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
                      <div className="text-sm font-medium whitespace-nowrap max-w-[150px] truncate" title={product.name}>
                        {product.name}
                      </div>
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                        {product.code || 'N/A'}
                      </span>
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
                      <div className="text-sm whitespace-nowrap">
                        {formatDate(product.entryDate || product.createdDate)}
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
        {products.length === 0 && !loading && (
          <div className="text-center py-12">
            <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first product.</p>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              onClick={toggleModal}
            >
              Add First Product
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            Showing {products.length} products • Inventory Management System © {new Date().getFullYear()}
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
                <div className="text-sm text-gray-500">
                  * Required fields. Code will be generated automatically by the backend.
                </div>
              </form>
              {inputError && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-red-700 text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
                    type="text"
                    placeholder="Product Type *"
                    name="productType" 
                    value={updatedProduct.productType} 
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
              </form>
              {inputError && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-red-700 text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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