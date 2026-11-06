import JSZip from "jszip";
export function checkArchive(zip) {
  const entries = Object.values(zip.files);
  if (entries.length > 10000)
    throw new Error("Office archive contains too many entries.");
  let total = 0;
  for (const entry of entries) {
    // JSZip exposes central-directory lengths before inflating an entry.
    const size = entry._data?.uncompressedSize || 0;
    total += size;
    if (size > 50 * 1024 * 1024 || total > 100 * 1024 * 1024)
      throw new Error(
        "Expanded Office content exceeds the editor safety limit.",
      );
  }
  return zip;
}
export async function officeArchive(buffer) {
  return checkArchive(await JSZip.loadAsync(buffer));
}
