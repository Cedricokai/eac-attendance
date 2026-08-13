import React, { useState, useEffect, useRef } from 'react';
import MainSidebar from '../mainSidebar';
import Header from '../../../components/Header';
import EmailSettings from '../../../components/settings/EmailSettings';
import { useSettings } from '../context/SettingsContext';

// ===================================================================
//  REUSABLE UI COMPONENTS
// ===================================================================
const Button = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card = ({ title, children, actions, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {(title || actions) && (
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const FormField = ({ label, id, children, help, required = false }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
    {children}
    {help && <p className="text-xs text-slate-400">{help}</p>}
  </div>
);

const Toggle = ({ checked, onChange, label, description, disabled = false }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${checked ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
    <div>
      <span className="font-medium text-slate-800">{label}</span>
      {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
        ${checked ? 'bg-blue-600' : 'bg-slate-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-blue-300'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  </div>
);

const Modal = ({ isOpen, onClose, title, children, footer, size = 'max-w-2xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div
        className={`
          bg-white rounded-2xl shadow-2xl w-full ${size} max-h-[90vh] overflow-y-auto
          transform transition-all duration-200 scale-100 opacity-100
        `}
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 px-6 py-4 border-b border-slate-200 flex justify-between items-center rounded-t-2xl">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
};

const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const bg = type === 'success' ? 'bg-green-50 border-green-400 text-green-800' : 'bg-red-50 border-red-400 text-red-800';
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-slide-in-right">
      <div className={`border-l-4 p-4 rounded-lg shadow-lg ${bg}`}>
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium">{message}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
//  WORKFLOW ROLE HELPERS
// ===================================================================
const normalizeRoleLabel = (roleName) => {
  if (!roleName) return '';

  return String(roleName)
    .trim()
    .replace(/^ROLE_/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

const parseRequiredRoles = (requiredRole) => {
  if (!requiredRole) return [];

  return String(requiredRole)
    .split(',')
    .map(role => role.trim())
    .filter(Boolean);
};

const parseEmailRecipients = value => String(value || '')
  .split(/[,;\n]/)
  .map(email => email.trim())
  .filter(Boolean);

const mergeEmailRecipients = (...values) => Array.from(new Set(
  values.flatMap(parseEmailRecipients).map(email => email.toLowerCase())
)).join(', ');

const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const RoleBadge = ({ role, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
    {normalizeRoleLabel(role)}
    {onRemove && (
      <button
        type="button"
        onClick={() => onRemove(role)}
        className="ml-0.5 rounded-full p-0.5 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-800"
        aria-label={`Remove ${normalizeRoleLabel(role)}`}
      >
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    )}
  </span>
);

const WorkflowRoleSelector = ({
  roles,
  selectedRoles,
  loading,
  onChange
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const selectedSet = new Set(selectedRoles);

  const toggleRole = roleName => {
    const next = selectedSet.has(roleName)
      ? selectedRoles.filter(role => role !== roleName)
      : [...selectedRoles, roleName];

    onChange(next);
  };

  const removeRole = roleName => {
    onChange(selectedRoles.filter(role => role !== roleName));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(previous => !previous)}
        className={`
          min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition
          ${open
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-slate-300 hover:border-slate-400'}
          ${loading ? 'cursor-wait bg-slate-50 opacity-70' : ''}
        `}
      >
        {loading ? (
          <span className="text-sm text-slate-400">Loading roles...</span>
        ) : selectedRoles.length === 0 ? (
          <span className="text-sm text-slate-400">
            Select one or more roles
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedRoles.map(role => (
              <RoleBadge
                key={role}
                role={role}
                onRemove={removeRole}
              />
            ))}
          </div>
        )}

        <svg
          className={`absolute right-3 top-3.5 h-4 w-4 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && !loading && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Available roles
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Select every role allowed to complete this step.
            </p>
          </div>

          <div className="max-h-56 overflow-y-auto p-2">
            {roles.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-amber-600">
                No roles are available.
              </div>
            ) : (
              roles.map(role => {
                const roleName =
                  typeof role === 'string'
                    ? role
                    : role.name;

                const checked = selectedSet.has(roleName);

                return (
                  <label
                    key={
                      typeof role === 'string'
                        ? role
                        : role.id ?? role.name
                    }
                    className={`
                      flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors
                      ${checked
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-700 hover:bg-slate-50'}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(roleName)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {normalizeRoleLabel(roleName)}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {roleName}
                      </p>
                    </div>

                    {checked && (
                      <svg
                        className="h-4 w-4 flex-none text-blue-600"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.292a1 1 0 0 1 .004 1.414l-7.25 7.292a1 1 0 0 1-1.42.002l-3.75-3.75a1 1 0 1 1 1.414-1.414l3.04 3.04 6.544-6.58a1 1 0 0 1 1.418-.004Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">
              {selectedRoles.length} selected
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ===================================================================
//  CATEGORY APPROVER ROW
// ===================================================================
const CategoryApproverRow = ({ category, onMessage, API_BASE_URL, getToken, loadAllSettings }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    useCustomApprovers: category.useCustomApprovers || false,
    supervisorEmails: category.supervisorEmails || '',
    plannerEmails: category.plannerEmails || '',
    hrEmails: category.hrEmails || ''
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...category,
          useCustomApprovers: editData.useCustomApprovers,
          supervisorEmails: editData.supervisorEmails,
          plannerEmails: editData.plannerEmails,
          hrEmails: editData.hrEmails
        })
      });
      if (response.ok) {
        onMessage('success', `Approval routing updated for ${category.name}`);
        await loadAllSettings();
        setIsEditing(false);
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error(error);
      onMessage('error', 'Failed to update approval routing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="hover:bg-blue-50/50 transition-colors border-b border-slate-100 last:border-0">
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{category.name}</span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{category.employeeCount || 0} employees</span>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        {isEditing ? (
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={editData.useCustomApprovers}
              onChange={(e) => setEditData(prev => ({ ...prev, useCustomApprovers: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            />
            <span className="text-sm text-slate-600">Enable</span>
          </label>
        ) : (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            category.useCustomApprovers ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {category.useCustomApprovers ? 'Custom' : 'Global'}
          </span>
        )}
      </td>
      <td className="px-4 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editData.supervisorEmails}
            onChange={(e) => setEditData(prev => ({ ...prev, supervisorEmails: e.target.value }))}
            className="w-full text-sm border border-slate-300 rounded-lg shadow-sm py-1.5 px-3 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
            placeholder="email1@company.com, email2@company.com"
            disabled={!editData.useCustomApprovers}
          />
        ) : (
          <div className="text-sm text-slate-600 truncate max-w-xs" title={category.supervisorEmails}>
            {category.useCustomApprovers && category.supervisorEmails ? (
              <div><span className="text-xs text-slate-400">📧 </span>{category.supervisorEmails.split(',').length} recipient(s)</div>
            ) : (
              <span className="text-slate-400 text-xs">Uses global settings</span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editData.plannerEmails}
            onChange={(e) => setEditData(prev => ({ ...prev, plannerEmails: e.target.value }))}
            className="w-full text-sm border border-slate-300 rounded-lg shadow-sm py-1.5 px-3 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
            placeholder="email1@company.com, email2@company.com"
            disabled={!editData.useCustomApprovers}
          />
        ) : (
          <div className="text-sm text-slate-600 truncate max-w-xs" title={category.plannerEmails}>
            {category.useCustomApprovers && category.plannerEmails ? (
              <div><span className="text-xs text-slate-400">📋 </span>{category.plannerEmails.split(',').length} recipient(s)</div>
            ) : (
              <span className="text-slate-400 text-xs">Uses global settings</span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editData.hrEmails}
            onChange={(e) => setEditData(prev => ({ ...prev, hrEmails: e.target.value }))}
            className="w-full text-sm border border-slate-300 rounded-lg shadow-sm py-1.5 px-3 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
            placeholder="email1@company.com, email2@company.com"
            disabled={!editData.useCustomApprovers}
          />
        ) : (
          <div className="text-sm text-slate-600 truncate max-w-xs" title={category.hrEmails}>
            {category.useCustomApprovers && category.hrEmails ? (
              <div><span className="text-xs text-slate-400">👥 </span>{category.hrEmails.split(',').length} recipient(s)</div>
            ) : (
              <span className="text-slate-400 text-xs">Uses global settings</span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        {category.useCustomApprovers ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Custom Routing
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Inherited</span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
        {isEditing ? (
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Configure</Button>
        )}
      </td>
    </tr>
  );
};

// ===================================================================
//  MAIN SETTINGS PAGE
// ===================================================================
const SettingsPage = () => {
  const { refreshSettings } = useSettings();
  // ---------- State ----------
  const [settings, setSettings] = useState({
    weekendDays: [0, 6],
    doubleTimeOnSunday: false,
    timeAndHalfAfter8Hours: false,
    weekendRate: 1.0,
    holidayRate: 1.0,
    holidays: [],
    jobPositions: [],
    categories: [],
    specialWeekends: [],
    defaultOvertimeMultiplier: 1.5,
    sundayOvertimeMultiplier: 2.0,
    holidayOvertimeMultiplier: 2.5,
    enableTimeAndHalfAfter8Hours: true,
    timeAndHalfMultiplier: 1.5,
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    employeeCategories: '',
    pensionRate: 0,
    socialSecurityRate: 0,
    taxRate: 0,
    lateArrivalTime: '09:00',
    withholdingTaxEnabled: false,
    withholdingTaxRate: 15.0,
    hourlyRate: 10,
    overtimeHourlyRate: 15,
    standardWorkHours: 8
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [emailSubTab, setEmailSubTab] = useState('leaves');

  // Departments
  const [departments, setDepartments] = useState([]);
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '', manager: '' });
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);

  // Holidays
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', recurring: false, payMultiplier: 1.0 });
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Job Positions
  const [jobPositionForm, setJobPositionForm] = useState({
    name: '',
    category: null,
    department: null,
    description: '',
    baseRate: 0,
    standardWorkHours: 8,
    grades: []
  });
  const [editingPosition, setEditingPosition] = useState(null);
  const [showPositionModal, setShowPositionModal] = useState(false);

  const [inventoryEmailSettings, setInventoryEmailSettings] = useState({
    // Normal inventory request notifications
    inventoryRequestRecipients: '',
    inventoryPlannerRecipients: '',
    inventoryProcurementRecipients: '',
    inventoryStoreRecipients: '',
    inventoryStatusRecipients: '',
    inventoryRequesterNotificationEnabled: true,
    inventoryPlannerNotificationEnabled: true,
    inventoryProcurementNotificationEnabled: true,
    inventoryStoreNotificationEnabled: true,
    inventoryStatusNotificationEnabled: true,

    // PPE request notifications
    ppeRequestRecipients: '',
    ppeProcurementRecipients: '',
    ppeStoreRecipients: '',
    ppeStatusRecipients: '',
    ppeRequesterNotificationEnabled: true,
    ppeProcurementNotificationEnabled: true,
    ppeStoreNotificationEnabled: true,
    ppeStatusNotificationEnabled: true,
  });

  const [savingInventoryEmails, setSavingInventoryEmails] = useState(false);

  // Categories
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    standardRateHours: 8,
    workStartTime: '09:00',
    useNonTaxableAllowances: false,
    excludeWeekendsFromLeave: true,
    annualLeaveDays: 20,
    skipAutoAbsent: false,
    applyWithholdingTax: false,
    supervisorEmails: '',
    plannerEmails: '',
    hrEmails: '',
    useCustomApprovers: false
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Special Weekends
  const [specialWeekendForm, setSpecialWeekendForm] = useState({ name: '', date: '', rateMultiplier: 1.5 });
  const [editingSpecialWeekend, setEditingSpecialWeekend] = useState(null);
  const [showSpecialWeekendModal, setShowSpecialWeekendModal] = useState(false);

  // Loan Notification Settings
  const [loanNotificationSettings, setLoanNotificationSettings] = useState({
    loanRequestRecipients: '',
    loanApprovalRecipients: '',
    loanRejectionRecipients: '',
    loanConsolidationRecipients: ''
  });
  const [savingLoanNotifications, setSavingLoanNotifications] = useState(false);

  // Direct Purchase Notification Settings - NEW
  const [directPurchaseNotificationSettings, setDirectPurchaseNotificationSettings] = useState({
    accountantRecipients: '',
    reviewerRecipients: '',
    financeRecipients: '',
    requesterNotificationEnabled: true,
    accountantNotificationEnabled: true,
    reviewerNotificationEnabled: true,
    financeNotificationEnabled: true
  });
  const [savingDirectPurchaseNotifications, setSavingDirectPurchaseNotifications] = useState(false);

  // Leave Settings
  const [leaveSettings, setLeaveSettings] = useState({
    maternityLeaveMonths: 3,
    paternityLeaveMonths: 1,
    nonDeductibleLeaveTypes: ['Maternity', 'Paternity', 'Sick', 'Study'],
    annualLeaveBalance: 20,
    excludeWeekendsForLeaveTypes: ['Annual', 'Casual', 'Study', 'Compassionate', 'Unpaid', 'Sabbatical']
  });

  // Loan Settings
  const [loanSettings, setLoanSettings] = useState({ maximumLoanLimit: 0 });
  const [editingLoanSettings, setEditingLoanSettings] = useState(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState({ maximumLoanLimit: 0 });

  // Workflows
  const [workflows, setWorkflows] = useState([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowFormData, setWorkflowFormData] = useState({
    name: '',
    description: '',
    active: true,
    entityType: 'INVENTORY',
    conditionJson: '',
    steps: []
  });
  const [conditions, setConditions] = useState([]);
  
  // ========== FIX: State for available roles ==========
  const [availableRoles, setAvailableRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Attendance Schedule
  const [attendanceSchedule, setAttendanceSchedule] = useState({
    enabled: true,
    runTime: "00:30",
    skipCategories: []
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // ---------- Assignment / View state ----------
  const [selectedPositionForAssignment, setSelectedPositionForAssignment] = useState(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  // ---------- Employees for positions (cached) ----------
  const [employeesForPositions, setEmployeesForPositions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewPosition, setViewPosition] = useState(null);
  const [viewEmployees, setViewEmployees] = useState([]);

  // ---------- filter & pagination for positions ----------
  const [positionFilterDepartment, setPositionFilterDepartment] = useState(null);
  const [positionPage, setPositionPage] = useState(1);
  const POSITIONS_PER_PAGE = 10;

  const [departmentSearch, setDepartmentSearch] = useState('');

  const loadInventoryNotificationSettings = async () => {
  try {
    const token = localStorage.getItem('jwtToken');

    const response = await fetch(
      `${API_BASE_URL}/api/settings/inventory-notifications`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to load inventory notification settings');
    }

    const data = await response.json();

    setInventoryEmailSettings(prev => ({
      ...prev,
      ...data,
    }));
  } catch (error) {
    console.error(error);
    showMessage('error', error.message || 'Failed to load inventory notification settings');
  }
};

const saveInventoryNotificationSettings = async () => {
  try {
    setSavingInventoryEmails(true);

    const safetyOfficerRecipients = parseEmailRecipients(
      inventoryEmailSettings.ppeRequestRecipients
    );

    if (safetyOfficerRecipients.length === 0) {
      throw new Error('Add at least one Safety Officer email for PPE notifications');
    }

    const invalidSafetyEmail = safetyOfficerRecipients.find(
      email => !isValidEmail(email)
    );

    if (invalidSafetyEmail) {
      throw new Error(`Invalid Safety Officer email: ${invalidSafetyEmail}`);
    }

    // Keep the Safety Officer informed at every PPE stage using the backend's
    // existing stage-specific recipient fields.
    const settingsToSave = {
      ...inventoryEmailSettings,
      ppeRequestRecipients: mergeEmailRecipients(
        inventoryEmailSettings.ppeRequestRecipients
      ),
      ppeProcurementRecipients: mergeEmailRecipients(
        inventoryEmailSettings.ppeProcurementRecipients,
        safetyOfficerRecipients
      ),
      ppeStoreRecipients: mergeEmailRecipients(
        inventoryEmailSettings.ppeStoreRecipients,
        safetyOfficerRecipients
      ),
      ppeStatusRecipients: mergeEmailRecipients(
        inventoryEmailSettings.ppeStatusRecipients,
        safetyOfficerRecipients
      ),
    };

    const token = localStorage.getItem('jwtToken');

    const response = await fetch(
      `${API_BASE_URL}/api/settings/inventory-notifications`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        result.message ||
        'Failed to save inventory notification settings'
      );
    }

    setInventoryEmailSettings(settingsToSave);
    showMessage('success', 'Settings saved. Safety Officers will receive every PPE update.');
  } catch (error) {
    console.error(error);
    showMessage('error', error.message || 'Failed to save inventory notification settings');
  } finally {
    setSavingInventoryEmails(false);
  }
};

  // ---------- Refs ----------
  const importInputRefs = {
    general: useRef(null),
    leave: useRef(null),
    categories: useRef(null),
    specialWeekends: useRef(null),
    holidays: useRef(null),
    positions: useRef(null),
  };

  // ================================================================
  //  useEffect HOOKS
  // ================================================================
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setUser({ name: data.username, role: data.role.replace("ROLE_", "").toLowerCase(), email: data.email });
        }
      } catch (err) { console.error(err); }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    loadInventoryNotificationSettings();
    loadAllSettings();
    loadAttendanceScheduleSettings();
  }, []);

  useEffect(() => {
    if (workflowFormData.conditionJson && workflowFormData.conditionJson.trim()) {
      try { setConditions(JSON.parse(workflowFormData.conditionJson)); } catch { setConditions([]); }
    } else { setConditions([]); }
  }, [workflowFormData.conditionJson]);

  useEffect(() => {
    if (activeTab === 'workflows') { loadWorkflows(); fetchRoles(); }
    if (activeTab === 'email') { 
      loadLoanNotificationSettings(); 
      loadDirectPurchaseNotificationSettings();
    }
    if (activeTab === 'positions') {
      fetchEmployeesForPositions();
    }
  }, [activeTab]);

  useEffect(() => {
    setPositionPage(1);
  }, [positionFilterDepartment]);

  // ================================================================
  //  UTILITY FUNCTIONS
  // ================================================================
  const getToken = () => localStorage.getItem('jwtToken');

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
    if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
    if (hostname === "100.114.178.13") return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };
  const API_BASE_URL = getApiBaseUrl();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = async () => {
    try {
      const token = getToken();
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userRole');
      window.location.href = '/';
    } catch (err) { console.error(err); }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const clearMessage = () => setMessage({ type: '', text: '' });

  // ---------- loadAllSettings ----------
  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) { setLoading(false); return; }

      const [systemRes, holidaysRes, positionsRes, categoriesRes, specialWeekendsRes, leaveSettingsRes, loanSettingsRes, deptRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/settings/system`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/settings/holidays`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/settings/job-positions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/settings/categories`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/settings/special-weekends`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/settings/leave`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/settings/loanSettings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/settings/departments`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const systemSettings = systemRes.ok ? await systemRes.json() : {};
      const holidays = holidaysRes.ok ? await holidaysRes.json() : [];
      const jobPositions = positionsRes.ok ? await positionsRes.json() : [];
      const categories = categoriesRes.ok ? await categoriesRes.json() : [];
      const specialWeekends = specialWeekendsRes.ok ? await specialWeekendsRes.json() : [];
      const leaveSettingsData = leaveSettingsRes.ok ? await leaveSettingsRes.json() : {
        maternityLeaveMonths: 3,
        paternityLeaveMonths: 1,
        nonDeductibleLeaveTypes: ['Maternity', 'Paternity', 'Sick', 'Study'],
        annualLeaveBalance: 20
      };
      let loanSettingsData = { maximumLoanLimit: 0 };
      if (loanSettingsRes.ok) {
        const arr = await loanSettingsRes.json();
        if (arr.length > 0) loanSettingsData = arr[0];
      }
      const departmentsData = deptRes.ok ? await deptRes.json() : [];
      setDepartments(departmentsData);

      setSettings(prev => ({
        ...prev,
        weekendDays: systemSettings.weekendDaysArray || [0, 6],
        doubleTimeOnSunday: systemSettings.doubleTimeOnSunday || false,
        timeAndHalfAfter8Hours: systemSettings.timeAndHalfAfter8Hours || false,
        weekendRate: systemSettings.weekendRate || 1.0,
        holidayRate: systemSettings.holidayRate || 1.0,
        hourlyRate: systemSettings.hourlyRate || 10,
        overtimeHourlyRate: systemSettings.overtimeHourlyRate || 15,
        standardWorkHours: systemSettings.standardWorkHours || 8,
        defaultOvertimeMultiplier: systemSettings.defaultOvertimeMultiplier || 1.5,
        sundayOvertimeMultiplier: systemSettings.sundayOvertimeMultiplier || 2.0,
        holidayOvertimeMultiplier: systemSettings.holidayOvertimeMultiplier || 2.5,
        enableTimeAndHalfAfter8Hours: systemSettings.enableTimeAndHalfAfter8Hours ?? true,
        timeAndHalfMultiplier: systemSettings.timeAndHalfMultiplier || 1.5,
        lateArrivalTime: systemSettings.lateArrivalTime || '09:00',
        companyName: systemSettings.companyName || '',
        companyEmail: systemSettings.companyEmail || '',
        companyPhone: systemSettings.companyPhone || '',
        companyAddress: systemSettings.companyAddress || '',
        employeeCategories: systemSettings.employeeCategories ? JSON.parse(systemSettings.employeeCategories) : [],
        withholdingTaxEnabled: systemSettings.withholdingTaxEnabled || false,
        withholdingTaxRate: systemSettings.withholdingTaxRate || 15.0,
        pensionRate: systemSettings.pensionRate || 0,
        socialSecurityRate: systemSettings.socialSecurityRate || 0,
        taxRate: systemSettings.taxRate || 0,
        holidays,
        jobPositions,
        categories,
        specialWeekends
      }));

      setLeaveSettings(leaveSettingsData);
      setLoanSettings(loanSettingsData);
    } catch (error) {
      console.error(error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // ---------- loadAttendanceScheduleSettings ----------
  const loadAttendanceScheduleSettings = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/attendance-schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceSchedule({
          enabled: data.enabled ?? true,
          runTime: data.runTime || "00:30",
          skipCategories: data.skipCategories || []
        });
      }
    } catch (error) { console.error(error); }
  };

  // ---------- loadLoanNotificationSettings ----------
  const loadLoanNotificationSettings = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/loan-notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoanNotificationSettings({
          loanRequestRecipients: data.loanRequestRecipients || '',
          loanApprovalRecipients: data.loanApprovalRecipients || '',
          loanRejectionRecipients: data.loanRejectionRecipients || '',
          loanConsolidationRecipients: data.loanConsolidationRecipients || ''
        });
      }
    } catch (error) { console.error(error); }
  };

  // ---------- loadDirectPurchaseNotificationSettings ----------
  const loadDirectPurchaseNotificationSettings = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/direct-purchase-notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDirectPurchaseNotificationSettings({
          accountantRecipients: data.accountantRecipients || '',
          reviewerRecipients: data.reviewerRecipients || '',
          financeRecipients: data.financeRecipients || '',
          requesterNotificationEnabled: data.requesterNotificationEnabled !== false,
          accountantNotificationEnabled: data.accountantNotificationEnabled !== false,
          reviewerNotificationEnabled: data.reviewerNotificationEnabled !== false,
          financeNotificationEnabled: data.financeNotificationEnabled !== false
        });
      }
    } catch (error) { console.error(error); }
  };

  // ---------- saveDirectPurchaseNotificationSettings ----------
  const saveDirectPurchaseNotificationSettings = async () => {
    setSavingDirectPurchaseNotifications(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/direct-purchase-notifications`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(directPurchaseNotificationSettings)
      });
      if (res.ok) {
        showMessage('success', 'Direct Purchase notifications saved');
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      showMessage('error', 'Failed to save Direct Purchase notifications');
    } finally {
      setSavingDirectPurchaseNotifications(false);
    }
  };

  // ---------- saveLoanNotificationSettings ----------
  const saveLoanNotificationSettings = async () => {
    setSavingLoanNotifications(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/loan-notifications`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(loanNotificationSettings)
      });
      if (res.ok) showMessage('success', 'Loan notifications saved');
      else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to save loan notifications');
    } finally {
      setSavingLoanNotifications(false);
    }
  };

  // ---------- saveAttendanceScheduleSettings ----------
  const saveAttendanceScheduleSettings = async () => {
    setScheduleSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/attendance-schedule`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceSchedule)
      });
      if (res.ok) showMessage('success', 'Attendance schedule saved');
      else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to save schedule');
    } finally {
      setScheduleSaving(false);
    }
  };

  // ---------- loadWorkflows ----------
  const loadWorkflows = async () => {
    setWorkflowLoading(true);
    try {
      const token = getToken();
      if (!token) { showMessage('error', 'No token'); setWorkflowLoading(false); return; }
      const res = await fetch(`${API_BASE_URL}/api/settings/workflows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) { showMessage('error', 'Session expired'); setWorkflowLoading(false); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setWorkflows(data);
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to load workflows');
    } finally {
      setWorkflowLoading(false);
    }
  };

  // ========== FIX: fetchRoles with proper error handling ==========
  const fetchRoles = async () => {
    const token = getToken();
    if (!token) {
      setRolesLoading(false);
      return;
    }
    setRolesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setAvailableRoles(data);
      } else {
        console.warn('Roles API returned non-array data:', data);
        setAvailableRoles([]);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      showMessage('error', 'Could not load roles from server');
      setAvailableRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  // ---------- fetchEmployeesForPositions (for counts & view) ----------
  const fetchEmployeesForPositions = async () => {
    setLoadingEmployees(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployeesForPositions(data);
    } catch (err) {
      showMessage('error', 'Could not load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  // ---------- Workflow handlers ----------
  const resetWorkflowForm = () => {
    setWorkflowFormData({
      name: '',
      description: '',
      active: true,
      entityType: 'INVENTORY',
      conditionJson: '',
      steps: []
    });
    setConditions([]);
  };

  const addWorkflowStep = () => {
    setWorkflowFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepOrder: prev.steps.length,
          stepName: '',
          requiredRole: '',
          targetStatus: '',
          rejectStatus: '',
          requiresApproval: true,
          finalStep: false
        }
      ]
    }));
  };

  const updateWorkflowStep = (idx, field, value) => {
    const newSteps = [...workflowFormData.steps];
    newSteps[idx] = { ...newSteps[idx], [field]: value };
    setWorkflowFormData({ ...workflowFormData, steps: newSteps });
  };

  const removeWorkflowStep = (idx) => {
    setWorkflowFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx)
    }));
  };

  const moveWorkflowStep = (idx, direction) => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === workflowFormData.steps.length - 1)) return;
    const newSteps = [...workflowFormData.steps];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
    setWorkflowFormData({ ...workflowFormData, steps: newSteps });
  };

  const addWorkflowCondition = () => {
    setConditions(prev => [...prev, { field: 'ppeRequest', operator: 'eq', value: false }]);
  };

  const updateWorkflowCondition = (idx, field, value) => {
    const newConds = [...conditions];
    newConds[idx][field] = value;
    setConditions(newConds);
    setWorkflowFormData(prev => ({ ...prev, conditionJson: JSON.stringify(newConds) }));
  };

  const removeWorkflowCondition = (idx) => {
    const newConds = conditions.filter((_, i) => i !== idx);
    setConditions(newConds);
    setWorkflowFormData(prev => ({ ...prev, conditionJson: newConds.length ? JSON.stringify(newConds) : '' }));
  };

  const handleSaveWorkflow = async () => {
    const token = getToken();
    if (!token) { showMessage('error', 'No token'); return; }

    const method = editingWorkflow ? 'PUT' : 'POST';
    const url = editingWorkflow
      ? `${API_BASE_URL}/api/settings/workflows/${editingWorkflow.id}`
      : `${API_BASE_URL}/api/settings/workflows`;

    const payload = {
      ...workflowFormData,
      steps: workflowFormData.steps.map((step, idx) => ({
        ...step,
        stepOrder: idx,
        finalStep: step.finalStep || false,
        requiresApproval: step.requiresApproval !== false,
        rejectStatus: step.rejectStatus || null
      }))
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Save failed');
      }
      showMessage('success', `Workflow ${editingWorkflow ? 'updated' : 'created'}`);
      await loadWorkflows();
      setShowWorkflowModal(false);
      setEditingWorkflow(null);
      resetWorkflowForm();
    } catch (err) {
      showMessage('error', 'Error: ' + err.message);
    }
  };

  const handleDeleteWorkflow = async (id) => {
    if (!await window.appConfirm('Delete this workflow?')) return;
    const token = getToken();
    if (!token) { showMessage('error', 'No token'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/workflows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      showMessage('success', 'Workflow deleted');
      await loadWorkflows();
    } catch (err) {
      showMessage('error', 'Error: ' + err.message);
    }
  };

  // ----- System settings handlers -----
  const handleSystemSettingsChange = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));
  const handleWeekendDayToggle = (day) => {
    const current = settings.weekendDays || [];
    const newDays = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    handleSystemSettingsChange('weekendDays', newDays);
  };

  const handleSaveSystemSettings = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const payload = {
        hourlyRate: parseFloat(settings.hourlyRate) || 10,
        overtimeHourlyRate: parseFloat(settings.overtimeHourlyRate) || 15,
        standardWorkHours: parseInt(settings.standardWorkHours) || 8,
        weekendDays: settings.weekendDays || [0, 6],
        doubleTimeOnSunday: settings.doubleTimeOnSunday,
        timeAndHalfAfter8Hours: settings.timeAndHalfAfter8Hours,
        weekendRate: parseFloat(settings.weekendRate) || 1.0,
        holidayRate: parseFloat(settings.holidayRate) || 1.0,
        defaultOvertimeMultiplier: parseFloat(settings.defaultOvertimeMultiplier) || 1.5,
        sundayOvertimeMultiplier: parseFloat(settings.sundayOvertimeMultiplier) || 2.0,
        holidayOvertimeMultiplier: parseFloat(settings.holidayOvertimeMultiplier) || 2.5,
        enableTimeAndHalfAfter8Hours: settings.enableTimeAndHalfAfter8Hours,
        timeAndHalfMultiplier: parseFloat(settings.timeAndHalfMultiplier) || 1.5,
        lateArrivalTime: settings.lateArrivalTime || '09:00',
        companyName: settings.companyName || '',
        companyEmail: settings.companyEmail || '',
        companyPhone: settings.companyPhone || '',
        companyAddress: settings.companyAddress || '',
        employeeCategories: Array.isArray(settings.employeeCategories) ? settings.employeeCategories : [settings.employeeCategories || 'General'],
        pensionRate: parseFloat(settings.pensionRate) || 0,
        socialSecurityRate: parseFloat(settings.socialSecurityRate) || 0,
        taxRate: parseFloat(settings.taxRate) || 0,
        withholdingTaxEnabled: settings.withholdingTaxEnabled || false,
        withholdingTaxRate: parseFloat(settings.withholdingTaxRate) || 15.0
      };
      const res = await fetch(`${API_BASE_URL}/api/settings/system`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showMessage('success', 'System settings updated');
        await loadAllSettings();
        await refreshSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to update system settings');
    }
  };

  // ----- Department handlers -----
  const handleDepartmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingDepartment
        ? `${API_BASE_URL}/api/settings/departments/${editingDepartment.id}`
        : `${API_BASE_URL}/api/settings/departments`;
      const method = editingDepartment ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(departmentForm)
      });
      if (res.ok) {
        showMessage('success', editingDepartment ? 'Department updated' : 'Department added');
        setDepartmentForm({ name: '', description: '', manager: '' });
        setEditingDepartment(null);
        setShowDepartmentModal(false);
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to save department');
    }
  };

  const handleEditDepartment = (dept) => {
    setDepartmentForm({ name: dept.name, description: dept.description, manager: dept.manager || '' });
    setEditingDepartment(dept);
    setShowDepartmentModal(true);
  };

  const handleDeleteDepartment = async (id) => {
    if (!await window.appConfirm('Delete this department?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Department deleted');
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to delete department');
    }
  };

  const handleCancelDepartment = () => {
    setShowDepartmentModal(false);
    setEditingDepartment(null);
    setDepartmentForm({ name: '', description: '', manager: '' });
  };

  // ----- Position handlers -----
  const handlePositionSubmit = async (e) => {
    e.preventDefault();
    if (!jobPositionForm.department || !jobPositionForm.department.id) {
      showMessage('error', 'Please select a valid department.');
      return;
    }
    try {
      const token = getToken();
      const url = editingPosition
        ? `${API_BASE_URL}/api/settings/job-positions/${editingPosition.id}`
        : `${API_BASE_URL}/api/settings/job-positions`;
      const method = editingPosition ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobPositionForm,
          grades: jobPositionForm.grades.map(g => ({
            level: parseInt(g.level) || 0,
            label: g.label || '',
            rate: parseFloat(g.rate) || 0
          }))
        })
      });
      if (res.ok) {
        showMessage('success', editingPosition ? 'Position updated' : 'Position added');
        setJobPositionForm({ name: '', category: null, department: null, description: '', baseRate: 0, standardWorkHours: 8, grades: [] });
        setEditingPosition(null);
        setShowPositionModal(false);
        await loadAllSettings();
      } else {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to save position');
      }
    } catch (error) {
      console.error('Error saving position:', error);
      showMessage('error', 'Failed to save position: ' + error.message);
    }
  };

  const handleEditPosition = (pos) => {
    const grades = (pos.grades || []).map(g => ({
      level: g.level || '',
      label: g.label || '',
      rate: g.rate || 0
    }));
    setJobPositionForm({
      name: pos.name,
      category: pos.category,
      department: pos.department,
      description: pos.description || '',
      baseRate: pos.baseRate || 0,
      standardWorkHours: pos.standardWorkHours || 8,
      grades: grades
    });
    setEditingPosition(pos);
    setShowPositionModal(true);
  };

  const handleDeletePosition = async (id) => {
    if (!await window.appConfirm('Delete this position?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/job-positions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Position deleted');
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to delete position');
    }
  };

  const handleCancelPosition = () => {
    setShowPositionModal(false);
    setEditingPosition(null);
    setJobPositionForm({ name: '', category: null, department: null, description: '', baseRate: 0, standardWorkHours: 8, grades: [] });
  };

  // ----- Category handlers -----
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingCategory
        ? `${API_BASE_URL}/api/settings/categories/${editingCategory.id}`
        : `${API_BASE_URL}/api/settings/categories`;
      const method = editingCategory ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });
      if (res.ok) {
        showMessage('success', editingCategory ? 'Category updated' : 'Category added');
        setCategoryForm({
          name: '',
          standardRateHours: 8,
          workStartTime: '09:00',
          useNonTaxableAllowances: false,
          excludeWeekendsFromLeave: true,
          annualLeaveDays: 20,
          skipAutoAbsent: false,
          applyWithholdingTax: false,
          supervisorEmails: '',
          plannerEmails: '',
          hrEmails: '',
          useCustomApprovers: false
        });
        setEditingCategory(null);
        setShowCategoryModal(false);
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to save category');
    }
  };

  const handleEditCategory = (cat) => {
    setCategoryForm({
      name: cat.name,
      standardRateHours: cat.standardRateHours,
      workStartTime: cat.workStartTime || '09:00',
      useNonTaxableAllowances: cat.useNonTaxableAllowances || false,
      excludeWeekendsFromLeave: cat.excludeWeekendsFromLeave !== false,
      annualLeaveDays: cat.annualLeaveDays || 20,
      skipAutoAbsent: cat.skipAutoAbsent || false,
      applyWithholdingTax: cat.applyWithholdingTax || false,
      supervisorEmails: cat.supervisorEmails || '',
      plannerEmails: cat.plannerEmails || '',
      hrEmails: cat.hrEmails || '',
      useCustomApprovers: cat.useCustomApprovers || false
    });
    setEditingCategory(cat);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (id) => {
    if (!await window.appConfirm('Delete this category?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Category deleted');
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to delete category');
    }
  };

  const handleCancelCategory = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      standardRateHours: 8,
      workStartTime: '09:00',
      useNonTaxableAllowances: false,
      excludeWeekendsFromLeave: true,
      annualLeaveDays: 20,
      skipAutoAbsent: false,
      applyWithholdingTax: false,
      supervisorEmails: '',
      plannerEmails: '',
      hrEmails: '',
      useCustomApprovers: false
    });
  };

  // ----- Holiday handlers -----
  const handleHolidaySubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingHoliday
        ? `${API_BASE_URL}/api/settings/holidays/${editingHoliday.id}`
        : `${API_BASE_URL}/api/settings/holidays`;
      const method = editingHoliday ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayForm)
      });
      if (res.ok) {
        showMessage('success', editingHoliday ? 'Holiday updated' : 'Holiday added');
        setHolidayForm({ name: '', date: '', recurring: false, payMultiplier: 1.0 });
        setEditingHoliday(null);
        setShowHolidayModal(false);
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to save holiday');
    }
  };

  const handleEditHoliday = (hol) => {
    setHolidayForm({ name: hol.name, date: hol.date, recurring: hol.recurring, payMultiplier: hol.payMultiplier });
    setEditingHoliday(hol);
    setShowHolidayModal(true);
  };

  const handleDeleteHoliday = async (id) => {
    if (!await window.appConfirm('Delete this holiday?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/holidays/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Holiday deleted');
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to delete holiday');
    }
  };

  const handleCancelHoliday = () => {
    setShowHolidayModal(false);
    setEditingHoliday(null);
    setHolidayForm({ name: '', date: '', recurring: false, payMultiplier: 1.0 });
  };

  // ----- Special Weekend handlers -----
  const handleSpecialWeekendSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const url = editingSpecialWeekend
        ? `${API_BASE_URL}/api/settings/special-weekends/${editingSpecialWeekend.id}`
        : `${API_BASE_URL}/api/settings/special-weekends`;
      const method = editingSpecialWeekend ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(specialWeekendForm)
      });
      if (res.ok) {
        showMessage('success', editingSpecialWeekend ? 'Special weekend updated' : 'Special weekend added');
        setSpecialWeekendForm({ name: '', date: '', rateMultiplier: 1.5 });
        setEditingSpecialWeekend(null);
        setShowSpecialWeekendModal(false);
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to save special weekend');
    }
  };

  const handleEditSpecialWeekend = (sw) => {
    setSpecialWeekendForm({ name: sw.name, date: sw.date, rateMultiplier: sw.rateMultiplier });
    setEditingSpecialWeekend(sw);
    setShowSpecialWeekendModal(true);
  };

  const handleDeleteSpecialWeekend = async (id) => {
    if (!await window.appConfirm('Delete this special weekend?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/special-weekends/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage('success', 'Special weekend deleted');
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to delete special weekend');
    }
  };

  const handleCancelSpecialWeekend = () => {
    setShowSpecialWeekendModal(false);
    setEditingSpecialWeekend(null);
    setSpecialWeekendForm({ name: '', date: '', rateMultiplier: 1.5 });
  };

  // ----- Loan settings handlers -----
  const handleLoanSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const method = editingLoanSettings ? 'PUT' : 'POST';
      const url = editingLoanSettings
        ? `${API_BASE_URL}/api/settings/loanSettings/${editingLoanSettings.id}`
        : `${API_BASE_URL}/api/settings/loanSettings`;
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(loanForm)
      });
      if (res.ok) {
        showMessage('success', editingLoanSettings ? 'Loan settings updated' : 'Loan settings added');
        setLoanForm({ maximumLoanLimit: 0 });
        setEditingLoanSettings(null);
        setShowLoanModal(false);
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to save loan settings');
    }
  };

  const handleEditLoanSettings = (ls) => {
    setLoanForm({ maximumLoanLimit: ls.maximumLoanLimit });
    setEditingLoanSettings(ls);
    setShowLoanModal(true);
  };

  const handleCancelLoan = () => {
    setShowLoanModal(false);
    setEditingLoanSettings(null);
    setLoanForm({ maximumLoanLimit: 0 });
  };

  // ----- Leave settings -----
  const handleSaveLeaveSettings = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/leave`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveSettings)
      });
      if (res.ok) {
        showMessage('success', 'Leave settings updated');
        await loadAllSettings();
      } else throw new Error('Failed');
    } catch (error) {
      showMessage('error', 'Failed to update leave settings');
    }
  };

  // ----- Import/Export -----
  const downloadJson = (filename, data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const safeJsonParse = async (file) => {
    const text = await file.text();
    try { return JSON.parse(text); } catch { throw new Error('Invalid JSON file.'); }
  };

  const getExportPayloadForTab = (tabId) => {
    switch (tabId) {
      case 'general':
        return {
          system: {
            hourlyRate: settings.hourlyRate,
            overtimeHourlyRate: settings.overtimeHourlyRate,
            standardWorkHours: settings.standardWorkHours,
            weekendDays: settings.weekendDays,
            doubleTimeOnSunday: settings.doubleTimeOnSunday,
            timeAndHalfAfter8Hours: settings.timeAndHalfAfter8Hours,
            weekendRate: settings.weekendRate,
            holidayRate: settings.holidayRate,
            defaultOvertimeMultiplier: settings.defaultOvertimeMultiplier,
            sundayOvertimeMultiplier: settings.sundayOvertimeMultiplier,
            holidayOvertimeMultiplier: settings.holidayOvertimeMultiplier,
            enableTimeAndHalfAfter8Hours: settings.enableTimeAndHalfAfter8Hours,
            timeAndHalfMultiplier: settings.timeAndHalfMultiplier,
            lateArrivalTime: settings.lateArrivalTime,
            companyName: settings.companyName,
            companyEmail: settings.companyEmail,
            companyPhone: settings.companyPhone,
            companyAddress: settings.companyAddress,
            employeeCategories: settings.employeeCategories,
            pensionRate: settings.pensionRate,
            socialSecurityRate: settings.socialSecurityRate,
            taxRate: settings.taxRate,
          }
        };
      case 'leave': return { leave: leaveSettings };
      case 'categories': return { categories: settings.categories };
      case 'specialWeekends': return { specialWeekends: settings.specialWeekends };
      case 'holidays': return { holidays: settings.holidays };
      case 'positions': return { departments, jobPositions: settings.jobPositions };
      default: return {};
    }
  };

  const handleExportTab = (tabId) => {
    const payload = getExportPayloadForTab(tabId);
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`settings-${tabId}-${date}.json`, payload);
  };

  const handleImportClick = (tabId) => {
    const ref = importInputRefs[tabId];
    if (ref?.current) ref.current.click();
  };

  const upsertListItems = async (endpointBase, items, token) => {
    if (!Array.isArray(items)) throw new Error('Payload must be an array.');
    for (const item of items) {
      const hasId = item && item.id != null;
      const url = hasId ? `${API_BASE_URL}${endpointBase}/${item.id}` : `${API_BASE_URL}${endpointBase}`;
      const method = hasId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to import item: ${t}`);
      }
    }
  };

  const handleImportFile = async (tabId, file) => {
    const token = getToken();
    if (!token) { showMessage('error', 'No token'); return; }
    try {
      const json = await safeJsonParse(file);
      if (tabId === 'general') {
        const system = json?.system;
        if (!system) throw new Error('Expected { "system": { ... } }');
        const res = await fetch(`${API_BASE_URL}/api/settings/system`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(system)
        });
        if (!res.ok) throw new Error('Failed to import system settings');
      } else if (tabId === 'leave') {
        const leave = json?.leave;
        if (!leave) throw new Error('Expected { "leave": { ... } }');
        const res = await fetch(`${API_BASE_URL}/api/settings/leave`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(leave)
        });
        if (!res.ok) throw new Error('Failed to import leave settings');
      } else if (tabId === 'categories') {
        await upsertListItems('/api/settings/categories', json?.categories, token);
      } else if (tabId === 'specialWeekends') {
        await upsertListItems('/api/settings/special-weekends', json?.specialWeekends, token);
      } else if (tabId === 'holidays') {
        await upsertListItems('/api/settings/holidays', json?.holidays, token);
      } else if (tabId === 'positions') {
        if (json?.departments) await upsertListItems('/api/settings/departments', json.departments, token);
        if (json?.jobPositions) await upsertListItems('/api/settings/job-positions', json.jobPositions, token);
      }
      showMessage('success', `Imported ${tabId} data`);
      await loadAllSettings();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // ================================================================
  //  Assignment Modal handlers
  // ================================================================
  const fetchEmployeesForAssignment = async () => {
    setEmployeesLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load employees');
      const data = await res.json();
      setAllEmployees(data);
    } catch (err) {
      showMessage('error', 'Could not fetch employees');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const openAssignmentModal = (position) => {
    setSelectedPositionForAssignment(position);
    setAssignmentModalOpen(true);
    fetchEmployeesForAssignment();
  };

  const closeAssignmentModal = () => {
    setAssignmentModalOpen(false);
    setSelectedPositionForAssignment(null);
    setAllEmployees([]);
  };

  const handleToggleAssignment = (employee, isAssigned) => {
    setAllEmployees(prev =>
      prev.map(emp =>
        emp.id === employee.id
          ? { ...emp, _assigned: isAssigned, _grade: isAssigned ? (emp._grade || employee.jobGrade || 'I') : null }
          : emp
      )
    );
  };

  const handleGradeChange = (employeeId, grade) => {
    setAllEmployees(prev =>
      prev.map(emp =>
        emp.id === employeeId
          ? { ...emp, _grade: grade }
          : emp
      )
    );
  };

  const saveAssignments = async () => {
    setAssignmentSaving(true);
    try {
      const token = getToken();
      const positionName = selectedPositionForAssignment.name;

      const updates = allEmployees
        .filter(emp => {
          const currentlyAssigned = emp.jobPosition === positionName;
          const newAssigned = emp._assigned || false;
          if (currentlyAssigned !== newAssigned) return true;
          if (newAssigned && emp._grade && emp._grade !== emp.jobGrade) return true;
          return false;
        })
        .map(emp => ({
          id: emp.id,
          jobPosition: emp._assigned ? positionName : '',
          jobGrade: emp._assigned ? (emp._grade || 'I') : ''
        }));

      if (updates.length === 0) {
        showMessage('info', 'No changes to save');
        closeAssignmentModal();
        setAssignmentSaving(false);
        return;
      }

      for (const update of updates) {
        const currentRes = await fetch(`${API_BASE_URL}/api/employee/${update.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!currentRes.ok) throw new Error(`Failed to fetch employee ${update.id}`);
        const currentData = await currentRes.json();

        const dto = {
          id: currentData.id,
          employeeId: currentData.employeeId ?? null,
          firstName: currentData.firstName ?? '',
          lastName: currentData.lastName ?? '',
          email: currentData.email ?? null,
          phone: currentData.phone ?? '',
          jobPosition: update.jobPosition || '',
          jobGrade: update.jobGrade || '',
          category: currentData.category?.name || null,
          minimumRate: currentData.minimumRate ?? 0,
          workType: currentData.workType || 'Regular',
          accountNumber: currentData.accountNumber ?? null,
          ssnitNumber: currentData.ssnitNumber ?? null,
          tinNumber: currentData.tinNumber ?? null,
          tagNumber: currentData.tagNumber ?? null,
          dateOfBirth: currentData.dateOfBirth || null,
          location: currentData.location ?? '',
          ghanaCard: currentData.ghanaCard ?? null,
          bank: currentData.bank ?? '',
          bankBranch: currentData.bankBranch ?? '',
          contactPerson: currentData.contactPerson ?? '',
          relationship: currentData.relationship ?? '',
          townOfResidence: currentData.townOfResidence ?? '',
          houseNumber: currentData.houseNumber ?? '',
          spouse: currentData.spouse ?? '',
          numberOfChildren: currentData.numberOfChildren ?? 0,
          age: currentData.age ?? 0,
          usePositionRate: currentData.usePositionRate ?? false,
          basicSalary: currentData.basicSalary ?? 0,
          startDate: currentData.startDate || null,
          endDate: currentData.endDate || null,
          emergencyContact: currentData.emergencyContact ?? '',
          department: currentData.department ?? '',
          rentAllowance: currentData.rentAllowance ?? 0,
          transportAllowance: currentData.transportAllowance ?? 0,
          clothingAllowance: currentData.clothingAllowance ?? 0,
          otherAllowance: currentData.otherAllowance ?? 0,
          nssAllowance: currentData.nssAllowance ?? 0,
          ssnitAccountName: currentData.ssnitAccountName ?? '',
          accountName: currentData.accountName ?? '',
          isSupervisor: currentData.isSupervisor ?? false,
          active: currentData.active ?? true,
          applyWithholdingTax: currentData.applyWithholdingTax ?? false,
          excludeFromSsnit: currentData.excludeFromSsnit ?? false,
          tierTwoAccountName: currentData.tierTwoAccountName ?? '',
          tierTwoAccountNumber: currentData.tierTwoAccountNumber ?? '',
          baseNumber: currentData.baseNumber ?? '',
        };

        const putRes = await fetch(`${API_BASE_URL}/api/employee/${update.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(dto)
        });
        if (!putRes.ok) {
          const errorText = await putRes.text();
          throw new Error(`Failed to update employee ${update.id}: ${errorText}`);
        }
      }

      showMessage('success', `Assignments updated for ${updates.length} employee(s)`);
      await loadAllSettings();
      await fetchEmployeesForPositions();
      closeAssignmentModal();
    } catch (err) {
      showMessage('error', 'Failed to save assignments: ' + err.message);
    } finally {
      setAssignmentSaving(false);
    }
  };

  // ===== View modal handlers =====
  const openViewModal = (position) => {
    const assigned = employeesForPositions.filter(emp => emp.jobPosition === position.name);
    setViewPosition(position);
    setViewEmployees(assigned);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewPosition(null);
    setViewEmployees([]);
  };

  // ================================================================
  //  EARLY RETURN IF LOADING
  // ================================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-500 text-sm">Loading settings…</p>
        </div>
      </div>
    );
  }

  // ================================================================
  //  COMPUTED VALUES
  // ================================================================
  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'attendance', label: 'Attendance', icon: '⏰' },
    { id: 'leave', label: 'Leave', icon: '🏖️' },
    { id: 'loan', label: 'Loan', icon: '💰' },
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'categories', label: 'Categories', icon: '📁' },
    { id: 'specialWeekends', label: 'Special Weekends', icon: '🎯' },
    { id: 'holidays', label: 'Holidays', icon: '🎉' },
    { id: 'positions', label: 'Departments & Positions', icon: '🏢' },
    { id: 'workflows', label: 'Workflows', icon: '⚙️' }
  ];

  const filteredPositions = settings.jobPositions.filter(pos => {
    if (!positionFilterDepartment) return true;
    return pos.department?.id === positionFilterDepartment;
  });

  const totalPages = Math.ceil(filteredPositions.length / POSITIONS_PER_PAGE);
  const paginatedPositions = filteredPositions.slice(
    (positionPage - 1) * POSITIONS_PER_PAGE,
    positionPage * POSITIONS_PER_PAGE
  );

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  // ================================================================
  //  RENDER
  // ================================================================
  return (
    <div className="relative min-h-screen bg-slate-50 flex">
      <div className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>
      {sidebarOpen && window.innerWidth < 768 && (
        <div className="fixed inset-0 bg-black/50 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Header toggleSidebar={toggleSidebar} user={user} onLogout={handleLogout} />

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Page header */}
          <div className="bg-gradient-to-r from-blue-50 to-white -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 border-b border-blue-100 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <nav className="text-sm text-slate-500 mb-1">
                  <span>Dashboard</span> <span className="mx-2">/</span> <span className="text-slate-700 font-medium">Settings</span>
                </nav>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-3xl">⚙️</span> System Settings
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Configure your payroll, attendance, leave, and more</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                  ↻ Refresh
                </Button>
              </div>
            </div>
          </div>

          <Toast message={message.text} type={message.type} onClose={clearMessage} />

          {Object.keys(importInputRefs).map(key => (
            <input
              key={key}
              ref={importInputRefs[key]}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) handleImportFile(key, file);
              }}
            />
          ))}

          {/* Settings Sidebar + Content */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-64 lg:w-72 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
                <div className="p-3 border-b border-slate-200 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Settings</span>
                </div>
                <nav className="p-2 space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                        }
                      `}
                    >
                      <span className="text-base">{tab.icon}</span>
                      {tab.label}
                      {activeTab === tab.id && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0">
              {/* ============================================================ */}
              {/*  GENERAL TAB */}
              {/* ============================================================ */}
              {activeTab === 'general' && (
                <Card
                  title="General Settings"
                  actions={
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleExportTab('general')}>
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                      </Button>
                      <Button size="sm" onClick={() => handleImportClick('general')}>Import</Button>
                    </>
                  }
                >
                  <form onSubmit={handleSaveSystemSettings} className="space-y-8">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Weekend Days</label>
                      <div className="flex flex-wrap gap-2">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((name, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleWeekendDayToggle(idx)}
                            className={`
                              px-4 py-2 rounded-xl text-sm font-medium transition-all
                              ${settings.weekendDays.includes(idx)
                                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }
                            `}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Select the days that are considered weekends</p>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-md font-semibold text-slate-900 mb-4">Company Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Company Name" id="companyName" required>
                          <input
                            type="text"
                            id="companyName"
                            value={settings.companyName}
                            onChange={(e) => handleSystemSettingsChange('companyName', e.target.value)}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                            placeholder="Acme Inc."
                          />
                        </FormField>
                        <FormField label="Company Email" id="companyEmail">
                          <input
                            type="email"
                            id="companyEmail"
                            value={settings.companyEmail}
                            onChange={(e) => handleSystemSettingsChange('companyEmail', e.target.value)}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                            placeholder="info@company.com"
                          />
                        </FormField>
                        <FormField label="Company Phone" id="companyPhone">
                          <input
                            type="text"
                            id="companyPhone"
                            value={settings.companyPhone}
                            onChange={(e) => handleSystemSettingsChange('companyPhone', e.target.value)}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                            placeholder="+123 456 7890"
                          />
                        </FormField>
                        <FormField label="Company Address" id="companyAddress">
                          <input
                            type="text"
                            id="companyAddress"
                            value={settings.companyAddress}
                            onChange={(e) => handleSystemSettingsChange('companyAddress', e.target.value)}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                            placeholder="123 Main St, City"
                          />
                        </FormField>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-md font-semibold text-slate-900 mb-4">Withholding Tax</h4>
                      <Toggle
                        checked={settings.withholdingTaxEnabled}
                        onChange={(val) => handleSystemSettingsChange('withholdingTaxEnabled', val)}
                        label="Enable Withholding Tax"
                        description="When enabled, eligible employees/categories will use withholding tax instead of PAYE"
                      />
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Rate (%)" id="withholdingTaxRate">
                          <input
                            type="number"
                            step="0.1"
                            id="withholdingTaxRate"
                            value={settings.withholdingTaxRate}
                            onChange={(e) => handleSystemSettingsChange('withholdingTaxRate', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors disabled:bg-slate-100"
                            disabled={!settings.withholdingTaxEnabled}
                          />
                        </FormField>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-md font-semibold text-slate-900 mb-4">Tax & Deductions</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField label="Tax Rate (%)" id="taxRate">
                          <input
                            type="number"
                            step="0.01"
                            id="taxRate"
                            value={settings.taxRate}
                            onChange={(e) => handleSystemSettingsChange('taxRate', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                        <FormField label="Pension Rate (%)" id="pensionRate">
                          <input
                            type="number"
                            step="0.01"
                            id="pensionRate"
                            value={settings.pensionRate}
                            onChange={(e) => handleSystemSettingsChange('pensionRate', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                        <FormField label="Social Security Rate (%)" id="socialSecurityRate">
                          <input
                            type="number"
                            step="0.01"
                            id="socialSecurityRate"
                            value={settings.socialSecurityRate}
                            onChange={(e) => handleSystemSettingsChange('socialSecurityRate', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-md font-semibold text-slate-900 mb-4">Overtime Multipliers</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField label="Default" id="defaultOvertimeMultiplier">
                          <input
                            type="number"
                            step="0.1"
                            id="defaultOvertimeMultiplier"
                            value={settings.defaultOvertimeMultiplier}
                            onChange={(e) => handleSystemSettingsChange('defaultOvertimeMultiplier', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                        <FormField label="Sunday" id="sundayOvertimeMultiplier">
                          <input
                            type="number"
                            step="0.1"
                            id="sundayOvertimeMultiplier"
                            value={settings.sundayOvertimeMultiplier}
                            onChange={(e) => handleSystemSettingsChange('sundayOvertimeMultiplier', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                        <FormField label="Holiday" id="holidayOvertimeMultiplier">
                          <input
                            type="number"
                            step="0.1"
                            id="holidayOvertimeMultiplier"
                            value={settings.holidayOvertimeMultiplier}
                            onChange={(e) => handleSystemSettingsChange('holidayOvertimeMultiplier', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField label="Time & Half Multiplier" id="timeAndHalfMultiplier">
                          <input
                            type="number"
                            step="0.1"
                            id="timeAndHalfMultiplier"
                            value={settings.timeAndHalfMultiplier}
                            onChange={(e) => handleSystemSettingsChange('timeAndHalfMultiplier', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                        <FormField label="Weekend Rate" id="weekendRate">
                          <input
                            type="number"
                            step="0.1"
                            id="weekendRate"
                            value={settings.weekendRate}
                            onChange={(e) => handleSystemSettingsChange('weekendRate', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField label="Holiday Rate" id="holidayRate">
                          <input
                            type="number"
                            step="0.1"
                            id="holidayRate"
                            value={settings.holidayRate}
                            onChange={(e) => handleSystemSettingsChange('holidayRate', parseFloat(e.target.value))}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.doubleTimeOnSunday}
                            onChange={(e) => handleSystemSettingsChange('doubleTimeOnSunday', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <label className="text-sm text-slate-700">Double Time on Sundays</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.timeAndHalfAfter8Hours}
                            onChange={(e) => handleSystemSettingsChange('timeAndHalfAfter8Hours', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <label className="text-sm text-slate-700">Time and Half After 8 Hours</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.enableTimeAndHalfAfter8Hours}
                            onChange={(e) => handleSystemSettingsChange('enableTimeAndHalfAfter8Hours', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <label className="text-sm text-slate-700">Enable Time and Half Multiplier</label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Overtime Calculation Preview</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• Regular: {settings.hourlyRate} × {settings.defaultOvertimeMultiplier || 1.5} = ₵{(settings.hourlyRate * (settings.defaultOvertimeMultiplier || 1.5)).toFixed(2)}</p>
                        <p>• Sunday: {settings.hourlyRate} × {settings.sundayOvertimeMultiplier || 2.0} = ₵{(settings.hourlyRate * (settings.sundayOvertimeMultiplier || 2.0)).toFixed(2)}</p>
                        <p>• Holiday: {settings.hourlyRate} × {settings.holidayOvertimeMultiplier || 2.5} = ₵{(settings.hourlyRate * (settings.holidayOvertimeMultiplier || 2.5)).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200">
                      <Button type="submit" size="lg">Save Settings</Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* ============================================================ */}
              {/*  ATTENDANCE TAB */}
              {/* ============================================================ */}
              {activeTab === 'attendance' && (
                <Card title="Attendance Auto‑Mark">
                  <form onSubmit={(e) => { e.preventDefault(); saveAttendanceScheduleSettings(); }} className="space-y-6">
                    <Toggle
                      checked={attendanceSchedule.enabled}
                      onChange={(val) => setAttendanceSchedule({ ...attendanceSchedule, enabled: val })}
                      label="Enable Auto‑Absent Marking"
                      description="Automatically mark employees as absent when they have no attendance record for the previous day"
                    />
                    <FormField label="Daily Run Time" id="runTime" help="The system checks the previous day’s attendance at this time">
                      <input
                        type="time"
                        id="runTime"
                        value={attendanceSchedule.runTime}
                        onChange={(e) => setAttendanceSchedule({ ...attendanceSchedule, runTime: e.target.value })}
                        className="block w-48 rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors disabled:bg-slate-100"
                        disabled={!attendanceSchedule.enabled}
                      />
                    </FormField>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Skip Categories</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-3 divide-y divide-slate-100">
                        {settings.categories.length === 0 ? (
                          <p className="text-sm text-slate-400">No categories available</p>
                        ) : (
                          settings.categories.map(cat => (
                            <label key={cat.id} className="flex items-center py-2 gap-3">
                              <input
                                type="checkbox"
                                checked={attendanceSchedule.skipCategories.includes(cat.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAttendanceSchedule({ ...attendanceSchedule, skipCategories: [...attendanceSchedule.skipCategories, cat.id] });
                                  } else {
                                    setAttendanceSchedule({ ...attendanceSchedule, skipCategories: attendanceSchedule.skipCategories.filter(id => id !== cat.id) });
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                disabled={!attendanceSchedule.enabled}
                              />
                              <span className="text-sm text-slate-700">{cat.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={scheduleSaving}>
                        {scheduleSaving ? 'Saving...' : 'Save Schedule'}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* ============================================================ */}
              {/*  LEAVE TAB */}
              {/* ============================================================ */}
              {activeTab === 'leave' && (
                <Card
                  title="Leave Settings"
                  actions={
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleExportTab('leave')}>Export</Button>
                      <Button size="sm" onClick={() => handleImportClick('leave')}>Import</Button>
                    </>
                  }
                >
                  <form onSubmit={handleSaveLeaveSettings} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Maternity Leave (months)" id="maternityLeaveMonths" required>
                        <input
                          type="number"
                          id="maternityLeaveMonths"
                          value={leaveSettings.maternityLeaveMonths}
                          onChange={(e) => setLeaveSettings({ ...leaveSettings, maternityLeaveMonths: parseInt(e.target.value) || 3 })}
                          className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          min="1" max="12"
                        />
                      </FormField>
                      <FormField label="Paternity Leave (months)" id="paternityLeaveMonths" required>
                        <input
                          type="number"
                          id="paternityLeaveMonths"
                          value={leaveSettings.paternityLeaveMonths}
                          onChange={(e) => setLeaveSettings({ ...leaveSettings, paternityLeaveMonths: parseInt(e.target.value) || 1 })}
                          className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          min="1" max="12"
                        />
                      </FormField>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Non‑Deductible Leave Types</label>
                      <div className="flex flex-wrap gap-2">
                        {['Maternity', 'Paternity', 'Sick', 'Study', 'Annual', 'Casual', 'Bereavement', 'Other'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              const checked = leaveSettings.nonDeductibleLeaveTypes.includes(type);
                              setLeaveSettings(prev => ({
                                ...prev,
                                nonDeductibleLeaveTypes: checked ? prev.nonDeductibleLeaveTypes.filter(t => t !== type) : [...prev.nonDeductibleLeaveTypes, type]
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              leaveSettings.nonDeductibleLeaveTypes.includes(type)
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Checked types are not deducted from annual leave balance</p>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit">Save Leave Settings</Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* ============================================================ */}
              {/*  LOAN TAB */}
              {/* ============================================================ */}
              {activeTab === 'loan' && (
                <Card
                  title="Loan Settings"
                  actions={
                    <Button size="sm" onClick={() => setShowLoanModal(true)}>Configure</Button>
                  }
                >
                  {loanSettings.maximumLoanLimit === 0 ? (
                    <div className="text-center py-8 text-slate-400">No loan settings configured yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Maximum Loan Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          <tr>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">₵{loanSettings.maximumLoanLimit.toFixed(2)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                              <Button variant="ghost" size="sm" onClick={() => handleEditLoanSettings(loanSettings)}>Edit</Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}

              {/* Loan Modal */}
              <Modal isOpen={showLoanModal} onClose={handleCancelLoan} title={editingLoanSettings ? 'Edit Loan Settings' : 'Configure Loan Settings'}>
                <form onSubmit={handleLoanSettingsSubmit} className="space-y-4">
                  <FormField label="Maximum Loan Amount (₵)" id="loanAmount" required>
                    <input
                      type="number"
                      step="0.01"
                      id="loanAmount"
                      value={loanForm.maximumLoanLimit}
                      onChange={(e) => setLoanForm({ maximumLoanLimit: parseFloat(e.target.value) || 0 })}
                      className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                    />
                  </FormField>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={handleCancelLoan}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/*  EMAIL TAB - UPDATED WITH DIRECT PURCHASE */}
              {/* ============================================================ */}
              {activeTab === 'email' && (
                <Card title="Email Notifications">
                  <div className="border-b border-slate-200 mb-6">
                    <nav className="flex space-x-6" aria-label="Email sub-tabs">
                      {['attendance', 'leaves', 'payroll', 'loans', 'direct-purchase', 'general', 'inventory'].map(sub => (
                        <button
                          key={sub}
                          onClick={() => setEmailSubTab(sub)}
                          className={`pb-2 text-sm font-medium border-b-2 transition ${
                            emailSubTab === sub ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {sub === 'direct-purchase' ? 'Direct Purchase' : sub.charAt(0).toUpperCase() + sub.slice(1)}
                        </button>
                        
                      ))}
                    </nav>
                  </div>

                  {emailSubTab === 'attendance' && (
                    <div className="space-y-6">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <h4 className="font-medium text-slate-900 mb-3">When to send attendance notifications</h4>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3">
                            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                            <span className="text-sm text-slate-700">Employee marked as Absent</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                            <span className="text-sm text-slate-700">Employee marked as Late</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                            <span className="text-sm text-slate-700">Daily attendance summary</span>
                          </label>
                        </div>
                      </div>
                      <FormField label="Recipients" id="attendanceRecipients" help="Comma-separated">
                        <input
                          type="text"
                          id="attendanceRecipients"
                          className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          placeholder="manager@company.com, hr@company.com"
                        />
                      </FormField>
                      <div className="flex justify-end">
                        <Button>Save Attendance Settings</Button>
                      </div>
                    </div>
                  )}

                  {emailSubTab === 'leaves' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">🌍</span>
                          <h3 className="text-lg font-medium text-slate-900">Global Leave Email Settings</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">These settings apply to all leave requests unless overridden by category-specific settings below.</p>
                        <div className="space-y-4">
                          <div className="p-4 bg-slate-50 rounded-xl">
                            <h4 className="font-medium text-slate-900 mb-3">Leave Request Notifications</h4>
                            <div className="space-y-3">
                              <FormField label="Default Approver Email(s)" id="defaultApprover">
                                <input type="text" id="defaultApprover" className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" placeholder="approver1@company.com, approver2@company.com" />
                              </FormField>
                              <FormField label="CC Email(s)" id="ccEmail">
                                <input type="text" id="ccEmail" className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" placeholder="hr@company.com, payroll@company.com" />
                              </FormField>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📋</span>
                            <h4 className="text-md font-semibold text-slate-800">Category-Based Leave Approval Routing</h4>
                            <span className="ml-auto text-xs text-slate-400">Overrides global settings</span>
                          </div>
                        </div>
                        {settings.categories && settings.categories.length === 0 ? (
                          <div className="text-center py-12 bg-slate-50">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-500 mb-4">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <h4 className="text-sm font-medium text-slate-900">No categories found</h4>
                            <p className="text-sm text-slate-500 mt-1">Create categories first in the Categories tab to configure leave approval routing.</p>
                            <Button variant="primary" size="sm" onClick={() => setActiveTab('categories')} className="mt-4">
                              Go to Categories
                            </Button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Custom Routing</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Supervisor Email(s)</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Planner Email(s)</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">HR Email(s)</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                  <th className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-slate-200">
                                {settings.categories.map((category) => (
                                  <CategoryApproverRow key={category.id} category={category} onMessage={showMessage} API_BASE_URL={API_BASE_URL} getToken={getToken} loadAllSettings={loadAllSettings} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                        <h4 className="text-sm font-medium text-blue-800">How Leave Approval Routing Works</h4>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1">
                          <li>✓ When "Enable Custom Routing" is enabled for a category, leave requests go to the specified approvers.</li>
                          <li>✓ Supervisor → Planner → HR approval chain.</li>
                          <li>✓ When disabled, uses Global Leave Email Settings.</li>
                        </ul>
                      </div>
                      <div className="flex justify-end">
                        <Button>Save Leave Email Settings</Button>
                      </div>
                    </div>
                  )}

                  {emailSubTab === 'inventory' && (
                    <div className="space-y-6">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">📦</span>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              Inventory and PPE Email Notifications
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              Configure normal inventory and PPE recipients separately. Both configurations are saved from this Inventory tab.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {/* NORMAL INVENTORY SETTINGS */}
                        <div className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
                          <div className="border-b border-blue-200 bg-blue-50 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">📦</span>
                              <div>
                                <h4 className="font-semibold text-blue-950">Normal Inventory Requests</h4>
                                <p className="text-xs text-blue-700">Existing stock and manual non-PPE inventory requests.</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-5 p-5">
                            <Toggle
                              checked={inventoryEmailSettings.inventoryRequesterNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, inventoryRequesterNotificationEnabled: checked }))}
                              label="Notify Inventory Requester"
                              description="Notify the requester when a normal inventory request is submitted or updated."
                            />

                            <FormField label="New Inventory Request Recipients" id="inventoryRequestRecipients" help="Comma-separated email addresses">
                              <input id="inventoryRequestRecipients" type="text" value={inventoryEmailSettings.inventoryRequestRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, inventoryRequestRecipients: event.target.value }))}
                                placeholder="inventory@company.com, manager@company.com"
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </FormField>

                            <Toggle
                              checked={inventoryEmailSettings.inventoryPlannerNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, inventoryPlannerNotificationEnabled: checked }))}
                              label="Planner Notifications"
                              description="Notify planners when a normal inventory request requires review."
                            />
                            <FormField label="Inventory Planner Recipients" id="inventoryPlannerRecipients" help="Comma-separated email addresses">
                              <input id="inventoryPlannerRecipients" type="text" value={inventoryEmailSettings.inventoryPlannerRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, inventoryPlannerRecipients: event.target.value }))}
                                placeholder="planner@company.com"
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </FormField>

                            <Toggle
                              checked={inventoryEmailSettings.inventoryProcurementNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, inventoryProcurementNotificationEnabled: checked }))}
                              label="Non-PPE Procurement Notifications"
                              description="Notify procurement when a normal manual item must be purchased."
                            />
                            <FormField label="Inventory Procurement Recipients" id="inventoryProcurementRecipients" help="Comma-separated email addresses">
                              <input id="inventoryProcurementRecipients" type="text" value={inventoryEmailSettings.inventoryProcurementRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, inventoryProcurementRecipients: event.target.value }))}
                                placeholder="inventory.procurement@company.com"
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </FormField>

                            <Toggle
                              checked={inventoryEmailSettings.inventoryStoreNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, inventoryStoreNotificationEnabled: checked }))}
                              label="Inventory Store Notifications"
                              description="Notify store officers when normal inventory action is required."
                            />
                            <FormField label="Inventory Store Recipients" id="inventoryStoreRecipients" help="Comma-separated email addresses">
                              <input id="inventoryStoreRecipients" type="text" value={inventoryEmailSettings.inventoryStoreRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, inventoryStoreRecipients: event.target.value }))}
                                placeholder="store@company.com"
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </FormField>

                            <Toggle
                              checked={inventoryEmailSettings.inventoryStatusNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, inventoryStatusNotificationEnabled: checked }))}
                              label="Inventory Status Notifications"
                              description="Send final approval, rejection, receipt and issue updates."
                            />
                            <FormField label="Inventory Status Recipients" id="inventoryStatusRecipients" help="Comma-separated email addresses">
                              <input id="inventoryStatusRecipients" type="text" value={inventoryEmailSettings.inventoryStatusRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, inventoryStatusRecipients: event.target.value }))}
                                placeholder="inventory.management@company.com"
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </FormField>
                          </div>
                        </div>

                        {/* PPE SETTINGS */}
                        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
                          <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🦺</span>
                              <div>
                                <h4 className="font-semibold text-emerald-950">PPE Requests</h4>
                                <p className="text-xs text-emerald-700">Personal Protective Equipment workflow with mandatory Safety Officer visibility.</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-5 p-5">
                            <Toggle
                              checked={inventoryEmailSettings.ppeRequesterNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, ppeRequesterNotificationEnabled: checked }))}
                              label="Notify PPE Requester"
                              description="Notify the requester when a PPE request is submitted or updated."
                            />

                            <FormField label="Safety Officer Recipients" id="ppeRequestRecipients" help="Required. These recipients are automatically copied on every PPE stage." required>
                              <input id="ppeRequestRecipients" type="text" value={inventoryEmailSettings.ppeRequestRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, ppeRequestRecipients: event.target.value }))}
                                placeholder="safety.officer@company.com"
                                required
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </FormField>

                            <Toggle
                              checked={inventoryEmailSettings.ppeProcurementNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, ppeProcurementNotificationEnabled: checked }))}
                              label="PPE Procurement Notifications"
                              description="Notify PPE procurement recipients when purchasing action is required."
                            />
                            <FormField label="PPE Procurement Recipients" id="ppeProcurementRecipients" help="Comma-separated email addresses">
                              <input id="ppeProcurementRecipients" type="text" value={inventoryEmailSettings.ppeProcurementRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, ppeProcurementRecipients: event.target.value }))}
                                placeholder="ppe.procurement@company.com"
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </FormField>

                            <Toggle
                              checked={inventoryEmailSettings.ppeStoreNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, ppeStoreNotificationEnabled: checked }))}
                              label="PPE Store Notifications"
                              description="Notify the store when procured PPE must be reviewed, received or issued."
                            />
                            <FormField label="PPE Store Recipients" id="ppeStoreRecipients" help="Comma-separated email addresses">
                              <input id="ppeStoreRecipients" type="text" value={inventoryEmailSettings.ppeStoreRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, ppeStoreRecipients: event.target.value }))}
                                placeholder="ppe.store@company.com"
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </FormField>

                            <Toggle
                              checked={inventoryEmailSettings.ppeStatusNotificationEnabled}
                              onChange={checked => setInventoryEmailSettings(prev => ({ ...prev, ppeStatusNotificationEnabled: checked }))}
                              label="PPE Status Notifications"
                              description="Send final PPE approval, rejection, receipt and issue updates."
                            />
                            <FormField label="PPE Status Recipients" id="ppeStatusRecipients" help="Comma-separated email addresses">
                              <input id="ppeStatusRecipients" type="text" value={inventoryEmailSettings.ppeStatusRecipients}
                                onChange={event => setInventoryEmailSettings(prev => ({ ...prev, ppeStatusRecipients: event.target.value }))}
                                placeholder="ppe.management@company.com"
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                            </FormField>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                          <h4 className="text-sm font-semibold text-blue-900">Normal inventory routing</h4>
                          <ul className="mt-2 space-y-1 text-sm text-blue-800">
                            <li>✓ Submitted → inventory request recipients</li>
                            <li>✓ Planner pending → inventory planner recipients</li>
                            <li>✓ Manual purchase → inventory procurement recipients</li>
                            <li>✓ Store action → inventory store recipients</li>
                            <li>✓ Completed/rejected → inventory status recipients</li>
                          </ul>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                          <h4 className="text-sm font-semibold text-emerald-900">PPE routing</h4>
                          <ul className="mt-2 space-y-1 text-sm text-emerald-800">
                            <li>✓ Every stage → Safety Officer recipients</li>
                            <li>✓ Procurement pending → PPE procurement recipients</li>
                            <li>✓ Store review/receipt → PPE store recipients</li>
                            <li>✓ Completed/rejected → PPE status recipients</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={saveInventoryNotificationSettings} disabled={savingInventoryEmails}>
                          {savingInventoryEmails ? 'Saving...' : 'Save Inventory & PPE Email Settings'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {emailSubTab === 'payroll' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <h4 className="font-medium text-slate-900 mb-3">When to send payroll notifications</h4>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-slate-300" /><span className="text-sm text-slate-700">Payroll processed successfully</span></label>
                          <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-slate-300" /><span className="text-sm text-slate-700">Payslip generated</span></label>
                          <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-slate-300" /><span className="text-sm text-slate-700">Payroll errors or warnings</span></label>
                        </div>
                      </div>
                      <div className="flex justify-end"><Button>Save Payroll Settings</Button></div>
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/*  LOANS EMAIL TAB (Existing) */}
                  {/* ============================================================ */}
                  {emailSubTab === 'loans' && (
                    <div className="space-y-6">
                      <FormField label="Loan Request Recipients" id="loanRequestRecipients" help="Comma-separated emails">
                        <input type="text" id="loanRequestRecipients" value={loanNotificationSettings.loanRequestRecipients} onChange={(e) => setLoanNotificationSettings({ ...loanNotificationSettings, loanRequestRecipients: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" placeholder="finance@company.com" />
                      </FormField>
                      <FormField label="Loan Approval Recipients" id="loanApprovalRecipients">
                        <input type="text" id="loanApprovalRecipients" value={loanNotificationSettings.loanApprovalRecipients} onChange={(e) => setLoanNotificationSettings({ ...loanNotificationSettings, loanApprovalRecipients: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                      </FormField>
                      <FormField label="Loan Rejection Recipients" id="loanRejectionRecipients">
                        <input type="text" id="loanRejectionRecipients" value={loanNotificationSettings.loanRejectionRecipients} onChange={(e) => setLoanNotificationSettings({ ...loanNotificationSettings, loanRejectionRecipients: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                      </FormField>
                      <FormField label="Loan Consolidation Recipients" id="loanConsolidationRecipients">
                        <input type="text" id="loanConsolidationRecipients" value={loanNotificationSettings.loanConsolidationRecipients} onChange={(e) => setLoanNotificationSettings({ ...loanNotificationSettings, loanConsolidationRecipients: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                      </FormField>
                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                        <h4 className="text-sm font-medium text-blue-800">How Loan Notifications Work</h4>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1">
                          <li>✓ Request submitted: employee + configured recipients</li>
                          <li>✓ Approved: employee + configured recipients</li>
                          <li>✓ Rejected: employee + configured recipients</li>
                          <li>✓ Consolidated: employee + configured recipients</li>
                        </ul>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={saveLoanNotificationSettings} disabled={savingLoanNotifications}>
                          {savingLoanNotifications ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/*  DIRECT PURCHASE EMAIL TAB - NEW */}
                  {/* ============================================================ */}
                  {emailSubTab === 'direct-purchase' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">📋</span>
                          <h3 className="text-lg font-medium text-slate-900">Direct Purchase Email Notifications</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">
                          Configure who receives email notifications at each stage of the direct purchase approval workflow.
                        </p>

                        <div className="space-y-6">
                          {/* Accountant (First Approver) */}
                          <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-slate-900">Accountant Approval</h4>
                              <Toggle
                                checked={directPurchaseNotificationSettings.accountantNotificationEnabled}
                                onChange={(val) => setDirectPurchaseNotificationSettings({
                                  ...directPurchaseNotificationSettings,
                                  accountantNotificationEnabled: val
                                })}
                                label=""
                                description=""
                              />
                            </div>
                            <FormField label="Accountant Email(s)" id="accountantRecipients" help="Comma-separated emails">
                              <input
                                type="text"
                                id="accountantRecipients"
                                value={directPurchaseNotificationSettings.accountantRecipients}
                                onChange={(e) => setDirectPurchaseNotificationSettings({
                                  ...directPurchaseNotificationSettings,
                                  accountantRecipients: e.target.value
                                })}
                                className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                                placeholder="accountant1@company.com, accountant2@company.com"
                              />
                            </FormField>
                            <p className="text-xs text-slate-400 mt-1">Sent when a new direct purchase request is created</p>
                          </div>

                          {/* Reviewer (Second Approver) */}
                          <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-slate-900">Reviewer Approval</h4>
                              <Toggle
                                checked={directPurchaseNotificationSettings.reviewerNotificationEnabled}
                                onChange={(val) => setDirectPurchaseNotificationSettings({
                                  ...directPurchaseNotificationSettings,
                                  reviewerNotificationEnabled: val
                                })}
                                label=""
                                description=""
                              />
                            </div>
                            <FormField label="Reviewer Email(s)" id="reviewerRecipients" help="Comma-separated emails">
                              <input
                                type="text"
                                id="reviewerRecipients"
                                value={directPurchaseNotificationSettings.reviewerRecipients}
                                onChange={(e) => setDirectPurchaseNotificationSettings({
                                  ...directPurchaseNotificationSettings,
                                  reviewerRecipients: e.target.value
                                })}
                                className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                                placeholder="reviewer1@company.com, reviewer2@company.com"
                              />
                            </FormField>
                            <p className="text-xs text-slate-400 mt-1">Sent when Accountant approves the request</p>
                          </div>

                          {/* Finance (Payment Approver) */}
                          <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-slate-900">Finance / Payment</h4>
                              <Toggle
                                checked={directPurchaseNotificationSettings.financeNotificationEnabled}
                                onChange={(val) => setDirectPurchaseNotificationSettings({
                                  ...directPurchaseNotificationSettings,
                                  financeNotificationEnabled: val
                                })}
                                label=""
                                description=""
                              />
                            </div>
                            <FormField label="Finance Email(s)" id="financeRecipients" help="Comma-separated emails">
                              <input
                                type="text"
                                id="financeRecipients"
                                value={directPurchaseNotificationSettings.financeRecipients}
                                onChange={(e) => setDirectPurchaseNotificationSettings({
                                  ...directPurchaseNotificationSettings,
                                  financeRecipients: e.target.value
                                })}
                                className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                                placeholder="finance@company.com"
                              />
                            </FormField>
                            <p className="text-xs text-slate-400 mt-1">Sent when Reviewer approves the request</p>
                          </div>

                          {/* Requester Notification */}
                          <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-slate-900">Requester Notifications</h4>
                              <Toggle
                                checked={directPurchaseNotificationSettings.requesterNotificationEnabled}
                                onChange={(val) => setDirectPurchaseNotificationSettings({
                                  ...directPurchaseNotificationSettings,
                                  requesterNotificationEnabled: val
                                })}
                                label=""
                                description=""
                              />
                            </div>
                            <p className="text-sm text-slate-600">
                              The requester (Procurement Officer) will receive email notifications when:
                            </p>
                            <ul className="text-xs text-slate-500 mt-2 space-y-1 list-disc list-inside">
                              <li>Request is rejected</li>
                              <li>Request is fully processed and paid</li>
                            </ul>
                          </div>
                        </div>

                        <div className="mt-6 bg-blue-50 rounded-xl border border-blue-200 p-5">
                          <h4 className="text-sm font-medium text-blue-800">Direct Purchase Workflow</h4>
                          <div className="text-sm text-blue-700 mt-2 space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">1. Request Created</span>
                              <span className="text-xs">→</span>
                              <span>Accountant receives notification</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">2. Accountant Approves</span>
                              <span className="text-xs">→</span>
                              <span>Reviewer receives notification</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">3. Reviewer Approves</span>
                              <span className="text-xs">→</span>
                              <span>Finance receives notification</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">4. Payment Processed</span>
                              <span className="text-xs">→</span>
                              <span>Requester + Accountant notified</span>
                            </div>
                            <div className="flex items-center gap-3 text-red-600">
                              <span className="font-medium">Rejection</span>
                              <span className="text-xs">→</span>
                              <span>Requester notified with reason</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button onClick={saveDirectPurchaseNotificationSettings} disabled={savingDirectPurchaseNotifications}>
                            {savingDirectPurchaseNotifications ? 'Saving...' : 'Save Direct Purchase Settings'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {emailSubTab === 'general' && <EmailSettings />}
                </Card>
              )}

              {/* ============================================================ */}
              {/*  CATEGORIES TAB */}
              {/* ============================================================ */}
              {activeTab === 'categories' && (
                <Card
                  title="Categories"
                  actions={
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleExportTab('categories')}>Export</Button>
                      <Button size="sm" onClick={() => handleImportClick('categories')}>Import</Button>
                      <Button size="sm" onClick={() => setShowCategoryModal(true)}>Add</Button>
                    </>
                  }
                >
                  {settings.categories.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No categories yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Std Hours</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Annual Leave</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Start Time</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tax Type</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {settings.categories.map(cat => (
                            <tr key={cat.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-4 text-sm font-medium text-slate-900">{cat.name}</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{cat.standardRateHours}</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{cat.annualLeaveDays || 20}</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{cat.workStartTime || '09:00'}</td>
                              <td className="px-4 py-4 text-sm">
                                {cat.applyWithholdingTax ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Withholding</span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">PAYE</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right text-sm font-medium">
                                <Button variant="ghost" size="sm" onClick={() => handleEditCategory(cat)} className="mr-2">Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(cat.id)}>Delete</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}

              {/* Category Modal */}
              <Modal isOpen={showCategoryModal} onClose={handleCancelCategory} title={editingCategory ? 'Edit Category' : 'Add Category'}>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Name" id="catName" required>
                      <input type="text" id="catName" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                    </FormField>
                    <FormField label="Standard Rate Hours" id="catStdHours" required>
                      <input type="number" id="catStdHours" value={categoryForm.standardRateHours} onChange={(e) => setCategoryForm({ ...categoryForm, standardRateHours: parseInt(e.target.value) || 8 })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" min="1" max="24" />
                    </FormField>
                    <FormField label="Annual Leave Days" id="catAnnualLeave" required>
                      <input type="number" id="catAnnualLeave" value={categoryForm.annualLeaveDays} onChange={(e) => setCategoryForm({ ...categoryForm, annualLeaveDays: parseInt(e.target.value) || 20 })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" min="0" max="365" />
                    </FormField>
                    <FormField label="Work Start Time" id="catStartTime" required>
                      <input type="time" id="catStartTime" value={categoryForm.workStartTime} onChange={(e) => setCategoryForm({ ...categoryForm, workStartTime: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                    </FormField>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={categoryForm.excludeWeekendsFromLeave} onChange={(e) => setCategoryForm({ ...categoryForm, excludeWeekendsFromLeave: e.target.checked })} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                      <label className="text-sm text-slate-700">Exclude Weekends from Leave</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={categoryForm.skipAutoAbsent} onChange={(e) => setCategoryForm({ ...categoryForm, skipAutoAbsent: e.target.checked })} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                      <label className="text-sm text-slate-700">Skip Auto‑Absent</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={categoryForm.applyWithholdingTax} onChange={(e) => setCategoryForm({ ...categoryForm, applyWithholdingTax: e.target.checked })} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                      <label className="text-sm text-slate-700">Apply Withholding Tax</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={categoryForm.useNonTaxableAllowances} onChange={(e) => setCategoryForm({ ...categoryForm, useNonTaxableAllowances: e.target.checked })} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                      <label className="text-sm text-slate-700">Use Non‑Taxable Allowances</label>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4 mt-2">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Leave Approval Routing (Optional)</h4>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={categoryForm.useCustomApprovers} onChange={(e) => setCategoryForm({ ...categoryForm, useCustomApprovers: e.target.checked })} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                      <label className="text-sm text-slate-700">Use custom approvers</label>
                    </div>
                    {categoryForm.useCustomApprovers && (
                      <div className="mt-3 space-y-3 pl-6 border-l-2 border-blue-200">
                        <FormField label="Supervisor Emails" id="catSupervisorEmails">
                          <input type="text" id="catSupervisorEmails" value={categoryForm.supervisorEmails} onChange={(e) => setCategoryForm({ ...categoryForm, supervisorEmails: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 transition-colors" placeholder="supervisor@company.com" />
                        </FormField>
                        <FormField label="Planner Emails" id="catPlannerEmails">
                          <input type="text" id="catPlannerEmails" value={categoryForm.plannerEmails} onChange={(e) => setCategoryForm({ ...categoryForm, plannerEmails: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 transition-colors" />
                        </FormField>
                        <FormField label="HR Emails" id="catHrEmails">
                          <input type="text" id="catHrEmails" value={categoryForm.hrEmails} onChange={(e) => setCategoryForm({ ...categoryForm, hrEmails: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 transition-colors" />
                        </FormField>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={handleCancelCategory}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/*  SPECIAL WEEKENDS TAB */}
              {/* ============================================================ */}
              {activeTab === 'specialWeekends' && (
                <Card
                  title="Special Weekends"
                  actions={
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleExportTab('specialWeekends')}>Export</Button>
                      <Button size="sm" onClick={() => handleImportClick('specialWeekends')}>Import</Button>
                      <Button size="sm" onClick={() => setShowSpecialWeekendModal(true)}>Add</Button>
                    </>
                  }
                >
                  {settings.specialWeekends.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No special weekends defined.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Multiplier</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {settings.specialWeekends.map(sw => (
                            <tr key={sw.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-4 text-sm font-medium text-slate-900">{sw.name}</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{new Date(sw.date).toLocaleDateString()}</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{sw.rateMultiplier}x</td>
                              <td className="px-4 py-4 text-right text-sm font-medium">
                                <Button variant="ghost" size="sm" onClick={() => handleEditSpecialWeekend(sw)} className="mr-2">Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteSpecialWeekend(sw.id)}>Delete</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}

              {/* Special Weekend Modal */}
              <Modal isOpen={showSpecialWeekendModal} onClose={handleCancelSpecialWeekend} title={editingSpecialWeekend ? 'Edit Special Weekend' : 'Add Special Weekend'}>
                <form onSubmit={handleSpecialWeekendSubmit} className="space-y-4">
                  <FormField label="Name" id="swName" required>
                    <input type="text" id="swName" value={specialWeekendForm.name} onChange={(e) => setSpecialWeekendForm({ ...specialWeekendForm, name: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <FormField label="Date" id="swDate" required>
                    <input type="date" id="swDate" value={specialWeekendForm.date} onChange={(e) => setSpecialWeekendForm({ ...specialWeekendForm, date: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <FormField label="Rate Multiplier" id="swMultiplier" required>
                    <input type="number" step="0.1" id="swMultiplier" value={specialWeekendForm.rateMultiplier} onChange={(e) => setSpecialWeekendForm({ ...specialWeekendForm, rateMultiplier: parseFloat(e.target.value) })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" min="1" />
                  </FormField>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={handleCancelSpecialWeekend}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/*  HOLIDAYS TAB */}
              {/* ============================================================ */}
              {activeTab === 'holidays' && (
                <Card
                  title="Holidays"
                  actions={
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleExportTab('holidays')}>Export</Button>
                      <Button size="sm" onClick={() => handleImportClick('holidays')}>Import</Button>
                      <Button size="sm" onClick={() => setShowHolidayModal(true)}>Add</Button>
                    </>
                  }
                >
                  {settings.holidays.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No holidays defined.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Multiplier</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Recurring</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {settings.holidays.map(hol => (
                            <tr key={hol.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-4 text-sm font-medium text-slate-900">{hol.name}</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{new Date(hol.date).toLocaleDateString()}</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{hol.payMultiplier}x</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{hol.recurring ? 'Yes' : 'No'}</td>
                              <td className="px-4 py-4 text-right text-sm font-medium">
                                <Button variant="ghost" size="sm" onClick={() => handleEditHoliday(hol)} className="mr-2">Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteHoliday(hol.id)}>Delete</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}

              {/* Holiday Modal */}
              <Modal isOpen={showHolidayModal} onClose={handleCancelHoliday} title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}>
                <form onSubmit={handleHolidaySubmit} className="space-y-4">
                  <FormField label="Name" id="holidayName" required>
                    <input type="text" id="holidayName" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <FormField label="Date" id="holidayDate" required>
                    <input type="date" id="holidayDate" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <FormField label="Pay Multiplier" id="holidayMultiplier" required>
                    <input type="number" step="0.1" id="holidayMultiplier" value={holidayForm.payMultiplier} onChange={(e) => setHolidayForm({ ...holidayForm, payMultiplier: parseFloat(e.target.value) })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" min="1" />
                  </FormField>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={holidayForm.recurring} onChange={(e) => setHolidayForm({ ...holidayForm, recurring: e.target.checked })} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                    <label className="text-sm text-slate-700">Recurring yearly</label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={handleCancelHoliday}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/*  DEPARTMENTS & POSITIONS TAB */}
              {/* ============================================================ */}
              {activeTab === 'positions' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Departments & Positions</h2>
                      <p className="text-sm text-slate-500">Manage departments and the positions within them</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleExportTab('positions')}>Export</Button>
                      <Button size="sm" onClick={() => handleImportClick('positions')}>Import</Button>
                      <Button variant="success" size="sm" onClick={() => setShowDepartmentModal(true)}>+ Department</Button>
                      <Button size="sm" onClick={() => setShowPositionModal(true)}>+ Position</Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 max-w-md">
                        <FormField label="" id="deptSearch">
                          <input
                            type="text"
                            id="deptSearch"
                            placeholder="Search departments…"
                            value={departmentSearch}
                            onChange={(e) => setDepartmentSearch(e.target.value)}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                          />
                        </FormField>
                      </div>
                      <div className="text-sm text-slate-500">
                        {filteredDepartments.length} / {departments.length} departments
                      </div>
                    </div>

                    {departments.length === 0 ? (
                      <div className="bg-white shadow rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                        <p className="text-lg font-medium">No departments yet</p>
                        <p className="text-sm">Click the "Add Department" button to create one.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredDepartments.map(dept => {
                          const positionCount = settings.jobPositions.filter(p => p.department?.id === dept.id).length;
                          const isFiltered = positionFilterDepartment === dept.id;
                          return (
                            <div
                              key={dept.id}
                              onClick={() => {
                                setPositionFilterDepartment(isFiltered ? null : dept.id);
                              }}
                              className={`
                                bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all hover:shadow-md
                                ${isFiltered ? 'border-blue-500 ring-2 ring-blue-200 shadow-md' : 'border-slate-200 hover:border-blue-300'}
                              `}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-slate-900 truncate">{dept.name}</h3>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {positionCount} position{positionCount !== 1 ? 's' : ''}
                                  </p>
                                  {dept.manager && (
                                    <p className="text-xs text-slate-400 truncate">Manager: {dept.manager}</p>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditDepartment(dept); }}>✎</Button>
                                  <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(dept.id); }}>✕</Button>
                                </div>
                              </div>
                              {dept.description && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{dept.description}</p>
                              )}
                              <div className="mt-2 text-xs text-blue-600 flex items-center">
                                {isFiltered ? '✓ Filtering' : 'Click to filter'}
                              </div>
                            </div>
                          );
                        })}
                        {filteredDepartments.length === 0 && (
                          <div className="col-span-full text-center py-8 text-slate-400">
                            No departments match your search.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Card
                    title="Positions"
                    actions={
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-600">Filter:</label>
                          <select
                            value={positionFilterDepartment || ''}
                            onChange={(e) => setPositionFilterDepartment(e.target.value ? parseInt(e.target.value) : null)}
                            className="rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-1.5"
                          >
                            <option value="">All Departments</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          {positionFilterDepartment && (
                            <Button variant="ghost" size="sm" onClick={() => setPositionFilterDepartment(null)}>
                              Clear
                            </Button>
                          )}
                        </div>
                        <Button size="sm" onClick={() => setShowPositionModal(true)}>+ Add Position</Button>
                      </div>
                    }
                  >
                    {settings.jobPositions.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">No positions defined.</div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Position</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Base Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Hours</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Grades</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employees</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                              {paginatedPositions.map(pos => {
                                const assignedCount = employeesForPositions.filter(emp => emp.jobPosition === pos.name).length;
                                return (
                                  <tr key={pos.id} className="hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => openAssignmentModal(pos)}>
                                    <td className="px-4 py-4 text-sm font-medium text-slate-900">{pos.name}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500">
                                      {pos.department ? (
                                        <span className="inline-flex items-center gap-1">
                                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{pos.department.name}</span>
                                        </span>
                                      ) : (
                                        <span className="text-amber-600 text-xs">Unassigned</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-500">{pos.category?.name || 'N/A'}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500">₵{pos.baseRate}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500">{pos.standardWorkHours}</td>
                                    <td className="px-4 py-4 text-sm text-slate-500">
                                      {pos.grades && pos.grades.length > 0 ? (
                                        <div className="flex flex-col gap-1.5">
                                          {pos.grades.map((g, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs whitespace-nowrap">
                                              <span className="font-medium">Level {g.level}</span>
                                              <span className="text-blue-300">|</span>
                                              <span>{g.label || 'N/A'}</span>
                                              <span className="text-blue-300">|</span>
                                              <span>₵{g.rate}</span>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-xs">None</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-500">
                                      {loadingEmployees ? (
                                        <span className="text-xs text-slate-400">Loading…</span>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                            {assignedCount} assigned
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); openViewModal(pos); }}
                                          >
                                            View
                                          </Button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-right text-sm font-medium">
                                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditPosition(pos); }} className="mr-2">Edit</Button>
                                      <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePosition(pos.id); }}>Delete</Button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {paginatedPositions.length === 0 && (
                                <tr>
                                  <td colSpan="8" className="text-center py-8 text-slate-400">No positions found for this filter.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {totalPages > 1 && (
                          <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-200">
                            <div className="text-sm text-slate-500">
                              Showing {(positionPage - 1) * POSITIONS_PER_PAGE + 1} – {Math.min(positionPage * POSITIONS_PER_PAGE, filteredPositions.length)} of {filteredPositions.length} positions
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={positionPage === 1}
                                onClick={() => setPositionPage(p => Math.max(1, p - 1))}
                              >
                                Previous
                              </Button>
                              <span className="flex items-center px-3 text-sm text-slate-600">
                                Page {positionPage} of {totalPages}
                              </span>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={positionPage === totalPages}
                                onClick={() => setPositionPage(p => Math.min(totalPages, p + 1))}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                </div>
              )}

              {/* ===== Department Modal ===== */}
              <Modal isOpen={showDepartmentModal} onClose={handleCancelDepartment} title={editingDepartment ? 'Edit Department' : 'Add Department'}>
                <form onSubmit={handleDepartmentSubmit} className="space-y-4">
                  <FormField label="Name" id="deptName" required>
                    <input type="text" id="deptName" value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <FormField label="Description" id="deptDescription">
                    <input type="text" id="deptDescription" value={departmentForm.description} onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <FormField label="Manager" id="deptManager">
                    <input type="text" id="deptManager" value={departmentForm.manager} onChange={(e) => setDepartmentForm({ ...departmentForm, manager: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={handleCancelDepartment}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </Modal>

              {/* ===== Position Modal ===== */}
              <Modal isOpen={showPositionModal} onClose={handleCancelPosition} title={editingPosition ? 'Edit Position' : 'Add Position'}>
                <form onSubmit={handlePositionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Position Name" id="posName" required>
                      <input type="text" id="posName" value={jobPositionForm.name} onChange={(e) => setJobPositionForm({ ...jobPositionForm, name: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                    </FormField>
                    <FormField label="Category" id="posCategory" required>
                      <select id="posCategory" value={jobPositionForm.category?.id || ''} onChange={(e) => { const catId = parseInt(e.target.value); const selected = settings.categories.find(c => c.id === catId); setJobPositionForm({ ...jobPositionForm, category: selected }); }} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors">
                        <option value="">Select</option>
                        {settings.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Department" id="posDepartment" required>
                      <select
                        id="posDepartment"
                        value={jobPositionForm.department?.id || ''}
                        onChange={(e) => {
                          const deptId = parseInt(e.target.value);
                          const selected = deptId ? departments.find(d => d.id === deptId) : null;
                          setJobPositionForm(prev => ({ ...prev, department: selected }));
                        }}
                        className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors"
                      >
                        <option value="">Select</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </FormField>
                  </div>
                  <FormField label="Description" id="posDescription">
                    <textarea rows="2" id="posDescription" value={jobPositionForm.description} onChange={(e) => setJobPositionForm({ ...jobPositionForm, description: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Base Rate (₵)" id="posBaseRate" required>
                      <input type="number" step="0.01" id="posBaseRate" value={jobPositionForm.baseRate} onChange={(e) => setJobPositionForm({ ...jobPositionForm, baseRate: parseFloat(e.target.value) })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                    </FormField>
                    <FormField label="Standard Work Hours" id="posHours" required>
                      <input type="number" id="posHours" value={jobPositionForm.standardWorkHours} onChange={(e) => setJobPositionForm({ ...jobPositionForm, standardWorkHours: parseInt(e.target.value) })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" min="1" max="24" />
                    </FormField>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Grades</label>
                    {jobPositionForm.grades.map((g, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 mb-2 items-center">
                        <FormField label="Level" id={`grade-level-${idx}`}>
                          <input
                            type="number"
                            id={`grade-level-${idx}`}
                            placeholder="1"
                            value={g.level}
                            onChange={(e) => {
                              const newGrades = [...jobPositionForm.grades];
                              newGrades[idx].level = e.target.value;
                              setJobPositionForm({ ...jobPositionForm, grades: newGrades });
                            }}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5"
                          />
                        </FormField>
                        <FormField label="Label" id={`grade-label-${idx}`}>
                          <input
                            type="text"
                            id={`grade-label-${idx}`}
                            placeholder="Junior Staff"
                            value={g.label}
                            onChange={(e) => {
                              const newGrades = [...jobPositionForm.grades];
                              newGrades[idx].label = e.target.value;
                              setJobPositionForm({ ...jobPositionForm, grades: newGrades });
                            }}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5"
                          />
                        </FormField>
                        <FormField label="Rate (₵)" id={`grade-rate-${idx}`}>
                          <input
                            type="number"
                            step="0.01"
                            id={`grade-rate-${idx}`}
                            placeholder="0.00"
                            value={g.rate}
                            onChange={(e) => {
                              const newGrades = [...jobPositionForm.grades];
                              newGrades[idx].rate = parseFloat(e.target.value) || 0;
                              setJobPositionForm({ ...jobPositionForm, grades: newGrades });
                            }}
                            className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5"
                          />
                        </FormField>
                        <div className="flex items-end justify-center h-full">
                          <Button
                            variant="danger"
                            size="sm"
                            type="button"
                            onClick={() => {
                              const newGrades = jobPositionForm.grades.filter((_, i) => i !== idx);
                              setJobPositionForm({ ...jobPositionForm, grades: newGrades });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setJobPositionForm({
                          ...jobPositionForm,
                          grades: [...jobPositionForm.grades, { level: '', label: '', rate: 0 }]
                        })
                      }
                    >
                      + Add Grade
                    </Button>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={handleCancelPosition}>Cancel</Button>
                    <Button type="submit" disabled={!jobPositionForm.department?.id}>
                      {editingPosition ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </Modal>

              {/* ============================================================ */}
              {/*  WORKFLOWS TAB */}
              {/* ============================================================ */}
              {activeTab === 'workflows' && (
                <Card
                  title="Workflows"
                  actions={
                    <Button size="sm" onClick={() => { resetWorkflowForm(); setEditingWorkflow(null); setShowWorkflowModal(true); }}>Add Workflow</Button>
                  }
                >
                  {workflowLoading ? (
                    <div className="text-center py-8 text-slate-400">Loading...</div>
                  ) : workflows.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">No workflows defined.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Steps & Assigned Roles</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Active</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {workflows.map(wf => (
                            <tr key={wf.id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-4 text-sm font-medium text-slate-900">{wf.name}</td>
                              <td className="px-4 py-4 text-sm text-slate-500">{wf.description || '-'}</td>
                              <td className="px-4 py-4 text-sm">
                                <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                  {(wf.entityType || 'INVENTORY').replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="min-w-[360px] px-4 py-4">
                                {!wf.steps || wf.steps.length === 0 ? (
                                  <span className="text-sm text-slate-400">
                                    No steps configured
                                  </span>
                                ) : (
                                  <div className="space-y-2">
                                    {[...wf.steps]
                                      .sort((first, second) =>
                                        (first.stepOrder ?? 0) -
                                        (second.stepOrder ?? 0)
                                      )
                                      .map((step, stepIndex) => {
                                        const roles =
                                          parseRequiredRoles(
                                            step.requiredRole
                                          );

                                        return (
                                          <div
                                            key={
                                              step.id ??
                                              `${wf.id}-${stepIndex}`
                                            }
                                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <div className="flex min-w-0 items-center gap-2">
                                                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
                                                  {stepIndex + 1}
                                                </span>
                                                <span className="truncate text-sm font-semibold text-slate-800">
                                                  {step.stepName ||
                                                    `Step ${stepIndex + 1}`}
                                                </span>
                                              </div>

                                              <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                                                {step.targetStatus || 'No status'}
                                              </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                              {roles.length === 0 ? (
                                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                  No role selected
                                                </span>
                                              ) : (
                                                roles.map(role => (
                                                  <RoleBadge
                                                    key={role}
                                                    role={role}
                                                  />
                                                ))
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-sm">
                                {wf.active ? (
                                  <span className="text-green-600 font-medium">● Active</span>
                                ) : (
                                  <span className="text-slate-400">● Inactive</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right text-sm font-medium">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingWorkflow(wf); setWorkflowFormData({ name: wf.name, description: wf.description || '', active: wf.active, entityType: wf.entityType || 'INVENTORY', conditionJson: wf.conditionJson || '', steps: (wf.steps || []).sort((a,b) => a.stepOrder - b.stepOrder) }); if (wf.conditionJson) try { setConditions(JSON.parse(wf.conditionJson)); } catch { setConditions([]); } else setConditions([]); setShowWorkflowModal(true); }} className="mr-2">Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteWorkflow(wf.id)}>Delete</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}

              {/* Workflow Modal */}
              <Modal isOpen={showWorkflowModal} onClose={() => setShowWorkflowModal(false)} title={editingWorkflow ? 'Edit Workflow' : 'Add Workflow'}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <FormField label="Workflow Name" id="wfName" required>
                    <input type="text" id="wfName" value={workflowFormData.name} onChange={(e) => setWorkflowFormData({ ...workflowFormData, name: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <FormField label="Description" id="wfDescription">
                    <textarea id="wfDescription" rows="2" value={workflowFormData.description} onChange={(e) => setWorkflowFormData({ ...workflowFormData, description: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors" />
                  </FormField>
                  <FormField label="Entity Type" id="wfEntityType">
                    <select id="wfEntityType" value={workflowFormData.entityType} onChange={(e) => setWorkflowFormData({ ...workflowFormData, entityType: e.target.value })} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors">
                      <option value="INVENTORY">Inventory Request</option>
                      <option value="DIRECT_PURCHASE">Direct Purchase</option>
                    </select>
                  </FormField>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={workflowFormData.active} onChange={(e) => setWorkflowFormData({ ...workflowFormData, active: e.target.checked })} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                    <label className="text-sm text-slate-700">Active</label>
                  </div>

                  <div className="border rounded-xl p-4 bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700">Conditions</span>
                      <Button variant="ghost" size="sm" type="button" onClick={addWorkflowCondition}>+ Add</Button>
                    </div>
                    {conditions.map((cond, idx) => (
                      <div key={idx} className="flex flex-wrap gap-2 items-center mt-2">
                        <select value={cond.field} onChange={(e) => updateWorkflowCondition(idx, 'field', e.target.value)} className="rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5 transition-colors">
                          <option value="ppeRequest">PPE Request</option>
                          <option value="hasManualProducts">Has Manual Products</option>
                          <option value="department">Department</option>
                          <option value="projectName">Project Name</option>
                          <option value="totalQuantity">Total Quantity</option>
                        </select>
                        <select value={cond.operator} onChange={(e) => updateWorkflowCondition(idx, 'operator', e.target.value)} className="rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5 transition-colors">
                          <option value="eq">equals</option>
                          <option value="ne">not equals</option>
                          <option value="gt">greater than</option>
                          <option value="lt">less than</option>
                          <option value="contains">contains</option>
                        </select>
                        <input type={cond.field === 'totalQuantity' ? 'number' : 'text'} value={cond.value} onChange={(e) => updateWorkflowCondition(idx, 'value', e.target.value)} className="flex-1 rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5 transition-colors" placeholder="Value" />
                        <Button variant="danger" size="sm" type="button" onClick={() => removeWorkflowCondition(idx)}>✖</Button>
                      </div>
                    ))}
                  </div>

                  {/* ============================================================ */}
                  {/* WORKFLOW STEPS - FIXED with proper role dropdown */}
                  {/* ============================================================ */}
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700">Steps</span>
                      <Button variant="ghost" size="sm" type="button" onClick={addWorkflowStep}>+ Add Step</Button>
                    </div>
                    {workflowFormData.steps.map((step, idx) => (
                      <div key={idx} className="relative mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center gap-2 pr-32">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {step.stepName || `Workflow Step ${idx + 1}`}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {parseRequiredRoles(step.requiredRole).length}{' '}
                            role(s) selected
                          </span>
                        </div>

                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button variant="ghost" size="sm" type="button" onClick={() => moveWorkflowStep(idx, 'up')}>▲</Button>
                          <Button variant="ghost" size="sm" type="button" onClick={() => moveWorkflowStep(idx, 'down')}>▼</Button>
                          <Button variant="danger" size="sm" type="button" onClick={() => removeWorkflowStep(idx)}>✖</Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField label="Step Name" id={`stepName-${idx}`}>
                            <input type="text" id={`stepName-${idx}`} value={step.stepName} onChange={(e) => updateWorkflowStep(idx, 'stepName', e.target.value)} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5 transition-colors" />
                          </FormField>
                          <FormField
                            label="Required Roles"
                            id={`stepRole-${idx}`}
                            help="Selected roles can approve or complete this workflow step."
                          >
                            <WorkflowRoleSelector
                              roles={availableRoles}
                              selectedRoles={parseRequiredRoles(
                                step.requiredRole
                              )}
                              loading={rolesLoading}
                              onChange={selectedRoles =>
                                updateWorkflowStep(
                                  idx,
                                  'requiredRole',
                                  selectedRoles.join(',')
                                )
                              }
                            />

                            {!rolesLoading &&
                              availableRoles.length === 0 && (
                                <p className="mt-1 text-xs text-amber-600">
                                  ⚠️ No roles found. Ensure roles exist in the
                                  system and that /auth/roles returns them.
                                </p>
                              )}
                          </FormField>
                          <FormField label="Target Status" id={`stepTarget-${idx}`}>
                            <input type="text" id={`stepTarget-${idx}`} value={step.targetStatus} onChange={(e) => updateWorkflowStep(idx, 'targetStatus', e.target.value)} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5 transition-colors" />
                          </FormField>
                          <FormField label="Reject Status (optional)" id={`stepReject-${idx}`}>
                            <input type="text" id={`stepReject-${idx}`} value={step.rejectStatus || ''} onChange={(e) => updateWorkflowStep(idx, 'rejectStatus', e.target.value)} className="block w-full rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-1.5 transition-colors" />
                          </FormField>
                          <div className="col-span-2 flex flex-wrap gap-4">
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={step.requiresApproval} onChange={(e) => updateWorkflowStep(idx, 'requiresApproval', e.target.checked)} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                              <span className="text-sm text-slate-700">Requires Approval</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={step.finalStep} onChange={(e) => updateWorkflowStep(idx, 'finalStep', e.target.checked)} className="h-4 w-4 text-blue-600 rounded border-slate-300" />
                              <span className="text-sm text-slate-700">Final Step</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setShowWorkflowModal(false)}>Cancel</Button>
                    <Button onClick={handleSaveWorkflow}>Save</Button>
                  </div>
                </div>
              </Modal>

              {/* ============================================================ */}
              {/*  ASSIGN EMPLOYEES MODAL */}
              {/* ============================================================ */}
              {assignmentModalOpen && selectedPositionForAssignment && (
                <Modal
                  isOpen={assignmentModalOpen}
                  onClose={closeAssignmentModal}
                  title={`Assign Employees to "${selectedPositionForAssignment.name}"`}
                  size="max-w-4xl"
                  footer={
                    <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={closeAssignmentModal}>Cancel</Button>
                      <Button variant="primary" onClick={saveAssignments} disabled={assignmentSaving}>
                        {assignmentSaving ? 'Saving...' : 'Save Assignments'}
                      </Button>
                    </div>
                  }
                >
                  {employeesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <p className="text-sm text-slate-500 mb-4">
                        Toggle the checkbox to assign or remove an employee from this position.
                        {selectedPositionForAssignment.grades && selectedPositionForAssignment.grades.length > 0 && (
                          <span> You can also select a grade for each assigned employee.</span>
                        )}
                      </p>
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assign</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Current Position</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Grade</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigned Grade</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {allEmployees.map(emp => {
                            const isAssigned = emp.jobPosition === selectedPositionForAssignment.name;
                            const checked = emp._assigned !== undefined ? emp._assigned : isAssigned;
                            const grade = emp._grade !== undefined ? emp._grade : (emp.jobGrade || 'I');
                            const availableGrades = selectedPositionForAssignment.grades || [];

                            return (
                              <tr key={emp.id} className="hover:bg-blue-50/50">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => handleToggleAssignment(emp, e.target.checked)}
                                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                  {emp.firstName} {emp.lastName}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {emp.jobPosition || 'None'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {emp.jobGrade || 'I'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {checked && availableGrades.length > 0 ? (
                                    <select
                                      value={grade}
                                      onChange={(e) => handleGradeChange(emp.id, e.target.value)}
                                      className="rounded-lg border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-2 py-1"
                                    >
                                      {availableGrades.map(g => (
                                        <option key={g.level} value={g.level}>
                                          Level {g.level} (₵{g.rate})
                                        </option>
                                      ))}
                                    </select>
                                  ) : checked ? (
                                    <span className="text-sm text-slate-500">{grade}</span>
                                  ) : (
                                    <span className="text-sm text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {allEmployees.length === 0 && (
                            <tr>
                              <td colSpan="5" className="text-center py-8 text-slate-400">No employees found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Modal>
              )}

              {/* ============================================================ */}
              {/*  VIEW EMPLOYEES MODAL */}
              {/* ============================================================ */}
              {viewModalOpen && viewPosition && (
                <Modal
                  isOpen={viewModalOpen}
                  onClose={closeViewModal}
                  title={`Employees assigned to "${viewPosition.name}"`}
                  size="max-w-3xl"
                  footer={
                    <div className="flex justify-end">
                      <Button variant="secondary" onClick={closeViewModal}>Close</Button>
                    </div>
                  }
                >
                  {viewEmployees.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No employees are currently assigned to this position.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Employee ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Grade</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Phone</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {viewEmployees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-blue-50/50">
                              <td className="px-4 py-3 text-sm font-medium text-blue-600">{emp.employeeId || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">
                                {emp.firstName} {emp.lastName}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">{emp.jobGrade || 'I'}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{emp.email}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{emp.phone || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Modal>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
