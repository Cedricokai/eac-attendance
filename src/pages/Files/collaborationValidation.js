import { sanitizeDocument } from "./editors/documentFormat.js";
import { validateWorkbook } from "./editors/workbookFormat.js";
import { sanitizePresentation } from "./editors/presentationFormat.js";
export function validateLiveModel(model, format) {
  if (model?.format !== format || model.schemaVersion !== 1)
    throw new Error("The saved file is not a supported native EAC document.");
  if (format === "eac-document") return sanitizeDocument(model);
  if (format === "eac-workbook") return validateWorkbook(model);
  if (format === "eac-presentation") return sanitizePresentation(model);
  throw new Error("Unsupported live document format.");
}
