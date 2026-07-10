import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import MainSidebar from "../mainSidebar";
import Header from "../../../components/Header";

const getSafeValue = (value) => {
  if (value === null || value === undefined) return "";
  return value;
};

function Employee() {
  const [settings, setSettings] = useState({
    jobPositions: [],
    categories: []
  });
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState("");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const menuRefs = useRef({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isBasicSalaryEditable, setIsBasicSalaryEditable] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // ✅ Expanded newEmployee state with all fields
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
    usePositionRate: true,
    dateOfBirth: "",
    location: "",
    ghanaCard: "",
    bank: "",
    bankBranch: "",
    contactPerson: "",
    relationship: "",
    townOfResidence: "",
    houseNumber: "",
    spouse: "",
    numberOfChildren: 0,
    age: 0,
    tagNumber: "",
    emergencyContact: "",
    department: "",
    rentAllowance: "",
    transportAllowance: "",
    clothingAllowance: "",
    otherAllowance: "",
    nssAllowance: "",
    accountName: "",
    ssnitAccountName: "",
    applyWithholdingTax: false,
    excludeFromSsnit: false,
    tierTwoAccountName: "",
    tierTwoAccountNumber: "",
    baseNumber: "",
    endDate: "" // optional
  });

  const filteredEmployees = employees.filter(emp => {
    if (selectedCategory && emp.category !== selectedCategory) {
      return false;
    }
    
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      const searchableFields = [
        emp.employeeId || '',
        emp.firstName || '',
        emp.lastName || '',
        emp.email || '',
        emp.phone || '',
        emp.jobPosition || '',
        emp.category || '',
        emp.workType || '',
        emp.tagNumber || '',
        emp.ssnitNumber || '',
        emp.tinNumber || '',
        emp.department || '',
        emp.location || ''
      ];
      
      return searchableFields.some(field => 
        field.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });

  const createMenuRef = useRef(null);
  const editMenuRef = useRef(null);

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    console.log("🖥️ Current hostname:", hostname);
    console.log("🔌 Current port:", port);

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("🏠 Using LOCALHOST API URL");
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      console.log("🏠 Using LAN API URL");
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    if (hostname === "100.114.178.13") {
      console.log("🌐 Using PUBLIC API URL");
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    console.log("🌍 Using PUBLIC API URL (fallback)");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.hamburger-button')) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setUser({
            name: data.username,
            role: data.role.replace("ROLE_", "").toLowerCase(), 
            email: data.email
          });
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = getToken();
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

  const toggleEmployeeActive = async (id, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this employee?`)) return;
    
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/employee/${id}/toggle-active`, {
            method: "PUT",
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) throw new Error("Failed to toggle employee status");

        const result = await response.json();
        
        setEmployees(employees.map(emp => 
            emp.id === id ? { ...emp, active: result.active } : emp
        ));
        
        setSuccessMessage(`Employee ${result.active ? 'activated' : 'deactivated'} successfully!`);
        setTimeout(() => setSuccessMessage(""), 3000);
        setOpenMenuId(null);
    } catch (err) {
        setError(err.message);
    }
  };

  const getPositionGrades = (positionName) => {
    const position = settings.jobPositions?.find(p => p.name === positionName);
    return position?.grades || [];
  };

  const getPositionRate = (positionName, gradeLevel) => {
    const position = settings.jobPositions?.find(p => p.name === positionName);
    if (!position || !position.grades) return null;
    
    const grade = position.grades.find(g => g.level === gradeLevel);
    return grade ? grade.rate : null;
  };

  const getDefaultGradeForPosition = (positionName) => {
    const grades = getPositionGrades(positionName);
    return grades.length > 0 ? grades[0].level : "I";
  };

  const getDefaultRateForPosition = (positionName) => {
    const grades = getPositionGrades(positionName);
    return grades.length > 0 ? grades[0].rate : 0;
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
  }, [newEmployee.jobPosition, newEmployee.jobGrade, newEmployee.usePositionRate]);

  useEffect(() => {
    fetchEmployees();
    fetchSettings();
  }, []);

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null); 

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const fetchSettings = async () => {
    try {
      setLoadingCategories(true);
      const token = getToken();
      const [positionsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/settings/job-positions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/settings/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })
      ]);

      if (positionsRes.ok) {
        const positions = await positionsRes.json();
        setSettings(prev => ({ ...prev, jobPositions: positions }));
      }

      if (categoriesRes.ok) {
        const categories = await categoriesRes.json();
        setSettings(prev => ({ 
          ...prev, 
          categories: categories
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const getCategories = () => {
    try {
      if (settings?.categories && Array.isArray(settings.categories)) {
        return settings.categories.map(cat => cat.name || String(cat)).filter(Boolean);
      }
      
      return ["General"];
    } catch (error) {
      console.error('Error getting categories:', error);
      return ["General"];
    }
  };

  const categories = getCategories();

  const getCategoryIdFromName = (categoryName) => {
    const category = settings.categories?.find(cat => cat.name === categoryName);
    return category ? category.id : null;
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
    
    if (typeof value === 'number') {
      const date = new Date((value - (25567 + 2)) * 86400 * 1000);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }
    
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  };

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

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          setError("Excel file doesn't contain enough data (needs at least 1 data row)");
          return;
        }
        
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

        const employeesData = jsonData.slice(1).map((row, rowIndex) => {
          const employee = {};
          
          headers.forEach((header, index) => {
            const value = row[index];
            
            if (!header || value === undefined) return;
            
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
                const jobPositionValue = getSafeValue(value);
                const jobPositionExists = settings.jobPositions?.some(p => 
                  p.name.toLowerCase() === jobPositionValue.toLowerCase()
                );
                employee.jobPosition = jobPositionExists ? jobPositionValue : 'General Worker';
                break;
              case 'category':
              case 'empcategory':
              case 'employee_category':
              case 'dept':
                const categoryName = getSafeValue(value);
                const validCategory = settings.categories?.find(cat => 
                  cat.name.toLowerCase() === categoryName.toLowerCase()
                )?.name || categories[0] || "General";
                employee.category = validCategory;
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
              case 'ssnitaccountname':
              case 'ssnit_account_name':
              case 'ssnitaccount_name':
              case 'ssnitaccount':
                employee.ssnitAccountName = getSafeValue(value);
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
              case 'nssallowance':
              case 'nss_allowance':
              case 'nssAllowance':
                employee.nssAllowance = getSafeValue(value);
                break;
              case 'location':
              case 'address':
              case 'residence':
                employee.location = getSafeValue(value);
                break;
              case 'ghanacard':
              case 'ghana_card':
              case 'nationalid':
              case 'national_id':
                employee.ghanaCard = getSafeValue(value);
                break;
              case 'bank':
              case 'bankname':
              case 'bank_name':
                employee.bank = getSafeValue(value);
                break;
              case 'accountname':
              case 'account_name':
                employee.accountName = getSafeValue(value);
                break;
              case 'bankbranch':
              case 'bank_branch':
              case 'branch':
                employee.bankBranch = getSafeValue(value);
                break;
              case 'contactperson':
              case 'contact_person':
              case 'emergencycontactperson':
                employee.contactPerson = getSafeValue(value);
                break;
              case 'relationship':
              case 'contactrelationship':
              case 'emergencyrelationship':
                employee.relationship = getSafeValue(value);
                break;
              case 'townofresidence':
              case 'town_of_residence':
              case 'town':
              case 'city':
                employee.townOfResidence = getSafeValue(value);
                break;
              case 'housenumber':
              case 'house_number':
              case 'houseno':
                employee.houseNumber = getSafeValue(value);
                break;
              case 'spouse':
              case 'spousename':
              case 'partner':
                employee.spouse = getSafeValue(value);
                break;
              case 'tierTwoAccountName':
                employee.tierTwoAccountName = getSafeValue(value);
                 break;
              case 'tierTwoAccountNumber':
                employee.tierTwoAccountNumber = getSafeValue(value);
                 break;   
              case 'numberofchildren':
              case 'number_of_children':
              case 'children':
              case 'dependents':
                employee.numberOfChildren = getSafeValue(value) ? parseInt(getSafeValue(value)) : 0;
                break;
              case 'age':
                employee.age = getSafeValue(value) ? parseInt(getSafeValue(value)) : null;
                break;
              default:
                if (header.includes('first')) employee.firstName = getSafeValue(value);
                else if (header.includes('last')) employee.lastName = getSafeValue(value);
                else if (header.includes('email')) employee.email = getSafeValue(value);
                else if (header.includes('phone') || header.includes('mobile')) employee.phone = getSafeValue(value);
                break;
            }
          });

          if (!employee.firstName || !employee.lastName) {
            console.warn(`Skipping row ${rowIndex + 2}: Missing first name or last name`);
            return null;
          }

          if (!employee.category) employee.category = categories[0] || "General";
          if (!employee.workType) employee.workType = "Regular";
          if (!employee.jobPosition) employee.jobPosition = "General Worker";

          return employee;
        }).filter(employee => employee !== null);

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

  const exportToExcel = () => {
    const dataToExport = employees.map(employee => ({
      'Employee ID': employee.employeeId,
      'First Name': employee.firstName,
      'Last Name': employee.lastName,
      'Email': employee.email,
      'Phone': employee.phone,
      'Job Position': employee.jobPosition,
      'Job Grade': employee.jobGrade,
      'Work Type': employee.workType,
      'Category': employee.category,
      'Minimum Rate': employee.minimumRate,
      'Basic Salary': employee.basicSalary,
      'SSNIT Number': employee.ssnitNumber,
      'SSNIT Account Name': employee.ssnitAccountName,
      'TIN Number': employee.tinNumber,
      'Start Date': employee.startDate,
      'End Date': employee.endDate,
      'Account Number': employee.accountNumber,
      'Date of Birth': employee.dateOfBirth,
      'Location': employee.location,
      'Ghana Card': employee.ghanaCard,
      'Bank': employee.bank,
      'Account Name': employee.accountName,
      'Bank Branch': employee.bankBranch,
      'Contact Person': employee.contactPerson,
      'Relationship': employee.relationship,
      'Town of Residence': employee.townOfResidence,
      'House Number': employee.houseNumber,
      'Spouse': employee.spouse,
      'Number of Children': employee.numberOfChildren,
      'Age': employee.age,
      'Rent Allowance': employee.rentAllowance,
      'Transport Allowance': employee.transportAllowance,
      'Clothing Allowance': employee.clothingAllowance,
      'Other Allowance': employee.otherAllowance,
      'NSS Allowance': employee.nssAllowance,
      'Emergency Contact': employee.emergencyContact,
      'Department': employee.department,
      'Tag Number': employee.tagNumber,
      'Hourly Rate': employee.hourlyRate,
      'Overtime Rate': employee.overtimeRate,
      'Active Status': employee.active ? 'Active' : 'Inactive',
      'Exclude from SSNIT': employee.excludeFromSsnit ? 'Yes' : 'No',
      'Supervisor': employee.isSupervisor ? 'Yes' : 'No',
      'Supervisor Name': employee.supervisor ? `${employee.supervisor.firstName} ${employee.supervisor.lastName}` : 'N/A',
      'Supervisor ID': employee.supervisor ? employee.supervisor.employeeId : 'N/A',
      'Job Assigned': employee.job ? employee.job.name : 'N/A',
      'Job Code': employee.job ? employee.job.code : 'N/A',
      'Supervised Job': employee.supervisedJob ? employee.supervisedJob.name : 'N/A',
      'Total Allowances': (employee.rentAllowance || 0) + 
                          (employee.transportAllowance || 0) + 
                          (employee.clothingAllowance || 0) + 
                          (employee.nssAllowance || 0) + 
                          (employee.otherAllowance || 0),
      'Total Monthly Cost': (employee.basicSalary || 0) + 
                           (employee.rentAllowance || 0) + 
                           (employee.transportAllowance || 0) + 
                           (employee.clothingAllowance || 0) + 
                           (employee.nssAllowance || 0) + 
                           (employee.otherAllowance || 0),
      'Years of Service': employee.startDate ? 
                         Math.floor((new Date() - new Date(employee.startDate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees_data.xlsx");
  };

  const saveUploadedData = async () => {
    try {
      const token = getToken();
      
      const employeesToSave = uploadedData.map((employee, index) => {
        const safeFirstName = employee.firstName ? String(employee.firstName).trim() : '';
        const safeLastName = employee.lastName ? String(employee.lastName).trim() : '';
        
        let email = employee.email ? String(employee.email).trim() : '';
        if (!email && safeFirstName && safeLastName) {
          email = `${safeFirstName.toLowerCase()}.${safeLastName.toLowerCase()}@company.com`;
        } else if (!email) {
          email = `employee${index + 1}@company.com`;
        }

        const cleanEmployee = {
          firstName: safeFirstName || '',
          lastName: safeLastName || '',
          email: email,
          phone: employee.phone ? String(employee.phone).trim() : '',
          jobPosition: employee.jobPosition ? String(employee.jobPosition).trim() : 'General Worker',
          minimumRate: employee.minimumRate ? parseFloat(employee.minimumRate) : 0,
          category: employee.category || categories[0] || "General",
          workType: employee.workType ? String(employee.workType).trim() : 'Regular',
          numberOfChildren: employee.numberOfChildren ? parseInt(employee.numberOfChildren) : 0,
          age: employee.age ? parseInt(employee.age) : 0,
          ssnitNumber: employee.ssnitNumber ? String(employee.ssnitNumber).trim() : null,
          ssnitAccountName: employee.ssnitAccountName ? String(employee.ssnitAccountName).trim() : null,
          tinNumber: employee.tinNumber ? String(employee.tinNumber).trim() : null,
          startDate: employee.startDate || new Date().toISOString().split('T')[0],
          endDate: employee.endDate || null,
          basicSalary: employee.basicSalary ? parseFloat(employee.basicSalary) : null,
          accountNumber: employee.accountNumber ? String(employee.accountNumber).trim() : null,
          rentAllowance: employee.rentAllowance ? parseFloat(employee.rentAllowance) : 0,
          transportAllowance: employee.transportAllowance ? parseFloat(employee.transportAllowance) : 0,
          clothingAllowance: employee.clothingAllowance ? parseFloat(employee.clothingAllowance) : 0,
          otherAllowance: employee.otherAllowance ? parseFloat(employee.otherAllowance) : 0,
          nssAllowance: employee.nssAllowance ? parseFloat(employee.nssAllowance) : 0,
          tagNumber: employee.tagNumber ? String(employee.tagNumber).trim() : null,
          dateOfBirth: employee.dateOfBirth || null,
          emergencyContact: employee.emergencyContact ? String(employee.emergencyContact).trim() : null,
          department: employee.department ? String(employee.department).trim() : null,
          location: employee.location ? String(employee.location).trim() : null,
          ghanaCard: employee.ghanaCard ? String(employee.ghanaCard).trim() : null,
          bank: employee.bank ? String(employee.bank).trim() : null,
          accountName: employee.accountName ? String(employee.accountName).trim() : null,
          bankBranch: employee.bankBranch ? String(employee.bankBranch).trim() : null,
          contactPerson: employee.contactPerson ? String(employee.contactPerson).trim() : null,
          relationship: employee.relationship ? String(employee.relationship).trim() : null,
          townOfResidence: employee.townOfResidence ? String(employee.townOfResidence).trim() : null,
          houseNumber: employee.houseNumber ? String(employee.houseNumber).trim() : null,
          spouse: employee.spouse ? String(employee.spouse).trim() : null,
          jobGrade: employee.grade || "I",
          allowances: employee.allowances ? parseFloat(employee.allowances) : 0,
          excludeFromSsnit: employee.excludeFromSsnit || false,
          tierTwoAccountName: employee.tierTwoAccountName || null,
          tierTwoAccountNumber: employee.tierTwoAccountNumber || null,
          baseNumber: employee.baseNumber || null
        };

        Object.keys(cleanEmployee).forEach(key => {
          if (cleanEmployee[key] === undefined) {
            cleanEmployee[key] = null;
          }
        });

        return cleanEmployee;
      });

      const invalidEmployees = employeesToSave.filter(emp => 
        !emp.firstName || !emp.lastName
      );
      
      if (invalidEmployees.length > 0) {
        throw new Error(`Found ${invalidEmployees.length} employees with missing required fields (first name and last name)`);
      }

      const response = await fetch(`${API_BASE_URL}/api/employee/bulk`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(employeesToSave),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to save data: ${response.status} - ${errorText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (e) {
          // If not JSON, use the text as is
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setEmployees((prevEmployees) => [...prevEmployees, ...data]);
      setUploadedData([]);
      setIsPopupOpen(false);
      setSelectedFile(null);
      setSuccessMessage(`Successfully imported ${employeesToSave.length} employees!`);
      setTimeout(() => setSuccessMessage(""), 5000);
      
      fetchEmployees();
    } catch (err) {
      setError(err.message);
      console.error('Import error:', err);
    }
  };

  // ✅ Updated createEmployee to include all fields
  const createEmployee = async () => {
    let finalRate = newEmployee.minimumRate;

    if (newEmployee.usePositionRate) {
      const positionRate = getPositionRate(newEmployee.jobPosition, newEmployee.jobGrade);
      finalRate = positionRate || newEmployee.minimumRate;
    }

    const selectedCategoryObj = settings.categories?.find(cat => cat.name === newEmployee.category);
    
    const employeeData = {
      ...newEmployee,
      minimumRate: finalRate,
      jobGrade: newEmployee.jobGrade || "I",
      numberOfChildren: newEmployee.numberOfChildren ? parseInt(newEmployee.numberOfChildren) : 0,
      age: newEmployee.age ? parseInt(newEmployee.age) : 0,
      hourlyRate: parseFloat(finalRate) || 0.0,
      overtimeRate: (parseFloat(finalRate) * 1.5) || 0.0,
      basicSalary: newEmployee.basicSalary ? parseFloat(newEmployee.basicSalary) : 0.0,
      rentAllowance: newEmployee.rentAllowance ? parseFloat(newEmployee.rentAllowance) : 0.0,
      transportAllowance: newEmployee.transportAllowance ? parseFloat(newEmployee.transportAllowance) : 0.0,
      clothingAllowance: newEmployee.clothingAllowance ? parseFloat(newEmployee.clothingAllowance) : 0.0,
      otherAllowance: newEmployee.otherAllowance ? parseFloat(newEmployee.otherAllowance) : 0.0,
      nssAllowance: newEmployee.nssAllowance ? parseFloat(newEmployee.nssAllowance) : 0.0,
      accountName: newEmployee.accountName || "N/A",
      ssnitAccountName: newEmployee.ssnitAccountName || "N/A",
      categoryId: selectedCategoryObj ? selectedCategoryObj.id : null,
      excludeFromSsnit: newEmployee.excludeFromSsnit || false,
      applyWithholdingTax: newEmployee.applyWithholdingTax || false,
      tierTwoAccountName: newEmployee.tierTwoAccountName || null,
      tierTwoAccountNumber: newEmployee.tierTwoAccountNumber || null,
      baseNumber: newEmployee.baseNumber || null,
      dateOfBirth: newEmployee.dateOfBirth || null,
      location: newEmployee.location || null,
      ghanaCard: newEmployee.ghanaCard || null,
      bank: newEmployee.bank || null,
      bankBranch: newEmployee.bankBranch || null,
      contactPerson: newEmployee.contactPerson || null,
      relationship: newEmployee.relationship || null,
      townOfResidence: newEmployee.townOfResidence || null,
      houseNumber: newEmployee.houseNumber || null,
      spouse: newEmployee.spouse || null,
      tagNumber: newEmployee.tagNumber || null,
      emergencyContact: newEmployee.emergencyContact || null,
      department: newEmployee.department || null,
      endDate: newEmployee.endDate || null
    };

    delete employeeData.usePositionRate;
    delete employeeData.allowances;

    if (!employeeData.firstName || !employeeData.lastName || !employeeData.email) {
      setError("Please fill out all required fields (First Name, Last Name, Email).");
      return;
    }

    try {
      const token = getToken();
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
      
      // Reset form with defaults (including new fields)
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
        ssnitAccountName: "",
        tinNumber: "",
        startDate: "",
        accountName: "",
        accountNumber: "",
        allowances: "",
        employeeId: "",
        usePositionRate: true,
        numberOfChildren: 0,
        age: 0,
        dateOfBirth: "",
        location: "",
        ghanaCard: "",
        bank: "",
        bankBranch: "",
        contactPerson: "",
        relationship: "",
        townOfResidence: "",
        houseNumber: "",
        spouse: "",
        tagNumber: "",
        emergencyContact: "",
        department: "",
        rentAllowance: "",
        transportAllowance: "",
        clothingAllowance: "",
        otherAllowance: "",
        nssAllowance: "",
        excludeFromSsnit: false,
        tierTwoAccountName: "",
        tierTwoAccountNumber: "",
        baseNumber: "",
        applyWithholdingTax: false,
        endDate: ""
      });

      setIsCreateMenuOpen(false);
      setSuccessMessage("Employee created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateEmployee = async () => {
    if (!editingEmployee) return;
  
    try {
      const token = getToken();
      const selectedCategoryObj = settings.categories?.find(cat => cat.name === editingEmployee.category);
      
      const employeeData = {
        ...editingEmployee,
        categoryId: selectedCategoryObj ? selectedCategoryObj.id : null
      };

      const response = await fetch(`${API_BASE_URL}/api/employee/${editingEmployee.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
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
  };

  const deleteEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    
    try {
      const token = getToken();
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

  const closeAllModals = () => {
    setIsCreateMenuOpen(false);
    setIsEditMenuOpen(false);
    setIsPopupOpen(false);
    setEditingEmployee(null);
  };

  const toggleRowExpansion = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "N/A";
    const num = typeof amount === "number" ? amount : parseFloat(amount);
    if (isNaN(num)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "GHS",
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const options = { year: "numeric", month: "short", day: "numeric" };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return "Invalid Date";
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee({
      ...employee,
      usePositionRate: employee.usePositionRate !== false,
      jobGrade: employee.jobGrade || "I",
      minimumRate: employee.minimumRate || 0,
      excludeFromSsnit: employee.excludeFromSsnit || false,
    });
    setIsEditMenuOpen(true);
    setOpenMenuId(null);
  };

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      <div 
        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'
        }`}
      >
        {(isCreateMenuOpen || isEditMenuOpen || isPopupOpen) && (
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeAllModals}></div>
        )}

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

        <main className="flex-1 mx-auto px-4 md:px-6 py-6">
          <Header
            toggleSidebar={toggleSidebar}
            user={user}
            onLogout={handleLogout}
          />

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
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-200 flex items-center gap-2"
                    onClick={exportToExcel}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Export Excel
                  </button>

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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SSNIT Exempt
                      </th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Witholding
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee) => (
                      <>
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
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {employee.category || 'General'}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              employee.excludeFromSsnit ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {employee.excludeFromSsnit ? 'Excluded' : 'Included'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  <span className={`px-2 py-1 rounded-full text-xs ${
    employee.applyWithholdingTax 
      ? 'bg-orange-100 text-orange-800' 
      : 'bg-blue-100 text-blue-800'
  }`}>
    {employee.applyWithholdingTax ? 'Withholding Tax' : 'Standard PAYE'}
  </span>
</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                                employee.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {employee.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end items-center gap-3">
                              <button
                                onClick={() => toggleRowExpansion(employee.id)}
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                {expandedRows[employee.id] ? 'Hide Details' : 'View All Info'}
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${expandedRows[employee.id] ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
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
                                        onClick={() => handleEditEmployee(employee)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                        onClick={() => deleteEmployee(employee.id)}
                                      >
                                        Delete
                                      </button>
                                      <button
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={() => toggleEmployeeActive(employee.id, employee.active)}
                                      >
                                        {employee.active ? 'Deactivate' : 'Activate'} Employee
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                        
                        {expandedRows[employee.id] && (
                          <tr className="bg-blue-50">
                            <td colSpan="10" className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500">Phone</p>
                                  <p className="text-sm font-medium">{employee.phone || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">SSNIT Account Name</p>
                                  <p className="text-sm font-medium">{employee.ssnitAccountName || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">SSNIT Number</p>
                                  <p className="text-sm font-medium">{employee.ssnitNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">TIN</p>
                                  <p className="text-sm font-medium">{employee.tinNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Tag Number</p>
                                  <p className="text-sm font-medium">{employee.tagNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Date of Birth</p>
                                  <p className="text-sm font-medium">{formatDate(employee.dateOfBirth)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Emergency Contact</p>
                                  <p className="text-sm font-medium">{employee.emergencyContact || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Account Number</p>
                                  <p className="text-sm font-medium">{employee.accountNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Name on Bank Account</p>
                                  <p className="text-sm font-medium">{employee.accountName || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Location</p>
                                  <p className="text-sm font-medium">{employee.location || 'N/A'}</p>
                                </div>
                                 <div>
                                  <p className="text-xs text-gray-500">Tier Two Account Name</p>
                                  <p className="text-sm font-medium">{employee.tierTwoAccountName || 'N/A'}</p>
                                </div>

                                <div>
                                  <p className="text-xs text-gray-500">Tier Two Account Number</p>
                                  <p className="text-sm font-medium">{employee.tierTwoAccountNumber || 'N/A'}</p>
                                </div>
                                  <div>
                                  <p className="text-xs text-gray-500">Base Number</p>
                                  <p className="text-sm font-medium">{employee.baseNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Ghana Card</p>
                                  <p className="text-sm font-medium">{employee.ghanaCard || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Bank</p>
                                  <p className="text-sm font-medium">{employee.bank || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Bank Branch</p>
                                  <p className="text-sm font-medium">{employee.bankBranch || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Contact Person</p>
                                  <p className="text-sm font-medium">{employee.contactPerson || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Relationship</p>
                                  <p className="text-sm font-medium">{employee.relationship || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Town of Residence</p>
                                  <p className="text-sm font-medium">{employee.townOfResidence || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">House Number</p>
                                  <p className="text-sm font-medium">{employee.houseNumber || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Spouse</p>
                                  <p className="text-sm font-medium">{employee.spouse || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Children</p>
                                  <p className="text-sm font-medium">{employee.numberOfChildren || 0}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Age</p>
                                  <p className="text-sm font-medium">{employee.age || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Department</p>
                                  <p className="text-sm font-medium">{employee.department || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Basic Salary</p>
                                  <p className="text-sm font-medium">{formatCurrency(employee.basicSalary)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Rent Allowance</p>
                                  <p className="text-sm font-medium">{formatCurrency(employee.rentAllowance)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Transport Allowance</p>
                                  <p className="text-sm font-medium">{formatCurrency(employee.transportAllowance)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Clothing Allowance</p>
                                  <p className="text-sm font-medium">{formatCurrency(employee.clothingAllowance)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Other Allowance</p>
                                  <p className="text-sm font-medium">{formatCurrency(employee.otherAllowance)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">NSS Allowance</p>
                                  <p className="text-sm font-medium">{formatCurrency(employee.nssAllowance)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Start Date</p>
                                  <p className="text-sm font-medium">{formatDate(employee.startDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">End Date</p>
                                  <p className="text-sm font-medium">{formatDate(employee.endDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Exclude from SSNIT</p>
                                  <p className="text-sm font-medium">{employee.excludeFromSsnit ? 'Yes' : 'No'}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        {/* ============================================================ */}
        {/* 🟢 CREATE MODAL – enhanced with all missing fields             */}
        {/* ============================================================ */}
        {isCreateMenuOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div ref={createMenuRef} className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
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
              
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  {loadingCategories ? (
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100">
                      <span className="text-gray-500">Loading categories...</span>
                    </div>
                  ) : (
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
                  )}
                </div>

                {/* Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      placeholder="First name"
                      value={getSafeValue(newEmployee.firstName)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="text"
                    placeholder="Employee email"
                    value={getSafeValue(newEmployee.email)}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Job Position & Grade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
                    <select
                      value={getSafeValue(newEmployee.jobPosition)}
                      onChange={(e) => {
                        const selectedPosition = e.target.value;
                        const defaultGrade = getDefaultGradeForPosition(selectedPosition);
                        const defaultRate = getDefaultRateForPosition(selectedPosition);
                        
                        setNewEmployee({ 
                          ...newEmployee, 
                          jobPosition: selectedPosition,
                          jobGrade: defaultGrade,
                          minimumRate: newEmployee.usePositionRate ? defaultRate.toString() : newEmployee.minimumRate
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Job Position</option>
                      {settings.jobPositions?.map((position) => (
                        <option key={position.name} value={position.name}>
                          {position.name} {position.category ? `(${position.category})` : ''}
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
                          const gradeRate = getPositionRate(newEmployee.jobPosition, selectedGrade) || newEmployee.minimumRate;
                          
                          setNewEmployee({ 
                            ...newEmployee, 
                            jobGrade: selectedGrade,
                            minimumRate: newEmployee.usePositionRate ? gradeRate.toString() : newEmployee.minimumRate
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

                {!newEmployee.usePositionRate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Hourly Rate (GHS)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={getSafeValue(newEmployee.minimumRate)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, minimumRate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="E.g. 123456789"
                    value={getSafeValue(newEmployee.phone)}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* SSNIT Account Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SSNIT Account Name</label>
                  <input
                    type="text"
                    placeholder="Ssnit account name"
                    value={getSafeValue(newEmployee.ssnitAccountName)}
                    onChange={(e) => setNewEmployee({ ...newEmployee, ssnitAccountName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* SSNIT & TIN */}
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

                {/* Exclude from SSNIT Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exclude from SSNIT</label>
                    <p className="text-xs text-gray-500">When checked, no SSNIT will be deducted from this employee's pay</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEmployee.excludeFromSsnit}
                      onChange={(e) => setNewEmployee({ ...newEmployee, excludeFromSsnit: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Apply Withholding Tax Toggle */}
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Apply Withholding Tax</label>
                    <p className="text-xs text-gray-500">When checked, Withholding Tax applies instead of PAYE</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEmployee.applyWithholdingTax}
                      onChange={(e) => setNewEmployee({ ...newEmployee, applyWithholdingTax: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {/* Start Date & End Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={getSafeValue(newEmployee.startDate)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                    <input
                      type="date"
                      value={getSafeValue(newEmployee.endDate)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Basic Salary & Account Number */}
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

                {/* Account Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={getSafeValue(newEmployee.accountName)}
                    onChange={(e) => setNewEmployee({ ...newEmployee, accountName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* ========== NEW FIELDS ========== */}

                {/* Personal & Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={getSafeValue(newEmployee.dateOfBirth)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={getSafeValue(newEmployee.age)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, age: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.location)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghana Card</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.ghanaCard)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, ghanaCard: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.emergencyContact)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, emergencyContact: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tag Number</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.tagNumber)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, tagNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.bank)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, bank: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Branch</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.bankBranch)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, bankBranch: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Family & Residence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.contactPerson)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, contactPerson: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.relationship)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, relationship: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Town of Residence</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.townOfResidence)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, townOfResidence: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.houseNumber)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, houseNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Spouse</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.spouse)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, spouse: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Children</label>
                    <input
                      type="number"
                      value={getSafeValue(newEmployee.numberOfChildren)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, numberOfChildren: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.department)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Allowances */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rent Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={getSafeValue(newEmployee.rentAllowance)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, rentAllowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transport Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={getSafeValue(newEmployee.transportAllowance)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, transportAllowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clothing Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={getSafeValue(newEmployee.clothingAllowance)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, clothingAllowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={getSafeValue(newEmployee.otherAllowance)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, otherAllowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NSS Allowance</label>
                    <input
                      type="number"
                      step="0.01"
                      value={getSafeValue(newEmployee.nssAllowance)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, nssAllowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Tier Two & Base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tier Two Account Name</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.tierTwoAccountName)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, tierTwoAccountName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tier Two Account Number</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.tierTwoAccountNumber)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, tierTwoAccountNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Number</label>
                    <input
                      type="text"
                      value={getSafeValue(newEmployee.baseNumber)}
                      onChange={(e) => setNewEmployee({ ...newEmployee, baseNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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

        {/* ============================================================ */}
        {/* 🟡 EDIT MODAL – unchanged (already complete)                   */}
        {/* ============================================================ */}
        {isEditMenuOpen && editingEmployee && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div ref={editMenuRef} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  {loadingCategories ? (
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100">
                      <span className="text-gray-500">Loading categories...</span>
                    </div>
                  ) : (
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
                  )}
                </div>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.email)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
                    <select
                      value={getSafeValue(editingEmployee.jobPosition)}
                      onChange={(e) => {
                        const selectedPosition = e.target.value;
                        const defaultGrade = getDefaultGradeForPosition(selectedPosition);
                        const defaultRate = getDefaultRateForPosition(selectedPosition);
                        
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
                        const gradeRate = getPositionRate(editingEmployee.jobPosition, selectedGrade) || editingEmployee.minimumRate;
                        
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.workType)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, workType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

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

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Current Rate:</strong> {editingEmployee.usePositionRate !== false ? 
                      `GHS${getPositionRate(editingEmployee.jobPosition, editingEmployee.jobGrade) || editingEmployee.minimumRate}/hr (Position-based)` : 
                      `GHS${editingEmployee.minimumRate}/hr (Custom)`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.phone)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SSNIT Account Name</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.ssnitAccountName)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, ssnitAccountName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.emergencyContact)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, emergencyContact: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.department)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={getSafeValue(editingEmployee.dateOfBirth)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.location)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghana Card</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.ghanaCard)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, ghanaCard: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.bank)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, bank: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Branch</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.bankBranch)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, bankBranch: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name on Bank Account</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.accountName)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, accountName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier Two Account Name</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.tierTwoAccountName)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, tierTwoAccountName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier Two Account Number</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.tierTwoAccountNumber)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, tierTwoAccountNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Number</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.baseNumber)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, baseNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.contactPerson)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, contactPerson: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.relationship)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, relationship: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Town of Residence</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.townOfResidence)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, townOfResidence: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.houseNumber)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, houseNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spouse</label>
                  <input
                    type="text"
                    value={getSafeValue(editingEmployee.spouse)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, spouse: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Children</label>
                  <input
                    type="number"
                    value={getSafeValue(editingEmployee.numberOfChildren)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, numberOfChildren: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={getSafeValue(editingEmployee.age)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, age: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent Allowance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getSafeValue(editingEmployee.rentAllowance)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, rentAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transport Allowance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getSafeValue(editingEmployee.transportAllowance)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, transportAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clothing Allowance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getSafeValue(editingEmployee.clothingAllowance)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, clothingAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Allowance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getSafeValue(editingEmployee.otherAllowance)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, otherAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NSS Allowance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={getSafeValue(editingEmployee.nssAllowance)}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, nssAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exclude from SSNIT</label>
                    <p className="text-xs text-gray-500">When checked, no SSNIT will be deducted from this employee's pay</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEmployee.excludeFromSsnit || false}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, excludeFromSsnit: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Apply Withholding Tax</label>
                    <p className="text-xs text-gray-500">When checked, Withholding Tax will apply instead of standard PAYE</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEmployee?.applyWithholdingTax || false}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, applyWithholdingTax: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

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
                      type="text"
                      value={getSafeValue(editingEmployee.accountNumber)}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, accountNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SSNIT Account Name</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier Two Account Name</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier Two Account Number</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SSNIT Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TIN Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tag Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Birth</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emergency Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Original Employee ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Position</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Minimum Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent Allowance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transport Allowance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clothing Allowance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Other Allowance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NSS Allowance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghana Card</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Branch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Town of Residence</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">House Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spouse</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number of Children</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exclude SSNIT</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadedData.map((employee, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 whitespace-nowrap">
                          Auto-generated
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{employee.firstName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{employee.lastName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.email || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.phone || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.ssnitAccountName || 'N/A'}</td>
                         <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.tierTwoAccountName || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.tierTwoAccountNumber || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.baseNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.ssnitNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.tinNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.tagNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.dateOfBirth || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.emergencyContact || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.accountNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.originalEmployeeId || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {employee.category || 'Not set'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.jobPosition || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.grade || employee.jobGrade || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.workType || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.department || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.startDate || 'Not set'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.endDate || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.basicSalary || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.minimumRate || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.rentAllowance || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.transportAllowance || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.clothingAllowance || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.otherAllowance || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.nssAllowance || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.location || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.ghanaCard || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.bank || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.accountName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.bankBranch || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.contactPerson || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.relationship || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.townOfResidence || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.houseNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.spouse || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.numberOfChildren || '0'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.age || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{employee.excludeFromSsnit ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 max-w-md">
                  <strong>Note:</strong> Employee IDs will be automatically generated by the system.
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