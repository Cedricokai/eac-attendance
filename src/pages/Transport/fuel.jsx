import React, { useState, useEffect } from "react";
import Sidebar from './Sidebar';

const Fuel = () => {
  const [fuelEntries, setFuelEntries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({
    vehicle: "",
    driver: "",
    date: "",
    litres: "",
    cost: "",
    odometer: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Vehicle filter states
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [vehicleSummary, setVehicleSummary] = useState({
    totalCost: 0,
    totalLitres: 0,
    entryCount: 0,
    avgCostPerLitre: 0
  });
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState(null);

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    
    console.log("🖥️ Current hostname:", hostname);

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("🏠 Using LOCALHOST API URL");
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      console.log("🏠 Using LAN API URL");
      return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://localhost:8080";
    }

    if (hostname === "100.114.178.13") {
      console.log("🌐 Using PUBLIC API URL");
      return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
    }

    console.log("🌍 Using default API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
  };

  const API_BASE_URL = getApiBaseUrl();

  const getAuthToken = () => {
    return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  };

  const getFetchConfig = (method = 'GET', body = null) => {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
      credentials: 'include'
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    return config;
  };

  useEffect(() => {
    fetchFuelEntries();
    fetchVehicles();
    fetchDrivers();
  }, []);

  // Update filtered entries when fuelEntries or selectedVehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      const filtered = fuelEntries.filter(entry => entry.vehicle === selectedVehicle);
      setFilteredEntries(filtered);
      calculateVehicleSummary(filtered, selectedVehicle);
    } else {
      setFilteredEntries(fuelEntries);
      setVehicleSummary({ totalCost: 0, totalLitres: 0, entryCount: 0, avgCostPerLitre: 0 });
    }
  }, [fuelEntries, selectedVehicle]);

  const fetchFuelEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please login again.');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/fuel`, getFetchConfig());
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setFuelEntries(data);
      } else {
        throw new Error(`Failed to fetch fuel entries: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error fetching fuel entries:", error);
      setError(error.message);
      setFuelEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No authentication token found');
        setVehicles([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/vehicles`, getFetchConfig());
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      } else {
        console.error("Failed to fetch vehicles");
        setVehicles([]);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicles([]);
    }
  };

  const fetchDrivers = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No authentication token found');
        setDrivers([]);
        return;
      }

      const endpoints = ['/api/drivers', '/api/users'];
      let driversData = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, getFetchConfig());
          
          if (response.ok) {
            const data = await response.json();
            driversData = Array.isArray(data) ? data : [data];
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${endpoint}:`, err);
        }
      }
      
      setDrivers(driversData);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setDrivers([]);
    }
  };

  const handleVehicleChange = (vehicleName) => {
    const selectedVehicleObj = vehicles.find(vehicle => vehicle.name === vehicleName);
    
    if (selectedVehicleObj && selectedVehicleObj.assignedDriver) {
      setFormData(prev => ({
        ...prev,
        vehicle: vehicleName,
        driver: selectedVehicleObj.assignedDriver
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vehicle: vehicleName,
        driver: ""
      }));
    }
  };

  const handleDriverChange = (driverName) => {
    setFormData(prev => ({
      ...prev,
      driver: driverName
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.vehicle || !formData.driver || !formData.date || !formData.litres || !formData.cost || !formData.odometer) {
      setError('Please fill out all required fields.');
      return;
    }

    if (parseFloat(formData.litres) <= 0 || parseFloat(formData.cost) <= 0 || parseInt(formData.odometer) <= 0) {
      setError('Please enter valid positive values for litres, cost, and odometer.');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        setError('No authentication token found. Please login again.');
        return;
      }

      const fuelData = {
        vehicle: formData.vehicle,
        driver: formData.driver,
        date: formData.date,
        litres: parseFloat(formData.litres),
        cost: parseFloat(formData.cost),
        odometer: parseInt(formData.odometer)
      };

      let url = `${API_BASE_URL}/api/fuel`;
      let method = 'POST';
      
      if (editingId) {
        url = `${API_BASE_URL}/api/fuel/${editingId}`;
        method = 'PUT';
      }

      const response = await fetch(url, getFetchConfig(method, fuelData));

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const savedEntry = await response.json();
        if (editingId) {
          setFuelEntries(fuelEntries.map(entry => 
            entry.id === editingId ? savedEntry : entry
          ));
          setSuccessMessage('Fuel entry updated successfully!');
        } else {
          setFuelEntries([...fuelEntries, savedEntry]);
          setSuccessMessage('Fuel entry added successfully!');
        }
        setTimeout(() => setSuccessMessage(''), 3000);
        resetForm();
      } else {
        const errorText = await response.text();
        setError(`Failed to save fuel entry: ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving fuel entry:', error);
      setError(`Error saving fuel entry: ${error.message}`);
    }
  };

  const handleEdit = (entry) => {
    const dateValue = entry.date ? entry.date.split('T')[0] : '';
    
    setFormData({
      vehicle: entry.vehicle || "",
      driver: entry.driver || "",
      date: dateValue,
      litres: entry.litres ? entry.litres.toString() : "",
      cost: entry.cost ? entry.cost.toString() : "",
      odometer: entry.odometer ? entry.odometer.toString() : "",
    });
    setEditingId(entry.id);
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fuel record?")) {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/api/fuel/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }

        if (response.ok) {
          setFuelEntries(fuelEntries.filter(entry => entry.id !== id));
          setSuccessMessage('Fuel entry deleted successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
        } else {
          const errorText = await response.text();
          setError(`Failed to delete fuel entry: ${errorText}`);
        }
      } catch (error) {
        console.error('Error deleting fuel entry:', error);
        setError('Error deleting fuel entry');
      }
    }
  };

  // Reset form function (ONLY ONE DECLARATION)
  const resetForm = () => {
    setFormData({
      vehicle: "",
      driver: "",
      date: "",
      litres: "",
      cost: "",
      odometer: "",
    });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  // Vehicle filter functions
  const handleVehicleFilter = (vehicleName) => {
    setSelectedVehicle(vehicleName);
  };

  const clearVehicleFilter = () => {
    setSelectedVehicle("");
  };

  const calculateVehicleSummary = (entries, vehicleName) => {
    if (!vehicleName || entries.length === 0) {
      setVehicleSummary({ totalCost: 0, totalLitres: 0, entryCount: 0, avgCostPerLitre: 0 });
      return;
    }
    
    const totalCost = entries.reduce((sum, e) => sum + parseFloat(e.cost || 0), 0);
    const totalLitres = entries.reduce((sum, e) => sum + parseFloat(e.litres || 0), 0);
    const entryCount = entries.length;
    const avgCostPerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;
    
    setVehicleSummary({ totalCost, totalLitres, entryCount, avgCostPerLitre });
  };

  // Get detailed vehicle summary for modal
  const getVehicleDetails = (vehicleName) => {
    const vehicleEntries = fuelEntries.filter(e => e.vehicle === vehicleName);
    const totalCost = vehicleEntries.reduce((sum, e) => sum + parseFloat(e.cost || 0), 0);
    const totalLitres = vehicleEntries.reduce((sum, e) => sum + parseFloat(e.litres || 0), 0);
    const entryCount = vehicleEntries.length;
    const avgCostPerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;
    
    // Get date range
    const dates = vehicleEntries.map(e => new Date(e.date)).filter(d => !isNaN(d));
    const earliestDate = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString() : 'N/A';
    const latestDate = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString() : 'N/A';
    
    // Get recent entries
    const recentEntries = [...vehicleEntries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    return {
      vehicleName,
      totalCost,
      totalLitres,
      entryCount,
      avgCostPerLitre,
      earliestDate,
      latestDate,
      recentEntries
    };
  };

  const showVehicleFuelDetails = (vehicleName) => {
    const details = getVehicleDetails(vehicleName);
    setSelectedVehicleDetails(details);
    setShowVehicleModal(true);
  };

  const getVehicleTotalCost = (vehicleName) => {
    const vehicleEntries = fuelEntries.filter(e => e.vehicle === vehicleName);
    return vehicleEntries.reduce((sum, e) => sum + parseFloat(e.cost || 0), 0);
  };

  const getVehicleTotalLitres = (vehicleName) => {
    const vehicleEntries = fuelEntries.filter(e => e.vehicle === vehicleName);
    return vehicleEntries.reduce((sum, e) => sum + parseFloat(e.litres || 0), 0);
  };

  // Get unique vehicles with their totals
  const getVehicleTotals = () => {
    const vehicleMap = new Map();
    
    fuelEntries.forEach(entry => {
      if (!vehicleMap.has(entry.vehicle)) {
        vehicleMap.set(entry.vehicle, { totalCost: 0, totalLitres: 0, count: 0 });
      }
      const current = vehicleMap.get(entry.vehicle);
      current.totalCost += parseFloat(entry.cost || 0);
      current.totalLitres += parseFloat(entry.litres || 0);
      current.count += 1;
      vehicleMap.set(entry.vehicle, current);
    });
    
    return Array.from(vehicleMap.entries()).map(([vehicle, data]) => ({
      vehicle,
      totalCost: data.totalCost,
      totalLitres: data.totalLitres,
      count: data.count,
      avgCostPerLitre: data.totalLitres > 0 ? data.totalCost / data.totalLitres : 0
    }));
  };

  const getDriverNames = () => {
    if (!drivers || drivers.length === 0) {
      return [];
    }

    return drivers
      .map(driver => {
        if (driver.driverName) {
          return driver.driverName.trim();
        } else if (driver.fullName) {
          return driver.fullName.trim();
        } else if (driver.name) {
          return driver.name.trim();
        } else if (driver.firstName && driver.lastName) {
          return `${driver.firstName} ${driver.lastName}`.trim();
        }
        return '';
      })
      .filter(name => name !== '')
      .filter((name, index, self) => self.indexOf(name) === index);
  };

  const driverNames = getDriverNames();
  const totalCost = fuelEntries.reduce((sum, r) => sum + parseFloat(r.cost || 0), 0);
  const totalLitres = fuelEntries.reduce((sum, r) => sum + parseFloat(r.litres || 0), 0);
  const vehicleTotals = getVehicleTotals();

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <Sidebar />
        <div className="flex-1 p-6 flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading fuel records...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <Sidebar />
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <div className="max-w-md p-6 bg-red-50 border border-red-400 text-red-700 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Error Loading Fuel Records</h2>
            <p className="mb-4">{error}</p>
            <div className="flex space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p>{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {successMessage}
              </div>
            )}

            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">⛽ Fuel Records Dashboard</h2>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-lg"
              >
                <span>+</span>
                Add Fuel Entry
              </button>
            </div>

            {/* Global Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                <p className="text-blue-100 text-sm">Total Cost (All Vehicles)</p>
                <p className="text-2xl font-bold">₵{totalCost.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                <p className="text-green-100 text-sm">Total Litres (All Vehicles)</p>
                <p className="text-2xl font-bold">{totalLitres.toFixed(2)} L</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg text-white">
                <p className="text-yellow-100 text-sm">Total Entries</p>
                <p className="text-2xl font-bold">{fuelEntries.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                <p className="text-purple-100 text-sm">Avg Cost/Litre (All)</p>
                <p className="text-2xl font-bold">
                  {totalLitres > 0 ? `₵${(totalCost / totalLitres).toFixed(2)}` : "₵0.00"}
                </p>
              </div>
            </div>

            {/* Vehicle Filter and Summary Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">🚗 Vehicle Fuel Summary</h3>
                {selectedVehicle && (
                  <button
                    onClick={clearVehicleFilter}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear Filter ✕
                  </button>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Vehicle Selection Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Vehicle
                  </label>
                  <select
                    value={selectedVehicle}
                    onChange={(e) => handleVehicleFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- All Vehicles --</option>
                    {vehicleTotals.map((item, index) => (
                      <option key={index} value={item.vehicle}>
                        {item.vehicle} - ₵{item.totalCost.toFixed(2)} ({item.count} entries)
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Vehicle Summary Stats (shown when filter is active) */}
                {selectedVehicle && vehicleSummary.entryCount > 0 && (
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="text-xl">📊</span>
                      Summary for: {selectedVehicle}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center bg-white rounded-lg p-2">
                        <p className="text-xs text-gray-500">Total Cost</p>
                        <p className="text-lg font-bold text-green-600">
                          ₵{vehicleSummary.totalCost.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center bg-white rounded-lg p-2">
                        <p className="text-xs text-gray-500">Total Litres</p>
                        <p className="text-lg font-bold text-blue-600">
                          {vehicleSummary.totalLitres.toFixed(2)} L
                        </p>
                      </div>
                      <div className="text-center bg-white rounded-lg p-2">
                        <p className="text-xs text-gray-500">Entries</p>
                        <p className="text-lg font-bold text-purple-600">
                          {vehicleSummary.entryCount}
                        </p>
                      </div>
                      <div className="text-center bg-white rounded-lg p-2">
                        <p className="text-xs text-gray-500">Avg Cost/L</p>
                        <p className="text-lg font-bold text-orange-600">
                          ₵{vehicleSummary.avgCostPerLitre.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* No entries message */}
                {selectedVehicle && vehicleSummary.entryCount === 0 && (
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                    <p className="text-yellow-700 text-center">
                      No fuel records found for {selectedVehicle}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Totals Table (All vehicles with their cumulative costs) */}
            {vehicleTotals.length > 0 && !selectedVehicle && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-lg font-semibold text-gray-800">🚚 Fuel Cost by Vehicle</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Click "View Records" to see detailed fuel history
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total Cost (₵)
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total Litres (L)
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Entries
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Avg Cost/L (₵)
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vehicleTotals.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                              <span className="font-medium text-gray-900">{item.vehicle}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-green-600 font-bold">₵{item.totalCost.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-blue-600 font-semibold">{item.totalLitres.toFixed(2)} L</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
                              {item.count}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-purple-600">₵{item.avgCostPerLitre.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleVehicleFilter(item.vehicle)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:border-blue-300 transition"
                            >
                              View Records
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-6 py-4 font-bold text-gray-900">GRAND TOTAL</td>
                        <td className="px-6 py-4 text-right font-bold text-green-700">
                          ₵{totalCost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-blue-700">
                          {totalLitres.toFixed(2)} L
                        </td>
                        <td className="px-6 py-4 text-center font-bold">
                          {fuelEntries.length}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-purple-700">
                          ₵{(totalCost / totalLitres).toFixed(2)}
                        </td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Fuel Records Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  Fuel Records {selectedVehicle ? `- ${selectedVehicle}` : ''}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {(selectedVehicle ? filteredEntries : fuelEntries).length} 
                  record{(selectedVehicle ? filteredEntries : fuelEntries).length !== 1 ? 's' : ''} found
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Litres
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Odometer
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(selectedVehicle ? filteredEntries : fuelEntries).map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                            <span className="font-medium text-gray-900">{entry.vehicle}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {entry.driver}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                            {entry.date ? entry.date.split('T')[0] : entry.date}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 font-semibold">
                          {entry.litres} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-green-600 font-bold">₵{entry.cost}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                          {entry.odometer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded border border-blue-200 hover:border-blue-300 transition duration-150"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-1 rounded border border-red-200 hover:border-red-300 transition duration-150"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {(selectedVehicle ? filteredEntries : fuelEntries).length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">⛽</div>
                  <p className="text-gray-500 text-lg">No fuel records found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {selectedVehicle 
                      ? `No records for ${selectedVehicle}. Try selecting a different vehicle.`
                      : 'Add your first fuel entry to get started'}
                  </p>
                  {!selectedVehicle && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                    >
                      Add First Entry
                    </button>
                  )}
                  {selectedVehicle && (
                    <button
                      onClick={clearVehicleFilter}
                      className="mt-4 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition duration-200"
                    >
                      View All Vehicles
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">
                  {editingId ? "Edit Fuel Entry" : "Add New Fuel Entry"}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  <p>{error}</p>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle *
                  </label>
                  <select
                    value={formData.vehicle}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.name}>
                        {vehicle.name} - {vehicle.dvla || 'No DVLA'}
                        {vehicle.assignedDriver ? ` (${vehicle.assignedDriver})` : ''}
                      </option>
                    ))}
                  </select>
                  {formData.vehicle && vehicles.find(v => v.name === formData.vehicle)?.assignedDriver && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Driver auto-populated from vehicle assignment
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver *
                  </label>
                  <select
                    value={formData.driver}
                    onChange={(e) => handleDriverChange(e.target.value)}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Driver</option>
                    {driverNames.map((name, index) => (
                      <option key={index} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {formData.driver && formData.vehicle && 
                  formData.driver === vehicles.find(v => v.name === formData.vehicle)?.assignedDriver && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✓ Matches assigned driver for this vehicle
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Litres (L) *
                  </label>
                  <input
                    type="number"
                    value={formData.litres}
                    onChange={(e) => setFormData({ ...formData, litres: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost (₵) *
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Odometer *
                  </label>
                  <input
                    type="number"
                    value={formData.odometer}
                    onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                    required
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter odometer reading"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
                >
                  {editingId ? "Update Entry" : "Save Entry"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition duration-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Details Modal */}
      {showVehicleModal && selectedVehicleDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🚗</span>
                  <div>
                    <h3 className="text-xl font-semibold">Fuel Summary Report</h3>
                    <p className="text-blue-100 text-sm">{selectedVehicleDetails.vehicleName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVehicleModal(false)}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-xl font-bold text-green-600">
                    ₵{selectedVehicleDetails.totalCost.toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                  <p className="text-xs text-gray-500">Total Litres</p>
                  <p className="text-xl font-bold text-blue-600">
                    {selectedVehicleDetails.totalLitres.toFixed(2)} L
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
                  <p className="text-xs text-gray-500">Total Entries</p>
                  <p className="text-xl font-bold text-purple-600">
                    {selectedVehicleDetails.entryCount}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-200">
                  <p className="text-xs text-gray-500">Avg Cost/Litre</p>
                  <p className="text-xl font-bold text-orange-600">
                    ₵{selectedVehicleDetails.avgCostPerLitre.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Date Range */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">First Record</p>
                    <p className="font-medium text-gray-800">{selectedVehicleDetails.earliestDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Record</p>
                    <p className="font-medium text-gray-800">{selectedVehicleDetails.latestDate}</p>
                  </div>
                </div>
              </div>
              
              {/* Recent Entries */}
              {selectedVehicleDetails.recentEntries.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Recent Fuel Records</h4>
                  <div className="space-y-2">
                    {selectedVehicleDetails.recentEntries.map((entry, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">
                            {new Date(entry.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">Driver: {entry.driver}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-600 font-bold">₵{entry.cost}</p>
                          <p className="text-sm text-gray-500">{entry.litres} L</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowVehicleModal(false);
                    handleVehicleFilter(selectedVehicleDetails.vehicleName);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  View All Records
                </button>
                <button
                  onClick={() => setShowVehicleModal(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fuel;