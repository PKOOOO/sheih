"use client";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Check, FileDown, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { DEFAULT_GRADES } from "../../_lib/schoolStructure";
import { uid, downloadWorkbook, nowStamp } from "../../_lib/storage";
import LevelToggle from "../LevelToggle";
import PageHeader from "../PageHeader";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const LEVEL_BADGE = {
  junior: "bg-[#bee5eb] text-[#0c5460]",
  senior: "bg-[#e8f0ed] text-primary",
};

// Student management view, extracted from App() in index.jsx.
export default function Students({
  t, lang, students, setStudents, gradesFor, streamsFor, showToast, showConfirm,
}) {
  const blank = {
    name: "", level: "junior", grade: DEFAULT_GRADES.junior[0],
    stream: streamsFor("junior")[0] || "", gender: "Male",
    admNo: "", dob: "", parent: "", phone: "",
  };

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [form, setForm] = useState(blank);
  const [importPreview, setImportPreview] = useState(null);
  const fileRef = useRef();

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const q = search.trim().toLowerCase();
  const filtered = students.filter(s =>
    (filterLevel === "all" || s.level === filterLevel) &&
    (s.name.toLowerCase().includes(q) || s.admNo.toLowerCase().includes(q)));

  const openAdd = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditId(s.id); setShowForm(true); };
  const save = () => {
    if (!form.name || !form.admNo) return;
    if (editId) setStudents(p => p.map(s => s.id === editId ? { ...form, id: editId } : s));
    else setStudents(p => [...p, { ...form, id: uid() }]);
    setShowForm(false);
    showToast(t.saved);
  };
  const del = (id) => showConfirm(t.confirm, () => {
    setStudents(p => p.filter(s => s.id !== id));
    showToast(t.deleted);
  }, { danger: true });

  // Switching level invalidates the grade/stream picked from the previous one.
  const onLevelChange = (level) => setForm(p => ({
    ...p, level, grade: gradesFor(level)[0] || "", stream: streamsFor(level)[0] || "",
  }));

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        if (rows.length === 0) {
          showToast(lang === "ar" ? "الملف فارغ أو لا يحتوي على بيانات." : "File is empty or has no data rows.");
          return;
        }

        // Column names vary between offices, so each field accepts aliases.
        const mapped = [];
        const errors = [];
        rows.forEach((r, i) => {
          const name = String(r.Name || r.name || r["Student Name"] || r["Full Name"] || "").trim();
          if (!name) { errors.push(`Row ${i + 2}: Missing name`); return; }
          const grade = String(r.Grade || r.grade || r["Class"] || DEFAULT_GRADES.junior[0]).trim();
          const levelRaw = String(r.Level || r.level || r["School Level"] || "").toLowerCase();
          const level = levelRaw.includes("senior") || DEFAULT_GRADES.senior.includes(grade) ? "senior" : "junior";
          const stream = String(r.Stream || r.stream || r["Class Stream"] || streamsFor(level)[0] || "").trim();
          const gender = String(r.Gender || r.gender || r["Sex"] || "Male").trim();
          const admNo = String(r.AdmNo || r["Adm No"] || r["Admission No"] || r["Admission Number"] || r.admno || `AUTO-${uid().slice(0, 5).toUpperCase()}`).trim();
          mapped.push({
            id: uid(), name, level, grade, stream,
            gender: gender.toLowerCase().startsWith("f") ? "Female" : "Male",
            admNo,
            dob: String(r.DOB || r["Date of Birth"] || r.dob || "").trim(),
            parent: String(r.Parent || r["Parent/Guardian"] || r.parent || "").trim(),
            phone: String(r.Phone || r.phone || r["Phone No"] || "").trim(),
          });
        });

        setImportPreview({ rows, mapped, errors, fileName: file.name });
      } catch (err) {
        showToast(lang === "ar" ? "فشل قراءة الملف." : `Failed to read file. Make sure it is a valid Excel file. (${err.message})`);
      }
    };
    reader.onerror = () => showToast(lang === "ar" ? "خطأ في قراءة الملف." : "Error reading file.");
    reader.readAsArrayBuffer(file);
    // Reset the input AFTER scheduling the read, so re-picking the same file works.
    setTimeout(() => { e.target.value = ""; }, 100);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    setStudents(p => [...p, ...importPreview.mapped]);
    showToast(t.importSuccess(importPreview.mapped.length));
    setImportPreview(null);
  };

  const downloadTemplate = () => downloadWorkbook(`student-import-template-${nowStamp()}.xlsx`, [{
    name: "Students",
    rows: [
      { Name: "Fatima Hassan", AdmNo: "ADM001", Grade: "Grade 7", Stream: "R", Gender: "Female", Level: "Junior", DOB: "2012-03-14", Parent: "Hassan Omar", Phone: "0712345678" },
      { Name: "Yusuf Abdi", AdmNo: "ADM002", Grade: "Grade 10", Stream: "A", Gender: "Male", Level: "Senior", DOB: "2009-05-18", Parent: "Abdi Nur", Phone: "0745678901" },
    ],
  }]);

  const levelFilters = [
    { key: "all", label: t.students.allLevels },
    { key: "junior", label: t.dashboard.junior },
    { key: "senior", label: t.dashboard.senior },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t.students.title}>
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="w-[190px] ps-8"
            placeholder={t.students.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t.students.search}
          />
        </div>
        <Button variant="secondary" onClick={() => fileRef.current.click()}>
          <Upload className="size-4" aria-hidden="true" />
          {t.students.importExcel}
        </Button>
        <Button variant="secondary" onClick={downloadTemplate}>
          <FileDown className="size-4" aria-hidden="true" />
          Template
        </Button>
        <input
          ref={fileRef} type="file" className="hidden" onChange={handleFileSelect}
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        />
        <Button onClick={openAdd}>
          <Plus className="size-4" aria-hidden="true" />
          {t.students.addStudent}
        </Button>
      </PageHeader>

      <div role="radiogroup" aria-label={t.students.level} className="flex flex-wrap gap-2">
        {levelFilters.map(f => (
          <Button
            key={f.key}
            type="button" role="radio" aria-checked={filterLevel === f.key}
            variant={filterLevel === f.key ? "default" : "secondary"}
            size="sm"
            className={cn("rounded-full", filterLevel === "junior" && f.key === "junior" && "bg-[#0c5460] hover:bg-[#0c5460]/90")}
            onClick={() => setFilterLevel(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <span className="ms-auto self-center text-sm text-muted-foreground">
          {filtered.length} / {students.length}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <p className="border-b p-3 text-xs text-muted-foreground">
            {t.students.importHint} —{" "}
            <button onClick={downloadTemplate} className="font-bold text-primary underline underline-offset-2">
              Download Template
            </button>
          </p>
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t.students.noStudents}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[t.students.admNo, t.students.name, t.students.level, t.students.grade,
                      t.students.stream, t.students.gender, t.actions]
                      .map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold text-primary">{s.admNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback className="bg-primary text-xs font-bold text-gold">
                              {s.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="whitespace-nowrap">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={LEVEL_BADGE[s.level]}>{t.levels[s.level]}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{s.grade}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-[#e8f0ed] text-primary">{s.stream}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={s.gender === "Male" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}
                        >
                          {s.gender === "Male" ? "♂" : "♀"}{" "}
                          {lang === "ar" ? (s.gender === "Male" ? "ذكر" : "أنثى") : s.gender}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(s)} aria-label={`${t.students.edit}: ${s.name}`}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => del(s.id)} aria-label={`Delete ${s.name}`}>
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / edit ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editId ? t.students.edit : t.students.addStudent}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>{t.students.level}</Label>
              <LevelToggle t={t} value={form.level} onChange={onLevelChange} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="st-name">{t.students.name}</Label>
                <Input id="st-name" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-adm">{t.students.admNo}</Label>
                <Input id="st-adm" value={form.admNo} onChange={e => set("admNo", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-grade">{t.students.grade}</Label>
                <Select value={form.grade} onValueChange={v => set("grade", v)}>
                  <SelectTrigger id="st-grade" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {gradesFor(form.level).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-stream">{t.students.stream}</Label>
                <Select value={form.stream} onValueChange={v => set("stream", v)}>
                  <SelectTrigger id="st-stream" className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {streamsFor(form.level).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-gender">{t.students.gender}</Label>
                <Select
                  items={{ Male: t.students.male, Female: t.students.female }}
                  value={form.gender}
                  onValueChange={v => set("gender", v)}
                >
                  <SelectTrigger id="st-gender" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{t.students.male}</SelectItem>
                    <SelectItem value="Female">{t.students.female}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-dob">{t.students.dob}</Label>
                <Input id="st-dob" type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-parent">{t.students.parent}</Label>
                <Input id="st-parent" value={form.parent} onChange={e => set("parent", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-phone">{t.students.phone}</Label>
                <Input id="st-phone" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t.students.cancel}</Button>
            <Button onClick={save} disabled={!form.name || !form.admNo}>{t.students.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import preview ── */}
      <Dialog open={Boolean(importPreview)} onOpenChange={(o) => { if (!o) setImportPreview(null); }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Import Preview — {importPreview?.fileName}</DialogTitle>
            <DialogDescription>
              Review the rows below before adding them. Nothing is saved until you confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-green-100 py-1 text-green-800">
              {importPreview?.mapped.length} students ready to import
            </Badge>
            {importPreview?.errors.length > 0 && (
              <Badge variant="secondary" className="bg-red-100 py-1 text-red-800">
                {importPreview.errors.length} rows skipped
              </Badge>
            )}
          </div>

          {importPreview?.errors.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Skipped rows:</strong> {importPreview.errors.join(" · ")}
            </div>
          )}

          <div className="max-h-[280px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {["#", "Name", "Adm No", "Level", "Grade", "Stream", "Gender", "Parent"]
                    .map(h => <TableHead key={h} className="whitespace-nowrap text-[11px]">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview?.mapped.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                    <TableCell>{s.admNo}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={LEVEL_BADGE[s.level]}>{t.levels[s.level]}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{s.grade}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-[#e8f0ed] text-primary">{s.stream}</Badge>
                    </TableCell>
                    <TableCell>{s.gender}</TableCell>
                    <TableCell>{s.parent || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <strong>Expected columns:</strong> Name, AdmNo, Grade, Stream, Gender, Level, DOB, Parent, Phone.
            Column names are flexible — &quot;Full Name&quot;, &quot;Student Name&quot; and &quot;Class&quot; also work.{" "}
            <button onClick={downloadTemplate} className="font-bold text-primary underline underline-offset-2">
              Download the template
            </button>{" "}
            for the exact format.
          </p>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setImportPreview(null)}>Cancel</Button>
            <Button onClick={confirmImport} disabled={!importPreview?.mapped.length}>
              <Check className="size-4" aria-hidden="true" />
              Import {importPreview?.mapped.length} Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
