"use client";
import { useRef } from "react";
import { downloadWorkbook, nowStamp } from "../../_lib/storage";

// Data & backup view, extracted from App() in index.jsx.
export default function DataBackup({
  t, lang, colors, css, students, teachers, subjects, exams, results, users, cbe,
  saveStatus, lastSavedAt, manualBackupDownload, restoreFromBackupFile, resetAllData, showConfirm,
}) {
  const restoreFileRef = useRef();

  const statusBadge = () => {
    const map = {
      saving: { label: t.backup.statusSaving, color: "#854d0e", bg: "#fef9c3", dot: "#ca8a04" },
      saved: { label: t.backup.statusSaved, color: "#166534", bg: "#dcfce7", dot: "#16a34a" },
      error: { label: t.backup.statusError, color: "#991b1b", bg: "#fee2e2", dot: "#dc2626" },
      idle: { label: t.backup.statusIdle, color: "#374151", bg: "#f3f4f6", dot: "#9ca3af" },
    };
    const s = map[saveStatus] || map.idle;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...css.badge(s.color, s.bg) }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
        {s.label}
      </span>
    );
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const captured = file;
    e.target.value = "";
    showConfirm(t.backup.restoreConfirm, () => {
      restoreFromBackupFile(captured);
    }, { danger: true, subMessage: t.backup.restoreDesc });
  };

  const handleReset = () => {
    showConfirm(t.backup.resetConfirm, () => {
      // nested second confirm for extra safety
      showConfirm(t.backup.resetConfirm2, () => {
        resetAllData();
      }, { danger: true });
    }, { danger: true, subMessage: t.backup.dangerDesc });
  };

  const exportStudents = () => downloadWorkbook(`students-${nowStamp()}.xlsx`, [{
    name: "Students",
    rows: students.map(s => ({ AdmNo: s.admNo, Name: s.name, Level: t.levels[s.level], Grade: s.grade, Stream: s.stream, Gender: s.gender, DOB: s.dob, Parent: s.parent, Phone: s.phone })),
  }]);

  const exportTeachers = () => downloadWorkbook(`teachers-${nowStamp()}.xlsx`, [{
    name: "Teachers",
    rows: teachers.map(tc => ({ StaffID: tc.staffId, Name: tc.name, Email: tc.email, Phone: tc.phone, Subjects: tc.subjects.join("; "), Classes: tc.classes.join("; ") })),
  }]);

  const exportSubjects = () => downloadWorkbook(`subjects-${nowStamp()}.xlsx`, [{
    name: "Subjects",
    rows: subjects.map(s => ({ Code: s.code, Name: s.name, Category: s.category, Levels: (s.levels || []).map(l => t.levels[l]).join("; "), Description: s.description })),
  }]);

  const exportExams = () => downloadWorkbook(`exams-${nowStamp()}.xlsx`, [{
    name: "Exams",
    rows: exams.map(e => ({ Name: e.examName, Level: t.levels[e.level], Term: e.term, Year: e.year, MaxScore: e.maxScore, PassMark: e.passMark, Weight: e.weight, Grades: e.grades.join("; "), Status: e.status })),
  }]);

  const exportResults = () => downloadWorkbook(`results-${nowStamp()}.xlsx`, [{
    name: "Results",
    rows: results.map(r => {
      const stu = students.find(s => s.id === r.studentId);
      const sub = subjects.find(s => s.id === r.subjectId);
      const exam = exams.find(e => e.id === r.examId);
      const cbeLine = exam ? cbe(r.score, exam.maxScore) : null;
      return {
        AdmNo: stu?.admNo || "", Student: stu?.name || "", Level: stu ? t.levels[stu.level] : "", Grade: stu?.grade || "", Stream: stu?.stream || "",
        Exam: exam?.examName || "", Subject: sub?.name || "", Score: r.score, MaxScore: exam?.maxScore || "", CBCLevel: cbeLine?.code || "",
      };
    }),
  }]);

  const exportUsers = () => downloadWorkbook(`users-${nowStamp()}.xlsx`, [{
    name: "Users",
    rows: users.map(u => ({ FullName: u.fullName, Username: u.username, Email: u.email, Role: t.users.roles[u.role], Status: u.status })),
  }]);

  const exportAll = () => downloadWorkbook(`skbzs-sms-full-export-${nowStamp()}.xlsx`, [
    { name: "Students", rows: students.map(s => ({ AdmNo: s.admNo, Name: s.name, Level: t.levels[s.level], Grade: s.grade, Stream: s.stream, Gender: s.gender, DOB: s.dob, Parent: s.parent, Phone: s.phone })) },
    { name: "Teachers", rows: teachers.map(tc => ({ StaffID: tc.staffId, Name: tc.name, Email: tc.email, Phone: tc.phone, Subjects: tc.subjects.join("; "), Classes: tc.classes.join("; ") })) },
    { name: "Subjects", rows: subjects.map(s => ({ Code: s.code, Name: s.name, Category: s.category, Levels: (s.levels || []).map(l => t.levels[l]).join("; ") })) },
    { name: "Exams", rows: exams.map(e => ({ Name: e.examName, Level: t.levels[e.level], Term: e.term, Year: e.year, MaxScore: e.maxScore, PassMark: e.passMark, Status: e.status })) },
    {
      name: "Results", rows: results.map(r => {
        const stu = students.find(s => s.id === r.studentId);
        const sub = subjects.find(s => s.id === r.subjectId);
        const exam = exams.find(e => e.id === r.examId);
        const cbeEx = exam ? cbe(r.score, exam.maxScore) : null;
        return { AdmNo: stu?.admNo || "", Student: stu?.name || "", Exam: exam?.examName || "", Subject: sub?.name || "", Score: r.score, CBCLevel: cbeEx?.code || "" };
      }),
    },
    { name: "Users", rows: users.map(u => ({ FullName: u.fullName, Username: u.username, Role: t.users.roles[u.role], Status: u.status })) },
  ]);

  const fmtDate = (iso) => {
    if (!iso) return t.backup.never;
    try {
      return new Date(iso).toLocaleString(lang === "ar" ? "ar-EG" : "en-KE", { dateStyle: "medium", timeStyle: "short" });
    } catch { return iso; }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.backup.title}</h2>
        <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{t.backup.subtitle}</p>
      </div>

      {/* Autosave status */}
      <div style={{ ...css.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, color: colors.primary }}>{t.backup.autosaveTitle}</div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{t.backup.autosaveDesc}</div>
          <div style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>{t.backup.lastSaved}: <strong>{fmtDate(lastSavedAt)}</strong></div>
        </div>
        {statusBadge()}
      </div>

      {/* Full backup / restore */}
      <div style={css.grid2}>
        <div style={css.card}>
          <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 6 }}>📦 {t.backup.backupTitle}</div>
          <p style={{ fontSize: 12, color: colors.muted, marginBottom: 14, lineHeight: 1.5 }}>{t.backup.backupDesc}</p>
          <button style={{ ...css.btn(), width: "100%" }} onClick={manualBackupDownload}>⬇ {t.backup.downloadBackup}</button>
        </div>
        <div style={css.card}>
          <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 6 }}>♻ {t.backup.restoreTitle}</div>
          <p style={{ fontSize: 12, color: colors.muted, marginBottom: 14, lineHeight: 1.5 }}>{t.backup.restoreDesc}</p>
          <button style={{ ...css.btn("ghost"), width: "100%" }} onClick={() => restoreFileRef.current.click()}>📤 {t.backup.restoreBtn}</button>
          <input ref={restoreFileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleRestoreFile} />
        </div>
      </div>

      {/* Module exports */}
      <div style={css.card}>
        <div style={{ fontWeight: 700, color: colors.primary, marginBottom: 6 }}>📊 {t.backup.exportTitle}</div>
        <p style={{ fontSize: 12, color: colors.muted, marginBottom: 16, lineHeight: 1.5 }}>{t.backup.exportDesc}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          {[
            { label: t.backup.exportStudents, fn: exportStudents, icon: "👥" },
            { label: t.backup.exportTeachers, fn: exportTeachers, icon: "🎓" },
            { label: t.backup.exportSubjects, fn: exportSubjects, icon: "📚" },
            { label: t.backup.exportExams, fn: exportExams, icon: "📋" },
            { label: t.backup.exportResults, fn: exportResults, icon: "📊" },
            { label: t.backup.exportUsers, fn: exportUsers, icon: "🔐" },
          ].map(({ label, fn, icon }) => (
            <button key={label} style={{ ...css.btn("ghost"), display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start" }} onClick={fn}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>
        <button style={{ ...css.btn("gold"), width: "100%", marginTop: 12 }} onClick={exportAll}>📁 {t.backup.exportAll}</button>
      </div>

      {/* Danger zone */}
      <div style={{ ...css.card, border: `1px solid #fecaca`, background: "#fef2f2" }}>
        <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>⚠ {t.backup.dangerTitle}</div>
        <p style={{ fontSize: 12, color: "#991b1b", marginBottom: 14, lineHeight: 1.5 }}>{t.backup.dangerDesc}</p>
        <button style={css.btn("danger")} onClick={handleReset}>🗑 {t.backup.resetBtn}</button>
      </div>
    </div>
  );
}
