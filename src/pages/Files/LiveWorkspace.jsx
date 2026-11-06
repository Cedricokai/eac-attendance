/* eslint-disable react/prop-types */
import { useEffect, useState, lazy, Suspense } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { fileApi, downloadBlob } from "./fileApi";
import { ReturnWorkDialog } from "./FileWorkReview";
import { readModel } from "./collaborationModel";
import { yDocToProsemirrorJSON } from "y-prosemirror";
const DocumentEditor = lazy(() => import("./editors/DocumentEditor"));
const SpreadsheetEditor = lazy(() => import("./editors/SpreadsheetEditor"));
const PresentationEditor = lazy(() => import("./editors/PresentationEditor"));
const emptyBlob = new Blob();

export default function LiveWorkspace({ item, onClose }) {
  const extension = item.name.split(".").pop().toLowerCase();
  const Editor =
    extension === "eacsheet"
      ? SpreadsheetEditor
      : extension === "eacslides"
        ? PresentationEditor
        : DocumentEditor;
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState("");
  const [people, setPeople] = useState([]);
  const [pending, setPending] = useState(false);
  const [returnItem, setReturnItem] = useState(null);
  useEffect(() => {
    let cancelled = false,
      provider,
      doc;
    (async () => {
      const access = await fileApi(`/${item.id}/collaboration/access`);
      if (cancelled) return;
      if (!access.available)
        throw new Error("Live collaboration is unavailable.");
      doc = new Y.Doc();
      provider = new HocuspocusProvider({
        url:
          import.meta.env.VITE_COLLABORATION_URL ||
          (["localhost", "127.0.0.1"].includes(window.location.hostname)
            ? "ws://localhost:1234"
            : `wss://${window.location.host}/collaboration`),
        name: `file-${item.id}-${access.epoch}`,
        document: doc,
        token: () => localStorage.getItem("jwtToken"),
        onStatus: ({ status }) => {
          if (!cancelled)
            setStatus(
              status === "connected"
                ? "Connected"
                : status === "connecting"
                  ? "Reconnecting…"
                  : "Disconnected — keep this window open",
            );
        },
        onAuthenticationFailed: () => {
          if (!cancelled)
            setError(
              "Connection or file access was rejected. Download your recovery copy, then reload the file.",
            );
        },
        onSynced: ({ state }) => {
          if (state && !cancelled) setSession({ doc, provider, access });
        },
        onStateless: ({ payload }) => {
          try {
            const message = JSON.parse(payload);
            if (message.type === "saved") {
              setPending(message.pending);
              setStatus(`Saved · version ${message.version}`);
            }
            if (message.type === "error") setError(message.message);
          } catch {
            /* Ignore unknown protocol messages. */
          }
        },
      });
      doc.on("update", (_update, origin) => {
        if (origin !== provider && !cancelled) setPending(true);
      });
      provider.awareness.setLocalStateField("user", {
        name: access.userName,
        color: "#3976d6",
      });
      const presence = () => {
        if (!cancelled)
          setPeople(
            [...provider.awareness.getStates().values()]
              .map((s) => s.user?.name)
              .filter(Boolean),
          );
      };
      provider.awareness.on("change", presence);
      presence();
    })().catch((e) => {
      if (!cancelled) setError(e.message);
    });
    return () => {
      cancelled = true;
      provider?.destroy();
      doc?.destroy();
    };
  }, [item.id]);
  useEffect(() => {
    const warn = (e) => {
      if (pending) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  const recovery = () => {
    const model = item.name.endsWith(".eacdoc")
      ? {
          format: "eac-document",
          schemaVersion: 1,
          content: yDocToProsemirrorJSON(session.doc, "content"),
          layout: session.doc.getMap("layout").toJSON(),
        }
      : readModel(session.doc);
    downloadBlob(
      new Blob([JSON.stringify(model)], { type: item.mediaType }),
      item.name.replace(/(\.[^.]+)$/, " (recovered)$1"),
    );
  };
  return (
    <section
      className={`fm-editor ${extension === "eacsheet" ? "fm-excel-editor" : "fm-word-editor"}`}
      aria-label="Live file workspace"
    >
      <header className="fm-editor-bar">
        <button
          onClick={() => {
            if (
              !pending ||
              window.confirm(
                "Pending live edits may not be saved. Download a recovery copy before leaving. Close?",
              )
            )
              onClose();
          }}
        >
          Files
        </button>
        <h2>{item.name}</h2>
        <small role="status">
          {status}
          {pending ? " · Pending checkpoint" : ""}
        </small>
        {session && <button onClick={recovery}>Download recovery copy</button>}
        {session?.access.canEdit && item.access !== "OWNER" && <button disabled={pending || !!error} onClick={async () => { try { setReturnItem(await fileApi(`/${item.id}`)); } catch (e) { setError(e.message); } }}>Send back to owner</button>}
      </header>
      <div className="fm-notice">
        Live collaboration · {people.join(", ") || "Connecting"} · Server
        checkpoints every 10–30 seconds.
      </div>
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      {session ? (
        <Suspense fallback={<div>Loading editor…</div>}>
          <Editor
            item={item}
            extension={extension}
            blob={emptyBlob}
            canEdit={session.access.canEdit}
            live={session}
            onChange={() => setPending(true)}
          />
        </Suspense>
      ) : (
        <div className="fm-notice">Waiting for the secure live session…</div>
      )}
      {returnItem && <ReturnWorkDialog item={returnItem} onClose={() => setReturnItem(null)}/>}
    </section>
  );
}
