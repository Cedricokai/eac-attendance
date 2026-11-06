import { officeArchive } from "./archiveSafety.js";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const decode = (value) =>
  value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity[0] === "#")
      return String.fromCodePoint(
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : Number(entity.slice(1)),
      );
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[entity];
  });
const escape = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const paragraphs = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
const texts = /<w:t\b([^>]*)>([\s\S]*?)<\/w:t>/g;
const docPart =
  /^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/;

export async function openOriginalDocx(buffer) {
  const zip = await officeArchive(buffer);
  if (!zip.file("word/document.xml"))
    throw new Error("This is not a supported DOCX package.");
  if (Object.keys(zip.files).some((p) => p.startsWith("_xmlsignatures/")))
    throw new Error(
      "This document is digitally signed. Editing would invalidate its signature; download it to edit in Word.",
    );
  const blocks = [];
  for (const path of Object.keys(zip.files).filter((p) => docPart.test(p))) {
    const xml = await zip.file(path).async("string");
    if (/<!DOCTYPE|<!ENTITY/i.test(xml))
      throw new Error("Unsupported XML declaration in document.");
    let index = 0;
    for (const match of xml.matchAll(paragraphs)) {
      const content = [...match[0].matchAll(texts)]
        .map((t) => decode(t[2]))
        .join("");
      if (content)
        blocks.push({ id: `${path}:${index}`, part: path, text: content });
      index++;
    }
  }
  if (blocks.length > 10000)
    throw new Error("Document exceeds the text-editing limit.");
  return { blocks };
}

// Patch only selected text nodes in the original package. No HTML-to-DOCX
// conversion: drawings, relationships, styles, fields and untouched XML survive.
export async function saveOriginalDocx(buffer, edits) {
  const zip = await officeArchive(buffer);
  const known = await openOriginalDocx(buffer);
  const allowed = new Set(known.blocks.map((b) => b.id));
  for (const [id, value] of Object.entries(edits)) {
    if (!allowed.has(id)) throw new Error("Unknown document text section.");
    if (
      typeof value !== "string" ||
      [...value].some((c) => c.codePointAt(0) < 32 && c !== "\t")
    )
      throw new Error(
        "Edit one existing paragraph at a time; paragraph breaks and control characters are not supported.",
      );
  }
  for (const path of new Set(
    Object.keys(edits).map((id) => id.slice(0, id.lastIndexOf(":"))),
  )) {
    let index = 0;
    const original = await zip.file(path).async("string");
    const updated = original.replace(paragraphs, (paragraph) => {
      const id = `${path}:${index++}`;
      if (!Object.hasOwn(edits, id)) return paragraph;
      const runs = [...paragraph.matchAll(texts)];
      if (runs.map((r) => decode(r[2])).join("") === edits[id])
        return paragraph;
      let offset = 0,
        runIndex = 0;
      return paragraph.replace(texts, (whole, attrs, value) => {
        const length =
          runIndex++ === runs.length - 1
            ? edits[id].length - offset
            : decode(value).length;
        const next = edits[id].slice(offset, offset + length);
        offset += length;
        const safeAttrs = /\bxml:space\s*=/.test(attrs)
          ? attrs.replace(
              /xml:space\s*=\s*["'][^"']*["']/,
              'xml:space="preserve"',
            )
          : attrs + ' xml:space="preserve"';
        return `<w:t${safeAttrs}>${escape(next)}</w:t>`;
      });
    });
    if (updated !== original) zip.file(path, updated);
  }
  return new Blob([await zip.generateAsync({ type: "uint8array" })], {
    type: DOCX_MIME,
  });
}

