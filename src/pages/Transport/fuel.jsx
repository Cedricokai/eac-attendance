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

  const getAuthToken = () => {
    return localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  };

  const getFetchConfig = (method = 'GET', body = null) => {
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
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

  const fetchFuelEntries = async () => {
    setIsLoading(true);
    try {
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
        console.error("Failed to fetch fuel entries");
      }
    } catch (error) {
      console.error("Error fetching fuel entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
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
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, getFetchConfig());
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      } else {
        console.error("Failed to fetch drivers");
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const handleVehicleChange = (vehicleName) => {
    const selectedVehicle = vehicles.find(vehicle => vehicle.name === vehicleName);
    
    if (selectedVehicle && selectedVehicle.assignedDriver) {
      setFormData(prev => ({
        ...prev,
        vehicle: vehicleName,
        driver: selectedVehicle.assignedDriver
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
    
    try {
      const fuelData = {
        vehicle: formData.vehicle,
        driver: formData.driver,
        date: formData.date,
        litres: parseFloat(formData.litres),
        cost: parseFloat(formData.cost),
        odometer: parseInt(formData.odometer)
      };

      let response;
      if (editingId) {
        response = await fetch(`${API_BASE_URL}/api/fuel/${editingId}`, 
          getFetchConfig('PUT', fuelData));
      } else {
        response = await fetch(`${API_BASE_URL}/api/fuel`, 
          getFetchConfig('POST', fuelData));
      }

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
        } else {
          setFuelEntries([...fuelEntries, savedEntry]);
        }
        resetForm();
      } else {
        const errorText = await response.text();
        console.error('Server error:', errorText);
      }
    } catch (error) {
      console.error('Error saving fuel entry:', error);
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
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fuel record?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/fuel/${id}`, 
          getFetchConfig('DELETE'));

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return;
        }

        if (response.ok) {
          setFuelEntries(fuelEntries.filter(entry => entry.id !== id));
        } else {
          console.error('Failed to delete fuel entry');
        }
      } catch (error) {
        console.error('Error deleting fuel entry:', error);
      }
    }
  };

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
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <Sidebar />
        <div className="flex-1 p-6 flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const totalCost = fuelEntries.reduce((sum, r) => sum + parseFloat(r.cost || 0), 0);
  const totalLitres = fuelEntries.reduce((sum, r) => sum + parseFloat(r.litres || 0), 0);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-8">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                <p className="text-blue-100 text-sm">Total Cost</p>
                <p className="text-2xl font-bold">₵{totalCost.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                <p className="text-green-100 text-sm">Total Litres</p>
                <p className="text-2xl font-bold">{totalLitres.toFixed(2)} L</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg text-white">
                <p className="text-yellow-100 text-sm">Total Entries</p>
                <p className="text-2xl font-bold">{fuelEntries.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                <p className="text-purple-100 text-sm">Avg Cost/Litre</p>
                <p className="text-2xl font-bold">
                  {totalLitres > 0 ? `₵${(totalCost / totalLitres).toFixed(2)}` : "₵0.00"}
                </p>
              </div>
            </div>

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
                              {vehicle.name} - {vehicle.licensePlate}
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
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.fullName}>
                              {driver.fullName}
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

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Fuel Records</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {fuelEntries.length} record{fuelEntries.length !== 1 ? 's' : ''} found
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Litres
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Odometer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fuelEntries.map((entry) => (
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
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">
                          {entry.litres} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-green-600 font-bold">₵{entry.cost}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {entry.odometer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
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
              
              {fuelEntries.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">⛽</div>
                  <p className="text-gray-500 text-lg">No fuel records found</p>
                  <p className="text-gray-400 text-sm mt-2">Add your first fuel entry to get started</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                  >
                    Add First Entry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fuel;