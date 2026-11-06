import { useEffect, useState } from "react";
import { fileApi, bytes } from "./fileApi";
export default function StorageAnalytics() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    fileApi("/admin/analytics")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="fm-error">{error}</p>;
  if (!data) return <p>Loading storage analysis…</p>;
  return (
    <>
      <h2>
        {data.organization ? "Organization storage" : "Your storage breakdown"}
      </h2>
      <div className="fm-stat-grid">
        {[
          ["Current files", data.currentBytes],
          ["Previous versions", data.historyBytes],
          ["Recycle bin", data.recycledBytes],
          ["Total stored", data.totalBytes],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{bytes(value)}</strong>
          </div>
        ))}
      </div>
      <h3>By file type (all versions)</h3>
      {Object.entries(data.byMediaType).map(([type, size]) => (
        <div className="fm-storage-row" key={type}>
          <span>{type}</span>
          <progress max={Math.max(1, data.totalBytes)} value={size} />
          <strong>{bytes(size)}</strong>
        </div>
      ))}
      {data.organization && (
        <>
          <h3>By owner</h3>
          {Object.entries(data.byOwner).map(([name, size]) => (
            <div className="fm-storage-row" key={name}>
              <span>{name}</span>
              <progress max={Math.max(1, data.totalBytes)} value={size} />
              <strong>{bytes(size)}</strong>
            </div>
          ))}
        </>
      )}
    </>
  );
}
