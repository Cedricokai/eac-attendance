import { Extension, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import {
  TextStyleKit,
  Color,
  BackgroundColor,
  FontFamily,
  FontSize,
  LineHeight,
} from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";

// CRDT updates bypass the import parser. Validate attributes at rendering time
// too, so a peer cannot turn a font/color field into a network CSS request.
const safeColor = (value) =>
  typeof value === "string" &&
  /^(?:#[a-f\d]{3,8}|rgba?\([\d.,%\s]+\))$/i.test(value);
function safeGlobal(extension, rules) {
  return extension.extend({
    addGlobalAttributes() {
      return (this.parent?.() || []).map((group) => ({
        ...group,
        attributes: Object.fromEntries(
          Object.entries(group.attributes).map(([name, attribute]) => [
            name,
            rules[name]
              ? {
                  ...attribute,
                  renderHTML: (attrs) =>
                    rules[name](attrs[name]) ? attribute.renderHTML(attrs) : {},
                }
              : attribute,
          ]),
        ),
      }));
    },
  });
}
const safeImage = Image.extend({
  addAttributes() {
    const inherited = this.parent?.() || {};
    return {
      ...inherited,
      src: {
        ...inherited.src,
        renderHTML: (attrs) =>
          /^data:image\/(png|jpeg|gif|webp);base64,[a-z\d+/=\s]+$/i.test(
            attrs.src || "",
          )
            ? { src: attrs.src }
            : {},
      },
    };
  },
});
const safeHighlight = Highlight.extend({
  addAttributes() {
    const inherited = this.parent?.() || {};
    return {
      ...inherited,
      color: {
        ...inherited.color,
        renderHTML: (attrs) =>
          safeColor(attrs.color) ? inherited.color.renderHTML(attrs) : {},
      },
    };
  },
});

const ParagraphLayout = Extension.create({
  name: "paragraphLayout",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: 1.5,
            renderHTML: (attrs) => ({
              style: `line-height:${Number(attrs.lineHeight) || 1.5}`,
            }),
          },
          paragraphSpacing: {
            default: 8,
            renderHTML: (attrs) => ({
              style: `margin-bottom:${Number(attrs.paragraphSpacing) || 0}pt`,
            }),
          },
          indent: {
            default: 0,
            renderHTML: (attrs) => ({
              style: `margin-left:${Math.max(0, Math.min(10, Number(attrs.indent) || 0)) * 24}px`,
            }),
          },
        },
      },
    ];
  },
});
const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },
  renderHTML() {
    return [
      "div",
      {
        "data-page-break": "",
        style: "break-before:page;border-top:1px dashed #cbd5e1;margin:24px 0",
      },
    ];
  },
});

export function documentExtensions(live = false) {
  return [
    StarterKit.configure({
      undoRedo: live ? false : {},
      link: { openOnClick: false, autolink: true },
    }),
    TableKit.configure({ table: { resizable: true } }),
    safeImage.configure({ allowBase64: true }),
    safeGlobal(TextAlign, {
      textAlign: (value) =>
        ["left", "center", "right", "justify"].includes(value),
    }).configure({ types: ["heading", "paragraph"] }),
    TextStyleKit.configure({
      color: false,
      backgroundColor: false,
      fontFamily: false,
      fontSize: false,
      lineHeight: false,
    }),
    safeGlobal(Color, { color: safeColor }),
    safeGlobal(BackgroundColor, { backgroundColor: safeColor }),
    safeGlobal(FontFamily, {
      fontFamily: (value) =>
        typeof value === "string" && /^[a-z ,'-]{1,80}$/i.test(value),
    }),
    safeGlobal(FontSize, {
      fontSize: (value) =>
        typeof value === "string" &&
        /^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(value) &&
        parseFloat(value) <= 300,
    }),
    safeGlobal(LineHeight, {
      lineHeight: (value) =>
        /^\d+(\.\d+)?(px|pt|em|rem|%)?$/.test(String(value)) &&
        parseFloat(value) <= 100,
    }),
    safeHighlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    ParagraphLayout,
    PageBreak,
  ];
}
