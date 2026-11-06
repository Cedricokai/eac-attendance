import { Server } from "@hocuspocus/server";
import { getSchema } from "@tiptap/core";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import { documentExtensions } from "../src/pages/Files/editors/documentExtensions.js";
import { validateLiveModel } from "../src/pages/Files/collaborationValidation.js";
import {
  Y,
  seedModel,
  readModel,
  normalizeLiveWorkbook,
} from "../src/pages/Files/collaborationModel.js";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.EAC_BACKEND_URL || "http://127.0.0.1:8080";
const secret = process.env.APP_FILES_COLLABORATION_KEY;
if (!secret || secret.length < 32)
  throw new Error(
    "Set APP_FILES_COLLABORATION_KEY to the same private value as the backend (32+ characters).",
  );
const origins = new Set(
  (
    process.env.EAC_COLLABORATION_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173"
  ).split(","),
);
const root = resolve(
  process.env.EAC_COLLABORATION_ROOT || ".collaboration-data",
);
await mkdir(root, { recursive: true });
const rooms = new Map();
const schema = getSchema(documentExtensions(true));
const parse = (name) => {
  const match = /^file-(\d+)-([a-zA-Z0-9-]{1,90})$/.exec(name);
  if (!match) throw new Error("Invalid document room");
  return { id: match[1], epoch: match[2] };
};
async function api(room, token, route, options = {}) {
  const response = await fetch(
    `${base}/api/files/${room.id}/collaboration/${route}`,
    {
      ...options,
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EAC-Collaboration-Key": secret,
        ...options.headers,
      },
    },
  );
  if (!response.ok) {
    const error = new Error(
      `Backend rejected collaboration (${response.status})`,
    );
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
const tokenFor = (document) =>
  document.getConnections().find((c) => !c.readOnly)?.context.token;
async function authorize(room, token) {
  const access = await api(room, token, "access");
  if (!access.available || access.epoch !== room.epoch)
    throw new Error("File changed or collaboration disabled. Reload the file.");
  return access;
}
function native(document, room) {
  if (room.format === "eac-document")
    return validateLiveModel(
      {
        format: room.format,
        schemaVersion: 1,
        content: yDocToProsemirrorJSON(document, "content"),
        layout: document.getMap("layout").toJSON(),
      },
      room.format,
    );
  return validateLiveModel(readModel(document), room.format);
}
async function persist(document, room) {
  const state = Y.encodeStateAsUpdate(document);
  if (state.length > 20 * 1024 * 1024)
    throw new Error("Live document exceeded 20 MB");
  const target = resolve(root, room.name + ".json");
  const temp = target + "." + randomUUID() + ".tmp";
  await writeFile(
    temp,
    JSON.stringify({
      version: room.version,
      epoch: room.epoch,
      state: Buffer.from(state).toString("base64"),
    }),
  );
  await rename(temp, target);
}
async function checkpoint(document, room) {
  if (!room.dirty || room.saving) return;
  const token = tokenFor(document) || room.lastEditorToken;
  if (!token) return;
  room.saving = true;
  const generation = room.generation;
  try {
    await api(room, token, "lease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epoch: room.epoch, roomId: room.roomId }),
    });
    const form = new FormData();
    form.append("epoch", room.epoch);
    form.append("roomId", room.roomId);
    form.append("version", room.version);
    form.append(
      "file",
      new Blob([JSON.stringify(native(document, room))], {
        type: room.mediaType,
      }),
      room.fileName,
    );
    form.append(
      "state",
      new Blob([Y.encodeStateAsUpdate(document)]),
      "snapshot.bin",
    );
    const saved = await api(room, token, "checkpoint", {
      method: "POST",
      body: form,
    });
    room.version = saved.currentVersion;
    room.dirty = room.generation !== generation;
    await persist(document, room);
    document.broadcastStateless(
      JSON.stringify({
        type: "saved",
        version: room.version,
        pending: room.dirty,
      }),
    );
  } finally {
    room.saving = false;
  }
}
const server = new Server({
  address: process.env.EAC_COLLABORATION_HOST || "127.0.0.1",
  port: Number(process.env.EAC_COLLABORATION_PORT || 1234),
  websocketOptions: { maxPayload: 20 * 1024 * 1024 },
  debounce: 10000,
  maxDebounce: 30000,
  quiet: true,
  async onAuthenticate({
    documentName,
    token,
    requestHeaders,
    connectionConfig,
  }) {
    const origin = requestHeaders.get("origin");
    if (origin && !origins.has(origin)) throw new Error("Origin not allowed");
    if (!token || token.length > 8192)
      throw new Error("Existing EAC login required");
    const room = parse(documentName);
    const access = await authorize(room, token);
    connectionConfig.readOnly = !access.canEdit;
    return { token, userId: access.userId, userName: access.userName };
  },
  async onLoadDocument({ documentName, document, context }) {
    const room = {
      ...parse(documentName),
      name: documentName,
      roomId: randomUUID(),
      generation: 0,
      dirty: false,
      saving: false,
    };
    const access = await authorize(room, context.token);
    if (!access.canEdit)
      throw new Error("An editor must start the live session first");
    const lease = await api(room, context.token, "lease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epoch: room.epoch, roomId: room.roomId }),
    });
    const saved = await api(room, context.token, "state");
    room.version = lease.version;
    const expected = saved.item.name.toLowerCase().endsWith(".eacdoc")
      ? "eac-document"
      : saved.item.name.toLowerCase().endsWith(".eacsheet")
        ? "eac-workbook"
        : "eac-presentation";
    const model = validateLiveModel(JSON.parse(saved.nativeJson), expected);
    room.format = model.format;
    room.fileName = saved.item.name;
    room.mediaType = saved.item.mediaType;
    let recovery;
    try {
      const disk = JSON.parse(
        await readFile(resolve(root, documentName + ".json"), "utf8"),
      );
      if (disk.epoch === room.epoch && disk.version === room.version)
        recovery = disk.state;
    } catch (error) {
      if (error.code !== "ENOENT")
        console.error(
          "A recovery snapshot could not be read for file",
          room.id,
        );
    }
    if (recovery) {
      Y.applyUpdate(document, Buffer.from(recovery, "base64"));
      room.dirty = true;
    } else if (saved.yState)
      Y.applyUpdate(document, Buffer.from(saved.yState, "base64"));
    else if (model.format === "eac-document") {
      const initial = prosemirrorJSONToYDoc(schema, model.content, "content");
      Y.applyUpdate(document, Y.encodeStateAsUpdate(initial));
      initial.destroy();
      for (const [k, v] of Object.entries(model.layout || {}))
        document.getMap("layout").set(k, v);
    } else
      seedModel(
        document,
        model.format === "eac-workbook" ? normalizeLiveWorkbook(model) : model,
      );
    room.lastEditorToken = context.token;
    rooms.set(documentName, room);
    room.timer = setInterval(async () => {
      try {
        for (const connection of document.getConnections()) {
          try {
            const access = await authorize(room, connection.context.token);
            if (!access.canEdit && !connection.readOnly)
              throw new Error("Edit access revoked");
          } catch {
            connection.close({
              code: 4403,
              reason: "File access changed. Reload.",
            });
          }
        }
        const token = tokenFor(document);
        if (token) {
          await api(room, token, "lease", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ epoch: room.epoch, roomId: room.roomId }),
          });
          await checkpoint(document, room);
        }
      } catch {
        document.broadcastStateless(
          JSON.stringify({
            type: "error",
            message:
              "Saving is unavailable. Download a recovery copy before closing.",
          }),
        );
      }
    }, 15000);
    return document;
  },
  async beforeHandleMessage({ documentName, context, connection }) {
    const access = await authorize(parse(documentName), context.token);
    if (!access.canEdit && !connection.readOnly)
      throw new Error("Edit access revoked");
    if (access.canEdit) {
      const room = rooms.get(documentName);
      if (room) room.lastEditorToken = context.token;
    }
  },
  beforeHandleAwareness({ states, context }) {
    if (context)
      for (const state of states.values())
        state.user = {
          name: String(context.userName).slice(0, 100),
          color: "#3976d6",
        };
  },
  async onChange({ documentName, document }) {
    const room = rooms.get(documentName);
    if (!room) return;
    room.dirty = true;
    room.generation++;
    clearTimeout(room.diskTimer);
    room.diskTimer = setTimeout(
      () =>
        persist(document, room).catch(() =>
          console.error("Recovery snapshot failed for file", room.id),
        ),
      500,
    );
  },
  async onStoreDocument({ documentName, document }) {
    const room = rooms.get(documentName);
    if (room) await checkpoint(document, room);
  },
  async beforeUnloadDocument({ documentName, document }) {
    const room = rooms.get(documentName);
    if (!room) return;
    clearInterval(room.timer);
    clearTimeout(room.diskTimer);
    await persist(document, room);
    // Keep the short backend lease after the final disconnect: if its last save
    // failed, this prevents an immediate unrelated save from hiding pending work.
  },
  afterUnloadDocument({ documentName }) {
    rooms.delete(documentName);
  },
});
await server.listen();
console.log(
  "EAC collaboration listening on",
  process.env.EAC_COLLABORATION_PORT || 1234,
);
