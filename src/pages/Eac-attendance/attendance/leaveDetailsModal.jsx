import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon, 
  EyeIcon, 
  ArrowDownTrayIcon,
  PaperClipIcon,
  XMarkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

const LeaveDetailsModal = ({ leave, onClose }) => {
  const [attachmentInfo, setAttachmentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [error, setError] = useState(null);

  const isSickLeave = leave?.leaveType === 'Sick' || leave?.leaveType === 'Sick Leave';

  useEffect(() => {
    if (leave && isSickLeave) {
      fetchAttachmentInfo();
    }
  }, [leave]);

  const fetchAttachmentInfo = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.97:8080';

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/leave/${leave.id}/attachment-info`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const info = await response.json();
        setAttachmentInfo(info);
      } else if (response.status === 404) {
        const errorData = await response.json();
        setAttachmentInfo(errorData);
      } else {
        throw new Error(`Failed to fetch attachment info: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching attachment info:', error);
      setError(error.message);
      setAttachmentInfo({ hasAttachment: false, message: 'Error fetching attachment info' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
      setContentLoading(true);
      setError(null);
      
      const endpoint = attachmentInfo?.isImage 
        ? `${API_BASE_URL}/api/leave/${leave.id}/attachment/image`
        : `${API_BASE_URL}/api/leave/${leave.id}/attachment`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Received empty file');
        }
        
        const url = URL.createObjectURL(blob);
        setFileContent({
          url,
          blob,
          type: attachmentInfo?.fileType || response.headers.get('content-type') || 'application/octet-stream'
        });
      } else {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      setError(error.message);
      
      if (attachmentInfo?.isImage && !error.message.includes('empty')) {
        await fetchFileContentFallback();
      }
    } finally {
      setContentLoading(false);
    }
  };

  const fetchFileContentFallback = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/leave/${leave.id}/attachment`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setFileContent({
          url,
          blob,
          type: attachmentInfo?.fileType || 'application/octet-stream'
        });
        setError(null);
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
  };

  const downloadAttachment = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/leave/${leave.id}/attachment`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = attachmentInfo?.fileName || `medical-certificate-${leave.id}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download attachment');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setError(error.message);
      alert('Error downloading attachment: ' + error.message);
    }
  };

  const handleViewAttachment = () => {
    setActiveTab('attachment');
    if (!fileContent && attachmentInfo && attachmentInfo.hasAttachment) {
      fetchFileContent();
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFileContent = () => {
    if (contentLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading file...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-red-500">
          <DocumentIcon className="h-16 w-16 mb-4" />
          <p className="text-lg font-medium">Error loading file</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={fetchFileContent}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!fileContent) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-gray-500">
          <PhotoIcon className="h-16 w-16 mb-4" />
          <p>No file content loaded</p>
          <button
            onClick={fetchFileContent}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Load File
          </button>
        </div>
      );
    }

    const { url, type } = fileContent;

    if (type === 'application/pdf') {
      return (
        <div className="w-full h-96">
          <iframe
            src={url}
            className="w-full h-full border rounded-lg"
            title="Medical Certificate PDF"
          />
        </div>
      );
    } else if (type.startsWith('image/')) {
      return (
        <div className="flex flex-col items-center">
          <img
            src={url}
            alt="Medical Certificate"
            className="max-w-full max-h-96 object-contain rounded-lg border shadow-sm"
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'text-center p-8';
              fallback.innerHTML = `
                <div class="h-16 w-16 mx-auto text-gray-400 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <p class="text-gray-500">Image cannot be displayed</p>
                <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Try Again
                </button>
              `;
              e.target.parentElement.appendChild(fallback);
            }}
            onLoad={(e) => {
              console.log('Image loaded successfully');
            }}
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = attachmentInfo?.fileName || `medical-image-${leave.id}`;
                link.click();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download Image
            </button>
            <button
              onClick={() => window.open(url, '_blank')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <EyeIcon className="h-4 w-4" />
              Open in New Tab
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="text-center p-8">
          <DocumentIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">File type cannot be previewed</p>
          <p className="text-sm text-gray-400">Please download to view the file</p>
          <button
            onClick={downloadAttachment}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Download File
          </button>
        </div>
      );
    }
  };

  useEffect(() => {
    return () => {
      if (fileContent?.url) {
        URL.revokeObjectURL(fileContent.url);
      }
    };
  }, [fileContent]);

  if (!leave) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Leave Request Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Leave Details
            </button>
            {isSickLeave && (
              <button
                onClick={handleViewAttachment}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'attachment'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Excuse Duty
                {attachmentInfo && attachmentInfo.hasAttachment && (
                  <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                    Available
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <p className="text-gray-900">
                    {leave.employee?.firstName} {leave.employee?.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <p className="text-gray-900">{leave.leaveType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <p className="text-gray-900">{new Date(leave.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <p className="text-gray-900">{new Date(leave.endDate).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <p className="text-gray-900">{leave.reason}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Status</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`p-3 rounded-lg ${
                    leave.supervisorStatus === 'Approved' ? 'bg-green-50 border border-green-200' :
                    leave.supervisorStatus === 'Rejected' ? 'bg-red-50 border border-red-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <p className="text-sm font-medium text-gray-700">Supervisor</p>
                    <p className={`text-sm font-semibold ${
                      leave.supervisorStatus === 'Approved' ? 'text-green-600' :
                      leave.supervisorStatus === 'Rejected' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {leave.supervisorStatus || 'Pending'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    leave.plannerStatus === 'Approved' ? 'bg-green-50 border border-green-200' :
                    leave.plannerStatus === 'Rejected' ? 'bg-red-50 border border-red-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <p className="text-sm font-medium text-gray-700">Planner</p>
                    <p className={`text-sm font-semibold ${
                      leave.plannerStatus === 'Approved' ? 'text-green-600' :
                      leave.plannerStatus === 'Rejected' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {leave.plannerStatus || 'Pending'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    leave.hrStatus === 'Approved' ? 'bg-green-50 border border-green-200' :
                    leave.hrStatus === 'Rejected' ? 'bg-red-50 border border-red-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <p className="text-sm font-medium text-gray-700">HR</p>
                    <p className={`text-sm font-semibold ${
                      leave.hrStatus === 'Approved' ? 'text-green-600' :
                      leave.hrStatus === 'Rejected' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {leave.hrStatus || 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {isSickLeave && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Excuse Duty</h3>
                  
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Checking for attachment...</span>
                    </div>
                  ) : attachmentInfo && attachmentInfo.hasAttachment ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <DocumentIcon className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">{attachmentInfo.fileName}</p>
                            <p className="text-sm text-gray-500">
                              {attachmentInfo.fileType} • {formatFileSize(attachmentInfo.fileSize)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleViewAttachment}
                            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span>View Attachment</span>
                          </button>
                          <button
                            onClick={downloadAttachment}
                            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <PaperClipIcon className="h-6 w-6 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">No Attachment Found</p>
                          <p className="text-sm text-yellow-700">
                            {attachmentInfo?.message || 'No medical certificate was uploaded for this sick leave request.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {attachmentInfo?.fileName || 'Medical Certificate'}
                  </h3>
                  {attachmentInfo && attachmentInfo.hasAttachment && (
                    <p className="text-sm text-gray-500">
                      {attachmentInfo.fileType} • {formatFileSize(attachmentInfo.fileSize)}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('details')}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Back to Details
                  </button>
                  {attachmentInfo && attachmentInfo.hasAttachment && (
                    <button
                      onClick={downloadAttachment}
                      className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px]">
                {attachmentInfo && attachmentInfo.hasAttachment ? (
                  renderFileContent()
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                    <PaperClipIcon className="h-16 w-16 mb-4" />
                    <p className="text-lg font-medium">No Attachment Available</p>
                    <p className="text-sm mt-2">
                      {attachmentInfo?.message || 'No medical certificate was uploaded for this sick leave request.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveDetailsModal;