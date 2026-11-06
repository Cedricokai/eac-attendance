import { useEffect, useId, useRef } from "react";
import PropTypes from "prop-types";
import {transportPhotos} from "./transportPhotos";

export function TransportField({ label, value, onChange, type = "text", options = [], required, placeholder, help, min, max, step, readOnly, disabled }) {
  const id = useId();
  const common = { id, value: value ?? "", required, disabled, readOnly, placeholder, min, max, step, onChange: event => onChange(type === "checkbox" ? event.target.checked : event.target.value) };
  return <div className={`tm-field ${type === "checkbox" ? "tm-field-checkbox" : ""}`}>
    {type === "checkbox" ? <label htmlFor={id}><input {...common} type="checkbox" checked={Boolean(value)} />{label}</label> : <><label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>{type === "select" ? <select {...common}><option value="">Choose…</option>{options.map(option => <option key={option.value ?? option.id} value={option.value ?? option.id}>{option.label ?? option.name}</option>)}</select> : type === "textarea" ? <textarea {...common} rows={4} /> : <input {...common} type={type} inputMode={type === "number" ? "decimal" : undefined} />}</>}
    {help && <small>{help}</small>}
  </div>;
}
TransportField.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.any, onChange: PropTypes.func.isRequired, type: PropTypes.string, options: PropTypes.array, required: PropTypes.bool, placeholder: PropTypes.string, help: PropTypes.string, min: PropTypes.any, max: PropTypes.any, step: PropTypes.any, readOnly: PropTypes.bool, disabled: PropTypes.bool };

export function TransportDialog({ title, children, onClose, busy = false, wide = false }) {
  const dialog = useRef(null);
  const id = useId();
  useEffect(() => { const node = dialog.current; node.showModal(); return () => node.close(); }, []);
  return <dialog ref={dialog} className={`tm-dialog ${wide ? "tm-dialog-wide" : ""}`} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <header><h2 id={id}>{title}</h2><button type="button" className="tm-icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><span aria-hidden="true">×</span></button></header><div className="tm-dialog-body">{children}</div>
  </dialog>;
}
TransportDialog.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node, onClose: PropTypes.func.isRequired, busy: PropTypes.bool, wide: PropTypes.bool };

export function TransportEmpty({ title = "No records yet", description, action }) {
  return <div className="tm-empty"><img className="tm-empty-photo" src={transportPhotos.mineTrucks} alt="" loading="lazy"/><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}
TransportEmpty.propTypes = { title: PropTypes.string, description: PropTypes.string, action: PropTypes.node };

export function TransportBadge({ value }) {
  const label = String(value ?? "Not Recorded").replaceAll("_", " ").toLowerCase();
  const kind = /critical|expired|overdue|out of service|fail|rejected/.test(label) ? "danger" : /warning|soon|pending|awaiting|attention|due|purchasing|partially|high|review/.test(label) ? "warning" : /active|available|assigned|valid|completed|pass|received|delivered|approved|closed/.test(label) && !/inactive|unassigned|invalid/.test(label) ? "success" : "neutral";
  return <span className={`tm-badge tm-badge-${kind}`}>{label}</span>;
}
TransportBadge.propTypes = { value: PropTypes.any };

export function TransportTable({ rows, columns, actions, empty, rowKey = "id" }) {
  if (!rows.length) return empty || <TransportEmpty />;
  return <div className="tm-table-scroll"><table><thead><tr>{columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}{actions && <th scope="col">Actions</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={row[rowKey] ?? index}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? "Not Recorded"}</td>)}{actions && <td><div className="tm-row-actions">{actions(row)}</div></td>}</tr>)}</tbody></table></div>;
}
TransportTable.propTypes = { rows: PropTypes.array.isRequired, columns: PropTypes.array.isRequired, actions: PropTypes.func, empty: PropTypes.node, rowKey: PropTypes.string };
