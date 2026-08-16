"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast as sonnerToast } from "sonner";
import {
  BookOpen, ClipboardList, Database, FileSpreadsheet, FileText, GraduationCap,
  LayoutGrid, LogOut, ScrollText, Settings, ShieldCheck, Tags, Users as UsersIcon,
} from "lucide-react";
import { LOGO_SRC } from "../_lib/logo";
import { T } from "../_lib/i18n";
import { DEFAULT_CBE_GRADES, getCBELevel } from "../_lib/grading";
import { DEFAULT_GRADES } from "../_lib/schoolStructure";
import { downloadJSON, nowStamp } from "../_lib/storage";
import { INITIAL_STREAMS, seedUsers } from "../_lib/seed";
import {
  apiBootstrap, apiCreate, apiUpdate, apiDelete, apiSaveSettings, diffCollection,
  apiLogout, apiMe,
} from "../../lib/api-client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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

const ROLE_BADGE = {
  admin: "bg-red-100 text-red-900",
  registrar: "bg-blue-100 text-blue-900",
  teacher: "bg-green-100 text-green-900",
  examOfficer: "bg-amber-100 text-amber-900",
  viewer: "bg-neutral-100 text-neutral-700",
  parent: "bg-purple-100 text-purple-900",
};

// The nav rail. Split out from SchoolApp because `useSidebar` may only be
// called *inside* SidebarProvider — this is also what lets a tap on a menu
// item close the mobile Sheet.
function AppSidebar({ navItems, activePage, onNavigate, lang, setLang, t, dir }) {
  const { isMobile, setOpenMobile } = useSidebar();

  const go = (key) => {
    onNavigate(key);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"} dir={dir} className="print-hide">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="School logo"
            className="size-10 shrink-0 rounded-md bg-white object-contain p-0.5"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ key, Icon, label }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    isActive={activePage === key}
                    onClick={() => go(key)}
                    tooltip={label}
                    // Roomier tap target on touch screens.
                    className="h-10 md:h-8"
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <p className="mb-1.5 text-[11px] text-sidebar-foreground/50">Language / اللغة</p>
        <LangSwitch lang={lang} setLang={setLang} onSidebar />
      </SidebarFooter>
    </Sidebar>
  );
}

