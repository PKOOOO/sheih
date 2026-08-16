"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Printer } from "lucide-react";
import { LOGO_SRC } from "../../_lib/logo";
import { SCHOOL_NAMES } from "../../_lib/i18n";
import { downloadWorkbook, nowStamp, iframePrint } from "../../_lib/storage";
import CbcBadge from "../CbcBadge";
import LevelToggle from "../LevelToggle";
import PageHeader from "../PageHeader";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const ROSTER_ONLY = "__roster__";

// Hoisted to module scope: a component declared inside the render body is a
// new type on every render, so React remounts it and resets its state.
function SortIcon({ active, dir }) {
  if (!active) return <ChevronsUpDown className="size-3 opacity-50" aria-hidden="true" />;
  return dir === "asc"
    ? <ArrowUp className="size-3" aria-hidden="true" />
    : <ArrowDown className="size-3" aria-hidden="true" />;
}

// Printable class list / roster view, extracted from App() in index.jsx.
export default function ClassLists({
  t, lang, students, exams, results, gradesFor, streamsFor, cbe,
}) {
  const [selLevel, setSelLevel] = useState("junior");
  const [selGrade, setSelGrade] = useState(gradesFor("junior")[0] || "");
  const [selStream, setSelStream] = useState(streamsFor("junior")[0] || "");
  const [selExam, setSelExam] = useState(ROSTER_ONLY);
  const [sortBy, setSortBy] = useState("name"); // name | admNo | score
  const [sortDir, setSortDir] = useState("asc");

  const examsForLevel = exams.filter(e => e.level === selLevel);

  const onLevelChange = (lv) => {
    setSelLevel(lv);
    setSelGrade(gradesFor(lv)[0] || "");
    setSelStream(streamsFor(lv)[0] || "");
    setSelExam(ROSTER_ONLY);
  };

  const exam = exams.find(e => e.id === selExam);

  const enriched = students
    .filter(s => s.level === selLevel && s.grade === selGrade && s.stream === selStream)
    .map(s => {
      const stuResults = exam ? results.filter(r => r.examId === exam.id && r.studentId === s.id) : [];
      const avg = stuResults.length
        ? Math.round(stuResults.reduce((a, r) => a + r.score, 0) / stuResults.length)
        : null;
      return { ...s, avg, overall: avg !== null && exam ? cbe(avg, exam.maxScore) : null };
    });

  const sorted = [...enriched].sort((a, b) => {
    let va, vb;
    if (sortBy === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
    else if (sortBy === "admNo") { va = a.admNo; vb = b.admNo; }
    else { va = a.avg ?? -1; vb = b.avg ?? -1; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  };

  const schoolName = SCHOOL_NAMES[selLevel][lang];
  const classLabel = `${selGrade} — Stream ${selStream}`;

  const classAverage = (() => {
    const scored = sorted.filter(s => s.avg !== null);
    if (!exam || scored.length === 0) return null;
    const avg = Math.round(scored.reduce((a, s) => a + s.avg, 0) / scored.length);
    return { avg, level: cbe(avg, exam.maxScore) };
  })();

  // Built as standalone HTML rather than copying the on-screen markup: the
  // printed roster needs its own column set, zebra striping and signature
  // block, and must not inherit the app chrome.
  const printList = () => {
    const hasExam = Boolean(exam);
    const dateStr = new Date().toLocaleDateString("en-KE", { dateStyle: "full" });

    const headerCols = hasExam
      ? `<th>#</th><th>Adm No</th><th>Student Name</th><th>Gender</th><th>Avg Score / ${exam.maxScore}</th><th>CBC Level</th>`
      : `<th>#</th><th>Adm No</th><th>Student Name</th><th>Gender</th>`;

    const bodyRows = sorted.map((s, i) => {
      const examCells = hasExam
        ? `<td style="font-weight:700">${s.avg !== null ? `${s.avg} / ${exam.maxScore}` : "—"}</td>
           <td>${s.overall ? `<span style="background:${s.overall.bg};color:${s.overall.color};padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px">${s.overall.code} — ${s.overall.label}</span>` : "—"}</td>`
        : "";
      return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8f5ee"}">
        <td style="color:#6b7280;font-weight:700">${i + 1}</td>
        <td style="font-weight:700;color:#1c3d2e">${s.admNo}</td>
        <td>${s.name}</td>
        <td>${s.gender === "Male" ? "♂" : "♀"} ${s.gender}</td>
        ${examCells}
      </tr>`;
    }).join("");

    let footerText = `Total: ${sorted.length} students`;
    if (classAverage) {
      footerText += ` · Class Average: ${classAverage.avg}/${exam.maxScore} · ${classAverage.level.code} (${classAverage.level.label})`;
    }

    iframePrint(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Class List — ${selGrade} Stream ${selStream}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 28px; background: #fff; }
    .header { text-align: center; border-bottom: 3px solid #c9a84c; padding-bottom: 14px; margin-bottom: 18px; }
    .header img { width: 70px; height: 70px; object-fit: contain; margin: 0 auto 8px; display: block; }
    .header h1 { font-size: 15px; font-weight: 800; color: #1c3d2e; margin: 4px 0; }
    .header p { font-size: 12px; color: #6b7280; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { text-align: left; padding: 8px 10px; background: #f5f0e8; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid #e2d9c8; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2d9c8; vertical-align: middle; }
    tfoot td { border-top: 2px solid #e2d9c8; border-bottom: none; font-weight: 600; font-size: 12px; color: #6b7280; padding: 10px; }
    .signatures { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="${LOGO_SRC}" alt="School Logo"/>
    <h1>${schoolName}</h1>
    <p>Class List — ${classLabel}${hasExam ? ` · ${exam.examName} (${exam.term} ${exam.year})` : " · Student Roster"}</p>
    <p>Generated: ${dateStr}</p>
  </div>
  <table>
    <thead><tr>${headerCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr><td colspan="${hasExam ? 6 : 4}">${footerText}</td></tr></tfoot>
  </table>
  <div class="signatures">
    <div>Class Teacher: _______________________</div>
    <div>HOD Signature: _______________________</div>
    <div>Principal: ___________________________</div>
  </div>
</body>
</html>`);
  };

  const downloadList = () => downloadWorkbook(
    `classlist-${selGrade}${selStream}-${nowStamp()}.xlsx`,
    [{
      name: `${selGrade} ${selStream}`,
      rows: sorted.map((s, i) => ({
        Rank: i + 1, AdmNo: s.admNo, Name: s.name, Gender: s.gender,
        Grade: s.grade, Stream: s.stream,
        ...(exam ? { Average: s.avg ?? "", CBCLevel: s.overall?.code ?? "" } : {}),
      })),
    }],
  );

  const examItems = {
    [ROSTER_ONLY]: "— Roster only —",
    ...Object.fromEntries(examsForLevel.map(e => [e.id, `${e.examName} (${e.term} ${e.year})`])),
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t.nav.classlists}>
        <Button variant="secondary" onClick={downloadList} disabled={sorted.length === 0}>
          <Download className="size-4" aria-hidden="true" />
          Download Excel
        </Button>
        <Button
          onClick={printList}
          disabled={sorted.length === 0}
          className="bg-gold text-gold-foreground hover:bg-gold/90"
        >
          <Printer className="size-4" aria-hidden="true" />
          Print
        </Button>
      </PageHeader>

      <Card className="print-hide">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label>School Level</Label>
            <LevelToggle t={t} value={selLevel} onChange={onLevelChange} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-grade">Grade</Label>
            <Select value={selGrade} onValueChange={setSelGrade}>
              <SelectTrigger id="cl-grade" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {gradesFor(selLevel).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-stream">Stream</Label>
            <Select value={selStream} onValueChange={setSelStream}>
              <SelectTrigger id="cl-stream" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {streamsFor(selLevel).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-exam">Exam (optional — for scores)</Label>
            <Select items={examItems} value={selExam} onValueChange={setSelExam}>
              <SelectTrigger id="cl-exam" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ROSTER_ONLY}>— Roster only —</SelectItem>
                {examsForLevel.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.examName} ({e.term} {e.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 md:p-6">
          <header className="mb-5 border-b-[3px] border-gold pb-3.5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="School logo" className="mx-auto mb-1.5 size-15 object-contain" />
            <p className="text-[15px] font-extrabold text-primary">{schoolName}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Class List — {classLabel}
              {exam ? ` · ${exam.examName} (${exam.term} ${exam.year})` : " · Student Roster"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Generated: {new Date().toLocaleDateString("en-KE", { dateStyle: "full" })}
            </p>
          </header>

          {sorted.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No students in {classLabel}.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>
                      <button type="button" onClick={() => toggleSort("admNo")} className="flex items-center gap-1">
                        Adm No <SortIcon active={sortBy === "admNo"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1">
                        Student Name <SortIcon active={sortBy === "name"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead>Gender</TableHead>
                    {exam && (
                      <>
                        <TableHead>
                          <button type="button" onClick={() => toggleSort("score")} className="flex items-center gap-1">
                            Avg Score <SortIcon active={sortBy === "score"} dir={sortDir} />
                          </button>
                        </TableHead>
                        <TableHead>CBC Level</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((s, i) => (
                    <TableRow key={s.id} className={i % 2 === 1 ? "bg-muted/50" : undefined}>
                      <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-bold text-primary">{s.admNo}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={s.gender === "Male" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}
                        >
                          {s.gender === "Male" ? "♂" : "♀"} {s.gender}
                        </Badge>
                      </TableCell>
                      {exam && (
                        <>
                          <TableCell className="font-bold tabular-nums">
                            {s.avg !== null ? `${s.avg} / ${exam.maxScore}` : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell><CbcBadge level={s.overall} showLabel /></TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={exam ? 6 : 4} className="text-xs font-semibold text-muted-foreground">
                      Total: {sorted.length} students
                      {classAverage && ` · Class Average: ${classAverage.avg}/${exam.maxScore} · ${classAverage.level.code}`}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}

          <div className="mt-8 grid gap-5 text-xs text-muted-foreground sm:grid-cols-3">
            <p>Class Teacher: __________________________</p>
            <p>HOD Signature: __________________________</p>
            <p>Principal: ______________________________</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
