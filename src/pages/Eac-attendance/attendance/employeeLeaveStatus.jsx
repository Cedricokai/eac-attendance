import { useState, useEffect } from "react";

const EmployeeLeaveStatus = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState(""); // Get from auth context

  useEffect(() => {
    // Get employee ID from authentication context or localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setEmployeeId(user.employeeId || user.id);
    } else {
      // Fallback for demo
      setEmployeeId("123");
    }
    fetchEmployeeLeaves();
  }, []);

  const fetchEmployeeLeaves = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`http://localhost:8080/api/leave/employee/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch leaves');
      
      const data = await response.json();
      setLeaves(data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Leave Requests</h2>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your leave requests...</p>
        </div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No leave requests yet</h3>
          <p className="mt-1 text-gray-500">Submit your first leave request to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaves.map((leave) => (
            <div key={leave.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{leave.leaveType}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">{leave.reason}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(leave.status)}`}>
                  {getStatusText(leave.status)}
                </span>
              </div>
              
              {/* Approval Progress */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Approval Progress</span>
                  <span className="text-sm text-gray-600">
                    Submitted: {new Date(leave.submittedDate).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  {['Supervisor', 'Planner', 'HR'].map((role) => (
                    <div key={role} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        leave[`${role.toLowerCase()}Status`] === 'Approved' 
                          ? 'bg-green-500 text-white' 
                          : leave[`${role.toLowerCase()}Status`] === 'Rejected'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {leave[`${role.toLowerCase()}Status`] === 'Approved' ? '✓' : 
                         leave[`${role.toLowerCase()}Status`] === 'Rejected' ? '✗' : 
                         role.charAt(0)}
                      </div>
                      <span className="text-xs mt-1 text-gray-600">{role}</span>
                    </div>
                  ))}
                </div>
                
                {/* Feedback if available */}
                {leave.supervisorFeedback && (
                  <div className="mt-3 p-2 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Supervisor:</strong> {leave.supervisorFeedback}
                    </p>
                  </div>
                )}
                
                {leave.plannerFeedback && (
                  <div className="mt-2 p-2 bg-purple-50 rounded">
                    <p className="text-sm text-purple-800">
                      <strong>Planner:</strong> {leave.plannerFeedback}
                    </p>
                  </div>
                )}
                
                {leave.hrFeedback && (
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <p className="text-sm text-green-800">
                      <strong>HR:</strong> {leave.hrFeedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaveStatus;