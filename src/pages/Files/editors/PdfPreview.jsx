/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";

export default function PdfPreview({ blob, pages }) {
  const [url, setUrl] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return (
    <>
      <div className="fm-notice">
        This large PDF opens in the browser’s complete PDF viewer. All pages
        remain available. Download the original for advanced editing.
      </div>
      {pages && (
        <nav className="fm-document-pages" aria-label="PDF pages">
          <label>
            Page{" "}
            <select
              aria-label="Go to PDF page"
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
            >
              {Array.from({ length: pages }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>{" "}
            of {pages}
          </label>
        </nav>
      )}
      {url && (
        <iframe
          key={page}
          title="Complete original PDF"
          src={`${url}#page=${page}&navpanes=1&toolbar=1`}
          style={{ width: "100%", minHeight: "75vh", flex: 1, border: 0 }}
        />
      )}
    </>
  );
}
