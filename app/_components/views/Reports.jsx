"use client";
import { useState } from "react";
import { downloadWorkbook, nowStamp, iframePrint } from "../../_lib/storage";
import ReportCard from "../ReportCard";

// Reports & transcripts view, extracted from App() in index.jsx.
export default function Reports({
  t, lang, colors, css, students, exams, subjects, results, gradesFor, cbe, showToast,
}) {
  const [selStudent, setSelStudent] = useState(students[0]?.id || "");
  const [selExam, setSelExam] = useState(exams[0]?.id || "");
  const [reportType, setReportType] = useState("student");

  const student = students.find(s => s.id === selStudent);
  const exam = exams.find(e => e.id === selExam);

  const avgFor = (stuId, examId) => {
    const r = results.filter(r => r.examId === examId && r.studentId === stuId);
    return r.length ? Math.round(r.reduce((a, x) => a + x.score, 0) / r.length) : null;
  };
  const avg = selStudent && selExam ? avgFor(selStudent, selExam) : null;
  const overall = avg !== null && exam ? cbe(avg, exam.maxScore) : null;

  const classRanking = selExam && student ? (() => {
    const peers = students.filter(s => s.level === student.level && s.grade === student.grade && s.stream === student.stream);
    return peers.map(s => {
      const a = avgFor(s.id, selExam);
      return { ...s, avg: a ?? 0, count: results.filter(r => r.examId === selExam && r.studentId === s.id).length };
    }).sort((a, b) => b.avg - a.avg).map((s, i) => ({ ...s, rank: i + 1 }));
  })() : [];

  const downloadReport = () => {
    if (!student || !exam) return;
    const rows = subjects
      .filter(sub => (sub.levels||[]).includes(student.level))
      .map(sub => {
        const r = results.find(r => r.examId === selExam && r.studentId === selStudent && r.subjectId === sub.id);
        const level = r ? cbe(r.score, exam.maxScore) : null;
        return {
          Subject: sub.name, Code: sub.code,
          Score: r ? r.score : "", MaxScore: exam.maxScore,
          Percentage: r ? `${Math.round((r.score/exam.maxScore)*100)}%` : "",
          CBCLevel: level?.code || "", LevelLabel: level?.label || "",
        };
      });
    if (avg !== null) rows.push({ Subject:"OVERALL AVERAGE", Code:"", Score: avg, MaxScore: exam.maxScore, Percentage: `${Math.round((avg/exam.maxScore)*100)}%`, CBCLevel: overall?.code||"", LevelLabel: overall?.label||"" });
    downloadWorkbook(`report-${student.admNo}-${nowStamp()}.xlsx`, [{ name:"Report Card", rows }]);
  };

  const downloadRanking = () => {
    if (!classRanking.length || !exam) return;
    downloadWorkbook(`ranking-${student?.grade}${student?.stream}-${nowStamp()}.xlsx`, [{
      name: "Class Ranking",
      rows: classRanking.map(s => ({ Rank: s.rank, Name: s.name, AdmNo: s.admNo, Average: s.count > 0 ? s.avg : "", CBCLevel: s.count > 0 ? cbe(s.avg, exam.maxScore).code : "" })),
    }]);
  };

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
  <title>Report — ${student?.name || "Student"}</title>
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
</html>`);};

  return (
    <div>
      {/* Print styles removed — printing is now handled via new window */}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.reports.title}</h2>
        <div style={{ display:"flex", gap:8 }}>
          {reportType === "student" && student && exam && (
            <button style={css.btn("ghost")} onClick={downloadReport}>⬇ Download Excel</button>
          )}
          {reportType === "rank" && classRanking.length > 0 && (
            <button style={css.btn("ghost")} onClick={downloadRanking}>⬇ Download Ranking</button>
          )}
          <button style={css.btn("gold")} onClick={printReport}>🖨 {t.reports.print}</button>
        </div>
      </div>

      <div style={{ ...css.card, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div>
            <label style={css.label}>Report Type</label>
            <select style={css.select} value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="student">{t.reports.studentReport}</option>
              <option value="class">{t.reports.classReport}</option>
              <option value="rank">{t.reports.rankReport}</option>
            </select>
          </div>
          {(reportType === "student" || reportType === "rank") && (
            <div>
              <label style={css.label}>{t.reports.selectStudent}</label>
              <select style={css.select} value={selStudent} onChange={e => setSelStudent(e.target.value)}>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admNo})</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={css.label}>{t.reports.selectExam}</label>
            <select style={css.select} value={selExam} onChange={e => setSelExam(e.target.value)}>
              {exams.map(e => <option key={e.id} value={e.id}>{e.examName}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div id="report-printable">
      {reportType === "student" && student && exam && (
        <ReportCard student={student} exam={exam} avg={avg} overall={overall}
          t={t} lang={lang} colors={colors} css={css} subjects={subjects} results={results} cbe={cbe} />
      )}

      {reportType === "rank" && student && exam && (
        <div style={css.card}>
          <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 16, fontSize: 16 }}>
            {t.reports.rankReport} — {t.levels[student.level]} {student.grade}{student.stream} · {exam.examName}
          </div>
          <table style={css.table}>
            <thead>
              <tr>
                {["Rank", "Student", "Adm No.", "Average", "CBC Level"].map(h => <th key={h} style={css.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {classRanking.map(s => {
                const lvl = s.count > 0 ? cbe(s.avg, exam.maxScore) : null;
                return (
                  <tr key={s.id} style={{ background: s.id === selStudent ? "#fefce8" : "transparent" }}>
                    <td style={css.td}><span style={{ fontWeight: 800, color: s.rank <= 3 ? colors.gold : colors.text, fontSize: s.rank <= 3 ? 18 : 14 }}>{s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `#${s.rank}`}</span></td>
                    <td style={css.td}><strong>{s.name}</strong></td>
                    <td style={css.td}>{s.admNo}</td>
                    <td style={css.td}>{s.count > 0 ? `${s.avg} / ${exam.maxScore}` : "—"}</td>
                    <td style={css.td}>{lvl ? <span style={css.badge(lvl.color, lvl.bg)}>{lvl.code}</span> : <span style={{ color: colors.muted }}>No results</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reportType === "class" && exam && (
        <div style={css.card}>
          <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 16, fontSize: 16 }}>{t.reports.classReport} — {exam.examName} ({exam.term} {exam.year})</div>
          {gradesFor(exam.level).map(grade => {
            const gradeStudents = students.filter(s => s.level === exam.level && s.grade === grade);
            if (gradeStudents.length === 0) return null;
            const gradeResults = results.filter(r => r.examId === selExam && gradeStudents.find(s => s.id === r.studentId));
            const gradeAvg = gradeResults.length ? Math.round(gradeResults.reduce((a, r) => a + r.score, 0) / gradeResults.length) : null;
            const cbeGr = gradeAvg !== null ? cbe(gradeAvg, exam.maxScore) : null;
            return (
              <div key={grade} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${colors.border}` }}>
                <div>
                  <div style={{ fontWeight: 700, color: colors.primary }}>{grade}</div>
                  <div style={{ fontSize: 12, color: colors.muted }}>{gradeStudents.length} students · {gradeResults.length} scores recorded</div>
                </div>
                {cbeGr ? (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{gradeAvg} / {exam.maxScore}</div>
                    <span style={css.badge(cbeGr.color, cbeGr.bg)}>{cbeGr.code} — {cbeGr.label}</span>
                  </div>
                ) : <span style={{ color: colors.muted }}>No results</span>}
              </div>
            );
          })}
        </div>
      )}
      </div>{/* end report-printable */}
    </div>
  );
}
