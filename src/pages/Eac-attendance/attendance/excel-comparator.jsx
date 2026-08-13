import React, { useState, useEffect } from "react";
import {
  Upload,
  Download,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Save,
  Trash2,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Info,
  Calendar,
  Users,
  Code as CodeIcon,
  FileText,
  Eye,
  EyeOff,
  Settings,
  ArrowLeftRight,
  History
} from "lucide-react";
import * as XLSX from 'xlsx';

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
  if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  if (hostname === "100.114.178.13") return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

const API_BASE_URL = getApiBaseUrl();

function ExcelComparator() {
  const [ruleSets, setRuleSets] = useState([]);
  const [selectedRuleSetId, setSelectedRuleSetId] = useState('');
  const [showRuleManager, setShowRuleManager] = useState(false);
  const [editingRuleSet, setEditingRuleSet] = useState(null);
  const [isSavingRules, setIsSavingRules] = useState(false);
  
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [fileASheets, setFileASheets] = useState([]);
  const [fileBSheets, setFileBSheets] = useState([]);
  const [selectedSheetA, setSelectedSheetA] = useState('');
  const [selectedSheetB, setSelectedSheetB] = useState('');
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  
  const [fileAData, setFileAData] = useState(null);
  const [fileBData, setFileBData] = useState(null);
  const [matchedEmployees, setMatchedEmployees] = useState(null);
  
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDisparity, setSelectedDisparity] = useState({ employee: null, date: null, type: null });
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState({});
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [isLoadingRuleSets, setIsLoadingRuleSets] = useState(false);
  const [viewMode, setViewMode] = useState('split');
  
  // NEW: History state
  const [comparisonHistory, setComparisonHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  
  const [filters, setFilters] = useState({
    showOnly: 'all',
    disparityType: 'all',
    employee: '',
    code: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchRuleSets();
    fetchComparisonHistory(); // Load history on mount
  }, []);

  // NEW: Fetch comparison history
  const fetchComparisonHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/excel-comparator/comparisons/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setComparisonHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // NEW: Load a specific comparison from history
  const loadComparisonFromHistory = async (comparisonId) => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/excel-comparator/comparisons/${comparisonId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setComparisonResult(result);
        setSelectedHistoryId(comparisonId);
        setShowResults(true);
        setShowHistory(false); // Close history panel
        
        // Show success message
        setSaveMessage({ type: 'success', text: 'Comparison loaded from history' });
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error loading comparison:', error);
      setSaveMessage({ type: 'error', text: 'Error loading comparison' });
    }
  };

  // NEW: Delete a comparison from history
  const deleteComparisonFromHistory = async (comparisonId, event) => {
    event.stopPropagation(); // Prevent triggering the parent click
    
    if (!await window.appConfirm('Are you sure you want to delete this comparison from history?')) return;
    
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/excel-comparator/comparisons/${comparisonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Remove from local state
        setComparisonHistory(prev => prev.filter(c => c.id !== comparisonId));
        setSaveMessage({ type: 'success', text: 'Comparison deleted from history' });
        
        // If this was the selected comparison, clear it
        if (selectedHistoryId === comparisonId) {
          setSelectedHistoryId(null);
          setComparisonResult(null);
          setShowResults(false);
        }
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Error deleting comparison' });
    } finally {
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    }
  };

  // NEW: Format date for history display
  const formatHistoryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const fetchRuleSets = async () => {
    setIsLoadingRuleSets(true);
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/excel-comparator/rule-sets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setRuleSets(data);
          setSelectedRuleSetId(data[0].id);
        } else {
          setRuleSets([]);
          setSelectedRuleSetId('');
          setSaveMessage({ type: 'info', text: 'No rule sets found. Please create one.' });
        }
      } else {
        setRuleSets([]);
        setSelectedRuleSetId('');
        setSaveMessage({ type: 'error', text: 'Failed to load rule sets from server' });
      }
    } catch (error) {
      console.error('Error fetching rule sets:', error);
      setRuleSets([]);
      setSelectedRuleSetId('');
      setSaveMessage({ type: 'error', text: 'Error connecting to server' });
    } finally {
      setIsLoadingRuleSets(false);
    }
  };

  const saveRuleSet = async (ruleSet) => {
    setIsSavingRules(true);
    try {
      const token = localStorage.getItem("jwtToken");
      const url = ruleSet.id 
        ? `${API_BASE_URL}/api/excel-comparator/rule-sets/${ruleSet.id}`
        : `${API_BASE_URL}/api/excel-comparator/rule-sets`;
      
      const response = await fetch(url, {
        method: ruleSet.id ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ruleSet)
      });
      
      if (response.ok) {
        const saved = await response.json();
        setRuleSets(prev => {
          if (ruleSet.id) {
            return prev.map(rs => rs.id === saved.id ? saved : rs);
          } else {
            return [...prev, saved];
          }
        });
        setSaveMessage({ type: 'success', text: 'Rule set saved successfully' });
        setEditingRuleSet(null);
        setShowRuleManager(false);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage({ type: 'error', text: 'Error saving rule set' });
    } finally {
      setIsSavingRules(false);
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    }
  };

  const deleteRuleSet = async (id) => {
    if (!await window.appConfirm('Are you sure you want to delete this rule set?')) return;
    
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch(`${API_BASE_URL}/api/excel-comparator/rule-sets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setRuleSets(prev => prev.filter(rs => rs.id !== id));
        if (selectedRuleSetId === id) {
          setSelectedRuleSetId(ruleSets[0]?.id || '');
        }
        setSaveMessage({ type: 'success', text: 'Rule set deleted' });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Error deleting rule set' });
    } finally {
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleFileUpload = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoadingSheets(true);
    
    if (fileType === 'A') {
      setFileA(file);
      setFileAData(null);
    } else {
      setFileB(file);
      setFileBData(null);
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheets = workbook.SheetNames;
      
      if (fileType === 'A') {
        setFileASheets(sheets);
        setSelectedSheetA(sheets[0] || '');
      } else {
        setFileBSheets(sheets);
        setSelectedSheetB(sheets[0] || '');
      }
    } catch (error) {
      console.error('Error reading Excel file:', error);
      setSaveMessage({ type: 'error', text: 'Error reading Excel file' });
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const clearFile = (fileType) => {
    if (fileType === 'A') {
      setFileA(null);
      setFileASheets([]);
      setSelectedSheetA('');
      setFileAData(null);
    } else {
      setFileB(null);
      setFileBSheets([]);
      setSelectedSheetB('');
      setFileBData(null);
    }
    setComparisonResult(null);
    setMatchedEmployees(null);
    setSelectedEmployee(null);
    setSelectedDisparity({ employee: null, date: null, type: null });
    setSelectedHistoryId(null);
  };

  const loadFileData = async (file, sheetName, fileType) => {
    try {
      const data = await parseExcelToData(file, sheetName);
      if (fileType === 'A') {
        setFileAData(data);
      } else {
        setFileBData(data);
      }
      return data;
    } catch (error) {
      console.error(`Error loading file ${fileType}:`, error);
      setSaveMessage({ type: 'error', text: `Error loading file ${fileType}` });
      return null;
    }
  };

  const parseExcelToData = (file, sheetName) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: false });
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true });
          
          // Find the header row (row with dates)
          let headerRowIndex = -1;
          let nameColumn = -1;
          
          // Look for the row that contains dates (YYYY-MM-DD format)
          for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
            const row = jsonData[i];
            if (!Array.isArray(row)) continue;
            
            let dateCount = 0;
            for (let j = 0; j < row.length; j++) {
              const cell = row[j];
              if (typeof cell === 'string' && cell.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dateCount++;
              } else if (cell instanceof Date && !isNaN(cell.getTime())) {
                dateCount++;
              }
            }
            
            if (dateCount > 5) {
              headerRowIndex = i;
              console.log(`Found header row at index ${i} with ${dateCount} dates`);
              break;
            }
          }
          
          // If no header row found, try to find by scanning for dates in data
          if (headerRowIndex === -1) {
            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!Array.isArray(row)) continue;
              
              for (let j = 0; j < row.length; j++) {
                const cell = row[j];
                if (cell instanceof Date && !isNaN(cell.getTime())) {
                  headerRowIndex = i;
                  console.log(`Found date at row ${i}, using as header`);
                  break;
                }
              }
              if (headerRowIndex !== -1) break;
            }
          }
          
          // Default to row 10 if still not found (NPI sheets often have header at row 10-12)
          if (headerRowIndex === -1) {
            headerRowIndex = 10;
            console.log('Using default header row 10');
          }
          
          // Find name column - look for column with most names
          const nameColumnStats = {};
          let maxNameCount = 0;
          
          // Check rows after header to find which column has names
          for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 30, jsonData.length); i++) {
            const row = jsonData[i];
            if (!Array.isArray(row)) continue;
            
            for (let j = 0; j < row.length; j++) {
              const cell = row[j];
              if (typeof cell === 'string') {
                const value = cell.trim();
                // Names are usually uppercase with spaces, not numbers
                if (value.length > 3 && /[A-Z]/.test(value) && value.includes(' ') && !value.match(/^\d+$/)) {
                  nameColumnStats[j] = (nameColumnStats[j] || 0) + 1;
                  if (nameColumnStats[j] > maxNameCount) {
                    maxNameCount = nameColumnStats[j];
                    nameColumn = j;
                  }
                }
              }
            }
          }
          
          // Default to column 1 (B) if still not found
          if (nameColumn === -1) {
            nameColumn = 1;
            console.log('Name column defaulting to 1');
          }
          
          console.log(`Using name column: ${nameColumn}`);
          
          // Build date column map from header row
          const dateColumnMap = {};
          const headerRow = jsonData[headerRowIndex];
          
          if (Array.isArray(headerRow)) {
            for (let col = 0; col < headerRow.length; col++) {
              if (col === nameColumn) continue;
              
              const cell = headerRow[col];
              let date = null;
              
              if (cell instanceof Date && !isNaN(cell.getTime())) {
                date = cell;
              } else if (typeof cell === 'string') {
                const match = cell.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (match) {
                  date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                }
              }
              
              if (date) {
                dateColumnMap[col] = date;
              }
            }
          }
          
          console.log(`Found ${Object.keys(dateColumnMap).length} date columns`);
          
          // Build data matrix
          const dataMatrix = jsonData.map(row => Array.isArray(row) ? [...row] : []);
          
          // Parse employees
          const employees = [];
          const nameSet = new Set(); // To avoid duplicates
          
          // Start from row after header
          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!Array.isArray(row)) continue;
            
            // Get name
            const nameCell = row[nameColumn];
            if (!nameCell) continue;
            
            const name = String(nameCell).trim();
            
            // Skip invalid names
            if (!name || 
                name.length < 3 || 
                name.match(/^\d+$/) ||
                name.toLowerCase().includes('total') ||
                name.toLowerCase().includes('summary') ||
                name.toLowerCase().includes('subtotal') ||
                name.toLowerCase().includes('normal days') ||
                name.toLowerCase().includes('electrical') ||
                name.toLowerCase().includes('technician') ||
                name.toLowerCase().includes('safety') ||
                name.toLowerCase().includes('welder') ||
                nameSet.has(name)) {
              continue;
            }
            
            const employee = {
              name,
              originalName: name,
              rowIndex: i,
              rowNumber: i + 1,
              attendance: {}
            };
            
            // Parse attendance for each date column
            for (const [colIndex, date] of Object.entries(dateColumnMap)) {
              const col = parseInt(colIndex);
              const cellValue = row[col];
              
              if (cellValue === null || cellValue === undefined || cellValue === '') continue;
              
              const dateStr = toYMD(date);
              const isNumber = typeof cellValue === 'number' && !isNaN(cellValue);
              const isCode = typeof cellValue === 'string' && cellValue.trim().length <= 5 && isNaN(cellValue);
              
              employee.attendance[dateStr] = {
                value: cellValue,
                type: isNumber ? 'hours' : (isCode ? 'code' : 'other'),
                original: cellValue,
                colIndex: col
              };
            }
            
            // Only add if has attendance data
            if (Object.keys(employee.attendance).length > 0) {
              employees.push(employee);
              nameSet.add(name);
              console.log(`Added employee: ${name} with ${Object.keys(employee.attendance).length} records`);
            }
          }
          
          console.log(`Total employees found: ${employees.length}`);
          
          resolve({
            employees,
            dateColumnMap,
            dataMatrix,
            nameColumn,
            firstDataRow: headerRowIndex + 1,
            headers: jsonData.slice(0, headerRowIndex + 1)
          });
          
        } catch (error) {
          console.error('Error parsing Excel:', error);
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const findNameColumn = (jsonData) => {
    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
      const row = jsonData[i];
      if (Array.isArray(row)) {
        for (let j = 0; j < row.length; j++) {
          const cellValue = String(row[j] || "").toLowerCase().trim();
          if (["name", "employee", "staff name", "employee name"].includes(cellValue)) return j;
        }
      }
    }
    
    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
      const row = jsonData[i];
      if (Array.isArray(row)) {
        for (let j = 0; j < row.length; j++) {
          const cellValue = String(row[j] || "").trim();
          if (cellValue && !cellValue.match(/^\d+$/) && cellValue.length > 3) {
            let nameCount = 0;
            for (let k = i + 1; k < Math.min(i + 5, jsonData.length); k++) {
              if (jsonData[k] && Array.isArray(jsonData[k]) && jsonData[k][j]) {
                const nextCell = String(jsonData[k][j]).trim();
                if (nextCell && nextCell.length > 3 && !nextCell.match(/^\d+$/)) {
                  nameCount++;
                }
              }
            }
            if (nameCount >= 2) return j;
          }
        }
      }
    }
    return 0;
  };

  const findFirstDataRow = (jsonData, nameColumn) => {
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (Array.isArray(row) && row[nameColumn]) {
        const nameCell = String(row[nameColumn]).trim();
        if (nameCell && 
            !nameCell.toLowerCase().includes("name") && 
            !nameCell.toLowerCase().includes("total") && 
            !nameCell.toLowerCase().includes("summary") &&
            nameCell.length > 2) {
          return i;
        }
      }
    }
    return -1;
  };

  const buildDateColumnMap = (jsonData, nameColumn, firstDataRow) => {
    const parseHeaderDate = (v) => {
      if (!v) return null;
      if (v instanceof Date && !isNaN(v.getTime())) {
        const d = new Date(v);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      const s = String(v).trim();
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) {
        return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      }
      return null;
    };

    let bestMap = {};
    let bestCount = 0;
    const start = Math.max(0, firstDataRow - 8);
    const end = Math.max(0, firstDataRow - 1);

    for (let r = start; r <= end; r++) {
      const row = Array.isArray(jsonData[r]) ? jsonData[r] : [];
      const map = {};
      let count = 0;

      for (let col = 0; col < row.length; col++) {
        if (col === nameColumn) continue;
        const d = parseHeaderDate(row[col]);
        if (d) {
          map[col] = d;
          count++;
        }
      }

      if (count > bestCount) {
        bestCount = count;
        bestMap = map;
      }
    }

    return bestMap;
  };

  const toYMD = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const compareFiles = async () => {
    if (!fileA || !fileB || !selectedSheetA || !selectedSheetB) {
      setSaveMessage({ type: 'error', text: 'Please select both files and sheets' });
      return;
    }

    if (!selectedRuleSetId) {
      setSaveMessage({ type: 'error', text: 'Please select a rule set' });
      return;
    }

    setIsComparing(true);
    setComparisonResult(null);
    setShowResults(true);
    setSelectedHistoryId(null); // Clear selected history

    try {
      const token = localStorage.getItem("jwtToken");
      
      const formData = new FormData();
      formData.append('fileA', fileA);
      formData.append('fileB', fileB);
      formData.append('sheetA', selectedSheetA);
      formData.append('sheetB', selectedSheetB);
      formData.append('ruleSetId', selectedRuleSetId);

      const response = await fetch(`${API_BASE_URL}/api/excel-comparator/comparisons/compare`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Comparison failed: ${response.statusText}`);
      }

      const result = await response.json();
      setComparisonResult(result);
      
      // Refresh history after new comparison
      fetchComparisonHistory();
      
      const dataA = await loadFileData(fileA, selectedSheetA, 'A');
      const dataB = await loadFileData(fileB, selectedSheetB, 'B');
      
      if (dataA && dataB) {
        const matched = matchEmployeesFromResult(result, dataA.employees, dataB.employees);
        setMatchedEmployees(matched);
      }
      
    } catch (error) {
      console.error('Comparison error:', error);
      setSaveMessage({ type: 'error', text: 'Error comparing files: ' + error.message });
    } finally {
      setIsComparing(false);
    }
  };

  const matchEmployeesFromResult = (result, employeesA, employeesB) => {
    const matched = [];
    const unmatchedA = [];
    const unmatchedB = [];

    const empAMap = new Map(employeesA.map(emp => [emp.name, emp]));
    const empBMap = new Map(employeesB.map(emp => [emp.name, emp]));

    result.employees.forEach(empResult => {
      const empA = empAMap.get(empResult.name);
      const empB = empBMap.get(empResult.name);
      
      if (empA && empB) {
        matched.push({
          employeeA: empA,
          employeeB: empB,
          matchType: empResult.matchType || 'exact',
          name: empResult.name,
          id: empResult.id
        });
      }
    });

    employeesA.forEach(empA => {
      if (!matched.some(m => m.employeeA === empA)) {
        unmatchedA.push(empA);
      }
    });

    employeesB.forEach(empB => {
      if (!matched.some(m => m.employeeB === empB)) {
        unmatchedB.push(empB);
      }
    });

    return { matched, unmatchedA, unmatchedB };
  };

  const getFilteredEmployees = () => {
    if (!comparisonResult) return [];
    
    let filtered = [...comparisonResult.employees];
    
    if (filters.employee) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(filters.employee.toLowerCase())
      );
    }
    
    if (filters.showOnly === 'disparities') {
      filtered = filtered.filter(emp => emp.summary.disparities > 0);
    } else if (filters.showOnly === 'matches') {
      filtered = filtered.filter(emp => emp.summary.disparities === 0 && emp.summary.daysWithData > 0);
    }
    
    if (filters.disparityType !== 'all') {
      filtered = filtered.map(emp => {
        const filteredDates = {};
        let hasAny = false;
        
        Object.entries(emp.dates).forEach(([date, dateData]) => {
          if (dateData.disparityType === filters.disparityType) {
            filteredDates[date] = dateData;
            hasAny = true;
          }
        });
        
        if (hasAny) {
          return {
            ...emp,
            dates: filteredDates,
            summary: {
              ...emp.summary,
              daysWithData: Object.keys(filteredDates).length,
              disparities: Object.values(filteredDates).filter(d => d.disparityType !== 'match').length,
              matches: Object.values(filteredDates).filter(d => d.disparityType === 'match').length
            }
          };
        }
        return null;
      }).filter(emp => emp !== null);
    }
    
    if (filters.startDate || filters.endDate) {
      filtered = filtered.map(emp => {
        const filteredDates = {};
        
        Object.entries(emp.dates).forEach(([date, dateData]) => {
          if (filters.startDate && date < filters.startDate) return;
          if (filters.endDate && date > filters.endDate) return;
          filteredDates[date] = dateData;
        });
        
        return {
          ...emp,
          dates: filteredDates,
          summary: {
            ...emp.summary,
            daysWithData: Object.keys(filteredDates).length,
            disparities: Object.values(filteredDates).filter(d => d.disparityType !== 'match').length,
            matches: Object.values(filteredDates).filter(d => d.disparityType === 'match').length
          }
        };
      });
    }
    
    return filtered;
  };

  const exportToExcel = () => {
    if (!comparisonResult) return;
    
    const exportData = [];
    
    exportData.push([
      'Employee',
      'ID',
      'Date',
      'Hours Value',
      'Code Value',
      'Expected Hours',
      'Disparity Type',
      'Details'
    ]);
    
    comparisonResult.employees.forEach(emp => {
      Object.entries(emp.dates).forEach(([date, data]) => {
        exportData.push([
          emp.name,
          emp.id || '',
          date,
          data.hoursValue || '',
          data.codeValue || '',
          data.expectedHours || '',
          data.disparityType || '',
          data.disparityDetails ? JSON.stringify(data.disparityDetails) : ''
        ]);
      });
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Comparison Results');
    XLSX.writeFile(wb, `comparison-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleEmployee = (name) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleCellClick = (employeeName, dateStr, disparityType, fileType) => {
    setSelectedEmployee(employeeName);
    setSelectedDate(dateStr);
    setSelectedDisparity({ employee: employeeName, date: dateStr, type: disparityType });
    
    if (viewMode !== 'split') {
      setViewMode('split');
    }
  };

  const renderFileTable = (fileData, fileType) => {
    if (!fileData || !fileData.dataMatrix) return null;

    const { dataMatrix, dateColumnMap, nameColumn } = fileData;
    const dateColumns = Object.keys(dateColumnMap).map(Number).sort((a, b) => a - b);
    
    const startCol = Math.min(nameColumn, ...dateColumns);
    const endCol = Math.max(nameColumn, ...dateColumns, 40);
    
    const columns = [];
    for (let col = startCol; col <= endCol; col++) {
      let header = String.fromCharCode(65 + col);
      if (col > 25) {
        header = 'A' + String.fromCharCode(65 + (col - 26));
      }
      columns.push({ index: col, label: header });
    }

    let rowsToShow = [];
    if (selectedEmployee && matchedEmployees) {
      const match = matchedEmployees.matched.find(m => 
        m.employeeA.name === selectedEmployee || m.employeeB.name === selectedEmployee
      );
      if (match) {
        const emp = fileType === 'A' ? match.employeeA : match.employeeB;
        if (emp) {
          rowsToShow = [emp.rowIndex];
        }
      }
    } else {
      rowsToShow = Array.from({ length: dataMatrix.length }, (_, i) => i);
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 border border-gray-300 sticky left-0 bg-gray-100 z-10">#</th>
              {columns.map(col => (
                <th key={col.index} className="px-2 py-1 border border-gray-300 font-mono text-center min-w-[60px]">
                  {col.label}
                </th>
              ))}
            </tr>
            
            {dateColumns.length > 0 && (
              <tr className="bg-gray-50">
                <th className="px-2 py-1 border border-gray-300 sticky left-0 bg-gray-50 z-10"></th>
                {columns.map(col => {
                  const date = dateColumnMap[col.index];
                  return (
                    <th key={col.index} className="px-2 py-1 border border-gray-300 text-center text-[10px]">
                      {date ? toYMD(date) : ''}
                    </th>
                  );
                })}
              </tr>
            )}
          </thead>
          <tbody>
            {rowsToShow.map(rowIndex => {
              const row = dataMatrix[rowIndex] || [];
              const isEmployeeRow = rowIndex >= fileData.firstDataRow;
              const employee = fileData.employees.find(e => e.rowIndex === rowIndex);
              
              return (
                <tr 
                  key={rowIndex} 
                  className={`${isEmployeeRow ? 'hover:bg-blue-50' : ''} ${
                    employee && selectedEmployee === employee.name ? 'bg-blue-100' : ''
                  }`}
                >
                  <td className="px-2 py-1 border border-gray-300 font-mono text-xs sticky left-0 bg-white z-10">
                    {rowIndex + 1}
                  </td>
                  {columns.map(col => {
                    const cellValue = row[col.index];
                    const isDateColumn = dateColumnMap[col.index];
                    const isNameColumn = col.index === nameColumn;
                    
                    let hasDisparity = false;
                    let disparityType = null;
                    let disparityDetails = null;
                    
                    if (employee && isDateColumn && comparisonResult) {
                      const dateStr = toYMD(dateColumnMap[col.index]);
                      const empResult = comparisonResult.employees.find(e => e.name === employee.name);
                      if (empResult && empResult.dates[dateStr]) {
                        const disparity = empResult.dates[dateStr];
                        if (disparity && disparity.disparityType !== 'match') {
                          hasDisparity = true;
                          disparityType = disparity.disparityType;
                          disparityDetails = disparity.disparityDetails;
                        }
                      }
                    }
                    
                    let cellClass = "px-2 py-1 border border-gray-300 ";
                    
                    if (isNameColumn) {
                      cellClass += "font-medium sticky left-0 bg-white ";
                    }
                    
                    if (hasDisparity) {
                      if (disparityType === 'hoursMismatch') {
                        cellClass += "bg-orange-200";
                      } else if (disparityType === 'noCode') {
                        cellClass += "bg-yellow-200";
                      } else if (disparityType === 'noHours') {
                        cellClass += "bg-purple-200";
                      } else if (disparityType === 'unknownCode') {
                        cellClass += "bg-pink-200";
                      }
                    } else if (employee && isDateColumn && cellValue) {
                      cellClass += "bg-green-50";
                    }
                    
                    if (employee && isDateColumn && selectedDisparity.employee === employee.name) {
                      const dateStr = toYMD(dateColumnMap[col.index]);
                      if (dateStr === selectedDisparity.date) {
                        cellClass += " ring-2 ring-blue-500 ring-inset";
                      }
                    }
                    
                    const isClickable = hasDisparity || (employee && isDateColumn && cellValue);
                    
                    let displayValue = cellValue;
                    if (cellValue instanceof Date) {
                      displayValue = cellValue.toLocaleDateString();
                    } else if (typeof cellValue === 'number') {
                      displayValue = cellValue;
                    } else if (cellValue === null || cellValue === undefined) {
                      displayValue = '';
                    } else {
                      displayValue = String(cellValue);
                    }
                    
                    let titleText = '';
                    if (hasDisparity && disparityDetails) {
                      if (disparityType === 'hoursMismatch') {
                        const diff = disparityDetails.diff > 0 ? '+' + disparityDetails.diff : disparityDetails.diff;
                        titleText = `Hours mismatch: Expected ${disparityDetails.expected}h, Got ${disparityDetails.actual}h (${diff}h) - Click to see in other file`;
                      } else if (disparityType === 'unknownCode') {
                        titleText = `Unknown code: ${disparityDetails.code} - Click to see in other file`;
                      } else {
                        titleText = `Disparity: ${disparityType} - Click to see in other file`;
                      }
                    } else if (employee && isDateColumn && cellValue && !hasDisparity) {
                      titleText = `Match: Click to see in other file`;
                    }
                    
                    return (
                      <td 
                        key={col.index} 
                        className={`${cellClass} ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                        title={titleText}
                        onClick={() => {
                          if (employee && isDateColumn) {
                            const dateStr = toYMD(dateColumnMap[col.index]);
                            handleCellClick(employee.name, dateStr, disparityType, fileType);
                          }
                        }}
                      >
                        <div className="max-w-[150px] truncate">
                          {displayValue}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const selectedRuleSet = ruleSets.find(rs => rs.id === selectedRuleSetId);
  const filteredEmployees = getFilteredEmployees();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          {!sidebarCollapsed && (
            <h2 className="font-semibold text-gray-800">Controls</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 hover:bg-gray-100 rounded-lg"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 ${sidebarCollapsed ? 'hidden' : 'block'}`}>
          {saveMessage.text && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              saveMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
              saveMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
              'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {saveMessage.type === 'success' && <Check size={14} />}
                  {saveMessage.type === 'error' && <AlertCircle size={14} />}
                  <span>{saveMessage.text}</span>
                </div>
                <button onClick={() => setSaveMessage({ type: '', text: '' })}>
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* History Toggle Button */}
          <div className="mb-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${
                showHistory 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <History size={16} />
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                <History size={14} />
                Comparison History
                {isLoadingHistory && <RefreshCw size={12} className="animate-spin ml-2" />}
              </h3>
              
              {comparisonHistory.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500">
                  {isLoadingHistory ? 'Loading...' : 'No past comparisons'}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {comparisonHistory.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() => loadComparisonFromHistory(comp.id)}
                      className={`p-2 rounded cursor-pointer text-xs border ${
                        selectedHistoryId === comp.id
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-white border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {comp.file1Name} vs {comp.file2Name}
                          </div>
                          <div className="text-gray-500 mt-1">
                            {formatHistoryDate(comp.createdAt)}
                          </div>
                          {comp.summary && (
                            <div className="flex gap-2 mt-1 text-[10px]">
                              <span className="text-green-600">✓ {comp.summary.matches}</span>
                              <span className="text-red-600">✗ {comp.summary.disparities}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => deleteComparisonFromHistory(comp.id, e)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                          title="Delete from history"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {comparisonHistory.length > 0 && (
                <button
                  onClick={fetchComparisonHistory}
                  className="w-full mt-2 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs flex items-center justify-center gap-1"
                >
                  <RefreshCw size={10} />
                  Refresh
                </button>
              )}
            </div>
          )}

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Settings size={14} />
                Rule Set
              </h3>
              <button
                onClick={() => setShowRuleManager(!showRuleManager)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {showRuleManager ? 'Hide' : 'Manage'}
                {showRuleManager ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
            
            <div className="space-y-2">
              {ruleSets.length === 0 ? (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-500 mb-2">No rule sets found</p>
                  <button
                    onClick={() => setShowRuleManager(true)}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                  >
                    Create Rule Set
                  </button>
                </div>
              ) : (
                <>
                  <select
                    value={selectedRuleSetId}
                    onChange={(e) => setSelectedRuleSetId(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    disabled={isLoadingRuleSets}
                  >
                    {ruleSets.map(rs => (
                      <option key={rs.id} value={rs.id}>{rs.name}</option>
                    ))}
                  </select>
                  
                  {selectedRuleSet && (
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs max-h-32 overflow-y-auto">
                      {Object.entries(selectedRuleSet.rules).slice(0, 20).map(([code, rule]) => (
                        <div key={code} className="flex justify-between bg-gray-50 p-1 rounded">
                          <span className="font-medium">{code}:</span>
                          <span>{rule.expectedHours}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {showRuleManager && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <RuleSetManager
                ruleSets={ruleSets}
                onSave={saveRuleSet}
                onDelete={deleteRuleSet}
                onClose={() => setShowRuleManager(false)}
                isSaving={isSavingRules}
              />
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Upload size={14} />
              Files
            </h3>
            
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">File A (Hours)</label>
              <div className="border border-gray-300 rounded p-2">
                {!fileA ? (
                  <div className="text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => handleFileUpload(e, 'A')}
                      className="hidden"
                      id="fileA-upload-sidebar"
                    />
                    <label
                      htmlFor="fileA-upload-sidebar"
                      className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Choose file
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 truncate">
                      <FileText size={12} className="text-blue-500" />
                      <span className="text-xs truncate max-w-[120px]">{fileA.name}</span>
                    </div>
                    <button onClick={() => clearFile('A')} className="text-gray-400 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              
              {fileASheets.length > 0 && (
                <select
                  value={selectedSheetA}
                  onChange={(e) => setSelectedSheetA(e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  {fileASheets.map(sheet => (
                    <option key={sheet} value={sheet}>{sheet}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">File B (Codes)</label>
              <div className="border border-gray-300 rounded p-2">
                {!fileB ? (
                  <div className="text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => handleFileUpload(e, 'B')}
                      className="hidden"
                      id="fileB-upload-sidebar"
                    />
                    <label
                      htmlFor="fileB-upload-sidebar"
                      className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Choose file
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 truncate">
                      <FileText size={12} className="text-green-500" />
                      <span className="text-xs truncate max-w-[120px]">{fileB.name}</span>
                    </div>
                    <button onClick={() => clearFile('B')} className="text-gray-400 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              
              {fileBSheets.length > 0 && (
                <select
                  value={selectedSheetB}
                  onChange={(e) => setSelectedSheetB(e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  {fileBSheets.map(sheet => (
                    <option key={sheet} value={sheet}>{sheet}</option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={compareFiles}
              disabled={!fileA || !fileB || !selectedSheetA || !selectedSheetB || isComparing}
              className="w-full mt-4 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 text-sm disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isComparing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <ArrowLeftRight size={14} />
                  Compare Files
                </>
              )}
            </button>
          </div>

          {comparisonResult && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Filter size={14} />
                  Filters
                </h3>
                <div className="space-y-2">
                  <select
                    value={filters.showOnly}
                    onChange={(e) => setFilters({ ...filters, showOnly: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  >
                    <option value="all">All</option>
                    <option value="disparities">Only Disparities</option>
                    <option value="matches">Only Matches</option>
                  </select>

                  <select
                    value={filters.disparityType}
                    onChange={(e) => setFilters({ ...filters, disparityType: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  >
                    <option value="all">All Disparity Types</option>
                    <option value="hoursMismatch">Hours Mismatch</option>
                    <option value="noCode">Hours without Code</option>
                    <option value="noHours">Code without Hours</option>
                    <option value="unknownCode">Unknown Code</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Filter by employee..."
                    value={filters.employee}
                    onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
              </div>

              {Object.keys(comparisonResult.unknownCodes || {}).length > 0 && (
                <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2 text-xs flex items-center gap-1">
                    <AlertCircle size={12} />
                    Unknown Codes
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(comparisonResult.unknownCodes).map(([code, occurrences]) => (
                      <div key={code} className="text-xs flex justify-between">
                        <span className="font-mono bg-red-100 px-1 rounded">{code}</span>
                        <span className="text-red-700">{occurrences.length} occurrence(s)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Users size={14} />
                  Employees ({filteredEmployees.length})
                </h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {filteredEmployees.map((emp, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedEmployee(emp.name);
                        setSelectedDisparity({ employee: null, date: null, type: null });
                        if (!expandedEmployees[emp.name]) {
                          toggleEmployee(emp.name);
                        }
                      }}
                      className={`p-2 rounded cursor-pointer text-xs ${
                        selectedEmployee === emp.name
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate max-w-[100px]">{emp.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">{emp.summary.matches}</span>
                          <span className="text-red-600">{emp.summary.disparities}</span>
                          {expandedEmployees[emp.name] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight size={24} className="text-blue-600" />
            Excel File Comparator
            {selectedHistoryId && (
              <span className="text-sm font-normal text-blue-600 bg-blue-50 px-3 py-1 rounded-full ml-4">
                Viewing History #{selectedHistoryId}
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">
            Compare two Excel files (hours vs codes) using your own rules
          </p>
        </div>

        {!showResults ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ArrowLeftRight size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Comparison Yet</h3>
            <p className="text-gray-500">
              Select a rule set, upload both files, and click Compare Files to see results
            </p>
          </div>
        ) : isComparing ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <RefreshCw size={48} className="mx-auto mb-4 text-blue-500 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Comparing Files...</h3>
            <p className="text-gray-500">Please wait while we process the data</p>
          </div>
        ) : comparisonResult ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Info size={18} className="text-blue-600" />
                  Comparison Summary
                </h2>
                <button
                  onClick={exportToExcel}
                  className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-1"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500">Employees</div>
                  <div className="text-xl font-bold">{comparisonResult.summary.totalEmployees}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500">Dates</div>
                  <div className="text-xl font-bold">{comparisonResult.summary.totalDates}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600">Matches</div>
                  <div className="text-xl font-bold text-green-700">{comparisonResult.summary.matches}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="text-xs text-red-600">Disparities</div>
                  <div className="text-xl font-bold text-red-700">{comparisonResult.summary.disparities}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-2 bg-orange-50 rounded border border-orange-200">
                  <span className="text-xs text-orange-700">Hours Mismatch</span>
                  <div className="font-bold">{comparisonResult.summary.byDisparityType.hoursMismatch}</div>
                </div>
                <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                  <span className="text-xs text-yellow-700">Hours, No Code</span>
                  <div className="font-bold">{comparisonResult.summary.byDisparityType.noCode}</div>
                </div>
                <div className="p-2 bg-purple-50 rounded border border-purple-200">
                  <span className="text-xs text-purple-700">Code, No Hours</span>
                  <div className="font-bold">{comparisonResult.summary.byDisparityType.noHours}</div>
                </div>
                <div className="p-2 bg-pink-50 rounded border border-pink-200">
                  <span className="text-xs text-pink-700">Unknown Codes</span>
                  <div className="font-bold">{comparisonResult.summary.byDisparityType.unknownCode}</div>
                </div>
              </div>

              {comparisonResult.summary.byDisparityType.hoursMismatch > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-1">
                    <Calendar size={16} />
                    Hours Mismatch Detected
                  </h4>
                  <p className="text-sm text-blue-700">
                    Found {comparisonResult.summary.byDisparityType.hoursMismatch} cells where hours don't match expected values
                  </p>
                </div>
              )}
            </div>

            {fileAData && fileBData && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">View:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'split' ? 'bg-white shadow' : 'hover:bg-gray-200'
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    onClick={() => setViewMode('fileA')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'fileA' ? 'bg-white shadow' : 'hover:bg-gray-200'
                    }`}
                  >
                    File A Only
                  </button>
                  <button
                    onClick={() => setViewMode('fileB')}
                    className={`px-3 py-1 text-sm rounded ${
                      viewMode === 'fileB' ? 'bg-white shadow' : 'hover:bg-gray-200'
                    }`}
                  >
                    File B Only
                  </button>
                </div>
              </div>
            )}

            {selectedDisparity.employee && selectedDisparity.date && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Info size={16} />
                  <span>
                    <strong>Selected:</strong> {selectedDisparity.employee} on {selectedDisparity.date} 
                    {selectedDisparity.type && ` (${selectedDisparity.type})`}
                  </span>
                </div>
              </div>
            )}

            <div className={`grid ${viewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              {(viewMode === 'split' || viewMode === 'fileA') && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                      <FileText size={16} className="text-blue-500" />
                      File A: {fileA?.name || 'Hours File'}
                    </h2>
                    {fileAData && (
                      <span className="text-xs text-gray-500">
                        {fileAData.employees.length} employees
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    {fileAData ? (
                      renderFileTable(fileAData, 'A')
                    ) : fileA ? (
                      <div className="text-center py-8">
                        <button
                          onClick={() => loadFileData(fileA, selectedSheetA, 'A')}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Load File A Data
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Upload File A to view
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(viewMode === 'split' || viewMode === 'fileB') && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                      <FileText size={16} className="text-green-500" />
                      File B: {fileB?.name || 'Codes File'}
                    </h2>
                    {fileBData && (
                      <span className="text-xs text-gray-500">
                        {fileBData.employees.length} employees
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    {fileBData ? (
                      renderFileTable(fileBData, 'B')
                    ) : fileB ? (
                      <div className="text-center py-8">
                        <button
                          onClick={() => loadFileData(fileB, selectedSheetB, 'B')}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          Load File B Data
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Upload File B to view
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {comparisonResult && (
              <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Disparity Legend:</h3>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-orange-200 rounded"></div>
                    <span>Hours Mismatch (e.g., 17h vs expected 14h) - <strong>Click to see both files</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                    <span>Hours without Code - <strong>Click to see both files</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-purple-200 rounded"></div>
                    <span>Code without Hours - <strong>Click to see both files</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-pink-200 rounded"></div>
                    <span>Unknown Code - <strong>Click to see both files</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-50 rounded border border-gray-300"></div>
                    <span>Has Data (Match) - <strong>Click to see both files</strong></span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Tip:</strong> Click any colored cell to highlight the corresponding cell in the other file
                </p>
              </div>
            )}

            {(comparisonResult.unmatchedA?.length > 0 || comparisonResult.unmatchedB?.length > 0) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" />
                  Unmatched Employees
                </h3>
                
                {comparisonResult.unmatchedA?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Only in File A (Hours):</p>
                    <div className="flex flex-wrap gap-2">
                      {comparisonResult.unmatchedA.map((emp, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {emp.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {comparisonResult.unmatchedB?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Only in File B (Codes):</p>
                    <div className="flex flex-wrap gap-2">
                      {comparisonResult.unmatchedB.map((emp, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {emp.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-300" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Comparison Failed</h3>
            <p className="text-gray-500">Please check your files and try again</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RuleSetManager({ ruleSets, onSave, onDelete, onClose, isSaving }) {
  const [editingRuleSet, setEditingRuleSet] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleEdit = (ruleSet) => {
    setEditingRuleSet({
      ...ruleSet,
      rules: { ...ruleSet.rules }
    });
  };

  const handleCreate = () => {
    setEditingRuleSet({
      id: null,
      name: 'New Rule Set',
      description: '',
      rules: {
        P: { expectedHours: 8, description: 'Regular Present' },
        A: { expectedHours: 0, description: 'Absent' },
        L: { expectedHours: 0, description: 'Leave' }
      }
    });
    setIsCreating(true);
  };

  const handleSave = () => {
    if (editingRuleSet) {
      onSave(editingRuleSet);
      setEditingRuleSet(null);
      setIsCreating(false);
    }
  };

  const handleRuleChange = (code, field, value) => {
    setEditingRuleSet(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [code]: {
          ...prev.rules[code],
          [field]: field === 'expectedHours' ? parseFloat(value) || 0 : value
        }
      }
    }));
  };

  const handleAddCode = () => {
    const newCode = prompt('Enter new code (e.g., OT):');
    if (newCode && !editingRuleSet.rules[newCode]) {
      setEditingRuleSet(prev => ({
        ...prev,
        rules: {
          ...prev.rules,
          [newCode.toUpperCase()]: { expectedHours: 8, description: 'New code' }
        }
      }));
    }
  };

  const handleRemoveCode = async (code) => {
    if (await window.appConfirm(`Remove code ${code}?`)) {
      setEditingRuleSet(prev => {
        const newRules = { ...prev.rules };
        delete newRules[code];
        return { ...prev, rules: newRules };
      });
    }
  };

  return (
    <div className="space-y-3">
      {!editingRuleSet ? (
        <>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {ruleSets.map(rs => (
              <div key={rs.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <div className="truncate">
                  <span className="text-xs font-medium">{rs.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(rs)}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    <Settings size={12} />
                  </button>
                  <button
                    onClick={() => onDelete(rs.id)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleCreate}
            className="w-full px-2 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs flex items-center justify-center gap-1"
          >
            <Plus size={12} />
            New Rule Set
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={editingRuleSet.name}
              onChange={(e) => setEditingRuleSet({ ...editingRuleSet, name: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={editingRuleSet.description}
              onChange={(e) => setEditingRuleSet({ ...editingRuleSet, description: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {Object.entries(editingRuleSet.rules).map(([code, rule]) => (
              <div key={code} className="flex items-center gap-1 p-1 bg-gray-50 rounded">
                <span className="font-mono font-bold text-xs w-8">{code}</span>
                <input
                  type="number"
                  value={rule.expectedHours}
                  onChange={(e) => handleRuleChange(code, 'expectedHours', e.target.value)}
                  className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded"
                  step="0.5"
                  min="0"
                />
                <span className="text-[10px] text-gray-500">hrs</span>
                <input
                  type="text"
                  value={rule.description}
                  onChange={(e) => handleRuleChange(code, 'description', e.target.value)}
                  className="flex-1 px-1 py-0.5 text-xs border border-gray-300 rounded"
                  placeholder="Desc"
                />
                {!['P','A','L','H','S','WP','HP','ML','PL','OFF'].includes(code) && (
                  <button
                    onClick={() => handleRemoveCode(code)}
                    className="p-0.5 text-red-600 hover:bg-red-100 rounded"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAddCode}
            className="w-full px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs flex items-center justify-center gap-1"
          >
            <Plus size={10} />
            Add Custom Code
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs flex items-center justify-center gap-1"
            >
              {isSaving ? <RefreshCw size={10} className="animate-spin" /> : <Save size={10} />}
              Save
            </button>
            <button
              onClick={() => {
                setEditingRuleSet(null);
                setIsCreating(false);
              }}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
      >
        Close
      </button>
    </div>
  );
}

export default ExcelComparator;
