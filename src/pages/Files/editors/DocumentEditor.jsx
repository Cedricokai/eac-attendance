/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { documentExtensions } from "./documentExtensions.js";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import {
  Bold,
  Italic,
  Underline,
  Undo2,
  Redo2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Strikethrough,
  ImagePlus,
  Table,
  Link,
  Printer,
  Download,
  Search,
  Scissors,
  Superscript as SuperIcon,
  Subscript as SubIcon,
} from "lucide-react";
import {
  importDocument,
  documentBlob,
  exportDocx,
  sanitizeDocument,
} from "./documentFormat";
import { downloadBlob } from "../fileApi";
import OriginalWordEditor from "./OriginalWordEditor";
const safeLayout = (layout) =>
  sanitizeDocument({ content: { type: "doc", content: [] }, layout }).layout;

export default function DocumentEditor(props) {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (props.live) {
      setLoaded({
        model: {
          format: "eac-document",
          schemaVersion: 1,
          content: { type: "doc", content: [] },
          layout: safeLayout(props.live.doc.getMap("layout").toJSON()),
        },
        warnings: [],
      });
      return;
    }
    importDocument(props.blob, props.extension)
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
  if (!loaded) return <div className="fm-notice">Opening document…</div>;
  return (
    <DocumentCanvas
      {...props}
      initial={loaded.model}
      warnings={loaded.warnings}
    />
  );
}

