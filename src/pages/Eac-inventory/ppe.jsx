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
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import { SidebarWithBurgerMenu } from './SidebarWithBurgerMenu';

const PPES = () => {
  const [ppeItems, setPpeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [currentPpe, setCurrentPpe] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectionMode, setSelectionMode] = useState('multiple');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // PPE Types for dropdown
  const ppeTypes = [
    'Helmet', 'Safety Glasses', 'Gloves', 'Safety Boots', 'Ear Protection',
    'Respirator', 'High-Vis Vest', 'Harness', 'Face Shield', 'Coveralls',
    'Other'
  ];

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
  const safetyStandards = ['ANSI', 'OSHA', 'CE', 'ISO', 'Other'];

  const [updatedPpe, setUpdatedPpe] = useState({
    name: '',
    description: '',
    stock: '',
    brand: '',
    ppeType: '',
    size: '',
    material: '',
    color: '',
    cost: '',
    location: '',
    safetyStandard: '',
    expiryDate: '',
    minStockLevel: '0'
  });
  
  const [newPpe, setNewPpe] = useState({
    name: '',
    description: '',
    stock: '',
    brand: '',
    ppeType: '',
    size: '',
    material: '',
    color: '',
    cost: '',
    location: '',
    safetyStandard: '',
    expiryDate: '',
    minStockLevel: '0',
    entryDate: new Date().toISOString().split('T')[0]
  });

  const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_API_BASE_URL_LOCAL
    : import.meta.env.VITE_API_BASE_URL_PUBLIC;

  // Get JWT token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem("jwtToken") || localStorage.getItem("authToken");
  };

  // Enhanced fetch function with error handling
  const apiFetch = async (url, options = {}) => {
    const token = getAuthToken();
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      console.log(`Making API call to: ${url}`);
      const response = await fetch(url, finalOptions);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0' || response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPPEItems();
    fetchStats();
  }, []);

  const fetchPPEItems = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`http://http://192.168.1.98:8080/api/ppe`);
      setPpeItems(data || []);
    } catch (err) {
      console.error('Failed to fetch PPE items:', err);
      setError(`Failed to load PPE items: ${err.message}`);
      setPpeItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiFetch(`http://http://192.168.1.98:8080/api/ppe/stats`);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Don't set error for stats failure, just log it
    }
  };

  const searchPPE = async (query) => {
    if (!query.trim()) {
      fetchPPEItems();
      return;
    }

    try {
      const data = await apiFetch(`http://http://192.168.1.98:8080/api/ppe/search?query=${encodeURIComponent(query)}`);
      setPpeItems(data || []);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed: ' + err.message);
    }
  };

  // CSV Export Function for PPE
  const handleExportCSV = () => {
    if (ppeItems.length === 0) {
      setError("No PPE items to export");
      return;
    }

    const headers = [
      "Name", "Code", "Description", "Brand", "PPE Type", "Size", "Material",
      "Color", "Stock", "Cost", "Location", "Safety Standard", "Expiry Date", 
      "Min Stock Level", "Entry Date"
    ];

    const rows = ppeItems.map(ppe => [
      ppe.name || '',
      ppe.code || '',
      ppe.description || '',
      ppe.brand || '',
      ppe.ppeType || '',
      ppe.size || '',
      ppe.material || '',
      ppe.color || '',
      ppe.stock || 0,
      ppe.cost || 0,
      ppe.location || '',
      ppe.safetyStandard || '',
      formatDate(ppe.expiryDate) || '',
      ppe.minStockLevel || 0,
      formatDate(ppe.entryDate || ppe.createdDate) || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ppe-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccessMessage('PPE items exported successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // CSV Import Functions for PPE
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
          setError("CSV file doesn't contain enough data (needs at least 1 data row)");
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
        setError(`Error reading file: ${err.message}. Please check the file format.`);
      }
    };
    
    reader.onerror = () => {
      setError("Error reading file. Please try again.");
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const mapCSVToPPE = (csvData) => {
    return csvData.map((row, index) => {
      const name = row.name || row.ppename || row.product || row['ppe name'] || '';
      const code = row.code || row.ppecode || row.sku || row['ppe code'] || '';
      const description = row.description || row.desc || row['ppe description'] || '';
      const brand = row.brand || row.manufacturer || row['brand name'] || '';
      const ppeType = row.ppetype || row.type || row.category || row['ppe type'] || 'General';
      const size = row.size || row['size'] || '';
      const material = row.material || row['material'] || '';
      const color = row.color || row['color'] || '';
      const stock = parseInt(row.stock || row.quantity || row.qty || row.inventory || 0);
      const cost = parseFloat(row.cost || row.price || row.unitprice || row['unit price'] || 0);
      const location = row.location || row.warehouse || row.storage || '';
      const safetyStandard = row.safetystandard || row.standard || row['safety standard'] || '';
      const minStockLevel = parseInt(row.minstock || row.minstocklevel || row['min stock'] || 0);
      
      let expiryDate = null;
      if (row.expirydate || row.expiry || row.expirationdate) {
        const dateStr = row.expirydate || row.expiry || row.expirationdate;
        try {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            expiryDate = parsedDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Invalid date format:', dateStr);
        }
      }

      return {
        name,
        code,
        description,
        brand,
        ppeType,
        size,
        material,
        color,
        stock: isNaN(stock) ? 0 : stock,
        cost: isNaN(cost) ? 0 : cost,
        location,
        safetyStandard,
        expiryDate,
        minStockLevel: isNaN(minStockLevel) ? 0 : minStockLevel
      };
    }).filter(ppe => ppe.name && ppe.name.trim() !== '');
  };

  const handleImportPPE = async () => {
    if (importData.length === 0) {
      setError("No valid data to import");
      return;
    }

    const ppeToImport = mapCSVToPPE(importData);
    
    if (ppeToImport.length === 0) {
      setError("No valid PPE items found in the file. Please check the format.");
      return;
    }

    try {
      const token = getAuthToken();
      let successCount = 0;
      let errorCount = 0;

      for (const ppe of ppeToImport) {
        try {
          const response = await fetch(`http://http://192.168.1.98:8080/api/ppe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(ppe),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to import PPE: ${ppe.name}`);
          }
        } catch (err) {
          errorCount++;
          console.error(`Error importing PPE: ${ppe.name}`, err);
        }
      }

      await fetchPPEItems();
      await fetchStats();

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
            Found {importData.length} rows, {mapCSVToPPE(importData).length} valid PPE items
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImportPPE}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              Import {mapCSVToPPE(importData).length} PPE Items
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cost' || name === 'stock' || name === 'minStockLevel') {
      const processedValue = value === '' ? '' : value;
      setNewPpe(prev => ({ ...prev, [name]: processedValue }));
      setUpdatedPpe(prev => ({ ...prev, [name]: processedValue }));
    } else {
      setNewPpe(prev => ({ ...prev, [name]: value }));
      setUpdatedPpe(prev => ({ ...prev, [name]: value }));
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

  const toggleItemSelection = (ppeId) => {
    setSelectedItems(prevSelected => {
      if (selectionMode === 'single') {
        return prevSelected.includes(ppeId) ? [] : [ppeId];
      } else {
        return prevSelected.includes(ppeId)
          ? prevSelected.filter(id => id !== ppeId)
          : [...prevSelected, ppeId];
      }
    });
  };

  const handleAddPPE = async (e) => {
    e.preventDefault();
  
    if (!newPpe.name || !newPpe.description || !newPpe.stock || !newPpe.brand || !newPpe.ppeType) {
      setInputError('Please fill out all required fields.');
      return;
    }
  
    try {
      const ppeData = {
        name: newPpe.name,
        description: newPpe.description,
        stock: parseInt(newPpe.stock),
        brand: newPpe.brand,
        ppeType: newPpe.ppeType,
        size: newPpe.size,
        material: newPpe.material,
        color: newPpe.color,
        cost: newPpe.cost ? parseFloat(newPpe.cost) : null,
        location: newPpe.location,
        safetyStandard: newPpe.safetyStandard,
        expiryDate: newPpe.expiryDate || null,
        minStockLevel: parseInt(newPpe.minStockLevel) || 0,
        entryDate: newPpe.entryDate
      };
  
      const addedPPE = await apiFetch(`http://http://192.168.1.98:8080/api/ppe`, {
        method: 'POST',
        body: JSON.stringify(ppeData),
      });
  
      setPpeItems(prev => [...prev, addedPPE]);
      
      setNewPpe({
        name: '',
        description: '',
        stock: '',
        brand: '',
        ppeType: '',
        size: '',
        material: '',
        color: '',
        cost: '',
        location: '',
        safetyStandard: '',
        expiryDate: '',
        minStockLevel: '0',
        entryDate: new Date().toISOString().split('T')[0]
      });
      
      setSuccessMessage('PPE item added successfully!');
      setInputError('');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleModal();
      
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdatePPE = async (e) => {
    e.preventDefault();
  
    if (!updatedPpe.name || !updatedPpe.description || !updatedPpe.stock) {
      setInputError('Please fill out all required fields.');
      return;
    }
  
    try {
      const updateData = {
        name: updatedPpe.name,
        description: updatedPpe.description,
        stock: parseInt(updatedPpe.stock),
        brand: updatedPpe.brand,
        ppeType: updatedPpe.ppeType,
        size: updatedPpe.size,
        material: updatedPpe.material,
        color: updatedPpe.color,
        cost: updatedPpe.cost ? parseFloat(updatedPpe.cost) : null,
        location: updatedPpe.location,
        safetyStandard: updatedPpe.safetyStandard,
        expiryDate: updatedPpe.expiryDate || null,
        minStockLevel: parseInt(updatedPpe.minStockLevel) || 0,
        entryDate: updatedPpe.entryDate
      };

      const updatedPpeData = await apiFetch(`http://http://192.168.1.98:8080/api/ppe/${currentPpe.id}`, {
        method: 'PUT',
        headers: {
          'User-Email': userEmail || 'system@example.com'
        },
        body: JSON.stringify(updateData),
      });
  
      setPpeItems(prev =>
        prev.map(ppe => (ppe.id === updatedPpeData.id ? updatedPpeData : ppe))
      );
      setSuccessMessage('PPE item updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      toggleUpdateModal();
      
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const deletePPE = async (id) => {
    const confirmed = await window.appConfirm("Are you sure you want to delete this PPE item?");
    if (!confirmed) return;
  
    try {
      await apiFetch(`http://http://192.168.1.98:8080/api/ppe/${id}`, {
        method: 'DELETE',
        headers: {
          'User-Email': userEmail || 'system@example.com'
        },
      });
  
      setPpeItems(prevPpeItems => prevPpeItems.filter(ppe => ppe.id !== id));
      setSuccessMessage('PPE item deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      fetchStats();
    } catch (err) {
      setError(`Error deleting PPE item: ${err.message}`);
    }
  };
  
  const handleEditPPE = (ppe) => {
    setCurrentPpe(ppe);
    setUpdatedPpe({
      name: ppe.name,
      description: ppe.description,
      stock: ppe.stock,
      brand: ppe.brand,
      ppeType: ppe.ppeType,
      size: ppe.size || '',
      material: ppe.material || '',
      color: ppe.color || '',
      cost: ppe.cost || '',
      location: ppe.location || '',
      safetyStandard: ppe.safetyStandard || '',
      expiryDate: ppe.expiryDate ? new Date(ppe.expiryDate).toISOString().split('T')[0] : '',
      minStockLevel: ppe.minStockLevel || '0',
      entryDate: ppe.entryDate ? new Date(ppe.entryDate).toISOString().split('T')[0] : ''
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
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const formatCost = (cost) => {
    if (cost === null || cost === undefined || cost === '') return 'N/A';
    return `$${parseFloat(cost).toFixed(2)}`;
  };

  const isLowStock = (ppe) => {
    return ppe.stock <= ppe.minStockLevel;
  };

  const isExpiringSoon = (ppe) => {
    if (!ppe.expiryDate) return false;
    const expiryDate = new Date(ppe.expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
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
          onClick={() => setError(null)}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
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
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-3xl text-gray-900">PPE Inventory Management</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <label className="flex items-center">
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
              <label className="flex items-center">
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
            <div className="flex gap-2">
              <label className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                <ArrowUpTrayIcon className="h-5 w-5" />
                <span>Import CSV</span>
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
              
              <button 
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleExportCSV}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span>Export CSV</span>
              </button>
              
              <button 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors"
                onClick={toggleModal}
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add PPE</span>
              </button>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {import.meta.env.DEV && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
            <p><strong>Debug Info:</strong></p>
            <p>API Base URL: {API_BASE_URL}</p>
            <p>Token Present: {getAuthToken() ? 'Yes' : 'No'}</p>
            <p>PPE Items Count: {ppeItems.length}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total PPE Items</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                </div>
                <CubeIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStock} units</p>
                </div>
                <ArchiveBoxIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-600">{stats.lowStockCount}</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.totalValue?.toFixed(2) || '0.00'}</p>
                </div>
                <EyeIcon className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search PPE items..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchPPE(e.target.value);
                }}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>
          
          <div className="w-64">
            <div className="text-sm mb-2">Filter by PPE Type</div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {ppeTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <button 
            className="mt-6 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            onClick={() => {
              const filtered = selectedCategory ? 
                ppeItems.filter(ppe => ppe.ppeType === selectedCategory) : 
                ppeItems;
              setPpeItems(filtered);
            }}
          >
            Apply Filter
          </button>
        </div>

        {/* PPE Table */}
        <div className="overflow-hidden border border-gray-200 shadow-sm rounded-lg bg-white">
          <div className="p-0">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-4 border-b border-gray-200 w-12">
                    <div className="text-sm font-semibold">Select</div>
                  </th>
                  {["Name", "Code", "Type", "Size", "Brand", "Stock", "Cost", "Expiry", "Status", "Actions"].map((head) => (
                    <th key={head} className="p-4 border-b border-gray-200">
                      <div className="text-sm font-semibold">{head}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ppeItems.map((ppe, index) => (
                  <tr 
                    key={ppe.id} 
                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50/50 transition-colors`}
                  >
                    <td className="p-4 border-b border-gray-200">
                      <input
                        type="radio"
                        name="ppe-selection"
                        checked={selectedItems.includes(ppe.id)}
                        onChange={() => toggleItemSelection(ppe.id)}
                        className="hover:cursor-pointer"
                      />
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div className="text-sm font-medium">{ppe.name}</div>
                      {ppe.safetyStandard && (
                        <div className="text-xs text-gray-500">Standard: {ppe.safetyStandard}</div>
                      )}
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ppe.code || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                        {ppe.ppeType}
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div className="text-sm">{ppe.size || 'N/A'}</div>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div className="text-sm">{ppe.brand}</div>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isLowStock(ppe) ? 'bg-red-100 text-red-800' : 
                        ppe.stock > 10 ? 'bg-green-100 text-green-800' : 
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {`${ppe.stock} units`}
                        {isLowStock(ppe) && <ExclamationTriangleIcon className="h-3 w-3 ml-1" />}
                      </span>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div className="text-sm font-medium">{formatCost(ppe.cost)}</div>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div className="text-sm">{formatDate(ppe.expiryDate)}</div>
                      {isExpiringSoon(ppe) && (
                        <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                          <ClockIcon className="h-3 w-3" />
                          Expiring soon
                        </div>
                      )}
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div className="flex flex-col gap-1">
                        {isLowStock(ppe) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Low Stock
                          </span>
                        )}
                        {ppe.location && (
                          <span className="text-xs text-gray-500">Location: {ppe.location}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 border-b border-gray-200">
                      <div className="flex gap-2">
                        <button 
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          onClick={() => handleEditPPE(ppe)}
                          title="Edit PPE"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button 
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          onClick={() => deletePPE(ppe.id)}
                          title="Delete PPE"
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

        {ppeItems.length === 0 && (
          <div className="text-center py-12">
            <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No PPE items found</h3>
            <p className="text-gray-500 mt-2">Get started by adding your first PPE item.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-sm text-gray-600">
            PPE Inventory Management System © {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Add PPE Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 p-6 flex items-center gap-3">
              <PlusIcon className="h-6 w-6 text-blue-500" />
              <h5 className="text-xl font-semibold text-gray-900">Add New PPE Item</h5>
            </div>
            <div className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input 
                      type="text"
                      placeholder="PPE Item Name"
                      name="name" 
                      value={newPpe.name} 
                      onChange={handleInputChange} 
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                    <input 
                      type="text"
                      placeholder="Brand"
                      name="brand" 
                      value={newPpe.brand} 
                      onChange={handleInputChange} 
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PPE Type *</label>
                    <select
                      name="ppeType"
                      value={newPpe.ppeType}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Select Type</option>
                      {ppeTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <select
                      name="size"
                      value={newPpe.size}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Select Size</option>
                      {sizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                    <input 
                      type="number" 
                      placeholder="Stock Quantity"
                      name="stock" 
                      value={newPpe.stock} 
                      onChange={handleInputChange} 
                      required
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                    <input 
                      type="number"
                      placeholder="Cost"
                      name="cost" 
                      value={newPpe.cost} 
                      onChange={handleInputChange} 
                      step="0.01"
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                    <input 
                      type="text"
                      placeholder="Material"
                      name="material" 
                      value={newPpe.material} 
                      onChange={handleInputChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input 
                      type="text"
                      placeholder="Color"
                      name="color" 
                      value={newPpe.color} 
                      onChange={handleInputChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Safety Standard</label>
                    <select
                      name="safetyStandard"
                      value={newPpe.safetyStandard}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Select Standard</option>
                      {safetyStandards.map(standard => (
                        <option key={standard} value={standard}>{standard}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                    <input 
                      type="number"
                      placeholder="Minimum Stock Level"
                      name="minStockLevel" 
                      value={newPpe.minStockLevel} 
                      onChange={handleInputChange} 
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input 
                      type="date"
                      name="expiryDate"
                      value={newPpe.expiryDate}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
                    <input 
                      type="date"
                      name="entryDate"
                      value={newPpe.entryDate}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea 
                    placeholder="PPE Item Description"
                    name="description" 
                    value={newPpe.description} 
                    onChange={handleInputChange} 
                    required 
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input 
                    type="text"
                    placeholder="Storage Location"
                    name="location" 
                    value={newPpe.location} 
                    onChange={handleInputChange} 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
                
                <div className="text-sm text-gray-500">
                  * Required fields. Code will be generated automatically by the backend.
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
                onClick={handleAddPPE}
              >
                <PlusIcon className="h-4 w-4" />
                Add PPE Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update PPE Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 p-6 flex items-center gap-3">
              <PencilIcon className="h-6 w-6 text-blue-500" />
              <h5 className="text-xl font-semibold text-gray-900">Update PPE Item</h5>
            </div>
            <div className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input 
                      type="text"
                      placeholder="PPE Item Name"
                      name="name" 
                      value={updatedPpe.name} 
                      onChange={handleInputChange} 
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                    <input 
                      type="text"
                      placeholder="Brand"
                      name="brand" 
                      value={updatedPpe.brand} 
                      onChange={handleInputChange} 
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PPE Type *</label>
                    <select
                      name="ppeType"
                      value={updatedPpe.ppeType}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Select Type</option>
                      {ppeTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <select
                      name="size"
                      value={updatedPpe.size}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Select Size</option>
                      {sizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                    <input 
                      type="number" 
                      placeholder="Stock Quantity"
                      name="stock" 
                      value={updatedPpe.stock} 
                      onChange={handleInputChange} 
                      required
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                    <input 
                      type="number"
                      placeholder="Cost"
                      name="cost" 
                      value={updatedPpe.cost} 
                      onChange={handleInputChange} 
                      step="0.01"
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                    <input 
                      type="text"
                      placeholder="Material"
                      name="material" 
                      value={updatedPpe.material} 
                      onChange={handleInputChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input 
                      type="text"
                      placeholder="Color"
                      name="color" 
                      value={updatedPpe.color} 
                      onChange={handleInputChange} 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Safety Standard</label>
                    <select
                      name="safetyStandard"
                      value={updatedPpe.safetyStandard}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    >
                      <option value="">Select Standard</option>
                      {safetyStandards.map(standard => (
                        <option key={standard} value={standard}>{standard}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
                    <input 
                      type="number"
                      placeholder="Minimum Stock Level"
                      name="minStockLevel" 
                      value={updatedPpe.minStockLevel} 
                      onChange={handleInputChange} 
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input 
                      type="date"
                      name="expiryDate"
                      value={updatedPpe.expiryDate}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
                    <input 
                      type="date"
                      name="entryDate"
                      value={updatedPpe.entryDate}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea 
                    placeholder="PPE Item Description"
                    name="description" 
                    value={updatedPpe.description} 
                    onChange={handleInputChange} 
                    required 
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input 
                    type="text"
                    placeholder="Storage Location"
                    name="location" 
                    value={updatedPpe.location} 
                    onChange={handleInputChange} 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email for Audit Trail *</label>
                  <input
                    type="email"
                    placeholder="Enter your email for audit trail"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
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
                onClick={handleUpdatePPE}
              >
                <PencilIcon className="h-4 w-4" />
                Update PPE Item
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

export default PPES;