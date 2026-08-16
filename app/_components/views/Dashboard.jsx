"use client";
import { BookOpen, ClipboardList, GraduationCap, Users, ArrowRight } from "lucide-react";
import { SCHOOL_NAMES } from "../../_lib/i18n";
import CbcBadge from "../CbcBadge";
import StatCard from "../StatCard";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Representative score for each CBC band, used to look up the band's current
// colour/label from the (admin-editable) scale.
const BANDS = [
  { code: "EE1", range: "90–100%", score: 95 },
  { code: "EE2", range: "80–89%", score: 85 },
  { code: "ME1", range: "70–79%", score: 75 },
  { code: "ME2", range: "60–69%", score: 65 },
  { code: "AE1", range: "50–59%", score: 55 },
  { code: "AE2", range: "40–49%", score: 45 },
  { code: "BE1", range: "30–39%", score: 35 },
  { code: "BE2", range: "0–29%", score: 20 },
];

// Dashboard view, extracted from App() in index.jsx.
export default function Dashboard({
  t, lang, students, teachers, subjects, exams, results, cbe, streamsFor, setPage,
}) {
  const activeExams = exams.filter(e => e.status === "Active").length;
  const juniorCount = students.filter(s => s.level === "junior").length;
  const seniorCount = students.filter(s => s.level === "senior").length;

  const levelCounts = {};
  results.forEach(r => {
    const exam = exams.find(e => e.id === r.examId);
    if (!exam) return;
    const code = cbe(r.score, exam.maxScore).code;
    levelCounts[code] = (levelCounts[code] || 0) + 1;
  });
  const hasDistribution = Object.keys(levelCounts).length > 0;

  const recentStudents = [...students].slice(-3).reverse();

  const levelSummary = [
    { key: "junior", count: juniorCount, title: t.dashboard.junior, name: SCHOOL_NAMES.junior[lang], grades: "Grade 7–9", accent: "#0c5460" },
    { key: "senior", count: seniorCount, title: t.dashboard.senior, name: SCHOOL_NAMES.senior[lang], grades: "Grade 10–12", accent: "var(--primary)" },
  ];

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label={t.dashboard.totalStudents} value={students.length} accent="var(--primary)" />
        <StatCard icon={GraduationCap} label={t.dashboard.totalTeachers} value={teachers.length} accent="var(--gold)" />
        <StatCard icon={BookOpen} label={t.dashboard.totalSubjects} value={subjects.length} accent="#2563eb" />
        <StatCard icon={ClipboardList} label={t.dashboard.activeExams} value={activeExams} accent="#16a34a" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {levelSummary.map(lv => (
          <Card key={lv.key} className="gap-0 overflow-hidden py-0">
            <div aria-hidden="true" className="h-[3px] w-full" style={{ backgroundColor: lv.accent }} />
            <CardContent className="flex items-center justify-between gap-3 p-4 md:p-5">
              <div className="min-w-0">
                <p className="font-bold text-primary">{lv.title}</p>
                <p className="mt-0.5 text-[11px] uppercase text-muted-foreground">{lv.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lv.grades} · Streams: {streamsFor(lv.key).join(", ") || "—"}
                </p>
              </div>
              <p className="text-3xl font-extrabold" style={{ color: lv.accent }}>{lv.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">{t.dashboard.gradeDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasDistribution ? (
              <p className="text-sm text-muted-foreground">{t.noData}</p>
            ) : (
              <ul className="space-y-2.5">
                {BANDS.map(({ code, score }) => {
                  const count = levelCounts[code] || 0;
                  const pct = results.length ? Math.round((count / results.length) * 100) : 0;
                  const band = cbe(score, 100);
                  return (
                    <li key={code} className="flex items-center gap-2.5">
                      <CbcBadge level={band} className="w-11 justify-center" />
                      {/* Bar colour is data-driven (editable CBC scale), so it stays inline. */}
                      <div
                        className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
                        role="img"
                        aria-label={`${code}: ${count} results, ${pct}%`}
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${pct}%`, backgroundColor: band.color }}
                        />
                      </div>
                      <span className="w-8 text-end text-sm tabular-nums text-muted-foreground">{count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary">{t.dashboard.recentActivity}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noData}</p>
            ) : (
              <ul className="divide-y">
                {recentStudents.map(s => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary text-sm font-bold text-gold">
                        {s.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.grade}{s.stream} · {t.levels[s.level]} · {s.gender}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setPage("students")}>
              {t.nav.students}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Kenya CBC 8-Level Grading Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            {BANDS.map(({ code, range, score }) => {
              const band = cbe(score, 100);
              return (
                <div
                  key={code}
                  className="rounded-lg border p-3"
                  style={{ backgroundColor: band.bg, borderColor: `${band.color}33` }}
                >
                  <p className="text-base font-extrabold" style={{ color: band.color }}>{code}</p>
                  <p className="text-xs font-semibold" style={{ color: band.color }}>{band.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{range}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