// External links are removed from the preview copy only. Saved originals retain
// their relationships; rendering must never fetch external document resources.
export async function docxPreviewBuffer(buffer) {
  const zip = await officeArchive(buffer);
  for (const path of Object.keys(zip.files).filter((p) =>
    p.endsWith(".rels"),
  )) {
    const xml = await zip.file(path).async("string");
    zip.file(
      path,
      xml.replace(
        /<Relationship\b(?=[^>]*\bTargetMode\s*=\s*["']External["'])[^>]*\/?>(?:<\/Relationship>)?/gi,
        "",
      ),
    );
  }
  return zip.generateAsync({ type: "uint8array" });
}

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:]+)\s*=\s*(["'])(.*?)\2/g)].map((m) => [
      m[1],
      decode(m[3]),
    ]),
  );
const columnName = (index) => {
  let value = "";
  for (let n = index + 1; n; n = Math.floor((n - 1) / 26))
    value = String.fromCharCode(65 + ((n - 1) % 26)) + value;
  return value;
};
const columnIndex = (address) =>
  [...address.match(/^[A-Z]+/)[0]].reduce(
    (n, c) => n * 26 + c.charCodeAt(0) - 64,
    0,
  );

export async function saveOriginalWorkbook(buffer, initial, next) {
  const zip = await officeArchive(buffer);
  if (Object.keys(zip.files).some((p) => p.startsWith("_xmlsignatures/")))
    throw new Error("Signed workbooks must be edited in Excel.");
  const book = await zip.file("xl/workbook.xml")?.async("string");
  const rels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!book || !rels) throw new Error("Invalid XLSX package.");
  const targets = Object.fromEntries(
    [...rels.matchAll(/<Relationship\b[^>]*\/?\s*>/g)].map((m) => {
      const a = attributes(m[0]);
      return [a.Id, a.Target];
    }),
  );
  const sheets = Object.fromEntries(
    [...book.matchAll(/<sheet\b[^>]*\/?\s*>/g)].map((m) => {
      const a = attributes(m[0]);
      return [a.name, targets[a["r:id"]]];
    }),
  );
  if (JSON.stringify(initial.sheetOrder) !== JSON.stringify(next.sheetOrder))
    throw new Error(
      "Original XLSX mode preserves sheet structure. Edit existing cells; use Excel for structural changes.",
    );
  for (const id of initial.sheetOrder) {
    const before = initial.sheets[id],
      after = next.sheets[id];
    if (!after || before.name !== after.name)
      throw new Error("Original XLSX sheet structure cannot be changed here.");
    const edits = [];
    for (const row of new Set([
      ...Object.keys(before.cellData || {}),
      ...Object.keys(after.cellData || {}),
    ])) {
      for (const col of new Set([
        ...Object.keys(before.cellData?.[row] || {}),
        ...Object.keys(after.cellData?.[row] || {}),
      ])) {
        const a = before.cellData?.[row]?.[col] || {},
          b = after.cellData?.[row]?.[col] || {};
        // Formula caches are computed by clients, not user edits.
        if (
          (a.f || "") === (b.f || "") &&
          (a.f || JSON.stringify(a.v ?? null) === JSON.stringify(b.v ?? null))
        )
          continue;
        edits.push({
          row: Number(row) + 1,
          address: columnName(Number(col)) + (Number(row) + 1),
          cell: b,
        });
      }
    }
    if (!edits.length) continue;
    const target = sheets[before.name];
    const path = target?.startsWith("/")
      ? target.slice(1)
      : target?.startsWith("xl/")
        ? target
        : `xl/${target}`;
    if (!target || path.includes("..") || !zip.file(path))
      throw new Error("Unsupported worksheet relationship.");
    let xml = await zip.file(path).async("string");
    for (const { row, address, cell } of edits) {
      let found = false;
      const replacement = (old = "") => {
        if (
          typeof cell.v === "string" &&
          [...cell.v].some(
            (c) => c.codePointAt(0) < 32 && !["\t", "\r", "\n"].includes(c),
          )
        )
          throw new Error("Cell text contains unsupported control characters.");
        if (/<f\b[^>]*\bt\s*=\s*["'](?:shared|array|dataTable)["']/.test(old))
          throw new Error(
            `Cell ${address} uses a shared or array formula. Edit it in Excel to preserve its calculation group.`,
          );
        const opening = old.match(/^<c\b[^>]*>/)?.[0] || `<c r="${address}">`;
        let tag = opening
          .replace(/\s+t\s*=\s*(["']).*?\1/, "")
          .replace(/\s*\/>$/, ">");
        const extras = old
          .replace(/^<c\b[^>]*>/, "")
          .replace(/<\/c>$/, "")
          .replace(
            /<(f|v|is)\b[^>]*>[\s\S]*?<\/\1>|<(?:f|v|is)\b[^>]*\/>/g,
            "",
          );
        let content = "";
        if (cell.f) {
          if (
            cell.f.length > 8192 ||
            /(?:https?:|file:|\\\\|\||\[[^\]]+\]|WEBSERVICE\s*\(|HYPERLINK\s*\()/i.test(
              cell.f,
            )
          )
            throw new Error("External formulas are not supported.");
          content = `<f>${escape(cell.f.replace(/^=/, ""))}</f>`;
        } else if (typeof cell.v === "number" && Number.isFinite(cell.v))
          content = `<v>${cell.v}</v>`;
        else if (typeof cell.v === "boolean") {
          tag = tag.replace(/>$/, ' t="b">');
          content = `<v>${cell.v ? 1 : 0}</v>`;
        } else if (cell.v != null && cell.v !== "") {
          tag = tag.replace(/>$/, ' t="inlineStr">');
          content = `<is><t xml:space="preserve">${escape(String(cell.v))}</t></is>`;
        }
        return `${tag}${content}${extras}</c>`;
      };
      xml = xml.replace(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g, (c) => {
        if (attributes(c.match(/^<c\b[^>]*>/)[0]).r !== address) return c;
        found = true;
        return replacement(c);
      });
      if (!found) {
        let rowFound = false;
        xml = xml.replace(/<row\b[^>]*(?:\/>|>[\s\S]*?<\/row>)/g, (r) => {
          if (Number(attributes(r.match(/^<row\b[^>]*>/)[0]).r) !== row)
            return r;
          rowFound = true;
          const cellXml = replacement();
          if (r.endsWith("/>")) return r.replace(/\/>$/, `>${cellXml}</row>`);
          let inserted = false;
          const result = r.replace(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g, (c) => {
            const ref = attributes(c.match(/^<c\b[^>]*>/)[0]).r;
            if (!inserted && ref && columnIndex(ref) > columnIndex(address)) {
              inserted = true;
              return cellXml + c;
            }
            return c;
          });
          return inserted
            ? result
            : result.replace("</row>", cellXml + "</row>");
        });
        if (!rowFound)
          throw new Error(
            `Row ${row} is outside the original worksheet rows. Add rows in Excel; existing document structure is preserved here.`,
          );
      }
    }
    zip.file(path, xml);
  }
  // Excel recalculates caches while keeping unrelated calculation/package parts.
  if (/<calcPr\b/.test(book))
    zip.file(
      "xl/workbook.xml",
      book.replace(/<calcPr\b[^>]*\/?\s*>/, (tag) =>
        tag
          .replace(
            /\s+(?:fullCalcOnLoad|forceFullCalc|calcMode)\s*=\s*(["']).*?\1/g,
            "",
          )
          .replace(
            /(\/?\s*>)$/,
            ' fullCalcOnLoad="1" forceFullCalc="1" calcMode="auto"$1',
          ),
      ),
    );
  else
    zip.file(
      "xl/workbook.xml",
      book.replace(
        "</workbook>",
        '<calcPr fullCalcOnLoad="1" forceFullCalc="1" calcMode="auto"/></workbook>',
      ),
    );
  return new Blob([await zip.generateAsync({ type: "uint8array" })], {
    type: XLSX_MIME,
  });
}
