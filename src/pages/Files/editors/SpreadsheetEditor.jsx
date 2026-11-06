/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import { SetRangeValuesMutation } from "@univerjs/sheets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import SheetsEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import "@univerjs/preset-sheets-core/lib/index.css";
import { UniverSheetsDataValidationPreset } from "@univerjs/preset-sheets-data-validation";
import ValidationEnUS from "@univerjs/preset-sheets-data-validation/locales/en-US";
import "@univerjs/preset-sheets-data-validation/lib/index.css";
import { UniverSheetsConditionalFormattingPreset } from "@univerjs/preset-sheets-conditional-formatting";
import ConditionalEnUS from "@univerjs/preset-sheets-conditional-formatting/locales/en-US";
import "@univerjs/preset-sheets-conditional-formatting/lib/index.css";
import { UniverSheetsFilterPreset } from "@univerjs/preset-sheets-filter";
import FilterEnUS from "@univerjs/preset-sheets-filter/locales/en-US";
import "@univerjs/preset-sheets-filter/lib/index.css";
import { UniverSheetsSortPreset } from "@univerjs/preset-sheets-sort";
import SortEnUS from "@univerjs/preset-sheets-sort/locales/en-US";
import { UniverSheetsFindReplacePreset } from "@univerjs/preset-sheets-find-replace";
import FindEnUS from "@univerjs/preset-sheets-find-replace/locales/en-US";
import "@univerjs/preset-sheets-find-replace/lib/index.css";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Download, Plus, Trash2 } from "lucide-react";
import {
  importWorkbook,
  workbookBlob,
  exportWorkbook,
  workbookCsv,
  validateWorkbook,
} from "./workbookFormat";
import { downloadBlob } from "../fileApi";
import { saveOriginalWorkbook } from "./originalOffice.js";
import WorkbookTable from "./WorkbookTable";
import {
  readModel,
  patchModel,
  normalizeLiveWorkbook,
} from "../collaborationModel";

