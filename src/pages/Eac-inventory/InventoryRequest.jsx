import React, { useState, useEffect, useMemo } from "react";

const InventoryRequest = () => {
  const [products, setProducts] = useState([]);
  const [ppeItems, setPpeItems] = useState([]);
  const [requestType, setRequestType] = useState("inventory");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedPpes, setSelectedPpes] = useState([]);
  const [urgency, setUrgency] = useState("normal");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [job, setJob] = useState("");
  const [showManualJobInput, setShowManualJobInput] = useState(false);
  const [manualJob, setManualJob] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");

  const [employeeDetails, setEmployeeDetails] = useState({
    name: "",
    employeeId: "",
    department: "",
    position: "",
    supervisor: "",
    location: "",
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  });

  const [manualLocation, setManualLocation] = useState("");
  const [requestLocation, setRequestLocation] = useState("");

  const jobList = [
    { id: "general", name: "General Maintenance" },
    { id: "electrical", name: "Electrical Repair" },
    { id: "plumbing", name: "Plumbing Work" },
    { id: "hvac", name: "HVAC Maintenance" },
    { id: "construction", name: "Construction Project" },
    { id: "safety", name: "Safety Inspection" },
    { id: "renovation", name: "Renovation Work" },
    { id: "emergency", name: "Emergency Repair" },
    { id: "preventive", name: "Preventive Maintenance" },
    { id: "project-a", name: "Project Alpha - Phase 2" },
    { id: "project-b", name: "Project Beta - Installation" }
  ];

  const locationOptions = [
    { value: 'AHAFO_NORTH', label: 'AHAFO NORTH' },
    { value: 'NPI', label: 'NPI' },
    { value: 'LAYDOWN', label: 'LAYDOWN' },
    { value: 'MKV', label: 'MKV' },
    { value: 'SUG', label: 'SUG' },
    { value: 'PROCESS PLANT', label: 'PROCESS PLANT' },
    { value: 'AROPLANT', label: 'AROPLANT' },
    { value: 'PLANT SITE', label: 'PLANT SITE' }
  ];

  const [ppeItemsList, setPpeItemsList] = useState([]);

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

  const fetchUserDetails = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('username');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Failed to fetch user details: ${response.status}`);
      }

      const userData = await response.json();
      
      setEmployeeDetails(prev => ({
        ...prev,
        name: userData.fullName || userData.username || "Employee",
        employeeId: userData.employeeId || userData.username || "N/A",
        department: userData.department || "Not specified",
        position: userData.position || userData.role?.replace('ROLE_', '') || "Employee",
        supervisor: userData.supervisor || "Not specified",
        location: userData.location || "Not specified"
      }));

      if (userData.location) {
        setRequestLocation(userData.location);
      }

      setContactPerson(userData.fullName || userData.username || "");

    } catch (err) {
      console.error("Error fetching user details:", err);
      const username = localStorage.getItem('username');
      if (username) {
        setEmployeeDetails(prev => ({
          ...prev,
          name: username,
          employeeId: username
        }));
        setContactPerson(username);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        await fetchUserDetails();
        
        const token = localStorage.getItem('jwtToken');
        if (!token) {
          throw new Error("No authentication token found");
        }

        const productsResponse = await fetch(`${API_BASE_URL}/api/products`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (!productsResponse.ok) {
          if (productsResponse.status === 403) {
            throw new Error("Access denied: You don't have permission to view products");
          }
          throw new Error(`Network response was not ok: ${productsResponse.status}`);
        }

        const productsData = await productsResponse.json();
        setProducts(productsData);

        const ppeItemsFromProducts = productsData
          .filter(product => product.ppe === true)
          .map(product => ({
            id: product.id,
            name: product.name,
            ppeType: product.productType || "Safety Equipment",
            stock: product.stock,
            code: product.code
          }));
        
        setPpeItemsList(ppeItemsFromProducts);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
   
    fetchData();
  }, []);

  const getFinalLocation = () => {
    if (requestLocation === 'other' && manualLocation.trim()) {
      return manualLocation;
    }
    if (requestLocation && requestLocation !== 'other') {
      const selectedLocation = locationOptions.find(loc => loc.value === requestLocation);
      return selectedLocation ? selectedLocation.label : requestLocation;
    }
    return employeeDetails.location || "";
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm && searchCategory === "all") return products;
    
    return products.filter(product => {
      const matchesSearch = searchTerm 
        ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.code?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      const matchesCategory = searchCategory !== "all"
        ? product.productType?.toLowerCase().includes(searchCategory.toLowerCase())
        : true;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, searchCategory]);

  const categories = useMemo(() => {
    const cats = products
      .map(p => p.productType)
      .filter((cat, index, self) => cat && self.indexOf(cat) === index);
    return ["all", ...cats];
  }, [products]);

  const handleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      const product = products.find(p => p.id === productId);
      if (!product) return prev;
      
      const exists = prev.find(p => p.id === productId);
      if (exists) {
        return prev.filter(p => p.id !== productId);
      } else {
        return [...prev, {
          id: productId,
          name: product.name,
          code: product.code,
          stock: product.stock,
          productType: product.productType,
          quantity: 1
        }];
      }
    });
  };

  const handleProductQuantityChange = (productId, quantity) => {
    if (quantity < 1) return;
    
    setSelectedProducts(prev => 
      prev.map(product => 
        product.id === productId 
          ? { ...product, quantity: parseInt(quantity) || 1 }
          : product
      )
    );
  };

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handlePpeSelection = (ppeId) => {
    setSelectedPpes(prev => {
      const ppe = ppeItemsList.find(p => p.id === ppeId);
      if (!ppe) return prev;
      
      const exists = prev.find(p => p.id === ppeId);
      if (exists) {
        return prev.filter(p => p.id !== ppeId);
      } else {
        return [...prev, {
          id: ppeId,
          name: ppe.name,
          ppeType: ppe.ppeType,
          stock: ppe.stock || 0,
          code: ppe.code,
          quantity: 1
        }];
      }
    });
  };

  const handlePpeQuantityChange = (ppeId, quantity) => {
    if (quantity < 1) return;
    
    setSelectedPpes(prev => 
      prev.map(ppe => 
        ppe.id === ppeId 
          ? { ...ppe, quantity: parseInt(quantity) || 1 }
          : ppe
      )
    );
  };

  const removePpeItem = (ppeId) => {
    setSelectedPpes(prev => prev.filter(p => p.id !== ppeId));
  };

  const handleJobChange = (e) => {
    const value = e.target.value;
    setJob(value);
    if (value === "other") {
      setShowManualJobInput(true);
      setManualJob("");
    } else {
      setShowManualJobInput(false);
      setManualJob("");
    }
  };

  const handleManualJobChange = (e) => {
    setManualJob(e.target.value);
  };

  const getFinalJob = () => {
    if (job === "other" && manualJob.trim()) {
      return manualJob;
    }
    if (job && job !== "other") {
      const selectedJob = jobList.find(j => j.id === job);
      return selectedJob ? selectedJob.name : "";
    }
    return "";
  };

  const getTotalQuantity = () => {
    if (requestType === "inventory") {
      return selectedProducts.reduce((total, product) => total + product.quantity, 0);
    } else {
      return selectedPpes.reduce((total, ppe) => total + ppe.quantity, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!requestType) {
        setMessage("❌ Please select request type");
        return;
    }

    const finalJob = getFinalJob();
    if (!finalJob) {
        setMessage("❌ Please select or enter a job description");
        return;
    }

    if (requestType === "inventory" && selectedProducts.length === 0) {
        setMessage("❌ Please select at least one product");
        return;
    }

    if (requestType === "ppe" && selectedPpes.length === 0) {
        setMessage("❌ Please select at least one PPE item");
        return;
    }

    if (requestType === "inventory") {
      for (const product of selectedProducts) {
        if (!product.quantity || product.quantity < 1) {
          setMessage(`❌ Please enter a valid quantity for ${product.name}`);
          return;
        }
        if (product.quantity > product.stock) {
          setMessage(`❌ Quantity for ${product.name} exceeds available stock (${product.stock})`);
          return;
        }
      }
    }

    if (requestType === "ppe") {
      for (const ppe of selectedPpes) {
        if (!ppe.quantity || ppe.quantity < 1) {
          setMessage(`❌ Please enter a valid quantity for ${ppe.name}`);
          return;
        }
        if (ppe.stock && ppe.quantity > ppe.stock) {
          setMessage(`❌ Quantity for ${ppe.name} exceeds available stock (${ppe.stock})`);
          return;
        }
      }
    }

    const token = localStorage.getItem("jwtToken");
    const username = localStorage.getItem("username") || employeeDetails.name || "Employee";

    try {
        setMessage("⏳ Submitting request...");
        
        let requestDTO;
        
        if (requestType === "inventory") {
          requestDTO = {
            items: selectedProducts.map(product => ({
              productId: product.id,
              quantity: product.quantity,
              notes: `Requested for ${finalJob} - ${product.name}`.substring(0, 500)
            })),
            requestedBy: username,
            department: employeeDetails.department,
            projectName: finalJob,
            jobDescription: finalJob,
            location: requestLocation || employeeDetails.location,
            notes: additionalNotes ? additionalNotes.substring(0, 1000) : `Inventory request for ${selectedProducts.length} items`,
            urgency: urgency,
            ppeRequest: false,
            contactPerson: contactPerson.substring(0, 100),
            contactPhone: contactPhone ? contactPhone.substring(0, 20) : ""
          };
        } else {
          requestDTO = {
            items: selectedPpes.map(ppe => ({
              productId: ppe.id,
              quantity: ppe.quantity,
              notes: `PPE Request for ${finalJob} - ${ppe.name}`.substring(0, 500)
            })),
            requestedBy: username,
            department: employeeDetails.department,
            projectName: finalJob,
            location: getFinalLocation(),
            notes: additionalNotes ? additionalNotes.substring(0, 1000) : `PPE request for ${selectedPpes.length} items`,
            urgency: urgency,
            ppeRequest: true,
            contactPerson: contactPerson.substring(0, 100),
            contactPhone: contactPhone ? contactPhone.substring(0, 20) : ""
          };
        }

        console.log('Submitting request:', JSON.stringify(requestDTO, null, 2));
        
        const endpoint = `${API_BASE_URL}/api/inventory-requests`;
        
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(requestDTO),
        });

        console.log('Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Request created:', result);
            
            setMessage(`✅ ${requestType === 'ppe' ? 'PPE' : 'Inventory'} request #${result.requestNumber} submitted successfully!`);
            
            setSelectedProducts([]);
            setSelectedPpes([]);
            setUrgency("normal");
            setAdditionalNotes("");
            setContactPhone("");
            setJob("");
            setManualJob("");
            setShowManualJobInput(false);
            setSearchTerm("");
            setSearchCategory("all");
        } else {
            let errorText = '';
            try {
                errorText = await response.text();
                console.error('Error response text:', errorText);
            } catch (textError) {
                errorText = 'Could not read error message';
            }
            
            if (response.status === 403) {
                setMessage("❌ Access denied: You don't have permission to create requests");
            } else if (response.status === 400) {
                setMessage(`❌ Bad request: ${errorText.substring(0, 200)}`);
            } else if (response.status === 500) {
                setMessage("❌ Server error: Please contact administrator");
            } else {
                setMessage(`❌ Failed to send request (${response.status}): ${errorText.substring(0, 200)}`);
            }
        }
    } catch (error) {
        console.error("Error sending request:", error);
        setMessage("❌ Error connecting to server: " + error.message);
    }
  };

  useEffect(() => {
    setSelectedProducts([]);
    setSelectedPpes([]);
  }, [requestType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="text-lg font-semibold">Error: {error}</h2>
          <p className="mt-2 text-sm">Please check your permissions or contact administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border border-blue-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                Inventory & PPE Request System
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Submit requests for tools, materials, and safety equipment
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Request Date</div>
              <div className="font-semibold text-gray-700 dark:text-gray-300">{employeeDetails.date}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-500 dark:text-gray-400">Employee</div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {employeeDetails.name || "Loading..."}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {employeeDetails.employeeId || "N/A"}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-500 dark:text-gray-400">Department</div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {employeeDetails.department || "Not specified"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {employeeDetails.position || "Employee"}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-500 dark:text-gray-400">Supervisor</div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {employeeDetails.supervisor || "Not specified"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Team Lead</div>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-500 dark:text-gray-400">Default Location</div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">
                {employeeDetails.location || "Not specified"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Worksite</div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            Request Details
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                  Worksite / Location *
                </label>
                <select
                  value={requestLocation}
                  onChange={(e) => setRequestLocation(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select worksite/location</option>
                  {locationOptions.map((location) => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                  <option value="other">Other (Specify below)</option>
                </select>
                
                {requestLocation === 'other' && (
                  <div className="mt-3 transition-all duration-300 ease-in-out">
                    <input
                      type="text"
                      value={manualLocation || ''}
                      onChange={(e) => setManualLocation(e.target.value)}
                      placeholder="Enter custom location"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={requestLocation === 'other'}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter specific location details (Building, Wing, Room, etc.)
                    </p>
                  </div>
                )}
                
                {requestLocation && requestLocation !== 'other' && requestLocation !== '' && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400">📍</span>
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        Location: {locationOptions.find(loc => loc.value === requestLocation)?.label || requestLocation}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                  Job / Project / Task *
                </label>
                <div className="space-y-3">
                  <select
                    value={job}
                    onChange={handleJobChange}
                    required
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Job / Project --</option>
                    {jobList.map((jobItem) => (
                      <option key={jobItem.id} value={jobItem.id}>
                        {jobItem.name}
                      </option>
                    ))}
                    <option value="other">-- Other (Specify below) --</option>
                  </select>
                  
                  {showManualJobInput && (
                    <div className="transition-all duration-300 ease-in-out">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2 text-sm">
                        Please specify the job / project:
                      </label>
                      <input
                        type="text"
                        value={manualJob}
                        onChange={handleManualJobChange}
                        placeholder="Enter job description"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required={showManualJobInput}
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Be specific to help us process your request faster
                      </p>
                    </div>
                  )}
                  
                  {job && job !== "other" && !showManualJobInput && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 dark:text-blue-400">✓</span>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">
                          Selected: {jobList.find(j => j.id === job)?.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-4 font-medium">
                  Request Type *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRequestType("inventory")}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      requestType === "inventory"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300"
                    }`}
                  >
                    <div className="font-medium">Inventory Items</div>
                    <div className="text-sm mt-1">Tools, Materials, Equipment</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setRequestType("ppe")}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      requestType === "ppe"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-300"
                    }`}
                  >
                    <div className="font-medium">PPE Items</div>
                    <div className="text-sm mt-1">Safety Equipment & Gear</div>
                  </button>
                </div>
              </div>

              {(requestType === "inventory" && selectedProducts.length > 0) && (
                <div className="mt-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-blue-800 dark:text-blue-300">
                        Selected Products ({selectedProducts.length})
                      </h4>
                      <div className="text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                        Total Items: {getTotalQuantity()}
                      </div>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {selectedProducts.map(product => (
                        <div 
                          key={product.id}
                          className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border border-blue-100 dark:border-blue-800"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Code: {product.code} | Stock: {product.stock}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                max={product.stock}
                                value={product.quantity}
                                onChange={(e) => handleProductQuantityChange(product.id, e.target.value)}
                                className="w-16 border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-600 dark:text-gray-200 text-center text-sm"
                              />
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => removeProduct(product.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(requestType === "ppe" && selectedPpes.length > 0) && (
                <div className="mt-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-green-800 dark:text-green-300">
                        Selected PPE Items ({selectedPpes.length})
                      </h4>
                      <div className="text-sm bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                        Total Items: {getTotalQuantity()}
                      </div>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {selectedPpes.map(ppe => (
                        <div 
                          key={ppe.id}
                          className="flex items-center justify-between bg-white dark:bg-gray-700 p-3 rounded-lg border border-green-100 dark:border-green-800"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                              {ppe.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Code: {ppe.code} | Stock: {ppe.stock || 0}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                max={ppe.stock || 100}
                                value={ppe.quantity}
                                onChange={(e) => handlePpeQuantityChange(ppe.id, e.target.value)}
                                className="w-16 border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-600 dark:text-gray-200 text-center text-sm"
                              />
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => removePpeItem(ppe.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      required
                      placeholder="Your name"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder={
                      requestType === "ppe" 
                        ? "Any special requirements, sizes, or safety considerations..."
                        : "Any special instructions, delivery requirements, or additional information..."
                    }
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {requestType === "inventory" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium">
                      Select Products * (Select one or multiple)
                    </label>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {filteredProducts.length} products found
                    </div>
                  </div>

                  <div className="mb-4 space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search products by name or code..."
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 pl-10 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <svg
                          className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="px-4 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        Clear
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Filter by Category:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(category => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setSearchCategory(category)}
                            className={`px-3 py-1.5 text-sm rounded-full border ${
                              searchCategory === category
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            {category === "all" ? "All Categories" : category}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <div className="h-[400px] overflow-y-auto pr-2">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          {searchTerm || searchCategory !== "all"
                            ? "No products match your search criteria."
                            : "No products available."}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredProducts.map((product) => (
                            <div
                              key={product.id}
                              className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                selectedProducts.find(p => p.id === product.id)
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-blue-300"
                              } ${product.stock === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                              onClick={() => product.stock > 0 && handleProductSelection(product.id)}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={!!selectedProducts.find(p => p.id === product.id)}
                                  onChange={() => product.stock > 0 && handleProductSelection(product.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                                  disabled={product.stock === 0}
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                                    {product.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Code: {product.code}
                                  </div>
                                  {product.productType && (
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                      {product.productType}
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="text-xs">
                                      Stock: <span className={`font-medium ${
                                        product.stock === 0 
                                          ? "text-red-500" 
                                          : product.stock < 10 
                                            ? "text-yellow-500" 
                                            : "text-green-600"
                                      }`}>
                                        {product.stock}
                                      </span>
                                    </div>
                                    {selectedProducts.find(p => p.id === product.id) && (
                                      <div className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                        Selected
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {requestType === "ppe" && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium">
                      Select PPE Items * (Select one or multiple)
                    </label>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {ppeItemsList.length} PPE items found
                    </div>
                  </div>

                  <div className="h-[400px] overflow-y-auto p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                    {ppeItemsList.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No PPE items available. Please mark products as PPE in the Products section.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ppeItemsList.map((ppe) => (
                          <div
                            key={ppe.id}
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedPpes.find(p => p.id === ppe.id)
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-green-300"
                            }`}
                            onClick={() => handlePpeSelection(ppe.id)}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={!!selectedPpes.find(p => p.id === ppe.id)}
                                onChange={() => handlePpeSelection(ppe.id)}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                                  {ppe.name}
                                </div>
                                {ppe.code && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Code: {ppe.code}
                                  </div>
                                )}
                                {ppe.ppeType && (
                                  <div className="text-xs text-green-600 dark:text-green-400 mb-1">
                                    {ppe.ppeType}
                                  </div>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                  <div className="text-xs">
                                    Stock: <span className={`font-medium ${
                                      (ppe.stock || 0) === 0 
                                        ? "text-red-500" 
                                        : (ppe.stock || 0) < 10 
                                          ? "text-yellow-500" 
                                          : "text-green-600"
                                    }`}>
                                      {ppe.stock || 0} units
                                    </span>
                                  </div>
                                  {selectedPpes.find(p => p.id === ppe.id) && (
                                    <div className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                                      Selected
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              className={`w-full font-medium py-4 rounded-lg transition duration-200 text-lg ${
                requestType === "ppe" 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {requestType === "ppe" 
                ? `Submit PPE Request (${selectedPpes.length} items, ${getTotalQuantity()} units)` 
                : `Submit Inventory Request (${selectedProducts.length} items, ${getTotalQuantity()} units)`}
            </button>

            {message && (
              <div className={`mt-4 p-4 rounded-lg text-center ${
                message.includes("✅") 
                  ? "bg-green-100 text-green-700 border border-green-200" 
                  : message.includes("⏳")
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}>
                {message}
              </div>
            )}

            <div className="mt-4 text-sm text-gray-500 text-center">
              Fields marked with * are required
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryRequest;