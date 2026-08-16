"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { uid } from "../../_lib/storage";
import LevelToggle from "../LevelToggle";
import PageHeader from "../PageHeader";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Streams-for-a-level card, hoisted to module scope (not declared inside
// ClassesStreams) so React doesn't remount it — and reset its subtree state —
// on every render of the parent.
function LevelBlock({ level, t, gradesFor, streams, students, openAdd, openEdit, del }) {
  const levelStreams = streams.filter(s => s.level === level);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-base font-bold text-primary">{t.levels[level]}</p>
          <p className="text-xs text-muted-foreground">
            {t.classes.gradesInLevel}: {gradesFor(level).join(", ")}
          </p>
        </div>
        <Button onClick={() => openAdd(level)}>
          <Plus className="size-4" aria-hidden="true" />
          {t.classes.addStream}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs text-muted-foreground">{t.classes.streamsInLevel}</p>
        {levelStreams.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.classes.noStreams}</p>
        ) : (
          <ul className="flex flex-wrap gap-2.5">
            {levelStreams.map(s => {
              const count = students.filter(st => st.level === level && st.stream === s.name).length;
              return (
                <li key={s.id} className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5">
                  <span className="font-bold text-primary">{s.name}</span>
                  <span className="text-[11px] text-muted-foreground">({count})</span>
                  <Button
                    variant="ghost" size="icon" className="size-7"
                    onClick={() => openEdit(s)} aria-label={`${t.classes.edit} ${s.name}`}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive"
                    onClick={() => del(s)} aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// Classes & Streams management view, extracted from App() in index.jsx.
export default function ClassesStreams({
  t, lang, streams, setStreams, students, setStudents, gradesFor, showToast, showConfirm,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", level: "junior" });

  const openAdd = (level) => { setForm({ name: "", level }); setEditId(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditId(s.id); setShowForm(true); };

  const save = () => {
    const name = form.name.trim();
    if (!name) return;
    const dup = streams.find(s =>
      s.level === form.level && s.name.toLowerCase() === name.toLowerCase() && s.id !== editId);
    if (dup) {
      showToast(lang === "ar" ? "هذه الشعبة موجودة بالفعل" : "This stream already exists for this level");
      return;
    }
    if (editId) {
      const old = streams.find(s => s.id === editId);
      setStreams(p => p.map(s => s.id === editId ? { ...s, name } : s));
      // Renaming a stream has to follow through to every student assigned to it.
      if (old && old.name !== name) {
        setStudents(p => p.map(s =>
          (s.level === old.level && s.stream === old.name) ? { ...s, stream: name } : s));
      }
    } else {
      setStreams(p => [...p, { id: uid(), name, level: form.level }]);
    }
    setShowForm(false);
    showToast(t.saved);
  };

  const del = (s) => {
    const inUse = students.some(st => st.level === s.level && st.stream === s.name);
    if (inUse) { showToast(t.classes.inUseWarning); return; }
    showConfirm(t.confirm, () => {
      setStreams(p => p.filter(x => x.id !== s.id));
      showToast(t.deleted);
    }, { danger: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t.classes.title} description={t.classes.subtitle} />

      {["junior", "senior"].map(level => (
        <LevelBlock
          key={level} level={level} t={t} gradesFor={gradesFor} streams={streams}
          students={students} openAdd={openAdd} openEdit={openEdit} del={del}
        />
      ))}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editId ? t.classes.edit : t.classes.addStream}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>{t.classes.level}</Label>
              {/* Level is fixed once created — moving a stream between levels would
                  orphan every student already assigned to it. */}
              <div className={editId ? "pointer-events-none opacity-60" : undefined}>
                <LevelToggle t={t} value={form.level} onChange={lv => setForm(p => ({ ...p, level: lv }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stream-name">{t.classes.streamName}</Label>
              <Input
                id="stream-name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. A, R, North…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t.classes.cancel}</Button>
            <Button onClick={save} disabled={!form.name.trim()}>{t.classes.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
