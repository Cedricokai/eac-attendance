import { Link } from "react-router-dom";

export default function EmployeeTable({ 
  employees, 
  openMenuId,
  setOpenMenuId,
  menuRefs,
  deleteEmployee,
  setEditingEmployee,
  setIsEditMenuOpen
}) {
  return (
    <table className="min-w-full table-auto border-collapse">
      <thead>
        <tr className="bg-white">
          <th className="py-2 border-b border-gray-200 border-r text-center text-gray-600">
            <input type="checkbox" className="w-4 h-4" />
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
            EmployeeId
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
            First name
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
            Last name
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-center text-gray-600 text-sm">
            Tag number
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
            Job Position
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
            Category
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
            Work type
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
            Employee's rate
          </th>
          <th className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm"></th>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => (
          <tr key={employee.id}>
            <td className="px-3 py-2 border-b border-r-white border-gray-200 bg-white text-center">
              <input type="checkbox" className="w-4 h-4" />
            </td>
            <td className="px-4 py-2 border-b border-r-4 border-gray-200 text-start text-gray-600 text-sm">
              <Link to={`/profile/${employee.id}`} className="text-blue-600 hover:underline">
                {employee.id}
              </Link>
            </td>
            <td className="px-4 py-2 border-b border-r-4 border-gray-200 text-start text-gray-600 text-sm">
              {employee.firstName}
            </td>
            <td className="px-4 py-2 border-b border-r-4 border-gray-200 text-start text-gray-600 text-sm">
              {employee.lastName}
            </td>
            <td className="px-4 py-2 border-b border-r-4 border-gray-200 text-start text-gray-600 text-sm">
              {employee.email}
            </td>
            <td className="px-4 py-2 border-b border-r-4 border-gray-200 text-start text-gray-600 text-sm">
              {employee.jobPosition}
            </td>
            <td className="px-4 py-2 border-b border-gray-200 text-start text-gray-600 text-sm">
              {employee.category}
            </td>
            <td className="px-4 py-2 border-b border-r-4 border-gray-200 text-start text-gray-600 text-sm">
              {employee.workType}
            </td>
            <td className="px-4 py-2 border-b border-r-4-red-300 border-gray-200 text-start text-gray-600 text-sm">
              {employee.minimumRate}
            </td>
            <td className="px-2 border-b border-gray-200 border-l-4 text-start text-sm relative">
              <div className="flex justify-center items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-5 hover:bg-gray-100 rounded-3xl cursor-pointer"
                  onClick={() => setOpenMenuId(openMenuId === employee.id ? null : employee.id)}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
                  />
                </svg>

                {openMenuId === employee.id && (
                  <div
                    ref={el => {
                      if (el) {
                        menuRefs.current[employee.id] = el;
                      } else {
                        delete menuRefs.current[employee.id];
                      }
                    }}
                    className="absolute top-8 right-0 bg-white shadow-md rounded-md py-2 w-36 border z-50"
                  >
                    <button 
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        setEditingEmployee(employee);
                        setIsEditMenuOpen(true);
                        setOpenMenuId(null);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
                      onClick={() => {
                        deleteEmployee(employee.id);
                        setOpenMenuId(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
