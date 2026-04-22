import { useState } from "react";

function Search({ attendances, onResults }) {
  const [query, setQuery] = useState("");

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      onResults([]); // clear results
      return;
    }

    const results = attendances.filter((att) => {
      const name = `${att.employee?.firstName || ""} ${att.employee?.lastName || ""}`.toLowerCase();
      return name.includes(value.toLowerCase());
    });

    onResults(results);
  };

  return (
    <div className="relative flex-1">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 
              1 0 5.196 5.196a7.5 7.5 0 
              0 0 10.607 10.607Z" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Search employees..."
        value={query}
        onChange={handleChange}
        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

export default Search;
