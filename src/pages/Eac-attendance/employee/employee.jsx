import { useState, useEffect, useRef, useContext  } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { SettingsContext } from '../context/SettingsContext'; // Import the context
import MainSidebar from "../mainSidebar";

function Employee() {
  const { settings } = useContext(SettingsContext); // Access settings
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState("");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isBasicSalaryEditable, setIsBasicSalaryEditable] = useState(false);

    const categories = settings?.employeeCategories || [
    "Projects", 
    "Site Services", 
    "Ahafo North",
    "NSS"
  ];

 const [newEmployee, setNewEmployee] = useState({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobPosition: "",
  workType: "",
  minimumRate: "",
  category: "",
  basicSalary: "",
  ssnitNumber: "",
  tinNumber: "",
  startDate: "",
  endDate: "",
  accountNumber: "",
  allowances: "",
  employeeId: ""
});

  const filteredEmployees = selectedCategory 
    ? employees.filter(emp => emp.category === selectedCategory)
    : employees;

  const createMenuRef = useRef(null);


  // Fetch employees from the API with token
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`http://localhost:8080/api/employee`, {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const data = await response.json();
      setEmployees(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null); 

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);


  const parseExcelDate = (value) => {
  if (!value || value === '-' || value === 'null') return null;

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
};


  // Handle displaying the selected file's contents in a popup
  // Handle displaying the selected file's contents in a popup
