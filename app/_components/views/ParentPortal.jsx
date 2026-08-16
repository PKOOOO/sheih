"use client";
import { useState } from "react";
import { Printer } from "lucide-react";
import { iframePrint } from "../../_lib/storage";
import ReportCard from "../ReportCard";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Parent portal view ("My Child's Results"), extracted from App() in index.jsx.
//
// Deviation note: the original index.jsx wired this view's print button to a
// `printReport` closure that only existed inside the sibling `Reports()` component
// (a dangling reference that would throw at render time). Here each view owns its
// print logic, so ParentPortal gets its own `printReport` built from `linkedStudent`.
export default function ParentPortal({
  t, lang, students, subjects, exams, results, cbe, currentUser, showToast,
}) {
  const linkedStudent = students.find(s => s.id === currentUser?.linkedStudentId);
  const [selExam, setSelExam] = useState("");

  const printReport = () => {
    const el = document.getElementById("report-printable");
    if (!el || !el.innerText.trim()) {
      showToast("Nothing to print yet. Generate a report first.");
      return;
    }
    iframePrint(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Madrasa Report Form — ${linkedStudent?.name || "Student"}</title>
  <style>
    body{padding:28px;background:#fff}
    @media print{body{padding:16px}}
  </style>
</head>
<body>
  ${el.innerHTML}
</body>
</html>`);
  };

  if (!linkedStudent) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t.parentPortal.noChildLinked}
        </CardContent>
      </Card>
    );
  }

  const childExams = exams.filter(e => e.level === linkedStudent.level);
  const exam = exams.find(e => e.id === selExam) || childExams[0];

  const avg = exam ? (() => {
    const r = results.filter(r => r.examId === exam.id && r.studentId === linkedStudent.id);
    return r.length ? Math.round(r.reduce((a, x) => a + x.score, 0) / r.length) : null;
  })() : null;
  const overall = avg !== null && exam ? cbe(avg, exam.maxScore) : null;

  return (
    <div className="space-y-4">
      <div className="print-hide flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-xl font-bold text-primary">{t.parentPortal.title}</h2>
        <Button onClick={printReport} className="bg-gold text-gold-foreground hover:bg-gold/90">
          <Printer className="size-4" aria-hidden="true" />
          {t.reports.print}
        </Button>
      </div>

      <Card className="print-hide">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="bg-primary text-lg font-bold text-gold">
                {linkedStudent.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-base font-bold text-primary">{linkedStudent.name}</p>
              <p className="text-xs text-muted-foreground">
                {linkedStudent.admNo} · {t.levels[linkedStudent.level]} · {linkedStudent.grade}{linkedStudent.stream}
              </p>
            </div>
          </div>

          <div className="w-full max-w-[280px] space-y-1.5">
            <Label htmlFor="parent-exam">{t.parentPortal.selectExam}</Label>
            {childExams.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noData}</p>
            ) : (
              <Select
                items={Object.fromEntries(childExams.map(e => [e.id, `${e.examName} (${e.term} ${e.year})`]))}
                value={exam?.id || ""}
                onValueChange={setSelExam}
              >
                <SelectTrigger id="parent-exam" className="w-full">
                  <SelectValue placeholder={t.parentPortal.selectExam} />
                </SelectTrigger>
                <SelectContent>
                  {childExams.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.examName} ({e.term} {e.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <div id="report-printable">
        {exam ? (
          <ReportCard
            student={linkedStudent} exam={exam} avg={avg} overall={overall}
            t={t} lang={lang} subjects={subjects} results={results} cbe={cbe}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">{t.noData}</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
