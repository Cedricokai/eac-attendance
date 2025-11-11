import { useState, useEffect } from "react";

const InventoryRequest = () => {
  const [products, setProducts] = useState([]);
  const [ppeItems, setPpeItems] = useState([]);
  const [requestType, setRequestType] = useState("inventory"); // "inventory" or "ppe"
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedPpes, setSelectedPpes] = useState([]); // Changed to array for multiple selection
  const [quantity, setQuantity] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mock products data
  const mockProducts = [
    { id: 1, name: "Safety Gloves", code: "SG-001", stock: 150, category: "Safety" },
    { id: 2, name: "Hard Hat", code: "HH-002", stock: 75, category: "Safety" },
    { id: 3, name: "Steel-toe Boots", code: "STB-003", stock: 40, category: "Footwear" },
    { id: 4, name: "Safety Glasses", code: "SGL-004", stock: 200, category: "Eye Protection" },
    { id: 5, name: "Ear Plugs", code: "EP-005", stock: 500, category: "Hearing Protection" },
    { id: 6, name: "Work Gloves", code: "WG-006", stock: 120, category: "Hand Protection" },
    { id: 7, name: "High-Vis Vest", code: "HVV-007", stock: 80, category: "Visibility" },
    { id: 8, name: "Dust Mask", code: "DM-008", stock: 300, category: "Respiratory" },
    { id: 9, name: "First Aid Kit", code: "FAK-009", stock: 25, category: "Medical" },
    { id: 10, name: "Tool Belt", code: "TB-010", stock: 35, category: "Tools" }
  ];

  // PPE Items list
  const ppeItemsList = [
    { id: "safety-helmet", name: "Safety Helmet", category: "Head Protection" },
    { id: "safety-glasses", name: "Safety Glasses", category: "Eye Protection" },
    { id: "hi-vis-vest", name: "Hi-Visibility Vest", category: "Visibility" },
    { id: "safety-gloves", name: "Safety Gloves", category: "Hand Protection" },
    { id: "safety-boots", name: "Safety Boots", category: "Foot Protection" },
    { id: "ear-plugs", name: "Ear Plugs", category: "Hearing Protection" },
    { id: "dust-mask", name: "Dust Mask", category: "Respiratory Protection" },
    { id: "harness", name: "Safety Harness", category: "Fall Protection" },
    { id: "face-shield", name: "Face Shield", category: "Face Protection" },
    { id: "coverall", name: "Coverall", category: "Body Protection" },
    { id: "welding-helmet", name: "Welding Helmet", category: "Welding Protection" },
    { id: "chemical-gloves", name: "Chemical Resistant Gloves", category: "Chemical Protection" },
    { id: "miners-belt", name: "Underground Miners Belt", category: "Fall Protection" }
  ];

  // Mock data initialization
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProducts(mockProducts);
        setPpeItems(ppeItemsList);
      } catch (err) {
        setError("Failed to load products data");
      } finally {
        setLoading(false);
      }
    };
   
    fetchProducts();
  }, []);

  // Auto-fill user info on component mount
  useEffect(() => {
    const username = "Demo User"; // Mock username
    setContactPerson(username);
  }, []);

  // Handle PPE selection (multiple)
  const handlePpeSelection = (ppeId) => {
    setSelectedPpes(prev => {
      if (prev.includes(ppeId)) {
        // Remove if already selected
        return prev.filter(id => id !== ppeId);
      } else {
        // Add if not selected
        return [...prev, ppeId];
      }
    });
  };

  // Remove a selected PPE item
  const removePpeItem = (ppeId) => {
    setSelectedPpes(prev => prev.filter(id => id !== ppeId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!requestType) {
        setMessage("❌ Please select request type");
        return;
    }

    if (requestType === "inventory" && !selectedProduct) {
        setMessage("❌ Please select a product");
        return;
    }

    if (requestType === "ppe" && selectedPpes.length === 0) {
        setMessage("❌ Please select at least one PPE item");
        return;
    }

    if (!quantity) {
        setMessage("❌ Please enter quantity");
        return;
    }

    if (quantity < 1) {
        setMessage("❌ Quantity must be at least 1");
        return;
    }

    const username = "Demo User"; // Mock username

    try {
        setMessage("⏳ Submitting request...");
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock successful submission
        if (requestType === "inventory") {
          const selectedProductData = products.find(p => p.id === parseInt(selectedProduct));
          setMessage(`✅ Inventory request submitted successfully! 
            Product: ${selectedProductData?.name}
            Quantity: ${quantity}
            Requested by: ${username}
            Urgency: ${urgency}`);
        } else {
          const selectedPpeNames = selectedPpes.map(ppeId => 
            ppeItems.find(p => p.id === ppeId)?.name
          ).join(", ");
          setMessage(`✅ PPE request submitted successfully!
            Items: ${selectedPpeNames}
            Quantity: ${quantity}
            Requested by: ${username}
            Urgency: ${urgency}`);
        }

        // Reset all form fields
        setSelectedProduct("");
        setSelectedPpes([]);
        setQuantity("");
        setUrgency("normal");
        setAdditionalNotes("");
        setContactPhone("");
        
    } catch (error) {
        console.error("Error sending request:", error);
        setMessage("❌ Error submitting request. Please try again.");
    }
  };

  // Reset item selection when request type changes
  useEffect(() => {
    setSelectedProduct("");
    setSelectedPpes([]);
    setQuantity("");
  }, [requestType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading products...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="max-w-md p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="text-lg font-semibold">Error: {error}</h2>
          <p className="mt-2 text-sm">Please check your connection or contact administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Inventory & PPE Request Form
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Fill out the form below to request inventory items or PPE from the store
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6"
        >
          {/* Request Type Selection */}
          <div className="mb-6">
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

          {/* Item Selection based on Request Type */}
          {requestType === "inventory" && (
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                Select Product *
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select Product --</option>
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} ({prod.stock} in stock) - {prod.code}
                  </option>
                ))}
              </select>
            </div>
          )}

          {requestType === "ppe" && (
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                Select PPE Items * (Select multiple)
              </label>
              
              {/* Selected PPE Items Display */}
              {selectedPpes.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">
                    Selected PPE Items ({selectedPpes.length}):
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPpes.map(ppeId => {
                      const ppeItem = ppeItems.find(p => p.id === ppeId);
                      return (
                        <div 
                          key={ppeId}
                          className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-green-300 dark:border-green-600"
                        >
                          <span className="text-sm text-green-700 dark:text-green-300">
                            {ppeItem?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePpeItem(ppeId)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PPE Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                {ppeItems.map((ppe) => (
                  <div
                    key={ppe.id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPpes.includes(ppe.id)
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-300"
                    }`}
                    onClick={() => handlePpeSelection(ppe.id)}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedPpes.includes(ppe.id)}
                        onChange={() => handlePpeSelection(ppe.id)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <div>
                        <div className="font-medium text-sm">{ppe.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{ppe.category}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedPpes.length > 0 && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Safety Note:</strong> Ensure proper fitting and training for selected PPE items.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity and Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                Quantity Required *
              </label>
              <input
                type="number"
                min="1"
                max={
                  requestType === "inventory" && selectedProduct 
                    ? products.find(p => p.id === parseInt(selectedProduct))?.stock 
                    : undefined
                }
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter quantity"
              />
              {requestType === "inventory" && selectedProduct && (
                <p className="text-sm text-gray-500 mt-1">
                  Available: {products.find(p => p.id === parseInt(selectedProduct))?.stock} units
                </p>
              )}
              {requestType === "ppe" && (
                <p className="text-sm text-gray-500 mt-1">
                  Number of personnel requiring PPE
                </p>
              )}
            </div>

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
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                placeholder="Phone number (optional)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder={
                requestType === "ppe" 
                  ? "Any special requirements, sizes, or safety considerations..."
                  : "Any special instructions or additional information..."
              }
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full font-medium py-3 rounded-lg transition duration-200 ${
              requestType === "ppe" 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {requestType === "ppe" ? "Submit PPE Request" : "Submit Inventory Request"}
          </button>

          {message && (
            <div className={`mt-4 p-4 rounded-lg text-center whitespace-pre-line ${
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
        </form>
      </div>
    </div>
  );
};

export default InventoryRequest;