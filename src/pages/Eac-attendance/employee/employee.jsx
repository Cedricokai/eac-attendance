import { useState, useEffect, useRef, useContext } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { SettingsContext } from '../context/SettingsContext';
import MainSidebar from "../mainSidebar";

// Safe value handler utility
const getSafeValue = (value) => {
  if (value === null || value === undefined) return "";
  return value;
};

// Enhanced Employee ID Generator Function for preview
const generateEmployeeId = (startDate, index, existingEmployees = []) => {
  if (!startDate) {
    // fallback to today’s date
    const today = new Date();
    const datePart = today.toISOString().slice(2, 10).replace(/-/g, '');
    return `E-${datePart}-001`;
  }

  const date = new Date(startDate);
  const datePart = date.toISOString().slice(2, 10).replace(/-/g, '');

  // Count how many already exist with this date
  const existingCount = existingEmployees.filter(emp => emp.startDate === startDate).length;

  // Now add the row index + 1
  const sequenceNumber = existingCount + index + 1;
  const seqPart = String(sequenceNumber).padStart(3, '0');

  return `E-${datePart}-${seqPart}`;
};

function Employee() {
  const { settings, getPositionRate } = useContext(SettingsContext);
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

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobPosition: "",
    jobGrade: "I",
    workType: "",
    minimumRate: "",
    category: "",
    basicSalary: "",
    ssnitNumber: "",
    tinNumber: "",
    startDate: "",
    accountNumber: "",
    allowances: "",
    employeeId: "",
    usePositionRate: true
  });

  const filteredEmployees = selectedCategory 
    ? employees.filter(emp => emp.category === selectedCategory)
    : employees;

  const createMenuRef = useRef(null);
  const editMenuRef = useRef(null);

  // Fetch employees from the API with token
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`${API_BASE_URL}/api/employee`, {
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

  const getPositionGrades = (positionName) => {
    const position = settings.jobPositions?.find(p => p.name === positionName);
    return position?.grades || [];
  };

  useEffect(() => {
    if (newEmployee.usePositionRate && newEmployee.jobPosition && newEmployee.jobGrade) {
      const positionRate = getPositionRate(newEmployee.jobPosition, newEmployee.jobGrade);
      if (positionRate) {
        setNewEmployee(prev => ({
          ...prev,
          minimumRate: positionRate.toString()
        }));
      }
    }
  }, [newEmployee.jobPosition, newEmployee.jobGrade, newEmployee.usePositionRate, getPositionRate]);

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
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setIsCreateMenuOpen(false);
      }
      if (editMenuRef.current && !editMenuRef.current.contains(event.target)) {
        setIsEditMenuOpen(false);
        setEditingEmployee(null);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const parseExcelDate = (value) => {
    if (!value || value === '-' || value === 'null') return null;
    
    // Handle Excel serial numbers (dates stored as numbers)
    if (typeof value === 'number') {
      const date = new Date((value - (25567 + 2)) * 86400 * 1000);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }
    
    // Handle string dates
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  };

  // Handle displaying the selected file's contents in a popup
// Handle displaying the selected file's contents in a popup
const handleDisplayFile = () => {
  if (!selectedFile) {
    setError("Please select a file first");
    return;
  }

  const reader = new FileReader();
  
  reader.onload = (event) => {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log("Raw Excel Data:", jsonData);
      
      if (jsonData.length < 2) {
        setError("Excel file doesn't contain enough data (needs at least 1 data row)");
        return;
      }
      
      // Extract headers from first row with better error handling
      const headers = jsonData[0].map(header => {
        try {
          if (header === null || header === undefined) return '';
          const headerStr = String(header).trim();
          return headerStr.toLowerCase().replace(/\s+/g, '');
        } catch (error) {
          console.warn('Error processing header:', header, error);
          return '';
        }
      });
      
      console.log("Detected Headers:", headers);

      // Map Excel columns to expected fields with comprehensive mapping
      const employeesData = jsonData.slice(1).map((row, rowIndex) => {
        const employee = {};
        
        headers.forEach((header, index) => {
          const value = row[index];
          
          // Skip if header is empty or value is undefined
          if (!header || value === undefined) return;
          
          // Comprehensive field mapping
          switch(header) {
            case 'firstname':
            case 'first_name':
            case 'fname':
              employee.firstName = getSafeValue(value);
              break;
            case 'lastname':
            case 'last_name':
            case 'lname':
              employee.lastName = getSafeValue(value);
              break;
            case 'email':
            case 'emailaddress':
              employee.email = getSafeValue(value);
              break;
            case 'phone':
            case 'phonenumber':
            case 'phone_number':
            case 'contact':
            case 'mobilenumber':
              employee.phone = getSafeValue(value);
              break;
            case 'jobposition':
            case 'job_position':
            case 'position':
            case 'jobtitle':
              employee.jobPosition = getSafeValue(value);
              break;
            case 'category':
            case 'empcategory':
            case 'employee_category':
            case 'dept':
              employee.category = getSafeValue(value);
              break;
            case 'worktype':
            case 'work_type':
            case 'employmenttype':
            case 'type':
              employee.workType = getSafeValue(value);
              break;
            case 'rate':
            case 'hourlyrate':
            case 'hourly_rate':
            case 'minimumrate':
            case 'minimum_rate':
            case 'salary':
              employee.minimumRate = getSafeValue(value);
              break;
            case 'ssnitnumber':
            case 'ssnit_number':
            case 'ssnit':
            case 'socialsecurity':
              employee.ssnitNumber = getSafeValue(value);
              break;
            case 'tinnumber':
            case 'tin_number':
            case 'tin':
            case 'taxid':
              employee.tinNumber = getSafeValue(value);
              break;
            case 'tagnumber':
            case 'tag_number':
            case 'tag':
            case 'badge':
              employee.tagNumber = getSafeValue(value);
              break;
            case 'dateofbirth':
            case 'date_of_birth':
            case 'dob':
            case 'birthdate':
              employee.dateOfBirth = parseExcelDate(value);
              break;
            case 'emergencycontact':
            case 'emergency_contact':
            case 'emergencyphone':
            case 'emergency':
              employee.emergencyContact = getSafeValue(value);
              break;
            case 'accountnumber':
            case 'account_number':
            case 'bankaccount':
            case 'account':
              employee.accountNumber = getSafeValue(value);
              break;
            case 'employeeid':
            case 'employee_id':
            case 'empid':
            case 'staffid':
              if (value) employee.originalEmployeeId = getSafeValue(value);
              break;
            case 'department':
            case 'division':
              employee.department = getSafeValue(value);
              break;
            case 'startdate':
            case 'start_date':
            case 'hiredate':
            case 'datehired':
            case 'joiningdate':
              employee.startDate = parseExcelDate(value);
              break;
            case 'enddate':
            case 'end_date':
            case 'terminationdate':
            case 'leavingdate':
              employee.endDate = parseExcelDate(value);
              break;
            case 'basicsalary':
            case 'basic_salary':
            case 'monthlysalary':
              employee.basicSalary = getSafeValue(value);
              break;
            case 'graderank':
            case 'grade':
            case 'jobgrade':
            case 'job_grade':
            case 'level':
              employee.grade = getSafeValue(value);
              break;
            case 'rentallowance':
            case 'rent_allowance':
            case 'housingallowance':
            case 'accommodation':
              employee.rentAllowance = getSafeValue(value);
              break;
            case 'transportallowance':
            case 'transport_allowance':
            case 'transport':
            case 'travelallowance':
              employee.transportAllowance = getSafeValue(value);
              break;
            case 'clothingallowance':
            case 'clothing_allowance':
            case 'uniformallowance':
            case 'dressallowance':
              employee.clothingAllowance = getSafeValue(value);
              break;
            case 'otherallowance':
            case 'other_allowance':
            case 'additionalallowance':
            case 'extraallowance':
              employee.otherAllowance = getSafeValue(value);
              break;
            default:
              // Fallback mapping for common fields
              if (header.includes('first')) employee.firstName = getSafeValue(value);
              else if (header.includes('last')) employee.lastName = getSafeValue(value);
              else if (header.includes('email')) employee.email = getSafeValue(value);
              else if (header.includes('phone') || header.includes('mobile')) employee.phone = getSafeValue(value);
              break;
          }
        });

        // Validate required fields
        if (!employee.firstName || !employee.lastName) {
          console.warn(`Skipping row ${rowIndex + 2}: Missing first name or last name`);
          return null;
        }

        // Set default values for important fields if missing
        if (!employee.category) employee.category = categories[0] || "Projects";
        if (!employee.workType) employee.workType = "Regular";
        if (!employee.jobPosition) employee.jobPosition = "General Worker";

        return employee;
      }).filter(employee => employee !== null);

      console.log("Processed Employees:", employeesData);

      if (employeesData.length === 0) {
        setError("No valid employee data found in the Excel file. Please check if the file contains first name and last name columns.");
        return;
      }

      setUploadedData(employeesData);
      setIsPopupOpen(true);
      setError(null);

    } catch (err) {
      console.error('Error processing Excel file:', err);
      setError(`Error reading Excel file: ${err.message}. Please check the file format.`);
    }
  };

  reader.onerror = () => {
    setError("Error reading file. Please try again.");
  };

  reader.readAsArrayBuffer(selectedFile);
};

  // Update the saveUploadedData function
