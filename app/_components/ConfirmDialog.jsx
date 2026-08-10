// Confirmation dialog modal, extracted from index.jsx.
export default function ConfirmDialog({ dialog, onCancel }) {
  if (!dialog) return null;
  const danger = dialog.danger !== false;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10000, padding: 20, fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, maxWidth: 420, width: "100%",
        boxShadow: "0 12px 40px rgba(0,0,0,.3)", overflow: "hidden",
      }}>
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: danger ? "#fee2e2" : "#e0f2fe",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>
            {danger ? "⚠️" : "❓"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111", marginBottom: 6 }}>
              {dialog.message}
            </div>
            {dialog.subMessage && (
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{dialog.subMessage}</div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "20px 24px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { dialog.onConfirm(); onCancel(); }}
            style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: danger ? "#dc2626" : "#1c3d2e", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {danger ? "Delete" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
