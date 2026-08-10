"use client";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { DEFAULT_GRADES } from "../../_lib/schoolStructure";
import { uid, downloadWorkbook, nowStamp } from "../../_lib/storage";

// Student management view, extracted from App() in index.jsx.
export default function Students({
  t, lang, colors, css, students, setStudents, gradesFor, streamsFor, showToast, showConfirm,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const blank = { name: "", level: "junior", grade: DEFAULT_GRADES.junior[0], stream: streamsFor("junior")[0] || "", gender: "Male", admNo: "", dob: "", parent: "", phone: "" };
  const [form, setForm] = useState(blank);
  const fileRef = useRef();

  const filtered = students.filter(s =>
    (filterLevel === "all" || s.level === filterLevel) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.admNo.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditId(s.id); setShowForm(true); };
  const save = () => {
    if (!form.name || !form.admNo) return;
    if (editId) setStudents(p => p.map(s => s.id === editId ? { ...form, id: editId } : s));
    else setStudents(p => [...p, { ...form, id: uid() }]);
    setShowForm(false); showToast(t.saved);
  };
  const del = (id) => { showConfirm(t.confirm, () => { setStudents(p => p.filter(s => s.id !== id)); showToast(t.deleted); }, { danger: true }); };

  const onLevelChange = (level) => {
    const g = gradesFor(level)[0] || "";
    const s = streamsFor(level)[0] || "";
    setForm(p => ({ ...p, level, grade: g, stream: s }));
  };

  const [importPreview, setImportPreview] = useState(null);
  // importPreview: { rows: [...], mapped: [...], errors: [...] }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) {
          showToast(lang === "ar" ? "الملف فارغ أو لا يحتوي على بيانات." : "File is empty or has no data rows.");
          return;
        }

        // Map rows to student objects, collect errors
        const mapped = [];
        const errors = [];
        rows.forEach((r, i) => {
          const name = String(r.Name || r.name || r["Student Name"] || r["Full Name"] || "").trim();
          if (!name) { errors.push(`Row ${i + 2}: Missing name`); return; }
          const grade = String(r.Grade || r.grade || r["Class"] || DEFAULT_GRADES.junior[0]).trim();
          const levelRaw = String(r.Level || r.level || r["School Level"] || "").toLowerCase();
          const level = levelRaw.includes("senior") || DEFAULT_GRADES.senior.includes(grade) ? "senior" : "junior";
          const stream = String(r.Stream || r.stream || r["Class Stream"] || streamsFor(level)[0] || "").trim();
          const gender = String(r.Gender || r.gender || r["Sex"] || "Male").trim();
          const admNo = String(r.AdmNo || r["Adm No"] || r["Admission No"] || r["Admission Number"] || r.admno || `AUTO-${uid().slice(0,5).toUpperCase()}`).trim();
          mapped.push({
            id: uid(), name, level, grade, stream,
            gender: gender.toLowerCase().startsWith("f") ? "Female" : "Male",
            admNo,
            dob: String(r.DOB || r["Date of Birth"] || r.dob || "").trim(),
            parent: String(r.Parent || r["Parent/Guardian"] || r.parent || "").trim(),
            phone: String(r.Phone || r.phone || r["Phone No"] || "").trim(),
          });
        });

        setImportPreview({ rows, mapped, errors, fileName: file.name });
      } catch (err) {
        showToast(lang === "ar" ? "فشل قراءة الملف. تأكد أنه ملف Excel صحيح." : `Failed to read file. Make sure it is a valid Excel file. (${err.message})`);
      }
    };
    reader.onerror = () => {
      showToast(lang === "ar" ? "خطأ في قراءة الملف." : "Error reading file.");
    };
    reader.readAsArrayBuffer(file);
    // Reset input AFTER scheduling the read (not before)
    setTimeout(() => { e.target.value = ""; }, 100);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    setStudents(p => [...p, ...importPreview.mapped]);
    showToast(t.importSuccess(importPreview.mapped.length));
    setImportPreview(null);
  };

  // Generate a sample Excel template as a downloadable file
  const downloadTemplate = () => {
    const sampleRows = [
      { Name: "Fatima Hassan", AdmNo: "ADM001", Grade: "Grade 7", Stream: "R", Gender: "Female", Level: "Junior", DOB: "2012-03-14", Parent: "Hassan Omar", Phone: "0712345678" },
      { Name: "Yusuf Abdi", AdmNo: "ADM002", Grade: "Grade 10", Stream: "A", Gender: "Male", Level: "Senior", DOB: "2009-05-18", Parent: "Abdi Nur", Phone: "0745678901" },
    ];
    downloadWorkbook(`student-import-template-${nowStamp()}.xlsx`, [{ name: "Students", rows: sampleRows }]);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.students.title}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...css.input, flex: "1 1 200px", minWidth: 150, width: "auto" }} placeholder={t.students.search} value={search} onChange={e => setSearch(e.target.value)} />
          <button style={css.btn("ghost")} onClick={() => fileRef.current.click()}>📥 {t.students.importExcel}</button>
          <button style={{ ...css.btn("ghost") }} onClick={downloadTemplate} title="Download Excel template">📋 Template</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style={{ display: "none" }} onChange={handleFileSelect} />
          <button style={css.btn()} onClick={openAdd}>+ {t.students.addStudent}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={css.levelPill("all", filterLevel === "all")} onClick={() => setFilterLevel("all")}>{t.students.allLevels}</button>
        <button style={css.levelPill("junior", filterLevel === "junior")} onClick={() => setFilterLevel("junior")}>{t.dashboard.junior}</button>
        <button style={css.levelPill("senior", filterLevel === "senior")} onClick={() => setFilterLevel("senior")}>{t.dashboard.senior}</button>
      </div>

      <div style={css.card}>
        <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 12px" }}>
          💡 {t.students.importHint} — <button onClick={downloadTemplate} style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", fontWeight: 700, padding: 0, textDecoration: "underline", fontSize: 12 }}>Download Template</button>
        </p>
        {filtered.length === 0 ? (
          <p style={{ color: colors.muted, textAlign: "center", padding: "40px 0" }}>{t.students.noStudents}</p>
        ) : (
          <table style={css.table}>
            <thead>
              <tr>
                {[t.students.admNo, t.students.name, t.students.level, t.students.grade, t.students.stream, t.students.gender, t.actions].map(h => (
                  <th key={h} style={css.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td style={css.td}><span style={{ fontWeight: 700, color: colors.primary }}>{s.admNo}</span></td>
                  <td style={css.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: colors.primary, color: colors.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {s.name.charAt(0)}
                      </div>
                      {s.name}
                    </div>
                  </td>
                  <td style={css.td}>
                    <span style={css.badge(s.level === "junior" ? "#0c5460" : colors.primary, s.level === "junior" ? "#bee5eb" : "#e8f0ed")}>
                      {t.levels[s.level]}
                    </span>
                  </td>
                  <td style={css.td}>{s.grade}</td>
                  <td style={css.td}><span style={css.badge(colors.primary, "#e8f0ed")}>{s.stream}</span></td>
                  <td style={css.td}>
                    <span style={css.badge(s.gender === "Male" ? "#1e40af" : "#9333ea", s.gender === "Male" ? "#dbeafe" : "#f3e8ff")}>
                      {s.gender === "Male" ? "♂" : "♀"} {lang === "ar" ? (s.gender === "Male" ? "ذكر" : "أنثى") : s.gender}
                    </span>
                  </td>
                  <td style={css.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...css.btn("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(s)}>✏️</button>
                      <button style={{ ...css.btn("danger"), padding: "4px 10px", fontSize: 12 }} onClick={() => del(s.id)}>🗑</button>
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
            <div style={css.modalTitle}>{editId ? t.students.edit : t.students.addStudent}</div>
            <div style={css.formRow}>
              <label style={css.label}>{t.students.level}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={{ ...css.levelPill("junior", form.level === "junior"), flex: 1 }} onClick={() => onLevelChange("junior")}>{t.dashboard.junior}</button>
                <button type="button" style={{ ...css.levelPill("senior", form.level === "senior"), flex: 1 }} onClick={() => onLevelChange("senior")}>{t.dashboard.senior}</button>
              </div>
            </div>
            <div style={css.grid2}>
              <div style={css.formRow}>
                <label style={css.label}>{t.students.name}</label>
                <input style={css.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.students.admNo}</label>
                <input style={css.input} value={form.admNo} onChange={e => setForm(p => ({ ...p, admNo: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.students.grade}</label>
                <select style={css.select} value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}>
                  {gradesFor(form.level).map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.students.stream}</label>
                <select style={css.select} value={form.stream} onChange={e => setForm(p => ({ ...p, stream: e.target.value }))}>
                  {streamsFor(form.level).length === 0 && <option value="">—</option>}
                  {streamsFor(form.level).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.students.gender}</label>
                <select style={css.select} value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="Male">{t.students.male}</option>
                  <option value="Female">{t.students.female}</option>
                </select>
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.students.dob}</label>
                <input type="date" style={css.input} value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.students.parent}</label>
                <input style={css.input} value={form.parent} onChange={e => setForm(p => ({ ...p, parent: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.students.phone}</label>
                <input type="tel" style={css.input} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div style={css.formActions}>
              <button style={css.btn("ghost")} onClick={() => setShowForm(false)}>{t.students.cancel}</button>
              <button style={css.btn()} onClick={save}>{t.students.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Preview Modal ── */}
      {importPreview && (
        <div style={css.modal}>
          <div style={{ ...css.modalBox, maxWidth: 740 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={css.modalTitle}>📥 Import Preview — {importPreview.fileName}</div>
              <button onClick={() => setImportPreview(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: colors.muted }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ background: "#dcfce7", color: "#166534", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}>
                ✓ {importPreview.mapped.length} students ready to import
              </div>
              {importPreview.errors.length > 0 && (
                <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}>
                  ⚠ {importPreview.errors.length} rows skipped
                </div>
              )}
            </div>

            {importPreview.errors.length > 0 && (
              <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#854d0e" }}>
                <strong>Skipped rows:</strong> {importPreview.errors.join(" · ")}
              </div>
            )}

            <div style={{ maxHeight: 280, overflowY: "auto", overflowX: "auto", border: `1px solid ${colors.border}`, borderRadius: 8, marginBottom: 16 }}>
              <table style={css.table}>
                <thead>
                  <tr>
                    {["#", "Name", "Adm No", "Level", "Grade", "Stream", "Gender", "Parent"].map(h => (
                      <th key={h} style={{ ...css.th, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.mapped.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ ...css.td, color: colors.muted, fontSize: 12 }}>{i + 1}</td>
                      <td style={{ ...css.td, fontWeight: 600 }}>{s.name}</td>
                      <td style={css.td}>{s.admNo}</td>
                      <td style={css.td}>
                        <span style={css.badge(s.level === "junior" ? "#0c5460" : colors.primary, s.level === "junior" ? "#bee5eb" : "#e8f0ed")}>
                          {t.levels[s.level]}
                        </span>
                      </td>
                      <td style={css.td}>{s.grade}</td>
                      <td style={css.td}><span style={css.badge(colors.primary, "#e8f0ed")}>{s.stream}</span></td>
                      <td style={css.td}>{s.gender}</td>
                      <td style={css.td}>{s.parent || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: colors.light, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: colors.muted }}>
              <strong>Expected columns:</strong> Name, AdmNo, Grade, Stream, Gender, Level, DOB, Parent, Phone
              <br />Column names are flexible — e.g. &quot;Full Name&quot;, &quot;Student Name&quot;, &quot;Class&quot; also work. Download the <button onClick={downloadTemplate} style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", fontWeight: 700, padding: 0, textDecoration: "underline" }}>template file</button> for the exact format.
            </div>

            <div style={css.formActions}>
              <button style={css.btn("ghost")} onClick={() => setImportPreview(null)}>Cancel</button>
              <button style={css.btn()} onClick={confirmImport} disabled={importPreview.mapped.length === 0}>
                ✓ Import {importPreview.mapped.length} Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
