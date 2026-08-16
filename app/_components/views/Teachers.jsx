"use client";
import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { DEFAULT_GRADES } from "../../_lib/schoolStructure";
import { uid } from "../../_lib/storage";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const BLANK = { name: "", staffId: "", email: "", phone: "", subjects: [], classes: [] };

// Teacher management view, extracted from App() in index.jsx.
export default function Teachers({
  t, teachers, setTeachers, subjects, streamsFor, showToast, showConfirm,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(BLANK);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const q = search.trim().toLowerCase();
  const filtered = teachers.filter(tc =>
    tc.name.toLowerCase().includes(q) || tc.staffId.toLowerCase().includes(q));

  const openAdd = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  const openEdit = (tc) => {
    setForm({ ...tc, subjects: [...tc.subjects], classes: [...tc.classes] });
    setEditId(tc.id);
    setShowForm(true);
  };
  const save = () => {
    if (!form.name) return;
    if (editId) setTeachers(p => p.map(tc => tc.id === editId ? { ...form, id: editId } : tc));
    else setTeachers(p => [...p, { ...form, id: uid() }]);
    setShowForm(false);
    showToast(t.saved);
  };
  const del = (id) => showConfirm(t.confirm, () => {
    setTeachers(p => p.filter(tc => tc.id !== id));
    showToast(t.deleted);
  }, { danger: true });

  const toggle = (key, val) => set(key, form[key].includes(val) ? form[key].filter(x => x !== val) : [...form[key], val]);

  const allClassOptions = [
    ...DEFAULT_GRADES.junior.flatMap(g => streamsFor("junior").map(s => `${g}${s}`)),
    ...DEFAULT_GRADES.senior.flatMap(g => streamsFor("senior").map(s => `${g}${s}`)),
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t.teachers.title}>
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="w-[200px] ps-8"
            placeholder={t.teachers.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t.teachers.search}
          />
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" aria-hidden="true" />
          {t.teachers.addTeacher}
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t.teachers.noTeachers}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[t.teachers.staffId, t.teachers.name, t.teachers.email,
                      t.teachers.subjects, t.teachers.classes, t.actions]
                      .map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(tc => (
                    <TableRow key={tc.id}>
                      <TableCell className="font-bold text-primary">{tc.staffId}</TableCell>
                      <TableCell className="whitespace-nowrap">{tc.name}</TableCell>
                      <TableCell className="text-muted-foreground">{tc.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tc.subjects.length === 0
                            ? <span className="text-xs text-muted-foreground">—</span>
                            : tc.subjects.map(s => (
                                <Badge key={s} variant="secondary" className="bg-[#e8f0ed] text-primary">{s}</Badge>
                              ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tc.classes.length === 0
                            ? <span className="text-xs text-muted-foreground">—</span>
                            : tc.classes.map(c => (
                                <Badge key={c} variant="secondary" className="bg-blue-100 text-blue-800">{c}</Badge>
                              ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(tc)} aria-label={`${t.teachers.edit}: ${tc.name}`}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => del(tc.id)} aria-label={`Delete ${tc.name}`}>
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
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editId ? t.teachers.edit : t.teachers.addTeacher}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="tc-name">{t.teachers.name}</Label>
                <Input id="tc-name" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tc-staff">{t.teachers.staffId}</Label>
                <Input id="tc-staff" value={form.staffId} onChange={e => set("staffId", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tc-email">{t.teachers.email}</Label>
                <Input id="tc-email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tc-phone">{t.teachers.phone}</Label>
                <Input id="tc-phone" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t.teachers.subjects}</Label>
              <div className="flex flex-wrap gap-3 rounded-lg border bg-muted p-3">
                {subjects.length === 0
                  ? <p className="text-sm text-muted-foreground">{t.subjects.noSubjects}</p>
                  : subjects.map(s => (
                      <Label key={s.id} htmlFor={`tc-sub-${s.id}`} className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                        <Checkbox
                          id={`tc-sub-${s.id}`}
                          checked={form.subjects.includes(s.name)}
                          onCheckedChange={() => toggle("subjects", s.name)}
                        />
                        {s.name}
                      </Label>
                    ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t.teachers.classes}</Label>
              <div className="flex max-h-40 flex-wrap gap-3 overflow-y-auto rounded-lg border bg-muted p-3">
                {allClassOptions.map(cls => (
                  <Label key={cls} htmlFor={`tc-cls-${cls}`} className="flex min-w-[92px] cursor-pointer items-center gap-2 text-sm font-normal">
                    <Checkbox
                      id={`tc-cls-${cls}`}
                      checked={form.classes.includes(cls)}
                      onCheckedChange={() => toggle("classes", cls)}
                    />
                    {cls}
                  </Label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t.teachers.cancel}</Button>
            <Button onClick={save} disabled={!form.name}>{t.teachers.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
