"use client";
// Toast notification, extracted from index.jsx.
import { useIsMobile } from "../_lib/useIsMobile";

export default function Toast({ msg, onClose }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      position: "fixed",
      // Full-width strip along the bottom on phones; floating pill on desktop.
      bottom: isMobile ? 12 : 24,
      right: isMobile ? 12 : 24,
      left: isMobile ? 12 : "auto",
      background: "#1c3d2e",
      color: "#fff", padding: "12px 20px", borderRadius: 8, zIndex: 9999,
      boxShadow: "0 4px 16px rgba(0,0,0,.3)", fontFamily: "inherit", fontSize: 14,
      display: "flex", alignItems: "center", gap: 12
    }}>
      <span>✓</span><span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16, marginLeft: 8, flexShrink: 0 }}>×</button>
    </div>
  );
}
