"use client";
import { useRef } from "react";
import {
  BookOpen, ClipboardList, Download, FileSpreadsheet, FolderDown, GraduationCap,
  Package, RefreshCw, ShieldCheck, TriangleAlert, Trash2, Upload, Users as UsersIcon,
} from "lucide-react";
import { downloadWorkbook, nowStamp } from "../../_lib/storage";
import PageHeader from "../PageHeader";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  saving: { badge: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  saved: { badge: "bg-green-100 text-green-800", dot: "bg-emerald-600" },
  error: { badge: "bg-red-100 text-red-800", dot: "bg-destructive" },
  idle: { badge: "bg-neutral-100 text-neutral-700", dot: "bg-neutral-400" },
};

// Data & backup view, extracted from App() in index.jsx.
export default function DataBackup({
  t, lang, students, teachers, subjects, exams, results, users, cbe,
  saveStatus, lastSavedAt, manualBackupDownload, restoreFromBackupFile, resetAllData, showConfirm,
}) {
  const restoreFileRef = useRef();

  const statusKey = STATUS_STYLE[saveStatus] ? saveStatus : "idle";
  const statusLabel = {
    saving: t.backup.statusSaving, saved: t.backup.statusSaved,
    error: t.backup.statusError, idle: t.backup.statusIdle,
  }[statusKey];

  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Capture before clearing the input, or the File reference is lost.
    const captured = file;
    e.target.value = "";
    showConfirm(t.backup.restoreConfirm, () => restoreFromBackupFile(captured), {
      danger: true, subMessage: t.backup.restoreDesc,
    });
  };

  // Wiping every record is double-confirmed on purpose.
  const handleReset = () => showConfirm(t.backup.resetConfirm, () => {
    showConfirm(t.backup.resetConfirm2, resetAllData, { danger: true });
  }, { danger: true, subMessage: t.backup.dangerDesc });

  const studentRows = () => students.map(s => ({
    AdmNo: s.admNo, Name: s.name, Level: t.levels[s.level], Grade: s.grade,
    Stream: s.stream, Gender: s.gender, DOB: s.dob, Parent: s.parent, Phone: s.phone,
  }));
  const teacherRows = () => teachers.map(tc => ({
    StaffID: tc.staffId, Name: tc.name, Email: tc.email, Phone: tc.phone,
    Subjects: tc.subjects.join("; "), Classes: tc.classes.join("; "),
  }));
  const subjectRows = () => subjects.map(s => ({
    Code: s.code, Name: s.name, Category: s.category,
    Levels: (s.levels || []).map(l => t.levels[l]).join("; "), Description: s.description,
  }));
  const examRows = () => exams.map(e => ({
    Name: e.examName, Level: t.levels[e.level], Term: e.term, Year: e.year,
    MaxScore: e.maxScore, PassMark: e.passMark, Weight: e.weight,
    Grades: e.grades.join("; "), Status: e.status,
  }));
  const resultRows = () => results.map(r => {
    const stu = students.find(s => s.id === r.studentId);
    const sub = subjects.find(s => s.id === r.subjectId);
    const exam = exams.find(e => e.id === r.examId);
    const level = exam ? cbe(r.score, exam.maxScore) : null;
    return {
      AdmNo: stu?.admNo || "", Student: stu?.name || "", Level: stu ? t.levels[stu.level] : "",
      Grade: stu?.grade || "", Stream: stu?.stream || "", Exam: exam?.examName || "",
      Subject: sub?.name || "", Score: r.score, MaxScore: exam?.maxScore || "",
      CBCLevel: level?.code || "",
    };
  });
  const userRows = () => users.map(u => ({
    FullName: u.fullName, Username: u.username, Email: u.email,
    Role: t.users.roles[u.role], Status: u.status,
  }));

  const exports = [
    { label: t.backup.exportStudents, icon: UsersIcon, fn: () => downloadWorkbook(`students-${nowStamp()}.xlsx`, [{ name: "Students", rows: studentRows() }]) },
    { label: t.backup.exportTeachers, icon: GraduationCap, fn: () => downloadWorkbook(`teachers-${nowStamp()}.xlsx`, [{ name: "Teachers", rows: teacherRows() }]) },
    { label: t.backup.exportSubjects, icon: BookOpen, fn: () => downloadWorkbook(`subjects-${nowStamp()}.xlsx`, [{ name: "Subjects", rows: subjectRows() }]) },
    { label: t.backup.exportExams, icon: ClipboardList, fn: () => downloadWorkbook(`exams-${nowStamp()}.xlsx`, [{ name: "Exams", rows: examRows() }]) },
    { label: t.backup.exportResults, icon: FileSpreadsheet, fn: () => downloadWorkbook(`results-${nowStamp()}.xlsx`, [{ name: "Results", rows: resultRows() }]) },
    { label: t.backup.exportUsers, icon: ShieldCheck, fn: () => downloadWorkbook(`users-${nowStamp()}.xlsx`, [{ name: "Users", rows: userRows() }]) },
  ];

  const exportAll = () => downloadWorkbook(`skbzs-sms-full-export-${nowStamp()}.xlsx`, [
    { name: "Students", rows: studentRows() },
    { name: "Teachers", rows: teacherRows() },
    { name: "Subjects", rows: subjectRows() },
    { name: "Exams", rows: examRows() },
    { name: "Results", rows: resultRows() },
    { name: "Users", rows: userRows() },
  ]);

  const fmtDate = (iso) => {
    if (!iso) return t.backup.never;
    try {
      return new Date(iso).toLocaleString(lang === "ar" ? "ar-EG" : "en-KE", {
        dateStyle: "medium", timeStyle: "short",
      });
    } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t.backup.title} description={t.backup.subtitle} />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-bold text-primary">{t.backup.autosaveTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.backup.autosaveDesc}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t.backup.lastSaved}: <strong>{fmtDate(lastSavedAt)}</strong>
            </p>
          </div>
          <Badge variant="secondary" className={cn("gap-1.5 py-1", STATUS_STYLE[statusKey].badge)}>
            <span aria-hidden="true" className={cn("size-[7px] rounded-full", STATUS_STYLE[statusKey].dot)} />
            {statusLabel}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Package className="size-4" aria-hidden="true" />
              {t.backup.backupTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col">
            <p className="mb-3.5 text-xs leading-relaxed text-muted-foreground">{t.backup.backupDesc}</p>
            <Button className="mt-auto w-full" onClick={manualBackupDownload}>
              <Download className="size-4" aria-hidden="true" />
              {t.backup.downloadBackup}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <RefreshCw className="size-4" aria-hidden="true" />
              {t.backup.restoreTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col">
            <p className="mb-3.5 text-xs leading-relaxed text-muted-foreground">{t.backup.restoreDesc}</p>
            <Button variant="secondary" className="mt-auto w-full" onClick={() => restoreFileRef.current.click()}>
              <Upload className="size-4" aria-hidden="true" />
              {t.backup.restoreBtn}
            </Button>
            <input
              ref={restoreFileRef} type="file" accept=".json,application/json"
              className="hidden" onChange={handleRestoreFile}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            {t.backup.exportTitle}
          </CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">{t.backup.exportDesc}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {exports.map(({ label, icon: Icon, fn }) => (
              <Button key={label} variant="secondary" className="justify-start" onClick={fn}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>
          <Button className="w-full bg-gold text-gold-foreground hover:bg-gold/90" onClick={exportAll}>
            <FolderDown className="size-4" aria-hidden="true" />
            {t.backup.exportAll}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            {t.backup.dangerTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3.5 text-xs leading-relaxed text-destructive">{t.backup.dangerDesc}</p>
          <Button variant="destructive" onClick={handleReset}>
            <Trash2 className="size-4" aria-hidden="true" />
            {t.backup.resetBtn}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
