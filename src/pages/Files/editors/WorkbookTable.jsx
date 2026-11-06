/* eslint-disable react/prop-types */
import { useState } from "react";
function columnLabel(index) {
  let label = "";
  for (let n = index + 1; n; n = Math.floor((n - 1) / 26))
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  return label;
}
export default function WorkbookTable({ workbook }) {
  const [selected, setSelected] = useState(workbook.sheetOrder[0]);
  const [rowPage, setRowPage] = useState(0),
    [columnPage, setColumnPage] = useState(0),
    [address, setAddress] = useState("A1");
  const id = workbook.sheets[selected] ? selected : workbook.sheetOrder[0],
    sheet = workbook.sheets[id],
    data = sheet.cellData || {};
  const rows = Object.keys(data).reduce(
    (n, r) => Math.max(n, Number(r) + 1),
    Math.max(1, sheet.sourceRowCount || 1),
  );
  const columns = Object.values(data).reduce(
    (n, row) =>
      Object.keys(row).reduce((m, c) => Math.max(m, Number(c) + 1), n),
    Math.max(1, sheet.sourceColumnCount || 1),
  );
  const startRow = Math.min(rowPage * 100, Math.floor((rows - 1) / 100) * 100),
    startColumn = Math.min(
      columnPage * 50,
      Math.floor((columns - 1) / 50) * 50,
    );
  return (
    <div className="fm-workbook-table-view">
      <div className="fm-editor-toolbar">
        <label>
          Worksheet{" "}
          <select
            aria-label="Data table worksheet"
            value={id}
            onChange={(e) => {
              setSelected(e.target.value);
              setRowPage(0);
              setColumnPage(0);
            }}
          >
            {workbook.sheetOrder.map((key) => (
              <option key={key} value={key}>
                {workbook.sheets[key].name}
              </option>
            ))}
          </select>
        </label>
        <span>
          {rows.toLocaleString()} rows · {columns.toLocaleString()} columns ·{" "}
          {workbook.sheetOrder.length} worksheets
        </span>
        <input
          aria-label="Data table cell address"
          value={address}
          onChange={(e) => setAddress(e.target.value.toUpperCase())}
          style={{ width: 100 }}
        />
        <button
          type="button"
          onClick={() => {
            const match = address.match(/^([A-Z]{1,3})([1-9]\d{0,6})$/);
            if (!match) return;
            const col =
              [...match[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) -
              1;
            setRowPage(
              Math.floor((Math.min(Number(match[2]), rows) - 1) / 100),
            );
            setColumnPage(Math.floor(Math.min(col, columns - 1) / 50));
          }}
        >
          Go to cell
        </button>
      </div>
      <div className="fm-editor-toolbar" aria-label="Data table pagination">
        <button
          disabled={!startRow}
          onClick={() => setRowPage((n) => Math.max(0, n - 1))}
        >
          Previous rows
        </button>
        <span>
          Rows {startRow + 1}–{Math.min(startRow + 100, rows)} of {rows}
        </span>
        <button
          disabled={startRow + 100 >= rows}
          onClick={() => setRowPage((n) => n + 1)}
        >
          Next rows
        </button>
        <button
          disabled={!startColumn}
          onClick={() => setColumnPage((n) => Math.max(0, n - 1))}
        >
          Previous columns
        </button>
        <span>
          Columns {columnLabel(startColumn)}–
          {columnLabel(Math.min(startColumn + 49, columns - 1))} of{" "}
          {columnLabel(columns - 1)}
        </span>
        <button
          disabled={startColumn + 50 >= columns}
          onClick={() => setColumnPage((n) => n + 1)}
        >
          Next columns
        </button>
      </div>
      <div className="fm-workbook-table-scroll">
        <table aria-label="Complete worksheet data">
          <thead>
            <tr>
              <th>Row</th>
              {Array.from(
                { length: Math.min(50, columns - startColumn) },
                (_, c) => (
                  <th key={c}>{columnLabel(startColumn + c)}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(100, rows - startRow) }, (_, r) => (
              <tr key={r}>
                <th>{startRow + r + 1}</th>
                {Array.from(
                  { length: Math.min(50, columns - startColumn) },
                  (_, c) => {
                    const cell = data[startRow + r]?.[startColumn + c];
                    return (
                      <td key={c} title={cell?.f || ""}>
                        {String(cell?.v ?? cell?.f ?? "")}
                      </td>
                    );
                  },
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
