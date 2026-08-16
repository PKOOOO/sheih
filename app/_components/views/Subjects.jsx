"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { uid } from "../../_lib/storage";
import LevelToggle from "../LevelToggle";
import PageHeader from "../PageHeader";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = ["Quran Sciences", "Islamic Law", "Languages", "Islamic Sciences", "History", "Other"];

// Category colours are decorative identity, not data — kept as a small map.
const CAT_COLORS = {
  "Quran Sciences": ["#7c3aed", "#ede9fe"],
  "Islamic Law": ["#0f766e", "#ccfbf1"],
  "Languages": ["#1d4ed8", "#dbeafe"],
  "Islamic Sciences": ["#b45309", "#fef3c7"],
  "History": ["#6b7280", "#f3f4f6"],
  "Other": ["#374151", "#e5e7eb"],
};

const LEVEL_BADGE = {
  junior: "bg-[#bee5eb] text-[#0c5460]",
  senior: "bg-[#e8f0ed] text-primary",
};

// Subject management view, extracted from App() in index.jsx.
export default function Subjects({ t, subjects, setSubjects, showToast, showConfirm }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", category: CATEGORIES[0], description: "", levels: ["junior", "senior"] });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const save = () => {
    if (!form.name) return;
    if (editId) setSubjects(p => p.map(s => s.id === editId ? { ...form, id: editId } : s));
    else setSubjects(p => [...p, { ...form, id: uid() }]);
    setShowForm(false);
    showToast(t.saved);
  };
  const del = (id) => showConfirm(t.confirm, () => {
    setSubjects(p => p.filter(s => s.id !== id));
    showToast(t.deleted);
  }, { danger: true });
  const openEdit = (s) => {
    setForm({ ...s, levels: s.levels || ["junior", "senior"] });
    setEditId(s.id);
    setShowForm(true);
  };
  const openAdd = () => {
    setForm({ name: "", code: "", category: CATEGORIES[0], description: "", levels: ["junior", "senior"] });
    setEditId(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t.subjects.title}>
        <Button onClick={openAdd}>
          <Plus className="size-4" aria-hidden="true" />
          {t.subjects.addSubject}
        </Button>
      </PageHeader>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">{t.subjects.noSubjects}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subjects.map(s => {
            const [c, bg] = CAT_COLORS[s.category] || CAT_COLORS.Other;
            return (
              <Card key={s.id} className="gap-0 overflow-hidden py-0">
                <div aria-hidden="true" className="h-[3px] w-full" style={{ backgroundColor: c }} />
                <CardContent className="flex h-full flex-col p-4">
                  <Badge className="mb-2 w-fit border-transparent font-bold" style={{ color: c, backgroundColor: bg }}>
                    {s.code}
                  </Badge>
                  <p className="font-bold text-primary">{s.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.category}</p>
                  {s.description && <p className="mt-1.5 text-xs text-muted-foreground">{s.description}</p>}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {(s.levels || []).map(lv => (
                      <Badge key={lv} variant="secondary" className={LEVEL_BADGE[lv]}>{t.levels[lv]}</Badge>
                    ))}
                  </div>

                  <div className="mt-auto flex gap-1.5 pt-3">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(s)} aria-label={`${t.subjects.edit}: ${s.name}`}>
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => del(s.id)} aria-label={`Delete ${s.name}`}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editId ? t.subjects.edit : t.subjects.addSubject}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sub-name">{t.subjects.name}</Label>
              <Input id="sub-name" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sub-code">{t.subjects.code}</Label>
              <Input id="sub-code" value={form.code} onChange={e => set("code", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sub-cat">{t.subjects.category}</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger id="sub-cat" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t.subjects.levels}</Label>
              <LevelToggle t={t} multiple value={form.levels} onChange={v => set("levels", v)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sub-desc">{t.subjects.description}</Label>
              <Textarea id="sub-desc" rows={3} value={form.description} onChange={e => set("description", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t.subjects.cancel}</Button>
            <Button onClick={save} disabled={!form.name}>{t.subjects.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
