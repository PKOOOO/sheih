"use client";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { uid, downloadWorkbook, nowStamp } from "../../_lib/storage";

// Results entry view, extracted from App() in index.jsx.
export default function Results({
  t, colors, css, exams, results, setResults, students, subjects, gradesFor, streamsFor, cbe, showToast, showConfirm,
}) {
  const [selLevel, setSelLevel]   = useState("junior");
  const [selExam, setSelExam]     = useState(exams.find(e => e.level === "junior")?.id || "");
  const [selGrade, setSelGrade]   = useState(gradesFor("junior")[0] || "");
  const [selStream, setSelStream] = useState(streamsFor("junior")[0] || "");
  const [selSubject, setSelSubject] = useState(subjects[0]?.id || "");
  const [editScores, setEditScores] = useState({});
  const [customLimit, setCustomLimit] = useState(""); // manual entry custom limit
  const [importLimit, setImportLimit] = useState(""); // import tabs custom limit
  const [importTab, setImportTab] = useState("manual");
  const [delStuId, setDelStuId] = useState(""); // for clear-by-student
  const [importPreview, setImportPreview] = useState(null);
  const importFileRef = useRef();
  const templateFileRef = useRef();

  const exam = exams.find(e => e.id === selExam);
  const examsForLevel = exams.filter(e => e.level === selLevel);
  const filteredStudents = students.filter(s =>
    s.level === selLevel && s.grade === selGrade && s.stream === selStream
  );

  const onLevelChange = (level) => {
    setSelLevel(level);
    setSelGrade(gradesFor(level)[0] || "");
    setSelStream(streamsFor(level)[0] || "");
    setSelExam(exams.find(e => e.level === level)?.id || "");
    setEditScores({});
    setImportPreview(null);
  };

  const getScore = (stuId) => {
    if (editScores[stuId] !== undefined) return editScores[stuId];
    const r = results.find(r => r.examId === selExam && r.studentId === stuId && r.subjectId === selSubject);
    return r ? r.score : "";
  };

  const saveAll = () => {
    const currentExam = exams.find(e => e.id === selExam);
    const examMax  = currentExam?.maxScore || 100;
    const limitVal = customLimit && +customLimit > 0 ? +customLimit : examMax;
    const isCustom = limitVal !== examMax;
    const toStored = (raw) => isCustom
      ? Math.round((+raw / limitVal) * examMax * 100) / 100
      : +raw;

    const updates = [];
    Object.entries(editScores).forEach(([stuId, raw]) => {
      if (raw === "" || raw === undefined || raw === null) return;
      const stored = toStored(+raw);
      if (isNaN(stored)) return;
      const existing = results.find(r =>
        r.examId === selExam && r.studentId === stuId && r.subjectId === selSubject
      );
      if (existing) updates.push({ ...existing, score: stored });
      else updates.push({ id: uid(), examId: selExam, studentId: stuId, subjectId: selSubject, score: stored });
    });

    if (!updates.length) { showToast("No scores to save."); return; }

    setResults(prev => {
      const next = [...prev];
      updates.forEach(upd => {
        const idx = next.findIndex(r => r.id === upd.id);
        if (idx >= 0) next[idx] = upd; else next.push(upd);
      });
      return next;
    });
    setEditScores({});
    showToast(isCustom
      ? `✓ Saved ${updates.length} score(s). Converted from /${limitVal} → /${examMax}.`
      : `✓ Saved ${updates.length} score(s).`);
  };

  const downloadMarksTemplate = () => {
    if (!selExam || !selSubject) { showToast("Select an exam and subject first."); return; }
    const sub = subjects.find(s => s.id === selSubject);
    const rows = filteredStudents.map(s => {
      const existing = results.find(r =>
        r.examId === selExam && r.studentId === s.id && r.subjectId === selSubject
      );
      return { AdmNo: s.admNo, Name: s.name, Grade: s.grade, Stream: s.stream,
        Score: existing ? existing.score : "", MaxScore: exam?.maxScore || 100 };
    });
    downloadWorkbook(`marks-${sub?.code || "subj"}-${selGrade}${selStream}-${nowStamp()}.xlsx`,
      [{ name: "Marks", rows }]);
  };

  const downloadBulkTemplate = () => {
    if (!selExam || filteredStudents.length === 0) {
      showToast("Select an exam, grade and stream with enrolled students first."); return;
    }
    const levelSubjects = subjects.filter(s => (s.levels || []).includes(selLevel));
    const rows = filteredStudents.map(s => {
      const entry = { AdmNo: s.admNo, Name: s.name };
      levelSubjects.forEach(sub => {
        const existing = results.find(r =>
          r.examId === selExam && r.studentId === s.id && r.subjectId === sub.id
        );
        entry[sub.code] = existing ? existing.score : "";
      });
      return entry;
    });
    downloadWorkbook(`marks-bulk-${selGrade}${selStream}-${nowStamp()}.xlsx`,
      [{ name: "All Subjects", rows }]);
  };

  const parseMarksFile = (file, isBulk) => {
    if (!selExam) { showToast("Select an exam first."); return; }

    const currentExam = exams.find(e => e.id === selExam);
    const examMax  = currentExam?.maxScore || 100;
    const limitVal = importLimit && +importLimit > 0 ? +importLimit : examMax;
    const isCustom = limitVal !== examMax;
    const convertScore = (raw) => isCustom
      ? Math.round((+raw / limitVal) * examMax * 100) / 100
      : +raw;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!rows.length) { showToast("File is empty."); return; }
        const headers = Object.keys(rows[0]);

        if (isBulk) {
          const subjectCols = headers.filter(h => {
            const hl = h.toLowerCase();
            return subjects.some(s =>
              s.code.toLowerCase() === hl ||
              s.name.toLowerCase() === hl ||
              hl.includes(s.code.toLowerCase())
            );
          });
          if (!subjectCols.length) {
            showToast("No subject columns detected. Use subject codes (e.g. QRT, ARB) as headers."); return;
          }
          const allMatched = [], unmatched = [];
          rows.forEach((row, i) => {
            const admNo = String(row.AdmNo || row["Adm No"] || "").trim();
            const name  = String(row.Name || row["Student Name"] || "").trim().toLowerCase();
            const student = students.find(s => s.admNo.toLowerCase() === admNo.toLowerCase())
              || students.find(s => s.name.toLowerCase() === name);
            if (!student) { unmatched.push({ row: i+2, admNo: admNo||"?", name: name||"?", reason: "Student not found" }); return; }
            subjectCols.forEach(col => {
              const sub = subjects.find(s =>
                s.code.toLowerCase() === col.toLowerCase() ||
                s.name.toLowerCase() === col.toLowerCase() ||
                col.toLowerCase().includes(s.code.toLowerCase())
              );
              if (!sub) return;
              const rawScore = row[col];
              if (rawScore === "" || rawScore == null) return;
              const parsed = Number(rawScore);
              if (isNaN(parsed)) return;
              const stored = convertScore(parsed);
              allMatched.push({
                student, rawScore: parsed, score: stored,
                subjectId: sub.id, subjectName: sub.name,
                admNo: student.admNo, name: student.name,
              });
            });
          });
          setImportPreview({
            matched: allMatched, unmatched, fileName: file.name,
            subjectId: null, examId: selExam, scoreCol: subjectCols.join(", "),
            isBulk: true, isCustom, limitVal, examMax,
          });
        } else {
          const scoreCol = headers.find(h => ["score","marks","mark","total"].includes(h.toLowerCase()))
            || headers.find(h => subjects.some(s =>
              h.toLowerCase().includes(s.name.toLowerCase()) ||
              h.toLowerCase().includes(s.code.toLowerCase())
            )) || "Score";
          let detectedSubjectId = selSubject;
          const matchedSub = subjects.find(s =>
            scoreCol.toLowerCase().includes(s.name.toLowerCase()) ||
            scoreCol.toLowerCase().includes(s.code.toLowerCase())
          );
          if (matchedSub) detectedSubjectId = matchedSub.id;

          const matched = [], unmatched = [];
          rows.forEach((row, i) => {
            const admNo = String(row.AdmNo || row["Adm No"] || row["Admission No"] || "").trim();
            const name  = String(row.Name || row["Student Name"] || "").trim().toLowerCase();
            const rawScore = row[scoreCol] ?? row.Score ?? row.Marks ?? "";
            if (rawScore === "" || rawScore == null) { unmatched.push({ row: i+2, admNo, name, reason: "Missing score" }); return; }
            const parsed = Number(rawScore);
            if (isNaN(parsed)) { unmatched.push({ row: i+2, admNo, name, reason: `Invalid score "${rawScore}"` }); return; }
            const student = students.find(s => s.admNo.toLowerCase() === admNo.toLowerCase())
              || students.find(s => s.name.toLowerCase() === name);
            if (!student) { unmatched.push({ row: i+2, admNo: admNo||"?", name: name||"?", reason: "Student not found" }); return; }
            const stored = convertScore(parsed);
            matched.push({ student, rawScore: parsed, score: stored, admNo: student.admNo, name: student.name });
          });
          setImportPreview({
            matched, unmatched, fileName: file.name,
            subjectId: detectedSubjectId, examId: selExam, scoreCol,
            isBulk: false, isCustom, limitVal, examMax,
          });
        }
      } catch (err) { showToast(`Failed to read file: ${err.message}`); }
    };
    reader.onerror = () => showToast("Error reading file.");
    reader.readAsArrayBuffer(file);
    setTimeout(() => { if(file.input) file.input.value = ""; }, 100);
  };

  const handleSingleFile = (e) => { const f = e.target.files[0]; if(f) parseMarksFile(f, false); setTimeout(()=>{e.target.value="";},100); };
  const handleBulkFile   = (e) => { const f = e.target.files[0]; if(f) parseMarksFile(f, true);  setTimeout(()=>{e.target.value="";},100); };

  const commitImport = () => {
    if (!importPreview) return;
    const { matched, subjectId, examId, isBulk } = importPreview;
    setResults(prev => {
      const next = [...prev];
      matched.forEach(({ student, score, subjectId: subId }) => {
        const sid = isBulk ? subId : subjectId;
        const idx = next.findIndex(r => r.examId === examId && r.studentId === student.id && r.subjectId === sid);
        if (idx >= 0) next[idx] = { ...next[idx], score: +score };
        else next.push({ id: uid(), examId, studentId: student.id, subjectId: sid, score: +score });
      });
      return next;
    });
    const subCount = isBulk ? [...new Set(matched.map(m => m.subjectId))].length : 1;
    showToast(`${matched.length} score(s) across ${subCount} subject(s) imported.`);
    if (!isBulk && importPreview.subjectId && importPreview.subjectId !== selSubject)
      setSelSubject(importPreview.subjectId);
    setImportPreview(null);
    setImportTab("manual");
  };

  const tabStyle = (key) => ({
    padding: "9px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
    background: importTab === key ? colors.primary : "#f9fafb",
    color: importTab === key ? "#fff" : colors.muted,
    borderBottom: importTab === key ? "none" : `1px solid ${colors.border}`,
    borderRight: `1px solid ${colors.border}`,
  });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, color:colors.primary }}>{t.results.title}</h2>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <button style={css.levelPill("junior", selLevel==="junior")} onClick={() => onLevelChange("junior")}>{t.dashboard.junior}</button>
        <button style={css.levelPill("senior", selLevel==="senior")} onClick={() => onLevelChange("senior")}>{t.dashboard.senior}</button>
      </div>

      <div style={{ ...css.card, marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:14 }}>
          <div>
            <label style={css.label}>{t.results.selectExam}</label>
            <select style={css.select} value={selExam} onChange={e => setSelExam(e.target.value)}>
              <option value="">— Select exam —</option>
              {examsForLevel.map(e => <option key={e.id} value={e.id}>{e.examName} ({e.term} {e.year})</option>)}
            </select>
          </div>
          <div>
            <label style={css.label}>{t.results.selectGrade}</label>
            <select style={css.select} value={selGrade} onChange={e => setSelGrade(e.target.value)}>
              {gradesFor(selLevel).map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={css.label}>{t.results.selectStream}</label>
            <select style={css.select} value={selStream} onChange={e => setSelStream(e.target.value)}>
              {streamsFor(selLevel).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", borderRadius:"8px 8px 0 0", overflow:"hidden", border:`1px solid ${colors.border}`, marginBottom:0, width:"fit-content", flexWrap:"wrap" }}>
        <button style={tabStyle("manual")} onClick={() => setImportTab("manual")}>✏️ Manual Entry</button>
        <button style={tabStyle("import")} onClick={() => setImportTab("import")}>📥 Import — Single Subject</button>
        <button style={tabStyle("bulkimport")} onClick={() => setImportTab("bulkimport")}>📦 Import — All Subjects</button>
        <button style={tabStyle("clear")} onClick={() => setImportTab("clear")}>🗑 Clear Results</button>
      </div>

      {/* MANUAL ENTRY */}
      {importTab === "manual" && (
        <div style={{ ...css.card, borderRadius:"0 8px 8px 8px" }}>

          {/* Subject selector + score limit + download */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12, alignItems:"flex-end", marginBottom:16 }}>
            <div>
              <label style={css.label}>{t.results.selectSubject}</label>
              <select style={css.select} value={selSubject}
                onChange={e => { setSelSubject(e.target.value); setCustomLimit(""); setEditScores({}); }}>
                <option value="">— Select subject —</option>
                {subjects.filter(s => (s.levels||[]).includes(selLevel)).map(s =>
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                )}
              </select>
            </div>

            {/* Custom score limit */}
            <div style={{ minWidth:180 }}>
              <label style={css.label}>
                Score Limit
                <span style={{ fontWeight:400, color:colors.muted, fontSize:11, marginLeft:6 }}>
                  (leave blank to use exam max: {exam?.maxScore || 100})
                </span>
              </label>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input
                  type="number" min={1}
                  style={{
                    ...css.input, width:100,
                    borderColor: customLimit && +customLimit > 0 && +customLimit !== (exam?.maxScore || 100) ? "#ca8a04" : colors.border,
                    background: customLimit && +customLimit > 0 && +customLimit !== (exam?.maxScore || 100) ? "#fefce8" : "#fff",
                  }}
                  value={customLimit}
                  placeholder={String(exam?.maxScore || 100)}
                  onChange={e => setCustomLimit(e.target.value)}
                />
                {customLimit && (
                  <button onClick={() => setCustomLimit("")}
                    style={{ background:"none", border:"none", cursor:"pointer", color:colors.danger, fontSize:16, padding:0 }}
                    title="Clear — use exam max">×</button>
                )}
              </div>
            </div>

            <button style={css.btn("ghost")} onClick={downloadMarksTemplate}
              title="Download pre-filled score sheet for this class">
              📋 Score Sheet
            </button>
          </div>

          {/* Active limit info banner */}
          {selExam && selSubject && (() => {
            const examMax2 = exam?.maxScore || 100;
            const effectiveMax = customLimit && +customLimit > 0 ? +customLimit : examMax2;
            const isCustom = customLimit && +customLimit > 0 && +customLimit !== examMax2;
            if (!isCustom) return null;
            const exampleRaw = Math.round(effectiveMax * 0.8);
            const exampleStored = Math.round((exampleRaw / effectiveMax) * examMax2);
            return (
              <div style={{
                background:"#fef9c3", border:"1px solid #fde047", borderRadius:8,
                padding:"10px 14px", marginBottom:14, fontSize:13, color:"#854d0e",
                display:"flex", alignItems:"center", gap:10
              }}>
                <span style={{ fontSize:18 }}>📐</span>
                <div>
                  <strong>Custom limit active:</strong> Enter scores out of <strong>{effectiveMax}</strong>.
                  {" "}Formula: <code style={{ background:"#fde047", padding:"1px 5px", borderRadius:3 }}>stored = (score ÷ {effectiveMax}) × {examMax2}</code>
                  <br/>
                  <span style={{ fontSize:12 }}>
                    Example: {exampleRaw}/{effectiveMax} → <strong>{exampleStored}/{examMax2}</strong>
                    {" "}({Math.round((exampleRaw/effectiveMax)*100)}%)
                    — CBC: {cbe(exampleStored, examMax2).code}
                  </span>
                </div>
              </div>
            );
          })()}

          {!selExam || !selSubject ? (
            <p style={{ color:colors.muted, textAlign:"center", padding:"30px 0" }}>
              Select an exam and subject above to enter scores.
            </p>
          ) : filteredStudents.length === 0 ? (
            <p style={{ color:colors.muted, textAlign:"center", padding:"30px 0" }}>
              No students enrolled in {selGrade} Stream {selStream}.
            </p>
          ) : (() => {
            const examMax    = exam?.maxScore || 100;
            const limitVal   = customLimit && +customLimit > 0 ? +customLimit : examMax;
            const isCustom   = limitVal !== examMax;

            const toStored = (raw) => isCustom
              ? Math.round((+raw / limitVal) * examMax * 100) / 100
              : +raw;

            // Get display score (what was entered, not stored)
            const getDisplayScore = (stuId) => {
              if (editScores[stuId] !== undefined) return editScores[stuId];
              const r = results.find(r => r.examId === selExam && r.studentId === stuId && r.subjectId === selSubject);
              if (!r) return "";
              // Back-convert stored → entry scale for display
              return isCustom
                ? String(Math.round((r.score / examMax) * limitVal * 100) / 100)
                : String(r.score);
            };

            // Already-stored percentage (from DB)
            const getStoredScore = (stuId) => {
              const r = results.find(r => r.examId === selExam && r.studentId === stuId && r.subjectId === selSubject);
              return r ? r.score : null;
            };

            return (
              <>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:12, color:colors.muted }}>
                    {filteredStudents.length} students ·
                    Entry out of <strong>{limitVal}</strong>
                    {isCustom && <span> → stored out of <strong>{examMax}</strong></span>}
                  </div>
                  {Object.keys(editScores).length > 0 && (
                    <span style={{ color:"#854d0e", fontSize:12, fontWeight:600 }}>
                      ⚠ {Object.keys(editScores).length} unsaved change(s)
                    </span>
                  )}
                </div>

                <table style={css.table}>
                  <thead>
                    <tr>
                      <th style={css.th}>#</th>
                      <th style={css.th}>{t.students.admNo}</th>
                      <th style={css.th}>{t.results.studentName}</th>
                      <th style={css.th}>
                        Score
                        <span style={{ fontWeight:400, color:colors.muted, fontSize:11, marginLeft:4 }}>
                          / {limitVal}
                        </span>
                      </th>
                      {isCustom && (
                        <th style={css.th}>
                          Converted
                          <span style={{ fontWeight:400, color:colors.muted, fontSize:11, marginLeft:4 }}>
                            / {examMax}
                          </span>
                        </th>
                      )}
                      <th style={css.th}>%</th>
                      <th style={css.th}>{t.results.cbeLevel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => {
                      const displayVal = getDisplayScore(s.id);
                      const isDirty    = editScores[s.id] !== undefined;

                      // Compute values for display
                      let storedVal = null, pct = null, cbeR = null;
                      if (displayVal !== "") {
                        storedVal = toStored(+displayVal);
                        pct       = Math.round((storedVal / examMax) * 100);
                        cbeR      = cbe(storedVal, examMax);
                      } else {
                        // Use previously stored score if any (not in edit mode)
                        const existing = getStoredScore(s.id);
                        if (existing !== null) {
                          storedVal = existing;
                          pct       = Math.round((existing / examMax) * 100);
                          cbeR      = cbe(existing, examMax);
                        }
                      }

                      // Validation
                      const rawNum = displayVal !== "" ? +displayVal : NaN;
                      const outOfRange = !isNaN(rawNum) && (rawNum < 0 || rawNum > limitVal);

                      return (
                        <tr key={s.id} style={{ background: i%2===0 ? "#fff" : colors.light }}>
                          <td style={{ ...css.td, color:colors.muted }}>{i+1}</td>
                          <td style={{ ...css.td, fontWeight:700, color:colors.primary }}>{s.admNo}</td>
                          <td style={css.td}>{s.name}</td>
                          <td style={css.td}>
                            <input
                              type="number" min={0} max={limitVal} placeholder="—"
                              value={displayVal}
                              style={{
                                ...css.input, width:90,
                                background: outOfRange ? "#fee2e2"
                                  : isDirty ? "#fefce8"
                                  : displayVal !== "" ? "#f0f9ff" : "#fff",
                                borderColor: outOfRange ? colors.danger
                                  : isDirty ? "#ca8a04"
                                  : colors.border,
                              }}
                              onChange={e => setEditScores(p => ({ ...p, [s.id]: e.target.value }))}
                            />
                            {outOfRange && (
                              <div style={{ fontSize:10, color:colors.danger, marginTop:2 }}>
                                Max: {limitVal}
                              </div>
                            )}
                          </td>
                          {isCustom && (
                            <td style={{ ...css.td, color: storedVal !== null ? colors.primary : colors.muted, fontWeight:600 }}>
                              {storedVal !== null ? storedVal.toFixed(storedVal % 1 === 0 ? 0 : 1) : "—"}
                            </td>
                          )}
                          <td style={{ ...css.td, fontWeight:600 }}>
                            {pct !== null ? (
                              <span style={{
                                color: pct >= 70 ? "#166534" : pct >= 50 ? "#854d0e" : "#991b1b",
                                fontWeight: 700
                              }}>
                                {pct}%
                              </span>
                            ) : "—"}
                          </td>
                          <td style={css.td}>
                            {cbeR
                              ? <span style={css.badge(cbeR.color, cbeR.bg)}>{cbeR.code} — {cbeR.label}</span>
                              : <span style={{ color:colors.muted }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {Object.keys(editScores).length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"space-between", alignItems:"center", marginTop:14, padding:"12px 0", borderTop:`1px solid ${colors.border}` }}>
                    <div style={{ fontSize:12, color:colors.muted }}>
                      {isCustom && "Scores will be converted from /" + limitVal + " → /" + examMax + " before saving."}
                    </div>
                    <button style={css.btn()} onClick={saveAll}>
                      💾 Save {Object.keys(editScores).length} Score(s)
                      {isCustom && ` (converted from /${limitVal})`}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* SINGLE SUBJECT IMPORT */}
      {importTab === "import" && (
        <div style={{ ...css.card, borderRadius:"0 8px 8px 8px" }}>
          <div style={{ fontWeight:700, color:colors.primary, fontSize:15, marginBottom:8 }}>
            📥 Import Marks — Single Subject
          </div>
          <p style={{ fontSize:13, color:colors.muted, marginBottom:16, lineHeight:1.6 }}>
            Upload an Excel file with scores for <strong>one subject</strong>. Required columns:
            <code style={{ background:"#f3f4f6", padding:"1px 6px", borderRadius:4, margin:"0 3px" }}>AdmNo</code> and
            <code style={{ background:"#f3f4f6", padding:"1px 6px", borderRadius:4, margin:"0 3px" }}>Score</code>
            (or <code style={{ background:"#f3f4f6", padding:"1px 6px", borderRadius:4 }}>Marks</code>).
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:16, marginBottom:16, alignItems:"flex-end" }}>
            <div>
              <label style={css.label}>Subject for this import</label>
              <select style={css.select} value={selSubject} onChange={e => setSelSubject(e.target.value)}>
                <option value="">— Select subject —</option>
                {subjects.filter(s => (s.levels||[]).includes(selLevel)).map(s =>
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                )}
              </select>
            </div>
            <div style={{ minWidth:180 }}>
              <label style={css.label}>
                Score Limit
                <span style={{ fontWeight:400, color:colors.muted, fontSize:11, marginLeft:6 }}>
                  (blank = exam max: {exam?.maxScore || 100})
                </span>
              </label>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input
                  type="number" min={1}
                  style={{
                    ...css.input, width:100,
                    borderColor: importLimit && +importLimit > 0 && +importLimit !== (exam?.maxScore||100) ? "#ca8a04" : colors.border,
                    background: importLimit && +importLimit > 0 && +importLimit !== (exam?.maxScore||100) ? "#fefce8" : "#fff",
                  }}
                  value={importLimit}
                  placeholder={String(exam?.maxScore || 100)}
                  onChange={e => setImportLimit(e.target.value)}
                />
                {importLimit && (
                  <button onClick={() => setImportLimit("")}
                    style={{ background:"none", border:"none", cursor:"pointer", color:colors.danger, fontSize:16, padding:0 }}
                    title="Clear limit">×</button>
                )}
              </div>
            </div>
          </div>

          {/* Conversion preview banner */}
          {importLimit && +importLimit > 0 && +importLimit !== (exam?.maxScore||100) && (() => {
            const lv = +importLimit, em = exam?.maxScore||100;
            const ex1 = Math.round(lv * 0.5), ex2 = Math.round(lv * 0.8);
            return (
              <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#854d0e" }}>
                <strong>📐 Conversion active:</strong> Scores in file are out of <strong>{lv}</strong> → will be stored out of <strong>{em}</strong>.
                <br/>
                <span style={{ fontSize:12 }}>
                  Formula: <code style={{ background:"#fde047", padding:"1px 5px", borderRadius:3 }}>(score ÷ {lv}) × {em}</code>
                  &nbsp;·&nbsp; {ex1}/{lv} → <strong>{Math.round((ex1/lv)*em)}/{em}</strong>
                  &nbsp;·&nbsp; {ex2}/{lv} → <strong>{Math.round((ex2/lv)*em)}/{em}</strong>
                </span>
              </div>
            );
          })()}

          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
            <button style={css.btn()} onClick={() => importFileRef.current?.click()}>📂 Choose File (.xlsx)</button>
            <button style={css.btn("ghost")} onClick={downloadMarksTemplate}>📋 Download Score Sheet Template</button>
            <input ref={importFileRef} type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display:"none" }} onChange={handleSingleFile} />
          </div>
          <div style={{ background:colors.light, borderRadius:8, padding:"12px 16px", overflowX:"auto" }}>
            <div style={{ fontWeight:600, fontSize:12, marginBottom:8, color:colors.muted }}>EXPECTED FORMAT</div>
            <table style={{ ...css.table, fontSize:12 }}>
              <thead>
                <tr><th style={css.th}>AdmNo</th><th style={css.th}>Name</th><th style={css.th}>Score</th></tr>
              </thead>
              <tbody>
                {[["ADM001","Fatima Hassan","25"],["ADM002","Omar Khalid","22"],["ADM003","Aisha Mohamed","47"]].map(([a,n,s])=>(
                  <tr key={a}><td style={css.td}>{a}</td><td style={css.td}>{n}</td><td style={css.td}>{s}</td></tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize:11, color:colors.muted, marginTop:8 }}>
              Score column can also be named <code>Marks</code>, <code>Mark</code>, or the subject code/name (auto-detected).
              If a score limit is set above, all scores in the file will be converted automatically.
            </p>
          </div>
        </div>
      )}

      {/* BULK (ALL SUBJECTS) IMPORT */}
      {importTab === "bulkimport" && (
        <div style={{ ...css.card, borderRadius:"0 8px 8px 8px" }}>
          <div style={{ fontWeight:700, color:colors.primary, fontSize:15, marginBottom:8 }}>
            📦 Import Marks — All Subjects (Bulk)
          </div>
          <p style={{ fontSize:13, color:colors.muted, marginBottom:16, lineHeight:1.6 }}>
            Upload one file with scores for <strong>multiple subjects</strong>.
            Use <strong>subject codes</strong> (e.g. <code>QRT</code>, <code>ARB</code>) as column headers.
          </p>

          {/* Score limit for bulk */}
          <div style={{ marginBottom:16 }}>
            <label style={css.label}>
              Score Limit for all subjects
              <span style={{ fontWeight:400, color:colors.muted, fontSize:11, marginLeft:6 }}>
                (applies to all subject columns — leave blank for exam max: {exam?.maxScore || 100})
              </span>
            </label>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input
                type="number" min={1}
                style={{
                  ...css.input, width:110,
                  borderColor: importLimit && +importLimit > 0 && +importLimit !== (exam?.maxScore||100) ? "#ca8a04" : colors.border,
                  background: importLimit && +importLimit > 0 && +importLimit !== (exam?.maxScore||100) ? "#fefce8" : "#fff",
                }}
                value={importLimit}
                placeholder={String(exam?.maxScore || 100)}
                onChange={e => setImportLimit(e.target.value)}
              />
              {importLimit && (
                <button onClick={() => setImportLimit("")}
                  style={{ background:"none", border:"none", cursor:"pointer", color:colors.danger, fontSize:16, padding:0 }}>×</button>
              )}
              {importLimit && +importLimit > 0 && +importLimit !== (exam?.maxScore||100) && (
                <span style={{ fontSize:12, color:"#854d0e", fontWeight:600 }}>
                  📐 {importLimit}/{exam?.maxScore||100} conversion active
                </span>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
            <button style={css.btn()} onClick={() => templateFileRef.current?.click()}>📂 Choose Bulk File (.xlsx)</button>
            <button style={css.btn("ghost")} onClick={downloadBulkTemplate}>📋 Download Bulk Template</button>
            <input ref={templateFileRef} type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display:"none" }} onChange={handleBulkFile} />
          </div>
          <div style={{ background:colors.light, borderRadius:8, padding:"12px 16px", overflowX:"auto" }}>
            <div style={{ fontWeight:600, fontSize:12, marginBottom:8, color:colors.muted }}>EXPECTED FORMAT</div>
            <table style={{ ...css.table, fontSize:12 }}>
              <thead>
                <tr>
                  <th style={css.th}>AdmNo</th><th style={css.th}>Name</th>
                  {subjects.filter(s=>(s.levels||[]).includes(selLevel)).slice(0,4).map(s=>
                    <th key={s.id} style={css.th}>{s.code}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {[["ADM001","Fatima Hassan","87","72","94","65"],["ADM002","Omar Khalid","55","61","70","80"]].map(([a,n,...sc])=>(
                  <tr key={a}>
                    <td style={css.td}>{a}</td><td style={css.td}>{n}</td>
                    {sc.map((v,i)=><td key={i} style={css.td}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize:11, color:colors.muted, marginTop:8 }}>
              Subject codes shown above are from your registered subjects. The bulk template download pre-fills all of them.
            </p>
          </div>
        </div>
      )}

      {/* IMPORT PREVIEW MODAL */}
      {importPreview && (
        <div style={css.modal}>
          <div style={{ ...css.modalBox, maxWidth:740 }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={css.modalTitle}>
                {importPreview.isBulk ? "📦 Bulk" : "📥"} Import Preview — {importPreview.fileName}
              </div>
              <button onClick={() => setImportPreview(null)}
                style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:colors.muted }}>×</button>
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
              <div style={{ background:"#dcfce7", color:"#166534", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13 }}>
                ✓ {importPreview.matched.length} score(s) ready
              </div>
              {importPreview.isBulk && (
                <div style={{ background:"#dbeafe", color:"#1e40af", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13 }}>
                  📚 {[...new Set(importPreview.matched.map(m=>m.subjectId))].length} subject(s) detected
                </div>
              )}
              {!importPreview.isBulk && importPreview.subjectId && (
                <div style={{ background:colors.light, color:colors.primary, borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13 }}>
                  📚 {subjects.find(s=>s.id===importPreview.subjectId)?.name || "Unknown subject"}
                </div>
              )}
              {importPreview.isCustom && (
                <div style={{ background:"#fef9c3", color:"#854d0e", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13 }}>
                  📐 Converted: /{importPreview.limitVal} → /{importPreview.examMax}
                </div>
              )}
              {importPreview.unmatched.length > 0 && (
                <div style={{ background:"#fee2e2", color:"#991b1b", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:13 }}>
                  ⚠ {importPreview.unmatched.length} row(s) skipped
                </div>
              )}
            </div>

            {importPreview.unmatched.length > 0 && (
              <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:6, padding:"8px 12px", marginBottom:12, fontSize:12, color:"#854d0e" }}>
                <strong>Skipped:</strong> {importPreview.unmatched.map(u=>`Row ${u.row}: ${u.admNo||u.name} — ${u.reason}`).join(" · ")}
              </div>
            )}

            <div style={{ maxHeight:300, overflowY:"auto", overflowX:"auto", border:`1px solid ${colors.border}`, borderRadius:8, marginBottom:16 }}>
              <table style={css.table}>
                <thead>
                  <tr>
                    <th style={css.th}>#</th>
                    <th style={css.th}>Adm No</th>
                    <th style={css.th}>Student</th>
                    {importPreview.isBulk && <th style={css.th}>Subject</th>}
                    {importPreview.isCustom && <th style={css.th}>Raw / {importPreview.limitVal}</th>}
                    <th style={css.th}>{importPreview.isCustom ? `Stored / ${importPreview.examMax}` : "Score"}</th>
                    <th style={css.th}>%</th>
                    <th style={css.th}>CBC</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.matched.map((m, i) => {
                    const examObj = exams.find(e => e.id === importPreview.examId);
                    const cbeR = examObj ? cbe(+m.score, examObj.maxScore) : null;
                    const pct  = examObj ? Math.round((+m.score / examObj.maxScore) * 100) : null;
                    const sub  = importPreview.isBulk ? subjects.find(s => s.id === m.subjectId) : null;
                    return (
                      <tr key={i} style={{ background: i%2===0 ? "#fff" : colors.light }}>
                        <td style={{ ...css.td, color:colors.muted }}>{i+1}</td>
                        <td style={{ ...css.td, fontWeight:700, color:colors.primary }}>{m.admNo}</td>
                        <td style={css.td}>{m.name}</td>
                        {importPreview.isBulk && (
                          <td style={css.td}><span style={css.badge(colors.primary,"#e8f0ed")}>{sub?.code||"?"}</span></td>
                        )}
                        {importPreview.isCustom && (
                          <td style={{ ...css.td, color:colors.muted }}>{m.rawScore}</td>
                        )}
                        <td style={{ ...css.td, fontWeight:700, color:colors.primary }}>{m.score}</td>
                        <td style={{ ...css.td, fontWeight:700, color: pct >= 70 ? "#166534" : pct >= 50 ? "#854d0e" : "#991b1b" }}>
                          {pct !== null ? `${pct}%` : "—"}
                        </td>
                        <td style={css.td}>
                          {cbeR ? <span style={css.badge(cbeR.color, cbeR.bg)}>{cbeR.code}</span> : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={css.formActions}>
              <button style={css.btn("ghost")} onClick={() => setImportPreview(null)}>Cancel</button>
              <button style={css.btn()} onClick={commitImport} disabled={!importPreview.matched.length}>
                ✓ Import {importPreview.matched.length} Score(s)
                {importPreview.isCustom && ` (converted from /${importPreview.limitVal})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLEAR RESULTS TAB ── */}
      {importTab === "clear" && (
        <div style={{ ...css.card, borderRadius:"0 8px 8px 8px" }}>
          <div style={{ fontWeight:700, color:colors.primary, fontSize:15, marginBottom:8 }}>🗑 Clear / Delete Results</div>
          <p style={{ fontSize:13, color:colors.muted, marginBottom:20, lineHeight:1.6 }}>
            Select what to delete. Deletions are permanent — download a backup first if needed.
          </p>

          {(()=>{
            const examResults = selExam ? results.filter(r => r.examId === selExam) : [];
            const subjectResults = selExam && selSubject
              ? results.filter(r => r.examId === selExam && r.subjectId === selSubject) : [];
            const classResults = selExam && selGrade && selStream
              ? results.filter(r => {
                  const stu = students.find(s => s.id === r.studentId);
                  return r.examId === selExam && stu?.grade === selGrade && stu?.stream === selStream;
                }) : [];
            const stuResults = delStuId ? results.filter(r => r.studentId === delStuId) : [];

            const doDelete = (label, filterFn) => showConfirm(
              `Delete all results for ${label}?`,
              () => { setResults(prev => prev.filter(r => !filterFn(r))); showToast(`Results for ${label} deleted.`); },
              { danger: true, subMessage: "This cannot be undone. Download a backup first if needed." }
            );

            return (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* By exam + subject */}
                <div style={{ background:colors.light, borderRadius:10, padding:16 }}>
                  <div style={{ fontWeight:700, color:colors.primary, marginBottom:4 }}>By Subject</div>
                  <div style={{ fontSize:12, color:colors.muted, marginBottom:10 }}>
                    Delete all scores for one subject within the selected exam.
                    {" "}<strong>{subjectResults.length}</strong> record(s) match.
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      <label style={css.label}>Subject</label>
                      <select style={css.select} value={selSubject} onChange={e => setSelSubject(e.target.value)}>
                        <option value="">— Select —</option>
                        {subjects.filter(s => (s.levels||[]).includes(selLevel)).map(s =>
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        )}
                      </select>
                    </div>
                    <button
                      style={{ ...css.btn("danger"), opacity: (!selExam || !selSubject || !subjectResults.length) ? .5 : 1 }}
                      disabled={!selExam || !selSubject || !subjectResults.length}
                      onClick={() => {
                        const subName = subjects.find(s => s.id === selSubject)?.name || selSubject;
                        const examName = exams.find(e => e.id === selExam)?.examName || selExam;
                        doDelete(`${subName} (${examName})`,
                          r => r.examId === selExam && r.subjectId === selSubject);
                      }}>
                      🗑 Delete {subjectResults.length} Record(s)
                    </button>
                  </div>
                </div>

                {/* By exam + class */}
                <div style={{ background:colors.light, borderRadius:10, padding:16 }}>
                  <div style={{ fontWeight:700, color:colors.primary, marginBottom:4 }}>By Class</div>
                  <div style={{ fontSize:12, color:colors.muted, marginBottom:10 }}>
                    Delete all scores for an entire class (grade + stream) within the selected exam.
                    {" "}<strong>{classResults.length}</strong> record(s) match.
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
                    <div>
                      <label style={css.label}>Grade</label>
                      <select style={{ ...css.select, width:130 }} value={selGrade} onChange={e => setSelGrade(e.target.value)}>
                        {gradesFor(selLevel).map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={css.label}>Stream</label>
                      <select style={{ ...css.select, width:100 }} value={selStream} onChange={e => setSelStream(e.target.value)}>
                        {streamsFor(selLevel).map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <button
                      style={{ ...css.btn("danger"), opacity: (!selExam || !classResults.length) ? .5 : 1 }}
                      disabled={!selExam || !classResults.length}
                      onClick={() => {
                        const examName = exams.find(e => e.id === selExam)?.examName || selExam;
                        doDelete(`${selGrade} Stream ${selStream} (${examName})`,
                          r => {
                            const stu = students.find(s => s.id === r.studentId);
                            return r.examId === selExam && stu?.grade === selGrade && stu?.stream === selStream;
                          });
                      }}>
                      🗑 Delete {classResults.length} Record(s)
                    </button>
                  </div>
                </div>

                {/* By entire exam */}
                <div style={{ background:"#fef2f2", border:`1px solid #fecaca`, borderRadius:10, padding:16 }}>
                  <div style={{ fontWeight:700, color:"#991b1b", marginBottom:4 }}>Entire Exam</div>
                  <div style={{ fontSize:12, color:"#991b1b", marginBottom:10 }}>
                    Delete ALL results for the selected exam across all subjects and classes.
                    {" "}<strong>{examResults.length}</strong> record(s) will be deleted.
                  </div>
                  <button
                    style={{ ...css.btn("danger"), opacity: (!selExam || !examResults.length) ? .5 : 1 }}
                    disabled={!selExam || !examResults.length}
                    onClick={() => {
                      const examName = exams.find(e => e.id === selExam)?.examName || selExam;
                      doDelete(`entire exam: ${examName}`, r => r.examId === selExam);
                    }}>
                    🗑 Delete ALL {examResults.length} Result(s) for This Exam
                  </button>
                </div>

                {/* Delete by student */}
                <div style={{ background:colors.light, borderRadius:10, padding:16 }}>
                  <div style={{ fontWeight:700, color:colors.primary, marginBottom:4 }}>By Student</div>
                  <div style={{ fontSize:12, color:colors.muted, marginBottom:10 }}>
                    Delete all results for one student across all exams and subjects.
                    {delStuId && <span> <strong>{stuResults.length}</strong> record(s) found.</span>}
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
                    <div style={{ flex:1, minWidth:220 }}>
                      <label style={css.label}>Student</label>
                      <select style={css.select} value={delStuId} onChange={e => setDelStuId(e.target.value)}>
                        <option value="">— Select —</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admNo})</option>)}
                      </select>
                    </div>
                    <button
                      style={{ ...css.btn("danger"), opacity: (!delStuId || !stuResults.length) ? .5 : 1 }}
                      disabled={!delStuId || !stuResults.length}
                      onClick={() => {
                        const stu = students.find(s => s.id === delStuId);
                        doDelete(`${stu?.name} (all exams)`, r => r.studentId === delStuId);
                        setDelStuId("");
                      }}>
                      🗑 Delete {stuResults.length} Record(s)
                    </button>
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
