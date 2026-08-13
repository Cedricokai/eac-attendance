import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const filePath = "C:/Users/EAC_PC/Documents/PAYROLLS JULY/Payroll-Records-AHAFO NORTH JULY PAYROLL-2026-07-31 NEW.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(filePath));

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 5000 });
console.log("SHEETS\n" + sheets.ndjson);
for (const term of ["Foster", "Daniel", "Kyeremeh"]) {
  const found = await workbook.inspect({
    kind: "match",
    searchTerm: term,
    options: { useRegex: false, maxResults: 50 },
    maxChars: 12000,
  });
  console.log(`MATCH ${term}\n${found.ndjson}`);
}

const table = await workbook.inspect({
  kind: "table",
  sheetId: "Payroll Records",
  range: "A1:AN6",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 50,
  maxChars: 30000,
});
console.log("TABLE\n" + table.ndjson);

const formulas = await workbook.inspect({
  kind: "formula",
  sheetId: "Payroll Records",
  range: "A1:AN6",
  options: { maxResults: 200 },
  maxChars: 30000,
});
console.log("FORMULAS\n" + formulas.ndjson);
