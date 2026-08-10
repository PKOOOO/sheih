// Dashboard view, extracted from App() in index.jsx.
import { SCHOOL_NAMES } from "../../_lib/i18n";

export default function Dashboard({ t, lang, colors, css, students, teachers, subjects, exams, results, cbe, streamsFor, setPage }) {
  const activeExams = exams.filter(e => e.status === "Active").length;
  const juniorCount = students.filter(s => s.level === "junior").length;
  const seniorCount = students.filter(s => s.level === "senior").length;

  const cbeLevels = results.map(r => {
    const exam = exams.find(e => e.id === r.examId);
    return exam ? cbe(r.score, exam.maxScore).code : null;
  }).filter(Boolean);
  const levelCounts = {};
  cbeLevels.forEach(l => { levelCounts[l] = (levelCounts[l] || 0) + 1; });

  const recentStudents = [...students].slice(-3).reverse();

  return (
    <div>
      <div style={css.statsGrid}>
        {[
          { label: t.dashboard.totalStudents, val: students.length, accent: colors.primary, icon: "👥" },
          { label: t.dashboard.totalTeachers, val: teachers.length, accent: colors.gold, icon: "🎓" },
          { label: t.dashboard.totalSubjects, val: subjects.length, accent: "#2563eb", icon: "📚" },
          { label: t.dashboard.activeExams, val: activeExams, accent: "#16a34a", icon: "📋" },
        ].map((s, i) => (
          <div key={i} style={css.statCard(s.accent)}>
            <div style={{ fontSize: 26 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: colors.primary }}>{s.val}</div>
            <div style={{ fontSize: 13, color: colors.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ ...css.card, marginBottom: 0, borderTop: "3px solid #0c5460", display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, color: colors.primary }}>{t.dashboard.junior}</div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{SCHOOL_NAMES.junior[lang]}</div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Grade 7–9 · Streams: {streamsFor("junior").join(", ") || "—"}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0c5460" }}>{juniorCount}</div>
        </div>
        <div style={{ ...css.card, marginBottom: 0, borderTop: `3px solid ${colors.primary}`, display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, color: colors.primary }}>{t.dashboard.senior}</div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{SCHOOL_NAMES.senior[lang]}</div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Grade 10–12 · Streams: {streamsFor("senior").join(", ") || "—"}</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: colors.primary }}>{seniorCount}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <div style={css.card}>
          <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 14 }}>{t.dashboard.gradeDistribution}</div>
          {Object.entries(levelCounts).length === 0 ? (
            <p style={{ color: colors.muted, fontSize: 13 }}>{t.noData}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["EE1","EE2","ME1","ME2","AE1","AE2","BE1","BE2"].map(code => {
                const count = levelCounts[code] || 0;
                const pct = results.length ? Math.round((count / results.length) * 100) : 0;
                const cbeInfo = cbe(code === "EE1" ? 95 : code === "EE2" ? 85 : code === "ME1" ? 75 : code === "ME2" ? 65 : code === "AE1" ? 55 : code === "AE2" ? 45 : code === "BE1" ? 35 : 20, 100);
                return (
                  <div key={code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ ...css.badge(cbeInfo.color, cbeInfo.bg), width: 36, textAlign: "center" }}>{code}</span>
                    <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 10, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: cbeInfo.color, borderRadius: 4, transition: "width .5s" }} />
                    </div>
                    <span style={{ width: 30, fontSize: 13, color: colors.muted, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={css.card}>
          <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 14 }}>{t.dashboard.recentActivity}</div>
          {recentStudents.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < recentStudents.length - 1 ? `1px solid ${colors.border}` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: colors.primary, color: colors.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {s.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: colors.muted }}>{s.grade}{s.stream} · {t.levels[s.level]} · {s.gender}</div>
              </div>
            </div>
          ))}
          <button onClick={() => setPage("students")} style={{ ...css.btn("ghost"), marginTop: 12, width: "100%", textAlign: "center" }}>{t.nav.students} →</button>
        </div>
      </div>

      <div style={css.card}>
        <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 14 }}>Kenya CBC 8-Level Grading Scale</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {[
            { code: "EE1", range: "90–100%", score: 95 },
            { code: "EE2", range: "80–89%", score: 85 },
            { code: "ME1", range: "70–79%", score: 75 },
            { code: "ME2", range: "60–69%", score: 65 },
            { code: "AE1", range: "50–59%", score: 55 },
            { code: "AE2", range: "40–49%", score: 45 },
            { code: "BE1", range: "30–39%", score: 35 },
            { code: "BE2", range: "0–29%", score: 20 },
          ].map(({ code, range, score }) => {
            const cbeInfo = cbe(score, 100);
            return (
              <div key={code} style={{ background: cbeInfo.bg, border: `1px solid ${cbeInfo.color}22`, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontWeight: 800, color: cbeInfo.color, fontSize: 16 }}>{code}</div>
                <div style={{ fontSize: 12, color: cbeInfo.color, fontWeight: 600 }}>{cbeInfo.label}</div>
                <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{range}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
