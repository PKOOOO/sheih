"use client";
import { useState } from "react";
import { LOGO_SRC } from "../../_lib/logo";
import { SCHOOL_NAMES } from "../../_lib/i18n";
import { downloadWorkbook, nowStamp, iframePrint } from "../../_lib/storage";

// Printable class list / roster view, extracted from App() in index.jsx.
export default function ClassLists({
  t, lang, colors, css, students, exams, results, gradesFor, streamsFor, cbe,
}) {
  const [selLevel, setSelLevel] = useState("junior");
  const [selGrade, setSelGrade] = useState(gradesFor("junior")[0] || "");
  const [selStream, setSelStream] = useState(streamsFor("junior")[0] || "");
  const [selExam, setSelExam] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | admNo | score
  const [sortDir, setSortDir] = useState("asc");

  const examsForLevel = exams.filter(e => e.level === selLevel);

  const onLevelChange = (lv) => {
    setSelLevel(lv);
    setSelGrade(gradesFor(lv)[0] || "");
    setSelStream(streamsFor(lv)[0] || "");
    setSelExam("");
  };

  const classStudents = students.filter(s =>
    s.level === selLevel && s.grade === selGrade && s.stream === selStream
  );

  const exam = exams.find(e => e.id === selExam);

  const enriched = classStudents.map(s => {
    const stuResults = selExam ? results.filter(r => r.examId === selExam && r.studentId === s.id) : [];
    const avg = stuResults.length ? Math.round(stuResults.reduce((a, r) => a + r.score, 0) / stuResults.length) : null;
    const overall = avg !== null && exam ? cbe(avg, exam.maxScore) : null;
    return { ...s, avg, overall, resultCount: stuResults.length };
  });

  const sorted = [...enriched].sort((a, b) => {
    let va, vb;
    if (sortBy === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
    else if (sortBy === "admNo") { va = a.admNo; vb = b.admNo; }
    else { va = a.avg ?? -1; vb = b.avg ?? -1; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };
  const sortIcon = (col) => sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅";

  const schoolName = SCHOOL_NAMES[selLevel][lang];
  const classLabel = `${selGrade} — Stream ${selStream}`;

  const printList = () => {
    // Build table rows as plain HTML (avoids React/sandbox CSS issues)
    const hasExam = !!exam;
    const colCount = hasExam ? 6 : 4;
    const dateStr = new Date().toLocaleDateString("en-KE", { dateStyle: "full" });

    const headerCols = hasExam
      ? `<th>#</th><th>Adm No</th><th>Student Name</th><th>Gender</th><th>Avg Score / ${exam.maxScore}</th><th>CBC Level</th>`
      : `<th>#</th><th>Adm No</th><th>Student Name</th><th>Gender</th>`;

    const bodyRows = sorted.map((s, i) => {
      const genderCell = `${s.gender === "Male" ? "♂" : "♀"} ${s.gender}`;
      const examCells = hasExam
        ? `<td style="font-weight:700">${s.avg !== null ? `${s.avg} / ${exam.maxScore}` : "—"}</td>
           <td>${s.overall ? `<span style="background:${s.overall.bg};color:${s.overall.color};padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px">${s.overall.code} — ${s.overall.label}</span>` : "—"}</td>`
        : "";
      const rowBg = i % 2 === 0 ? "#fff" : "#f8f5ee";
      return `<tr style="background:${rowBg}">
        <td style="color:#6b7280;font-weight:700">${i + 1}</td>
        <td style="font-weight:700;color:#1c3d2e">${s.admNo}</td>
        <td>${s.name}</td>
        <td>${genderCell}</td>
        ${examCells}
      </tr>`;
    }).join("");

    // Class average footer
    let footerText = `Total: ${sorted.length} students`;
    if (hasExam && sorted.some(s => s.avg !== null)) {
      const scored = sorted.filter(s => s.avg !== null);
      const classAvg = Math.round(scored.reduce((a, s) => a + s.avg, 0) / scored.length);
      const classLevel = cbe(classAvg, exam.maxScore);
      footerText += ` · Class Average: ${classAvg}/${exam.maxScore} · ${classLevel.code} (${classLevel.label})`;
    }

    const examHeader = hasExam
      ? ` · ${exam.examName} (${exam.term} ${exam.year})`
      : " · Student Roster";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Class List — ${selGrade} Stream ${selStream}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 28px; }
    .header { text-align: center; border-bottom: 3px solid #c9a84c; padding-bottom: 14px; margin-bottom: 18px; }
    .header img { width: 70px; height: 70px; object-fit: contain; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; }
    .header h1 { font-size: 15px; font-weight: 800; color: #1c3d2e; margin: 4px 0; }
    .header p { font-size: 12px; color: #6b7280; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { text-align: left; padding: 8px 10px; background: #f5f0e8; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2d9c8; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2d9c8; vertical-align: middle; }
    tfoot td { border-top: 2px solid #e2d9c8; border-bottom: none; font-weight: 600; font-size: 12px; color: #6b7280; padding: 10px; }
    .signatures { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; }
    @media print {
      body { padding: 16px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${LOGO_SRC}" alt="School Logo"/>
    <h1>${schoolName}</h1>
    <p>Class List — ${classLabel}${examHeader}</p>
    <p>Generated: ${dateStr}</p>
  </div>
  <table>
    <thead><tr>${headerCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr><td colspan="${colCount}">${footerText}</td></tr></tfoot>
  </table>
  <div class="signatures">
    <div>Class Teacher: _______________________</div>
    <div>HOD Signature: _______________________</div>
    <div>Principal: ___________________________</div>
  </div>
</body>
</html>`;

    iframePrint(html);
  };

  const downloadList = () => {
    const rows = sorted.map((s, i) => ({
      Rank: i + 1, AdmNo: s.admNo, Name: s.name, Gender: s.gender, Grade: s.grade, Stream: s.stream,
      ...(exam ? { Average: s.avg ?? "", CBCLevel: s.overall?.code ?? "" } : {}),
    }));
    downloadWorkbook(
      `classlist-${selGrade}${selStream}-${nowStamp()}.xlsx`,
      [{ name: `${selGrade} ${selStream}`, rows }]
    );
  };

  return (
    <div>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #classlist-printable, #classlist-printable * { visibility: visible; }
          #classlist-printable { position: fixed; inset: 0; padding: 24px; font-family: Arial, sans-serif; }
          #classlist-printable .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h2 style={{ margin:0, color:colors.primary }}>📋 {t.nav.classlists}</h2>
        <div style={{ display:"flex", gap:8 }}>
          <button style={css.btn("ghost")} onClick={downloadList}>⬇ Download Excel</button>
          <button style={css.btn("gold")} onClick={printList}>🖨 Print</button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print" style={{ ...css.card, marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:12 }}>
          <div>
            <label style={css.label}>School Level</label>
            <div style={{ display:"flex", gap:6 }}>
              <button style={css.levelPill("junior", selLevel==="junior")} onClick={() => onLevelChange("junior")}>{t.levels.junior}</button>
              <button style={css.levelPill("senior", selLevel==="senior")} onClick={() => onLevelChange("senior")}>{t.levels.senior}</button>
            </div>
          </div>
          <div>
            <label style={css.label}>Grade</label>
            <select style={css.select} value={selGrade} onChange={e => setSelGrade(e.target.value)}>
              {gradesFor(selLevel).map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={css.label}>Stream</label>
            <select style={css.select} value={selStream} onChange={e => setSelStream(e.target.value)}>
              {streamsFor(selLevel).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={css.label}>Exam (optional — for scores)</label>
            <select style={css.select} value={selExam} onChange={e => setSelExam(e.target.value)}>
              <option value="">— Roster only —</option>
              {examsForLevel.map(e => <option key={e.id} value={e.id}>{e.examName} ({e.term} {e.year})</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Printable list */}
      <div id="classlist-printable" style={{ overflowX:"auto" }}>
        {/* Print header */}
        <div style={{ textAlign:"center", borderBottom:`3px solid ${colors.gold}`, paddingBottom:14, marginBottom:18 }}>
          <img src={LOGO_SRC} alt="Logo" style={{ width:60, height:60, objectFit:"contain", marginBottom:6 }} />
          <div style={{ fontWeight:800, fontSize:15, color:colors.primary }}>{schoolName}</div>
          <div style={{ fontSize:13, color:colors.muted, marginTop:4 }}>
            Class List — {classLabel}
            {exam ? ` · ${exam.examName} (${exam.term} ${exam.year})` : " · Student Roster"}
          </div>
          <div style={{ fontSize:11, color:colors.muted, marginTop:2 }}>Generated: {new Date().toLocaleDateString("en-KE", { dateStyle:"full" })}</div>
        </div>

        {sorted.length === 0 ? (
          <p style={{ color:colors.muted, textAlign:"center", padding:"40px 0" }}>No students in {classLabel}.</p>
        ) : (
          <table style={{ ...css.table, fontSize:13 }}>
            <thead>
              <tr>
                <th style={css.th}>#</th>
                <th style={{ ...css.th, cursor:"pointer" }} onClick={() => toggleSort("admNo")}>
                  Adm No{sortIcon("admNo")}
                </th>
                <th style={{ ...css.th, cursor:"pointer" }} onClick={() => toggleSort("name")}>
                  Student Name{sortIcon("name")}
                </th>
                <th style={css.th}>Gender</th>
                {exam && (
                  <>
                    <th style={{ ...css.th, cursor:"pointer" }} onClick={() => toggleSort("score")}>
                      Avg Score{sortIcon("score")}
                    </th>
                    <th style={css.th}>CBC Level</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : colors.light }}>
                  <td style={{ ...css.td, color:colors.muted, fontWeight:700 }}>{i + 1}</td>
                  <td style={{ ...css.td, fontWeight:700, color:colors.primary }}>{s.admNo}</td>
                  <td style={css.td}>{s.name}</td>
                  <td style={css.td}>
                    <span style={css.badge(s.gender==="Male" ? "#1e40af" : "#9333ea", s.gender==="Male" ? "#dbeafe" : "#f3e8ff")}>
                      {s.gender==="Male" ? "♂" : "♀"} {s.gender}
                    </span>
                  </td>
                  {exam && (
                    <>
                      <td style={{ ...css.td, fontWeight:700 }}>
                        {s.avg !== null ? `${s.avg} / ${exam.maxScore}` : <span style={{ color:colors.muted }}>—</span>}
                      </td>
                      <td style={css.td}>
                        {s.overall
                          ? <span style={css.badge(s.overall.color, s.overall.bg)}>{s.overall.code} — {s.overall.label}</span>
                          : <span style={{ color:colors.muted }}>—</span>}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={exam ? 6 : 4} style={{ padding:"10px 12px", borderTop:`2px solid ${colors.border}`, fontSize:12, color:colors.muted, fontWeight:600 }}>
                  Total: {sorted.length} students
                  {exam && sorted.some(s => s.avg !== null) && (() => {
                    const scored = sorted.filter(s => s.avg !== null);
                    const classAvg = Math.round(scored.reduce((a, s) => a + s.avg, 0) / scored.length);
                    const classLevel = cbe(classAvg, exam.maxScore);
                    return ` · Class Average: ${classAvg}/${exam.maxScore} · ${classLevel.code}`;
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        <div style={{ marginTop:30, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:20, fontSize:12, color:colors.muted }}>
          <div>Class Teacher: __________________________</div>
          <div>HOD Signature: __________________________</div>
          <div>Principal: ______________________________</div>
        </div>
      </div>
    </div>
  );
}
