"use client";
import { useState } from "react";
import { uid } from "../../_lib/storage";

// Examination settings view, extracted from App() in index.jsx.
export default function Exams({ t, colors, css, exams, setExams, gradesFor, showToast, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const blank = { examName: "", term: t.terms[0], year: "2025", maxScore: 100, passMark: 40, weight: 100, level: "junior", grades: [], status: "Active" };
  const [form, setForm] = useState(blank);

  const save = () => {
    if (!form.examName) return;
    if (editId) setExams(p => p.map(e => e.id === editId ? { ...form, id: editId } : e));
    else setExams(p => [...p, { ...form, id: uid() }]);
    setShowForm(false); showToast(t.saved);
  };
  const del = (id) => { showConfirm(t.confirm, () => { setExams(p => p.filter(e => e.id !== id)); showToast(t.deleted); }, { danger: true }); };
  const openEdit = (e) => { setForm({ ...e, grades: [...e.grades], level: e.level || "junior" }); setEditId(e.id); setShowForm(true); };
  const openAdd = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const toggleGrade = (g) => setForm(p => ({ ...p, grades: p.grades.includes(g) ? p.grades.filter(x => x !== g) : [...p.grades, g] }));
  const onLevelChange = (level) => setForm(p => ({ ...p, level, grades: [] }));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.exams.title}</h2>
        <button style={css.btn()} onClick={openAdd}>+ {t.exams.addExam}</button>
      </div>

      <div style={css.card}>
        {exams.length === 0 ? (
          <p style={{ color: colors.muted, textAlign: "center", padding: "40px 0" }}>{t.exams.noExams}</p>
        ) : (
          <table style={css.table}>
            <thead>
              <tr>
                {[t.exams.examName, t.exams.level, t.exams.term, t.exams.year, t.exams.maxScore, t.exams.passMark, t.exams.weight, t.exams.status, t.actions].map(h => (
                  <th key={h} style={css.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exams.map(e => (
                <tr key={e.id}>
                  <td style={css.td}><strong>{e.examName}</strong></td>
                  <td style={css.td}>
                    <span style={css.badge(e.level === "junior" ? "#0c5460" : colors.primary, e.level === "junior" ? "#bee5eb" : "#e8f0ed")}>{t.levels[e.level]}</span>
                  </td>
                  <td style={css.td}>{e.term}</td>
                  <td style={css.td}>{e.year}</td>
                  <td style={css.td}><span style={{ fontWeight: 700 }}>{e.maxScore}</span></td>
                  <td style={css.td}>{e.passMark}</td>
                  <td style={css.td}>{e.weight}%</td>
                  <td style={css.td}>
                    <span style={css.badge(e.status === "Active" ? "#166534" : "#6b7280", e.status === "Active" ? "#dcfce7" : "#f3f4f6")}>
                      {e.status === "Active" ? t.exams.active : t.exams.inactive}
                    </span>
                  </td>
                  <td style={css.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...css.btn("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(e)}>✏️</button>
                      <button style={{ ...css.btn("danger"), padding: "4px 10px", fontSize: 12 }} onClick={() => del(e.id)}>🗑</button>
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
          <div style={css.modalBox}>
            <div style={css.modalTitle}>{editId ? t.exams.edit : t.exams.addExam}</div>
            <div style={css.formRow}>
              <label style={css.label}>{t.exams.examName}</label>
              <input style={css.input} value={form.examName} onChange={e => setForm(p => ({ ...p, examName: e.target.value }))} />
            </div>
            <div style={css.formRow}>
              <label style={css.label}>{t.exams.level}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={{ ...css.levelPill("junior", form.level === "junior"), flex: 1 }} onClick={() => onLevelChange("junior")}>{t.dashboard.junior}</button>
                <button type="button" style={{ ...css.levelPill("senior", form.level === "senior"), flex: 1 }} onClick={() => onLevelChange("senior")}>{t.dashboard.senior}</button>
              </div>
            </div>
            <div style={css.grid3}>
              <div style={css.formRow}>
                <label style={css.label}>{t.exams.term}</label>
                <select style={css.select} value={form.term} onChange={e => setForm(p => ({ ...p, term: e.target.value }))}>
                  {t.terms.map(term => <option key={term}>{term}</option>)}
                </select>
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.exams.year}</label>
                <input style={css.input} value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.exams.status}</label>
                <select style={css.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="Active">{t.exams.active}</option>
                  <option value="Inactive">{t.exams.inactive}</option>
                </select>
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.exams.maxScore}</label>
                <input type="number" style={css.input} value={form.maxScore} onChange={e => setForm(p => ({ ...p, maxScore: +e.target.value }))} min={1} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.exams.passMark}</label>
                <input type="number" style={css.input} value={form.passMark} onChange={e => setForm(p => ({ ...p, passMark: +e.target.value }))} min={0} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.exams.weight}</label>
                <input type="number" style={css.input} value={form.weight} onChange={e => setForm(p => ({ ...p, weight: +e.target.value }))} min={1} max={100} />
              </div>
            </div>
            <div style={css.formRow}>
              <label style={css.label}>{t.exams.grades}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 10, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.light }}>
                {gradesFor(form.level).map(g => (
                  <label key={g} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={form.grades.includes(g)} onChange={() => toggleGrade(g)} />
                    {g}
                  </label>
                ))}
              </div>
            </div>
            <div style={css.formActions}>
              <button style={css.btn("ghost")} onClick={() => setShowForm(false)}>{t.exams.cancel}</button>
              <button style={css.btn()} onClick={save}>{t.exams.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
