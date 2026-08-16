"use client";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { downloadWorkbook, nowStamp, iframePrint } from "../../_lib/storage";
import { LOGO_SRC } from "../../_lib/logo";
import { SCHOOL_NAMES } from "../../_lib/i18n";
import CbcBadge from "../CbcBadge";
import PageHeader from "../PageHeader";
import ReportCard from "../ReportCard";

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
import { cn } from "@/lib/utils";

const ALL = "__all__";

// Shared MADRASA-branded masthead for every printable report in this view.
function ReportHeading({ title, exam, level, lang }) {
  return (
    <header className="mb-5 border-b-[3px] border-gold pb-3.5 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt="School logo" className="mx-auto mb-1.5 size-14 object-contain" />
      <p className="text-[15px] font-extrabold text-primary">{SCHOOL_NAMES[level]?.[lang]}</p>
      <p className="mt-1 text-[13px] font-bold tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1.5 inline-block rounded-full bg-primary px-4 py-1 text-xs font-bold text-gold">
        {exam.examName} · {exam.term} {exam.year}
      </p>
    </header>
  );
}

// Medal for the top three, plain rank otherwise. Hoisted so it isn't recreated
// (and remounted) on every render.
function RankCell({ rank }) {
  if (!rank) return <span className="text-muted-foreground">—</span>;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <span className={cn("font-extrabold", rank <= 3 ? "text-base text-gold" : "text-[13px]")}>
      {medal ?? `#${rank}`}
    </span>
  );
}

// Sorts by average (highest first, unscored last) and assigns competition
// ranks, so equal averages share a rank and the next rank skips accordingly.
function rankByAvg(rows) {
  const sorted = [...rows].sort((a, b) => {
    if (a.avg === null && b.avg === null) return 0;
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    return b.avg - a.avg;
  });
  let prevAvg = null, prevRank = 0;
  return sorted.map((r, i) => {
    if (r.avg === null) return { ...r, rank: null };
    const rank = r.avg === prevAvg ? prevRank : i + 1;
    prevAvg = r.avg; prevRank = rank;
    return { ...r, rank };
  });
}

const round2 = (n) => Math.round(n * 100) / 100;
const mean = (nums) => (nums.length ? round2(nums.reduce((a, b) => a + b, 0) / nums.length) : null);
const pctClass = (p) => (p >= 70 ? "text-green-800" : p >= 50 ? "text-amber-700" : "text-red-800");

