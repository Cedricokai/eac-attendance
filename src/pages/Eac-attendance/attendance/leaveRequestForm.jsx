import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LeaveRequestForm = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    status: "Pending",
  });
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const leaveTypes = [
    "Annual Leave",
    "Sick Leave",
    "Casual Leave",
    "Maternity Leave",
    "Paternity Leave",
    "Unpaid Leave",
    "Study Leave",
    "Compassionate Leave",
    "Public Holiday",
    "Sabbatical Leave",
  ];

  const getValidToken = () => {
    const token = localStorage.getItem("jwtToken");
    if (!token) throw new Error("No authentication token found");
    return token;
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = getValidToken();
        const response = await fetch("http://localhost:8080/api/employee", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch employees");
        const data = await response.json();
        setEmployees(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!validTypes.includes(selectedFile.type)) {
        setSubmitMessage("Please select a PDF, JPG, or PNG file");
        setIsError(true);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setSubmitMessage("File size must be less than 5MB");
        setIsError(true);
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setIsError(false);
      setSubmitMessage("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsError(false);
    setSubmitMessage("");

    try {
      const token = getValidToken();

      if (
        !formData.employeeId ||
        !formData.leaveType ||
        !formData.startDate ||
        !formData.endDate ||
        !formData.reason
      ) {
        throw new Error("Please fill in all required fields");
      }

      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        throw new Error("End date must be after start date");
      }

      if (formData.leaveType === "Sick Leave" && !file) {
        throw new Error("Please upload an excuse duty document for sick leave");
      }

      const leaveRequest = {
        employee: { id: formData.employeeId },
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        status: "Pending",
        supervisorStatus: "Pending",
        plannerStatus: "Pending",
        hrStatus: "Pending"
      };

      const response = await fetch("http://localhost:8080/api/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leaveRequest),
      });

      if (response.ok) {
        if (file && formData.leaveType === "Sick Leave") {
          await uploadAttachment(response, file, token);
        }

        setSubmitMessage("Leave request submitted successfully!");
        setIsError(false);

        setFormData({
          employeeId: "",
          leaveType: "",
          startDate: "",
          endDate: "",
          reason: "",
          status: "Pending",
        });
        setFile(null);
        setFileName("");

        setTimeout(() => navigate("/employeeDashboard"), 2000);
      } else {
        throw new Error("Failed to submit leave request");
      }
    } catch (error) {
      setSubmitMessage(error.message);
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadAttachment = async (leaveResponse, file, token) => {
    try {
      const leaveData = await leaveResponse.json();
      const formData = new FormData();
      formData.append("file", file);

      await fetch(
        `http://localhost:8080/api/leave/${leaveData.id}/attachment`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
    } catch (error) {
      console.error("Attachment upload failed:", error);
    }
  };

  const calculateLeaveDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          New Leave Request
        </h2>
        <p className="text-gray-600">
          Submit a new leave request for approval
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee *
          </label>
          <select
            name="employeeId"
            value={formData.employeeId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Leave Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leave Type *
          </label>
          <select
            name="leaveType"
            value={formData.leaveType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Leave Type</option>
            {leaveTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {formData.startDate && formData.endDate && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-700">
              Leave duration:{" "}
              <span className="font-medium">{calculateLeaveDays()} days</span>
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Leave *
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Please provide details about your leave request"
            required
          />
        </div>

        {/* Sick Leave File Upload */}
        {formData.leaveType === "Sick Leave" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excuse Duty Document *
            </label>
            <div className="flex items-center">
              <label className="cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                <span>Upload file</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  required
                />
              </label>
              <span className="ml-3 text-sm text-gray-600">
                {fileName || "No file chosen"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              PDF, JPG or PNG up to 5MB
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Leave Request"}
        </button>

        {/* Message */}
        {submitMessage && (
          <div
            className={`p-3 rounded-md ${
              isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {submitMessage}
          </div>
        )}
      </form>
    </div>
  );
};

export default LeaveRequestForm;