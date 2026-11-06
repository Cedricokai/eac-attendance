/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import {
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Pencil,
  Type,
  Square,
  Undo2,
  Redo2,
  Download,
} from "lucide-react";
import { downloadBlob } from "../fileApi";

const encodeCanvas = (canvas, type) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This browser could not encode the image.")),
      type,
      0.94,
    ),
  );
export default function ImageEditor({
  blob,
  item,
  canEdit,
  onChange,
  onSaveCopy,
}) {
  const canvas = useRef(null);
  const decoded = useRef(null);
  const points = useRef([]);
  const drag = useRef(null);
  const [current, setCurrent] = useState(blob);
  const [undo, setUndo] = useState([]);
  const [redo, setRedo] = useState([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tool, setTool] = useState("move");
  const [color, setColor] = useState("#2459d3");
  const [weight, setWeight] = useState(3);
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(32);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [grayscale, setGrayscale] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editable =
    canEdit && ["image/png", "image/jpeg", "image/webp"].includes(blob.type);
  const outputType = ["image/png", "image/jpeg", "image/webp"].includes(
    blob.type,
  )
    ? blob.type
    : "image/png";
  useEffect(() => {
    let cancelled = false;
    createImageBitmap(current)
      .then((image) => {
        if (cancelled) {
          image.close();
          return;
        }
        if (image.width * image.height > 16777216) {
          image.close();
          throw new Error(
            "Image editing is limited to 16 megapixels. Download the original to edit a larger image.",
          );
        }
        decoded.current?.close();
        decoded.current = image;
        const target = canvas.current;
        if (!target) return;
        target.width = image.width;
        target.height = image.height;
        target.getContext("2d").drawImage(image, 0, 0);
        const next = { width: image.width, height: image.height };
        setSize(next);
        setDimensions(next);
        setCrop({ x: 0, y: 0, ...next });
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [current]);
  useEffect(() => () => decoded.current?.close(), []);
  const commit = async (target) => {
    const next = await encodeCanvas(target, outputType);
    setUndo((previous) => [...previous.slice(-4), current]);
    setRedo([]);
    setCurrent(next);
    onChange(next);
    setBrightness(100);
    setContrast(100);
    setGrayscale(false);
  };
  const apply = async (operation) => {
    if (!editable || busy || !decoded.current) return;
    setBusy(true);
    setError("");
    try {
      const target = document.createElement("canvas");
      operation(target, decoded.current);
      await commit(target);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const position = (event) => {
    const rect = canvas.current.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          size.width,
          ((event.clientX - rect.left) * size.width) / rect.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          size.height,
          ((event.clientY - rect.top) * size.height) / rect.height,
        ),
      ),
    };
  };
  const pointerDown = (event) => {
    if (!editable || busy || tool === "move") return;
    canvas.current.setPointerCapture(event.pointerId);
    const point = position(event);
    drag.current = point;
    points.current = [point];
  };
  const pointerMove = (event) => {
    if (!drag.current) return;
    const point = position(event);
    if (tool === "crop") {
      setCrop({
        x: Math.round(Math.min(drag.current.x, point.x)),
        y: Math.round(Math.min(drag.current.y, point.y)),
        width: Math.round(Math.abs(point.x - drag.current.x)),
        height: Math.round(Math.abs(point.y - drag.current.y)),
      });
    } else if (tool === "draw") {
      const ctx = canvas.current.getContext("2d");
      const last = points.current[points.current.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = weight;
      ctx.lineCap = "round";
      ctx.stroke();
      points.current.push(point);
    }
  };
  const pointerUp = (event) => {
    if (!drag.current) return;
    const start = drag.current;
    const end = position(event);
    drag.current = null;
    if (tool === "draw") {
      setBusy(true);
      commit(canvas.current)
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
    } else if (tool === "text" && text)
      apply((target, image) => {
        target.width = image.width;
        target.height = image.height;
        const ctx = target.getContext("2d");
        ctx.drawImage(image, 0, 0);
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = color;
        ctx.fillText(text, start.x, start.y);
      });
    else if (tool === "rectangle")
      apply((target, image) => {
        target.width = image.width;
        target.height = image.height;
        const ctx = target.getContext("2d");
        ctx.drawImage(image, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = weight;
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      });
  };
  return (
    <>
      {!editable && (
        <div className="fm-compat">
          {canEdit
            ? "This format is previewed as a single frame. Create a PNG copy to edit it; the original remains unchanged."
            : "View-only image access."}
          {canEdit && (
            <button
              onClick={async () => {
                try {
                  const png = await encodeCanvas(canvas.current, "image/png");
                  await onSaveCopy(png, item.name.replace(/\.[^.]+$/, ".png"));
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Create PNG copy
            </button>
          )}
        </div>
      )}
      <div className="fm-editor-toolbar">
        {[
          ["move", "Preview", null],
          ["crop", "Crop", Crop],
          ["draw", "Draw", Pencil],
          ["text", "Text", Type],
          ["rectangle", "Rectangle", Square],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            disabled={!editable}
            className={tool === id ? "active" : ""}
            onClick={() => setTool(id)}
          >
            {Icon && <Icon size={16} />}
            {label}
          </button>
        ))}
        <button
          disabled={!editable || busy}
          onClick={() =>
            apply((target, image) => {
              target.width = image.height;
              target.height = image.width;
              const ctx = target.getContext("2d");
              ctx.translate(target.width, 0);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(image, 0, 0);
            })
          }
        >
          <RotateCw size={16} />
          Rotate
        </button>
        {[
          ["horizontal", FlipHorizontal],
          ["vertical", FlipVertical],
        ].map(([axis, Icon]) => (
          <button
            key={axis}
            disabled={!editable || busy}
            onClick={() =>
              apply((target, image) => {
                target.width = image.width;
                target.height = image.height;
                const ctx = target.getContext("2d");
                ctx.translate(
                  axis === "horizontal" ? image.width : 0,
                  axis === "vertical" ? image.height : 0,
                );
                ctx.scale(
                  axis === "horizontal" ? -1 : 1,
                  axis === "vertical" ? -1 : 1,
                );
                ctx.drawImage(image, 0, 0);
              })
            }
          >
            <Icon size={16} />
            Flip {axis}
          </button>
        ))}
        <button
          disabled={!undo.length || busy}
          onClick={() => {
            const next = undo[undo.length - 1];
            setRedo((r) => [...r, current]);
            setUndo(undo.slice(0, -1));
            setCurrent(next);
            onChange(next);
          }}
        >
          <Undo2 size={16} />
          Undo
        </button>
        <button
          disabled={!redo.length || busy}
          onClick={() => {
            const next = redo[redo.length - 1];
            setUndo((u) => [...u, current]);
            setRedo(redo.slice(0, -1));
            setCurrent(next);
            onChange(next);
          }}
        >
          <Redo2 size={16} />
          Redo
        </button>
        <button onClick={() => downloadBlob(current, item.name)}>
          <Download size={16} />
          Export image
        </button>
      </div>
      <div className="fm-editor-toolbar fm-properties">
        <label>
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label>
          Stroke
          <input
            type="number"
            min="1"
            max="100"
            value={weight}
            onChange={(e) =>
              setWeight(Math.max(1, Math.min(100, Number(e.target.value))))
            }
          />
        </label>
        {tool === "text" && (
          <>
            <input
              aria-label="Image annotation text"
              placeholder="Text to place on image"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <label>
              Font size
              <input
                type="number"
                min="8"
                max="300"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </label>
          </>
        )}
        <label>
          Width
          <input
            aria-label="Image width"
            type="number"
            min="1"
            max="8192"
            value={dimensions.width}
            onChange={(e) =>
              setDimensions({ ...dimensions, width: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Height
          <input
            aria-label="Image height"
            type="number"
            min="1"
            max="8192"
            value={dimensions.height}
            onChange={(e) =>
              setDimensions({ ...dimensions, height: Number(e.target.value) })
            }
          />
        </label>
        <button
          disabled={!editable || busy}
          onClick={() =>
            apply((target, image) => {
              if (
                dimensions.width < 1 ||
                dimensions.height < 1 ||
                dimensions.width > 8192 ||
                dimensions.height > 8192 ||
                dimensions.width * dimensions.height > 16777216
              )
                throw new Error(
                  "Use dimensions up to 8192 pixels and 16 megapixels total.",
                );
              target.width = dimensions.width;
              target.height = dimensions.height;
              target
                .getContext("2d")
                .drawImage(image, 0, 0, target.width, target.height);
            })
          }
        >
          Resize
        </button>
        <label>
          Zoom
          <input
            type="range"
            min="25"
            max="200"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <span>{zoom}%</span>
      </div>
      {tool === "crop" && (
        <div className="fm-editor-toolbar fm-properties">
          {["x", "y", "width", "height"].map((key) => (
            <label key={key}>
              {key}
              <input
                aria-label={`Crop ${key}`}
                type="number"
                min="0"
                value={crop[key]}
                onChange={(e) =>
                  setCrop({ ...crop, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <button
            disabled={!editable || busy}
            onClick={() =>
              apply((target, image) => {
                if (
                  crop.width < 1 ||
                  crop.height < 1 ||
                  crop.x < 0 ||
                  crop.y < 0 ||
                  crop.x + crop.width > image.width ||
                  crop.y + crop.height > image.height
                )
                  throw new Error("Choose a crop inside the image.");
                target.width = crop.width;
                target.height = crop.height;
                target
                  .getContext("2d")
                  .drawImage(
                    image,
                    crop.x,
                    crop.y,
                    crop.width,
                    crop.height,
                    0,
                    0,
                    crop.width,
                    crop.height,
                  );
              })
            }
          >
            Apply crop
          </button>
          <span>Drag across the image to choose a crop.</span>
        </div>
      )}
      <div className="fm-editor-toolbar fm-properties">
        <label>
          Brightness
          <input
            type="range"
            min="20"
            max="200"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
          />
        </label>
        <label>
          Contrast
          <input
            type="range"
            min="20"
            max="200"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={grayscale}
            onChange={(e) => setGrayscale(e.target.checked)}
          />
          Grayscale
        </label>
        <button
          disabled={!editable || busy}
          onClick={() =>
            apply((target, image) => {
              target.width = image.width;
              target.height = image.height;
              const ctx = target.getContext("2d");
              ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale ? 100 : 0}%)`;
              ctx.drawImage(image, 0, 0);
            })
          }
        >
          Apply adjustments
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            try {
              await onSaveCopy(
                current,
                item.name.replace(/(\.[^.]+)$/, " (copy)$1"),
              );
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Save as a copy
        </button>
      </div>
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      <div className="fm-editor-content">
        <div
          className="fm-image-stage"
          style={{ maxWidth: "none", width: "100%", overflow: "auto" }}
        >
          <canvas
            ref={canvas}
            aria-label="Image editing canvas"
            style={{
              width: (size.width * zoom) / 100,
              maxWidth: "none",
              cursor: tool === "move" ? "default" : "crosshair",
              touchAction: "none",
              filter: `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale ? 100 : 0}%)`,
            }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={() => {
              drag.current = null;
              if (decoded.current && canvas.current)
                canvas.current
                  .getContext("2d")
                  .drawImage(decoded.current, 0, 0);
            }}
          />
        </div>
      </div>
      <footer className="fm-editor-status">
        <span>
          {size.width} × {size.height} pixels
        </span>
        <span>
          {busy ? "Applying change…" : "Changes save as a new file version."}
        </span>
        <span>Undo retains up to five recent edits.</span>
      </footer>
    </>
  );
}
