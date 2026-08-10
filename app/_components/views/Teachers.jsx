"use client";
import { useState } from "react";
import { DEFAULT_GRADES } from "../../_lib/schoolStructure";
import { uid } from "../../_lib/storage";

// Teacher management view, extracted from App() in index.jsx.
export default function Teachers({
  t, colors, css, teachers, setTeachers, subjects, streamsFor, showToast, showConfirm,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", staffId: "", email: "", phone: "", subjects: [], classes: [] });

  const filtered = teachers.filter(tc => tc.name.toLowerCase().includes(search.toLowerCase()) || tc.staffId.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setForm({ name: "", staffId: "", email: "", phone: "", subjects: [], classes: [] }); setEditId(null); setShowForm(true); };
  const openEdit = (tc) => { setForm({ ...tc, subjects: [...tc.subjects], classes: [...tc.classes] }); setEditId(tc.id); setShowForm(true); };
  const save = () => {
    if (!form.name) return;
    if (editId) setTeachers(p => p.map(tc => tc.id === editId ? { ...form, id: editId } : tc));
    else setTeachers(p => [...p, { ...form, id: uid() }]);
    setShowForm(false); showToast(t.saved);
  };
  const del = (id) => { showConfirm(t.confirm, () => { setTeachers(p => p.filter(tc => tc.id !== id)); showToast(t.deleted); }, { danger: true }); };
  const toggleSubject = (sname) => setForm(p => ({ ...p, subjects: p.subjects.includes(sname) ? p.subjects.filter(x => x !== sname) : [...p.subjects, sname] }));
  const toggleClass = (cls) => setForm(p => ({ ...p, classes: p.classes.includes(cls) ? p.classes.filter(x => x !== cls) : [...p.classes, cls] }));

  const allClassOptions = [
    ...DEFAULT_GRADES.junior.flatMap(g => streamsFor("junior").map(s => `${g}${s}`)),
    ...DEFAULT_GRADES.senior.flatMap(g => streamsFor("senior").map(s => `${g}${s}`)),
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.teachers.title}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...css.input, flex: "1 1 200px", minWidth: 150, width: "auto" }} placeholder={t.teachers.search} value={search} onChange={e => setSearch(e.target.value)} />
          <button style={css.btn()} onClick={openAdd}>+ {t.teachers.addTeacher}</button>
        </div>
      </div>

      <div style={css.card}>
        {filtered.length === 0 ? (
          <p style={{ color: colors.muted, textAlign: "center", padding: "40px 0" }}>{t.teachers.noTeachers}</p>
        ) : (
          <table style={css.table}>
            <thead>
              <tr>
                {[t.teachers.staffId, t.teachers.name, t.teachers.email, t.teachers.subjects, t.teachers.classes, t.actions].map(h => (
                  <th key={h} style={css.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tc => (
                <tr key={tc.id}>
                  <td style={css.td}><span style={{ fontWeight: 700, color: colors.primary }}>{tc.staffId}</span></td>
                  <td style={css.td}>{tc.name}</td>
                  <td style={css.td}>{tc.email}</td>
                  <td style={css.td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {tc.subjects.map(s => <span key={s} style={css.badge(colors.primary, "#e8f0ed")}>{s}</span>)}
                      {tc.subjects.length === 0 && <span style={{ color: colors.muted, fontSize: 12 }}>—</span>}
                    </div>
                  </td>
                  <td style={css.td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {tc.classes.map(c => <span key={c} style={css.badge("#1e40af", "#dbeafe")}>{c}</span>)}
                      {tc.classes.length === 0 && <span style={{ color: colors.muted, fontSize: 12 }}>—</span>}
                    </div>
                  </td>
                  <td style={css.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...css.btn("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(tc)}>✏️</button>
                      <button style={{ ...css.btn("danger"), padding: "4px 10px", fontSize: 12 }} onClick={() => del(tc.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={css.modal} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ ...css.modalBox, maxWidth: 640 }}>
            <div style={css.modalTitle}>{editId ? t.teachers.edit : t.teachers.addTeacher}</div>
            <div style={css.grid2}>
              <div style={css.formRow}>
                <label style={css.label}>{t.teachers.name}</label>
                <input style={css.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.teachers.staffId}</label>
                <input style={css.input} value={form.staffId} onChange={e => setForm(p => ({ ...p, staffId: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.teachers.email}</label>
                <input type="email" style={css.input} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.teachers.phone}</label>
                <input type="tel" style={css.input} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div style={css.formRow}>
              <label style={css.label}>{t.teachers.subjects}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 10, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.light }}>
                {subjects.map(s => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={form.subjects.includes(s.name)} onChange={() => toggleSubject(s.name)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={css.formRow}>
              <label style={css.label}>{t.teachers.classes}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 10, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.light, maxHeight: 140, overflowY: "auto" }}>
                {allClassOptions.map(cls => (
                  <label key={cls} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, minWidth: 90 }}>
                    <input type="checkbox" checked={form.classes.includes(cls)} onChange={() => toggleClass(cls)} />
                    {cls}
                  </label>
                ))}
              </div>
            </div>
            <div style={css.formActions}>
              <button style={css.btn("ghost")} onClick={() => setShowForm(false)}>{t.teachers.cancel}</button>
              <button style={css.btn()} onClick={save}>{t.teachers.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