// Reports & transcripts view, extracted from App() in index.jsx.
export default function Reports({
  t, lang, students, exams, subjects, results, gradesFor, streamsFor, cbe, showToast,
}) {
  const [selExam, setSelExam] = useState(exams[0]?.id || "");
  const [reportType, setReportType] = useState("student");
  const [fGrade, setFGrade] = useState(ALL);   // ALL = every class
  const [fStream, setFStream] = useState(ALL); // ALL = every stream
  const [selStudent, setSelStudent] = useState("");
  const [rkScope, setRkScope] = useState("class"); // class | overall

  const exam = exams.find(e => e.id === selExam);
  const level = exam?.level;
  const levelSubjects = subjects.filter(s => (s.levels || []).includes(level));
  const grades = level ? gradesFor(level) : [];
  const streams = level ? streamsFor(level) : [];

  const gradeFilter = fGrade === ALL ? "" : fGrade;
  const streamFilter = fStream === ALL ? "" : fStream;

  // Students matching the class/stream filters — drives the student picker,
  // the class tables, the subject analysis and class-scoped ranking.
  const inScope = students.filter(s =>
    s.level === level &&
    (!gradeFilter || s.grade === gradeFilter) &&
    (!streamFilter || s.stream === streamFilter));

  const student = inScope.find(s => s.id === selStudent) || inScope[0];

  const scoresOf = (stuId) => results.filter(r => r.examId === selExam && r.studentId === stuId);
  const avgFor = (stuId) => mean(scoresOf(stuId).map(r => r.score));
  const scoreFor = (stuId, subId) => {
    const r = results.find(r => r.examId === selExam && r.studentId === stuId && r.subjectId === subId);
    return r ? r.score : null;
  };

  const avg = student ? avgFor(student.id) : null;
  const overall = avg !== null && exam ? cbe(avg, exam.maxScore) : null;

  // ── Ranking (class scope honours the filters; overall spans the whole level) ──
  const rankingRows = exam ? rankByAvg(
    (rkScope === "overall" ? students.filter(s => s.level === level) : inScope).map(s => ({
      id: s.id, name: s.name, admNo: s.admNo, grade: s.grade, stream: s.stream,
      subScores: levelSubjects.map(sub => ({ id: sub.id, score: scoreFor(s.id, sub.id) })),
      avg: avgFor(s.id),
    })),
  ) : [];

  // ── Class performance: every grade+stream class inside the current filters ──
  const classCells = grades
    .filter(g => !gradeFilter || g === gradeFilter)
    .flatMap(g => streams
      .filter(st => !streamFilter || st === streamFilter)
      .map(st => ({ grade: g, stream: st, pool: students.filter(s => s.level === level && s.grade === g && s.stream === st) }))
      .filter(c => c.pool.length > 0));

  // Ranks the classes against each other for one subject.
  const classRankingFor = (sub) => rankByAvg(classCells.map(c => {
    const rs = results.filter(r => r.examId === selExam && r.subjectId === sub.id && c.pool.some(s => s.id === r.studentId));
    return {
      grade: c.grade, stream: c.stream, students: c.pool.length,
      entered: rs.length, avg: mean(rs.map(r => r.score)),
    };
  }));

  // ── Subject analysis across the filtered students ──
  const scopeIds = new Set(inScope.map(s => s.id));
  const subjectAnalysis = exam ? levelSubjects.map(sub => {
    const rs = results.filter(r => r.examId === selExam && r.subjectId === sub.id && scopeIds.has(r.studentId));
    const sc = rs.map(r => r.score);
    const passed = rs.filter(r => r.score >= exam.passMark).length;
    return {
      sub, entered: rs.length, avg: mean(sc),
      high: sc.length ? Math.max(...sc) : null,
      low: sc.length ? Math.min(...sc) : null,
      passed, failed: rs.length - passed,
      passRate: rs.length ? Math.round((passed / rs.length) * 100) : null,
    };
  }) : [];

  // ── Excel exports (all of them honour the on-screen filters) ──
  const downloadReport = () => {
    if (!student || !exam) return;
    const rows = levelSubjects.map(sub => {
      const sc = scoreFor(student.id, sub.id);
      const lvl = sc !== null ? cbe(sc, exam.maxScore) : null;
      return {
        Subject: sub.name, Code: sub.code,
        Score: sc ?? "", MaxScore: exam.maxScore,
        Percentage: sc !== null ? `${Math.round((sc / exam.maxScore) * 100)}%` : "",
        CBCLevel: lvl?.code || "", LevelLabel: lvl?.label || "",
      };
    });
    if (avg !== null) rows.push({ Subject: "OVERALL AVERAGE", Code: "", Score: avg, MaxScore: exam.maxScore, Percentage: `${Math.round((avg / exam.maxScore) * 100)}%`, CBCLevel: overall?.code || "", LevelLabel: overall?.label || "" });
    downloadWorkbook(`madrasa-report-${student.admNo}-${nowStamp()}.xlsx`, [{ name: "Madrasa Report", rows }]);
  };

  const downloadRanking = () => {
    if (!rankingRows.length || !exam) return;
    const rows = rankingRows.map(s => {
      const row = { Rank: s.rank ?? "", AdmNo: s.admNo, Name: s.name, Grade: s.grade, Stream: s.stream };
      levelSubjects.forEach(sub => {
        row[sub.code] = s.subScores.find(x => x.id === sub.id)?.score ?? "";
      });
      row.Average = s.avg ?? "";
      row.CBCLevel = s.avg !== null ? cbe(s.avg, exam.maxScore).code : "";
      return row;
    });
    downloadWorkbook(`ranking-${rkScope}-${nowStamp()}.xlsx`, [{ name: "Ranking", rows }]);
  };

  const downloadClassPerf = () => {
    if (!exam) return;
    const rows = [];
    levelSubjects.forEach(sub => {
      classRankingFor(sub).forEach(c => {
        rows.push({
          Subject: sub.name, Code: sub.code, Rank: c.rank ?? "",
          Grade: c.grade, Stream: c.stream, Students: c.students, Entered: c.entered,
          Average: c.avg ?? "", CBCLevel: c.avg !== null ? cbe(c.avg, exam.maxScore).code : "",
        });
      });
    });
    downloadWorkbook(`class-performance-${nowStamp()}.xlsx`, [{ name: "Class Performance", rows }]);
  };

  const downloadSubjectAnalysis = () => {
    if (!exam) return;
    const rows = subjectAnalysis.map(a => ({
      Subject: a.sub.name, Code: a.sub.code, Entered: a.entered,
      Average: a.avg ?? "", MaxScore: exam.maxScore,
      Percentage: a.avg !== null ? `${Math.round((a.avg / exam.maxScore) * 100)}%` : "",
      Highest: a.high ?? "", Lowest: a.low ?? "",
      Passed: a.passed, Failed: a.failed,
      PassRate: a.passRate !== null ? `${a.passRate}%` : "",
      CBCLevel: a.avg !== null ? cbe(a.avg, exam.maxScore).code : "",
    }));
    downloadWorkbook(`madrasa-subjects-analysis-${nowStamp()}.xlsx`, [{ name: "Subjects Analysis", rows }]);
  };

  const printReport = () => {
    const el = document.getElementById("report-printable");
    if (!el || !el.innerText.trim()) {
      showToast("Nothing to print yet. Generate a report first.");
      return;
    }
    // iframePrint clones the app's stylesheets in, so the Tailwind classes
    // below survive into the print document.
    iframePrint(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Madrasa Report Form</title>
  <style>
    body { padding: 28px; background: #fff; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  ${el.innerHTML}
</body>
</html>`);
  };

  const examItems = Object.fromEntries(exams.map(e => [e.id, `${e.examName} (${e.term} ${e.year})`]));
  const studentItems = Object.fromEntries(inScope.map(s => [s.id, `${s.name} (${s.admNo})`]));
  const typeItems = {
    student: t.reports.studentReport,
    class: t.reports.classReport,
    rank: t.reports.rankReport,
    subject: t.reports.subjectReport,
  };
  const scopeItems = {
    class: "Class Ranking (Grade + Stream)",
    overall: "Overall Ranking (Whole Level)",
  };
  const gradeItems = { [ALL]: "All Classes", ...Object.fromEntries(grades.map(g => [g, g])) };
  const streamItems = { [ALL]: "All Streams", ...Object.fromEntries(streams.map(s => [s, s])) };

  const showClassFilters = !(reportType === "rank" && rkScope === "overall");

  return (
    <div className="space-y-4">
      <PageHeader title={t.reports.title}>
        {reportType === "student" && student && exam && (
          <Button variant="secondary" onClick={downloadReport}>
            <Download className="size-4" aria-hidden="true" />Download Excel
          </Button>
        )}
        {reportType === "rank" && rankingRows.length > 0 && (
          <Button variant="secondary" onClick={downloadRanking}>
            <Download className="size-4" aria-hidden="true" />Download Ranking
          </Button>
        )}
        {reportType === "class" && exam && (
          <Button variant="secondary" onClick={downloadClassPerf}>
            <Download className="size-4" aria-hidden="true" />Download Excel
          </Button>
        )}
        {reportType === "subject" && exam && (
          <Button variant="secondary" onClick={downloadSubjectAnalysis}>
            <Download className="size-4" aria-hidden="true" />Download Excel
          </Button>
        )}
        <Button onClick={printReport} className="bg-gold text-gold-foreground hover:bg-gold/90">
          <Printer className="size-4" aria-hidden="true" />{t.reports.print}
        </Button>
      </PageHeader>

      {/* ── Filters ── */}
      <Card className="print-hide">
        {/* Capped at 3 columns: report-type labels like "Student Madrasa Report
            Form" need the width, and `min-w-0` lets each cell shrink so the
            trigger truncates instead of spilling over its neighbour. */}
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 [&>div]:min-w-0">
          <div className="grid gap-1.5">
            <Label htmlFor="rp-type">Report Type</Label>
            <Select items={typeItems} value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="rp-type" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeItems).map(([v, labelText]) => (
                  <SelectItem key={v} value={v}>{labelText}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="rp-exam">{t.reports.selectExam}</Label>
            <Select
              items={examItems}
              value={selExam}
              onValueChange={v => { setSelExam(v); setSelStudent(""); }}
            >
              <SelectTrigger id="rp-exam" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
              <SelectContent>
                {exams.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.examName} ({e.term} {e.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reportType === "rank" && (
            <div className="grid gap-1.5">
              <Label htmlFor="rp-scope">Ranking Scope</Label>
              <Select items={scopeItems} value={rkScope} onValueChange={setRkScope}>
                <SelectTrigger id="rp-scope" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(scopeItems).map(([v, labelText]) => (
                    <SelectItem key={v} value={v}>{labelText}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Class + stream filters apply to every report except overall ranking. */}
          {showClassFilters && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="rp-grade">Class</Label>
                <Select
                  items={gradeItems}
                  value={fGrade}
                  onValueChange={v => { setFGrade(v); setSelStudent(""); }}
                >
                  <SelectTrigger id="rp-grade" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Classes</SelectItem>
                    {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rp-stream">Stream</Label>
                <Select
                  items={streamItems}
                  value={fStream}
                  onValueChange={v => { setFStream(v); setSelStudent(""); }}
                >
                  <SelectTrigger id="rp-stream" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Streams</SelectItem>
                    {streams.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {reportType === "student" && (
            <div className="grid gap-1.5">
              <Label htmlFor="rp-student">{t.reports.selectStudent}</Label>
              {inScope.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students in this class</p>
              ) : (
                <Select items={studentItems} value={student?.id || ""} onValueChange={setSelStudent}>
                  <SelectTrigger id="rp-student" className="w-full overflow-hidden"><SelectValue className="truncate" /></SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {inScope.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.admNo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div id="report-printable" className="space-y-4">

        {/* ── STUDENT MADRASA REPORT ── */}
        {reportType === "student" && student && exam && (
          <ReportCard
            student={student} exam={exam} avg={avg} overall={overall}
            t={t} lang={lang} subjects={subjects} results={results} cbe={cbe}
          />
        )}
        {reportType === "student" && !student && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No students match the selected class and stream.
            </CardContent>
          </Card>
        )}

        {/* ── CLASS PERFORMANCE: classes ranked per subject, per stream ── */}
        {reportType === "class" && exam && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <ReportHeading title="MADRASA CLASS PERFORMANCE REPORT" exam={exam} level={level} lang={lang} />
              {classCells.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No classes match the selected filters.</p>
              ) : levelSubjects.map(sub => (
                <section key={sub.id} className="mb-6 last:mb-0">
                  <h3 className="mb-2 flex items-center gap-2 border-b-2 pb-1.5 text-sm font-extrabold text-primary">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">{sub.code}</Badge>
                    {sub.name}
                  </h3>
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          {["Rank", "Class", "Stream", "Students", "Entered", "Average", "%", "CBC Level"]
                            .map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classRankingFor(sub).map(c => {
                          const pct = c.avg !== null ? Math.round((c.avg / exam.maxScore) * 100) : null;
                          const lvl = c.avg !== null ? cbe(c.avg, exam.maxScore) : null;
                          return (
                            <TableRow key={`${c.grade}-${c.stream}`}>
                              <TableCell><RankCell rank={c.rank} /></TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{c.grade}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-[#e8f0ed] text-primary">{c.stream}</Badge>
                              </TableCell>
                              <TableCell className="tabular-nums">{c.students}</TableCell>
                              <TableCell className="tabular-nums">{c.entered}</TableCell>
                              <TableCell className="font-bold tabular-nums whitespace-nowrap">
                                {c.avg !== null ? `${c.avg} / ${exam.maxScore}` : "—"}
                              </TableCell>
                              <TableCell className={cn("font-bold tabular-nums", pct !== null ? pctClass(pct) : "text-muted-foreground")}>
                                {pct !== null ? `${pct}%` : "—"}
                              </TableCell>
                              <TableCell>
                                {lvl ? <CbcBadge level={lvl} /> : <span className="text-muted-foreground">No results</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── CLASS / OVERALL RANKING with full subject breakdown ── */}
        {reportType === "rank" && exam && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <ReportHeading
                title={rkScope === "overall"
                  ? `MADRASA OVERALL RANKING — ${t.levels[level]}`
                  : `MADRASA CLASS RANKING — ${gradeFilter || "All Classes"}${streamFilter ? ` Stream ${streamFilter}` : ""}`}
                exam={exam} level={level} lang={lang}
              />

              {rankingRows.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No students match the selected filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Adm No.</TableHead>
                        <TableHead>Student</TableHead>
                        {rkScope === "overall" && <TableHead>Class/Stream</TableHead>}
                        {levelSubjects.map(sub => (
                          <TableHead key={sub.id} className="text-center">{sub.code}</TableHead>
                        ))}
                        <TableHead>Average</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead>CBC Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankingRows.map(s => {
                        const pct = s.avg !== null ? Math.round((s.avg / exam.maxScore) * 100) : null;
                        const lvl = s.avg !== null ? cbe(s.avg, exam.maxScore) : null;
                        return (
                          <TableRow key={s.id}>
                            <TableCell><RankCell rank={s.rank} /></TableCell>
                            <TableCell className="font-bold text-primary">{s.admNo}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                            {rkScope === "overall" && (
                              <TableCell>
                                <Badge variant="secondary" className="bg-[#e8f0ed] whitespace-nowrap text-primary">
                                  {s.grade} {s.stream}
                                </Badge>
                              </TableCell>
                            )}
                            {levelSubjects.map(sub => {
                              const sc = s.subScores.find(x => x.id === sub.id)?.score ?? null;
                              const scLvl = sc !== null ? cbe(sc, exam.maxScore) : null;
                              return (
                                <TableCell key={sub.id} className="text-center tabular-nums">
                                  {sc !== null
                                    ? <span className="font-bold" style={{ color: scLvl?.color }}>{sc}</span>
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              );
                            })}
                            <TableCell className="font-extrabold tabular-nums text-primary">
                              {s.avg !== null ? s.avg : "—"}
                            </TableCell>
                            <TableCell className={cn("font-bold tabular-nums", pct !== null ? pctClass(pct) : "text-muted-foreground")}>
                              {pct !== null ? `${pct}%` : "—"}
                            </TableCell>
                            <TableCell>
                              {lvl ? <CbcBadge level={lvl} /> : <span className="text-muted-foreground">No results</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3 + (rkScope === "overall" ? 1 : 0)} className="font-bold text-primary">
                          Subject averages · {rankingRows.length} students
                        </TableCell>
                        {levelSubjects.map(sub => (
                          <TableCell key={sub.id} className="text-center font-bold tabular-nums text-primary">
                            {mean(rankingRows.map(s => s.subScores.find(x => x.id === sub.id)?.score).filter(v => v !== null && v !== undefined)) ?? "—"}
                          </TableCell>
                        ))}
                        <TableCell className="font-extrabold tabular-nums text-primary">
                          {mean(rankingRows.filter(s => s.avg !== null).map(s => s.avg)) ?? "—"}
                        </TableCell>
                        <TableCell colSpan={2} className="text-[11px] text-muted-foreground">
                          Overall class average
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── MADRASA SUBJECTS ANALYSIS REPORT ── */}
        {reportType === "subject" && exam && (
          <Card>
            <CardContent className="p-4 md:p-6">
              <ReportHeading title="MADRASA SUBJECTS ANALYSIS REPORT" exam={exam} level={level} lang={lang} />
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {["Subject", "Code", "Entered", "Average", "%", "Highest", "Lowest", "Passed", "Failed", "Pass Rate", "CBC Level"]
                        .map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectAnalysis.map(a => {
                      const pct = a.avg !== null ? Math.round((a.avg / exam.maxScore) * 100) : null;
                      const lvl = a.avg !== null ? cbe(a.avg, exam.maxScore) : null;
                      return (
                        <TableRow key={a.sub.id}>
                          <TableCell className="font-medium whitespace-nowrap">{a.sub.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600">{a.sub.code}</Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">{a.entered}</TableCell>
                          <TableCell className="font-bold tabular-nums whitespace-nowrap">
                            {a.avg !== null ? `${a.avg} / ${exam.maxScore}` : "—"}
                          </TableCell>
                          <TableCell className={cn("font-bold tabular-nums", pct !== null ? pctClass(pct) : "text-muted-foreground")}>
                            {pct !== null ? `${pct}%` : "—"}
                          </TableCell>
                          <TableCell className="font-bold tabular-nums text-green-800">{a.high ?? "—"}</TableCell>
                          <TableCell className="font-bold tabular-nums text-red-800">{a.low ?? "—"}</TableCell>
                          <TableCell className="tabular-nums text-green-800">{a.passed}</TableCell>
                          <TableCell className="tabular-nums text-red-800">{a.failed}</TableCell>
                          <TableCell>
                            {a.passRate !== null ? (
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn("h-full rounded-full",
                                      a.passRate >= 70 ? "bg-green-600" : a.passRate >= 50 ? "bg-amber-500" : "bg-red-600")}
                                    style={{ width: `${a.passRate}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-bold tabular-nums">{a.passRate}%</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {lvl ? <CbcBadge level={lvl} /> : <span className="text-muted-foreground">No results</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Summary tiles */}
              {(() => {
                const scored = subjectAnalysis.filter(a => a.avg !== null);
                if (!scored.length) return null;
                const best = [...scored].sort((a, b) => b.avg - a.avg)[0];
                const weakest = [...scored].sort((a, b) => a.avg - b.avg)[0];
                const totalEntered = scored.reduce((n, a) => n + a.entered, 0);
                const totalPassed = scored.reduce((n, a) => n + a.passed, 0);
                const tiles = [
                  { label: "Students Assessed", val: new Set(results.filter(r => r.examId === selExam && scopeIds.has(r.studentId)).map(r => r.studentId)).size, color: "var(--primary)" },
                  { label: "Overall Average", val: `${mean(scored.map(a => a.avg))} / ${exam.maxScore}`, color: "var(--primary)" },
                  { label: "Overall Pass Rate", val: totalEntered ? `${Math.round((totalPassed / totalEntered) * 100)}%` : "—", color: "#166534" },
                  { label: "Best Subject", val: best.sub.name, color: "#166534" },
                  { label: "Needs Attention", val: weakest.sub.name, color: "#991b1b" },
                ];
                return (
                  <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                    {tiles.map(item => (
                      <div
                        key={item.label}
                        className="rounded-lg bg-muted p-3"
                        style={{ borderTop: `3px solid ${item.color}` }}
                      >
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-[15px] font-extrabold" style={{ color: item.color }}>{item.val}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

      </div>{/* end report-printable */}
    </div>
  );
}
