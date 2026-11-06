export const presentationMime = "application/vnd.eac.presentation+json";
export const blankSlide = () => ({
  id: crypto.randomUUID(),
  background: "#ffffff",
  objects: [],
});
export const blankPresentation = () => ({
  format: "eac-presentation",
  schemaVersion: 1,
  width: 1280,
  height: 720,
  slides: [blankSlide()],
});
export const presentationBlob = (model) =>
  new Blob([JSON.stringify(model)], { type: presentationMime });
const safeColor = (value, fallback = "#202b3d") =>
  /^#[a-f\d]{6}$/i.test(value) ? value : fallback;
export function sanitizePresentation(input) {
  if (
    input.format !== "eac-presentation" ||
    input.schemaVersion !== 1 ||
    !Array.isArray(input.slides) ||
    !input.slides.length ||
    input.slides.length > 200
  )
    throw new Error("Unsupported presentation format or slide count.");
  const number = (value, fallback, min = 0, max = 10000) =>
    Number.isFinite(Number(value))
      ? Math.min(max, Math.max(min, Number(value)))
      : fallback;
  let count = 0;
  return {
    format: "eac-presentation",
    schemaVersion: 1,
    width: number(input.width, 1280, 64, 3840),
    height: number(input.height, 720, 64, 2160),
    importWarnings: input.importWarnings || [],
    slides: input.slides.map((slide) => ({
      id: String(slide.id || crypto.randomUUID()),
      background: safeColor(slide.background, "#ffffff"),
      objects: (slide.objects || []).flatMap((object) => {
        if (++count > 5000)
          throw new Error("Presentations are limited to 5,000 objects.");
        if (!["text", "rectangle", "ellipse", "image"].includes(object.type))
          return [];
        if (
          object.type === "image" &&
          !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(object.src || "")
        )
          return [];
        return [
          {
            id: String(object.id || crypto.randomUUID()),
            type: object.type,
            x: number(object.x, 50, -3840),
            y: number(object.y, 50, -2160),
            width: number(object.width, 250, 1),
            height: number(object.height, 80, 1),
            rotation: number(object.rotation, 0, -360, 360),
            text: String(object.text || "").slice(0, 100000),
            src: object.type === "image" ? object.src : undefined,
            color: safeColor(object.color),
            fill: safeColor(object.fill, "#e7eefb"),
            fontSize: number(object.fontSize, 32, 6, 300),
            fontFamily: /^[a-zA-Z ,'-]{1,80}$/.test(object.fontFamily || "")
              ? object.fontFamily
              : "Arial",
            bold: object.bold === true,
            italic: object.italic === true,
            align: ["left", "center", "right"].includes(object.align)
              ? object.align
              : "left",
          },
        ];
      }),
    })),
  };
}
export async function importPresentation(blob, extension) {
  if (blob.size > 20 * 1024 * 1024)
    throw new Error("Presentation imports are limited to 20 MB.");
  if (extension === "eacslides") {
    const model = sanitizePresentation(JSON.parse(await blob.text()));
    return { model, warnings: model.importWarnings || [] };
  }
  const { default: JSZip } = await import("jszip");
  const zip = checkArchive(await JSZip.loadAsync(await blob.arrayBuffer()));
  const xml = async (name) => {
    const file = zip.file(name);
    if (!file) return null;
    const text = await file.async("string");
    if (text.length > 5000000)
      throw new Error("An XML part exceeds the import safety limit.");
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror"))
      throw new Error("Invalid presentation XML.");
    return doc;
  };
  const descendants = (node, name) =>
    [...node.getElementsByTagName("*")].filter((n) => n.localName === name);
  const first = (node, name) => descendants(node, name)[0];
  const resolve = (base, path) => {
    const result = base.split("/").slice(0, -1);
    for (const part of path.split("/")) {
      if (part === "..") result.pop();
      else if (part !== ".") result.push(part);
    }
    return result.join("/").replace(/^\//, "");
  };
  const relationships = async (name) => {
    const doc = await xml(name);
    return doc
      ? Object.fromEntries(
          descendants(doc, "Relationship")
            .filter((n) => n.getAttribute("TargetMode") !== "External")
            .map((n) => [n.getAttribute("Id"), n.getAttribute("Target")]),
        )
      : {};
  };
  const presentation = await xml("ppt/presentation.xml");
  if (!presentation)
    throw new Error("No PowerPoint presentation found in this file.");
  const slideSize = first(presentation, "sldSz");
  const cx = Number(slideSize?.getAttribute("cx")) || 12192000;
  const cy = Number(slideSize?.getAttribute("cy")) || 6858000;
  const rels = await relationships("ppt/_rels/presentation.xml.rels");
  const model = blankPresentation();
  model.slides = [];
  model.height = Math.round((1280 * cy) / cx);
  const slideIds = descendants(presentation, "sldId");
  if (slideIds.length > 200)
    throw new Error("Imports are limited to 200 slides.");
  const warnings = [
    "PPTX import supports basic text boxes, rectangles, ellipses and embedded raster images. Themes, layouts, groups, charts, tables, animations and transitions are not fully preserved. The original is kept.",
  ];
  for (const id of slideIds) {
    const target = rels[id.getAttribute("r:id")];
    if (!target) continue;
    const path = resolve("ppt/presentation.xml", target);
    const doc = await xml(path);
    if (!doc) continue;
    const slide = blankSlide();
    const bg = first(doc, "bg");
    const bgColor = bg && first(bg, "srgbClr")?.getAttribute("val");
    if (bgColor) slide.background = "#" + bgColor;
    const slash = path.lastIndexOf("/");
    const slideRels = await relationships(
      path.slice(0, slash) + "/_rels/" + path.slice(slash + 1) + ".rels",
    );
    const tree = first(doc, "spTree");
    for (const shape of [...(tree?.children || [])]) {
      if (!["sp", "pic"].includes(shape.localName)) continue;
      const transform = first(shape, "xfrm");
      const offset = transform && first(transform, "off");
      const extent = transform && first(transform, "ext");
      if (!offset || !extent) continue;
      const base = {
        id: crypto.randomUUID(),
        x: (Number(offset.getAttribute("x")) / cx) * model.width,
        y: (Number(offset.getAttribute("y")) / cy) * model.height,
        width: (Number(extent.getAttribute("cx")) / cx) * model.width,
        height: (Number(extent.getAttribute("cy")) / cy) * model.height,
        rotation: Number(transform.getAttribute("rot") || 0) / 60000,
      };
      if (shape.localName === "pic") {
        const blip = first(shape, "blip");
        const imageTarget = slideRels[blip?.getAttribute("r:embed")];
        if (!imageTarget) continue;
        const imagePath = resolve(path, imageTarget);
        const file = zip.file(imagePath);
        if (!file || !/\.(png|jpe?g|gif|webp)$/i.test(imagePath)) continue;
        const ext = imagePath.split(".").pop().toLowerCase();
        slide.objects.push({
          ...base,
          type: "image",
          src: `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${await file.async("base64")}`,
        });
        continue;
      }
      const paragraphs = descendants(shape, "p");
      const text = paragraphs
        .map((p) =>
          descendants(p, "t")
            .map((t) => t.textContent)
            .join(""),
        )
        .join("\n");
      const run = first(shape, "rPr");
      const color = run && first(run, "srgbClr")?.getAttribute("val");
      const geometry = first(shape, "prstGeom")?.getAttribute("prst");
      const sp = first(shape, "spPr");
      const fill = sp && first(sp, "solidFill");
      const fillColor = fill && first(fill, "srgbClr")?.getAttribute("val");
      if (text)
        slide.objects.push({
          ...base,
          type: "text",
          text,
          fontSize:
            (((Number(run?.getAttribute("sz")) || 2400) / 100) * 96) / 72,
          bold: run?.getAttribute("b") === "1",
          italic: run?.getAttribute("i") === "1",
          color: color ? "#" + color : "#202b3d",
          fontFamily:
            (run && first(run, "latin")?.getAttribute("typeface")) || "Arial",
        });
      else if (geometry === "rect" || geometry === "ellipse")
        slide.objects.push({
          ...base,
          type: geometry === "rect" ? "rectangle" : "ellipse",
          fill: fillColor ? "#" + fillColor : "#e7eefb",
        });
    }
    model.slides.push(slide);
  }
  if (!model.slides.length)
    throw new Error(
      "No supported slides found. Download the original to open it in PowerPoint.",
    );
  model.importWarnings = warnings;
  return { model: sanitizePresentation(model), warnings };
}
export async function exportPresentation(model) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.defineLayout({
    name: "EAC",
    width: model.width / 96,
    height: model.height / 96,
  });
  pptx.layout = "EAC";
  pptx.author = "EAC";
  pptx.subject = "EAC Presentation";
  for (const source of model.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: source.background.replace("#", "") };
    for (const object of source.objects) {
      const geometry = {
        x: object.x / 96,
        y: object.y / 96,
        w: object.width / 96,
        h: object.height / 96,
        rotate: object.rotation || 0,
      };
      if (object.type === "text")
        slide.addText(object.text, {
          ...geometry,
          fontSize: ((object.fontSize || 32) * 72) / 96,
          fontFace: object.fontFamily || "Arial",
          bold: object.bold,
          italic: object.italic,
          color: (object.color || "#202b3d").replace("#", ""),
          align: object.align || "left",
          valign: "top",
          margin: 0,
          breakLine: false,
        });
      else if (object.type === "image")
        slide.addImage({ ...geometry, data: object.src });
      else
        slide.addShape(
          object.type === "ellipse"
            ? pptx.ShapeType.ellipse
            : pptx.ShapeType.rect,
          {
            ...geometry,
            fill: { color: (object.fill || "#e7eefb").replace("#", "") },
            line: {
              color: (object.fill || "#e7eefb").replace("#", ""),
              transparency: 100,
            },
          },
        );
    }
  }
  return pptx.write({ outputType: "blob" });
}
import { checkArchive } from "./archiveSafety.js";
