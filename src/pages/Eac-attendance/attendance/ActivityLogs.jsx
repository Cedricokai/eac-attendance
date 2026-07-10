import { useState, useEffect } from "react";

function ActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ source: "", type: "", fromDate: "", toDate: "" });
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const getApiBaseUrl = () => {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return "http://localhost:8080";
        }
        if (hostname.startsWith("192.168.")) {
            return import.meta.env.VITE_API_BASE_URL_LOCAL;
        }
        if (hostname === "100.114.178.13") {
            return import.meta.env.VITE_API_BASE_URL_PUBLIC;
        }
        return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    };

    const API_BASE_URL = getApiBaseUrl();

    const getToken = () => localStorage.getItem('jwtToken');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                size: 50,
                ...(filters.source && { source: filters.source }),
                ...(filters.type && { type: filters.type }),
                ...(filters.fromDate && { fromDate: filters.fromDate }),
                ...(filters.toDate && { toDate: filters.toDate })
            });
            const res = await fetch(`${API_BASE_URL}/api/activity-logs?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error("Failed to fetch logs");
            const data = await res.json();
            setLogs(data.content);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case "SUCCESS": return "bg-green-100 text-green-800";
            case "ERROR": return "bg-red-100 text-red-800";
            case "WARNING": return "bg-yellow-100 text-yellow-800";
            default: return "bg-blue-100 text-blue-800";
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">Activity Logs</h1>
            <div className="flex flex-wrap gap-4 mb-6">
                <select value={filters.source} onChange={e => setFilters({...filters, source: e.target.value, page: 0})}
                    className="border rounded px-3 py-2">
                    <option value="">All Sources</option>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="PAYROLL">Payroll</option>
                    <option value="LOAN">Loan</option>
                    <option value="CREDIT">Credit</option>
                    <option value="SYSTEM">System</option>
                </select>
                <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value, page: 0})}
                    className="border rounded px-3 py-2">
                    <option value="">All Types</option>
                    <option value="INFO">Info</option>
                    <option value="SUCCESS">Success</option>
                    <option value="WARNING">Warning</option>
                    <option value="ERROR">Error</option>
                </select>
                <input type="datetime-local" value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value, page: 0})}
                    className="border rounded px-3 py-2" placeholder="From" />
                <input type="datetime-local" value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value, page: 0})}
                    className="border rounded px-3 py-2" placeholder="To" />
                <button onClick={() => { setPage(0); fetchLogs(); }} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Apply Filters
                </button>
            </div>
            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity ID</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {log.username || "SYSTEM"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.source}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs ${getTypeBadgeClass(log.type)}`}>
                                            {log.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{log.message}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.relatedEntityId || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">Page {page+1} of {totalPages}</div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p-1))}
                            disabled={page === 0}
                            className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
                            disabled={page+1 >= totalPages}
                            className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ActivityLogs;