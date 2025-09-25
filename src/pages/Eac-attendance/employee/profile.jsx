import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainSidebar from "../mainSidebar";

function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const getToken = () => {
    return localStorage.getItem("jwtToken");
  };

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = getToken();
        const response = await fetch(`http://localhost:8080/api/employee/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch employee: ${response.status}`);
        }
        const data = await response.json();
        setEmployee(data);
        setFormData(data || {});
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:8080/api/employee/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Failed to update employee: ${response.status} ${text}`);
      }

      const updatedEmployee = await response.json();
      setEmployee(updatedEmployee);
      setIsEditModalOpen(false);
      alert("Profile updated successfully!");
    } catch (err) {
      setError(err.message);
      alert("Error updating profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = () => {
    alert(`Email sent to ${employee.email}`);
    setIsMessageModalOpen(false);
  };

  const handleSendSMS = () => {
    alert(`SMS sent to ${employee.phone}`);
    setIsMessageModalOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const options = { year: "numeric", month: "long", day: "numeric" };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "N/A";
    const num = typeof amount === "number" ? amount : parseFloat(amount);
    if (isNaN(num)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const getAvatarInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return "NA";
    return `${firstName ? firstName[0] : ""}${lastName ? lastName[0] : ""}`.toUpperCase();
  };

  const getAvatarColor = (firstName, lastName) => {
    const name = `${firstName || ""}${lastName || ""}`;
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-teal-500",
    ];

    if (!name) return colors[0];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-3 text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md">
          <div className="text-red-500 text-lg mb-2">Error Loading Profile</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm">
          <div className="text-gray-600 text-lg mb-4">Employee not found</div>
          <button
            onClick={() => navigate("/employees")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <MainSidebar />

      <div className="flex-1 ml-64 p-6 lg:p-8">
        <header className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Employee Profile</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage employee information</p>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-medium text-gray-700">Admin</span>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0 relative">
              <div className={`h-24 w-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg ${getAvatarColor(employee.firstName, employee.lastName)}`}>
                {getAvatarInitials(employee.firstName, employee.lastName)}
              </div>
              <div className="absolute bottom-0 right-0 h-6 w-6 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-grow">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                {employee.firstName} {employee.lastName}
                <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 py-1 px-2 rounded-full">EAC#{employee.id}</span>
              </h1>
              <p className="text-lg text-blue-600 font-medium mt-1">{employee.jobPosition}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                  {employee.department || 'No Department'}
                </span>
                <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
                  {employee.workType || 'No Work Type'}
                </span>
                <span className="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full">
                  Joined: {formatDate(employee.startDate)}
                </span>
              </div>
            </div>
            <div className="w-full md:w-auto flex gap-3 mt-4 md:mt-0">
              <button 
                onClick={handleEdit}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit Profile
              </button>
              <button 
                onClick={() => setIsMessageModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
                Send Message
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-1 mb-6">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab("personal")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "personal" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              Personal Information
            </button>
            <button
              onClick={() => setActiveTab("employment")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "employment" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              Employment Details
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "documents" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              Documents
            </button>
          </nav>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          {activeTab === "personal" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
                <button 
                  onClick={handleEdit}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Info label="Email Address" value={employee.email} />
                <Info label="Phone Number" value={employee.phone} />
                <Info label="SSNIT Number" value={employee.ssnitNumber} />
                <Info label="TIN Number" value={employee.tinNumber} />
                <Info label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                <Info label="Emergency Contact" value={employee.emergencyContact} />
                <Info label="Account Number" value={employee.accountNumber} />
              </div>
            </div>
          )}

          {activeTab === "employment" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">Employment Details</h2>
                <button onClick={handleEdit} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Info label="Employee ID" value={employee.employeeId} />
                <Info label="Category" value={employee.category} />
                <Info label="Job Title" value={employee.jobPosition} />
                <Info label="Employment Type" value={employee.workType} />
                <Info label="Hire Date" value={formatDate(employee.startDate)} />
                <Info label="End Date" value={formatDate(employee.endDate)} />
                <Info label="Salary" value={formatCurrency(employee.basicSalary)} />
                <Info label="Rate" value={employee.minimumRate} />
                <Info label="Grade" value={employee.grade} />
                <Info label="Rent Allowance" value={formatCurrency(employee.rentAllowance)} />
                <Info label="Transport Allowance" value={formatCurrency(employee.transportAllowance)} />
                <Info label="Clothing Allowance" value={formatCurrency(employee.clothingAllowance)} />
                <Info label="Other Allowances" value={formatCurrency(employee.otherAllowance)} />
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">Documents</h2>
                <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
                  </svg>
                  Upload
                </button>
              </div>
              
              <div className="text-center py-10 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3">No documents uploaded yet</p>
                <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                  Upload your first document
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">Edit Employee Profile</h2>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Personal Information</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SSNIT Number</label>
                      <input
                        type="text"
                        name="ssnitNumber"
                        value={formData.ssnitNumber || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TIN Number</label>
                      <input
                        type="text"
                        name="tinNumber"
                        value={formData.tinNumber || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        name="accountNumber"
                        value={formData.accountNumber || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-800 border-b pb-2">Employment Information</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
                      <input
                        type="text"
                        name="jobPosition"
                        value={formData.jobPosition || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        name="category"
                        value={formData.category || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                      <select
                        name="workType"
                        value={formData.workType || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Work Type</option>
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate ? formData.startDate.split("T")[0] : ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate ? formData.endDate.split("T")[0] : ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
                      <input
                        type="number"
                        name="basicSalary"
                        value={formData.basicSalary || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Rate</label>
                      <input
                        type="number"
                        name="minimumRate"
                        value={formData.minimumRate || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Allowances Section */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-800 border-b pb-2 mb-4">Allowances</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rent Allowance</label>
                      <input
                        type="number"
                        name="rentAllowance"
                        value={formData.rentAllowance || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transport Allowance</label>
                      <input
                        type="number"
                        name="transportAllowance"
                        value={formData.transportAllowance || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Clothing Allowance</label>
                      <input
                        type="number"
                        name="clothingAllowance"
                        value={formData.clothingAllowance || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Allowance</label>
                      <input
                        type="number"
                        name="otherAllowance"
                        value={formData.otherAllowance || ""}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t p-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    saving ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Modal */}
        {isMessageModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Send Message</h2>
              <p className="text-gray-600 mb-6">
                Choose how you'd like to send a message to{" "}
                <span className="font-medium">
                  {employee.firstName} {employee.lastName}
                </span>
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Send Email
                </button>
                <button
                  onClick={handleSendSMS}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Send SMS
                </button>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsMessageModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Info component for consistent styling
function Info({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-gray-800">{value || "N/A"}</p>
    </div>
  );
}

export default Profile;