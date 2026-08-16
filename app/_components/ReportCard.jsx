import { LOGO_SRC } from "../_lib/logo";
import { SCHOOL_NAMES } from "../_lib/i18n";
import CbcBadge from "./CbcBadge";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// Printable student report card, extracted from App() in index.jsx.
// Shared by the Reports and ParentPortal views. This is the document madam
// signs off on, so the layout is tuned for A4 print as much as for screen.
export default function ReportCard({ student, exam, avg, overall, t, lang, subjects, results, cbe }) {
  const studentSubjects = subjects.filter(sub => (sub.levels || []).includes(student.level));
  const pctOf = (score) => Math.round((score / exam.maxScore) * 100);

  const facts = [
    ["Student Name", student.name],
    ["Admission No.", student.admNo],
    ["School Level", t.levels[student.level]],
    ["Grade / Stream", `${student.grade}${student.stream}`],
    ["Gender", student.gender],
    ["Parent/Guardian", student.parent || "—"],
  ];

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <header className="mb-5 border-b-[3px] border-gold pb-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="School logo" className="mx-auto mb-2.5 size-16 object-contain" />
          <p className="text-base font-extrabold leading-snug text-primary md:text-[17px]">
            {SCHOOL_NAMES[student.level][lang]}
          </p>
          <p className="mt-1.5 text-[13px] font-bold tracking-wide text-muted-foreground">
            MADRASA REPORT FORM
          </p>
          <p className="mt-2 inline-block rounded-full bg-primary px-5 py-1 text-[13px] font-bold text-gold">
            {exam.examName} · {exam.term} {exam.year}
          </p>
        </header>

        <dl className="mb-5 grid gap-2.5 rounded-lg bg-muted p-4 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex gap-2 text-[13px]">
              <dt className="min-w-[120px] shrink-0 text-muted-foreground">{k}:</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">/ {exam.maxScore}</TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead>CBC Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentSubjects.map(sub => {
                const r = results.find(x => x.examId === exam.id && x.studentId === student.id && x.subjectId === sub.id);
                const level = r ? cbe(r.score, exam.maxScore) : null;
                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                        {sub.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-bold">{r ? r.score : "—"}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{r ? exam.maxScore : "—"}</TableCell>
                    <TableCell className="text-center">{r ? `${pctOf(r.score)}%` : "—"}</TableCell>
                    <TableCell><CbcBadge level={level} showLabel /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {overall && (
          <div
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 p-4"
            style={{ backgroundColor: overall.bg, borderColor: overall.color }}
          >
            <div style={{ color: overall.color }}>
              <p className="text-base font-bold">Overall Performance</p>
              <p className="text-sm">
                Average Score: {avg} / {exam.maxScore} ({pctOf(avg)}%)
              </p>
            </div>
            <div className="text-center" style={{ color: overall.color }}>
              <p className="text-3xl font-extrabold leading-none">{overall.code}</p>
              <p className="mt-1 text-[13px]">{overall.label}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