// Update the saveUploadedData function to handle missing fields
const saveUploadedData = async () => {
  try {
    const token = localStorage.getItem('jwtToken');
    
    // First, fetch current employees to ensure we generate unique IDs
    const currentEmployeesResponse = await fetch(`${API_BASE_URL}/api/employee`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!currentEmployeesResponse.ok) {
      throw new Error("Failed to fetch current employees");
    }

    const currentEmployees = await currentEmployeesResponse.json();

    // Generate employee IDs for each imported record with proper field mapping
    const employeesWithIds = uploadedData.map((employee, index) => {
      const employeeId = generateEmployeeId(employee.startDate, index, currentEmployees);
      
      // Safely handle firstName and lastName for email generation
      const safeFirstName = employee.firstName ? String(employee.firstName).trim() : '';
      const safeLastName = employee.lastName ? String(employee.lastName).trim() : '';
      
      // Generate email safely
      let email = employee.email ? String(employee.email).trim() : '';
      if (!email && safeFirstName && safeLastName) {
        email = `${safeFirstName.toLowerCase()}.${safeLastName.toLowerCase()}@company.com`;
      } else if (!email) {
        email = `employee${index + 1}@company.com`;
      }

      // Create a clean employee object that matches backend expectations
      const cleanEmployee = {
        // Required fields with defaults
        firstName: safeFirstName || '',
        lastName: safeLastName || '',
        email: email,
        phone: employee.phone ? String(employee.phone).trim() : '',
        jobPosition: employee.jobPosition ? String(employee.jobPosition).trim() : 'General Worker',
        minimumRate: employee.minimumRate ? parseFloat(employee.minimumRate) : 0,
        category: employee.category ? String(employee.category).trim() : categories[0] || "Projects",
        workType: employee.workType ? String(employee.workType).trim() : 'Regular',
           numberOfChildren: employee.numberOfChildren ? parseInt(employee.numberOfChildren) : 0,
    age: employee.age ? parseInt(employee.age) : 0,

        // Optional fields with null defaults
        ssnitNumber: employee.ssnitNumber ? String(employee.ssnitNumber).trim() : null,
        tinNumber: employee.tinNumber ? String(employee.tinNumber).trim() : null,
        startDate: employee.startDate || new Date().toISOString().split('T')[0],
        endDate: employee.endDate || null,
        basicSalary: employee.basicSalary ? parseFloat(employee.basicSalary) : null,
        accountNumber: employee.accountNumber ? String(employee.accountNumber).trim() : null,
        
        // Allowance fields (your backend has these)
        rentAllowance: employee.rentAllowance ? parseFloat(employee.rentAllowance) : 0,
        transportAllowance: employee.transportAllowance ? parseFloat(employee.transportAllowance) : 0,
        clothingAllowance: employee.clothingAllowance ? parseFloat(employee.clothingAllowance) : 0,
        otherAllowance: employee.otherAllowance ? parseFloat(employee.otherAllowance) : 0,
        
        // Additional fields that might be in Excel
        tagNumber: employee.tagNumber ? String(employee.tagNumber).trim() : null,
        dateOfBirth: employee.dateOfBirth || null,
        emergencyContact: employee.emergencyContact ? String(employee.emergencyContact).trim() : null,
        department: employee.department ? String(employee.department).trim() : null,
        
        // System fields
        employeeId: employeeId,
        jobGrade: employee.grade || "I",
        usePositionRate: false,
        
        // Handle the allowances field from your form (single field)
        allowances: employee.allowances ? parseFloat(employee.allowances) : 0
      };

      // Clean up any undefined or null values that might cause JSON issues
      Object.keys(cleanEmployee).forEach(key => {
        if (cleanEmployee[key] === undefined) {
          cleanEmployee[key] = null;
        }
      });

      return cleanEmployee;
    });

    console.log("Employees with generated IDs:", employeesWithIds);

    // Validate data before sending - only check critical fields
    const invalidEmployees = employeesWithIds.filter(emp => 
      !emp.firstName || !emp.lastName
    );
    
    if (invalidEmployees.length > 0) {
      throw new Error(`Found ${invalidEmployees.length} employees with missing required fields (first name and last name)`);
    }

    // Log the first employee to see the structure
    if (employeesWithIds.length > 0) {
      console.log("First employee data structure:", employeesWithIds[0]);
    }

    const response = await fetch(`${API_BASE_URL}/api/employee/bulk`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(employeesWithIds),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      console.error('Response status:', response.status);
      
      // Try to parse the error response as JSON if possible
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error response:', errorJson);
      } catch (e) {
        console.error('Raw error response:', errorText);
      }
      
      throw new Error(`Failed to save data: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    setEmployees((prevEmployees) => [...prevEmployees, ...data]);
    setUploadedData([]);
    setIsPopupOpen(false);
    setSelectedFile(null);
    setSuccessMessage(`Successfully imported ${employeesWithIds.length} employees!`);
    setTimeout(() => setSuccessMessage(""), 5000);
    
    // Refresh the employee list
    fetchEmployees();
  } catch (err) {
    setError(err.message);
    console.error('Import error:', err);
    console.error('Error details:', {
      uploadedDataLength: uploadedData.length,
      firstEmployee: uploadedData[0] // Show first employee for debugging
    });
  }
};

  // Create a new employee with token
  const createEmployee = async () => {
    let finalRate = newEmployee.minimumRate;

    if (newEmployee.usePositionRate) {
      const positionRate = getPositionRate(newEmployee.jobPosition, newEmployee.jobGrade);
      finalRate = positionRate || newEmployee.minimumRate;
    }

    const employeeData = {
      ...newEmployee,
      minimumRate: finalRate,
       numberOfChildren: newEmployee.numberOfChildren ? parseInt(newEmployee.numberOfChildren) : 0,
  age: newEmployee.age ? parseInt(newEmployee.age) : 0,
      jobGrade: newEmployee.jobGrade || "I"
    };

    if (
      !newEmployee.firstName ||
      !newEmployee.lastName ||
      !newEmployee.email 
      // !newEmployee.phone ||
      // !newEmployee.jobPosition ||
      // !newEmployee.category ||
      // !newEmployee.ssnitNumber ||
      // !newEmployee.tinNumber ||
      // !newEmployee.startDate ||
      // !newEmployee.allowances ||
      // !newEmployee.accountNumber 
    ) {
      setError("Please fill out all fields.");
      return;
    }

    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`${API_BASE_URL}/api/employee`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) throw new Error("Failed to create employee");

      const data = await response.json();
      setEmployees((prevEmployees) => [...prevEmployees, data]);
   
      // Reset form
      setNewEmployee({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        jobPosition: "",
        jobGrade: "I",
        workType: "",
        minimumRate: "",
        category: "",
        ssnitNumber: "",
        tinNumber: "",
        startDate: "",
        accountNumber: "",
        allowances: "",
        employeeId: "",
        usePositionRate: true
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
      const response = await fetch(`${API_BASE_URL}/api/employee/${editingEmployee.id}`, {
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
      const response = await fetch(`${API_BASE_URL}/api/employee/${id}`, {
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
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004-.827c.424.350.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
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
                    value={getSafeValue(query)}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <select
                  value={getSafeValue(selectedCategory)}
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

               <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition duration-200">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? `File: ${selectedFile.name}` : 'Import Excel'}
              </label>
              <button
                className={`px-4 py-2 rounded-lg transition duration-200 ${
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
                          <div>
                            <span>GHS{employee.minimumRate}/hr</span>
                            <span className={`ml-2 text-xs px-1 rounded ${
                              employee.usePositionRate !== false ? 
                                'bg-green-100 text-green-800' : 
                                'bg-blue-100 text-blue-800'
                            }`}>
                              {employee.usePositionRate !== false ? 'Position' : 'Custom'}
                            </span>
                            {employee.usePositionRate !== false && employee.jobGrade && (
                              <span className="ml-1 text-xs text-gray-500">(Grade {employee.jobGrade})</span>
                            )}
                          </div>
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
            <div ref={createMenuRef} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
                    value={getSafeValue(newEmployee.category)}
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
                      value={getSafeValue(newEmployee.firstName)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Last name"
                      value={getSafeValue(newEmployee.lastName)}
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
                    value={getSafeValue(newEmployee.email)}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Job Position and Grade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
                    <select
                      value={getSafeValue(newEmployee.jobPosition)}
                      onChange={(e) => {
                        const selectedPosition = e.target.value;
                        const position = settings.jobPositions?.find(p => p.name === selectedPosition);
                        const defaultGrade = position?.grades?.[0]?.level || "I";
                        const defaultRate = position?.grades?.find(g => g.level === defaultGrade)?.rate || "";
                        
                        setNewEmployee({ 
                          ...newEmployee, 
                          jobPosition: selectedPosition,
                          jobGrade: defaultGrade,
                          minimumRate: defaultRate.toString()
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Job Position</option>
                      {settings.jobPositions?.map((position) => (
                        <option key={position.name} value={position.name}>
                          {position.name} ({position.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {newEmployee.jobPosition && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Grade</label>
                      <select
                        value={getSafeValue(newEmployee.jobGrade)}
                        onChange={(e) => {
                          const selectedGrade = e.target.value;
                          const position = settings.jobPositions?.find(p => p.name === newEmployee.jobPosition);
                          const gradeRate = position?.grades?.find(g => g.level === selectedGrade)?.rate || "";
                          
                          setNewEmployee({ 
                            ...newEmployee, 
                            jobGrade: selectedGrade,
                            minimumRate: gradeRate.toString()
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {getPositionGrades(newEmployee.jobPosition).map((grade) => (
                          <option key={grade.level} value={grade.level}>
                            Grade {grade.level} (GHS{grade.rate}/hr)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Work Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                  <input
                    type="text"
                    placeholder="E.g. Regular, Contractor"
                    value={getSafeValue(newEmployee.workType)}
                    onChange={(e) => setNewEmployee({ ...newEmployee, workType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Rate Configuration */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rate Configuration</label>
                    <p className="text-xs text-gray-500">
                      {newEmployee.usePositionRate ? 
                        `Using position rate: GHS${getPositionRate(newEmployee.jobPosition, newEmployee.jobGrade) || 'N/A'}/hr` : 
                        'Using custom rate'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEmployee.usePositionRate}
                      onChange={(e) => {
                        const usePositionRate = e.target.checked;
                        let rate = newEmployee.minimumRate;
                        
                        if (usePositionRate && newEmployee.jobPosition && newEmployee.jobGrade) {
                          rate = getPositionRate(newEmployee.jobPosition, newEmployee.jobGrade) || newEmployee.minimumRate;
                        }
                        
                        setNewEmployee({ 
                          ...newEmployee, 
                          usePositionRate: usePositionRate,
                          minimumRate: rate.toString()
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Custom Rate Input (only show when not using position rate) */}
                {!newEmployee.usePositionRate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Hourly Rate (GHS)</label>
                    <input
                      type="number"
                      value={getSafeValue(newEmployee.minimumRate)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, minimumRate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Current Rate Display */}
                {newEmployee.jobPosition && newEmployee.jobGrade && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Current Rate:</strong> {newEmployee.usePositionRate ? 
                        `GHS${getPositionRate(newEmployee.jobPosition, newEmployee.jobGrade) || newEmployee.minimumRate}/hr (Position-based)` : 
                        `GHS${newEmployee.minimumRate}/hr (Custom)`}
                    </p>
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="number"
                    placeholder="E.g. 123456789"
                    value={getSafeValue(newEmployee.phone)}
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
                      value={getSafeValue(newEmployee.ssnitNumber)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, ssnitNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TIN Number</label>
                    <input
                      type="text"
                      placeholder="Enter TIN Number"
                      value={getSafeValue(newEmployee.tinNumber)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, tinNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={getSafeValue(newEmployee.startDate)}
                    onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Allowances */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
                  <input
                    type="number"
                    value={getSafeValue(newEmployee.allowances)}
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
                      value={getSafeValue(newEmployee.basicSalary)}
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
                      value={getSafeValue(newEmployee.accountNumber)}
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

        {/* Edit Employee Modal - NOW SCROLLABLE */}
        {isEditMenuOpen && editingEmployee && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div ref={editMenuRef} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
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

              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={getSafeValue(editingEmployee.category)}
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
                      value={getSafeValue(editingEmployee.firstName)}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={getSafeValue(editingEmployee.lastName)}
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
                    value={getSafeValue(editingEmployee.email)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Job Position and Grade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
                    <select
                      value={getSafeValue(editingEmployee.jobPosition)}
                      onChange={(e) => {
                        const selectedPosition = e.target.value;
                        const position = settings.jobPositions?.find(p => p.name === selectedPosition);
                        const defaultGrade = position?.grades?.[0]?.level || "I";
                        const defaultRate = position?.grades?.find(g => g.level === defaultGrade)?.rate || editingEmployee.minimumRate;
                        
                        setEditingEmployee({ 
                          ...editingEmployee, 
                          jobPosition: selectedPosition,
                          jobGrade: defaultGrade,
                          minimumRate: editingEmployee.usePositionRate !== false ? defaultRate.toString() : editingEmployee.minimumRate
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Job Position</option>
                      {settings.jobPositions?.map((position) => (
                        <option key={position.name} value={position.name}>
                          {position.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Grade</label>
                    <select
                      value={getSafeValue(editingEmployee.jobGrade) || "I"}
                      onChange={(e) => {
                        const selectedGrade = e.target.value;
                        const position = settings.jobPositions?.find(p => p.name === editingEmployee.jobPosition);
                        const gradeRate = position?.grades?.find(g => g.level === selectedGrade)?.rate || editingEmployee.minimumRate;
                        
                        setEditingEmployee({ 
                          ...editingEmployee, 
                          jobGrade: selectedGrade,
                          minimumRate: editingEmployee.usePositionRate !== false ? gradeRate.toString() : editingEmployee.minimumRate
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {editingEmployee.jobPosition ? (
                        getPositionGrades(editingEmployee.jobPosition).map((grade) => (
                          <option key={grade.level} value={grade.level}>
                            Grade {grade.level} (GHS{grade.rate}/hr)
                          </option>
                        ))
                      ) : (
                        <option value="I">Grade I</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Work Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.workType)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, workType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Rate Configuration */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rate Configuration</label>
                    <p className="text-xs text-gray-500">
                      {editingEmployee.usePositionRate !== false ? 
                        `Position rate: GHS${getPositionRate(editingEmployee.jobPosition, editingEmployee.jobGrade) || editingEmployee.minimumRate}/hr` : 
                        `Custom rate: GHS${editingEmployee.minimumRate}/hr`}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEmployee.usePositionRate !== false}
                      onChange={(e) => {
                        const usePositionRate = e.target.checked;
                        let rate = editingEmployee.minimumRate;
                        
                        if (usePositionRate && editingEmployee.jobPosition && editingEmployee.jobGrade) {
                          rate = getPositionRate(editingEmployee.jobPosition, editingEmployee.jobGrade) || editingEmployee.minimumRate;
                        }
                        
                        setEditingEmployee({ 
                          ...editingEmployee, 
                          usePositionRate: usePositionRate,
                          minimumRate: rate.toString()
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Custom Rate Input */}
                {editingEmployee.usePositionRate === false && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Hourly Rate (GHS)</label>
                    <input
                      type="number"
                      value={getSafeValue(editingEmployee.minimumRate)}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, minimumRate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Current Rate Display */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Current Rate:</strong> {editingEmployee.usePositionRate !== false ? 
                      `GHS${getPositionRate(editingEmployee.jobPosition, editingEmployee.jobGrade) || editingEmployee.minimumRate}/hr (Position-based)` : 
                      `GHS${editingEmployee.minimumRate}/hr (Custom)`}
                  </p>
                </div>

                {/* SSNIT + TIN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SSNIT Number</label>
                    <input
                      type="text"
                      value={getSafeValue(editingEmployee.ssnitNumber)}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, ssnitNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TIN Number</label>
                    <input
                      type="text"
                      value={getSafeValue(editingEmployee.tinNumber)}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, tinNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Start Date + Account Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={getSafeValue(editingEmployee.startDate)}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="number"
                      value={getSafeValue(editingEmployee.accountNumber)}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, accountNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Allowances */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
                  <input
                    type="number"
                    value={getSafeValue(editingEmployee.allowances)}
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
        {isPopupOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-7xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Excel Import Preview</h2>
              <p className="text-sm text-gray-600 mb-4">
                Found {uploadedData.length} employee(s). Employee IDs will be automatically generated.
              </p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SSNIT Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TIN Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tag Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Birth</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emergency Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Original Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Position</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Minimum Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent Allowance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transport Allowance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clothing Allowance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Other Allowance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {uploadedData.map((employee, index) => {
                    const existingEmployeesArray = Array.isArray(employees) ? employees : [];
                    const generatedId = generateEmployeeId(employee.startDate, index, existingEmployeesArray);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">
                          {generatedId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{employee.firstName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{employee.lastName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.email || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.phone || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.ssnitNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.tinNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.tagNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.dateOfBirth || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.emergencyContact || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.accountNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.originalEmployeeId || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            employee.category === "Projects" ? "bg-blue-100 text-blue-800" :
                            employee.category === "Site Services" ? "bg-green-100 text-green-800" :
                            employee.category === "Ahafo North" ? "bg-purple-100 text-purple-800" :
                            employee.category === "NSS" ? "bg-orange-100 text-orange-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {employee.category || 'Not set'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.jobPosition || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.workType || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.department || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.startDate || 'Not set'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.endDate || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.basicSalary || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.minimumRate || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.grade || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.rentAllowance || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.transportAllowance || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.clothingAllowance || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.otherAllowance || 'N/A'}</td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 max-w-md">
                  <strong>Note:</strong> Employee IDs follow format: E-YYMMDD-XXX (e.g., E-250301-001). 
                  Original employee IDs from Excel will be replaced with generated ones.
                </div>
                <div className="flex gap-4">
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
                    Import {uploadedData.length} Employee{uploadedData.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Employee;