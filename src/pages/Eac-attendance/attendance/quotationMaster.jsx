import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, Edit2, Plus, Trash2, Save, RefreshCw, Download, FileText, FileSpreadsheet, FileType, Settings, Grid, List, X } from 'lucide-react';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';

const QuotationMaster = () => {
    const [quotes, setQuotes] = useState([]);
    const [editingQuote, setEditingQuote] = useState(null);
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        quoteNumber: '',
        quoteDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        subtotal: 0,
        taxRate: 10,
        taxAmount: 0,
        discount: 0,
        total: 0,
        notes: '',
        terms: 'Payment due within 30 days. 50% advance required for work to begin.'
    });

    const [newItem, setNewItem] = useState({
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0
    });

    // Logo and company info state
    const [companyLogo, setCompanyLogo] = useState(null);
    const [companyInfo, setCompanyInfo] = useState({
        name: 'EAC ELECTRICAL SOLUTION LIMITED',
        address: 'Your Company Address, City, Country',
        phone: '(123) 456-7890',
        email: 'info@eac-electrical.com',
        website: 'www.eac-electrical.com'
    });

    // Company Settings Modal State
    const [showCompanySettings, setShowCompanySettings] = useState(false);
    
    // Show/Hide create quote form
    const [showCreateForm, setShowCreateForm] = useState(false);
    
    // View mode state (card or table)
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    
    // Table sorting state
    const [sortConfig, setSortConfig] = useState({ key: 'quoteDate', direction: 'desc' });

    // Load company info from localStorage on mount
    useEffect(() => {
        const savedLogo = localStorage.getItem('companyLogo');
        const savedInfo = localStorage.getItem('companyInfo');
        
        if (savedLogo) setCompanyLogo(savedLogo);
        if (savedInfo) setCompanyInfo(JSON.parse(savedInfo));
    }, []);

    // Logo upload handler
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Logo size should be less than 2MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyLogo(reader.result);
                localStorage.setItem('companyLogo', reader.result);
                toast.success('Logo uploaded successfully!');
            };
            reader.onerror = () => {
                toast.error('Failed to read logo file');
            };
            reader.readAsDataURL(file);
        }
    };

    // Get API base URL
    const getApiBaseUrl = () => {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return "http://localhost:8080";
        }
        if (hostname.startsWith("192.168.")) {
            return import.meta.env.VITE_API_BASE_URL_LOCAL || "http://localhost:8080";
        }
        return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
    };

    // Get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem("jwtToken") || localStorage.getItem("authToken");
        if (!token) {
            toast.error("Please log in to continue");
            setTimeout(() => window.location.href = '/login', 2000);
            return {};
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    // Create axios instance
    const createAxiosInstance = () => {
        return axios.create({
            baseURL: getApiBaseUrl(),
            headers: getAuthHeaders()
        });
    };

    // Fetch quotes on component mount
    useEffect(() => {
        fetchQuotes();
        generateQuoteNumber();
    }, []);

    const fetchQuotes = async () => {
        try {
            const axiosInstance = createAxiosInstance();
            const response = await axiosInstance.get('/api/quotes');
            setQuotes(response.data);
        } catch (error) {
            console.error('Error fetching quotes:', error);
            if (error.response?.status === 401) {
                toast.error('Session expired. Please log in again.');
            } else if (error.response?.status !== 401) {
                toast.error('Failed to load quotes');
            }
        }
    };

    const generateQuoteNumber = () => {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000);
        const quoteNum = `QT-${timestamp}-${randomNum}`;
        setFormData(prev => ({ ...prev, quoteNumber: quoteNum }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'taxRate' || name === 'discount') {
            const numValue = value === '' ? 0 : parseFloat(value) || 0;
            setFormData(prev => ({ ...prev, [name]: numValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCompanyInfoChange = (e) => {
        const { name, value } = e.target;
        setCompanyInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (e) => {
        const { name, value } = e.target;
        const updatedValue = name === 'quantity' || name === 'unitPrice' ? parseFloat(value) || 0 : value;
        setNewItem(prev => {
            const updatedItem = { ...prev, [name]: updatedValue };
            if (name === 'quantity' || name === 'unitPrice') {
                updatedItem.total = (updatedItem.quantity || 0) * (updatedItem.unitPrice || 0);
            }
            return updatedItem;
        });
    };

    const addItem = () => {
        if (newItem.description && newItem.quantity > 0 && newItem.unitPrice > 0) {
            const itemWithId = { ...newItem, id: Date.now() };
            setFormData(prev => ({ ...prev, items: [...prev.items, itemWithId] }));
            setNewItem({ description: '', quantity: 1, unitPrice: 0, total: 0 });
        } else {
            toast.error('Please fill all item fields with valid values');
        }
    };

    const removeItem = (index) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
        const taxAmount = subtotal * ((formData.taxRate || 0) / 100);
        const discount = formData.discount || 0;
        const total = subtotal + taxAmount - discount;
        setFormData(prev => ({
            ...prev,
            subtotal: parseFloat(subtotal.toFixed(2)),
            taxAmount: parseFloat(taxAmount.toFixed(2)),
            total: parseFloat(total.toFixed(2))
        }));
    };

    useEffect(() => {
        calculateTotals();
    }, [formData.items, formData.taxRate, formData.discount]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerName.trim()) {
            toast.error('Please enter customer name');
            return;
        }

        try {
            const axiosInstance = createAxiosInstance();
            const quoteData = {
                ...formData,
                status: 'DRAFT',
                createdAt: new Date().toISOString(),
                discount: formData.discount || 0,
                taxRate: formData.taxRate || 10
            };

            if (editingQuote) {
                await axiosInstance.put(`/api/quotes/${editingQuote.id}`, quoteData);
                toast.success('Quote updated successfully!');
            } else {
                await axiosInstance.post('/api/quotes', quoteData);
                toast.success('Quote created successfully!');
            }

            resetForm();
            fetchQuotes();
            setShowCreateForm(false);
        } catch (error) {
            console.error('Error saving quote:', error);
            toast.error(error.response?.data?.message || 'Error saving quote');
        }
    };

    const editQuote = (quote) => {
        setEditingQuote(quote);
        const formattedQuote = {
            ...quote,
            quoteDate: quote.quoteDate ? quote.quoteDate.split('T')[0] : new Date().toISOString().split('T')[0],
            validUntil: quote.validUntil ? quote.validUntil.split('T')[0] : new Date().toISOString().split('T')[0],
            discount: quote.discount || 0,
            taxRate: quote.taxRate || 10
        };
        setFormData(formattedQuote);
        setShowCreateForm(true);
        window.scrollTo(0, 0);
    };

    const resetForm = () => {
        setFormData({
            customerName: '',
            customerEmail: '',
            customerPhone: '',
            customerAddress: '',
            quoteNumber: '',
            quoteDate: new Date().toISOString().split('T')[0],
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            items: [],
            subtotal: 0,
            taxRate: 10,
            taxAmount: 0,
            discount: 0,
            total: 0,
            notes: '',
            terms: 'Payment due within 30 days. 50% advance required for work to begin.'
        });
        setEditingQuote(null);
        generateQuoteNumber();
    };

    const handleCancelCreate = () => {
        resetForm();
        setShowCreateForm(false);
    };

    // ============ SORTING FUNCTION ============
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedQuotes = [...quotes].sort((a, b) => {
        if (sortConfig.key === 'customerName') {
            const nameA = (a.customerName || '').toLowerCase();
            const nameB = (b.customerName || '').toLowerCase();
            if (nameA < nameB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (nameA > nameB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
        if (sortConfig.key === 'total') {
            const totalA = a.total || 0;
            const totalB = b.total || 0;
            return sortConfig.direction === 'asc' ? totalA - totalB : totalB - totalA;
        }
        if (sortConfig.key === 'quoteDate') {
            const dateA = new Date(a.quoteDate || 0);
            const dateB = new Date(b.quoteDate || 0);
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return 0;
    });

    // ============ EXPORT FUNCTIONS ============

    // Generate HTML for export
    const generateQuoteHTML = (quote) => {
        const formatNumber = (num) => {
            const value = num || 0;
            return typeof value === 'number' ? value.toFixed(2) : '0.00';
        };

        return `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                <!-- Header with Logo -->
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                    ${companyLogo ? `
                        <div style="margin-bottom: 15px;">
                            <img src="${companyLogo}" alt="Company Logo" style="max-height: 80px; max-width: 200px;">
                        </div>
                    ` : ''}
                    <h1 style="font-size: 24px; font-weight: bold; margin: 10px 0; color: #333;">
                        ${companyInfo.name}
                    </h1>
                    <p style="font-size: 18px; color: #666;">Professional Quotation</p>
                </div>
                
                <!-- Company and Customer Info -->
                <div style="display: flex; justify-content: space-between; margin: 20px 0;">
                    <div style="width: 45%;">
                        <strong style="color: #333;">From:</strong><br>
                        ${companyInfo.name}<br>
                        ${companyInfo.address}<br>
                        Phone: ${companyInfo.phone}<br>
                        Email: ${companyInfo.email}<br>
                        Website: ${companyInfo.website}
                    </div>
                    <div style="width: 45%;">
                        <strong style="color: #333;">To:</strong><br>
                        ${quote.customerName || 'N/A'}<br>
                        ${quote.customerAddress || 'N/A'}<br>
                        Phone: ${quote.customerPhone || 'N/A'}<br>
                        Email: ${quote.customerEmail || 'N/A'}
                    </div>
                </div>
                
                <!-- Quote Details -->
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        <div>
                            <strong>Quote #:</strong> ${quote.quoteNumber || 'N/A'}
                        </div>
                        <div>
                            <strong>Date:</strong> ${quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div>
                            <strong>Valid Until:</strong> ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>
                </div>
                
                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Description</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Quantity</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Unit Price (GHS)</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Total (GHS)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(quote.items || []).map(item => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 10px;">${item.description || ''}</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">${item.quantity || 0}</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">${formatNumber(item.unitPrice)}</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">${formatNumber(item.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Totals -->
                <div style="float: right; width: 300px; margin-top: 20px;">
                    <div style="border-top: 2px solid #333; padding-top: 10px;">
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>Subtotal:</span>
                            <span><strong>GHS ${formatNumber(quote.subtotal)}</strong></span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>Tax (${quote.taxRate || 0}%):</span>
                            <span>GHS ${formatNumber(quote.taxAmount)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0;">
                            <span>Discount:</span>
                            <span>GHS ${formatNumber(quote.discount)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 18px; font-weight: bold;">
                            <span>Total Amount:</span>
                            <span>GHS ${formatNumber(quote.total)}</span>
                        </div>
                    </div>
                </div>
                
                <div style="clear: both; padding-top: 50px;">
                    <!-- Notes -->
                    <div style="margin-bottom: 20px;">
                        <strong>Notes:</strong><br>
                        <p style="white-space: pre-line;">${quote.notes || 'N/A'}</p>
                    </div>
                    
                    <!-- Terms -->
                    <div style="margin-bottom: 20px;">
                        <strong>Terms & Conditions:</strong><br>
                        <p style="white-space: pre-line;">${quote.terms || 'N/A'}</p>
                    </div>
                    
                    <!-- Signature -->
                    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #333;">
                        <div style="width: 250px;">
                            <div style="border-bottom: 1px solid #333; padding-bottom: 5px;">_________________________</div>
                            <div style="margin-top: 5px; color: #666;">Authorized Signature</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    // 1. Export to PDF using html2pdf.js
    const exportToPDF = (quote) => {
        try {
            const element = document.createElement('div');
            element.innerHTML = generateQuoteHTML(quote);
            document.body.appendChild(element);

            const options = {
                margin: 10,
                filename: `Quote-${quote.quoteNumber || 'unnumbered'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    logging: false 
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait' 
                }
            };

            html2pdf().from(element).set(options).save().then(() => {
                document.body.removeChild(element);
                toast.success('PDF exported successfully!');
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF');
        }
    };

    // 2. Export to Excel
    const exportToExcel = (quote) => {
        try {
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Summary sheet
            const summaryData = [
                ['QUOTATION', '', '', ''],
                ['Quote Number:', quote.quoteNumber || '', 'Date:', quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString() : ''],
                ['Valid Until:', quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '', 'Status:', quote.status || 'DRAFT'],
                [''],
                ['COMPANY INFORMATION'],
                ['Name:', companyInfo.name, 'Address:', companyInfo.address],
                ['Phone:', companyInfo.phone, 'Email:', companyInfo.email],
                ['Website:', companyInfo.website, '', ''],
                [''],
                ['CUSTOMER INFORMATION'],
                ['Name:', quote.customerName || '', 'Email:', quote.customerEmail || ''],
                ['Phone:', quote.customerPhone || '', 'Address:', quote.customerAddress || ''],
                [''],
                ['FINANCIAL SUMMARY'],
                ['Subtotal (GHS):', quote.subtotal || 0],
                ['Tax Rate:', `${quote.taxRate || 0}%`],
                ['Tax Amount (GHS):', quote.taxAmount || 0],
                ['Discount (GHS):', quote.discount || 0],
                ['TOTAL AMOUNT (GHS):', quote.total || 0],
                [''],
                ['NOTES:', quote.notes || ''],
                [''],
                ['TERMS & CONDITIONS:', quote.terms || '']
            ];

            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            
            // Items sheet
            const itemsData = [
                ['ITEMS LIST'],
                ['Description', 'Quantity', 'Unit Price (GHS)', 'Total (GHS)'],
                ...(quote.items || []).map(item => [
                    item.description || '',
                    item.quantity || 0,
                    item.unitPrice || 0,
                    item.total || 0
                ]),
                [''],
                ['Subtotal:', '', '', quote.subtotal || 0],
                ['Tax:', '', '', quote.taxAmount || 0],
                ['Discount:', '', '', quote.discount || 0],
                ['TOTAL:', '', '', quote.total || 0]
            ];

            const itemsWs = XLSX.utils.aoa_to_sheet(itemsData);

            // Add sheets to workbook
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
            XLSX.utils.book_append_sheet(wb, itemsWs, 'Items');

            // Save file
            XLSX.writeFile(wb, `Quote-${quote.quoteNumber || 'unnumbered'}.xlsx`);
            toast.success('Excel file exported successfully!');
        } catch (error) {
            console.error('Error generating Excel:', error);
            toast.error('Failed to generate Excel file');
        }
    };

    // 3. Export to Text (Simple Word alternative)
    const exportToText = (quote) => {
        try {
            const formatNumber = (num) => (num || 0).toFixed(2);
            
            let textContent = `QUOTATION\n`;
            textContent += `====================\n\n`;
            textContent += `Company: ${companyInfo.name}\n`;
            textContent += `Address: ${companyInfo.address}\n`;
            textContent += `Phone: ${companyInfo.phone}\n`;
            textContent += `Email: ${companyInfo.email}\n\n`;
            
            textContent += `Quote #: ${quote.quoteNumber || 'N/A'}\n`;
            textContent += `Date: ${quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString() : 'N/A'}\n`;
            textContent += `Valid Until: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}\n\n`;
            
            textContent += `Customer: ${quote.customerName || 'N/A'}\n`;
            textContent += `Address: ${quote.customerAddress || 'N/A'}\n`;
            textContent += `Phone: ${quote.customerPhone || 'N/A'}\n`;
            textContent += `Email: ${quote.customerEmail || 'N/A'}\n\n`;
            
            textContent += `ITEMS:\n`;
            textContent += `------\n`;
            (quote.items || []).forEach((item, index) => {
                textContent += `${index + 1}. ${item.description || ''}\n`;
                textContent += `   Qty: ${item.quantity || 0} | Unit: GHS ${formatNumber(item.unitPrice)} | Total: GHS ${formatNumber(item.total)}\n\n`;
            });
            
            textContent += `FINANCIAL SUMMARY:\n`;
            textContent += `------------------\n`;
            textContent += `Subtotal: GHS ${formatNumber(quote.subtotal)}\n`;
            textContent += `Tax (${quote.taxRate || 0}%): GHS ${formatNumber(quote.taxAmount)}\n`;
            textContent += `Discount: GHS ${formatNumber(quote.discount)}\n`;
            textContent += `TOTAL: GHS ${formatNumber(quote.total)}\n\n`;
            
            textContent += `Notes: ${quote.notes || 'N/A'}\n\n`;
            textContent += `Terms: ${quote.terms || 'N/A'}\n\n`;
            
            textContent += `Authorized Signature:\n`;
            textContent += `_____________________\n`;
            
            // Create and download text file
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Quote-${quote.quoteNumber || 'unnumbered'}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Text file exported successfully!');
        } catch (error) {
            console.error('Error generating text file:', error);
            toast.error('Failed to generate text file');
        }
    };

    // 4. Print function
    const printQuote = (quote) => {
        try {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Quote ${quote.quoteNumber || 'Unnumbered'}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 40px; 
                            line-height: 1.6;
                        }
                        @media print {
                            @page { margin: 20mm; }
                            body { margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${generateQuoteHTML(quote)}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } catch (error) {
            console.error("Error printing quote:", error);
            toast.error("Failed to generate print preview");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Quotation Master</h1>
                        <p className="text-gray-600">Create and manage professional quotations</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCompanySettings(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <Settings size={18} />
                            Company Settings
                        </button>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Create New Quote
                        </button>
                    </div>
                </div>

                {/* Company Settings Modal */}
                {showCompanySettings && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Company Settings</h2>
                                    <button
                                        onClick={() => setShowCompanySettings(false)}
                                        className="text-gray-500 hover:text-gray-700 text-2xl"
                                    >
                                        &times;
                                    </button>
                                </div>
                                
                                {/* Logo Upload Section */}
                                <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-700">Company Logo</h3>
                                            <p className="text-sm text-gray-500">Recommended: 200x80px, PNG or JPG</p>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="logo-upload"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="logo-upload"
                                                className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                            >
                                                <FileType size={16} />
                                                Upload Logo
                                            </label>
                                        </div>
                                    </div>
                                    {companyLogo && (
                                        <div className="mt-4 flex flex-col items-center">
                                            <img 
                                                src={companyLogo} 
                                                alt="Company Logo" 
                                                className="max-h-32 max-w-full object-contain mb-4 p-2 border rounded"
                                            />
                                            <button
                                                onClick={() => {
                                                    setCompanyLogo(null);
                                                    localStorage.removeItem('companyLogo');
                                                    toast.success('Logo removed');
                                                }}
                                                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                            >
                                                Remove Logo
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Company Info Form */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={companyInfo.name}
                                            onChange={handleCompanyInfoChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address
                                        </label>
                                        <textarea
                                            name="address"
                                            value={companyInfo.address}
                                            onChange={handleCompanyInfoChange}
                                            rows="2"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Phone
                                            </label>
                                            <input
                                                type="text"
                                                name="phone"
                                                value={companyInfo.phone}
                                                onChange={handleCompanyInfoChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={companyInfo.email}
                                                onChange={handleCompanyInfoChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Website
                                        </label>
                                        <input
                                            type="text"
                                            name="website"
                                            value={companyInfo.website}
                                            onChange={handleCompanyInfoChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
                                    <button
                                        onClick={() => setShowCompanySettings(false)}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
                                            toast.success('Company settings saved!');
                                            setShowCompanySettings(false);
                                        }}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Save Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Quote Form Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        {editingQuote ? 'Edit Quote' : 'Create New Quote'}
                                    </h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancelCreate}
                                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <RefreshCw size={18} />
                                            Reset
                                        </button>
                                        <button
                                            onClick={handleCancelCreate}
                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Customer Information */}
                                    <div className="border border-gray-200 rounded-lg p-5">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">Customer Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Customer Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="customerName"
                                                    value={formData.customerName}
                                                    onChange={handleInputChange}
                                                    required
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                    placeholder="Enter customer name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    name="customerEmail"
                                                    value={formData.customerEmail}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                    placeholder="customer@example.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="customerPhone"
                                                    value={formData.customerPhone}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                    placeholder="(123) 456-7890"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Quote Number
                                                </label>
                                                <input
                                                    type="text"
                                                    name="quoteNumber"
                                                    value={formData.quoteNumber}
                                                    onChange={handleInputChange}
                                                    readOnly
                                                    className="w-full px-4 py-2 border border-gray-300 bg-gray-50 rounded-lg text-gray-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Address
                                            </label>
                                            <textarea
                                                name="customerAddress"
                                                value={formData.customerAddress}
                                                onChange={handleInputChange}
                                                rows="2"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                                                placeholder="Customer address..."
                                            />
                                        </div>
                                    </div>

                                    {/* Quote Details */}
                                    <div className="border border-gray-200 rounded-lg p-5">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">Quote Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Quote Date
                                                </label>
                                                <input
                                                    type="date"
                                                    name="quoteDate"
                                                    value={formData.quoteDate}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Valid Until
                                                </label>
                                                <input
                                                    type="date"
                                                    name="validUntil"
                                                    value={formData.validUntil}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Section */}
                                    <div className="border border-gray-200 rounded-lg p-5">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">Items</h3>
                                        
                                        {/* Add Item Form */}
                                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
                                                <div className="md:col-span-5">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Description
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newItem.description}
                                                        onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                                                        placeholder="Enter item description"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Quantity
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={newItem.quantity}
                                                        onChange={handleItemChange}
                                                        name="quantity"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Unit Price (GHS)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={newItem.unitPrice}
                                                        onChange={handleItemChange}
                                                        name="unitPrice"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Total
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={`GHS ${(newItem.total || 0).toFixed(2)}`}
                                                        readOnly
                                                        className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-lg text-gray-600 font-medium"
                                                    />
                                                </div>
                                                <div className="md:col-span-1 flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={addItem}
                                                        disabled={!newItem.description || newItem.quantity <= 0 || newItem.unitPrice <= 0}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Plus size={18} />
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        {formData.items.length > 0 && (
                                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {formData.items.map((item, index) => (
                                                            <tr key={item.id || index} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 text-sm text-gray-800">{item.description}</td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">{item.quantity}</td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">GHS {(item.unitPrice || 0).toFixed(2)}</td>
                                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">GHS {(item.total || 0).toFixed(2)}</td>
                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeItem(index)}
                                                                        className="flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors text-sm"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                        Remove
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50">
                                                        <tr>
                                                            <td colSpan="3" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                                                Subtotal:
                                                            </td>
                                                            <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                                                GHS {(formData.subtotal || 0).toFixed(2)}
                                                            </td>
                                                            <td></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pricing Section */}
                                    <div className="border border-gray-200 rounded-lg p-5">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">Pricing Summary</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center border-b pb-2">
                                                    <span className="text-gray-600">Subtotal:</span>
                                                    <span className="text-lg font-semibold text-gray-800">
                                                        GHS {(formData.subtotal || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Tax Rate (%)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name="taxRate"
                                                            value={formData.taxRate || ''}
                                                            onChange={handleInputChange}
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Discount (GHS)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            name="discount"
                                                            value={formData.discount || ''}
                                                            onChange={handleInputChange}
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center border-b pb-2">
                                                    <span className="text-gray-600">Tax Amount:</span>
                                                    <span className="font-medium text-gray-800">
                                                        GHS {(formData.taxAmount || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center border-b pb-2">
                                                    <span className="text-gray-600">Discount:</span>
                                                    <span className="font-medium text-red-600">
                                                        - GHS {(formData.discount || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-gray-700 font-medium">Total Amount:</span>
                                                        <span className="text-3xl font-bold text-gray-900">
                                                            GHS {(formData.total || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-2">
                                                        Including GHS {(formData.taxAmount || 0).toFixed(2)} tax
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes and Terms */}
                                    <div className="border border-gray-200 rounded-lg p-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Notes
                                                </label>
                                                <textarea
                                                    name="notes"
                                                    value={formData.notes}
                                                    onChange={handleInputChange}
                                                    rows="3"
                                                    placeholder="Additional notes or comments..."
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Terms & Conditions
                                                </label>
                                                <textarea
                                                    name="terms"
                                                    value={formData.terms}
                                                    onChange={handleInputChange}
                                                    rows="3"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="flex justify-end gap-4 pt-6 border-t">
                                        <button
                                            type="button"
                                            onClick={handleCancelCreate}
                                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                                        >
                                            <Save size={18} />
                                            {editingQuote ? 'Update Quote' : 'Create Quote'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content - Quotes Display */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Quotations</h2>
                            <p className="text-sm text-gray-500">{quotes.length} quotes found</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMode('card')}
                                    className={`p-2 rounded-lg ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                    title="Card View"
                                >
                                    <Grid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                    title="Table View"
                                >
                                    <List size={18} />
                                </button>
                            </div>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={18} />
                                Create Quote
                            </button>
                        </div>
                    </div>
                    
                    {quotes.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-xl">
                            <div className="text-gray-400 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-500 text-lg mb-2">No quotations found</p>
                            <p className="text-gray-400 mb-6">Create your first quotation to get started</p>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Plus size={18} />
                                Create Your First Quote
                            </button>
                        </div>
                    ) : viewMode === 'card' ? (
                        // Card View
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedQuotes.map((quote) => (
                                <div key={quote.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all bg-white">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                                {quote.quoteNumber || 'Unnumbered'}
                                            </span>
                                            <span className={`ml-2 inline-block px-2 py-1 text-xs font-medium rounded ${
                                                (quote.status || 'DRAFT') === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                                                (quote.status || 'DRAFT') === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                                (quote.status || 'DRAFT') === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {quote.status || 'DRAFT'}
                                            </span>
                                        </div>
                                        <span className="text-lg font-bold text-gray-800">
                                            GHS {(quote.total || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <h3 className="font-medium text-gray-800 mb-2 text-lg">{quote.customerName || 'Unknown Customer'}</h3>
                                    <div className="text-sm text-gray-600 space-y-1 mb-4">
                                        <div className="flex justify-between">
                                            <span>Date:</span>
                                            <span className="font-medium">{quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Items:</span>
                                            <span className="font-medium">{(quote.items || []).length}</span>
                                        </div>
                                        {quote.customerEmail && (
                                            <div className="truncate">
                                                <span className="text-blue-600">{quote.customerEmail}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Export Options */}
                                    <div className="mb-3">
                                        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                                            <Download size={12} />
                                            <span>Export Options:</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <button
                                                onClick={() => exportToPDF(quote)}
                                                className="flex items-center justify-center gap-1 px-2 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors text-xs"
                                                title="Export as PDF"
                                            >
                                                <FileType size={12} />
                                                PDF
                                            </button>
                                            <button
                                                onClick={() => exportToExcel(quote)}
                                                className="flex items-center justify-center gap-1 px-2 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors text-xs"
                                                title="Export as Excel"
                                            >
                                                <FileSpreadsheet size={12} />
                                                Excel
                                            </button>
                                            <button
                                                onClick={() => exportToText(quote)}
                                                className="flex items-center justify-center gap-1 px-2 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-xs"
                                                title="Export as Text"
                                            >
                                                <FileText size={12} />
                                                Text
                                            </button>
                                            <button
                                                onClick={() => printQuote(quote)}
                                                className="flex items-center justify-center gap-1 px-2 py-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors text-xs"
                                                title="Print"
                                            >
                                                <Printer size={12} />
                                                Print
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => editQuote(quote)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                        >
                                            <Edit2 size={14} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => printQuote(quote)}
                                            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                                        >
                                            <Printer size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Table View
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th 
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('quoteDate')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Date
                                                {sortConfig.key === 'quoteDate' && (
                                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('customerName')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Customer
                                                {sortConfig.key === 'customerName' && (
                                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Quote #
                                        </th>
                                        <th 
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('total')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Amount
                                                {sortConfig.key === 'total' && (
                                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedQuotes.map((quote) => (
                                        <tr key={quote.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="font-medium text-gray-900">{quote.customerName || 'Unknown'}</div>
                                                {quote.customerEmail && (
                                                    <div className="text-xs text-gray-500 truncate max-w-[120px]">{quote.customerEmail}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                                                {quote.quoteNumber || 'Unnumbered'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                                                GHS {(quote.total || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                                    (quote.status || 'DRAFT') === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                                                    (quote.status || 'DRAFT') === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                                    (quote.status || 'DRAFT') === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {quote.status || 'DRAFT'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => editQuote(quote)}
                                                        className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => exportToPDF(quote)}
                                                        className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium"
                                                    >
                                                        PDF
                                                    </button>
                                                    <button
                                                        onClick={() => printQuote(quote)}
                                                        className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-medium"
                                                    >
                                                        Print
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuotationMaster;