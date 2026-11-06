/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import {
  openOriginalDocx,
  saveOriginalDocx,
  docxPreviewBuffer,
} from "./originalOffice.js";
const previewOptions = {
  renderHeaders: true,
  renderFooters: true,
  renderFootnotes: true,
  renderEndnotes: true,
  renderComments: true,
  renderChanges: true,
  renderAltChunks: false,
  useBase64URL: true,
  breakPages: true,
  ignoreLastRenderedPageBreak: false,
};

// Word may omit cached page-break markers. Flow complete blocks into visible
// browser pages rather than clipping the tail of a long document. Oversized
// individual blocks remain intact; the original DOCX is never rewritten here.
function paginatePreview(container) {
  for (const section of [...container.querySelectorAll("section.docx")]) {
    const article = section.querySelector(":scope > article");
    if (!article) continue;
    const style = getComputedStyle(section);
    const pageHeight = parseFloat(style.minHeight) || 1123;
    const available =
      pageHeight -
      parseFloat(style.paddingTop || 0) -
      parseFloat(style.paddingBottom || 0) -
      (section.querySelector(":scope > header")?.offsetHeight || 0) -
      (section.querySelector(":scope > footer")?.offsetHeight || 0);
    if (available < 100 || article.scrollHeight <= available + 2) continue;
    const children = [...article.childNodes];
    article.replaceChildren();
    let current = article,
      last = section;
    for (const child of children) {
      current.append(child);
      if (
        current.childNodes.length > 1 &&
        current.scrollHeight > available + 2
      ) {
        const next = section.cloneNode(true);
        const body = next.querySelector(":scope > article");
        body.replaceChildren(child);
        last.after(next);
        last = next;
        current = body;
      }
    }
  }
}

export default function OriginalWordEditor({
  blob,
  canEdit,
  onChange,
  onPreparing,
}) {
  const preview = useRef(null);
  const [source, setSource] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [edits, setEdits] = useState({});
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const indexPages = useCallback(() => {
    paginatePreview(preview.current);
    const pages = preview.current.querySelectorAll("section.docx");
    pages.forEach((section, index) => {
      section.setAttribute("aria-label", `Document page ${index + 1}`);
      const number = document.createElement("div");
      number.className = "fm-document-page-number";
      number.textContent = `Page ${index + 1} of ${pages.length}`;
      section.append(number);
    });
    setPageCount(pages.length);
    setPage(1);
  }, []);
  const serial = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    (async () => {
      const buffer = await blob.arrayBuffer();
      const model = await openOriginalDocx(buffer);
      const safe = await docxPreviewBuffer(buffer);
      if (cancelled) return;
      setSource(buffer);
      setBlocks(model.blocks);
      await renderAsync(safe, preview.current, undefined, previewOptions);
      if (!cancelled) {
        indexPages();
        setReady(true);
      }
    })().catch((e) => {
      if (!cancelled) setError(e.message);
    });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [blob, indexPages]);
  const edit = async (id, value) => {
    onPreparing();
    const next = { ...edits, [id]: value };
    setEdits(next);
    const sequence = ++serial.current;
    try {
      const result = await saveOriginalDocx(source, next);
      if (!mounted.current || sequence !== serial.current) return;
      setError("");
      onChange(result);
      const target = document.createElement("div");
      await renderAsync(
        await docxPreviewBuffer(await result.arrayBuffer()),
        target,
        undefined,
        previewOptions,
      );
      if (mounted.current && sequence === serial.current) {
        preview.current.replaceChildren(...target.childNodes);
        indexPages();
      }
    } catch (e) {
      if (mounted.current && sequence === serial.current) setError(e.message);
    }
  };
  return (
    <>
      <div className="fm-editor-toolbar fm-word-ribbon">
        <strong>Word document</strong>
        <span>Original DOCX · text edits preserve the original package</span>
      </div>
      <div className="fm-notice">
        The preview reads your original file. Use Edit text to change existing
        paragraphs, including headers and footers. Images, tables, drawings and
        other package parts are retained when saving. Browser pagination can
        differ from Word. Layout changes and adding/removing document structures
        are not supported in this mode.
      </div>
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      {pageCount > 0 && (
        <nav className="fm-document-pages" aria-label="Document pages">
          <span>Pages</span>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              aria-label={`Go to document page ${index + 1}`}
              aria-current={page === index + 1 ? "page" : undefined}
              onClick={() => {
                setPage(index + 1);
                const targetPage =
                  preview.current.querySelectorAll("section.docx")[index];
                targetPage?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              {index + 1}
            </button>
          ))}
        </nav>
      )}
      <div className="fm-original-word">
        <div
          className="fm-original-preview"
          ref={preview}
          aria-label="Original Word document preview"
        />
        <aside
          className="fm-word-text-panel"
          aria-label="Edit original document text"
        >
          <h3>Edit text</h3>
          <input
            aria-label="Find document text"
            placeholder="Find a paragraph…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {!ready && !error && <p>Opening original document…</p>}
          {blocks
            .filter((b) =>
              (edits[b.id] ?? b.text)
                .toLowerCase()
                .includes(filter.toLowerCase()),
            )
            .map((block, index) => (
              <label key={block.id}>
                <span>
                  {block.part.replace("word/", "").replace(".xml", "")} ·
                  paragraph {index + 1}
                </span>
                <textarea
                  aria-label={`${block.part} paragraph ${blocks.indexOf(block) + 1}`}
                  readOnly={!canEdit || !ready}
                  value={edits[block.id] ?? block.text}
                  onChange={(e) => edit(block.id, e.target.value)}
                />
              </label>
            ))}
        </aside>
      </div>
    </>
  );
}
