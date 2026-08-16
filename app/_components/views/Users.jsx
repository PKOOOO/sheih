"use client";
import { useState } from "react";
import { KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { uid } from "../../_lib/storage";
import PageHeader from "../PageHeader";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const ROLE_KEYS = ["admin", "registrar", "teacher", "examOfficer", "viewer", "parent"];

const ROLE_STYLE = {
  admin: "bg-red-100 text-red-900",
  registrar: "bg-blue-100 text-blue-900",
  teacher: "bg-green-100 text-green-900",
  examOfficer: "bg-amber-100 text-amber-900",
  viewer: "bg-neutral-100 text-neutral-700",
  parent: "bg-purple-100 text-purple-900",
};

const BLANK = {
  fullName: "", username: "", email: "", password: "",
  role: "teacher", status: "Active", linkedTeacherId: "", linkedStudentId: "",
};

// User accounts & access levels view, extracted from App() in index.jsx.
export default function Users({
  t, lang, users, setUsers, students, teachers, showToast, showConfirm,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(BLANK);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const q = search.trim().toLowerCase();
  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));

  const openAdd = () => { setForm(BLANK); setEditId(null); setShowForm(true); };
  // Password is intentionally blanked on edit — an empty field keeps the current one.
  const openEdit = (u) => { setForm({ ...u, password: "" }); setEditId(u.id); setShowForm(true); };

  const save = () => {
    if (!form.fullName || !form.username) return;
    const dup = users.find(u => u.username.toLowerCase() === form.username.toLowerCase() && u.id !== editId);
    if (dup) {
      showToast(lang === "ar" ? "اسم المستخدم مستخدم بالفعل" : "Username already exists");
      return;
    }
    const payload = {
      ...form,
      password: form.password || (editId ? users.find(u => u.id === editId).password : "changeme123"),
    };
    if (editId) setUsers(p => p.map(u => u.id === editId ? { ...payload, id: editId } : u));
    else setUsers(p => [...p, { ...payload, id: uid() }]);
    setShowForm(false);
    showToast(t.saved);
  };

  const del = (id) => showConfirm(t.confirm, () => {
    setUsers(p => p.filter(u => u.id !== id));
    showToast(t.deleted);
  }, { danger: true });

  const toggleStatus = (u) => setUsers(p => p.map(x =>
    x.id === u.id ? { ...x, status: x.status === "Active" ? "Suspended" : "Active" } : x));

  const resetPassword = (u) => showToast(
    lang === "ar" ? `تم إرسال رابط إعادة التعيين إلى ${u.email}` : `Password reset link sent to ${u.email}`);

  return (
    <div className="space-y-4">
      <PageHeader title={t.users.title} description={t.users.subtitle}>
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="w-[200px] ps-8"
            placeholder={t.users.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t.users.search}
          />
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" aria-hidden="true" />
          {t.users.addUser}
        </Button>
      </PageHeader>

      {/* Role legend */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {ROLE_KEYS.map(rk => (
          <div key={rk} className={`rounded-lg p-3 ${ROLE_STYLE[rk]}`}>
            <p className="text-[13px] font-bold">{t.users.roles[rk]}</p>
            <p className="mt-1 text-[11px] leading-relaxed opacity-90">{t.users.roleDesc[rk]}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t.users.noUsers}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[t.users.fullName, t.users.username, t.users.email,
                      t.users.role, t.users.status, t.actions]
                      .map(h => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => {
                    const linkedStudent = u.role === "parent"
                      ? students.find(s => s.id === u.linkedStudentId) : null;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarFallback className="bg-primary text-xs font-bold text-gold">
                                {u.fullName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="whitespace-nowrap">{u.fullName}</p>
                              {linkedStudent && (
                                <p className="text-[11px] text-muted-foreground">Child: {linkedStudent.name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">{u.username}</code>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={ROLE_STYLE[u.role] || ROLE_STYLE.viewer}>
                            {t.users.roles[u.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {/* A real button, so the status is keyboard-togglable. */}
                          <button
                            type="button"
                            onClick={() => toggleStatus(u)}
                            title="Click to toggle"
                            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Badge
                              variant="secondary"
                              className={u.status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                            >
                              {u.status === "Active" ? t.users.active : t.users.suspended}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Button variant="secondary" size="sm" onClick={() => openEdit(u)} aria-label={`${t.users.edit}: ${u.fullName}`}>
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => resetPassword(u)} title={t.users.resetPassword} aria-label={t.users.resetPassword}>
                              <KeyRound className="size-3.5" aria-hidden="true" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => del(u.id)} aria-label={`Delete ${u.fullName}`}>
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editId ? t.users.edit : t.users.addUser}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="us-name">{t.users.fullName}</Label>
                <Input id="us-name" value={form.fullName} onChange={e => set("fullName", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="us-username">{t.users.username}</Label>
                <Input id="us-username" autoCapitalize="none" value={form.username} onChange={e => set("username", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="us-email">{t.users.email}</Label>
                <Input id="us-email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="us-pass">{t.users.password}</Label>
                <Input
                  id="us-pass" type="password" autoComplete="new-password"
                  value={form.password}
                  placeholder={editId ? "Leave blank to keep current" : ""}
                  onChange={e => set("password", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="us-role">{t.users.role}</Label>
              <Select
                items={Object.fromEntries(ROLE_KEYS.map(rk => [rk, t.users.roles[rk]]))}
                value={form.role}
                onValueChange={v => set("role", v)}
              >
                <SelectTrigger id="us-role" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_KEYS.map(rk => <SelectItem key={rk} value={rk}>{t.users.roles[rk]}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t.users.roleDesc[form.role]}</p>
            </div>

            {form.role === "teacher" && (
              <div className="grid gap-1.5">
                <Label htmlFor="us-teacher">{t.users.linkedTeacher}</Label>
                <Select
                  items={{ none: t.users.none, ...Object.fromEntries(teachers.map(tc => [tc.id, `${tc.name} (${tc.staffId})`])) }}
                  value={form.linkedTeacherId || "none"}
                  onValueChange={v => set("linkedTeacherId", v === "none" ? "" : v)}
                >
                  <SelectTrigger id="us-teacher" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.users.none}</SelectItem>
                    {teachers.map(tc => (
                      <SelectItem key={tc.id} value={tc.id}>{tc.name} ({tc.staffId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === "parent" && (
              <div className="grid gap-1.5">
                <Label htmlFor="us-student">{t.users.linkedStudent}</Label>
                <Select
                  items={{ none: t.users.none, ...Object.fromEntries(students.map(s => [s.id, `${s.name} (${s.admNo})`])) }}
                  value={form.linkedStudentId || "none"}
                  onValueChange={v => set("linkedStudentId", v === "none" ? "" : v)}
                >
                  <SelectTrigger id="us-student" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    <SelectItem value="none">{t.users.none}</SelectItem>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.admNo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="us-status">{t.users.status}</Label>
              <Select
                items={{ Active: t.users.active, Suspended: t.users.suspended }}
                value={form.status}
                onValueChange={v => set("status", v)}
              >
                <SelectTrigger id="us-status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{t.users.active}</SelectItem>
                  <SelectItem value="Suspended">{t.users.suspended}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t.users.cancel}</Button>
            <Button onClick={save} disabled={!form.fullName || !form.username}>{t.users.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
