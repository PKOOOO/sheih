"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LOGO_SRC } from "../_lib/logo";
import { T } from "../_lib/i18n";
import { DEFAULT_CBE_GRADES, getCBELevel } from "../_lib/grading";
import { DEFAULT_GRADES } from "../_lib/schoolStructure";
import {
  uid, storageGet, storageSet, downloadJSON, nowStamp,
  STORAGE_KEY, DATA_VERSION,
} from "../_lib/storage";
import { colors, makeCss } from "../_lib/theme";
import { useIsMobile } from "../_lib/useIsMobile";
import {
  INITIAL_STREAMS, INITIAL_STUDENTS, INITIAL_TEACHERS, INITIAL_SUBJECTS,
  INITIAL_EXAMS, INITIAL_RESULTS, seedUsers,
} from "../_lib/seed";

import Toast from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import LangSwitch from "./LangSwitch";

import LoginScreen from "./views/LoginScreen";
import Dashboard from "./views/Dashboard";
import Students from "./views/Students";
import Teachers from "./views/Teachers";
import Subjects from "./views/Subjects";
import ClassesStreams from "./views/ClassesStreams";
import Exams from "./views/Exams";
import Results from "./views/Results";
import Reports from "./views/Reports";
import ParentPortal from "./views/ParentPortal";
import Users from "./views/Users";
import DataBackup from "./views/DataBackup";
import ClassLists from "./views/ClassLists";
import GradeSettings from "./views/GradeSettings";

