import * as XLSX from "xlsx";

// Utility id generator, extracted from index.jsx.
export const uid = () => Math.random().toString(36).slice(2, 9);

// ─── PERSISTENT STORAGE LAYER ─────────────────────────────────────────────────
// All school data is saved under a single key (per data domain) via window.storage,
// which persists across sessions for this user. Falls back silently (in-memory only)
// if window.storage is unavailable.
export const STORAGE_KEY = "skbzs-sms-data-v1";
export const DATA_VERSION = 1;

export async function storageGet(key) {
  try {
    if (!window.storage) return null;
    const result = await window.storage.get(key, false);
    return result ? JSON.parse(result.value) : null;
  } catch {
    return null;
  }
}
export async function storageSet(key, value) {
  try {
    if (!window.storage) return false;
    const result = await window.storage.set(key, JSON.stringify(value), false);
    return !!result;
  } catch {
    return false;
  }
}

export function downloadJSON(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadWorkbook(filename, sheets) {
  // sheets: array of { name, rows: array of objects }
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

// ── Iframe-based print (works inside sandboxed iframes — no popup needed) ──
export function iframePrint(html) {
  // Remove any stale print frame
  const old = document.getElementById("__sms_print_frame__");
  if (old) old.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "__sms_print_frame__";
  iframe.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;background:#fff;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Show a close button overlay so user can dismiss after printing
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕  Close Print View";
  closeBtn.style.cssText = [
    "position:fixed","top:12px","right:12px","z-index:100000",
    "background:#1c3d2e","color:#fff","border:none","border-radius:8px",
    "padding:10px 20px","font-size:14px","font-weight:700","cursor:pointer",
    "box-shadow:0 4px 16px rgba(0,0,0,.4)",
  ].join(";");
  closeBtn.id = "__sms_close_btn__";
  closeBtn.onclick = () => {
    iframe.remove();
    closeBtn.remove();
  };
  document.body.appendChild(closeBtn);

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch(e) {
      // If browser blocks contentWindow.print(), fall back to triggering from parent
      window.print();
    }
  };
}

export function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
