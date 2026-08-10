"use client";
import { useState } from "react";
import { uid } from "../../_lib/storage";

// Subject management view, extracted from App() in index.jsx.
export default function Subjects({ t, colors, css, subjects, setSubjects, showToast, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", category: "", description: "", levels: ["junior", "senior"] });
  const categories = ["Quran Sciences", "Islamic Law", "Languages", "Islamic Sciences", "History", "Other"];
  const catColors = { "Quran Sciences": ["#7c3aed", "#ede9fe"], "Islamic Law": ["#0f766e", "#ccfbf1"], "Languages": ["#1d4ed8", "#dbeafe"], "Islamic Sciences": ["#b45309", "#fef3c7"], "History": ["#6b7280", "#f3f4f6"], "Other": ["#374151", "#e5e7eb"] };

  const save = () => {
    if (!form.name) return;
    if (editId) setSubjects(p => p.map(s => s.id === editId ? { ...form, id: editId } : s));
    else setSubjects(p => [...p, { ...form, id: uid() }]);
    setShowForm(false); showToast(t.saved);
  };
  const del = (id) => { showConfirm(t.confirm, () => { setSubjects(p => p.filter(s => s.id !== id)); showToast(t.deleted); }, { danger: true }); };
  const openEdit = (s) => { setForm({ ...s, levels: s.levels || ["junior", "senior"] }); setEditId(s.id); setShowForm(true); };
  const openAdd = () => { setForm({ name: "", code: "", category: categories[0], description: "", levels: ["junior", "senior"] }); setEditId(null); setShowForm(true); };
  const toggleLevel = (lv) => setForm(p => ({ ...p, levels: p.levels.includes(lv) ? p.levels.filter(x => x !== lv) : [...p.levels, lv] }));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.subjects.title}</h2>
        <button style={css.btn()} onClick={openAdd}>+ {t.subjects.addSubject}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {subjects.length === 0 ? (
          <p style={{ color: colors.muted, gridColumn: "1/-1", textAlign: "center", padding: "40px 0" }}>{t.subjects.noSubjects}</p>
        ) : subjects.map(s => {
          const [c, bg] = catColors[s.category] || catColors["Other"];
          return (
            <div key={s.id} style={{ ...css.card, marginBottom: 0, borderTop: `3px solid ${c}` }}>
              <span style={{ ...css.badge(c, bg), marginBottom: 8, display: "inline-block" }}>{s.code}</span>
              <div style={{ fontWeight: 700, fontSize: 15, color: colors.primary, marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: colors.muted }}>{s.category}</div>
              {s.description && <div style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>{s.description}</div>}
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {(s.levels || []).map(lv => (
                  <span key={lv} style={css.badge(lv === "junior" ? "#0c5460" : colors.primary, lv === "junior" ? "#bee5eb" : "#e8f0ed")}>{t.levels[lv]}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button style={{ ...css.btn("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(s)}>✏️</button>
                <button style={{ ...css.btn("danger"), padding: "4px 10px", fontSize: 12 }} onClick={() => del(s.id)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div style={css.modal} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={css.modalBox}>
            <div style={css.modalTitle}>{editId ? t.subjects.edit : t.subjects.addSubject}</div>
            {[[t.subjects.name, "name"], [t.subjects.code, "code"]].map(([label, key]) => (
              <div key={key} style={css.formRow}>
                <label style={css.label}>{label}</label>
                <input style={css.input} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div style={css.formRow}>
              <label style={css.label}>{t.subjects.category}</label>
              <select style={css.select} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={css.formRow}>
              <label style={css.label}>{t.subjects.levels}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={{ ...css.levelPill("junior", form.levels.includes("junior")), flex: 1 }} onClick={() => toggleLevel("junior")}>{t.dashboard.junior}</button>
                <button type="button" style={{ ...css.levelPill("senior", form.levels.includes("senior")), flex: 1 }} onClick={() => toggleLevel("senior")}>{t.dashboard.senior}</button>
              </div>
            </div>
            <div style={css.formRow}>
              <label style={css.label}>{t.subjects.description}</label>
              <textarea style={{ ...css.input, height: 70, resize: "vertical" }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={css.formActions}>
              <button style={css.btn("ghost")} onClick={() => setShowForm(false)}>{t.subjects.cancel}</button>
              <button style={css.btn()} onClick={save}>{t.subjects.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
