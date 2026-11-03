import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Share2,
  Eye,
  Edit3,
  History,
  Settings,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Users,
  FileSpreadsheet,
  FileCode,
  FileImage,
  Layers,
  ChevronRight,
  ExternalLink,
  X,
  Mail,
  Shield,
  RefreshCw,
  HardDrive,
  Copy,
  Table as TableIcon,
  Code as CodeIcon,
  Maximize2,
  Trash2,
  RotateCcw,
  Plus,
  Minus,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import MainSidebar from '../Eac-attendance/mainSidebar';

export default function FileManagerPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Main navigation tab: 'files' | 'recycle'
  const [mainTab, setMainTab] = useState('files');
  const [recycleBinFiles, setRecycleBinFiles] = useState([]);
  const [loadingRecycleBin, setLoadingRecycleBin] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [fileToPurge, setFileToPurge] = useState(null);
  const [emptyRecycleModalOpen, setEmptyRecycleModalOpen] = useState(false);

  // User & Settings
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState({ maxUploadSizeMb: 50, allowedExtensions: '' });

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Active items for modals
  const [activeFile, setActiveFile] = useState(null);
  const [activeVersionHistory, setActiveVersionHistory] = useState([]);
  const [activeAuditTrail, setActiveAuditTrail] = useState([]);
  const [historyTab, setHistoryTab] = useState('versions'); // 'versions' | 'audit'

  // Upload Form
  const [uploadForm, setUploadForm] = useState({ file: null, description: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // In-Browser Preview & Edit state
  const [editMode, setEditMode] = useState('text'); // 'text' | 'spreadsheet' | 'document'
  const [textContent, setTextContent] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [spreadsheetData, setSpreadsheetData] = useState({ sheets: [], currentSheet: '', rows: [] });
  const [editableSpreadsheet, setEditableSpreadsheet] = useState({
    workbook: null,
    sheets: [],
    currentSheet: '',
    rows: []
  });
  const [revisionFile, setRevisionFile] = useState(null);
  const [spreadsheetSubTab, setSpreadsheetSubTab] = useState('grid'); // 'grid' | 'upload'
  const [previewType, setPreviewType] = useState('text'); // 'text' | 'spreadsheet' | 'pdf' | 'image' | 'generic'
  const [blobPreviewUrl, setBlobPreviewUrl] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Share Form
  const [shareForm, setShareForm] = useState({ username: '', email: '', message: '', permission: 'VIEW' });
  const [isSharing, setIsSharing] = useState(false);

  // Settings Form
  const [settingsForm, setSettingsForm] = useState({ maxUploadSizeMb: 50, allowedExtensions: '' });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const token = localStorage.getItem('jwtToken');
  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:8080';
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || 'http://localhost:8080';
  };
  const API_BASE = getApiBaseUrl();

  // Load Initial Data
  useEffect(() => {
    loadUser();
    loadFiles();
    loadSettings();
  }, []);

  // Lock background window and page scrolling whenever any popup modal is open
  const isAnyModalOpen = Boolean(
    uploadModalOpen ||
    previewModalOpen ||
    editModalOpen ||
    shareModalOpen ||
    historyModalOpen ||
    settingsModalOpen ||
    deleteModalOpen ||
    purgeModalOpen ||
    emptyRecycleModalOpen
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      return () => {
        document.body.style.overflow = originalOverflow || '';
        document.body.style.paddingRight = originalPaddingRight || '';
      };
    }
  }, [isAnyModalOpen]);

  const loadUser = () => {
    try {
      const stored = localStorage.getItem('userData');
      const rawRole = localStorage.getItem('userRole') || '';
      let u = null;
      if (stored) {
        try {
          u = JSON.parse(stored);
          setCurrentUser(u);
        } catch (err) {}
      }
      const combinedRole = (rawRole || u?.role || u?.userRole || '').toUpperCase();
      const adminFlag = combinedRole.includes('ADMIN');
      setIsAdmin(adminFlag);
      if (adminFlag) {
        loadRecycleBin();
      }
    } catch (e) {
      console.error('Error parsing user data', e);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/file-manager/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      } else {
        toast.error('Failed to load files');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error loading files');
    } finally {
      setLoading(false);
    }
  };

  const loadRecycleBin = async () => {
    try {
      setLoadingRecycleBin(true);
      const res = await fetch(`${API_BASE}/api/file-manager/recycle-bin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecycleBinFiles(data);
      }
    } catch (err) {
      console.error('Error loading recycle bin', err);
    } finally {
      setLoadingRecycleBin(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/file-manager/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSettingsForm(data);
      }
    } catch (err) {
      console.error('Error loading settings', err);
    }
  };

  // Upload Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadForm(prev => ({ ...prev, file: e.dataTransfer.files[0] }));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.warning('Please select a file to upload');
      return;
    }

    const maxBytes = (settings.maxUploadSizeMb || 50) * 1024 * 1024;
    if (uploadForm.file.size > maxBytes) {
      toast.error(`File size exceeds limit of ${settings.maxUploadSizeMb} MB`);
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      if (uploadForm.description) formData.append('description', uploadForm.description);

      const res = await fetch(`${API_BASE}/api/file-manager/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        toast.success('File uploaded successfully!');
        setUploadModalOpen(false);
        setUploadForm({ file: null, description: '' });
        loadFiles();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const closePreviewModal = () => {
    if (blobPreviewUrl) {
      window.URL.revokeObjectURL(blobPreviewUrl);
      setBlobPreviewUrl('');
    }
    setPreviewModalOpen(false);
  };

  const loadMediaBlobPreview = async (file) => {
    try {
      setIsLoadingPreview(true);
      const res = await fetch(`${API_BASE}/api/file-manager/files/${file.id}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const objUrl = window.URL.createObjectURL(blob);
        setBlobPreviewUrl(objUrl);
      } else {
        setBlobPreviewUrl(`${API_BASE}/api/file-manager/files/${file.id}/preview?token=${encodeURIComponent(token || '')}`);
      }
    } catch (err) {
      console.error('Error fetching preview blob', err);
      setBlobPreviewUrl(`${API_BASE}/api/file-manager/files/${file.id}/preview?token=${encodeURIComponent(token || '')}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Open Preview / Editor
  const handleOpenPreview = async (file) => {
    setActiveFile(file);
    const ext = (file.extension || '').toLowerCase();

    if (blobPreviewUrl) {
      window.URL.revokeObjectURL(blobPreviewUrl);
      setBlobPreviewUrl('');
    }

    // Check preview type
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      setPreviewType('image');
      setPreviewModalOpen(true);
      await loadMediaBlobPreview(file);
    } else if (ext === 'pdf') {
      setPreviewType('pdf');
      setPreviewModalOpen(true);
      await loadMediaBlobPreview(file);
    } else if (['xlsx', 'xls'].includes(ext)) {
      setPreviewType('spreadsheet');
      setPreviewModalOpen(true);
      await loadSpreadsheetPreview(file);
    } else if (['csv', 'xml', 'txt', 'json', 'sql', 'md', 'html', 'js', 'css', 'yml', 'yaml'].includes(ext)) {
      setPreviewType('text');
      setPreviewModalOpen(true);
      await loadTextContent(file);
    } else {
      setPreviewType('generic');
      setPreviewModalOpen(true);
    }
  };

  const loadTextContent = async (file) => {
    try {
      setTextContent('Loading content...');
      const res = await fetch(`${API_BASE}/api/file-manager/files/${file.id}/content`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTextContent(data.content || '');
      } else {
        const err = await res.json().catch(() => ({}));
        setTextContent(err.error || 'Unable to load text preview.');
      }
    } catch (err) {
      console.error(err);
      setTextContent('Error reading file content.');
    }
  };

  const loadSpreadsheetPreview = async (file) => {
    try {
      const res = await fetch(`${API_BASE}/api/file-manager/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      if (sheetNames.length > 0) {
        const firstSheet = sheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });
        setSpreadsheetData({
          workbook,
          sheets: sheetNames,
          currentSheet: firstSheet,
          rows: rows.slice(0, 100) // render first 100 rows for smooth UI
        });
      }
    } catch (err) {
      console.error('Error parsing spreadsheet', err);
      toast.error('Could not parse Excel spreadsheet');
    }
  };

  const switchSheet = (sheetName) => {
    if (!spreadsheetData.workbook) return;
    const rows = XLSX.utils.sheet_to_json(spreadsheetData.workbook.Sheets[sheetName], { header: 1 });
    setSpreadsheetData(prev => ({
      ...prev,
      currentSheet: sheetName,
      rows: rows.slice(0, 100)
    }));
  };

  // ==========================================
  // MULTI-MODE IN-BROWSER EDITOR & REVISION HANDLERS
  // ==========================================

  const loadSpreadsheetEditor = async (file) => {
    try {
      setIsLoadingPreview(true);
      const res = await fetch(`${API_BASE}/api/file-manager/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetNames = workbook.SheetNames || ['Sheet1'];
      const firstSheet = sheetNames[0] || 'Sheet1';
      const sheet = workbook.Sheets[firstSheet];
      const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [[]];

      setEditableSpreadsheet({
        workbook,
        sheets: sheetNames,
        currentSheet: firstSheet,
        rows: rows.length > 0 ? rows : [['', '', '', '']]
      });
    } catch (err) {
      console.error('Error loading spreadsheet editor', err);
      toast.error('Could not load spreadsheet for editing');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const switchEditSheet = (sheetName) => {
    if (!editableSpreadsheet.workbook) return;
    const sheet = editableSpreadsheet.workbook.Sheets[sheetName];
    const rows = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : [[]];
    setEditableSpreadsheet(prev => ({
      ...prev,
      currentSheet: sheetName,
      rows: rows.length > 0 ? rows : [['', '', '', '']]
    }));
  };

  const handleCellChange = (rIdx, cIdx, val) => {
    setEditableSpreadsheet(prev => {
      const newRows = prev.rows.map((row, r) => {
        if (r !== rIdx) return [...row];
        const newRow = [...row];
        while (newRow.length <= cIdx) newRow.push('');
        newRow[cIdx] = val;
        return newRow;
      });
      return { ...prev, rows: newRows };
    });
  };

  const handleAddRow = () => {
    setEditableSpreadsheet(prev => {
      const colCount = Math.max(prev.rows[0]?.length || 4, 4);
      const newRow = new Array(colCount).fill('');
      return { ...prev, rows: [...prev.rows, newRow] };
    });
  };

  const handleDeleteRow = (rIdx) => {
    setEditableSpreadsheet(prev => {
      if (prev.rows.length <= 1) {
        toast.info('Cannot delete only row');
        return prev;
      }
      return { ...prev, rows: prev.rows.filter((_, idx) => idx !== rIdx) };
    });
  };

  const handleOpenEditor = async (file) => {
    setActiveFile(file);
    setEditNote('');
    setRevisionFile(null);
    setSpreadsheetSubTab('grid');

    const ext = (file.extension || '').toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      setEditMode('spreadsheet');
      setEditModalOpen(true);
      await loadSpreadsheetEditor(file);
    } else if (['pdf', 'docx', 'doc', 'zip', 'png', 'jpg', 'jpeg'].includes(ext)) {
      setEditMode('document');
      setEditModalOpen(true);
    } else {
      setEditMode('text');
      setEditModalOpen(true);
      await loadTextContent(file);
    }
  };

  const handleSaveInBrowserEdit = async () => {
    if (!activeFile) return;
    try {
      setIsSavingEdit(true);
      const res = await fetch(`${API_BASE}/api/file-manager/files/${activeFile.id}/edit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newContent: textContent,
          editNote: editNote || `In-browser edit v${(activeFile.version || 1) + 1}`
        })
      });

      if (res.ok) {
        const updated = await res.json();
        toast.success(`New version v${updated.version} created! Original copy preserved.`);
        setEditModalOpen(false);
        setPreviewModalOpen(false);
        loadFiles();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save edit');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error saving edit');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveSpreadsheetRevision = async () => {
    if (!activeFile) return;
    try {
      setIsSavingEdit(true);
      if (revisionFile) {
        await handleUploadRevisionFile();
        return;
      }

      // Convert rows back to sheet
      const ws = XLSX.utils.aoa_to_sheet(editableSpreadsheet.rows);
      const wb = editableSpreadsheet.workbook || XLSX.utils.book_new();
      wb.Sheets[editableSpreadsheet.currentSheet] = ws;
      if (!wb.SheetNames.includes(editableSpreadsheet.currentSheet)) {
        wb.SheetNames.push(editableSpreadsheet.currentSheet);
      }

      const ext = (activeFile.extension || 'xlsx').toLowerCase();
      let blob;
      if (ext === 'csv') {
        const csvOut = XLSX.utils.sheet_to_csv(ws);
        blob = new Blob([csvOut], { type: 'text/csv;charset=utf-8;' });
      } else {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }

      const formData = new FormData();
      formData.append('file', blob, activeFile.fileName);
      formData.append('editNote', editNote || `In-browser spreadsheet edit v${(activeFile.version || 1) + 1}`);

      const res = await fetch(`${API_BASE}/api/file-manager/files/${activeFile.id}/revision`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const updated = await res.json();
        toast.success(`Spreadsheet version v${updated.version} committed! Original v1 is intact.`);
        setEditModalOpen(false);
        loadFiles();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save spreadsheet revision');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving spreadsheet revision');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleUploadRevisionFile = async () => {
    if (!activeFile || !revisionFile) {
      toast.warning('Please select an updated file');
      return;
    }
    try {
      setIsSavingEdit(true);
      const formData = new FormData();
      formData.append('file', revisionFile);
      formData.append('editNote', editNote || `Updated file revision v${(activeFile.version || 1) + 1}`);

      const res = await fetch(`${API_BASE}/api/file-manager/files/${activeFile.id}/revision`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const updated = await res.json();
        toast.success(`New document version v${updated.version} created! Original copy preserved.`);
        setEditModalOpen(false);
        setRevisionFile(null);
        loadFiles();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to upload revision');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error uploading revision file');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Direct Download / Open in Local App
  const handleDownload = async (file) => {
    try {
      toast.info(`Preparing ${file.fileName}...`);
      const res = await fetch(`${API_BASE}/api/file-manager/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        toast.error('Failed to download file. Please check access rights.');
        return;
      }
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objUrl;
      link.setAttribute('download', file.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(objUrl), 30000);
      toast.success(`Downloaded ${file.fileName} to open in your desktop app!`);
    } catch (err) {
      console.error(err);
      toast.error('Network error downloading file');
    }
  };

  // Delete & Recycle Bin Handlers
  const canDeleteFile = (file) => {
    if (!file) return false;
    if (isAdmin) return true;
    if (!currentUser || !currentUser.username) return false;
    return currentUser.username.toLowerCase() === (file.uploadedBy || '').toLowerCase();
  };

  const handleDeletePrompt = (file) => {
    setFileToDelete(file);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/api/file-manager/files/${fileToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`"${fileToDelete.fileName}" moved to Recycle Bin.`);
        setDeleteModalOpen(false);
        const deletedId = fileToDelete.id;
        setFileToDelete(null);
        if (activeFile && activeFile.id === deletedId) {
          closePreviewModal();
        }
        loadFiles();
        loadRecycleBin();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete file');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error deleting file');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreFile = async (file) => {
    try {
      const res = await fetch(`${API_BASE}/api/file-manager/recycle-bin/${file.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`"${file.fileName}" has been restored to active documents!`);
        loadFiles();
        loadRecycleBin();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to restore file');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error restoring file');
    }
  };

  const handlePurgePrompt = (file) => {
    setFileToPurge(file);
    setPurgeModalOpen(true);
  };

  const confirmPurge = async () => {
    if (!fileToPurge) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/api/file-manager/recycle-bin/${fileToPurge.id}/purge`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(`"${fileToPurge.fileName}" permanently deleted.`);
        setPurgeModalOpen(false);
        setFileToPurge(null);
        loadRecycleBin();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to permanently delete file');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error permanently deleting file');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmEmptyRecycle = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/api/file-manager/recycle-bin/empty`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Recycle Bin emptied successfully.');
        setEmptyRecycleModalOpen(false);
        loadRecycleBin();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to empty recycle bin');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error emptying recycle bin');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sharing
  const handleOpenShare = (file) => {
    setActiveFile(file);
    setShareForm({ username: '', email: '', message: '', permission: 'VIEW' });
    setShareModalOpen(true);
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!shareForm.username && !shareForm.email) {
      toast.warning('Provide an employee username or an email address to share with.');
      return;
    }

    try {
      setIsSharing(true);
      const res = await fetch(`${API_BASE}/api/file-manager/files/${activeFile.id}/share`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usernames: shareForm.username ? [shareForm.username.trim()] : [],
          emails: shareForm.email ? [shareForm.email.trim()] : [],
          permission: shareForm.permission,
          message: shareForm.message
        })
      });

      if (res.ok) {
        toast.success('File shared successfully!');
        setShareModalOpen(false);
        loadFiles();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to share file');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error while sharing file');
    } finally {
      setIsSharing(false);
    }
  };

  // History & Audit Trail
  const handleOpenHistory = async (file) => {
    setActiveFile(file);
    setHistoryTab('versions');
    setHistoryModalOpen(true);

    try {
      const [histRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/api/file-manager/files/${file.id}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/file-manager/files/${file.id}/audit`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (histRes.ok) {
        const histData = await histRes.json();
        setActiveVersionHistory(histData);
      }
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setActiveAuditTrail(auditData);
      }
    } catch (err) {
      console.error('Error fetching history/audit', err);
    }
  };

  // Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/file-manager/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        toast.success('Upload settings updated successfully!');
        setSettingsModalOpen(false);
      } else {
        toast.error('Failed to update settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating settings');
    }
  };

  // Helper: File Icon based on extension
  const getFileIcon = (ext = '') => {
    const e = ext.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(e)) return <FileSpreadsheet className="text-emerald-500" size={28} />;
    if (['doc', 'docx', 'txt', 'rtf'].includes(e)) return <FileText className="text-blue-500" size={28} />;
    if (e === 'pdf') return <FileText className="text-rose-500" size={28} />;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return <FileImage className="text-amber-500" size={28} />;
    if (['xml', 'json', 'html', 'js', 'sql'].includes(e)) return <FileCode className="text-purple-500" size={28} />;
    return <FileText className="text-gray-400" size={28} />;
  };

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      const matchSearch =
        f.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.uploadedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      const ext = (f.extension || '').toLowerCase();
      if (selectedCategory === 'revisions') return f.isEdited || (f.totalRevisions && f.totalRevisions > 1);
      if (selectedCategory === 'shared') return f.isSharedWithMe || (f.sharedWithList && f.sharedWithList.length > 0);
      if (selectedCategory === 'documents') return ['doc', 'docx', 'txt', 'rtf'].includes(ext);
      if (selectedCategory === 'spreadsheets') return ['xlsx', 'xls'].includes(ext);
      if (selectedCategory === 'data') return ['csv', 'xml', 'json'].includes(ext);
      if (selectedCategory === 'pdf') return ext === 'pdf';
      if (selectedCategory === 'images') return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);

      return true;
    });
  }, [files, searchTerm, selectedCategory]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <MainSidebar />

      {/* Main Content Area with offset for fixed w-64 sidebar */}
      <main className="flex-1 ml-64 min-w-0 p-6 md:p-8 max-w-[1600px] w-full transition-all duration-300">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-xl shadow-md shadow-indigo-200">
                <HardDrive size={26} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  File & Document Suite
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
                title="Configure File Upload Limits"
              >
                <Settings size={17} className="text-slate-500" />
                <span>Upload Limits</span>
              </button>
            )}

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg active:scale-95"
            >
              <Upload size={17} />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setMainTab('files')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                mainTab === 'files'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <FolderOpen size={18} />
              <span>Active Documents</span>
              <span className="ml-1.5 px-2.5 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 font-bold">
                {files.length}
              </span>
            </button>

            <button
              onClick={() => {
                setMainTab('recycle');
                loadRecycleBin();
              }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                mainTab === 'recycle'
                  ? 'border-rose-600 text-rose-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Trash2 size={18} className={recycleBinFiles.length > 0 ? 'text-rose-500' : ''} />
              <span>Admin Recycle Bin</span>
              {recycleBinFiles.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700 font-bold">
                  {recycleBinFiles.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ACTIVE DOCUMENTS VIEW */}
        {mainTab === 'files' && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchTerm('');
                }}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 cursor-pointer hover:shadow-md ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
                title="Click to view all files"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Files</p>
                  <h3 className="text-xl font-bold text-slate-800">{files.length}</h3>
                </div>
              </div>

              <div
                onClick={() => {
                  setSelectedCategory('revisions');
                  setSearchTerm('');
                }}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 cursor-pointer hover:shadow-md ${
                  selectedCategory === 'revisions'
                    ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
                title="Click to filter revised documents"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Layers size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Revisions Created</p>
                  <h3 className="text-xl font-bold text-slate-800">
                    {files.filter(f => f.isEdited || (f.totalRevisions && f.totalRevisions > 1)).length}
                  </h3>
                </div>
              </div>

              <div
                onClick={() => {
                  setSelectedCategory('shared');
                  setSearchTerm('');
                }}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 cursor-pointer hover:shadow-md ${
                  selectedCategory === 'shared'
                    ? 'bg-purple-50/50 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
                title="Click to filter shared documents"
              >
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Share2 size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Shared Documents</p>
                  <h3 className="text-xl font-bold text-slate-800">
                    {files.filter(f => f.isSharedWithMe || (f.sharedWithList && f.sharedWithList.length > 0)).length}
                  </h3>
                </div>
              </div>

              <div
                onClick={() => {
                  if (isAdmin) {
                    setSettingsModalOpen(true);
                  } else {
                    toast.info(`Upload size limit is ${settings.maxUploadSizeMb || 50} MB. Only admins can configure upload policies.`);
                  }
                }}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all duration-200 flex items-center gap-4 cursor-pointer group"
                title="Click to configure upload size limit policy"
              >
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
                  <Shield size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Size Policy Limit</p>
                  <h3 className="text-xl font-bold text-slate-800">{settings.maxUploadSizeMb || 50} MB</h3>
                </div>
              </div>
            </div>

        {/* Toolbar: Search, Category Filters & View Mode */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by file name, author, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Files' },
              { id: 'revisions', label: 'Revisions' },
              { id: 'shared', label: 'Shared' },
              { id: 'data', label: 'XML / CSV' },
              { id: 'spreadsheets', label: 'Excel' },
              { id: 'pdf', label: 'PDFs' },
              { id: 'documents', label: 'Word / Docs' },
              { id: 'images', label: 'Images' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-sm transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <Maximize2 size={17} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-sm transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Table View"
            >
              <TableIcon size={17} />
            </button>
          </div>
        </div>

        {/* Files Display */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="animate-spin mb-3 text-indigo-500" size={32} />
            <p className="text-sm font-medium">Loading documents...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div
            onClick={() => setUploadModalOpen(true)}
            className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 p-12 text-center cursor-pointer transition-all duration-200 group"
          >
            <div className="inline-flex p-4 rounded-full bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 group-hover:scale-105 transition-all mb-3">
              <FileText size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-4">No documents found</h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 group-hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
            >
              <Upload size={16} />
              Upload Now
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFiles.map(file => {
              const ext = (file.extension || '').toLowerCase();
              const canEditInBrowser = ['xml', 'csv', 'txt', 'json', 'html', 'js', 'css', 'sql', 'md'].includes(ext);

              return (
                <div
                  key={file.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg shadow-sm transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5">
                    {/* Top Row: Icon & Version Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-105 transition-transform duration-200">
                        {getFileIcon(file.extension)}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {file.isEdited ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            v{file.version} (Edited)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            v1 (Original)
                          </span>
                        )}
                        {file.isSharedWithMe && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                            Shared with you
                          </span>
                        )}
                      </div>
                    </div>

                    {/* File Title & Info */}
                    <h3
                      onClick={() => handleOpenPreview(file)}
                      className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer truncate text-base mb-1"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                      {file.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <span className="font-semibold text-slate-600">{file.formattedSize}</span>
                      <span className="flex items-center gap-1">
                        <User size={13} className="text-slate-400" />
                        {file.uploadedBy}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="bg-slate-50/70 border-t border-slate-100 p-2.5 flex items-center justify-between gap-1 text-slate-600">
                    <button
                      onClick={() => handleOpenPreview(file)}
                      className="p-1.5 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                      title="Preview Document"
                    >
                      <Eye size={15} />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditor(file)}
                      className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="Edit Document In-Browser"
                    >
                      <Edit3 size={15} />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDownload(file)}
                      className="p-1.5 hover:text-blue-600 hover:bg-white rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                      title="Open in Local App / Download"
                    >
                      <ExternalLink size={15} />
                      <span>Open App</span>
                    </button>

                    <button
                      onClick={() => handleOpenShare(file)}
                      className="p-1.5 hover:text-purple-600 hover:bg-white rounded-lg transition-colors"
                      title="Share Document"
                    >
                      <Share2 size={15} />
                    </button>

                    <button
                      onClick={() => handleOpenHistory(file)}
                      className="p-1.5 hover:text-amber-600 hover:bg-white rounded-lg transition-colors"
                      title="Version History & Audit Log"
                    >
                      <History size={15} />
                    </button>

                    {canDeleteFile(file) && (
                      <button
                        onClick={() => handleDeletePrompt(file)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">Document</th>
                  <th className="px-5 py-3.5 text-left">Version</th>
                  <th className="px-5 py-3.5 text-left">Size</th>
                  <th className="px-5 py-3.5 text-left">Author</th>
                  <th className="px-5 py-3.5 text-left">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map(file => {
                  const ext = (file.extension || '').toLowerCase();
                  const canEditInBrowser = ['xml', 'csv', 'txt', 'json', 'html', 'js', 'css', 'sql', 'md'].includes(ext);

                  return (
                    <tr key={file.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            {getFileIcon(file.extension)}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenPreview(file)}
                              className="font-bold text-slate-800 hover:text-indigo-600 text-left block"
                            >
                              {file.fileName}
                            </button>
                            <span className="text-xs text-slate-400">{file.description || 'No description'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {file.isEdited ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            v{file.version} (Edited)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            v1 (Original)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                        {file.formattedSize}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                        {file.uploadedBy}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-400 text-xs">
                        {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right space-x-1">
                        <button
                          onClick={() => handleOpenPreview(file)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                          title="Preview Document"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditor(file)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          title="Edit Document In-Browser"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                          title="Open in Local Application"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenShare(file)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded-lg"
                          title="Share"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenHistory(file)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg"
                          title="History & Audit"
                        >
                          <History size={16} />
                        </button>
                        {canDeleteFile(file) && (
                          <button
                            onClick={() => handleDeletePrompt(file)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="Delete Document"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    )}

    {/* ========================================================================= */}
    {/* RECYCLE BIN VIEW (ADMIN ONLY) */}
    {/* ========================================================================= */}
    {mainTab === 'recycle' && isAdmin && (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Actions bar: Refresh & Empty Recycle Bin */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={loadRecycleBin}
            disabled={loadingRecycleBin}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-all"
          >
            <RefreshCw size={14} className={loadingRecycleBin ? 'animate-spin text-indigo-600' : ''} />
            <span>Refresh</span>
          </button>

          {recycleBinFiles.length > 0 && (
            <button
              onClick={() => setEmptyRecycleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all"
            >
              <Trash2 size={14} />
              <span>Empty Recycle Bin</span>
            </button>
          )}
        </div>

        {/* Recycle Bin Table */}
        {loadingRecycleBin ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="animate-spin mb-3 text-rose-500" size={32} />
            <p className="text-sm font-medium">Loading deleted files...</p>
          </div>
        ) : recycleBinFiles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <div className="inline-flex p-4 rounded-full bg-slate-100 text-slate-400 mb-3">
              <Trash2 size={36} />
            </div>
            <h3 className="text-base font-bold text-slate-800">Recycle Bin is Empty</h3>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-5">Document Name</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Original Author</th>
                    <th className="py-3 px-4">Deleted By</th>
                    <th className="py-3 px-4">Deleted Timestamp</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recycleBinFiles.map(file => (
                    <tr key={file.id} className="hover:bg-rose-50/30 transition-colors group">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-50 rounded-xl group-hover:scale-105 transition-transform">
                            {getFileIcon(file.extension)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 line-clamp-1">
                              {file.fileName}
                            </span>
                            <span className="text-xs text-slate-400">
                              Version v{file.version || 1}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {file.formattedSize || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          {file.uploadedBy || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          <Shield size={12} className="text-rose-600" />
                          {file.deletedBy || 'Administrator'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-slate-700">
                          {formatDate(file.deletedAt)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatRelativeTime(file.deletedAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRestoreFile(file)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors shadow-xs"
                            title="Restore to active documents"
                          >
                            <RotateCcw size={14} />
                            <span>Restore</span>
                          </button>

                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download / Inspect deleted file"
                          >
                            <Download size={15} />
                          </button>

                          <button
                            onClick={() => handlePurgePrompt(file)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100/60 rounded-lg transition-colors"
                            title="Permanently delete from storage"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )}

  </main>

      {/* ========================================================================= */}
      {/* 1. UPLOAD MODAL */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div 
          onClick={() => setUploadModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Upload size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Upload Document</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
              {/* Drag and drop box */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
                onClick={() => document.getElementById('file-upload-input').click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadForm(prev => ({ ...prev, file: e.target.files[0] }));
                    }
                  }}
                />
                <div className="flex flex-col items-center">
                  <Upload className="text-indigo-500 mb-2" size={32} />
                  {uploadForm.file ? (
                    <div>
                      <p className="text-sm font-bold text-slate-800">{uploadForm.file.name}</p>
                      <p className="text-xs text-slate-400">{(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Click to browse or drag file here</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Accepts XML, CSV, Excel, Word, PDF, Images, etc. (Up to {settings.maxUploadSizeMb || 50} MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description / Purpose (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide context or notes for this document..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading && <RefreshCw size={15} className="animate-spin" />}
                  <span>{isUploading ? 'Uploading...' : 'Confirm Upload'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. IN-BROWSER PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewModalOpen && activeFile && (
        <div 
          onClick={closePreviewModal}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-5xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  {getFileIcon(activeFile.extension)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    {activeFile.fileName}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      v{activeFile.version}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Uploaded by {activeFile.uploadedBy} • {activeFile.formattedSize}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    closePreviewModal();
                    handleOpenEditor(activeFile);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all shadow-sm"
                  title="Edit in Browser"
                >
                  <Edit3 size={14} />
                  <span>Edit in Browser</span>
                </button>

                <button
                  onClick={() => handleDownload(activeFile)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-sm"
                >
                  <ExternalLink size={14} />
                  <span>Open in Local App</span>
                </button>

                {canDeleteFile(activeFile) && (
                  <button
                    onClick={() => handleDeletePrompt(activeFile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-sm"
                    title="Delete Document"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  onClick={closePreviewModal}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Switch by Preview Type */}
            <div className="flex-1 overflow-auto p-6 bg-slate-100/50">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-semibold">Loading document preview...</p>
                </div>
              ) : previewType === 'pdf' ? (
                <iframe
                  src={blobPreviewUrl || `${API_BASE}/api/file-manager/files/${activeFile.id}/preview?token=${encodeURIComponent(token || '')}`}
                  className="w-full h-full rounded-2xl border border-slate-200 bg-white"
                  title="PDF Preview"
                />
              ) : previewType === 'image' ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={blobPreviewUrl || `${API_BASE}/api/file-manager/files/${activeFile.id}/preview?token=${encodeURIComponent(token || '')}`}
                    alt={activeFile.fileName}
                    className="max-h-full max-w-full rounded-2xl shadow-md object-contain border border-slate-200 bg-white"
                  />
                </div>
              ) : previewType === 'spreadsheet' ? (
                <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Sheet Tabs */}
                  {spreadsheetData.sheets.length > 1 && (
                    <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 bg-slate-50">
                      <span className="text-xs font-bold text-slate-400 uppercase">Sheets:</span>
                      {spreadsheetData.sheets.map(name => (
                        <button
                          key={name}
                          onClick={() => switchSheet(name)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            spreadsheetData.currentSheet === name
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Spreadsheet Grid */}
                  <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs font-mono">
                      <tbody className="divide-y divide-slate-100">
                        {spreadsheetData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100 font-bold text-slate-800' : 'hover:bg-slate-50'}>
                            <td className="px-3 py-2 bg-slate-50 text-slate-400 font-bold select-none border-r border-slate-200 w-12 text-center">
                              {rIdx + 1}
                            </td>
                            {Array.isArray(row) && row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-4 py-2 whitespace-nowrap text-slate-700 border-r border-slate-100">
                                {cell !== undefined && cell !== null ? String(cell) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : previewType === 'text' ? (
                <div className="h-full flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-inner font-mono text-xs">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-slate-400 border-b border-slate-700">
                    <span className="flex items-center gap-2">
                      <CodeIcon size={14} />
                      Raw Text / Code Viewer
                    </span>
                    <span>{textContent.split('\n').length} lines</span>
                  </div>
                  <pre className="flex-1 p-4 overflow-auto text-emerald-400 leading-relaxed whitespace-pre-wrap select-text">
                    {textContent}
                  </pre>
                </div>
              ) : (
                /* Generic fallback (Word, Binary, etc.) */
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-2xl border border-slate-200">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4">
                    {getFileIcon(activeFile.extension)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{activeFile.fileName}</h3>
                  <p className="text-sm text-slate-500 max-w-md mb-6">
                    This file is ready to open in its dedicated desktop application (such as Microsoft Word, Excel or Adobe Acrobat).
                  </p>
                  <button
                    onClick={() => handleDownload(activeFile)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
                  >
                    <ExternalLink size={17} />
                    <span>Open in Local Desktop Application</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MULTI-MODE IN-BROWSER DOCUMENT & SPREADSHEET EDITOR MODAL */}
      {/* ========================================================================= */}
      {editModalOpen && activeFile && (
        <div 
          onClick={() => setEditModalOpen(false)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  editMode === 'spreadsheet' ? 'bg-emerald-50 text-emerald-600' :
                  editMode === 'document' ? 'bg-blue-50 text-blue-600' :
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  {editMode === 'spreadsheet' ? <FileSpreadsheet size={22} /> :
                   editMode === 'document' ? <FileText size={22} /> :
                   <CodeIcon size={22} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    {editMode === 'spreadsheet' ? 'Spreadsheet Editor: ' :
                     editMode === 'document' ? 'Document Revision: ' :
                     'Code & Text Editor: '}
                    {activeFile.fileName}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Next: v{(activeFile.version || 1) + 1}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editMode === 'spreadsheet'
                      ? 'Edit cells directly, add rows or upload an updated sheet. Original v1 is kept.'
                      : editMode === 'document'
                      ? 'Compiled document format. Upload an updated revision or download to edit locally.'
                      : 'Modifications will be committed as a new revision. Original v1 is permanently kept.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Based on editMode */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {editMode === 'spreadsheet' ? (
                /* SPREADSHEET EDITOR VIEW */
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                  {/* Toolbar & Sheet Tabs */}
                  <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Sheets:</span>
                      {(editableSpreadsheet.sheets || []).map(sheetName => (
                        <button
                          key={sheetName}
                          onClick={() => switchEditSheet(sheetName)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            editableSpreadsheet.currentSheet === sheetName
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {sheetName}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
                        <button
                          onClick={() => setSpreadsheetSubTab('grid')}
                          className={`px-3 py-1 rounded-md transition-all ${
                            spreadsheetSubTab === 'grid' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                          }`}
                        >
                          Table Grid
                        </button>
                        <button
                          onClick={() => setSpreadsheetSubTab('upload')}
                          className={`px-3 py-1 rounded-md transition-all ${
                            spreadsheetSubTab === 'upload' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                          }`}
                        >
                          Upload Excel File
                        </button>
                      </div>

                      {spreadsheetSubTab === 'grid' && (
                        <button
                          onClick={handleAddRow}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                        >
                          <Plus size={14} />
                          <span>Add Row</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {spreadsheetSubTab === 'grid' ? (
                    /* Interactive Editable Table Grid */
                    <div className="flex-1 overflow-auto p-4">
                      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-xs font-mono">
                          <thead>
                            <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                              <th className="w-12 px-2 py-2 text-center bg-slate-200/60 select-none">#</th>
                              {Array.from({ length: Math.max(editableSpreadsheet.rows[0]?.length || 4, 4) }).map((_, cIdx) => (
                                <th key={cIdx} className="px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-200 min-w-[120px]">
                                  {String.fromCharCode(65 + (cIdx % 26))}
                                </th>
                              ))}
                              <th className="w-10 px-2 py-2 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {editableSpreadsheet.rows.map((row, rIdx) => (
                              <tr key={rIdx} className={rIdx === 0 ? 'bg-emerald-50/40 font-semibold' : 'hover:bg-slate-50/80 group'}>
                                <td className="px-2 py-1 text-center bg-slate-50 text-slate-400 font-bold select-none border-r border-slate-200 text-[11px]">
                                  {rIdx + 1}
                                </td>
                                {Array.from({ length: Math.max(editableSpreadsheet.rows[0]?.length || 4, 4) }).map((_, cIdx) => (
                                  <td key={cIdx} className="p-0 border-r border-slate-100">
                                    <input
                                      type="text"
                                      value={row[cIdx] !== undefined && row[cIdx] !== null ? row[cIdx] : ''}
                                      onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                      className="w-full px-2.5 py-1.5 text-xs bg-transparent text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:z-10 rounded-xs"
                                    />
                                  </td>
                                ))}
                                <td className="px-1 py-1 text-center">
                                  <button
                                    onClick={() => handleDeleteRow(rIdx)}
                                    className="p-1 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete row"
                                  >
                                    <Minus size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Spreadsheet File Upload Tab */
                    <div className="flex-1 p-8 flex flex-col items-center justify-center">
                      <div className="max-w-md w-full p-6 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 text-center cursor-pointer transition-all"
                        onClick={() => document.getElementById('revision-sheet-file-input').click()}
                      >
                        <input
                          id="revision-sheet-file-input"
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setRevisionFile(e.target.files[0]);
                            }
                          }}
                        />
                        <FileSpreadsheet className="text-emerald-500 mx-auto mb-3" size={40} />
                        {revisionFile ? (
                          <div>
                            <p className="text-sm font-bold text-slate-800">{revisionFile.name}</p>
                            <p className="text-xs text-slate-400 mt-1">{(revisionFile.size / 1024).toFixed(1)} KB — Ready to commit as next version</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Choose an updated spreadsheet from your computer</p>
                            <p className="text-xs text-slate-400 mt-1">If you made changes locally in Microsoft Excel, select your updated workbook here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : editMode === 'document' ? (
                /* DOCUMENT REVISION VIEW (PDF, DOCX, ZIP, ETC.) */
                <div className="flex-1 p-6 md:p-10 flex flex-col justify-center items-center bg-slate-50 overflow-y-auto">
                  <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
                      <AlertCircle size={20} className="shrink-0 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">Compiled Document Format: .{activeFile.extension?.toUpperCase()}</p>
                        <p className="mt-0.5 text-blue-700 leading-relaxed">
                          Compiled documents (such as PDF and Word DOCX files) are binary archives and cannot be edited as raw plain text in the browser. You can commit an updated version below or open the document in your desktop app.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Option A: Upload Updated File */}
                      <div
                        onClick={() => document.getElementById('revision-doc-file-input').click()}
                        className="p-5 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-indigo-50/20 flex flex-col items-center justify-center min-h-[160px]"
                      >
                        <input
                          id="revision-doc-file-input"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setRevisionFile(e.target.files[0]);
                            }
                          }}
                        />
                        <Upload size={32} className="text-indigo-500 mb-2" />
                        {revisionFile ? (
                          <div>
                            <p className="text-xs font-bold text-slate-800">{revisionFile.name}</p>
                            <p className="text-[11px] text-emerald-600 font-semibold mt-1">✓ Ready to commit as v{(activeFile.version || 1) + 1}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-slate-800">Upload Updated Document</p>
                            <p className="text-[11px] text-slate-400 mt-1">Select updated .{activeFile.extension} file to commit as v{(activeFile.version || 1) + 1}</p>
                          </div>
                        )}
                      </div>

                      {/* Option B: Download & Open Locally */}
                      <div className="p-5 border border-slate-200 rounded-2xl flex flex-col justify-between bg-white text-center">
                        <div>
                          <div className="inline-flex p-2.5 bg-slate-100 text-slate-600 rounded-xl mb-2">
                            <ExternalLink size={24} />
                          </div>
                          <p className="text-xs font-bold text-slate-800">Edit in Desktop Application</p>
                          <p className="text-[11px] text-slate-400 mt-1">Download to edit in Word, Acrobat or your default viewer.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownload(activeFile)}
                          className="mt-4 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200"
                        >
                          Download Document
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* CODE / TEXT / XML / JSON EDITOR VIEW */
                <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden font-mono text-xs">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-slate-400 border-b border-slate-700 select-none">
                    <span className="flex items-center gap-2">
                      <CodeIcon size={14} />
                      Source Text Editor
                    </span>
                    <span>{textContent.split('\n').length} lines • {textContent.length} chars</span>
                  </div>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Type or edit file content here..."
                    className="flex-1 w-full p-4 bg-transparent text-emerald-400 focus:outline-none resize-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <input
                type="text"
                placeholder="Revision summary note (e.g. Updated prices / Fixed tax formulas)..."
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={
                    editMode === 'spreadsheet'
                      ? handleSaveSpreadsheetRevision
                      : editMode === 'document'
                      ? handleUploadRevisionFile
                      : handleSaveInBrowserEdit
                  }
                  disabled={isSavingEdit || (editMode === 'document' && !revisionFile)}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingEdit && <RefreshCw size={15} className="animate-spin" />}
                  <span>{isSavingEdit ? 'Saving...' : 'Save as New Version'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SHARE MODAL */}
      {/* ========================================================================= */}
      {shareModalOpen && activeFile && (
        <div 
          onClick={() => setShareModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Share2 size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Share Document</h3>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleShareSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                {getFileIcon(activeFile.extension)}
                <div className="truncate">
                  <p className="text-sm font-bold text-slate-800 truncate">{activeFile.fileName}</p>
                  <p className="text-xs text-slate-400">{activeFile.formattedSize} • v{activeFile.version}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Share with Employee (Username)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="e.g. jdoe or admin"
                    value={shareForm.username}
                    onChange={(e) => setShareForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Or Send via Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    placeholder="colleague@example.com"
                    value={shareForm.email}
                    onChange={(e) => setShareForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Add a note for the recipient..."
                  value={shareForm.message}
                  onChange={(e) => setShareForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSharing}
                  className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSharing && <RefreshCw size={15} className="animate-spin" />}
                  <span>{isSharing ? 'Sending...' : 'Share Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VERSION HISTORY & AUDIT TRAIL MODAL */}
      {/* ========================================================================= */}
      {historyModalOpen && activeFile && (
        <div 
          onClick={() => setHistoryModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{activeFile.fileName}</h3>
                  <p className="text-xs text-slate-400">Complete revision timeline and user timestamp trail.</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs: Versions vs Audit Trail */}
            <div className="flex border-b border-slate-200 px-6 bg-white gap-6">
              <button
                onClick={() => setHistoryTab('versions')}
                className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  historyTab === 'versions'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Revisions ({activeVersionHistory.length})
              </button>
              <button
                onClick={() => setHistoryTab('audit')}
                className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  historyTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Activity Audit Log ({activeAuditTrail.length})
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6">
              {historyTab === 'versions' ? (
                <div className="space-y-4">
                  {activeVersionHistory.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-100">
                          {getFileIcon(rev.extension)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">Version {rev.version}</h4>
                            {rev.version === 1 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Pristine Original
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Edited Copy
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Saved by {rev.uploadedBy} on {new Date(rev.createdAt).toLocaleString()}
                          </p>
                          {rev.description && (
                            <p className="text-xs text-slate-500 italic mt-1">"{rev.description}"</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenPreview(rev)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownload(rev)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-xl"
                          title="Download this specific revision"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Audit Trail Timeline */
                <div className="space-y-3 font-sans">
                  {activeAuditTrail.map((audit) => (
                    <div
                      key={audit.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-500 mt-0.5">
                        <Clock size={14} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {audit.performedBy} ({audit.action})
                          </span>
                          <span className="text-slate-400">
                            {audit.performedAt ? new Date(audit.performedAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">{audit.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ADMIN SETTINGS MODAL */}
      {/* ========================================================================= */}
      {settingsModalOpen && (
        <div 
          onClick={() => setSettingsModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 overscroll-contain"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Settings size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Upload Size Limit Policy</h3>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Maximum File Upload Limit (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={settingsForm.maxUploadSizeMb}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, maxUploadSizeMb: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-1">Applies globally across all file uploads.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Allowed Extensions (Comma-separated)
                </label>
                <input
                  type="text"
                  value={settingsForm.allowedExtensions}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, allowedExtensions: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DELETE / MOVE TO RECYCLE BIN MODAL */}
      {/* ========================================================================= */}
      {deleteModalOpen && fileToDelete && (
        <div 
          onClick={() => {
            setDeleteModalOpen(false);
            setFileToDelete(null);
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 p-6 overscroll-contain"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl flex-shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Move to Recycle Bin</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-slate-800">"{fileToDelete.fileName}"</span>?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setFileToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting && <RefreshCw size={15} className="animate-spin" />}
                <span>{isDeleting ? 'Moving...' : 'Move to Recycle Bin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PERMANENT PURGE MODAL (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {purgeModalOpen && fileToPurge && (
        <div 
          onClick={() => {
            setPurgeModalOpen(false);
            setFileToPurge(null);
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 p-6 overscroll-contain"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Permanently Delete File?</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-semibold text-slate-800">"{fileToPurge.fileName}"</span>?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setPurgeModalOpen(false);
                  setFileToPurge(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPurge}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting && <RefreshCw size={15} className="animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. EMPTY RECYCLE BIN MODAL (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {emptyRecycleModalOpen && (
        <div 
          onClick={() => setEmptyRecycleModalOpen(false)}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150 overscroll-contain"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 p-6 overscroll-contain"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl flex-shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Empty Recycle Bin?</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-semibold text-slate-800">all {recycleBinFiles.length} item(s)</span> in the Recycle Bin?
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmptyRecycleModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEmptyRecycle}
                disabled={isDeleting}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting && <RefreshCw size={15} className="animate-spin" />}
                <span>{isDeleting ? 'Purging...' : 'Yes, Empty Recycle Bin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
