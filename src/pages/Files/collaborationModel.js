import * as Y from "yjs";
// Store object properties independently. Arrays of identified slides/objects retain
// stable identity; per-object positions preserve concurrent additions. Tied
// positions sort by ID, and concurrent moves use Y.Map's deterministic rule.
export function flatten(value, path = "", result = {}) {
  if (
    Array.isArray(value) &&
    value.every((x) => x && typeof x === "object" && typeof x.id === "string")
  ) {
    result[path + "/@kind"] = "identified-array";
    for (const [index, child] of value.entries()) {
      result[path + "/@position/" + encodeURIComponent(child.id)] = index;
      flatten(child, path + "/@items/" + encodeURIComponent(child.id), result);
    }
  } else if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length
  ) {
    for (const [key, child] of Object.entries(value))
      flatten(child, path + "/" + encodeURIComponent(key), result);
  } else result[path] = value;
  return result;
}
export function inflate(entries) {
  let root = {};
  for (const [path, value] of Object.entries(entries).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    if (!path) {
      root = value;
      continue;
    }
    const parts = path.slice(1).split("/").map(decodeURIComponent);
    if (
      parts.some((key) =>
        ["__proto__", "constructor", "prototype"].includes(key),
      )
    )
      throw new Error("Invalid collaboration property");
    if (!root || typeof root !== "object" || Array.isArray(root)) root = {};
    let target = root;
    parts.slice(0, -1).forEach((key) => {
      if (
        !target[key] ||
        typeof target[key] !== "object" ||
        Array.isArray(target[key])
      )
        target[key] = {};
      target = target[key];
    });
    target[parts.at(-1)] = value;
  }
  const visit = (value) => {
    if (!value || typeof value !== "object") return value;
    if (value["@kind"] === "identified-array")
      return Object.entries(value["@position"] || {})
        .sort(([a, x], [b, y]) => x - y || (a < b ? -1 : a > b ? 1 : 0))
        .filter(([id]) => value["@items"]?.[id])
        .map(([id]) => visit(value["@items"][id]));
    if (Object.hasOwn(value, "@order"))
      return value["@order"]
        .filter((id) => value["@items"]?.[id])
        .map((id) => visit(value["@items"][id]));
    if (Array.isArray(value)) return value.map(visit);
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, visit(v)]),
    );
  };
  return visit(root);
}
export function patchModel(doc, previous, next, origin = "local-editor") {
  const map = doc.getMap("model");
  const before = flatten(previous);
  const after = flatten(next);
  doc.transact(() => {
    for (const key of Object.keys(before))
      if (!Object.hasOwn(after, key)) map.delete(key);
    for (const [key, value] of Object.entries(after))
      if (JSON.stringify(before[key]) !== JSON.stringify(value))
        map.set(key, value);
  }, origin);
}
export const readModel = (doc) => inflate(doc.getMap("model").toJSON());
export function seedModel(doc, model) {
  patchModel(doc, {}, model, "initial");
}
export { Y };
// Grid engines may assign different style IDs to the same formatting on each
// client. Inline cell styles before syncing; retain canonical definitions for
// existing workbook resources that still refer to them.
export function normalizeLiveWorkbook(model, canonicalStyles) {
  const copy = structuredClone(model);
  const styles = copy.workbook?.styles || {};
  for (const sheet of Object.values(copy.workbook?.sheets || {}))
    for (const row of Object.values(sheet.cellData || {}))
      for (const cell of Object.values(row || {}))
        if (cell && typeof cell.s === "string")
          cell.s = structuredClone(styles[cell.s] || null);
  if (copy.workbook)
    copy.workbook.styles = structuredClone(canonicalStyles || styles);
  return copy;
}
