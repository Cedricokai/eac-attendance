import { officeArchive } from "./archiveSafety.js";
export const workbookMime = "application/vnd.eac.spreadsheet+json";
export function validateWorkbook(model) {
  if (
    model.format !== "eac-workbook" ||
    model.schemaVersion !== 1 ||
    !model.workbook?.sheets
  )
    throw new Error("Unsupported EAC workbook format");
  const sheets = Object.values(model.workbook.sheets);
  if (!sheets.length)
    throw new Error("A workbook must contain at least one worksheet.");
  if (
    !Array.isArray(model.workbook.sheetOrder) ||
    new Set(model.workbook.sheetOrder).size !== sheets.length ||
    model.workbook.sheetOrder.some(
      (id) => !Object.hasOwn(model.workbook.sheets, id),
    )
  )
    throw new Error("Invalid worksheet order.");
  let count = 0;
  for (const sheet of sheets) {
    if (
      !Number.isInteger(sheet.rowCount) ||
      sheet.rowCount < 1 ||
      sheet.rowCount > 1048576 ||
      !Number.isInteger(sheet.columnCount) ||
      sheet.columnCount < 1 ||
      sheet.columnCount > 16384
    )
      throw new Error(
        "Workbook dimensions exceed Excel’s 1,048,576 rows or 16,384 columns.",
      );
    for (const [row, cells] of Object.entries(sheet.cellData || {})) {
      if (!/^\d+$/.test(row) || Number(row) >= sheet.rowCount)
        throw new Error("Invalid cell row.");
      for (const [column, cell] of Object.entries(cells || {})) {
        if (
          !/^\d+$/.test(column) ||
          Number(column) >= sheet.columnCount ||
          ++count > 2000000
        )
          throw new Error(
            "Workbook contains invalid coordinates or more than 2,000,000 cells.",
          );
        if (
          cell?.f &&
          (/(?:WEBSERVICE|IMPORTXML|IMPORTDATA|IMAGE|DDE)\s*\(/i.test(cell.f) ||
            /\[[^\]]+\]/.test(cell.f))
        )
          throw new Error(
            "External workbook or network formulas are not supported.",
          );
      }
    }
  }
  // Prevent object-prototype keys from entering the grid or collaboration maps.
  const visit = (value, depth = 0) => {
    if (depth > 50) throw new Error("Workbook structure is too deeply nested.");
    if (value && typeof value === "object")
      for (const [key, child] of Object.entries(value)) {
        if (["__proto__", "constructor", "prototype"].includes(key))
          throw new Error("Invalid workbook property.");
        visit(child, depth + 1);
      }
  };
  visit(model);
  return model;
}
export const blankWorkbook = (name = "Workbook") => ({
  format: "eac-workbook",
  schemaVersion: 1,
  workbook: {
    id: crypto.randomUUID(),
    name,
    appVersion: "1.0.0",
    locale: "enUS",
    styles: {},
    sheetOrder: ["sheet1"],
    sheets: {
      sheet1: {
        id: "sheet1",
        name: "Sheet1",
        rowCount: 1000,
        columnCount: 26,
        defaultColumnWidth: 100,
        defaultRowHeight: 24,
        cellData: {},
        rowData: {},
        columnData: {},
        mergeData: [],
      },
    },
  },
  charts: [],
});
export const workbookBlob = (model) =>
  new Blob([JSON.stringify(model)], { type: workbookMime });

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && (quoted || value === "")) {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(value);
      value = "";
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        rows.push(row);
        row = [];
      }
    } else value += c;
    if (rows.length > 1048576 || row.length > 16384)
      throw new Error("CSV exceeds Excel worksheet dimensions.");
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}
export function csvWorkbook(text) {
  const model = blankWorkbook();
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  let cells = 0;
  rows.forEach((row, r) =>
    row.forEach((value, c) => {
      if (++cells > 2000000) throw new Error("CSV exceeds 2,000,000 cells.");
      const numeric =
        value.trim() !== "" &&
        /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(value);
      (model.workbook.sheets.sheet1.cellData[r] ||= {})[c] = {
        v: numeric ? Number(value) : value,
        t: numeric ? 2 : 1,
      };
    }),
  );
  model.workbook.sheets.sheet1.rowCount = Math.min(
    1048576,
    Math.max(1000, rows.length + 50),
  );
  model.workbook.sheets.sheet1.columnCount = Math.max(
    26,
    ...rows.map((r) => r.length),
  );
  return model;
}
const rgb = (color) => (color?.argb ? "#" + color.argb.slice(-6) : undefined);
export async function importWorkbook(blob, extension) {
  if (blob.size > 20 * 1024 * 1024)
    throw new Error("The workbook editor supports imports up to 20 MB.");
  if (extension === "eacsheet") {
    const model = JSON.parse(await blob.text());
    if (
      model.format !== "eac-workbook" ||
      model.schemaVersion !== 1 ||
      !model.workbook?.sheets
    )
      throw new Error("Unsupported EAC workbook format");
    return { model: validateWorkbook(model), warnings: [] };
  }
  if (extension === "csv")
    return {
      model: csvWorkbook(await blob.text()),
      warnings: [
        "CSV stores one sheet of values. Formula-like strings remain text on import. Save an EAC copy for formulas, formatting and multiple sheets.",
      ],
    };
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const buffer = await blob.arrayBuffer();
  await officeArchive(buffer);
  await workbook.xlsx.load(buffer);
  const model = blankWorkbook();
  model.workbook.sheetOrder = [];
  model.workbook.sheets = {};
  let cells = 0;
  const warnings = [
    "XLSX conversion preserves supported values, formulas, basic styles, sizes and merges. Charts, drawings, macros, pivot tables, external links, validation and advanced formatting may not survive conversion. The original remains available.",
  ];
  workbook.eachSheet((sheet) => {
    if (sheet.rowCount > 1048576 || sheet.columnCount > 16384)
      throw new Error("Worksheet dimensions exceed the Excel file format.");
    const id = "sheet" + sheet.id;
    const data = {
      id,
      name: sheet.name,
      sourceRowCount: sheet.rowCount,
      sourceColumnCount: sheet.columnCount,
      rowCount: Math.min(1048576, Math.max(1000, sheet.rowCount + 50)),
      columnCount: Math.max(26, sheet.columnCount),
      defaultColumnWidth: 100,
      defaultRowHeight: 24,
      cellData: {},
      rowData: {},
      columnData: {},
      mergeData: [],
    };
    model.workbook.sheetOrder.push(id);
    model.workbook.sheets[id] = data;
    sheet.eachRow((row, r) => {
      if (row.height) data.rowData[r - 1] = { h: row.height * 1.3333 };
      row.eachCell((cell, c) => {
        if (++cells > 2000000)
          throw new Error("Workbook exceeds the 2,000,000-cell import limit.");
        if (cell.isMerged && cell.master.address !== cell.address) return;
        let value = cell.value;
        let formula;
        if (cell.formula) {
          formula = "=" + cell.formula;
          value = cell.result;
          if (
            /(?:WEBSERVICE|IMPORTXML|IMPORTDATA|IMAGE|DDE)\s*\(|\[[^\]]+\]|\|/i.test(
              formula,
            )
          ) {
            value = cell.result ?? formula;
            formula = undefined; // Preview cached values without executing external/structured formulas.
          }
        } else if (value?.richText)
          value = value.richText.map((part) => part.text).join("");
        else if (value?.hyperlink) value = value.text;
        else if (value?.error) value = value.error;
        if (value instanceof Date) value = value.getTime() / 86400000 + 25569;
        const font = cell.font || {};
        const fill = cell.fill;
        const alignment = cell.alignment || {};
        const style = {
          ff: font.name,
          fs: font.size,
          bl: font.bold ? 1 : 0,
          it: font.italic ? 1 : 0,
          ul: { s: font.underline ? 1 : 0 },
          st: { s: font.strike ? 1 : 0 },
          cl: rgb(font.color) ? { rgb: rgb(font.color) } : undefined,
          bg:
            fill?.type === "pattern" && rgb(fill.fgColor)
              ? { rgb: rgb(fill.fgColor) }
              : undefined,
          ht: { left: 1, center: 2, right: 3, justify: 4 }[
            alignment.horizontal
          ],
          vt: { top: 1, middle: 2, bottom: 3 }[alignment.vertical],
          tb: alignment.wrapText ? 3 : 0,
          n: cell.numFmt ? { pattern: cell.numFmt } : undefined,
        };
        (data.cellData[r - 1] ||= {})[c - 1] = {
          v: value ?? "",
          f: formula,
          t: typeof value === "number" ? 2 : typeof value === "boolean" ? 3 : 1,
          s: style,
        };
      });
    });
    sheet.columns?.forEach((column, c) => {
      if (column.width) data.columnData[c] = { w: column.width * 7 };
    });
    (sheet.model.merges || []).forEach((range) => {
      const [a, b = a] = range.split(":");
      const decode = (address) => {
        const [, letters, number] = address.match(/([A-Z]+)(\d+)/);
        let column = 0;
        for (const char of letters)
          column = column * 26 + char.charCodeAt(0) - 64;
        return [Number(number) - 1, column - 1];
      };
      const [sr, sc] = decode(a);
      const [er, ec] = decode(b);
      data.mergeData.push({
        startRow: sr,
        startColumn: sc,
        endRow: er,
        endColumn: ec,
      });
    });
  });
  return { model: validateWorkbook(model), warnings };
}
export function workbookCsv(model, sheetId) {
  const sheet = model.workbook.sheets[sheetId || model.workbook.sheetOrder[0]];
  const data = sheet.cellData || {};
  const rowKeys = Object.keys(data).map(Number);
  const rows = [];
  const lastRow = Math.max(0, ...rowKeys);
  const lastColumn = Math.max(
    0,
    ...Object.values(data).flatMap((row) => Object.keys(row).map(Number)),
  );
  if ((lastRow + 1) * (lastColumn + 1) > 2000000)
    throw new Error("CSV export exceeds two million cells.");
  for (let r = 0; r <= lastRow; r++) {
    const row = [];
    for (let c = 0; c <= lastColumn; c++) {
      const cell = data[r]?.[c];
      let value = cell?.v ?? "";
      if (typeof value === "string" && /^[=+@-]/.test(value))
        value = "'" + value;
      row.push('"' + String(value).replaceAll('"', '""') + '"');
    }
    rows.push(row.join(","));
  }
  return new Blob(["\uFEFF" + rows.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
}
export async function exportWorkbook(model) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EAC";
  workbook.calcProperties.fullCalcOnLoad = true;
  for (const id of model.workbook.sheetOrder) {
    const source = model.workbook.sheets[id];
    const sheet = workbook.addWorksheet(source.name);
    Object.entries(source.cellData || {}).forEach(([r, row]) =>
      Object.entries(row).forEach(([c, data]) => {
        const cell = sheet.getCell(Number(r) + 1, Number(c) + 1);
        cell.value = data.f
          ? { formula: data.f.replace(/^=/, ""), result: data.v ?? undefined }
          : (data.v ?? "");
        const style =
          typeof data.s === "string"
            ? model.workbook.styles[data.s] || {}
            : data.s || {};
        cell.font = {
          name: style.ff || "Calibri",
          size: style.fs || 11,
          bold: !!style.bl,
          italic: !!style.it,
          underline: style.ul?.s ? true : undefined,
          strike: !!style.st?.s,
          color: style.cl?.rgb
            ? { argb: "FF" + style.cl.rgb.replace("#", "") }
            : undefined,
        };
        if (style.bg?.rgb)
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF" + style.bg.rgb.replace("#", "") },
          };
        cell.alignment = {
          horizontal: { 1: "left", 2: "center", 3: "right", 4: "justify" }[
            style.ht
          ],
          vertical: { 1: "top", 2: "middle", 3: "bottom" }[style.vt],
          wrapText: style.tb === 3,
        };
        if (style.n?.pattern) cell.numFmt = style.n.pattern;
      }),
    );
    Object.entries(source.rowData || {}).forEach(([r, data]) => {
      if (data.h) sheet.getRow(Number(r) + 1).height = data.h / 1.3333;
    });
    Object.entries(source.columnData || {}).forEach(([c, data]) => {
      if (data.w) sheet.getColumn(Number(c) + 1).width = data.w / 7;
    });
    (source.mergeData || []).forEach((m) =>
      sheet.mergeCells(
        m.startRow + 1,
        m.startColumn + 1,
        m.endRow + 1,
        m.endColumn + 1,
      ),
    );
  }
  return new Blob([await workbook.xlsx.writeBuffer()], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
