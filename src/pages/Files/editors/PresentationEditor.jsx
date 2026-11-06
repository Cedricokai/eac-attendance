/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  Type,
  ImagePlus,
  Square,
  Circle,
  Play,
  Download,
  ArrowUp,
  ArrowDown,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import {
  blankSlide,
  importPresentation,
  presentationBlob,
  exportPresentation,
  sanitizePresentation,
} from "./presentationFormat";
import { downloadBlob } from "../fileApi";
import { readModel, patchModel } from "../collaborationModel";

export default function PresentationEditor(props) {
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (props.live) {
      try {
        setLoaded({
          model: sanitizePresentation(readModel(props.live.doc)),
          warnings: [],
        });
      } catch (e) {
        setError(e.message);
      }
      return;
    }
    importPresentation(props.blob, props.extension)
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
  if (!loaded) return <div className="fm-notice">Opening presentation…</div>;
  return (
    <SlideCanvas {...props} initial={loaded.model} warnings={loaded.warnings} />
  );
}
function SlideCanvas({
  initial,
  warnings,
  item,
  extension,
  canEdit,
  onChange,
  onSaveCopy,
  live,
}) {
  const [model, setModel] = useState(initial);
  const modelRef = useRef(model);
  modelRef.current = model;
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(70);
  const [presenting, setPresenting] = useState(false);
  const [error, setError] = useState("");
  const [undo, setUndo] = useState([]);
  const [redo, setRedo] = useState([]);
  const file = useRef(null);
  const stage = useRef(null);
  const presentation = useRef(null);
  const drag = useRef(null);
  const textInput = useRef(null);
  useEffect(() => {
    if (!live) return;
    const update = (_event, transaction) => {
      if (transaction.origin === "local-editor") return;
      let next;
      try {
        next = sanitizePresentation(readModel(live.doc));
      } catch (e) {
        setError("Live update rejected: " + e.message);
        return;
      }
      setModel(next);
      modelRef.current = next;
      setUndo([]);
      setRedo([]);
    };
    live.doc.getMap("model").observe(update);
    return () => live.doc.getMap("model").unobserve(update);
  }, [live]);
  const editable = canEdit && extension === "eacslides";
  const slide = model.slides[page] || model.slides[0];
  const object = slide.objects.find((o) => o.id === selected);
  const change = (next) => {
    if (live) {
      patchModel(live.doc, modelRef.current, next);
      const merged = readModel(live.doc);
      setModel(merged);
      modelRef.current = merged;
      onChange(presentationBlob(merged));
      return;
    }
    setUndo((history) => [...history.slice(-19), modelRef.current]);
    setRedo([]);
    setModel(next);
    modelRef.current = next;
    onChange(presentationBlob(next));
  };
  const objects = (next) =>
    change({
      ...modelRef.current,
      slides: modelRef.current.slides.map((s, i) =>
        i === page ? { ...s, objects: next } : s,
      ),
    });
  const patch = (value) =>
    objects(
      slide.objects.map((o) => (o.id === selected ? { ...o, ...value } : o)),
    );
  const add = (type) => {
    const next = {
      id: crypto.randomUUID(),
      type,
      x: 90,
      y: 100,
      width: type === "text" ? 600 : 240,
      height: type === "text" ? 100 : 180,
      text: type === "text" ? "Type your text" : "",
      color: "#202b3d",
      fill: "#dce8fc",
      fontSize: 42,
      fontFamily: "Arial",
      rotation: 0,
      align: "left",
    };
    objects([...slide.objects, next]);
    setSelected(next.id);
  };
  useEffect(() => {
    if (!presenting) return;
    const key = (event) => {
      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        setPage((p) => Math.min(model.slides.length - 1, p + 1));
      }
      if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        setPage((p) => Math.max(0, p - 1));
      }
      if (event.key === "Escape") {
        setPresenting(false);
        if (document.fullscreenElement)
          document.exitFullscreen().catch(() => {});
      }
    };
    const full = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    window.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", full);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("fullscreenchange", full);
    };
  }, [presenting, model.slides.length]);
  const reorder = (delta) => {
    const target = page + delta;
    if (target < 0 || target >= model.slides.length) return;
    const slides = [...model.slides];
    [slides[page], slides[target]] = [slides[target], slides[page]];
    change({ ...model, slides });
    setPage(target);
  };
  const down = (event, obj) => {
    if (!editable || presenting) return;
    event.stopPropagation();
    setSelected(obj.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = stage.current.getBoundingClientRect();
    drag.current = {
      id: obj.id,
      startX: event.clientX,
      startY: event.clientY,
      x: obj.x,
      y: obj.y,
      scale: bounds.width / model.width,
      original: modelRef.current,
    };
  };
  const move = (event) => {
    const state = drag.current;
    if (!state) return;
    const current = modelRef.current;
    const dx = (event.clientX - state.startX) / state.scale;
    const dy = (event.clientY - state.startY) / state.scale;
    const next = {
      ...current,
      slides: current.slides.map((s, i) =>
        i === page
          ? {
              ...s,
              objects: s.objects.map((o) =>
                o.id === state.id
                  ? {
                      ...o,
                      x: Math.round(state.x + dx),
                      y: Math.round(state.y + dy),
                    }
                  : o,
              ),
            }
          : s,
      ),
    };
    modelRef.current = next;
    setModel(next);
  };
  const up = () => {
    if (!drag.current) return;
    const original = drag.current.original;
    drag.current = null;
    setUndo((history) => [...history.slice(-19), original]);
    setRedo([]);
    onChange(presentationBlob(modelRef.current));
  };
  const scale = presenting
    ? Math.min(
        window.innerWidth / model.width,
        window.innerHeight / model.height,
      ) * 0.95
    : zoom / 100;
  const renderObject = (o, miniature = false) => (
    <div
      key={o.id}
      className={`fm-slide-object ${!miniature && o.id === selected && !presenting ? "selected" : ""}`}
      style={{
        left: o.x,
        top: o.y,
        width: o.width,
        height: o.height,
        transform: `rotate(${o.rotation || 0}deg)`,
        fontSize: o.fontSize || 32,
        fontFamily: o.fontFamily || "Arial",
        fontWeight: o.bold ? 700 : 400,
        fontStyle: o.italic ? "italic" : "normal",
        textAlign: o.align || "left",
        color: o.color || "#202b3d",
        background: ["rectangle", "ellipse"].includes(o.type)
          ? o.fill
          : "transparent",
        borderRadius: o.type === "ellipse" ? "50%" : 0,
        overflow: "hidden",
        cursor: editable && !presenting ? "move" : "default",
      }}
      onPointerDown={miniature ? undefined : (event) => down(event, o)}
      onPointerMove={miniature ? undefined : move}
      onPointerUp={miniature ? undefined : up}
      onDoubleClick={() => {
        if (!miniature && o.type === "text") textInput.current?.focus();
      }}
    >
      {o.type === "image" ? (
        <img
          src={o.src}
          alt="Slide image"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            pointerEvents: "none",
          }}
        />
      ) : o.type === "text" ? (
        o.text
      ) : null}
    </div>
  );
  return (
    <>
      {extension === "pptx" && (
        <div className="fm-compat">
          {warnings.join(" ")}
          {canEdit && (
            <button
              onClick={() =>
                onSaveCopy(
                  presentationBlob(model),
                  item.name.replace(/\.pptx$/i, ".eacslides"),
                )
              }
            >
              Create editable EAC copy
            </button>
          )}
        </div>
      )}
      <div className="fm-editor-toolbar">
        <button
          disabled={!editable || model.slides.length >= 200}
          onClick={() => {
            change({ ...model, slides: [...model.slides, blankSlide()] });
            setPage(model.slides.length);
            setSelected(null);
          }}
        >
          <Plus size={15} />
          Add slide
        </button>
        <button
          disabled={!editable || model.slides.length >= 200}
          onClick={() => {
            const copied = {
              ...slide,
              id: crypto.randomUUID(),
              objects: slide.objects.map((o) => ({
                ...o,
                id: crypto.randomUUID(),
              })),
            };
            const slides = [...model.slides];
            slides.splice(page + 1, 0, copied);
            change({ ...model, slides });
            setPage(page + 1);
          }}
        >
          <Copy size={15} />
          Duplicate slide
        </button>
        <button
          disabled={!editable || model.slides.length === 1}
          onClick={() => {
            change({
              ...model,
              slides: model.slides.filter((_, i) => i !== page),
            });
            setPage(Math.max(0, page - 1));
            setSelected(null);
          }}
        >
          <Trash2 size={15} />
          Delete slide
        </button>
        <button disabled={!editable || !page} onClick={() => reorder(-1)}>
          <ArrowUp size={15} />
          Move slide up
        </button>
        <button
          disabled={!editable || page === model.slides.length - 1}
          onClick={() => reorder(1)}
        >
          <ArrowDown size={15} />
          Move slide down
        </button>
        <button
          disabled={!undo.length}
          onClick={() => {
            const next = undo[undo.length - 1];
            setRedo((r) => [...r, model]);
            setUndo(undo.slice(0, -1));
            setModel(next);
            modelRef.current = next;
            setPage((p) => Math.min(p, next.slides.length - 1));
            onChange(presentationBlob(next));
          }}
        >
          <Undo2 size={15} />
          Undo
        </button>
        <button
          disabled={!redo.length}
          onClick={() => {
            const next = redo[redo.length - 1];
            setUndo((u) => [...u, model]);
            setRedo(redo.slice(0, -1));
            setModel(next);
            modelRef.current = next;
            onChange(presentationBlob(next));
          }}
        >
          <Redo2 size={15} />
          Redo
        </button>
        <button
          onClick={async () => {
            setPresenting(true);
            try {
              await presentation.current.requestFullscreen();
            } catch {
              setError(
                "Fullscreen is unavailable. Presentation mode still works in this window.",
              );
            }
          }}
        >
          <Play size={15} />
          Present
        </button>
        <button
          onClick={async () => {
            try {
              downloadBlob(
                await exportPresentation(model),
                item.name.replace(/\.(eacslides|pptx)$/i, "") + ".pptx",
              );
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Download size={15} />
          Export PPTX
        </button>
      </div>
      <div className="fm-editor-toolbar">
        <button disabled={!editable} onClick={() => add("text")}>
          <Type size={15} />
          Text box
        </button>
        <button disabled={!editable} onClick={() => add("rectangle")}>
          <Square size={15} />
          Rectangle
        </button>
        <button disabled={!editable} onClick={() => add("ellipse")}>
          <Circle size={15} />
          Ellipse
        </button>
        <button disabled={!editable} onClick={() => file.current.click()}>
          <ImagePlus size={15} />
          Image
        </button>
        <label className="fm-properties">
          Slide background{" "}
          <input
            type="color"
            disabled={!editable}
            value={slide.background}
            onChange={(e) =>
              change({
                ...model,
                slides: model.slides.map((s, i) =>
                  i === page ? { ...s, background: e.target.value } : s,
                ),
              })
            }
          />
        </label>
        <button
          disabled={!editable}
          onClick={() => {
            const title = {
              id: crypto.randomUUID(),
              type: "text",
              x: 90,
              y: 90,
              width: 1100,
              height: 90,
              fontSize: 52,
              fontFamily: "Arial",
              color: "#202b3d",
              text: "Presentation title",
              bold: true,
            };
            const body = {
              ...title,
              id: crypto.randomUUID(),
              y: 230,
              height: 350,
              fontSize: 30,
              text: "Add your content",
              bold: false,
            };
            objects([title, body]);
          }}
        >
          Title and body layout
        </button>
        <label className="fm-properties">
          Zoom{" "}
          <input
            type="range"
            min="25"
            max="120"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <span>{zoom}%</span>
      </div>
      <input
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        ref={file}
        hidden
        onChange={(e) => {
          const selectedFile = e.target.files[0];
          if (!selectedFile) return;
          if (selectedFile.size > 5 * 1024 * 1024) {
            setError("Slide images must be smaller than 5 MB.");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const image = {
              id: crypto.randomUUID(),
              type: "image",
              x: 90,
              y: 90,
              width: 400,
              height: 300,
              src: reader.result,
              rotation: 0,
            };
            objects([...slide.objects, image]);
            setSelected(image.id);
          };
          reader.readAsDataURL(selectedFile);
          e.target.value = "";
        }}
      />
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      <div className="fm-slide-layout">
        <aside className="fm-slide-list" aria-label="Slide thumbnails">
          {model.slides.map((s, i) => (
            <button
              key={s.id}
              className={i === page ? "active" : ""}
              aria-label={`Select slide ${i + 1}`}
              onClick={() => {
                setPage(i);
                setSelected(null);
              }}
              style={{ padding: 4, height: 110, background: s.background }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: 10,
                  marginBottom: 3,
                  color: "#789",
                }}
              >
                {i + 1}
              </span>
              <div
                style={{
                  position: "relative",
                  width: 128,
                  height: 72,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: model.width,
                    height: model.height,
                    transform: "scale(.1)",
                    transformOrigin: "top left",
                  }}
                >
                  {s.objects.map((o) => renderObject(o, true))}
                </div>
              </div>
            </button>
          ))}
        </aside>
        <main
          className="fm-editor-content"
          style={{ alignItems: "flex-start", justifyContent: "flex-start" }}
        >
          <div
            ref={presentation}
            className={presenting ? "fm-presenting" : ""}
            style={{
              minWidth: model.width * scale,
              minHeight: model.height * scale,
            }}
          >
            {presenting && (
              <>
                <button
                  style={{
                    position: "absolute",
                    top: 15,
                    right: 15,
                    zIndex: 2,
                  }}
                  onClick={() => {
                    setPresenting(false);
                    if (document.fullscreenElement)
                      document.exitFullscreen().catch(() => {});
                  }}
                >
                  <X size={16} />
                  Exit presentation
                </button>
                <button
                  style={{ position: "absolute", bottom: 15, left: 20 }}
                  disabled={!page}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  style={{ position: "absolute", bottom: 15, right: 20 }}
                  disabled={page === model.slides.length - 1}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </>
            )}
            <div
              ref={stage}
              className="fm-editor-stage"
              aria-label={`Slide ${page + 1} canvas`}
              style={{
                width: model.width,
                height: model.height,
                maxWidth: "none",
                background: slide.background,
                transform: `scale(${scale})`,
                transformOrigin: presenting ? "center" : "top left",
              }}
              onPointerDown={() => setSelected(null)}
            >
              {slide.objects.map((o) => renderObject(o))}
            </div>
          </div>
        </main>
        {!presenting && object && (
          <aside
            style={{
              width: 230,
              flexShrink: 0,
              padding: 18,
              overflow: "auto",
              background: "white",
              borderLeft: "1px solid #e0e6ef",
            }}
          >
            <h3>Object properties</h3>
            {object.type === "text" && (
              <label style={{ display: "block", marginBottom: 15 }}>
                Text
                <textarea
                  aria-label="Object text"
                  ref={textInput}
                  rows={5}
                  disabled={!editable}
                  value={object.text}
                  style={{ width: "100%" }}
                  onChange={(e) => patch({ text: e.target.value })}
                />
              </label>
            )}
            <div className="fm-properties">
              {["x", "y", "width", "height", "rotation"].map((key) => (
                <label key={key}>
                  {key}
                  <input
                    aria-label={`Object ${key}`}
                    type="number"
                    disabled={!editable}
                    min={["width", "height"].includes(key) ? 1 : undefined}
                    value={Math.round(object[key] || 0)}
                    onChange={(e) =>
                      patch({
                        [key]: Math.max(
                          ["width", "height"].includes(key) ? 1 : -10000,
                          Math.min(10000, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </label>
              ))}
              {object.type === "text" ? (
                <>
                  <label>
                    Font
                    <input
                      aria-label="Object font"
                      value={object.fontFamily || "Arial"}
                      disabled={!editable}
                      onChange={(e) =>
                        patch({
                          fontFamily: e.target.value.replace(
                            /[^a-zA-Z ,'-]/g,
                            "",
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Size
                    <input
                      aria-label="Object font size"
                      type="number"
                      min="6"
                      max="300"
                      value={object.fontSize || 32}
                      disabled={!editable}
                      onChange={(e) =>
                        patch({
                          fontSize: Math.max(
                            6,
                            Math.min(300, Number(e.target.value)),
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Color
                    <input
                      type="color"
                      value={object.color || "#202b3d"}
                      disabled={!editable}
                      onChange={(e) => patch({ color: e.target.value })}
                    />
                  </label>
                  <button
                    disabled={!editable}
                    className={object.bold ? "active" : ""}
                    onClick={() => patch({ bold: !object.bold })}
                  >
                    Bold
                  </button>
                  <button
                    disabled={!editable}
                    className={object.italic ? "active" : ""}
                    onClick={() => patch({ italic: !object.italic })}
                  >
                    Italic
                  </button>
                  <select
                    aria-label="Object text alignment"
                    value={object.align || "left"}
                    disabled={!editable}
                    onChange={(e) => patch({ align: e.target.value })}
                  >
                    <option>left</option>
                    <option>center</option>
                    <option>right</option>
                  </select>
                </>
              ) : (
                object.type !== "image" && (
                  <label>
                    Fill
                    <input
                      type="color"
                      value={object.fill || "#dce8fc"}
                      disabled={!editable}
                      onChange={(e) => patch({ fill: e.target.value })}
                    />
                  </label>
                )
              )}
            </div>
            <div
              className="fm-editor-toolbar"
              style={{ padding: "15px 0", border: 0 }}
            >
              <button
                disabled={!editable}
                onClick={() =>
                  objects([
                    ...slide.objects.filter((o) => o.id !== selected),
                    object,
                  ])
                }
              >
                Bring to front
              </button>
              <button
                disabled={!editable}
                onClick={() =>
                  objects([
                    object,
                    ...slide.objects.filter((o) => o.id !== selected),
                  ])
                }
              >
                Send to back
              </button>
              <button
                disabled={!editable}
                onClick={() => patch({ x: (model.width - object.width) / 2 })}
              >
                Center horizontally
              </button>
              <button
                disabled={!editable}
                onClick={() => patch({ y: (model.height - object.height) / 2 })}
              >
                Center vertically
              </button>
              <button
                disabled={!editable}
                onClick={() => {
                  objects(slide.objects.filter((o) => o.id !== selected));
                  setSelected(null);
                }}
              >
                <Trash2 size={15} />
                Delete object
              </button>
            </div>
          </aside>
        )}
      </div>
      <footer className="fm-editor-status">
        <span>
          Slide {page + 1} of {model.slides.length}
        </span>
        <span>
          {model.width} × {model.height}
        </span>
        <span>Grouping, transitions and animations are not supported.</span>
      </footer>
    </>
  );
}
