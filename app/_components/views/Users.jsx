"use client";
import { useState } from "react";
import { uid } from "../../_lib/storage";

// User accounts & access levels view, extracted from App() in index.jsx.
export default function Users({
  t, lang, colors, css, users, setUsers, students, teachers, showToast, showConfirm,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const blank = { fullName: "", username: "", email: "", password: "", role: "teacher", status: "Active", linkedTeacherId: "", linkedStudentId: "" };
  const [form, setForm] = useState(blank);

  const roleKeys = ["admin", "registrar", "teacher", "examOfficer", "viewer", "parent"];
  const roleColors = {
    admin: ["#7f1d1d", "#fee2e2"],
    registrar: ["#1e3a8a", "#dbeafe"],
    teacher: ["#14532d", "#dcfce7"],
    examOfficer: ["#854d0e", "#fef9c3"],
    viewer: ["#374151", "#f3f4f6"],
    parent: ["#581c87", "#f3e8ff"],
  };

  const filtered = users.filter(u => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setForm(blank); setEditId(null); setShowForm(true); };
  const openEdit = (u) => { setForm({ ...u, password: "" }); setEditId(u.id); setShowForm(true); };
  const save = () => {
    if (!form.fullName || !form.username) return;
    const dup = users.find(u => u.username.toLowerCase() === form.username.toLowerCase() && u.id !== editId);
    if (dup) { showToast(lang === "ar" ? "اسم المستخدم مستخدم بالفعل" : "Username already exists"); return; }
    const payload = { ...form, password: form.password || (editId ? users.find(u => u.id === editId).password : "changeme123") };
    if (editId) setUsers(p => p.map(u => u.id === editId ? { ...payload, id: editId } : u));
    else setUsers(p => [...p, { ...payload, id: uid() }]);
    setShowForm(false); showToast(t.saved);
  };
  const del = (id) => { showConfirm(t.confirm, () => { setUsers(p => p.filter(u => u.id !== id)); showToast(t.deleted); }, { danger: true }); };
  const toggleStatus = (u) => setUsers(p => p.map(x => x.id === u.id ? { ...x, status: x.status === "Active" ? "Suspended" : "Active" } : x));
  const resetPassword = (u) => { showToast(lang === "ar" ? `تم إرسال رابط إعادة التعيين إلى ${u.email}` : `Password reset link sent to ${u.email}`); };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: colors.primary }}>{t.users.title}</h2>
        <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{t.users.subtitle}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <input style={{ ...css.input, flex: "1 1 220px", minWidth: 150, width: "auto" }} placeholder={t.users.search} value={search} onChange={e => setSearch(e.target.value)} />
        <button style={css.btn()} onClick={openAdd}>+ {t.users.addUser}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginBottom: 20 }}>
        {roleKeys.map(rk => {
          const [c, bg] = roleColors[rk];
          return (
            <div key={rk} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${c}22` }}>
              <div style={{ fontWeight: 700, color: c, fontSize: 13 }}>{t.users.roles[rk]}</div>
              <div style={{ fontSize: 11, color: c, marginTop: 4, lineHeight: 1.4 }}>{t.users.roleDesc[rk]}</div>
            </div>
          );
        })}
      </div>

      <div style={css.card}>
        {filtered.length === 0 ? (
          <p style={{ color: colors.muted, textAlign: "center", padding: "40px 0" }}>{t.users.noUsers}</p>
        ) : (
          <table style={css.table}>
            <thead>
              <tr>
                {[t.users.fullName, t.users.username, t.users.email, t.users.role, t.users.status, t.actions].map(h => <th key={h} style={css.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const [c, bg] = roleColors[u.role] || roleColors.viewer;
                const linkedStudent = u.role === "parent" ? students.find(s => s.id === u.linkedStudentId) : null;
                return (
                  <tr key={u.id}>
                    <td style={css.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: colors.primary, color: colors.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          {u.fullName}
                          {linkedStudent && <div style={{ fontSize: 11, color: colors.muted }}>Child: {linkedStudent.name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={css.td}><code style={{ fontSize: 13 }}>{u.username}</code></td>
                    <td style={css.td}>{u.email}</td>
                    <td style={css.td}><span style={css.badge(c, bg)}>{t.users.roles[u.role]}</span></td>
                    <td style={css.td}>
                      <span
                        onClick={() => toggleStatus(u)}
                        style={{ ...css.badge(u.status === "Active" ? "#166534" : "#991b1b", u.status === "Active" ? "#dcfce7" : "#fee2e2"), cursor: "pointer" }}
                        title="Click to toggle"
                      >
                        {u.status === "Active" ? t.users.active : t.users.suspended}
                      </span>
                    </td>
                    <td style={css.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{ ...css.btn("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(u)}>✏️</button>
                        <button style={{ ...css.btn("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => resetPassword(u)} title={t.users.resetPassword}>🔑</button>
                        <button style={{ ...css.btn("danger"), padding: "4px 10px", fontSize: 12 }} onClick={() => del(u.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div style={css.modal} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={css.modalBox}>
            <div style={css.modalTitle}>{editId ? t.users.edit : t.users.addUser}</div>
            <div style={css.grid2}>
              <div style={css.formRow}>
                <label style={css.label}>{t.users.fullName}</label>
                <input style={css.input} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.users.username}</label>
                <input style={css.input} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.users.email}</label>
                <input type="email" style={css.input} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div style={css.formRow}>
                <label style={css.label}>{t.users.password}</label>
                <input type="password" style={css.input} value={form.password} placeholder={editId ? "Leave blank to keep current" : ""} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              </div>
            </div>
            <div style={css.formRow}>
              <label style={css.label}>{t.users.role}</label>
              <select style={css.select} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                {roleKeys.map(rk => <option key={rk} value={rk}>{t.users.roles[rk]}</option>)}
              </select>
              <div style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>{t.users.roleDesc[form.role]}</div>
            </div>
            {form.role === "teacher" && (
              <div style={css.formRow}>
                <label style={css.label}>{t.users.linkedTeacher}</label>
                <select style={css.select} value={form.linkedTeacherId} onChange={e => setForm(p => ({ ...p, linkedTeacherId: e.target.value }))}>
                  <option value="">{t.users.none}</option>
                  {teachers.map(tc => <option key={tc.id} value={tc.id}>{tc.name} ({tc.staffId})</option>)}
                </select>
              </div>
            )}
            {form.role === "parent" && (
              <div style={css.formRow}>
                <label style={css.label}>{t.users.linkedStudent}</label>
                <select style={css.select} value={form.linkedStudentId} onChange={e => setForm(p => ({ ...p, linkedStudentId: e.target.value }))}>
                  <option value="">{t.users.none}</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admNo})</option>)}
                </select>
              </div>
            )}
            <div style={css.formRow}>
              <label style={css.label}>{t.users.status}</label>
              <select style={css.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="Active">{t.users.active}</option>
                <option value="Suspended">{t.users.suspended}</option>
              </select>
            </div>
            <div style={css.formActions}>
              <button style={css.btn("ghost")} onClick={() => setShowForm(false)}>{t.users.cancel}</button>
              <button style={css.btn()} onClick={save}>{t.users.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
