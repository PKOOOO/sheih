"use client";
import { useState } from "react";
import { LOGO_SRC } from "../../_lib/logo";
import { SCHOOL_NAMES } from "../../_lib/i18n";
import { useIsMobile } from "../../_lib/useIsMobile";
import LangSwitch from "../LangSwitch";

// Login screen, extracted from App() in index.jsx.
export default function LoginScreen({ t, dir, lang, setLang, colors, css, users, setCurrentUser, setPage }) {
  const isMobile = useIsMobile();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const demoAccounts = [
    { role: "admin", label: t.users.roles.admin, color: "#7f1d1d", bg: "#fee2e2" },
    { role: "registrar", label: t.users.roles.registrar, color: "#1e3a8a", bg: "#dbeafe" },
    { role: "teacher", label: t.users.roles.teacher, color: "#14532d", bg: "#dcfce7" },
    { role: "examOfficer", label: t.users.roles.examOfficer, color: "#854d0e", bg: "#fef9c3" },
    { role: "parent", label: t.users.roles.parent, color: "#581c87", bg: "#f3e8ff" },
  ];

  const attemptLogin = (uname, pwd) => {
    const user = users.find(u => u.username.toLowerCase() === uname.toLowerCase() && u.password === pwd);
    if (!user) { setError(t.login.invalidCreds); return; }
    if (user.status !== "Active") { setError(t.login.accountSuspended); return; }
    setError("");
    setCurrentUser(user);
    setPage(user.role === "parent" ? "myResults" : "dashboard");
  };

  const fillDemo = (role) => {
    const u = users.find(x => x.role === role);
    if (!u) return;
    setUsername(u.username);
    setPassword(u.password);
    attemptLogin(u.username, u.password);
  };

  return (
    <div style={{
      minHeight: isMobile ? "100dvh" : "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, ${colors.primary} 0%, #0e2118 100%)`,
      fontFamily: "'Segoe UI', Arial, sans-serif", direction: dir, padding: isMobile ? 12 : 20,
    }}>
      {/* Two panels side by side on desktop; stacked with a compact brand header on mobile. */}
      <div style={{ width: "100%", maxWidth: 880, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        {/* Brand panel */}
        <div style={{
          background: `linear-gradient(160deg, ${colors.primary}, #0e2118)`,
          padding: isMobile ? "26px 20px" : "48px 36px", display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", textAlign: "center", color: "#fff",
        }}>
          <img src={LOGO_SRC} alt="School Logo" style={{ width: isMobile ? 72 : 120, height: isMobile ? 72 : 120, objectFit: "contain", background: "#fff", borderRadius: 16, padding: 8, marginBottom: isMobile ? 14 : 20 }} />
          <div style={{ fontWeight: 800, fontSize: isMobile ? 13 : 15, color: colors.gold, lineHeight: 1.5, letterSpacing: .3 }}>
            {SCHOOL_NAMES.junior[lang]}
          </div>
          <div style={{ width: 40, height: 2, background: colors.gold, margin: isMobile ? "9px 0" : "12px 0" }} />
          <div style={{ fontWeight: 800, fontSize: isMobile ? 13 : 15, color: colors.gold, lineHeight: 1.5, letterSpacing: .3 }}>
            {SCHOOL_NAMES.senior[lang]}
          </div>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: 12, marginTop: isMobile ? 14 : 20 }}>{t.appSubtitle}</p>
        </div>

        {/* Login form panel */}
        <div style={{ background: "#fff", padding: isMobile ? "26px 20px" : "40px 36px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, color: colors.primary, fontSize: 22 }}>{t.login.title}</h2>
            <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{t.login.subtitle}</p>
          </div>

          {error && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={css.formRow}>
            <label style={css.label}>{t.login.username}</label>
            <input style={css.input} value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && attemptLogin(username, password)} placeholder="e.g. admin" />
          </div>
          <div style={css.formRow}>
            <label style={css.label}>{t.login.password}</label>
            <input type="password" style={css.input} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && attemptLogin(username, password)} placeholder="••••••••" />
          </div>
          <button style={{ ...css.btn(), width: "100%", padding: "10px 18px", fontSize: 14, marginTop: 6 }} onClick={() => attemptLogin(username, password)}>
            {t.login.signIn}
          </button>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary, marginBottom: 4 }}>{t.login.demoTitle}</div>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 10 }}>{t.login.demoHint}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {demoAccounts.map(d => (
                <button key={d.role} onClick={() => fillDemo(d.role)} style={{
                  padding: "4px 10px", borderRadius: 14, border: "none", fontSize: 11, fontWeight: 700,
                  color: d.color, background: d.bg, cursor: "pointer",
                }}>{d.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            <LangSwitch lang={lang} setLang={setLang} colors={colors} />
          </div>
        </div>
      </div>
    </div>
  );
}
