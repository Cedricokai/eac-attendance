export const documentMime = "application/vnd.eac.document+json";
export const emptyDocument = () => ({
  format: "eac-document",
  schemaVersion: 1,
  content: { type: "doc", content: [{ type: "paragraph" }] },
  layout: {
    size: "A4",
    landscape: false,
    margin: 20,
    background: "#ffffff",
    header: "",
    footer: "",
    pageNumbers: false,
  },
});
export const documentBlob = (model) =>
  new Blob([JSON.stringify(model)], { type: documentMime });
export function sanitizeDocument(model) {
  const cleanNode = (node, depth = 0) => {
    if (!node || depth > 100)
      throw new Error("Document structure is too deeply nested.");
    const result = { type: node.type };
    if (typeof node.text === "string") result.text = node.text;
    if (node.attrs) {
      result.attrs = {};
      for (const key of [
        "level",
        "colspan",
        "rowspan",
        "width",
        "height",
        "lineHeight",
        "paragraphSpacing",
        "indent",
      ])
        if (Number.isFinite(Number(node.attrs[key])))
          result.attrs[key] = Math.max(
            0,
            Math.min(10000, Number(node.attrs[key])),
          );
      if (Array.isArray(node.attrs.colwidth))
        result.attrs.colwidth = node.attrs.colwidth.map((v) =>
          Math.max(1, Math.min(2000, Number(v) || 100)),
        );
      if (["left", "center", "right", "justify"].includes(node.attrs.textAlign))
        result.attrs.textAlign = node.attrs.textAlign;
      if (node.type === "image") {
        if (
          !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(
            node.attrs.src || "",
          )
        )
          return null;
        result.attrs.src = node.attrs.src;
        result.attrs.alt = String(node.attrs.alt || "").slice(0, 300);
      }
    }
    if (node.marks)
      result.marks = node.marks.flatMap((mark) => {
        if (
          [
            "bold",
            "italic",
            "underline",
            "strike",
            "subscript",
            "superscript",
            "code",
          ].includes(mark.type)
        )
          return [{ type: mark.type }];
        if (
          mark.type === "link" &&
          /^(https?:\/\/|mailto:)/i.test(mark.attrs?.href || "")
        )
          return [
            {
              type: "link",
              attrs: {
                href: mark.attrs.href,
                target: "_blank",
                rel: "noopener noreferrer",
              },
            },
          ];
        if (mark.type === "highlight")
          return [
            {
              type: "highlight",
              attrs: {
                color: /^#[a-f\d]{6}$/i.test(mark.attrs?.color)
                  ? mark.attrs.color
                  : "#fff59d",
              },
            },
          ];
        if (mark.type === "textStyle") {
          const attrs = {};
          if (/^#[a-f\d]{6}$/i.test(mark.attrs?.color))
            attrs.color = mark.attrs.color;
          if (/^[a-zA-Z ,'-]{1,80}$/.test(mark.attrs?.fontFamily || ""))
            attrs.fontFamily = mark.attrs.fontFamily;
          if (/^\d{1,3}(px|pt)$/.test(mark.attrs?.fontSize || ""))
            attrs.fontSize = mark.attrs.fontSize;
          return [{ type: "textStyle", attrs }];
        }
        return [];
      });
    if (Array.isArray(node.content))
      result.content = node.content
        .map((n) => cleanNode(n, depth + 1))
        .filter(Boolean);
    return result;
  };
  const base = emptyDocument().layout;
  const source = model.layout || {};
  return {
    ...emptyDocument(),
    content: cleanNode(model.content),
    layout: {
      ...base,
      size: source.size === "Letter" ? "Letter" : "A4",
      landscape: source.landscape === true,
      margin: Math.max(5, Math.min(50, Number(source.margin) || 20)),
      background: /^#[a-f\d]{6}$/i.test(source.background)
        ? source.background
        : "#ffffff",
      header: String(source.header || "").slice(0, 1000),
      footer: String(source.footer || "").slice(0, 1000),
      pageNumbers: source.pageNumbers === true,
    },
  };
}

export async function importDocument(blob, extension) {
  if (blob.size > 20 * 1024 * 1024)
    throw new Error(
      "The document editor supports files up to 20 MB. Download larger documents to edit them.",
    );
  if (extension === "eacdoc") {
    const model = JSON.parse(await blob.text());
    if (
      model.format !== "eac-document" ||
      model.schemaVersion !== 1 ||
      model.content?.type !== "doc"
    )
      throw new Error(
        "Unsupported EAC document format. Download the original for safekeeping.",
      );
    return { model: sanitizeDocument(model), warnings: [] };
  }
  const [{ default: mammoth }, { default: DOMPurify }, { default: JSZip }] =
    await Promise.all([
      import("mammoth/mammoth.browser"),
      import("dompurify"),
      import("jszip"),
    ]);
  const arrayBuffer = await blob.arrayBuffer();
  const archive = checkArchive(await JSZip.loadAsync(arrayBuffer));
  const complex = Object.keys(archive.files).filter((name) =>
    /word\/(charts|embeddings|header|footer|comments|footnotes|endnotes)|vbaProject|customXml/i.test(
      name,
    ),
  );
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const clean = DOMPurify.sanitize(result.value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
  });
  const document = new DOMParser().parseFromString(clean, "text/html");
  document.querySelectorAll("img").forEach((image) => {
    if (
      !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(
        image.getAttribute("src") || "",
      )
    )
      image.remove();
  });
  return {
    model: { ...emptyDocument(), content: document.body.innerHTML },
    warnings: [
      "DOCX import converts supported text, tables, links and images. Page layout, track changes, fields, drawings and advanced formatting can change. The original is preserved.",
      ...(complex.length
        ? [
            "This file contains headers, notes, charts or embedded content that will not be preserved in the editable copy.",
          ]
        : []),
      ...result.messages.map((m) => m.message),
    ],
  };
}

export async function exportDocx(model) {
  const d = await import("docx");
  const alignment = {
    left: d.AlignmentType.LEFT,
    center: d.AlignmentType.CENTER,
    right: d.AlignmentType.RIGHT,
    justify: d.AlignmentType.JUSTIFIED,
  };
  const marks = (node) =>
    Object.fromEntries(
      (node.marks || []).map((mark) => [mark.type, mark.attrs || true]),
    );
  const textRun = (node) => {
    const m = marks(node);
    const style = m.textStyle || {};
    const options = {
      text: node.text || "",
      bold: !!m.bold,
      italics: !!m.italic,
      strike: !!m.strike,
      underline: m.underline ? {} : undefined,
      superScript: !!m.superscript,
      subScript: !!m.subscript,
      color: style.color?.replace("#", ""),
      font: style.fontFamily,
      size: style.fontSize ? Number.parseFloat(style.fontSize) * 2 : undefined,
      shading: m.highlight
        ? { fill: (m.highlight.color || "#fff59d").replace("#", "") }
        : undefined,
    };
    const run = new d.TextRun(options);
    const link = m.link?.href;
    return link && /^(https?:|mailto:)/i.test(link)
      ? new d.ExternalHyperlink({ link, children: [run] })
      : run;
  };
  const inline = (node) => {
    if (node.type === "text") return textRun(node);
    if (node.type === "hardBreak") return new d.TextRun({ break: 1 });
    if (
      node.type === "image" &&
      /^data:image\/(png|jpeg|gif);base64,/i.test(node.attrs?.src || "")
    ) {
      const [head, data] = node.attrs.src.split(",");
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      return new d.ImageRun({
        type: head.includes("jpeg")
          ? "jpg"
          : head.includes("gif")
            ? "gif"
            : "png",
        data: bytes,
        transformation: {
          width: Math.min(600, Number(node.attrs.width) || 400),
          height: Number(node.attrs.height) || 260,
        },
      });
    }
    return new d.TextRun("");
  };
  const blocks = (nodes, list) =>
    nodes.flatMap((node) => {
      if (node.type === "bulletList" || node.type === "orderedList")
        return blocks(node.content || [], node.type);
      if (node.type === "listItem") return blocks(node.content || [], list);
      if (node.type === "blockquote")
        return blocks(node.content || []).map((p) => p);
      if (node.type === "table")
        return [
          new d.Table({
            width: { size: 100, type: d.WidthType.PERCENTAGE },
            rows: (node.content || []).map(
              (row) =>
                new d.TableRow({
                  children: (row.content || []).map(
                    (cell) =>
                      new d.TableCell({
                        columnSpan: cell.attrs?.colspan || 1,
                        rowSpan: cell.attrs?.rowspan || 1,
                        shading:
                          cell.type === "tableHeader"
                            ? { fill: "EEF2F8" }
                            : undefined,
                        children: blocks(
                          cell.content || [{ type: "paragraph" }],
                        ),
                      }),
                  ),
                }),
            ),
          }),
        ];
      if (node.type === "pageBreak")
        return [new d.Paragraph({ children: [new d.PageBreak()] })];
      if (node.type === "horizontalRule")
        return [
          new d.Paragraph({
            border: {
              bottom: { color: "BCC8DB", style: d.BorderStyle.SINGLE, size: 6 },
            },
          }),
        ];
      if (node.type === "image")
        return [new d.Paragraph({ children: [inline(node)] })];
      const attrs = node.attrs || {};
      return [
        new d.Paragraph({
          children: (node.content || []).map(inline),
          heading:
            node.type === "heading"
              ? [
                  d.HeadingLevel.HEADING_1,
                  d.HeadingLevel.HEADING_2,
                  d.HeadingLevel.HEADING_3,
                ][(attrs.level || 1) - 1]
              : undefined,
          alignment: alignment[attrs.textAlign || "left"],
          bullet: list === "bulletList" ? { level: 0 } : undefined,
          numbering:
            list === "orderedList"
              ? { reference: "eac-numbered", level: 0 }
              : undefined,
          indent: { left: Math.max(0, Number(attrs.indent) || 0) * 360 },
          spacing: {
            after: Math.round((Number(attrs.paragraphSpacing) || 8) * 20),
            line: Math.round((Number(attrs.lineHeight) || 1.5) * 240),
          },
        }),
      ];
    });
  const layout = model.layout;
  const mm = (value) => Math.round(Number(value) * 56.6929);
  const [width, height] =
    layout.size === "Letter" ? [215.9, 279.4] : [210, 297];
  const doc = new d.Document({
    creator: "EAC",
    title: "EAC Document",
    numbering: {
      config: [
        {
          reference: "eac-numbered",
          levels: [
            {
              level: 0,
              format: d.LevelFormat.DECIMAL,
              text: "%1.",
              alignment: d.AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: mm(layout.landscape ? height : width),
              height: mm(layout.landscape ? width : height),
            },
            margin: {
              top: mm(layout.margin),
              bottom: mm(layout.margin),
              left: mm(layout.margin),
              right: mm(layout.margin),
            },
          },
        },
        headers: {
          default: new d.Header({
            children: [new d.Paragraph(layout.header || "")],
          }),
        },
        footers: {
          default: new d.Footer({
            children: [
              new d.Paragraph({
                children: [
                  new d.TextRun(layout.footer || ""),
                  ...(layout.pageNumbers
                    ? [
                        new d.TextRun({
                          children: ["  ", d.PageNumber.CURRENT],
                        }),
                      ]
                    : []),
                ],
              }),
            ],
          }),
        },
        children: blocks(model.content.content || []),
      },
    ],
  });
  return d.Packer.toBlob(doc);
}
import { checkArchive } from "./archiveSafety.js";
