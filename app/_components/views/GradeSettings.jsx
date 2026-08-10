"use client";
import { useState } from "react";
import { DEFAULT_GRADES } from "../../_lib/schoolStructure";
import { DEFAULT_CBE_GRADES } from "../../_lib/grading";
import { uid } from "../../_lib/storage";

// Grade scale settings view, extracted from App() in index.jsx.
export default function GradeSettings({
  t, colors, css, cbeGrades, setCbeGrades, extraGrades, setExtraGrades, gradesForLevel, students, showToast, showConfirm,
}) {
  const [localGrades, setLocalGrades] = useState(cbeGrades.map(g => ({ ...g })));
  const [hasChanges, setHasChanges] = useState(false);
  const [newGradeName, setNewGradeName] = useState({ junior: "", senior: "" });

  const updateBand = (idx, field, val) => {
    setLocalGrades(prev => {
      const next = prev.map((g, i) => i === idx ? { ...g, [field]: field === "min" || field === "max" ? Number(val) : val } : g);
      setHasChanges(true);
      return next;
    });
  };

  const saveGrades = () => {
    // Sort descending by min before saving
    const sorted = [...localGrades].sort((a, b) => b.min - a.min);
    setCbeGrades(sorted);
    setLocalGrades(sorted);
    setHasChanges(false);
    showToast("Grade scale saved successfully.");
  };

  const resetToDefaults = () => {
    const defaults = DEFAULT_CBE_GRADES.map(g => ({ ...g }));
    setLocalGrades(defaults);
    setCbeGrades(defaults);
    setHasChanges(false);
    showToast("Grade scale reset to CBC defaults.");
  };

  const addGradeToBand = () => {
    const newBand = {
      code: `NEW${uid().slice(0,3).toUpperCase()}`,
      label: "New Level",
      min: 0, max: 0,
      color: "#374151", bg: "#f3f4f6"
    };
    setLocalGrades(prev => [...prev, newBand]);
    setHasChanges(true);
  };

  const removeBand = (idx) => {
    setLocalGrades(prev => prev.filter((_, i) => i !== idx));
    setHasChanges(true);
  };

  const addGradeLevel = (level) => {
    const name = newGradeName[level].trim();
    if (!name) return;
    if (gradesForLevel(level).includes(name)) {
      showToast(`"${name}" already exists in ${t.levels[level]}.`);
      return;
    }
    setExtraGrades(prev => ({ ...prev, [level]: [...(prev[level] || []), name] }));
    setNewGradeName(prev => ({ ...prev, [level]: "" }));
    showToast(`Added "${name}" to ${t.levels[level]}.`);
  };

  const removeExtraGrade = (level, name) => {
    const inUse = students.some(s => s.level === level && s.grade === name);
    if (inUse) { showToast(`Cannot remove "${name}" — students are enrolled in this grade.`); return; }
    showConfirm(`Remove "${name}" from ${t.levels[level]}?`, () => {
      setExtraGrades(prev => ({ ...prev, [level]: prev[level].filter(g => g !== name) }));
      showToast("Grade removed.");
    }, { danger: true });
  };

  const LABEL_OPTIONS = ["Exceeds Expectation", "Meets Expectation", "Approaches Expectation", "Below Expectation"];
  const COLOR_OPTIONS = [
    { color: "#1a6e38", bg: "#d4edda", label: "Dark Green" },
    { color: "#1a6e38", bg: "#c3e6cb", label: "Green" },
    { color: "#0c5460", bg: "#bee5eb", label: "Dark Teal" },
    { color: "#0c5460", bg: "#d1ecf1", label: "Teal" },
    { color: "#856404", bg: "#fff3cd", label: "Dark Amber" },
    { color: "#856404", bg: "#ffeeba", label: "Amber" },
    { color: "#842029", bg: "#f8d7da", label: "Dark Red" },
    { color: "#6a0000", bg: "#f5c2c7", label: "Red" },
  ];

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ margin:0, color:colors.primary }}>{t.nav.gradeSettings}</h2>
        <p style={{ color:colors.muted, fontSize:13, marginTop:4 }}>
          Adjust the percentage ranges and labels for each CBC grading band. Changes apply system-wide to all results and reports.
        </p>
      </div>

      {/* CBC Band Editor */}
      <div style={css.card}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:700, color:colors.primary, fontSize:15 }}>Kenya CBC 8-Level Grading Bands</div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={css.btn("ghost")} onClick={resetToDefaults}>↩ Reset to Defaults</button>
            <button style={css.btn()} onClick={addGradeToBand}>+ Add Band</button>
            {hasChanges && <button style={css.btn("gold")} onClick={saveGrades}>💾 Save Changes</button>}
          </div>
        </div>

        {hasChanges && (
          <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:8, padding:"8px 14px", marginBottom:14, fontSize:12, color:"#854d0e" }}>
            ⚠ You have unsaved changes. Click <strong>Save Changes</strong> to apply them.
          </div>
        )}

        <div style={{ overflowX:"auto" }}>
          <table style={{ ...css.table, minWidth:700 }}>
            <thead>
              <tr>
                {["Code","Label","Min %","Max %","Preview","Color Scheme",""].map(h => (
                  <th key={h} style={css.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {localGrades.map((g, idx) => (
                <tr key={idx}>
                  <td style={css.td}>
                    <input style={{ ...css.input, width:70 }} value={g.code} onChange={e => updateBand(idx, "code", e.target.value)} />
                  </td>
                  <td style={css.td}>
                    <select style={{ ...css.select, width:200 }} value={g.label} onChange={e => updateBand(idx, "label", e.target.value)}>
                      {LABEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={css.td}>
                    <input type="number" style={{ ...css.input, width:70 }} min={0} max={100} value={g.min} onChange={e => updateBand(idx, "min", e.target.value)} />
                  </td>
                  <td style={css.td}>
                    <input type="number" style={{ ...css.input, width:70 }} min={0} max={100} value={g.max} onChange={e => updateBand(idx, "max", e.target.value)} />
                  </td>
                  <td style={css.td}>
                    <span style={{ ...css.badge(g.color, g.bg), whiteSpace:"nowrap" }}>{g.code} · {g.min}–{g.max}%</span>
                  </td>
                  <td style={css.td}>
                    <select style={{ ...css.select, width:130 }}
                      value={`${g.color}|${g.bg}`}
                      onChange={e => {
                        const [color, bg] = e.target.value.split("|");
                        updateBand(idx, "color", color);
                        updateBand(idx, "bg", bg);
                      }}>
                      {COLOR_OPTIONS.map(o => <option key={o.label} value={`${o.color}|${o.bg}`}>{o.label}</option>)}
                    </select>
                  </td>
                  <td style={css.td}>
                    {localGrades.length > 1 && (
                      <button onClick={() => removeBand(idx)} style={{ background:"none", border:"none", cursor:"pointer", color:colors.danger, fontSize:16 }}>🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live preview */}
      <div style={css.card}>
        <div style={{ fontWeight:700, color:colors.primary, marginBottom:12 }}>Live Preview</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:10 }}>
          {[...localGrades].sort((a,b)=>b.min-a.min).map((g, i) => (
            <div key={i} style={{ background:g.bg, border:`1px solid ${g.color}33`, borderRadius:8, padding:"10px 14px" }}>
              <div style={{ fontWeight:800, color:g.color, fontSize:16 }}>{g.code}</div>
              <div style={{ fontSize:12, color:g.color, fontWeight:600 }}>{g.label}</div>
              <div style={{ fontSize:11, color:colors.muted, marginTop:2 }}>{g.min}–{g.max}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add extra grade levels */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:16 }}>
        {["junior","senior"].map(level => (
          <div key={level} style={css.card}>
            <div style={{ fontWeight:700, color:colors.primary, marginBottom:4 }}>
              {t.levels[level]} — Grade Classes
            </div>
            <div style={{ fontSize:12, color:colors.muted, marginBottom:12 }}>
              Default: {DEFAULT_GRADES[level].join(", ")}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
              {DEFAULT_GRADES[level].map(g => (
                <span key={g} style={css.badge(colors.muted, "#f3f4f6")}>{g}</span>
              ))}
              {(extraGrades[level] || []).map(g => (
                <span key={g} style={{ ...css.badge(colors.primary, "#e8f0ed"), display:"inline-flex", alignItems:"center", gap:4 }}>
                  {g}
                  <button onClick={() => removeExtraGrade(level, g)} style={{ background:"none", border:"none", cursor:"pointer", color:colors.danger, padding:0, fontSize:12, lineHeight:1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input
                style={{ ...css.input, flex:1 }}
                placeholder={`e.g. Grade 13`}
                value={newGradeName[level]}
                onChange={e => setNewGradeName(prev => ({ ...prev, [level]: e.target.value }))}
                onKeyDown={e => e.key==="Enter" && addGradeLevel(level)}
              />
              <button style={css.btn()} onClick={() => addGradeLevel(level)}>+ Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
