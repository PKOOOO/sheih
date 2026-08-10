"use client";
import { useState } from "react";
import { uid } from "../../_lib/storage";

// Streams-for-a-level card, hoisted to module scope (not declared inside
// ClassesStreams) so React doesn't remount it — and reset its subtree state —
// on every render of the parent.
function LevelBlock({ level, t, colors, css, gradesFor, streams, students, openAdd, openEdit, del }) {
  return (
    <div style={css.card}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, color: colors.primary, fontSize: 16 }}>{t.levels[level]}</div>
          <div style={{ fontSize: 12, color: colors.muted }}>{t.classes.gradesInLevel}: {gradesFor(level).join(", ")}</div>
        </div>
        <button style={css.btn()} onClick={() => openAdd(level)}>+ {t.classes.addStream}</button>
      </div>
      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>{t.classes.streamsInLevel}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {streams.filter(s => s.level === level).length === 0 ? (
          <p style={{ color: colors.muted, fontSize: 13 }}>{t.classes.noStreams}</p>
        ) : streams.filter(s => s.level === level).map(s => {
          const count = students.filter(st => st.level === level && st.stream === s.name).length;
          return (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
              border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.light,
            }}>
              <span style={{ fontWeight: 700, color: colors.primary }}>{s.name}</span>
              <span style={{ fontSize: 11, color: colors.muted }}>({count})</span>
              <button onClick={() => openEdit(s)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✏️</button>
              <button onClick={() => del(s)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: colors.danger }}>🗑</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Classes & Streams management view, extracted from App() in index.jsx.
export default function ClassesStreams({
  t, lang, colors, css, streams, setStreams, students, setStudents, gradesFor, showToast, showConfirm,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", level: "junior" });

  const openAdd = (level) => { setForm({ name: "", level }); setEditId(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditId(s.id); setShowForm(true); };

  const save = () => {
    const name = form.name.trim();
    if (!name) return;
    const dup = streams.find(s => s.level === form.level && s.name.toLowerCase() === name.toLowerCase() && s.id !== editId);
    if (dup) { showToast(lang === "ar" ? "هذه الشعبة موجودة بالفعل" : "This stream already exists for this level"); return; }
    if (editId) {
      const old = streams.find(s => s.id === editId);
      setStreams(p => p.map(s => s.id === editId ? { ...s, name } : s));
      if (old && old.name !== name) {
        setStudents(p => p.map(s => (s.level === old.level && s.stream === old.name) ? { ...s, stream: name } : s));
      }
    } else {
      setStreams(p => [...p, { id: uid(), name, level: form.level }]);
    }
    setShowForm(false); showToast(t.saved);
  };

  const del = (s) => {
    const inUse = students.some(st => st.level === s.level && st.stream === s.name);
    if (inUse) { showToast(t.classes.inUseWarning); return; }
    showConfirm(t.confirm, () => { setStreams(p => p.filter(x => x.id !== s.id)); showToast(t.deleted); }, { danger: true });
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.classes.title}</h2>
        <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{t.classes.subtitle}</p>
      </div>

      <LevelBlock level="junior" t={t} colors={colors} css={css} gradesFor={gradesFor} streams={streams} students={students} openAdd={openAdd} openEdit={openEdit} del={del} />
      <LevelBlock level="senior" t={t} colors={colors} css={css} gradesFor={gradesFor} streams={streams} students={students} openAdd={openAdd} openEdit={openEdit} del={del} />

      {showForm && (
        <div style={css.modal} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={css.modalBox}>
            <div style={css.modalTitle}>{editId ? t.classes.edit : t.classes.addStream}</div>
            <div style={css.formRow}>
              <label style={css.label}>{t.classes.level}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={!!editId} style={{ ...css.levelPill("junior", form.level === "junior"), flex: 1, opacity: editId ? .6 : 1 }} onClick={() => !editId && setForm(p => ({ ...p, level: "junior" }))}>{t.dashboard.junior}</button>
                <button type="button" disabled={!!editId} style={{ ...css.levelPill("senior", form.level === "senior"), flex: 1, opacity: editId ? .6 : 1 }} onClick={() => !editId && setForm(p => ({ ...p, level: "senior" }))}>{t.dashboard.senior}</button>
              </div>
            </div>
            <div style={css.formRow}>
              <label style={css.label}>{t.classes.streamName}</label>
              <input style={css.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. A, R, North…" />
            </div>
            <div style={css.formActions}>
              <button style={css.btn("ghost")} onClick={() => setShowForm(false)}>{t.classes.cancel}</button>
              <button style={css.btn()} onClick={save}>{t.classes.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