const handleDisplayFile = () => {
  if (!selectedFile) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Extract headers from first row
    const headers = jsonData[0].map(header => header.toLowerCase().replace(/\s+/g, ''));
    
    // Map Excel columns to expected fields
    const employeesData = jsonData.slice(1).map((row) => {
      const employee = {};
      
      headers.forEach((header, index) => {
        switch(header) {
          case 'firstname':
            employee.firstName = row[index] || '';
            break;
          case 'lastname':
            employee.lastName = row[index] || '';
            break;
          case 'email':
            employee.email = row[index] || '';
            break;
          case 'phone':
            employee.phone = row[index] || '';
            break;
          case 'jobposition':
            employee.jobPosition = row[index] || '';
            break;
          case 'category':
            employee.category = row[index] || '';
            break;
          case 'worktype':
            employee.workType = row[index] || '';
            break;
          case 'rate':
            employee.minimumRate = row[index] || '';
            break;
                case 'ssnitnumber':
      employee.ssnitNumber = row[index] || '';
      break;
    case 'tinnumber':
      employee.tinNumber = row[index] || '';
      break;
    case 'tagnumber':
      employee.tagNumber = row[index] || '';
      break;
 case 'dateofbirth':
  employee.dateOfBirth = parseExcelDate(row[index]);
  break;
    case 'emergencycontact':
      employee.emergencyContact = row[index] || '';
      break;
    case 'accountnumber':
      employee.accountNumber = row[index] || '';
      break;
    case 'employeeid':
      employee.employeeId = row[index] || '';
      break;
    case 'department':
      employee.department = row[index] || '';
      break;
    case 'startdate':
  employee.startDate = parseExcelDate(row[index]);
  break;
  case 'enddate':
  employee.endDate = parseExcelDate(row[index]);
  break;
    case 'basicsalary':
      employee.basicSalary = row[index] || '';
      break;
    case 'graderank':
    case 'grade':
      employee.grade = row[index] || '';
      break;
    case 'rentallowance':
      employee.rentAllowance = row[index] || '';
      break;
    case 'transportallowance':
      employee.transportAllowance = row[index] || '';
      break;
    case 'clothingallowance':
      employee.clothingAllowance = row[index] || '';
      break;
    case 'otherallowance':
      employee.otherAllowance = row[index] || '';
      break;
          // Ignore other columns like Basic Salary, Account Number, etc.
          default:
            // Skip unmapped columns
            break;
        }
      });
      
      return employee;
    });

    setUploadedData(employeesData);
    setIsPopupOpen(true);
  };

  reader.readAsArrayBuffer(selectedFile);
};

  // Save uploaded data to the database with token
  const saveUploadedData = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`http://localhost:8080/api/employee/bulk`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(uploadedData),
      });

      if (!response.ok) throw new Error("Failed to save data");

      const data = await response.json();
      setEmployees((prevEmployees) => [...prevEmployees, ...data]);
      setUploadedData([]);
      setIsPopupOpen(false);
      setSelectedFile(null);
      setSuccessMessage("Employees imported successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Create a new employee with token
  const createEmployee = async () => {
  if (
    !newEmployee.firstName ||
    !newEmployee.lastName ||
    !newEmployee.email ||
    !newEmployee.phone ||
    !newEmployee.jobPosition ||
    !newEmployee.minimumRate ||
    !newEmployee.category ||
    !newEmployee.ssnitNumber ||
    !newEmployee.tinNumber ||
    !newEmployee.startDate ||
    !newEmployee.endDate ||
    !newEmployee.allowances ||
    !newEmployee.accountNumber 
  ) {
    setError("Please fill out all fields.");
    return;
  }

    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`http://localhost:8080/api/employee`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newEmployee),
      });

      if (!response.ok) throw new Error("Failed to create employee");

      const data = await response.json();
      setEmployees((prevEmployees) => [...prevEmployees, data]);
   setNewEmployee({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobPosition: "",
  workType: "",
  minimumRate: "",
  category: "",
  ssnitNumber: "",
  tinNumber: "",
  startDate: "",
  endDate: "",
  accountNumber : "",
  allowances : ""
});

      setIsCreateMenuOpen(false);
      setSuccessMessage("Employee created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Update employee with token
  const updateEmployee = async () => {
    if (!editingEmployee) return;
  
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`http://localhost:8080/api/employee/${editingEmployee.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editingEmployee),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json();
      setEmployees(employees.map(emp => 
        emp.id === editingEmployee.id ? data : emp
      ));
      setIsEditMenuOpen(false);
      setEditingEmployee(null);
      setSuccessMessage("Employee updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  // Delete employee with token
  const deleteEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`http://localhost:8080/api/employee/${id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete employee");

      setEmployees(employees.filter(emp => emp.id !== id));
      setOpenMenuId(null);
      setSuccessMessage("Employee deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Close all modals
  const closeAllModals = () => {
    setIsCreateMenuOpen(false);
    setIsEditMenuOpen(false);
    setIsPopupOpen(false);
    setEditingEmployee(null);
  };

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
        <MainSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Overlay for modals */}
        {(isCreateMenuOpen || isEditMenuOpen || isPopupOpen) && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeAllModals}></div>
        )}

        {/* Notification Messages */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 flex justify-between items-center w-96">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-700 font-bold">
              &times;
            </button>
          </div>
        )}

        {successMessage && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 flex justify-between items-center w-96">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage("")} className="text-green-700 font-bold">
              &times;
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Top Bar */}
          <header className="flex justify-between items-center border border-white bg-white h-16 w-full rounded-r-2xl px-6 shadow-md">
            {/* Menu Icon */}
            <button className="p-1 hover:bg-gray-100 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Right Icons */}
            <div className="flex items-center gap-5">
              {/* Settings Icon */}
              <div className="relative" ref={settingsMenuRef}>
                <Link to="/settingspage" className="p-1 hover:bg-gray-200 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.350.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </Link>
              </div>

              <div className="border-l border-gray-300 h-8"></div>

              {/* Notifications Icon */}
              <button className="p-1 hover:bg-gray-200 rounded-full relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5"
                  />
                </svg>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </button>

              <div className="border-l border-gray-300 h-8"></div>

              {/* User Profile */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  A
                </div>
                <span className="font-medium">Adams</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </header>

          {/* Employee List Section */}
          <section className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Employee List</h1>
                <p className="text-gray-600">Manage and track employee information</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="size-5 text-gray-400"
                    >
                      <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <select
    value={selectedCategory}
    onChange={(e) => setSelectedCategory(e.target.value)}
    className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
    <option value="">All Categories</option>
    {categories.map((category) => (
      <option key={category} value={category}>
        {category}
      </option>
    ))}
  </select>

                <div className="flex gap-2">
                  <label className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition duration-200">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    Import
                  </label>
                  <button
                    className={`px-4 py-2 rounded-lg transition duration-200 ml-2 ${
                      !selectedFile ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                    onClick={handleDisplayFile}
                    disabled={!selectedFile}
                  >
                    Preview
                  </button>
                </div>

                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 flex items-center gap-2"
                  onClick={() => setIsCreateMenuOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Employee
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Position
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Work Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                     
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          <Link to={`/profile/${employee.id}`} className="hover:underline">
                            {employee.id}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.jobPosition}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            employee.category === "Projects" ? "bg-blue-100 text-blue-800" :
                            employee.category === "Site Services" ? "bg-green-100 text-green-800" :
                            "bg-purple-100 text-purple-800"
                          }`}>
                            {employee.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.workType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          GHS{employee.minimumRate}/hr
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === employee.id ? null : employee.id)}
                              className="text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            {openMenuId === employee.id && (
                              <div
                                ref={el => {
                                  if (el) {
                                    menuRefs.current[employee.id] = el;
                                  } else {
                                    delete menuRefs.current[employee.id];
                                  }
                                }}
                                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
                              >
                                <div className="py-1">
                                  <button
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={() => {
                                      setEditingEmployee(employee);
                                      setIsEditMenuOpen(true);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                    onClick={() => deleteEmployee(employee.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        
{/* Create Employee Modal */}
{isCreateMenuOpen && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Add New Employee</h2>
        <button
          onClick={() => setIsCreateMenuOpen(false)}
          className="text-gray-400 hover:text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={newEmployee.category}
            onChange={(e) => setNewEmployee({...newEmployee, category: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              placeholder="First name"
              value={newEmployee.firstName}
              onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              placeholder="Last name"
              value={newEmployee.lastName}
              onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="text"
            placeholder="Employee email"
            value={newEmployee.email}
            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Job Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
          <input
            type="text"
            placeholder="E.g. Quantity Surveyor"
            value={newEmployee.jobPosition}
            onChange={(e) => setNewEmployee({ ...newEmployee, jobPosition: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Work Type + Hourly Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
            <input
              type="text"
              placeholder="E.g. Regular, Contractor"
              value={newEmployee.workType}
              onChange={(e) => setNewEmployee({ ...newEmployee, workType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (GHS)</label>
            <input
              type="text"
              placeholder="E.g. 25.00"
              value={newEmployee.minimumRate}
              onChange={(e) => setNewEmployee({ ...newEmployee, minimumRate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="number"
            placeholder="E.g. 123456789"
            value={newEmployee.phone}
            onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* SSNIT + TIN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SSNIT Number</label>
            <input
              type="text"
              placeholder="Enter SSNIT Number"
              value={newEmployee.ssnitNumber}
              onChange={(e) => setNewEmployee({ ...newEmployee, ssnitNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TIN Number</label>
            <input
              type="text"
              placeholder="Enter TIN Number"
              value={newEmployee.tinNumber}
              onChange={(e) => setNewEmployee({ ...newEmployee, tinNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Start + End Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={newEmployee.startDate}
              onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={newEmployee.endDate}
              onChange={(e) => setNewEmployee({ ...newEmployee, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Allowances */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
          <input
            type="number"
            value={newEmployee.allowances}
            onChange={(e) => setNewEmployee({ ...newEmployee, allowances: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Basic Salary + Account Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Basic Salary</label>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-2">Include</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBasicSalaryEditable}
                    onChange={(e) => setIsBasicSalaryEditable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            <input
              type="text"
              value={newEmployee.basicSalary}
              onChange={(e) => setNewEmployee({ ...newEmployee, basicSalary: e.target.value })}
              disabled={!isBasicSalaryEditable}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !isBasicSalaryEditable ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''
              }`}
            />
          </div>
        
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={newEmployee.accountNumber}
              onChange={(e) => setNewEmployee({ ...newEmployee, accountNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-4 px-6 py-4 border-t border-gray-200 bg-white">
        <button
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          onClick={() => setIsCreateMenuOpen(false)}
        >
          Cancel
        </button>
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          onClick={createEmployee}
        >
          Create Employee
        </button>
      </div>
    </div>
  </div>
)} 


      {/* Edit Employee Modal */}
{isEditMenuOpen && editingEmployee && (
  <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl w-full max-w-2xl z-50">
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Edit Employee</h2>
        <button
          onClick={() => {
            setIsEditMenuOpen(false);
            setEditingEmployee(null);
          }}
          className="text-gray-400 hover:text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
         <select
    value={editingEmployee?.category || ""}
    onChange={(e) => setEditingEmployee({ ...editingEmployee, category: e.target.value })}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
    <option value="">Select Category</option>
    {categories.map((category) => (
      <option key={category} value={category}>
        {category}
      </option>
    ))}
  </select>
        </div>

        {/* Names */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={editingEmployee.firstName}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, firstName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={editingEmployee.lastName}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, lastName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="text"
            value={editingEmployee.email}
            onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Job Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
          <input
            type="text"
            value={editingEmployee.jobPosition}
            onChange={(e) => setEditingEmployee({ ...editingEmployee, jobPosition: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Work Type + Hourly Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
            <input
              type="text"
              value={editingEmployee.workType}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, workType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (GHS)</label>
            <input
              type="text"
              value={editingEmployee.minimumRate}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, minimumRate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* NEW FIELDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SSNIT Number</label>
            <input
              type="text"
              value={editingEmployee.ssnitNumber}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, ssnitNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TIN Number</label>
            <input
              type="text"
              value={editingEmployee.tinNumber}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, tinNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={editingEmployee.startDate}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={editingEmployee.endDate}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, endDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="number"
              value={editingEmployee.accountNumber}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, accountNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
            <input
              type="number"
              value={editingEmployee.allowances}
              onChange={(e) => setEditingEmployee({ ...editingEmployee, allowances: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            onClick={() => {
              setIsEditMenuOpen(false);
              setEditingEmployee(null);
            }}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={updateEmployee}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        {/* Excel Import Popup Modal */}
{/* Excel Import Popup Modal */}
{isPopupOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-7xl max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4">Excel File Contents</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
         <thead className="bg-gray-50">
  <tr>
    <th>First Name</th>
    <th>Last Name</th>
    <th>Email</th>
    <th>Phone</th>
    <th>SSNIT Number</th>
    <th>TIN Number</th>
    <th>Tag Number</th>
    <th>Date of Birth</th>
    <th>Emergency Contact</th>
    <th>Account Number</th>
    <th>Employee ID</th>
    <th>Category</th>
    <th>Job Position</th>
    <th>Work Type</th>
    <th>Department</th>
    <th>Start Date</th>
    <th>End Date</th>
    <th>Basic Salary</th>
    <th>Minimum Rate</th>
    <th>Grade</th>
    <th>Rent Allowance</th>
    <th>Transport Allowance</th>
    <th>Clothing Allowance</th>
    <th>Other Allowance</th>
  </tr>
</thead>
<tbody>
  {uploadedData.map((employee, index) => (
    <tr key={index}>
      <td>{employee.firstName}</td>
      <td>{employee.lastName}</td>
      <td>{employee.email}</td>
      <td>{employee.phone}</td>
      <td>{employee.ssnitNumber}</td>
      <td>{employee.tinNumber}</td>
      <td>{employee.tagNumber}</td>
      <td>{employee.dateOfBirth}</td>
      <td>{employee.emergencyContact}</td>
      <td>{employee.accountNumber}</td>
      <td>{employee.employeeId}</td>
      <td>{employee.category}</td>
      <td>{employee.jobPosition}</td>
      <td>{employee.workType}</td>
      <td>{employee.department}</td>
      <td>{employee.startDate}</td>
      <td>{employee.endDate}</td>
      <td>{employee.basicSalary}</td>
      <td>{employee.minimumRate}</td>
      <td>{employee.grade}</td>
      <td>{employee.rentAllowance}</td>
      <td>{employee.transportAllowance}</td>
      <td>{employee.clothingAllowance}</td>
      <td>{employee.otherAllowance}</td>
    </tr>
  ))}
</tbody>

        </table>
      </div>
      <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
        <button
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          onClick={() => setIsPopupOpen(false)}
        >
          Cancel
        </button>
        <button
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          onClick={saveUploadedData}
        >
          Confirm Upload
        </button>
      </div>
    </div>
  </div>
)}


      </div>
    </div>
  );
}

export default Employee;