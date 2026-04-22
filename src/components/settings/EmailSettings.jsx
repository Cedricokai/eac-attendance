// EmailSettings.jsx
import { useState, useEffect } from 'react';
import { Mail, Users, Clock, AlertTriangle, CheckCircle, Plus, Trash2, Save } from 'lucide-react';

function EmailSettings() {
  const [emailConfig, setEmailConfig] = useState({
    leaveRequestRecipients: [],
    attendanceAlertRecipients: [],
    lateArrivalRecipients: [],
    overtimeRequestRecipients: [],
    attendanceValidationRecipients: [],
    leaveApprovalRecipients: []
  });
  
  const [newEmail, setNewEmail] = useState('');
  const [activeSection, setActiveSection] = useState('leave');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Copy this function exactly from your SettingsPage
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

  // Helper function to get token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        console.error('No JWT token found');
        setLoading(false);
        return;
      }

      const url = `${API_BASE_URL}/api/settings/email/recipients`;
      console.log('Fetching from:', url);
      console.log('Using token:', token.substring(0, 20) + '...');

      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);
        setEmailConfig(data);
      } else if (response.status === 401) {
        console.error('Unauthorized - token may be expired');
        // Optionally redirect to login
        // window.location.href = '/';
      } else {
        console.error('Failed to fetch email config:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Failed to fetch email config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailConfig = async () => {
    setSaving(true);
    try {
      const token = getToken();
      if (!token) {
        alert('No authentication token found. Please log in again.');
        setSaving(false);
        return;
      }

      const url = `${API_BASE_URL}/api/settings/email/recipients`;
      console.log('Saving to:', url);
      console.log('Data to save:', emailConfig);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailConfig)
      });
      
      console.log('Save response status:', response.status);
      
      if (response.ok) {
        alert('Email configuration saved successfully!');
        await fetchEmailConfig(); // Refresh the config
      } else if (response.status === 401) {
        alert('Session expired. Please log in again.');
        // Optionally redirect to login
        // window.location.href = '/';
      } else {
        const errorText = await response.text();
        console.error('Save failed:', errorText);
        alert(`Failed to save: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save email config:', error);
      alert('Failed to save email configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addEmail = (section) => {
    if (newEmail && newEmail.includes('@')) {
      setEmailConfig(prev => ({
        ...prev,
        [section]: [...prev[section], newEmail]
      }));
      setNewEmail('');
    } else {
      alert('Please enter a valid email address');
    }
  };

  const removeEmail = (section, index) => {
    setEmailConfig(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const sections = {
    leave: {
      title: 'Leave Request Notifications',
      icon: <Mail className="h-5 w-5" />,
      description: 'Who receives emails when employees request leave?',
      recipients: emailConfig.leaveRequestRecipients,
      key: 'leaveRequestRecipients'
    },
    attendance: {
      title: 'Attendance Alerts',
      icon: <Clock className="h-5 w-5" />,
      description: 'Who receives alerts when employees are auto-marked absent?',
      recipients: emailConfig.attendanceAlertRecipients,
      key: 'attendanceAlertRecipients'
    },
    late: {
      title: 'Late Arrival Notifications',
      icon: <AlertTriangle className="h-5 w-5" />,
      description: 'Who gets notified when employees check in late?',
      recipients: emailConfig.lateArrivalRecipients,
      key: 'lateArrivalRecipients'
    },
    overtime: {
      title: 'Overtime Requests',
      icon: <Clock className="h-5 w-5" />,
      description: 'Who approves overtime requests?',
      recipients: emailConfig.overtimeRequestRecipients,
      key: 'overtimeRequestRecipients'
    },
    validation: {
      title: 'Attendance Validation',
      icon: <CheckCircle className="h-5 w-5" />,
      description: 'Who receives validation completion notifications?',
      recipients: emailConfig.attendanceValidationRecipients,
      key: 'attendanceValidationRecipients'
    },
    approval: {
      title: 'Leave Approvals',
      icon: <Users className="h-5 w-5" />,
      description: 'Who is copied on leave approval decisions?',
      recipients: emailConfig.leaveApprovalRecipients,
      key: 'leaveApprovalRecipients'
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Email Notification Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure who receives email notifications for different events in the system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
            <h3 className="font-semibold text-gray-700 mb-3">Notification Types</h3>
            <div className="space-y-2">
              {Object.entries(sections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    activeSection === key
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {section.icon}
                  <span className="text-sm">{section.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {sections[activeSection].icon}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {sections[activeSection].title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {sections[activeSection].description}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Recipients
                </label>
                
                {/* Current Recipients List */}
                <div className="space-y-2 mb-4">
                  {sections[activeSection].recipients.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No recipients configured yet</p>
                  ) : (
                    sections[activeSection].recipients.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="text-gray-700">{email}</span>
                        <button
                          onClick={() => removeEmail(sections[activeSection].key, index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Email */}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addEmail(sections[activeSection].key)}
                  />
                  <button
                    onClick={() => addEmail(sections[activeSection].key)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> You can add multiple email addresses. Use distribution lists (e.g., hr@company.com) to notify entire teams.
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={saveEmailConfig}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail size={16} />
              Current Configuration Summary
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>Leave Requests:</strong> {emailConfig.leaveRequestRecipients.length} recipient(s)</p>
              <p><strong>Attendance Alerts:</strong> {emailConfig.attendanceAlertRecipients.length} recipient(s)</p>
              <p><strong>Late Arrivals:</strong> {emailConfig.lateArrivalRecipients.length} recipient(s)</p>
              <p><strong>Overtime Requests:</strong> {emailConfig.overtimeRequestRecipients.length} recipient(s)</p>
              <p><strong>Attendance Validation:</strong> {emailConfig.attendanceValidationRecipients.length} recipient(s)</p>
              <p><strong>Leave Approvals:</strong> {emailConfig.leaveApprovalRecipients.length} recipient(s)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailSettings;