export default function FileUploadModal({ 
  isOpen, 
  onClose, 
  uploadedData, 
  onUpload 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-3/4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Excel File Contents</h2>
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                First Name
              </th>
              <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                Last Name
              </th>
              <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                Email
              </th>
              <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                Phone
              </th>
              <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                Job Position
              </th>
              <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                Category
              </th>
              <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                Work Type
              </th>
              <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {uploadedData.map((employee, index) => (
              <tr key={index}>
                <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                  {employee.firstName}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                  {employee.lastName}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                  {employee.email}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                  {employee.phone}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                  {employee.jobPosition}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                  {employee.category}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                  {employee.workType}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
                  {employee.minimumRate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-4 gap-4">
          <button
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition duration-200"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition duration-200"
            onClick={onUpload}
          >
            Upload Data
          </button>
        </div>
      </div>
    </div>
  );
}