function chartRows(snapshot, chart) {
  const sheet = snapshot.sheets[chart.sheetId];
  if (!sheet) return [];
  const match = chart.range
    .toUpperCase()
    .match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) return [];
  const col = (value) =>
    [...value].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const c = col(match[1]);
  const last = col(match[3]);
  const start = Number(match[2]) - 1;
  const end = Math.min(Number(match[4]) - 1, start + 999);
  if (last <= c || last - c > 50 || start < 0) return [];
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => ({
    label: String(sheet.cellData[start + i]?.[c]?.v ?? i + 1),
    value: Number(sheet.cellData[start + i]?.[c + 1]?.v) || 0,
    x: Number(sheet.cellData[start + i]?.[c]?.v) || i + 1,
  }));
}
function WorkbookChart({ snapshot, chart }) {
  const rows = chartRows(snapshot, chart);
  const axis = (
    <>
      <CartesianGrid stroke="#e8edf4" />
      <XAxis dataKey={chart.type === "scatter" ? "x" : "label"} />
      <YAxis />
      <Tooltip />
    </>
  );
  return (
    <ResponsiveContainer width="100%" height={220}>
      {chart.type === "pie" ? (
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            fill="#4b7ddb"
            label
          />
          <Tooltip />
        </PieChart>
      ) : chart.type === "line" ? (
        <LineChart data={rows}>
          {axis}
          <Line dataKey="value" stroke="#4778d9" dot={false} />
        </LineChart>
      ) : chart.type === "area" ? (
        <AreaChart data={rows}>
          {axis}
          <Area dataKey="value" fill="#d8e5fc" stroke="#4778d9" />
        </AreaChart>
      ) : chart.type === "scatter" ? (
        <ScatterChart>
          {axis}
          <Scatter data={rows} fill="#4778d9" />
        </ScatterChart>
      ) : (
        <BarChart data={rows}>
          {axis}
          <Bar dataKey="value" fill="#4778d9" radius={[3, 3, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export default function SpreadsheetEditor(props) {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (props.live) {
      try {
        setLoaded({
          model: validateWorkbook(readModel(props.live.doc)),
          warnings: [],
        });
      } catch (e) {
        setError(e.message);
      }
      return;
    }
    importWorkbook(props.blob, props.extension)
      .then((result) => {
        if (!cancelled) setLoaded(result);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [props.blob, props.extension, props.live]);
  if (error)
    return (
      <div className="fm-error" role="alert">
        {error}
      </div>
    );
  if (!loaded) return <div className="fm-notice">Opening workbook…</div>;
  return (
    <WorkbookCanvas
      {...props}
      initial={loaded.model}
      warnings={loaded.warnings}
    />
  );
}
function WorkbookCanvas({
  initial,
  warnings,
  item,
  extension,
  canEdit,
  onChange,
  live,
  blob,
}) {
  const host = useRef(null);
  const instance = useRef(null);
  const changed = useRef(onChange);
  changed.current = onChange;
  const [snapshot, setSnapshot] = useState(initial.workbook);
  const [charts, setCharts] = useState(initial.charts || []);
  const chartsRef = useRef(charts);
  const liveBase = useRef(initial);
  chartsRef.current = charts;
  const [range, setRange] = useState("A1:B10");
  const [chartType, setChartType] = useState("bar");
  const [error, setError] = useState("");
  const [address, setAddress] = useState("A1");
  const [cellValue, setCellValue] = useState("");
  const [calculated, setCalculated] = useState("");
  const [tableView, setTableView] = useState(false);
  const [originalData, setOriginalData] = useState(() =>
    structuredClone(initial.workbook),
  );
  const originalWorkbook = useRef(originalData);
  useEffect(() => {
    const source = structuredClone(initial.workbook);
    originalWorkbook.current = source;
    setOriginalData(source);
  }, [initial]);
  const editable = canEdit && extension === "eacsheet";
  const originalEditable = canEdit && ["xlsx", "csv"].includes(extension);
  const imported = extension !== "eacsheet";
  const rawModel = () => ({
    format: "eac-workbook",
    schemaVersion: 1,
    workbook: instance.current?.workbook.save() || snapshot,
    charts: chartsRef.current,
    importWarnings: warnings.length ? warnings : initial.importWarnings || [],
  });
  const model = () =>
    live
      ? normalizeLiveWorkbook(rawModel(), liveBase.current.workbook.styles)
      : rawModel();
  useEffect(() => {
    let timer;
    let disposed = false;
    let listener;
    let guard, remoteListener;
    let applyingRemote = false;
    const container = document.createElement("div");
    container.style.height = "100%";
    container.style.width = "100%";
    host.current.appendChild(container);
    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(
          SheetsEnUS,
          ValidationEnUS,
          ConditionalEnUS,
          FilterEnUS,
          SortEnUS,
          FindEnUS,
        ),
      },
      presets: [
        UniverSheetsCorePreset({
          container,
          header: true,
          toolbar: true,
          footer: true,
          formulaBar: true,
        }),
        UniverSheetsDataValidationPreset(),
        UniverSheetsConditionalFormattingPreset(),
        UniverSheetsFilterPreset(),
        UniverSheetsSortPreset(),
        UniverSheetsFindReplacePreset(),
      ],
    });
    // Live checkpoints may contain cached results from an earlier client.
    // Recompute formulas from the saved inputs when opening the workbook.
    univerAPI
      .getFormula()
      .setInitialFormulaComputing(extension === "xlsx" ? 1 : 0);
    const workbook = univerAPI.createWorkbook(initial.workbook);
    instance.current = { univer, univerAPI, workbook };
    const start = async () => {
      if (!editable) await workbook.getWorkbookPermission().setMode("viewer");
      if (disposed) return;
      if (live) {
        // Live coordinates remain stable. Structural edits are available in the
        // ordinary editor after all participants leave the live session.
        guard = workbook.onBeforeCommandExecute((command) => {
          const advancedRule =
            command.id.includes(".command.") &&
            /(datavalidation|conditionalformat|definedname|namedrange|setworksheetname|setsheetname|pivot|filter)/.test(
              command.id.toLowerCase().replace(/[^a-z]/g, ""),
            );
          if (
            !applyingRemote &&
            (advancedRule ||
              /(insert|remove|delete|move|reorder|merge|sort|undo|redo|rename-sheet|add-sheet)/i.test(
                command.id,
              )) &&
            /sheets?\./.test(command.id)
          ) {
            setError(
              "Live sessions support cells, formatting, and EAC charts. Make structural changes, rules, filters, named ranges, and grid undo in the ordinary editor after leaving the live session.",
            );
            throw new Error(
              "Structural edit blocked during live collaboration",
            );
          }
        });
        remoteListener = (_event, transaction) => {
          if (transaction.origin === "local-editor") return;
          clearTimeout(timer);
          // Flush a queued local snapshot before applying remote cell updates.
          const local = normalizeLiveWorkbook(
            {
              ...liveBase.current,
              workbook: workbook.save(),
              charts: chartsRef.current,
            },
            liveBase.current.workbook.styles,
          );
          if (editable) patchModel(live.doc, liveBase.current, local);
          const next = readModel(live.doc);
          try {
            validateWorkbook(next);
          } catch (e) {
            setError("Live update rejected: " + e.message);
            return;
          }
          const before = workbook.save();
          applyingRemote = true;
          try {
            for (const [id, sheet] of Object.entries(next.workbook.sheets)) {
              const target = workbook.getSheetBySheetId(id);
              if (!target) continue;
              const old = before.sheets[id]?.cellData || {};
              const cells = sheet.cellData || {};
              for (const row of new Set([
                ...Object.keys(old),
                ...Object.keys(cells),
              ]))
                for (const col of new Set([
                  ...Object.keys(old[row] || {}),
                  ...Object.keys(cells[row] || {}),
                ])) {
                  if (
                    JSON.stringify(old[row]?.[col]) !==
                    JSON.stringify(cells[row]?.[col])
                  ) {
                    const cell = structuredClone(
                      cells[row]?.[col] || {
                        v: null,
                        f: null,
                        p: null,
                        s: null,
                      },
                    );
                    if (typeof cell.s === "string")
                      cell.s = next.workbook.styles?.[cell.s] || null;
                    univerAPI.syncExecuteCommand(SetRangeValuesMutation.id, {
                      unitId: workbook.getId(),
                      subUnitId: id,
                      cellValue: { [row]: { [col]: cell } },
                      isOverrideStyle: true,
                    });
                  }
                }
            }
            univerAPI.getFormula().executeCalculation();
            setCharts(next.charts || []);
            chartsRef.current = next.charts || [];
            setSnapshot(workbook.save());
            liveBase.current = normalizeLiveWorkbook(
              { ...next, workbook: workbook.save() },
              next.workbook.styles,
            );
          } finally {
            applyingRemote = false;
          }
        };
        live.doc.getMap("model").observe(remoteListener);
      }
      listener = workbook.onCommandExecuted((command) => {
        if (applyingRemote) return;
        if (!command.id.includes(".mutation.")) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (disposed) return;
          const next = workbook.save();
          setSnapshot(next);
          if (live && editable) {
            const model = normalizeLiveWorkbook(
              {
                ...liveBase.current,
                workbook: next,
                charts: chartsRef.current,
              },
              liveBase.current.workbook.styles,
            );
            patchModel(live.doc, liveBase.current, model);
            liveBase.current = model;
          }
          if (editable)
            changed.current(
              workbookBlob({
                format: "eac-workbook",
                schemaVersion: 1,
                workbook: next,
                charts: chartsRef.current,
                importWarnings: initial.importWarnings || [],
              }),
            );
        }, 500);
      });
    };
    start().catch((e) => setError(e.message));
    return () => {
      disposed = true;
      clearTimeout(timer);
      listener?.dispose();
      guard?.dispose();
      if (remoteListener) live.doc.getMap("model").unobserve(remoteListener);
      instance.current = null;
      queueMicrotask(() => {
        univer.dispose();
        container.remove();
      });
    };
  }, [initial, editable, live, extension]);
  const exportFile = async (type) => {
    try {
      const next = model();
      if (type === "xlsx")
        downloadBlob(
          await exportWorkbook(next),
          item.name.replace(/\.(eacsheet|xlsx|csv)$/i, "") + ".xlsx",
        );
      else
        downloadBlob(
          workbookCsv(
            next,
            instance.current.workbook.getActiveSheet().getSheetId(),
          ),
          item.name.replace(/\.(eacsheet|xlsx|csv)$/i, "") + ".csv",
        );
    } catch (e) {
      setError(e.message);
    }
  };
  const updateCharts = (next) => {
    setCharts(next);
    chartsRef.current = next;
    const updated = { ...model(), charts: next };
    if (live) {
      patchModel(live.doc, liveBase.current, updated);
      liveBase.current = updated;
    }
    onChange(workbookBlob(updated));
  };
  return (
    <>
      {imported && (
        <div className="fm-compat">
          {extension === "xlsx"
            ? "Original XLSX mode: edit existing cell values or formulas using the cell editor below, then Save. The original package retains charts, images, styles, other sheets and advanced features. The browser grid is a simplified preview; structure and formatting changes must be made in Excel. Shared/array formulas are protected from replacement."
            : "Edit CSV values using the cell editor below, then Save to the same CSV file."}
        </div>
      )}
      <div className="fm-editor-toolbar">
        <strong>EAC Spreadsheet</strong>
        <button onClick={() => setTableView((value) => !value)}>
          {tableView ? "Grid view" : "All data (table)"}
        </button>
        <span style={{ flex: 1 }} />
        {!imported && (
          <button onClick={() => exportFile("xlsx")}>
            <Download size={15} />
            Export XLSX
          </button>
        )}
        <button onClick={() => exportFile("csv")}>
          <Download size={15} />
          Export CSV
        </button>
        {!imported && (
          <>
            <input
              aria-label="Chart source range"
              placeholder="A1:B10"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              style={{ maxWidth: 105 }}
            />
            <select
              aria-label="Chart type"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
            >
              {["bar", "line", "pie", "area", "scatter"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              disabled={!editable}
              onClick={() => {
                if (!/^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/i.test(range)) {
                  setError("Use a two-column cell range such as A1:B10.");
                  return;
                }
                updateCharts([
                  ...charts,
                  {
                    id: crypto.randomUUID(),
                    sheetId: instance.current.workbook
                      .getActiveSheet()
                      .getSheetId(),
                    range,
                    type: chartType,
                  },
                ]);
              }}
            >
              <Plus size={15} />
              Chart
            </button>
          </>
        )}
      </div>
      {!imported && (
        <div className="fm-compat">
          The grid supports native formulas and formatting. Excel macros,
          external data connections and full Excel compatibility are not
          supported. Charts below are saved in EAC format; XLSX export currently
          omits these charts and advanced rules.
        </div>
      )}
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      <form
        className="fm-editor-toolbar"
        aria-label="Accessible cell editor"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            (!editable && !originalEditable) ||
            !/^[A-Z]{1,3}[1-9]\d{0,6}$/i.test(address)
          )
            return;
          try {
            const target = instance.current.workbook
              .getActiveSheet()
              .getRange(address);
            const value =
              cellValue !== "" && Number.isFinite(Number(cellValue))
                ? Number(cellValue)
                : cellValue;
            if (originalEditable) {
              const active = instance.current.workbook.getActiveSheet();
              // Persist only explicit cell edits; the grid may normalize away
              // blank/styled cells or unsupported caches while previewing.
              const next = structuredClone(originalWorkbook.current);
              const column =
                [...address.match(/^[A-Z]+/)[0]].reduce(
                  (n, c) => n * 26 + c.charCodeAt(0) - 64,
                  0,
                ) - 1;
              const row = Number(address.match(/\d+$/)[0]) - 1;
              const data = next.sheets[active.getSheetId()].cellData;
              data[row] ||= {};
              const update = String(value).startsWith("=")
                ? { f: String(value), v: null, t: 2 }
                : { f: null, v: value, t: typeof value === "number" ? 2 : 1 };
              data[row][column] = { ...data[row][column], ...update };
              const result =
                extension === "xlsx"
                  ? await saveOriginalWorkbook(
                      await blob.arrayBuffer(),
                      initial.workbook,
                      next,
                    )
                  : new Blob(
                      [
                        workbookCsv(
                          { ...model(), workbook: next },
                          active.getSheetId(),
                        ),
                      ],
                      { type: "text/csv" },
                    );
              originalWorkbook.current = next;
              setOriginalData(next);
              instance.current.univerAPI.syncExecuteCommand(
                SetRangeValuesMutation.id,
                {
                  unitId: instance.current.workbook.getId(),
                  subUnitId: active.getSheetId(),
                  cellValue: { [row]: { [column]: update } },
                },
              );
              instance.current.univerAPI.getFormula().executeCalculation();
              onChange(result);
              setError("");
            } else target.setValue(value);
            setTimeout(
              () => setCalculated(String(target.getValue() ?? "")),
              700,
            );
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <label>
          Cell{" "}
          <input
            aria-label="Cell address"
            style={{ width: 90 }}
            value={address}
            onChange={(e) => setAddress(e.target.value.toUpperCase())}
          />
        </label>
        <label
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}
        >
          fx{" "}
          <input
            aria-label="Cell value or formula"
            style={{ width: "100%" }}
            disabled={!editable && !originalEditable}
            value={cellValue}
            onChange={(e) => setCellValue(e.target.value)}
          />
        </label>
        <button disabled={!editable && !originalEditable}>Set cell</button>
        <button
          type="button"
          onClick={() => {
            try {
              const sheet = instance.current.workbook.getActiveSheet();
              const target = sheet.getRange(address);
              target.activate();
              sheet.scrollToCell(target.getRow(), target.getColumn());
              setCalculated(String(target.getValue() ?? ""));
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Go to cell
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              const target = instance.current.workbook
                .getActiveSheet()
                .getRange(address);
              setCalculated(String(target.getValue() ?? ""));
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          Read result
        </button>
        <output aria-label="Calculated cell result">{calculated}</output>
      </form>
      {tableView && (
        <WorkbookTable
          workbook={
            imported
              ? originalData
              : instance.current?.workbook.save() || snapshot
          }
        />
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: tableView ? "none" : "flex",
          flexDirection: "column",
        }}
      >
        <div
          ref={host}
          className="fm-sheet-host"
          style={{ flex: 1, minHeight: charts.length ? 400 : 500 }}
        />
        {charts.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 15,
              padding: 15,
              background: "#f1f4f9",
            }}
          >
            {charts.map((chart) => (
              <article
                key={chart.id}
                style={{ padding: 15, background: "white", borderRadius: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <strong>
                    {snapshot.sheets[chart.sheetId]?.name} · {chart.range}
                  </strong>
                  <button
                    disabled={!editable}
                    aria-label="Remove chart"
                    onClick={() =>
                      updateCharts(charts.filter((c) => c.id !== chart.id))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <WorkbookChart snapshot={snapshot} chart={chart} />
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
