"use client";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Check, FileDown, FolderOpen, Ruler, Save, Trash2, TriangleAlert, X,
} from "lucide-react";
import { uid, downloadWorkbook, nowStamp } from "../../_lib/storage";
import CbcBadge from "../CbcBadge";
import LevelToggle from "../LevelToggle";
import PageHeader from "../PageHeader";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// base-ui Selects reject "" as an item value, so the "nothing selected" state
// is carried by a sentinel and mapped back to "" at the component boundary.
const NONE = "__none__";
const fromNone = (v) => (v === NONE ? "" : v);

const pctClass = (p) => (p >= 70 ? "text-green-800" : p >= 50 ? "text-amber-700" : "text-red-800");

// Results entry view, extracted from App() in index.jsx.
export default function Results({
  t, exams, results, setResults, students, subjects, gradesFor, streamsFor, cbe, showToast, showConfirm,
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
  const levelSubjects = subjects.filter(s => (s.levels || []).includes(selLevel));
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
      ? `Saved ${updates.length} score(s). Converted from /${limitVal} → /${examMax}.`
      : `Saved ${updates.length} score(s).`);
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

  // ── Shared derived values ──
  const examMax = exam?.maxScore || 100;
  const manualLimit = customLimit && +customLimit > 0 ? +customLimit : examMax;
  const manualIsCustom = manualLimit !== examMax;
  const importIsCustom = importLimit && +importLimit > 0 && +importLimit !== examMax;

  const examItems = { [NONE]: "— Select exam —", ...Object.fromEntries(examsForLevel.map(e => [e.id, `${e.examName} (${e.term} ${e.year})`])) };
  const subjectItems = { [NONE]: "— Select subject —", ...Object.fromEntries(levelSubjects.map(s => [s.id, `${s.name} (${s.code})`])) };
  const studentItems = { [NONE]: "— Select —", ...Object.fromEntries(students.map(s => [s.id, `${s.name} (${s.admNo})`])) };

  const dirtyCount = Object.keys(editScores).length;

  return (
    <div className="space-y-4">
      <PageHeader title={t.results.title} />

      <LevelToggle t={t} value={selLevel} onChange={onLevelChange} className="max-w-xs" />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 [&>div]:min-w-0">
          <div className="grid gap-1.5">
            <Label htmlFor="rs-exam">{t.results.selectExam}</Label>
            <Select items={examItems} value={selExam || NONE} onValueChange={v => setSelExam(fromNone(v))}>
              <SelectTrigger id="rs-exam" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Select exam —</SelectItem>
                {examsForLevel.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.examName} ({e.term} {e.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rs-grade">{t.results.selectGrade}</Label>
            <Select value={selGrade} onValueChange={setSelGrade}>
              <SelectTrigger id="rs-grade" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {gradesFor(selLevel).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rs-stream">{t.results.selectStream}</Label>
            <Select value={selStream} onValueChange={setSelStream}>
              <SelectTrigger id="rs-stream" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {streamsFor(selLevel).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={importTab} onValueChange={setImportTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="import">Import — Single Subject</TabsTrigger>
          <TabsTrigger value="bulkimport">Import — All Subjects</TabsTrigger>
          <TabsTrigger value="clear">Clear Results</TabsTrigger>
        </TabsList>

        {/* ── MANUAL ENTRY ── */}
        <TabsContent value="manual">
          <Card>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>div]:min-w-0">
                <div className="grid gap-1.5">
                  <Label htmlFor="rs-subject">{t.results.selectSubject}</Label>
                  <Select
                    items={subjectItems}
                    value={selSubject || NONE}
                    onValueChange={v => { setSelSubject(fromNone(v)); setCustomLimit(""); setEditScores({}); }}
                  >
                    <SelectTrigger id="rs-subject" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Select subject —</SelectItem>
                      {levelSubjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="rs-limit">
                    Score Limit
                    <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                      (blank = exam max: {examMax})
                    </span>
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id="rs-limit" type="number" min={1} className={cn("w-28", manualIsCustom && "border-amber-500 bg-amber-50")}
                      value={customLimit} placeholder={String(examMax)}
                      onChange={e => setCustomLimit(e.target.value)}
                    />
                    {customLimit && (
                      <Button
                        variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                        onClick={() => setCustomLimit("")} title="Clear — use exam max" aria-label="Clear score limit"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                <Button variant="secondary" onClick={downloadMarksTemplate} title="Download pre-filled score sheet for this class">
                  <FileDown className="size-4" aria-hidden="true" />
                  Score Sheet
                </Button>
              </div>

              {/* Active limit info banner */}
              {selExam && selSubject && manualIsCustom && (() => {
                const exampleRaw = Math.round(manualLimit * 0.8);
                const exampleStored = Math.round((exampleRaw / manualLimit) * examMax);
                return (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                    <Ruler className="size-4" aria-hidden="true" />
                    <AlertDescription className="text-amber-900">
                      <p>
                        <strong>Custom limit active:</strong> Enter scores out of <strong>{manualLimit}</strong>.
                        {" "}Formula: <code className="rounded bg-amber-200 px-1.5 py-0.5">stored = (score ÷ {manualLimit}) × {examMax}</code>
                      </p>
                      <p className="text-xs">
                        Example: {exampleRaw}/{manualLimit} → <strong>{exampleStored}/{examMax}</strong>
                        {" "}({Math.round((exampleRaw / manualLimit) * 100)}%) — CBC: {cbe(exampleStored, examMax).code}
                      </p>
                    </AlertDescription>
                  </Alert>
                );
              })()}

              {!selExam || !selSubject ? (
                <p className="py-8 text-center text-muted-foreground">Select an exam and subject above to enter scores.</p>
              ) : filteredStudents.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No students enrolled in {selGrade} Stream {selStream}.
                </p>
              ) : (() => {
                const toStored = (raw) => manualIsCustom
                  ? Math.round((+raw / manualLimit) * examMax * 100) / 100
                  : +raw;

                // What the teacher typed, on the entry scale. Stored values are
                // back-converted so re-opening a saved sheet shows the same numbers.
                const getDisplayScore = (stuId) => {
                  if (editScores[stuId] !== undefined) return editScores[stuId];
                  const r = results.find(r => r.examId === selExam && r.studentId === stuId && r.subjectId === selSubject);
                  if (!r) return "";
                  return manualIsCustom
                    ? String(Math.round((r.score / examMax) * manualLimit * 100) / 100)
                    : String(r.score);
                };

                const getStoredScore = (stuId) => {
                  const r = results.find(r => r.examId === selExam && r.studentId === stuId && r.subjectId === selSubject);
                  return r ? r.score : null;
                };

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <p className="text-xs text-muted-foreground">
                        {filteredStudents.length} students · Entry out of <strong>{manualLimit}</strong>
                        {manualIsCustom && <> → stored out of <strong>{examMax}</strong></>}
                      </p>
                      {dirtyCount > 0 && (
                        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900">
                          <TriangleAlert className="size-3" aria-hidden="true" />
                          {dirtyCount} unsaved change(s)
                        </Badge>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>{t.students.admNo}</TableHead>
                            <TableHead>{t.results.studentName}</TableHead>
                            <TableHead className="whitespace-nowrap">
                              Score <span className="font-normal text-muted-foreground">/ {manualLimit}</span>
                            </TableHead>
                            {manualIsCustom && (
                              <TableHead className="whitespace-nowrap">
                                Converted <span className="font-normal text-muted-foreground">/ {examMax}</span>
                              </TableHead>
                            )}
                            <TableHead>%</TableHead>
                            <TableHead>{t.results.cbeLevel}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStudents.map((s, i) => {
                            const displayVal = getDisplayScore(s.id);
                            const isDirty = editScores[s.id] !== undefined;

                            let storedVal = null, pct = null, cbeR = null;
                            if (displayVal !== "") {
                              storedVal = toStored(+displayVal);
                              pct = Math.round((storedVal / examMax) * 100);
                              cbeR = cbe(storedVal, examMax);
                            } else {
                              const existing = getStoredScore(s.id);
                              if (existing !== null) {
                                storedVal = existing;
                                pct = Math.round((existing / examMax) * 100);
                                cbeR = cbe(existing, examMax);
                              }
                            }

                            const rawNum = displayVal !== "" ? +displayVal : NaN;
                            const outOfRange = !isNaN(rawNum) && (rawNum < 0 || rawNum > manualLimit);

                            return (
                              <TableRow key={s.id} className={i % 2 === 1 ? "bg-muted/50" : undefined}>
                                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                <TableCell className="font-bold text-primary">{s.admNo}</TableCell>
                                <TableCell className="whitespace-nowrap">{s.name}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number" min={0} max={manualLimit} placeholder="—"
                                    aria-label={`Score for ${s.name}`}
                                    aria-invalid={outOfRange || undefined}
                                    className={cn("w-24",
                                      outOfRange ? "border-destructive bg-red-50"
                                        : isDirty ? "border-amber-500 bg-amber-50"
                                        : displayVal !== "" ? "bg-sky-50" : undefined)}
                                    value={displayVal}
                                    onChange={e => setEditScores(p => ({ ...p, [s.id]: e.target.value }))}
                                  />
                                  {outOfRange && (
                                    <p className="mt-0.5 text-[10px] text-destructive">Max: {manualLimit}</p>
                                  )}
                                </TableCell>
                                {manualIsCustom && (
                                  <TableCell className={cn("font-semibold tabular-nums", storedVal !== null ? "text-primary" : "text-muted-foreground")}>
                                    {storedVal !== null ? storedVal.toFixed(storedVal % 1 === 0 ? 0 : 1) : "—"}
                                  </TableCell>
                                )}
                                <TableCell className={cn("font-bold tabular-nums", pct !== null ? pctClass(pct) : "text-muted-foreground")}>
                                  {pct !== null ? `${pct}%` : "—"}
                                </TableCell>
                                <TableCell><CbcBadge level={cbeR} showLabel /></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {dirtyCount > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t pt-3.5">
                        <p className="text-xs text-muted-foreground">
                          {manualIsCustom && `Scores will be converted from /${manualLimit} → /${examMax} before saving.`}
                        </p>
                        <Button onClick={saveAll}>
                          <Save className="size-4" aria-hidden="true" />
                          Save {dirtyCount} Score(s)
                          {manualIsCustom && ` (converted from /${manualLimit})`}
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SINGLE SUBJECT IMPORT ── */}
        <TabsContent value="import">
          <Card>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div>
                <h3 className="text-[15px] font-bold text-primary">Import Marks — Single Subject</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Upload an Excel file with scores for <strong>one subject</strong>. Required columns:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">AdmNo</code> and{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">Score</code>{" "}
                  (or <code className="rounded bg-muted px-1.5 py-0.5">Marks</code>).
                </p>
              </div>

              <div className="grid items-end gap-4 sm:grid-cols-2 [&>div]:min-w-0">
                <div className="grid gap-1.5">
                  <Label htmlFor="imp-subject">Subject for this import</Label>
                  <Select items={subjectItems} value={selSubject || NONE} onValueChange={v => setSelSubject(fromNone(v))}>
                    <SelectTrigger id="imp-subject" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Select subject —</SelectItem>
                      {levelSubjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="imp-limit">
                    Score Limit
                    <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                      (blank = exam max: {examMax})
                    </span>
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id="imp-limit" type="number" min={1} className={cn("w-28", importIsCustom && "border-amber-500 bg-amber-50")}
                      value={importLimit} placeholder={String(examMax)}
                      onChange={e => setImportLimit(e.target.value)}
                    />
                    {importLimit && (
                      <Button
                        variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                        onClick={() => setImportLimit("")} title="Clear limit" aria-label="Clear score limit"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {importIsCustom && (() => {
                const lv = +importLimit;
                const ex1 = Math.round(lv * 0.5), ex2 = Math.round(lv * 0.8);
                return (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                    <Ruler className="size-4" aria-hidden="true" />
                    <AlertDescription className="text-amber-900">
                      <p>
                        <strong>Conversion active:</strong> Scores in the file are out of <strong>{lv}</strong> →
                        stored out of <strong>{examMax}</strong>.
                      </p>
                      <p className="text-xs">
                        Formula: <code className="rounded bg-amber-200 px-1.5 py-0.5">(score ÷ {lv}) × {examMax}</code>
                        {" · "}{ex1}/{lv} → <strong>{Math.round((ex1 / lv) * examMax)}/{examMax}</strong>
                        {" · "}{ex2}/{lv} → <strong>{Math.round((ex2 / lv) * examMax)}/{examMax}</strong>
                      </p>
                    </AlertDescription>
                  </Alert>
                );
              })()}

              <div className="flex flex-wrap gap-2.5">
                <Button onClick={() => importFileRef.current?.click()}>
                  <FolderOpen className="size-4" aria-hidden="true" />
                  Choose File (.xlsx)
                </Button>
                <Button variant="secondary" onClick={downloadMarksTemplate}>
                  <FileDown className="size-4" aria-hidden="true" />
                  Download Score Sheet Template
                </Button>
                <input
                  ref={importFileRef} type="file" className="hidden" onChange={handleSingleFile}
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
              </div>

              <div className="overflow-x-auto rounded-lg bg-muted p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Expected format</p>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow><TableHead>AdmNo</TableHead><TableHead>Name</TableHead><TableHead>Score</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {[["ADM001","Fatima Hassan","25"],["ADM002","Omar Khalid","22"],["ADM003","Aisha Mohamed","47"]].map(([a,n,s]) => (
                      <TableRow key={a}><TableCell>{a}</TableCell><TableCell>{n}</TableCell><TableCell>{s}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  The score column can also be named <code>Marks</code>, <code>Mark</code>, or the subject code/name
                  (auto-detected). If a score limit is set above, all scores in the file are converted automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BULK (ALL SUBJECTS) IMPORT ── */}
        <TabsContent value="bulkimport">
          <Card>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div>
                <h3 className="text-[15px] font-bold text-primary">Import Marks — All Subjects (Bulk)</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Upload one file with scores for <strong>multiple subjects</strong>. Use{" "}
                  <strong>subject codes</strong> (e.g. <code>QRT</code>, <code>ARB</code>) as column headers.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="bulk-limit">
                  Score Limit for all subjects
                  <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                    (applies to every subject column — blank = exam max: {examMax})
                  </span>
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="bulk-limit" type="number" min={1} className={cn("w-28", importIsCustom && "border-amber-500 bg-amber-50")}
                    value={importLimit} placeholder={String(examMax)}
                    onChange={e => setImportLimit(e.target.value)}
                  />
                  {importLimit && (
                    <Button
                      variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                      onClick={() => setImportLimit("")} aria-label="Clear score limit"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                  {importIsCustom && (
                    <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900">
                      <Ruler className="size-3" aria-hidden="true" />
                      {importLimit}/{examMax} conversion active
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button onClick={() => templateFileRef.current?.click()}>
                  <FolderOpen className="size-4" aria-hidden="true" />
                  Choose Bulk File (.xlsx)
                </Button>
                <Button variant="secondary" onClick={downloadBulkTemplate}>
                  <FileDown className="size-4" aria-hidden="true" />
                  Download Bulk Template
                </Button>
                <input
                  ref={templateFileRef} type="file" className="hidden" onChange={handleBulkFile}
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
              </div>

              <div className="overflow-x-auto rounded-lg bg-muted p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Expected format</p>
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>AdmNo</TableHead><TableHead>Name</TableHead>
                      {levelSubjects.slice(0, 4).map(s => <TableHead key={s.id}>{s.code}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[["ADM001","Fatima Hassan","87","72","94","65"],["ADM002","Omar Khalid","55","61","70","80"]].map(([a,n,...sc]) => (
                      <TableRow key={a}>
                        <TableCell>{a}</TableCell><TableCell>{n}</TableCell>
                        {sc.slice(0, levelSubjects.slice(0, 4).length).map((v, i) => <TableCell key={i}>{v}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  The subject codes shown are from your registered subjects. The bulk template download pre-fills all of them.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CLEAR RESULTS ── */}
        <TabsContent value="clear">
          <Card>
            <CardContent className="space-y-3 p-4 md:p-6">
              <div>
                <h3 className="text-[15px] font-bold text-primary">Clear / Delete Results</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Select what to delete. Deletions are permanent — download a backup first if needed.
                </p>
              </div>

              {(() => {
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
                  <div className="flex flex-col gap-3">
                    {/* By exam + subject */}
                    <section className="rounded-lg bg-muted p-4">
                      <p className="font-bold text-primary">By Subject</p>
                      <p className="mb-2.5 text-xs text-muted-foreground">
                        Delete all scores for one subject within the selected exam.{" "}
                        <strong>{subjectResults.length}</strong> record(s) match.
                      </p>
                      <div className="flex flex-wrap items-end gap-2.5">
                        <div className="grid min-w-[200px] flex-1 gap-1.5">
                          <Label htmlFor="del-subject">Subject</Label>
                          <Select items={subjectItems} value={selSubject || NONE} onValueChange={v => setSelSubject(fromNone(v))}>
                            <SelectTrigger id="del-subject" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>— Select —</SelectItem>
                              {levelSubjects.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="destructive"
                          disabled={!selExam || !selSubject || !subjectResults.length}
                          onClick={() => {
                            const subName = subjects.find(s => s.id === selSubject)?.name || selSubject;
                            const examName = exams.find(e => e.id === selExam)?.examName || selExam;
                            doDelete(`${subName} (${examName})`,
                              r => r.examId === selExam && r.subjectId === selSubject);
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete {subjectResults.length} Record(s)
                        </Button>
                      </div>
                    </section>

                    {/* By exam + class */}
                    <section className="rounded-lg bg-muted p-4">
                      <p className="font-bold text-primary">By Class</p>
                      <p className="mb-2.5 text-xs text-muted-foreground">
                        Delete all scores for an entire class (grade + stream) within the selected exam.{" "}
                        <strong>{classResults.length}</strong> record(s) match.
                      </p>
                      <div className="flex flex-wrap items-end gap-2.5">
                        <div className="grid gap-1.5">
                          <Label htmlFor="del-grade">Grade</Label>
                          <Select value={selGrade} onValueChange={setSelGrade}>
                            <SelectTrigger id="del-grade" className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {gradesFor(selLevel).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="del-stream">Stream</Label>
                          <Select value={selStream} onValueChange={setSelStream}>
                            <SelectTrigger id="del-stream" className="w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {streamsFor(selLevel).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="destructive"
                          disabled={!selExam || !classResults.length}
                          onClick={() => {
                            const examName = exams.find(e => e.id === selExam)?.examName || selExam;
                            doDelete(`${selGrade} Stream ${selStream} (${examName})`, r => {
                              const stu = students.find(s => s.id === r.studentId);
                              return r.examId === selExam && stu?.grade === selGrade && stu?.stream === selStream;
                            });
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete {classResults.length} Record(s)
                        </Button>
                      </div>
                    </section>

                    {/* By entire exam */}
                    <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <p className="font-bold text-destructive">Entire Exam</p>
                      <p className="mb-2.5 text-xs text-destructive">
                        Delete ALL results for the selected exam across every subject and class.{" "}
                        <strong>{examResults.length}</strong> record(s) will be deleted.
                      </p>
                      <Button
                        variant="destructive"
                        disabled={!selExam || !examResults.length}
                        onClick={() => {
                          const examName = exams.find(e => e.id === selExam)?.examName || selExam;
                          doDelete(`entire exam: ${examName}`, r => r.examId === selExam);
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete ALL {examResults.length} Result(s) for This Exam
                      </Button>
                    </section>

                    {/* By student */}
                    <section className="rounded-lg bg-muted p-4">
                      <p className="font-bold text-primary">By Student</p>
                      <p className="mb-2.5 text-xs text-muted-foreground">
                        Delete all results for one student across every exam and subject.
                        {delStuId && <> <strong>{stuResults.length}</strong> record(s) found.</>}
                      </p>
                      <div className="flex flex-wrap items-end gap-2.5">
                        <div className="grid min-w-[220px] flex-1 gap-1.5">
                          <Label htmlFor="del-student">Student</Label>
                          <Select items={studentItems} value={delStuId || NONE} onValueChange={v => setDelStuId(fromNone(v))}>
                            <SelectTrigger id="del-student" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
                            <SelectContent className="max-h-[280px]">
                              <SelectItem value={NONE}>— Select —</SelectItem>
                              {students.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.admNo})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="destructive"
                          disabled={!delStuId || !stuResults.length}
                          onClick={() => {
                            const stu = students.find(s => s.id === delStuId);
                            doDelete(`${stu?.name} (all exams)`, r => r.studentId === delStuId);
                            setDelStuId("");
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete {stuResults.length} Record(s)
                        </Button>
                      </div>
                    </section>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── IMPORT PREVIEW ── */}
      <Dialog open={Boolean(importPreview)} onOpenChange={(o) => { if (!o) setImportPreview(null); }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {importPreview?.isBulk ? "Bulk " : ""}Import Preview — {importPreview?.fileName}
            </DialogTitle>
            <DialogDescription>
              Nothing is written until you confirm. Existing scores for the same student and subject are overwritten.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-green-100 py-1 text-green-800">
              {importPreview?.matched.length} score(s) ready
            </Badge>
            {importPreview?.isBulk && (
              <Badge variant="secondary" className="bg-blue-100 py-1 text-blue-800">
                {[...new Set(importPreview.matched.map(m => m.subjectId))].length} subject(s) detected
              </Badge>
            )}
            {!importPreview?.isBulk && importPreview?.subjectId && (
              <Badge variant="secondary" className="bg-[#e8f0ed] py-1 text-primary">
                {subjects.find(s => s.id === importPreview.subjectId)?.name || "Unknown subject"}
              </Badge>
            )}
            {importPreview?.isCustom && (
              <Badge variant="secondary" className="gap-1 bg-amber-100 py-1 text-amber-900">
                <Ruler className="size-3" aria-hidden="true" />
                Converted: /{importPreview.limitVal} → /{importPreview.examMax}
              </Badge>
            )}
            {importPreview?.unmatched.length > 0 && (
              <Badge variant="secondary" className="bg-red-100 py-1 text-red-800">
                {importPreview.unmatched.length} row(s) skipped
              </Badge>
            )}
          </div>

          {importPreview?.unmatched.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Skipped:</strong>{" "}
              {importPreview.unmatched.map(u => `Row ${u.row}: ${u.admNo || u.name} — ${u.reason}`).join(" · ")}
            </div>
          )}

          <div className="max-h-[300px] overflow-auto rounded-lg border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Adm No</TableHead>
                  <TableHead>Student</TableHead>
                  {importPreview?.isBulk && <TableHead>Subject</TableHead>}
                  {importPreview?.isCustom && <TableHead>Raw / {importPreview.limitVal}</TableHead>}
                  <TableHead>{importPreview?.isCustom ? `Stored / ${importPreview.examMax}` : "Score"}</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>CBC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview?.matched.map((m, i) => {
                  const examObj = exams.find(e => e.id === importPreview.examId);
                  const cbeR = examObj ? cbe(+m.score, examObj.maxScore) : null;
                  const pct = examObj ? Math.round((+m.score / examObj.maxScore) * 100) : null;
                  const sub = importPreview.isBulk ? subjects.find(s => s.id === m.subjectId) : null;
                  return (
                    <TableRow key={i} className={i % 2 === 1 ? "bg-muted/50" : undefined}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-bold text-primary">{m.admNo}</TableCell>
                      <TableCell className="whitespace-nowrap">{m.name}</TableCell>
                      {importPreview.isBulk && (
                        <TableCell>
                          <Badge variant="secondary" className="bg-[#e8f0ed] text-primary">{sub?.code || "?"}</Badge>
                        </TableCell>
                      )}
                      {importPreview.isCustom && (
                        <TableCell className="tabular-nums text-muted-foreground">{m.rawScore}</TableCell>
                      )}
                      <TableCell className="font-bold tabular-nums text-primary">{m.score}</TableCell>
                      <TableCell className={cn("font-bold tabular-nums", pct !== null ? pctClass(pct) : "text-muted-foreground")}>
                        {pct !== null ? `${pct}%` : "—"}
                      </TableCell>
                      <TableCell><CbcBadge level={cbeR} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setImportPreview(null)}>Cancel</Button>
            <Button onClick={commitImport} disabled={!importPreview?.matched.length}>
              <Check className="size-4" aria-hidden="true" />
              Import {importPreview?.matched.length} Score(s)
              {importPreview?.isCustom && ` (converted from /${importPreview.limitVal})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
