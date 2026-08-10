// Small EN/AR language toggle, extracted from App() in index.jsx.
export default function LangSwitch({ lang, setLang, colors }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {["en", "ar"].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          padding: "4px 12px", borderRadius: 6, border: `1px solid ${colors.border}`,
          background: lang === l ? colors.primary : "#fff",
          color: lang === l ? "#fff" : colors.text,
          cursor: "pointer", fontSize: 13, fontWeight: 600,
        }}>{l === "en" ? "English" : "عربي"}</button>
      ))}
    </div>
  );
}