// De-nested top-level App component, extracted from index.jsx. Owns all
// state/effects and renders the currently active view, passing each view
// its data and handlers as explicit props.
export default function SchoolApp() {
  const [lang, setLang] = useState("en");
  const t = T[lang];
  const dir = t.dir;

  const [page, setPage] = useState("dashboard");
  // Sidebar is a permanent column on desktop and a Sheet drawer on mobile —
  // both handled by shadcn's SidebarProvider, so no open-state lives here.
  const showToast = (msg) => sonnerToast.success(msg);

  // ── Custom confirm dialog (replaces window.confirm which is blocked in iframes) ──
  const [confirmDialog, setConfirmDialog] = useState(null);
  // confirmDialog: { message, subMessage?, onConfirm, danger? }
  const showConfirm = (message, onConfirm, options = {}) => {
    setConfirmDialog({ message, onConfirm, subMessage: options.subMessage, danger: options.danger });
  };
  const closeConfirm = () => setConfirmDialog(null);

  // ── Auth state ──
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Resume an existing session (valid cookie) on first mount.
  useEffect(() => {
    let cancelled = false;
    apiMe()
      .then(user => { if (!cancelled && user) setCurrentUser(user); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, []);

  // ── Editable streams (per level) ──
  const [streams, setStreams] = useState([]);

  const gradesFor = (level) => gradesForLevel(level);
  const streamsFor = (level) => streams.filter(s => s.level === level).map(s => s.name);

  // ── Core data (loaded from the database via /api/bootstrap) ──
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);

  // ── Adjustable CBC grade bands (must be declared before persistence hooks) ──
  const [cbeGrades, setCbeGrades] = useState(DEFAULT_CBE_GRADES.map(g => ({ ...g })));
  const cbe = (score, maxScore) => getCBELevel(score, maxScore, cbeGrades);

  // ── Extra grade levels (beyond default 7-12) ──
  const [extraGrades, setExtraGrades] = useState({ junior: [], senior: [] });
  const gradesForLevel = (level) => [...(DEFAULT_GRADES[level] || []), ...(extraGrades[level] || [])];

  // ── Data persistence (load from DB on mount, diff-sync on change) ──
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  const hydratedRef = useRef(false);
  // Server-acknowledged snapshot: what the database currently holds. Every
  // state change is diffed against this to produce POST/PUT/DELETE calls.
  const lastSyncedRef = useRef(null);
  // Freshest state, so the debounced sync reads current values when it fires.
  const liveRef = useRef(null);
  const syncingRef = useRef(false);

  // Load everything from the database once signed in (/api/bootstrap is protected)
  useEffect(() => {
    if (!currentUser || dataLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await apiBootstrap();
        if (cancelled) return;
        setStreams(d.streams); setStudents(d.students); setTeachers(d.teachers);
        setSubjects(d.subjects); setExams(d.exams); setResults(d.results); setUsers(d.users);
        if (d.settings) {
          if (d.settings.lang) setLang(d.settings.lang);
          if (d.settings.cbeGrades) setCbeGrades(d.settings.cbeGrades);
          if (d.settings.extraGrades) setExtraGrades(d.settings.extraGrades);
        }
        lastSyncedRef.current = {
          streams: d.streams, students: d.students, teachers: d.teachers,
          subjects: d.subjects, exams: d.exams, results: d.results, users: d.users,
          settings: d.settings,
        };
        hydratedRef.current = true;
        setDataLoaded(true);
      } catch (e) {
        console.error("Bootstrap failed:", e);
        if (!cancelled) setLoadError(String(e.message || e));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, dataLoaded]);

  const buildSnapshot = useCallback(() => ({
    streams, students, teachers, subjects, exams, results, users, lang, cbeGrades, extraGrades,
  }), [streams, students, teachers, subjects, exams, results, users, lang, cbeGrades, extraGrades]);

  // Push the difference between client state and the last-synced snapshot to
  // the API. Order matters for foreign keys: results are deleted first and
  // created last, so they never reference a row that doesn't exist yet.
  // Plain hoisted function (not useCallback) so it can reschedule itself when
  // a sync is already in flight; it only ever reads state through refs.
  async function syncToServer() {
    if (syncingRef.current) {
      // A sync is in flight — try again shortly with whatever state is current then.
      saveTimerRef.current = setTimeout(syncToServer, 400);
      return;
    }
    syncingRef.current = true;
    const live = liveRef.current;
    const base = lastSyncedRef.current;
    const PARENTS = ["streams", "students", "teachers", "subjects", "exams", "users"];
    try {
      const diffs = {};
      for (const key of [...PARENTS, "results"]) {
        diffs[key] = diffCollection(base[key], live[key]);
      }
      // 1. deletes: results first, then parent collections
      await Promise.all(diffs.results.deletedIds.map(id => apiDelete("results", id)));
      for (const key of PARENTS) {
        await Promise.all(diffs[key].deletedIds.map(id => apiDelete(key, id)));
      }
      // 2. creates/updates: parents first, then results
      for (const key of PARENTS) {
        await Promise.all([
          ...diffs[key].created.map(row => apiCreate(key, row)),
          ...diffs[key].updated.map(row => apiUpdate(key, row)),
        ]);
      }
      await Promise.all([
        ...diffs.results.created.map(row => apiCreate("results", row)),
        ...diffs.results.updated.map(row => apiUpdate("results", row)),
      ]);
      // 3. settings
      if (JSON.stringify(live.settings) !== JSON.stringify(base.settings)) {
        await apiSaveSettings(live.settings);
      }
      lastSyncedRef.current = live;
      setSaveStatus("saved");
      setLastSavedAt(new Date().toISOString());
    } catch (e) {
      console.error("Sync failed:", e);
      setSaveStatus("error");
    } finally {
      syncingRef.current = false;
    }
  }

  // Debounced auto-sync whenever data changes (skipped until initial load completes)
  useEffect(() => {
    liveRef.current = {
      streams, students, teachers, subjects, exams, results, users,
      settings: { lang, cbeGrades, extraGrades },
    };
    if (!hydratedRef.current) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(syncToServer, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, students, teachers, subjects, exams, results, users, lang, cbeGrades, extraGrades]);

  const manualBackupDownload = () => {
    downloadJSON(`skbzs-sms-backup-${nowStamp()}.json`, { version: 1, savedAt: new Date().toISOString(), data: buildSnapshot() });
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
    setStreams(INITIAL_STREAMS.map(s => ({ ...s })));
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
      { key: "dashboard",    Icon: LayoutGrid,      label: t.nav.dashboard,     roles: ["admin","registrar","teacher","examOfficer","viewer"] },
      { key: "students",     Icon: UsersIcon,       label: t.nav.students,      roles: ["admin","registrar"] },
      { key: "classlists",   Icon: ClipboardList,   label: t.nav.classlists,    roles: ["admin","registrar","teacher","examOfficer"] },
      { key: "teachers",     Icon: GraduationCap,   label: t.nav.teachers,      roles: ["admin","registrar"] },
      { key: "subjects",     Icon: BookOpen,        label: t.nav.subjects,      roles: ["admin","registrar"] },
      { key: "classes",      Icon: Tags,            label: t.nav.classes,       roles: ["admin","registrar"] },
      { key: "gradeSettings",Icon: Settings,        label: t.nav.gradeSettings, roles: ["admin"] },
      { key: "exams",        Icon: FileText,        label: t.nav.exams,         roles: ["admin","examOfficer"] },
      { key: "results",      Icon: FileSpreadsheet, label: t.nav.results,       roles: ["admin","teacher","examOfficer"] },
      { key: "reports",      Icon: ScrollText,      label: t.nav.reports,       roles: ["admin","registrar","teacher","examOfficer","viewer"] },
      { key: "users",        Icon: ShieldCheck,     label: t.nav.users,         roles: ["admin"] },
      { key: "backup",       Icon: Database,        label: t.nav.backup,        roles: ["admin"] },
      { key: "myResults",    Icon: ScrollText,      label: t.nav.myResults,     roles: ["parent"] },
    ];
    return all.filter(item => item.roles.includes(role));
  };


  const splash = (content) => (
    <div
      dir={dir}
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-3.5 bg-background p-5 text-center text-primary"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="School logo" className="size-16 object-contain" />
      {content}
    </div>
  );

  // 1. Session check → 2. login → 3. database bootstrap → 4. the app.
  if (!authChecked) return splash(<p className="font-semibold">Loading…</p>);

  if (!currentUser) {
    return (
      <LoginScreen
        t={t} dir={dir} lang={lang} setLang={setLang}
        setCurrentUser={setCurrentUser} setPage={setPage}
      />
    );
  }

  if (!dataLoaded) {
    return splash(loadError ? (
      <>
        <p className="font-bold">Could not reach the database</p>
        <p className="max-w-[380px] text-sm text-muted-foreground">{loadError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </>
    ) : (
      <p className="font-semibold">Loading…</p>
    ));
  }

  const navItems = navItemsFor(currentUser.role);
  const pageMap = {
    dashboard: <Dashboard t={t} lang={lang} students={students} teachers={teachers} subjects={subjects} exams={exams} results={results} cbe={cbe} streamsFor={streamsFor} setPage={setPage} />,
    students: <Students t={t} lang={lang} students={students} setStudents={setStudents} gradesFor={gradesFor} streamsFor={streamsFor} showToast={showToast} showConfirm={showConfirm} />,
    teachers: <Teachers t={t} teachers={teachers} setTeachers={setTeachers} subjects={subjects} streamsFor={streamsFor} showToast={showToast} showConfirm={showConfirm} />,
    subjects: <Subjects t={t} subjects={subjects} setSubjects={setSubjects} showToast={showToast} showConfirm={showConfirm} />,
    classes: <ClassesStreams t={t} lang={lang} streams={streams} setStreams={setStreams} students={students} setStudents={setStudents} gradesFor={gradesFor} showToast={showToast} showConfirm={showConfirm} />,
    exams: <Exams t={t} exams={exams} setExams={setExams} gradesFor={gradesFor} showToast={showToast} showConfirm={showConfirm} />,
    results: <Results t={t} exams={exams} results={results} setResults={setResults} students={students} subjects={subjects} gradesFor={gradesFor} streamsFor={streamsFor} cbe={cbe} showToast={showToast} showConfirm={showConfirm} />,
    reports: <Reports t={t} lang={lang} students={students} exams={exams} subjects={subjects} results={results} gradesFor={gradesFor} streamsFor={streamsFor} cbe={cbe} showToast={showToast} />,
    users: <Users t={t} lang={lang} users={users} setUsers={setUsers} students={students} teachers={teachers} showToast={showToast} showConfirm={showConfirm} />,
    myResults: <ParentPortal t={t} lang={lang} students={students} subjects={subjects} exams={exams} results={results} cbe={cbe} currentUser={currentUser} showToast={showToast} />,
    backup: <DataBackup t={t} lang={lang} students={students} teachers={teachers} subjects={subjects} exams={exams} results={results} users={users} cbe={cbe} saveStatus={saveStatus} lastSavedAt={lastSavedAt} manualBackupDownload={manualBackupDownload} restoreFromBackupFile={restoreFromBackupFile} resetAllData={resetAllData} showConfirm={showConfirm} />,
    classlists: <ClassLists t={t} lang={lang} students={students} exams={exams} results={results} gradesFor={gradesFor} streamsFor={streamsFor} cbe={cbe} />,
    gradeSettings: <GradeSettings t={t} cbeGrades={cbeGrades} setCbeGrades={setCbeGrades} extraGrades={extraGrades} setExtraGrades={setExtraGrades} gradesForLevel={gradesForLevel} students={students} showToast={showToast} showConfirm={showConfirm} />,
  };
  const activePage = navItems.find(n => n.key === page) ? page : navItems[0]?.key;

  const handleLogout = () => {
    apiLogout().catch(() => {}); // clear the session cookie server-side
    setCurrentUser(null);
    setPage("dashboard");
  };

  const activeItem = navItems.find(n => n.key === activePage);

  return (
    <SidebarProvider dir={dir} className="h-[100dvh] min-h-0 overflow-hidden">
      <AppSidebar
        navItems={navItems} activePage={activePage} onNavigate={setPage}
        lang={lang} setLang={setLang} t={t} dir={dir}
      />

      <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="print-hide flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card px-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ms-1" />
            <Separator orientation="vertical" className="me-1 hidden h-5 md:block" />
            <h1 className="truncate text-[15px] font-bold text-primary md:text-lg">
              {activeItem?.label}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-3.5">
            {currentUser.role === "admin" && (
              <button
                type="button"
                onClick={() => setPage("backup")}
                title={t.backup.title}
                className={cn(
                  "flex items-center gap-1.5 rounded-full bg-muted px-2 py-1.5 text-[11px] md:px-2.5",
                  saveStatus === "error" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-[7px] shrink-0 rounded-full",
                    saveStatus === "saving" ? "bg-amber-500"
                      : saveStatus === "error" ? "bg-destructive" : "bg-emerald-600",
                  )}
                />
                {/* The dot carries the meaning on mobile; text returns at md. */}
                <span className="hidden md:inline">
                  {saveStatus === "saving" ? t.backup.statusSaving
                    : saveStatus === "error" ? t.backup.statusError : t.backup.statusSaved}
                </span>
              </button>
            )}

            <p className="hidden text-sm text-muted-foreground lg:block">
              {new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-KE", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>

            <div className="flex items-center gap-2">
              <Avatar className="size-8 md:size-9">
                <AvatarFallback className="bg-primary text-sm font-extrabold text-gold">
                  {currentUser.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight md:block">
                <p className="text-[13px] font-bold">{currentUser.fullName}</p>
                <Badge
                  variant="secondary"
                  className={cn("px-2 py-0 text-[10px]", ROLE_BADGE[currentUser.role] || ROLE_BADGE.viewer)}
                >
                  {t.users.roles[currentUser.role]}
                </Badge>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title={t.login.logout}
              aria-label={t.login.logout}
            >
              <LogOut className="size-4" />
              <span className="hidden md:inline">{t.login.logout}</span>
            </Button>
          </div>
        </header>

        {/* The only scroll container: keeps the shell fixed and lets wide tables
            scroll inside their own cards rather than moving the whole page. */}
        <div className="print-area flex-1 overflow-y-auto overflow-x-auto p-3.5 md:p-6">
          {pageMap[activePage] || pageMap.dashboard}
        </div>
      </SidebarInset>

      <ConfirmDialog dialog={confirmDialog} onCancel={closeConfirm} />
    </SidebarProvider>
  );
}