// De-nested top-level App component, extracted from index.jsx. Owns all
// state/effects and renders the currently active view, passing each view
// its data and handlers as explicit props.
export default function SchoolApp() {
  const [lang, setLang] = useState("en");
  const t = T[lang];
  const dir = t.dir;

  const [page, setPage] = useState("dashboard");
  const isMobile = useIsMobile();
  // Sidebar is a permanent column on desktop and an off-canvas drawer on mobile.
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ── Custom confirm dialog (replaces window.confirm which is blocked in iframes) ──
  const [confirmDialog, setConfirmDialog] = useState(null);
  // confirmDialog: { message, subMessage?, onConfirm, danger? }
  const showConfirm = (message, onConfirm, options = {}) => {
    setConfirmDialog({ message, onConfirm, subMessage: options.subMessage, danger: options.danger });
  };
  const closeConfirm = () => setConfirmDialog(null);

  // ── Auth state ──
  const [currentUser, setCurrentUser] = useState(null);

  // ── Editable streams (per level) ──
  const [streams, setStreams] = useState(INITIAL_STREAMS);

  const gradesFor = (level) => gradesForLevel(level);
  const streamsFor = (level) => streams.filter(s => s.level === level).map(s => s.name);

  // ── Core data ──
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [teachers, setTeachers] = useState(INITIAL_TEACHERS);
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [exams, setExams] = useState(INITIAL_EXAMS);
  const [results, setResults] = useState(() => INITIAL_RESULTS);
  const [users, setUsers] = useState(() => seedUsers(teachers, students));

  // ── Adjustable CBC grade bands (must be declared before persistence hooks) ──
  const [cbeGrades, setCbeGrades] = useState(DEFAULT_CBE_GRADES.map(g => ({ ...g })));
  const cbe = (score, maxScore) => getCBELevel(score, maxScore, cbeGrades);

  // ── Extra grade levels (beyond default 7-12) ──
  const [extraGrades, setExtraGrades] = useState({ junior: [], senior: [] });
  const gradesForLevel = (level) => [...(DEFAULT_GRADES[level] || []), ...(extraGrades[level] || [])];

  // ── Data persistence (load on mount, auto-save on change) ──
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  const hydratedRef = useRef(false);

  // Load any previously saved data once on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await storageGet(STORAGE_KEY);
      if (cancelled) return;
      if (saved && saved.version === DATA_VERSION && saved.data) {
        const d = saved.data;
        if (d.streams) setStreams(d.streams);
        if (d.students) setStudents(d.students);
        if (d.teachers) setTeachers(d.teachers);
        if (d.subjects) setSubjects(d.subjects);
        if (d.exams) setExams(d.exams);
        if (d.results) setResults(d.results);
        if (d.users) setUsers(d.users);
        if (d.lang) setLang(d.lang);
        if (d.cbeGrades) setCbeGrades(d.cbeGrades);
        if (d.extraGrades) setExtraGrades(d.extraGrades);
        setLastSavedAt(saved.savedAt || null);
      }
      hydratedRef.current = true;
      setDataLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildSnapshot = useCallback(() => ({
    streams, students, teachers, subjects, exams, results, users, lang, cbeGrades, extraGrades,
  }), [streams, students, teachers, subjects, exams, results, users, lang, cbeGrades, extraGrades]);

  // Debounced auto-save whenever core data changes (skipped until initial load completes)
  useEffect(() => {
    if (!hydratedRef.current) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const savedAt = new Date().toISOString();
      const ok = await storageSet(STORAGE_KEY, { version: DATA_VERSION, savedAt, data: buildSnapshot() });
      setSaveStatus(ok ? "saved" : "error");
      if (ok) setLastSavedAt(savedAt);
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, students, teachers, subjects, exams, results, users, lang, cbeGrades, extraGrades]);

  const manualBackupDownload = () => {
    downloadJSON(`skbzs-sms-backup-${nowStamp()}.json`, { version: DATA_VERSION, savedAt: new Date().toISOString(), data: buildSnapshot() });
  };

  const restoreFromBackupFile = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const d = parsed.data || parsed; // tolerate raw-data-only files
        if (d.streams) setStreams(d.streams);
        if (d.students) setStudents(d.students);
        if (d.teachers) setTeachers(d.teachers);
        if (d.subjects) setSubjects(d.subjects);
        if (d.exams) setExams(d.exams);
        if (d.results) setResults(d.results);
        if (d.users) setUsers(d.users);
        if (d.lang) setLang(d.lang);
        if (d.cbeGrades) setCbeGrades(d.cbeGrades);
        if (d.extraGrades) setExtraGrades(d.extraGrades);
        showToast(lang === "ar" ? "تم استعادة البيانات بنجاح." : "Data restored successfully.");
      } catch {
        showToast(lang === "ar" ? "فشلت الاستعادة. ملف غير صالح." : "Restore failed. Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const resetAllData = () => {
    setStreams([
      { id: uid(), name: "R", level: "junior" }, { id: uid(), name: "G", level: "junior" },
      { id: uid(), name: "W", level: "junior" }, { id: uid(), name: "B", level: "junior" },
      { id: uid(), name: "A", level: "senior" }, { id: uid(), name: "B", level: "senior" },
      { id: uid(), name: "C", level: "senior" }, { id: uid(), name: "D", level: "senior" },
      { id: uid(), name: "E", level: "senior" }, { id: uid(), name: "F", level: "senior" },
      { id: uid(), name: "G", level: "senior" }, { id: uid(), name: "H", level: "senior" },
    ]);
    setStudents([]);
    setTeachers([]);
    setSubjects([]);
    setExams([]);
    setResults([]);
    setUsers(seedUsers([], []));
    setCbeGrades(DEFAULT_CBE_GRADES.map(g => ({ ...g })));
    showToast(lang === "ar" ? "تمت إعادة تعيين جميع البيانات." : "All data has been reset.");
  };

  const navItemsFor = (role) => {
    const all = [
      { key: "dashboard",    icon: "⊞",  label: t.nav.dashboard,     roles: ["admin","registrar","teacher","examOfficer","viewer"] },
      { key: "students",     icon: "👥",  label: t.nav.students,      roles: ["admin","registrar"] },
      { key: "classlists",   icon: "📋",  label: t.nav.classlists,    roles: ["admin","registrar","teacher","examOfficer"] },
      { key: "teachers",     icon: "🎓",  label: t.nav.teachers,      roles: ["admin","registrar"] },
      { key: "subjects",     icon: "📚",  label: t.nav.subjects,      roles: ["admin","registrar"] },
      { key: "classes",      icon: "🏷",  label: t.nav.classes,       roles: ["admin","registrar"] },
      { key: "gradeSettings",icon: "⚙",  label: t.nav.gradeSettings, roles: ["admin"] },
      { key: "exams",        icon: "📝",  label: t.nav.exams,         roles: ["admin","examOfficer"] },
      { key: "results",      icon: "📊",  label: t.nav.results,       roles: ["admin","teacher","examOfficer"] },
      { key: "reports",      icon: "📄",  label: t.nav.reports,       roles: ["admin","registrar","teacher","examOfficer","viewer"] },
      { key: "users",        icon: "🔐",  label: t.nav.users,         roles: ["admin"] },
      { key: "backup",       icon: "💾",  label: t.nav.backup,        roles: ["admin"] },
      { key: "myResults",    icon: "📑",  label: t.nav.myResults,     roles: ["parent"] },
    ];
    return all.filter(item => item.roles.includes(role));
  };

  const css = makeCss(dir, isMobile, navOpen);

  // Navigating always dismisses the mobile drawer.
  const goToPage = (key) => { setPage(key); setNavOpen(false); };

  if (!currentUser) {
    return (
      <LoginScreen
        t={t} dir={dir} lang={lang} setLang={setLang} colors={colors} css={css}
        users={users} setCurrentUser={setCurrentUser} setPage={setPage}
      />
    );
  }

  const navItems = navItemsFor(currentUser.role);
  const pageMap = {
    dashboard: <Dashboard t={t} lang={lang} colors={colors} css={css} students={students} teachers={teachers} subjects={subjects} exams={exams} results={results} cbe={cbe} streamsFor={streamsFor} setPage={setPage} />,
    students: <Students t={t} lang={lang} colors={colors} css={css} students={students} setStudents={setStudents} gradesFor={gradesFor} streamsFor={streamsFor} showToast={showToast} showConfirm={showConfirm} />,
    teachers: <Teachers t={t} colors={colors} css={css} teachers={teachers} setTeachers={setTeachers} subjects={subjects} streamsFor={streamsFor} showToast={showToast} showConfirm={showConfirm} />,
    subjects: <Subjects t={t} colors={colors} css={css} subjects={subjects} setSubjects={setSubjects} showToast={showToast} showConfirm={showConfirm} />,
    classes: <ClassesStreams t={t} lang={lang} colors={colors} css={css} streams={streams} setStreams={setStreams} students={students} setStudents={setStudents} gradesFor={gradesFor} showToast={showToast} showConfirm={showConfirm} />,
    exams: <Exams t={t} colors={colors} css={css} exams={exams} setExams={setExams} gradesFor={gradesFor} showToast={showToast} showConfirm={showConfirm} />,
    results: <Results t={t} colors={colors} css={css} exams={exams} results={results} setResults={setResults} students={students} subjects={subjects} gradesFor={gradesFor} streamsFor={streamsFor} cbe={cbe} showToast={showToast} showConfirm={showConfirm} />,
    reports: <Reports t={t} lang={lang} colors={colors} css={css} students={students} exams={exams} subjects={subjects} results={results} gradesFor={gradesFor} cbe={cbe} showToast={showToast} />,
    users: <Users t={t} lang={lang} colors={colors} css={css} users={users} setUsers={setUsers} students={students} teachers={teachers} showToast={showToast} showConfirm={showConfirm} />,
    myResults: <ParentPortal t={t} lang={lang} colors={colors} css={css} students={students} subjects={subjects} exams={exams} results={results} cbe={cbe} currentUser={currentUser} showToast={showToast} />,
    backup: <DataBackup t={t} lang={lang} colors={colors} css={css} students={students} teachers={teachers} subjects={subjects} exams={exams} results={results} users={users} cbe={cbe} saveStatus={saveStatus} lastSavedAt={lastSavedAt} manualBackupDownload={manualBackupDownload} restoreFromBackupFile={restoreFromBackupFile} resetAllData={resetAllData} showConfirm={showConfirm} />,
    classlists: <ClassLists t={t} lang={lang} colors={colors} css={css} students={students} exams={exams} results={results} gradesFor={gradesFor} streamsFor={streamsFor} cbe={cbe} />,
    gradeSettings: <GradeSettings t={t} colors={colors} css={css} cbeGrades={cbeGrades} setCbeGrades={setCbeGrades} extraGrades={extraGrades} setExtraGrades={setExtraGrades} gradesForLevel={gradesForLevel} students={students} showToast={showToast} showConfirm={showConfirm} />,
  };
  const activePage = navItems.find(n => n.key === page) ? page : navItems[0]?.key;

  const handleLogout = () => {
    setCurrentUser(null);
    setPage("dashboard");
  };

  const roleColorsTop = {
    admin: ["#7f1d1d", "#fee2e2"], registrar: ["#1e3a8a", "#dbeafe"], teacher: ["#14532d", "#dcfce7"],
    examOfficer: ["#854d0e", "#fef9c3"], viewer: ["#374151", "#f3f4f6"], parent: ["#581c87", "#f3e8ff"],
  };
  const [rc, rbg] = roleColorsTop[currentUser.role] || roleColorsTop.viewer;

  return (
    <div style={css.app}>
      {isMobile && <div style={css.sidebarBackdrop} onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div style={css.sidebar}>
        <div style={css.sidebarTop}>
          <img src={LOGO_SRC} alt="Logo" style={css.sidebarLogo} />
          <div>
            <p style={css.sidebarTitle}>{lang === "ar" ? "مدارس الشيخ خليفة بن زايد آل نهيان" : "Sheikh Khalifa Bin Zayed Al Nahyan Schools"}</p>
            <p style={css.sidebarSub}>{t.appSubtitle}</p>
          </div>
        </div>
        <nav style={css.navScroll}>
          {navItems.map(item => (
            <div key={item.key} style={css.navItem(activePage === item.key)} onClick={() => goToPage(item.key)}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, marginBottom: 8 }}>Language / اللغة</div>
          <LangSwitch lang={lang} setLang={setLang} colors={colors} />
        </div>
      </div>

      <div style={css.main}>
        <div style={css.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {isMobile && (
              <button
                style={css.hamburger}
                onClick={() => setNavOpen(o => !o)}
                aria-label={navOpen ? "Close menu" : "Open menu"}
                aria-expanded={navOpen}
              >
                {navOpen ? "✕" : "☰"}
              </button>
            )}
            <h1 style={css.pageTitle}>{navItems.find(n => n.key === activePage)?.label}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14, flexShrink: 0 }}>
            {currentUser.role === "admin" && (
              <div
                onClick={() => goToPage("backup")}
                title={t.backup.title}
                style={{
                  display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                  fontSize: 11, color: saveStatus === "error" ? "#dc2626" : colors.muted,
                  padding: isMobile ? 6 : "4px 10px", borderRadius: 14, background: colors.light,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", display: "inline-block", flexShrink: 0,
                  background: saveStatus === "saving" ? "#ca8a04" : saveStatus === "error" ? "#dc2626" : "#16a34a",
                }} />
                {/* Status text is dropped on mobile — the coloured dot carries the meaning. */}
                {!isMobile && (saveStatus === "saving" ? t.backup.statusSaving : saveStatus === "error" ? t.backup.statusError : t.backup.statusSaved)}
              </div>
            )}
            {!isMobile && (
              <div style={{ fontSize: 13, color: colors.muted }}>
                {new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                title={isMobile ? `${currentUser.fullName} — ${t.users.roles[currentUser.role]}` : undefined}
                style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, flexShrink: 0, borderRadius: "50%", background: colors.primary, color: colors.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: isMobile ? 13 : 16 }}
              >
                {currentUser.fullName.charAt(0)}
              </div>
              {!isMobile && (
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{currentUser.fullName}</div>
                  <span style={{ ...css.badge(rc, rbg), fontSize: 10, padding: "1px 8px" }}>{t.users.roles[currentUser.role]}</span>
                </div>
              )}
            </div>
            <button
              style={{ ...css.btn("ghost"), padding: isMobile ? "7px 10px" : "6px 14px", fontSize: 12 }}
              onClick={handleLogout}
              title={t.login.logout}
              aria-label={t.login.logout}
            >
              ⏻{isMobile ? "" : ` ${t.login.logout}`}
            </button>
          </div>
        </div>
        <div style={css.content}>{pageMap[activePage] || pageMap.dashboard}</div>
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <ConfirmDialog dialog={confirmDialog} onCancel={closeConfirm} />
    </div>
  );
}