function DocumentCanvas({
  initial,
  warnings,
  canEdit,
  onChange,
  onSaveCopy,
  item,
  extension,
  live,
}) {
  const [layout, setLayout] = useState(initial.layout);
  const [tab, setTab] = useState("Home");
  const [zoom, setZoom] = useState(100);
  const [find, setFind] = useState("");
  const [replacement, setReplacement] = useState("");
  const [showFind, setShowFind] = useState(false);
  const [pagePreview, setPagePreview] = useState(null);
  const [error, setError] = useState("");
  const imageUpload = useRef(null);
  const imported = extension === "docx";
  const editable = canEdit && !imported;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const editor = useEditor({
    extensions: [
      ...documentExtensions(Boolean(live)),
      ...(live
        ? [
            Collaboration.configure({ document: live.doc, field: "content" }),
            CollaborationCaret.configure({
              provider: live.provider,
              user: { name: live.access.userName, color: "#3976d6" },
            }),
          ]
        : []),
    ],
    content: live ? undefined : initial.content,
    editable,
    editorProps: {
      attributes: {
        spellcheck: "true",
        "aria-label": "Document content",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) =>
      onChange(
        documentBlob({
          format: "eac-document",
          schemaVersion: 1,
          content: editor.getJSON(),
          layout: layoutRef.current,
        }),
      ),
  });
  useEffect(() => {
    if (!live) return;
    const map = live.doc.getMap("layout");
    const update = () => setLayout(safeLayout(map.toJSON()));
    map.observe(update);
    return () => map.unobserve(update);
  }, [live]);
  useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      selection: editor?.state.selection.from,
      text: editor?.getText(),
      transaction: editor?.state.doc.content.size,
    }),
  });
  const model = () => ({
    format: "eac-document",
    schemaVersion: 1,
    content: editor.getJSON(),
    layout,
  });
  const updateLayout = (value) => {
    if (live) {
      live.doc.transact(() => {
        for (const [k, v] of Object.entries(value))
          live.doc.getMap("layout").set(k, v);
      });
      return;
    }
    const next = { ...layout, ...value };
    setLayout(next);
    onChange(documentBlob({ ...model(), layout: next }));
  };
  const command = (fn, title, Icon, active = false) => (
    <button
      key={title}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={active ? "active" : ""}
      disabled={!editable}
      onClick={fn}
    >
      {Icon ? <Icon size={16} /> : title}
    </button>
  );
  const paragraph = (attrs) =>
    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", attrs)
      .updateAttributes("heading", attrs)
      .run();
  const match = (replace) => {
    if (!find) return;
    let found = false;
    editor.state.doc.descendants((node, pos) => {
      if (found || !node.isText) return;
      const start = node.text.toLowerCase().indexOf(find.toLowerCase());
      if (start >= 0 && pos + start >= editor.state.selection.to) {
        found = true;
        editor
          .chain()
          .focus()
          .setTextSelection({
            from: pos + start,
            to: pos + start + find.length,
          })
          .run();
        if (replace && editable) editor.commands.insertContent(replacement);
      }
    });
    if (!found) {
      editor.commands.setTextSelection(1);
      setError("No more matches. Search restarts from the beginning.");
    } else setError("");
  };
  if (!editor) return null;
  if (pagePreview)
    return (
      <>
        <div className="fm-editor-toolbar">
          <button onClick={() => setPagePreview(null)}>Back to editing</button>
          <span>Numbered page view</span>
        </div>
        <OriginalWordEditor
          blob={pagePreview}
          canEdit={false}
          onChange={() => {}}
          onPreparing={() => {}}
        />
      </>
    );
  const [pageWidth, pageHeight] =
    layout.size === "Letter" ? [816, 1056] : [794, 1123];
  return (
    <>
      {imported && (
        <div className="fm-compat">
          {warnings.join(" ")}{" "}
          {canEdit && (
            <button
              onClick={() =>
                onSaveCopy(
                  documentBlob(model()),
                  item.name.replace(/\.docx$/i, ".eacdoc"),
                )
              }
            >
              Create editable EAC copy
            </button>
          )}
        </div>
      )}
      <div
        className="fm-editor-toolbar"
        role="tablist"
        aria-label="Document ribbon"
      >
        {["Home", "Insert", "Layout", "View"].map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button
          onClick={async () => {
            try {
              setPagePreview(await exportDocx(model()));
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Pages
        </button>
        <button
          onClick={async () => {
            try {
              downloadBlob(
                await exportDocx(model()),
                item.name.replace(/\.(eacdoc|docx)$/i, "") + ".docx",
              );
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Download size={15} />
          Export DOCX
        </button>
        <button onClick={() => window.print()}>
          <Printer size={15} />
          Print / Save PDF
        </button>
      </div>
      <div
        className="fm-editor-toolbar"
        role="toolbar"
        aria-label={`${tab} commands`}
      >
        {tab === "Home" && (
          <>
            {command(() => editor.chain().focus().undo().run(), "Undo", Undo2)}
            {command(() => editor.chain().focus().redo().run(), "Redo", Redo2)}
            <select
              aria-label="Text style"
              disabled={!editable}
              value={
                editor.isActive("heading")
                  ? String(editor.getAttributes("heading").level)
                  : "paragraph"
              }
              onChange={(e) =>
                e.target.value === "paragraph"
                  ? editor.chain().focus().setParagraph().run()
                  : editor
                      .chain()
                      .focus()
                      .toggleHeading({ level: Number(e.target.value) })
                      .run()
              }
            >
              <option value="paragraph">Normal</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
            </select>
            <select
              aria-label="Font family"
              disabled={!editable}
              onChange={(e) =>
                editor.chain().focus().setFontFamily(e.target.value).run()
              }
              defaultValue="Arial"
            >
              {[
                "Arial",
                "Calibri",
                "Georgia",
                "Times New Roman",
                "Verdana",
                "Courier New",
              ].map((font) => (
                <option key={font}>{font}</option>
              ))}
            </select>
            <select
              aria-label="Font size"
              disabled={!editable}
              onChange={(e) =>
                editor.chain().focus().setFontSize(`${e.target.value}pt`).run()
              }
              defaultValue="12"
            >
              {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].map(
                (size) => (
                  <option key={size}>{size}</option>
                ),
              )}
            </select>
            {command(
              () => editor.chain().focus().toggleBold().run(),
              "Bold",
              Bold,
              editor.isActive("bold"),
            )}
            {command(
              () => editor.chain().focus().toggleItalic().run(),
              "Italic",
              Italic,
              editor.isActive("italic"),
            )}
            {command(
              () => editor.chain().focus().toggleUnderline().run(),
              "Underline",
              Underline,
              editor.isActive("underline"),
            )}
            {command(
              () => editor.chain().focus().toggleStrike().run(),
              "Strikethrough",
              Strikethrough,
              editor.isActive("strike"),
            )}
            <input
              title="Text color"
              aria-label="Text color"
              type="color"
              disabled={!editable}
              onChange={(e) =>
                editor.chain().focus().setColor(e.target.value).run()
              }
            />
            <input
              title="Highlight color"
              aria-label="Highlight color"
              type="color"
              defaultValue="#fff59d"
              disabled={!editable}
              onChange={(e) =>
                editor
                  .chain()
                  .focus()
                  .toggleHighlight({ color: e.target.value })
                  .run()
              }
            />
            {command(
              () => editor.chain().focus().toggleSuperscript().run(),
              "Superscript",
              SuperIcon,
            )}
            {command(
              () => editor.chain().focus().toggleSubscript().run(),
              "Subscript",
              SubIcon,
            )}
            {command(
              () => editor.chain().focus().setTextAlign("left").run(),
              "Align left",
              AlignLeft,
            )}
            {command(
              () => editor.chain().focus().setTextAlign("center").run(),
              "Align center",
              AlignCenter,
            )}
            {command(
              () => editor.chain().focus().setTextAlign("right").run(),
              "Align right",
              AlignRight,
            )}
            {command(
              () => editor.chain().focus().toggleBulletList().run(),
              "Bullet list",
              List,
            )}
            {command(
              () => editor.chain().focus().toggleOrderedList().run(),
              "Numbered list",
              ListOrdered,
            )}
            {command(
              () =>
                paragraph({
                  indent: (editor.getAttributes("paragraph").indent || 0) + 1,
                }),
              "Indent",
            )}
            {command(
              () =>
                paragraph({
                  indent: Math.max(
                    0,
                    (editor.getAttributes("paragraph").indent || 0) - 1,
                  ),
                }),
              "Outdent",
            )}
            <select
              aria-label="Line spacing"
              disabled={!editable}
              defaultValue="1.5"
              onChange={(e) =>
                paragraph({ lineHeight: Number(e.target.value) })
              }
            >
              {[1, 1.15, 1.5, 2, 2.5, 3].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            {command(
              () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
              "Clear formatting",
              Scissors,
            )}
            <button onClick={() => setShowFind(!showFind)}>
              <Search size={16} />
              Find
            </button>
          </>
        )}
        {tab === "Insert" && (
          <>
            {command(
              () =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run(),
              "Insert table",
              Table,
            )}
            {command(
              () => imageUpload.current.click(),
              "Insert image",
              ImagePlus,
            )}
            {command(
              () => {
                const href = window.prompt("Link URL (https:// or mailto:)");
                if (href && /^(https?:\/\/|mailto:)/i.test(href))
                  editor.chain().focus().setLink({ href }).run();
              },
              "Insert link",
              Link,
            )}
            {command(
              () => editor.chain().focus().setHorizontalRule().run(),
              "Horizontal line",
            )}
            {command(
              () =>
                editor
                  .chain()
                  .focus()
                  .insertContent({ type: "pageBreak" })
                  .run(),
              "Page break",
            )}
            {command(
              () =>
                editor
                  .chain()
                  .focus()
                  .insertContent(new Date().toLocaleString())
                  .run(),
              "Date and time",
            )}
            {command(
              () =>
                editor.chain().focus().insertContent("© ® ™ € £ ± × ÷").run(),
              "Special characters",
            )}
            {editor.isActive("table") && (
              <>
                {command(
                  () => editor.chain().focus().addRowAfter().run(),
                  "Add row",
                )}
                {command(
                  () => editor.chain().focus().addColumnAfter().run(),
                  "Add column",
                )}
                {command(
                  () => editor.chain().focus().deleteRow().run(),
                  "Delete row",
                )}
                {command(
                  () => editor.chain().focus().deleteColumn().run(),
                  "Delete column",
                )}
                {command(
                  () => editor.chain().focus().mergeCells().run(),
                  "Merge cells",
                )}
                {command(
                  () => editor.chain().focus().splitCell().run(),
                  "Split cell",
                )}
                {command(
                  () => editor.chain().focus().deleteTable().run(),
                  "Delete table",
                )}
              </>
            )}
          </>
        )}
        {tab === "Layout" && (
          <div className="fm-properties">
            <label>
              Paper
              <select
                value={layout.size}
                disabled={!editable}
                onChange={(e) => updateLayout({ size: e.target.value })}
              >
                <option>A4</option>
                <option>Letter</option>
              </select>
            </label>
            <label>
              Orientation
              <select
                value={layout.landscape ? "landscape" : "portrait"}
                disabled={!editable}
                onChange={(e) =>
                  updateLayout({ landscape: e.target.value === "landscape" })
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label>
              Margins (mm)
              <input
                type="number"
                min="5"
                max="50"
                value={layout.margin}
                disabled={!editable}
                onChange={(e) =>
                  updateLayout({
                    margin: Math.max(5, Math.min(50, Number(e.target.value))),
                  })
                }
              />
            </label>
            <label>
              Background
              <input
                type="color"
                value={layout.background}
                disabled={!editable}
                onChange={(e) => updateLayout({ background: e.target.value })}
              />
            </label>
            <label>
              Header
              <input
                value={layout.header}
                disabled={!editable}
                onChange={(e) => updateLayout({ header: e.target.value })}
              />
            </label>
            <label>
              Footer
              <input
                value={layout.footer}
                disabled={!editable}
                onChange={(e) => updateLayout({ footer: e.target.value })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={layout.pageNumbers}
                disabled={!editable}
                onChange={(e) =>
                  updateLayout({ pageNumbers: e.target.checked })
                }
              />
              Page numbers in DOCX
            </label>
            <label>
              Paragraph spacing (pt)
              <input
                type="number"
                min="0"
                max="72"
                defaultValue="8"
                disabled={!editable}
                onChange={(e) =>
                  paragraph({ paragraphSpacing: Number(e.target.value) })
                }
              />
            </label>
          </div>
        )}
        {tab === "View" && (
          <>
            <label>
              Zoom{" "}
              <input
                aria-label="Document zoom"
                type="range"
                min="50"
                max="150"
                step="10"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <span>{zoom}%</span>
            <span>
              Browser spellcheck is enabled. Print layout depends on browser and
              fonts; DOCX pagination may differ.
            </span>
          </>
        )}
      </div>
      {showFind && (
        <div className="fm-editor-toolbar">
          <input
            aria-label="Find text"
            placeholder="Find"
            value={find}
            onChange={(e) => setFind(e.target.value)}
          />
          <button onClick={() => match(false)}>Find next</button>
          <input
            aria-label="Replace text"
            placeholder="Replace with"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          />
          <button disabled={!editable} onClick={() => match(true)}>
            Replace next
          </button>
        </div>
      )}
      <input
        type="file"
        accept="image/png,image/jpeg,image/gif"
        ref={imageUpload}
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            setError("Use an image smaller than 5 MB.");
            return;
          }
          const reader = new FileReader();
          reader.onload = () =>
            editor.chain().focus().setImage({ src: reader.result }).run();
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="fm-error" role="alert">
          {error}
        </p>
      )}
      <div className="fm-editor-content">
        <article
          className="fm-rich-page"
          style={{
            width: layout.landscape ? pageHeight : pageWidth,
            minHeight: layout.landscape ? pageWidth : pageHeight,
            padding: `${layout.margin}mm`,
            background: layout.background,
            zoom: zoom / 100,
          }}
        >
          <div style={{ color: "#8b95a5", marginBottom: 25, fontSize: 11 }}>
            {layout.header}
          </div>
          <EditorContent editor={editor} />
          <div style={{ color: "#8b95a5", marginTop: 25, fontSize: 11 }}>
            {layout.footer}
          </div>
        </article>
      </div>
      <footer className="fm-editor-status">
        <span>
          {editor.getText().trim().split(/\s+/).filter(Boolean).length} words
        </span>
        <span>
          {layout.size} · {layout.landscape ? "Landscape" : "Portrait"}
        </span>
        <span>
          Track changes and exact Office pagination are not supported.
        </span>
      </footer>
    </>
  );
}
