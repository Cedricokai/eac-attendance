import React, { useState } from 'react';
import { XMarkIcon, DocumentIcon, CheckBadgeIcon, XCircleIcon, ClockIcon, UserIcon, CalendarDaysIcon, PencilIcon } from '@heroicons/react/24/outline';

function LeaveDetailsModal({ leave, apiBaseUrl, onClose, onApprove, onReject }) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [decisionType, setDecisionType] = useState(null);
  const [decisionFeedback, setDecisionFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const openDecisionModal = (type) => {
    setDecisionType(type);
    setDecisionFeedback('');
    setShowFeedbackModal(true);
  };

  const handleDecision = async () => {
    if (isProcessing) return;
    if (!decisionFeedback.trim()) return;
    setIsProcessing(true);
    try {
      let succeeded;
      if (decisionType === 'approve') {
        succeeded = await onApprove(leave.id, decisionFeedback.trim());
      } else {
        succeeded = await onReject(leave.id, decisionFeedback.trim());
      }
      if (succeeded !== false) setShowFeedbackModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckBadgeIcon className="w-5 h-5 text-green-600" />;
      case 'Rejected':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'Pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  if (!leave) return null;

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl w-[90%] max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <DocumentIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Leave Request Details</h2>
              <span className={`ml-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(leave.status)}`}>
                {getStatusIcon(leave.status)}
                {leave.status}
              </span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Employee Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-blue-600" />
                Employee Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900">
                    {leave.employee?.firstName} {leave.employee?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Employee ID</p>
                  <p className="font-medium text-gray-900">{leave.employee?.employeeId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium text-gray-900">{leave.employee?.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{leave.employee?.category?.name || 'General'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{leave.employee?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Leave Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-green-600" />
                Leave Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Leave Type</p>
                  <p className="font-medium text-gray-900">{leave.leaveType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Submitted On</p>
                  <p className="font-medium text-gray-900">{formatDate(leave.createdAt)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Reason</p>
                  <p className="font-medium text-gray-900 bg-white p-3 rounded-lg mt-1 border border-gray-200">
                    {leave.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Approval Workflow Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Workflow</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Supervisor Approval</p>
                    {leave.supervisorFeedback && (
                      <p className="text-sm text-gray-500 mt-1">Feedback: {leave.supervisorFeedback}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(leave.supervisorStatus)}`}>
                    {getStatusIcon(leave.supervisorStatus)}
                    {leave.supervisorStatus || 'Pending'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Planner Approval</p>
                    {leave.plannerFeedback && (
                      <p className="text-sm text-gray-500 mt-1">Feedback: {leave.plannerFeedback}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(leave.plannerStatus)}`}>
                    {getStatusIcon(leave.plannerStatus)}
                    {leave.plannerStatus || 'Pending'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">HR Approval</p>
                    {leave.hrFeedback && (
                      <p className="text-sm text-gray-500 mt-1">Feedback: {leave.hrFeedback}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(leave.hrStatus)}`}>
                    {getStatusIcon(leave.hrStatus)}
                    {leave.hrStatus || 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Attachment (if exists) */}
            {leave.attachmentFileName && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachment</h3>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <DocumentIcon className="w-8 h-8 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{leave.attachmentFileName}</p>
                    <p className="text-sm text-gray-500">
                      {(leave.attachmentFileSize / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Download attachment logic
                      const token = localStorage.getItem('jwtToken');
                      fetch(`${apiBaseUrl}/api/leave/${leave.id}/attachment`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then(res => res.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = leave.attachmentFileName;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        })
                        .catch(err => console.error('Download failed:', err));
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    Download
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons (only show if pending) */}
            {leave.status === 'Pending' && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => openDecisionModal('reject')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => openDecisionModal('approve')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Approve Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decision Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFeedbackModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {decisionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button onClick={() => setShowFeedbackModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Review the request and attachment, then provide feedback before confirming your decision.
              </p>
              <textarea
                value={decisionFeedback}
                onChange={(e) => setDecisionFeedback(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
                placeholder={decisionType === 'approve' ? 'Enter approval feedback...' : 'Enter rejection reason...'}
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDecision}
                disabled={isProcessing || !decisionFeedback.trim()}
                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${decisionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isProcessing ? 'Processing...' : decisionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LeaveDetailsModal;
