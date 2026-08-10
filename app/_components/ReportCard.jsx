// Printable student report card, extracted from App() in index.jsx.
// Shared by the Reports and ParentPortal views.
import { LOGO_SRC } from "../_lib/logo";
import { SCHOOL_NAMES } from "../_lib/i18n";

export default function ReportCard({ student, exam, avg, overall, t, lang, colors, css, subjects, results, cbe }) {
  return (
    <div style={css.card}>
      <div style={{ textAlign: "center", borderBottom: `3px solid ${colors.gold}`, paddingBottom: 16, marginBottom: 20 }}>
        <img src={LOGO_SRC} alt="School Logo" style={{ width: 70, height: 70, objectFit: "contain", marginBottom: 10 }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: colors.primary, lineHeight: 1.4 }}>
          {SCHOOL_NAMES[student.level][lang]}
        </div>
        <div style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>Academic Results Report</div>
        <div style={{ marginTop: 8, display: "inline-block", background: colors.primary, color: colors.gold, padding: "4px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
          {exam.examName} · {exam.term} {exam.year}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 20, background: colors.light, padding: 16, borderRadius: 8 }}>
        {[
          ["Student Name", student.name],
          ["Admission No.", student.admNo],
          ["School Level", t.levels[student.level]],
          ["Grade / Stream", `${student.grade}${student.stream}`],
          ["Gender", student.gender],
          ["Parent/Guardian", student.parent || "—"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 8 }}>
            <span style={{ color: colors.muted, fontSize: 13, minWidth: 130 }}>{k}:</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
          </div>
        ))}
      </div>

      <table style={css.table}>
        <thead>
          <tr>
            {["Subject", "Code", "Score", `/ ${exam.maxScore}`, "%", "CBC Level"].map(h => (
              <th key={h} style={css.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.filter(sub => (sub.levels || []).includes(student.level)).map(sub => {
            const r = results.find(r => r.examId === exam.id && r.studentId === student.id && r.subjectId === sub.id);
            const cbeCell = r ? cbe(r.score, exam.maxScore) : null;
            const pct = r ? Math.round((r.score / exam.maxScore) * 100) : null;
            return (
              <tr key={sub.id}>
                <td style={css.td}>{sub.name}</td>
                <td style={css.td}><span style={css.badge("#64748b", "#f1f5f9")}>{sub.code}</span></td>
                <td style={css.td}>{r ? <strong>{r.score}</strong> : "—"}</td>
                <td style={css.td}>{r ? exam.maxScore : "—"}</td>
                <td style={css.td}>{pct !== null ? `${pct}%` : "—"}</td>
                <td style={css.td}>{cbeCell ? <span style={css.badge(cbeCell.color, cbeCell.bg)}>{cbeCell.code} — {cbeCell.label}</span> : <span style={{ color: colors.muted }}>—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {overall && (
        <div style={{ marginTop: 20, padding: 16, background: overall.bg, borderRadius: 8, border: `2px solid ${overall.color}`, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, color: overall.color, fontSize: 16 }}>Overall Performance</div>
            <div style={{ color: overall.color, fontSize: 14 }}>Average Score: {avg} / {exam.maxScore} ({Math.round((avg / exam.maxScore) * 100)}%)</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: overall.color }}>{overall.code}</div>
            <div style={{ fontSize: 13, color: overall.color }}>{overall.label}</div>
          </div>
        </div>
      )}
    </div>
  );
}
