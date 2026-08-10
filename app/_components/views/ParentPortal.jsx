"use client";
import { useState } from "react";
import { iframePrint } from "../../_lib/storage";
import ReportCard from "../ReportCard";

// Parent portal view ("My Child's Results"), extracted from App() in index.jsx.
//
// Deviation note: the original index.jsx wired this view's print button to a
// `printReport` closure that only existed inside the sibling `Reports()` component
// (a dangling reference that would throw at render time). Here each view owns its
// print logic, so ParentPortal gets its own `printReport` built from `linkedStudent`.
export default function ParentPortal({ t, lang, colors, css, students, subjects, exams, results, cbe, currentUser, showToast }) {
  const linkedStudent = students.find(s => s.id === currentUser?.linkedStudentId);
  const [selExam, setSelExam] = useState("");

  const printReport = () => {
    const el = document.getElementById("report-printable");
    if (!el || !el.innerText.trim()) {
      showToast("Nothing to print yet. Generate a report first.");
      return;
    }
    iframePrint(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Report — ${linkedStudent?.name || "Student"}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:28px}
    img{max-width:100%}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:8px 10px;background:#f5f0e8;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e2d9c8}
    td{padding:8px 10px;border-bottom:1px solid #e2d9c8;vertical-align:middle}
    span{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @media print{body{padding:16px}}
  </style>
</head>
<body>
  ${el.innerHTML}
</body>
</html>`);
  };

  if (!linkedStudent) {
    return (
      <div style={css.card}>
        <p style={{ color: colors.muted, textAlign: "center", padding: "40px 0" }}>{t.parentPortal.noChildLinked}</p>
      </div>
    );
  }

  const childExams = exams.filter(e => e.level === linkedStudent.level);
  const exam = exams.find(e => e.id === selExam) || childExams[0];

  const avg = exam ? (() => {
    const r = results.filter(r => r.examId === exam.id && r.studentId === linkedStudent.id);
    return r.length ? Math.round(r.reduce((a, x) => a + x.score, 0) / r.length) : null;
  })() : null;
  const overall = avg !== null && exam ? cbe(avg, exam.maxScore) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.parentPortal.title}</h2>
        <button style={css.btn("gold")} onClick={printReport}>🖨 {t.reports.print}</button>
      </div>

      <div style={{ ...css.card, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: colors.primary, color: colors.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>
            {linkedStudent.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: colors.primary }}>{linkedStudent.name}</div>
            <div style={{ fontSize: 12, color: colors.muted }}>{linkedStudent.admNo} · {t.levels[linkedStudent.level]} · {linkedStudent.grade}{linkedStudent.stream}</div>
          </div>
        </div>
        <div style={{ width: "100%", maxWidth: 260 }}>
          <label style={css.label}>{t.parentPortal.selectExam}</label>
          <select style={css.select} value={exam?.id || ""} onChange={e => setSelExam(e.target.value)}>
            {childExams.map(e => <option key={e.id} value={e.id}>{e.examName} ({e.term} {e.year})</option>)}
          </select>
        </div>
      </div>

      <div id="report-printable">
        {exam ? (
          <ReportCard student={linkedStudent} exam={exam} avg={avg} overall={overall}
            t={t} lang={lang} colors={colors} css={css} subjects={subjects} results={results} cbe={cbe} />
        ) : (
          <div style={css.card}><p style={{ color: colors.muted, textAlign: "center", padding: "40px 0" }}>{t.noData}</p></div>
        )}
      </div>
    </div>
  );
}
