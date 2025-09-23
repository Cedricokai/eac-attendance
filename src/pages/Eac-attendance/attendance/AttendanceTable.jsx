function AttendanceTable({
    attendances,
    isAllSelected,
    setIsAllSelected,
    popupMenu,
    setPopupMenu,
    handleValidateAttendance,
    isValidating
  }) {
    const handleHeaderCheckboxChange = (e) => {
      const checked = e.target.checked;
      setIsAllSelected(checked);
      attendances.forEach(att => {
        const box = document.getElementById(`checkbox-${att.id}`);
        if (box) box.checked = checked;
      });
    };
  
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-gray-100 text-gray-600 text-sm">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" onChange={handleHeaderCheckboxChange} checked={isAllSelected} />
              </th>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Check In</th>
              <th className="px-4 py-3 text-left">Check Out</th>
              <th className="px-4 py-3 text-left">Hours</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {attendances.map((att, i) => (
              <tr
                key={att.id}
                className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" id={`checkbox-${att.id}`} />
                </td>
                <td className="px-4 py-3">
                  {att.employee?.firstName} {att.employee?.lastName}
                </td>
                <td className="px-4 py-3">{att.date}</td>
                <td className="px-4 py-3">{att.checkIn}</td>
                <td className="px-4 py-3">{att.checkOut}</td>
                <td className="px-4 py-3">{att.minimumHour}</td>
                <td className="px-4 py-3">{att.status}</td>
                <td className="px-4 py-3">
                  <button
                    className="text-blue-600 hover:underline mr-2"
                    onClick={handleValidateAttendance}
                    disabled={isValidating}
                  >
                    {isValidating ? 'Validating...' : 'Validate'}
                  </button>
                  {/* Add edit/delete actions here later */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  export default AttendanceTable;
  