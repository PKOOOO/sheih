"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { uid } from "../../_lib/storage";
import LevelToggle from "../LevelToggle";
import PageHeader from "../PageHeader";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const LEVEL_BADGE = {
  junior: "bg-[#bee5eb] text-[#0c5460]",
  senior: "bg-[#e8f0ed] text-primary",
};

// Examination settings view, extracted from App() in index.jsx.
export default function Exams({ t, exams, setExams, gradesFor, showToast, showConfirm }) {
  const blank = {
    examName: "", term: t.terms[0], year: "2025", maxScore: 100,
    passMark: 40, weight: 100, level: "junior", grades: [], status: "Active",
  };
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const save = () => {
    if (!form.examName) return;
    if (editId) setExams(p => p.map(e => e.id === editId ? { ...form, id: editId } : e));
    else setExams(p => [...p, { ...form, id: uid() }]);
    setShowForm(false);
    showToast(t.saved);
  };
  const del = (id) => showConfirm(t.confirm, () => {
    setExams(p => p.filter(e => e.id !== id));
    showToast(t.deleted);
  }, { danger: true });
  const openEdit = (e) => {
    setForm({ ...e, grades: [...e.grades], level: e.level || "junior" });
    setEditId(e.id);
    setShowForm(true);
  };
  const openAdd = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const toggleGrade = (g) => set("grades", form.grades.includes(g) ? form.grades.filter(x => x !== g) : [...form.grades, g]);
  // Changing level invalidates any grades picked from the previous level.
  const onLevelChange = (level) => setForm(p => ({ ...p, level, grades: [] }));

  return (
    <div className="space-y-4">
      <PageHeader title={t.exams.title}>
        <Button onClick={openAdd}>
          <Plus className="size-4" aria-hidden="true" />
          {t.exams.addExam}
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {exams.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t.exams.noExams}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[t.exams.examName, t.exams.level, t.exams.term, t.exams.year,
                      t.exams.maxScore, t.exams.passMark, t.exams.weight, t.exams.status, t.actions]
                      .map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-semibold">{e.examName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={LEVEL_BADGE[e.level]}>{t.levels[e.level]}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{e.term}</TableCell>
                      <TableCell>{e.year}</TableCell>
                      <TableCell className="font-bold tabular-nums">{e.maxScore}</TableCell>
                      <TableCell className="tabular-nums">{e.passMark}</TableCell>
                      <TableCell className="tabular-nums">{e.weight}%</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={e.status === "Active" ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}
                        >
                          {e.status === "Active" ? t.exams.active : t.exams.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(e)} aria-label={`${t.exams.edit}: ${e.examName}`}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => del(e.id)} aria-label={`Delete ${e.examName}`}>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editId ? t.exams.edit : t.exams.addExam}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ex-name">{t.exams.examName}</Label>
              <Input id="ex-name" value={form.examName} onChange={e => set("examName", e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label>{t.exams.level}</Label>
              <LevelToggle t={t} value={form.level} onChange={onLevelChange} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ex-term">{t.exams.term}</Label>
                <Select value={form.term} onValueChange={v => set("term", v)}>
                  <SelectTrigger id="ex-term" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {t.terms.map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ex-year">{t.exams.year}</Label>
                <Input id="ex-year" inputMode="numeric" value={form.year} onChange={e => set("year", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ex-status">{t.exams.status}</Label>
                <Select
                  items={{ Active: t.exams.active, Inactive: t.exams.inactive }}
                  value={form.status}
                  onValueChange={v => set("status", v)}
                >
                  <SelectTrigger id="ex-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">{t.exams.active}</SelectItem>
                    <SelectItem value="Inactive">{t.exams.inactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ex-max">{t.exams.maxScore}</Label>
                <Input id="ex-max" type="number" min={1} value={form.maxScore} onChange={e => set("maxScore", +e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ex-pass">{t.exams.passMark}</Label>
                <Input id="ex-pass" type="number" min={0} value={form.passMark} onChange={e => set("passMark", +e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ex-weight">{t.exams.weight}</Label>
                <Input id="ex-weight" type="number" min={1} max={100} value={form.weight} onChange={e => set("weight", +e.target.value)} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t.exams.grades}</Label>
              <div className="flex flex-wrap gap-3 rounded-lg border bg-muted p-3">
                {gradesFor(form.level).map(g => (
                  <Label key={g} htmlFor={`grade-${g}`} className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                    <Checkbox
                      id={`grade-${g}`}
                      checked={form.grades.includes(g)}
                      onCheckedChange={() => toggleGrade(g)}
                    />
                    {g}
                  </Label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t.exams.cancel}</Button>
            <Button onClick={save} disabled={!form.examName}>{t.exams.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
