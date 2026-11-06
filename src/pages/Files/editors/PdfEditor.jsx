/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import PdfPreview from "./PdfPreview";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import {
  RotateCw,
  Trash2,
  ArrowUp,
  Download,
  Merge,
  Split,
  Pencil,
  Type,
  Highlighter,
  ImagePlus,
  Search,
  Undo2,
  Redo2,
} from "lucide-react";
import { downloadBlob } from "../fileApi";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

function Thumbnail({ document, page, active, select }) {
  const canvas = useRef(null);
  const button = useRef(null);
  useEffect(() => {
    let render;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        document
          .getPage(page + 1)
          .then((pdfPage) => {
            if (cancelled || !canvas.current) return;
            const viewport = pdfPage.getViewport({ scale: 0.15 });
            canvas.current.width = viewport.width;
            canvas.current.height = viewport.height;
            render = pdfPage.render({
              canvasContext: canvas.current.getContext("2d"),
              viewport,
            });
            return render.promise;
          })
          .catch(() => {});
      },
      { rootMargin: "100px" },
    );
    observer.observe(button.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      render?.cancel();
    };
  }, [document, page]);
  return (
    <button
      ref={button}
      className={active ? "active" : ""}
      aria-label={`Go to page ${page + 1}`}
      onClick={select}
    >
      <canvas ref={canvas} style={{ maxWidth: "100%", maxHeight: 120 }} />
      <small>{page + 1}</small>
    </button>
  );
}
export default function PdfEditor({ blob, item, canEdit, onChange }) {
  const [bytes, setBytes] = useState(null);
  const [document, setDocument] = useState(null);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [tool, setTool] = useState("view");
  const [color, setColor] = useState("#2459d3");
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(14);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forms, setForms] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [undo, setUndo] = useState([]);
  const [redo, setRedo] = useState([]);
  const [overlay, setOverlay] = useState(null);
  const canvas = useRef(null);
  const viewport = useRef(null);
  const drawing = useRef([]);
  const drag = useRef(null);
  const mergeInput = useRef(null);
  const imageInput = useRef(null);
  const loadedImage = useRef(null);
  useEffect(() => {
    let cancelled = false;
    if (blob.size > 50 * 1024 * 1024) {
      setError(
        "PDF editing is limited to 50 MB. Download this file to use a desktop editor.",
      );
      return;
    }
    blob.arrayBuffer().then((buffer) => {
      if (!cancelled) setBytes(new Uint8Array(buffer));
    });
    return () => {
      cancelled = true;
    };
  }, [blob]);
  useEffect(() => {
    if (!bytes) return;
    setDocument(null);
    let disposed = false;
    const task = pdfjs.getDocument({
      data: bytes.slice(),
      isEvalSupported: false,
      enableXfa: false,
    });
    task.onPassword = () => {
      setError(
        "Password-protected PDFs cannot be edited here. Download and unlock a copy using an authorized PDF application.",
      );
      task.destroy();
    };
    task.promise
      .then((pdf) => {
        if (disposed) return;
        setDocument(pdf);
        setPage((p) => Math.min(p, pdf.numPages - 1));
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      });
    return () => {
      disposed = true;
      task.destroy().catch(() => {});
    };
  }, [bytes]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let cancelled = false;
    let render;
    document
      .getPage(page + 1)
      .then((pdfPage) => {
        if (cancelled || !canvas.current) return;
        const view = pdfPage.getViewport({ scale: (zoom / 100) * 1.25 });
        viewport.current = view;
        canvas.current.width = view.width;
        canvas.current.height = view.height;
        render = pdfPage.render({
          canvasContext: canvas.current.getContext("2d"),
          viewport: view,
        });
        return render.promise;
      })
      .catch((e) => {
        if (!cancelled && e.name !== "RenderingCancelledException")
          setError(e.message);
      });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [document, page, zoom]);
  const pdfColor = () =>
    rgb(
      parseInt(color.slice(1, 3), 16) / 255,
      parseInt(color.slice(3, 5), 16) / 255,
      parseInt(color.slice(5, 7), 16) / 255,
    );
  const update = async (operation) => {
    if (!canEdit || busy || !bytes) return;
    setBusy(true);
    setError("");
    try {
      const pdf = await PDFDocument.load(bytes);
      await operation(pdf);
      if (!pdf.getPageCount() || pdf.getPageCount() > 200)
        throw new Error("A PDF must contain between 1 and 200 pages.");
      const next = await pdf.save();
      if (next.byteLength > 50 * 1024 * 1024)
        throw new Error("The edited PDF exceeds 50 MB.");
      setUndo((previous) => [...previous.slice(-2), bytes]);
      setRedo([]);
      setBytes(next);
      onChange(new Blob([next], { type: "application/pdf" }));
      setForms(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const point = (event) => {
    const rect = canvas.current.getBoundingClientRect();
    const x =
      ((event.clientX - rect.left) * viewport.current.width) / rect.width;
    const y =
      ((event.clientY - rect.top) * viewport.current.height) / rect.height;
    const [px, py] = viewport.current.convertToPdfPoint(x, y);
    return { x: px, y: py, sx: x, sy: y };
  };
  const down = (event) => {
    if (!canEdit || busy || tool === "view" || !viewport.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = point(event);
    drawing.current = [drag.current];
    setOverlay(null);
  };
  const move = (event) => {
    if (!drag.current) return;
    const end = point(event);
    if (tool === "draw" || tool === "signature") {
      drawing.current.push(end);
      setOverlay({
        kind: "path",
        points: drawing.current.map((p) => `${p.sx},${p.sy}`).join(" "),
      });
    } else if (tool === "highlight")
      setOverlay({
        kind: "rect",
        x: Math.min(drag.current.sx, end.sx),
        y: Math.min(drag.current.sy, end.sy),
        width: Math.abs(end.sx - drag.current.sx),
        height: Math.abs(end.sy - drag.current.sy),
      });
  };
  const up = (event) => {
    if (!drag.current) return;
    const start = drag.current;
    const end = point(event);
    const points = [...drawing.current];
    drag.current = null;
    setOverlay(null);
    update(async (pdf) => {
      const target = pdf.getPage(page);
      if (tool === "text") {
        if (!text.trim()) throw new Error("Enter annotation text first.");
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        target.drawText(text, {
          x: start.x,
          y: start.y,
          size: fontSize,
          font,
          color: pdfColor(),
        });
      }
      if (tool === "highlight")
        target.drawRectangle({
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(start.x - end.x),
          height: Math.abs(start.y - end.y),
          color: pdfColor(),
          opacity: 0.25,
        });
      if (tool === "draw" || tool === "signature")
        for (let i = 1; i < points.length; i++)
          target.drawLine({
            start: { x: points[i - 1].x, y: points[i - 1].y },
            end: { x: points[i].x, y: points[i].y },
            thickness: tool === "signature" ? 1.5 : 2,
            color: tool === "signature" ? rgb(0.05, 0.05, 0.05) : pdfColor(),
          });
      if (tool === "image") {
        if (!loadedImage.current)
          throw new Error("Choose a PNG or JPEG overlay first.");
        const image =
          loadedImage.current.type === "image/png"
            ? await pdf.embedPng(loadedImage.current.bytes)
            : await pdf.embedJpg(loadedImage.current.bytes);
        const width = Math.min(200, target.getWidth() / 2);
        target.drawImage(image, {
          x: start.x,
          y: start.y - (width * image.height) / image.width,
          width,
          height: (width * image.height) / image.width,
        });
      }
    });
  };
  const search = async () => {
    if (!document || !query.trim()) return;
    setBusy(true);
    try {
      for (let offset = 1; offset <= document.numPages; offset++) {
        const index = (page + offset) % document.numPages;
        const content = await (
          await document.getPage(index + 1)
        ).getTextContent();
        if (
          content.items
            .map((i) => i.str || "")
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())
        ) {
          setPage(index);
          setMessage(
            `Match on page ${index + 1}. Search uses extractable text; scanned pages need OCR.`,
          );
          return;
        }
      }
      setMessage("No matching extractable text found.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const readForms = async () => {
    try {
      const pdf = await PDFDocument.load(bytes);
      const values = {};
      const supported = pdf
        .getForm()
        .getFields()
        .flatMap((field) => {
          if (field instanceof PDFTextField) {
            values[field.getName()] = field.getText() || "";
            return [{ name: field.getName(), type: "text" }];
          }
          if (field instanceof PDFCheckBox) {
            values[field.getName()] = field.isChecked();
            return [{ name: field.getName(), type: "checkbox" }];
          }
          if (field instanceof PDFDropdown) {
            values[field.getName()] = field.getSelected()[0] || "";
            return [
              {
                name: field.getName(),
                type: "dropdown",
                options: field.getOptions(),
              },
            ];
          }
          return [];
        });
      setForms(supported);
      setFormValues(values);
      if (!supported.length)
        setMessage(
          "No supported AcroForm fields found. Use text overlays for a non-interactive form.",
        );
    } catch (e) {
      setError(e.message);
    }
  };
  if (document?.numPages > 200)
    return <PdfPreview blob={blob} pages={document.numPages} />;
  return (
    <>
      <div className="fm-compat">
        Text, highlights, drawings and image overlays are added over existing
        page content. This editor does not rewrite existing PDF text objects.
        Drawn signatures are not cryptographic digital signatures. Protected,
        XFA and unsupported PDFs may need a desktop editor.
      </div>
      <div className="fm-editor-toolbar">
        {[
          ["view", "View", null],
          ["text", "Text overlay", Type],
          ["highlight", "Area highlight", Highlighter],
          ["draw", "Draw", Pencil],
          ["signature", "Draw signature", Pencil],
          ["image", "Image overlay", ImagePlus],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            className={tool === id ? "active" : ""}
            disabled={id !== "view" && !canEdit}
            onClick={() => {
              setTool(id);
              if (id === "image") imageInput.current.click();
            }}
          >
            {Icon && <Icon size={15} />}
            {label}
          </button>
        ))}
        <input
          type="color"
          aria-label="PDF annotation color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          aria-label="PDF annotation text"
          placeholder="Annotation text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          aria-label="PDF annotation font size"
          type="number"
          min="6"
          max="100"
          value={fontSize}
          style={{ width: 65 }}
          onChange={(e) =>
            setFontSize(Math.max(6, Math.min(100, Number(e.target.value))))
          }
        />
        <button disabled={!canEdit || busy} onClick={readForms}>
          Fill form
        </button>
      </div>
      <div className="fm-editor-toolbar">
        <button
          disabled={!canEdit || busy}
          onClick={() =>
            update((pdf) => {
              const target = pdf.getPage(page);
              target.setRotation(
                degrees((target.getRotation().angle + 90) % 360),
              );
            })
          }
        >
          <RotateCw size={15} />
          Rotate page
        </button>
        <button
          disabled={!canEdit || busy || document?.numPages === 1}
          onClick={() => update((pdf) => pdf.removePage(page))}
        >
          <Trash2 size={15} />
          Delete page
        </button>
        {[
          [-1, ArrowUp, "Move page up"],
          [1, ArrowDown, "Move page down"],
        ].map(([delta, Icon, label]) => (
          <button
            key={label}
            disabled={
              !canEdit ||
              busy ||
              page + delta < 0 ||
              page + delta >= (document?.numPages || 0)
            }
            onClick={() =>
              update((pdf) => {
                const target = pdf.getPage(page);
                pdf.removePage(page);
                pdf.insertPage(page + delta, target);
                setPage(page + delta);
              })
            }
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
        <button
          disabled={!canEdit || busy}
          onClick={() => mergeInput.current.click()}
        >
          <Merge size={15} />
          Merge PDFs
        </button>
        <button
          disabled={busy || !bytes}
          onClick={async () => {
            try {
              const source = await PDFDocument.load(bytes);
              const pdf = await PDFDocument.create();
              const [selected] = await pdf.copyPages(source, [page]);
              pdf.addPage(selected);
              downloadBlob(
                new Blob([await pdf.save()], { type: "application/pdf" }),
                item.name.replace(/\.pdf$/i, "") + `-page-${page + 1}.pdf`,
              );
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Split size={15} />
          Export current page
        </button>
        <button
          disabled={!undo.length || busy}
          onClick={() => {
            const next = undo[undo.length - 1];
            setRedo((r) => [...r, bytes]);
            setUndo(undo.slice(0, -1));
            setBytes(next);
            onChange(new Blob([next], { type: "application/pdf" }));
          }}
        >
          <Undo2 size={15} />
          Undo
        </button>
        <button
          disabled={!redo.length || busy}
          onClick={() => {
            const next = redo[redo.length - 1];
            setUndo((u) => [...u, bytes]);
            setRedo(redo.slice(0, -1));
            setBytes(next);
            onChange(new Blob([next], { type: "application/pdf" }));
          }}
        >
          <Redo2 size={15} />
          Redo
        </button>
        <button
          disabled={!bytes}
          onClick={() =>
            downloadBlob(
              new Blob([bytes], { type: "application/pdf" }),
              item.name,
            )
          }
        >
          <Download size={15} />
          Export PDF
        </button>
      </div>
      <div className="fm-editor-toolbar">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <label>
          Page{" "}
          <input
            type="number"
            aria-label="PDF page number"
            min="1"
            max={document?.numPages || 1}
            value={page + 1}
            style={{ width: 65 }}
            onChange={(e) =>
              setPage(
                Math.max(
                  0,
                  Math.min(
                    (document?.numPages || 1) - 1,
                    Number(e.target.value) - 1,
                  ),
                ),
              )
            }
          />{" "}
          / {document?.numPages || "…"}
        </label>
        <button
          disabled={page + 1 >= (document?.numPages || 0)}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
        <label>
          Zoom{" "}
          <input
            type="range"
            min="50"
            max="200"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <span>{zoom}%</span>
        <input
          aria-label="Search PDF text"
          placeholder="Search PDF text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button disabled={busy} onClick={search}>
          <Search size={15} />
          Find next
        </button>
      </div>
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="fm-notice" role="status">
          {message}
        </div>
      )}
      <input
        type="file"
        accept="application/pdf"
        multiple
        hidden
        ref={mergeInput}
        onChange={async (e) => {
          const files = [...e.target.files];
          await update(async (pdf) => {
            for (const file of files) {
              if (file.size > 50 * 1024 * 1024)
                throw new Error("Merge input exceeds 50 MB.");
              const source = await PDFDocument.load(await file.arrayBuffer());
              if (pdf.getPageCount() + source.getPageCount() > 200)
                throw new Error("Merged documents are limited to 200 pages.");
              const pages = await pdf.copyPages(
                source,
                source.getPageIndices(),
              );
              pages.forEach((p) => pdf.addPage(p));
            }
          });
          e.target.value = "";
        }}
      />
      <input
        type="file"
        accept="image/png,image/jpeg"
        hidden
        ref={imageInput}
        onChange={async (e) => {
          const image = e.target.files[0];
          if (image) {
            if (image.size > 5 * 1024 * 1024)
              setError("Overlay images must be smaller than 5 MB.");
            else
              loadedImage.current = {
                type: image.type,
                bytes: new Uint8Array(await image.arrayBuffer()),
              };
          }
          e.target.value = "";
        }}
      />
      {forms?.length > 0 && (
        <form
          className="fm-editor-toolbar fm-properties"
          onSubmit={(e) => {
            e.preventDefault();
            update((pdf) => {
              const form = pdf.getForm();
              forms.forEach((field) => {
                if (field.type === "checkbox") {
                  const box = form.getCheckBox(field.name);
                  if (formValues[field.name]) box.check();
                  else box.uncheck();
                } else if (field.type === "dropdown")
                  form.getDropdown(field.name).select(formValues[field.name]);
                else
                  form.getTextField(field.name).setText(formValues[field.name]);
              });
              form.updateFieldAppearances();
            });
          }}
        >
          {forms.map((field) => (
            <label key={field.name}>
              {field.name}
              {field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={formValues[field.name]}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      [field.name]: e.target.checked,
                    })
                  }
                />
              ) : field.type === "dropdown" ? (
                <select
                  value={formValues[field.name]}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      [field.name]: e.target.value,
                    })
                  }
                >
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={formValues[field.name]}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      [field.name]: e.target.value,
                    })
                  }
                />
              )}
            </label>
          ))}
          <button className="fm-primary" disabled={!canEdit || busy}>
            Apply form values
          </button>
        </form>
      )}
      <div className="fm-slide-layout">
        {document && (
          <aside className="fm-slide-list" aria-label="PDF page thumbnails">
            {Array.from({ length: document.numPages }, (_, i) => (
              <Thumbnail
                key={`${bytes.byteLength}-${i}`}
                document={document}
                page={i}
                active={page === i}
                select={() => setPage(i)}
              />
            ))}
          </aside>
        )}
        <main className="fm-editor-content">
          <div
            className="fm-pdf-layer"
            style={{
              maxWidth: "none",
              touchAction: "none",
              cursor: tool === "view" ? "default" : "crosshair",
            }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => {
              drag.current = null;
              setOverlay(null);
            }}
          >
            <canvas
              className="fm-pdf-canvas"
              ref={canvas}
              aria-label="PDF page canvas"
            />
            {overlay && (
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
                viewBox={`0 0 ${viewport.current?.width} ${viewport.current?.height}`}
              >
                {overlay.kind === "path" ? (
                  <polyline
                    points={overlay.points}
                    fill="none"
                    stroke={tool === "signature" ? "#111" : color}
                    strokeWidth="2"
                  />
                ) : (
                  <rect
                    x={overlay.x}
                    y={overlay.y}
                    width={overlay.width}
                    height={overlay.height}
                    fill={color}
                    opacity="0.3"
                  />
                )}
              </svg>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
