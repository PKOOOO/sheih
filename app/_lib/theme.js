// Shared color palette + style-object factory, extracted from App() in index.jsx.
// `colors` was a plain constant; `css` depended only on `colors` and `dir`, so it is
// exposed here as a factory `makeCss(dir, isMobile)` that every view can call/receive
// as a prop. Passing `isMobile` (see _lib/useIsMobile.js) makes the shared styles
// responsive without every view having to know about breakpoints.
export const colors = {
  primary: "#1c3d2e",
  gold: "#c9a84c",
  light: "#f5f0e8",
  white: "#fff",
  border: "#e2d9c8",
  text: "#1a1a1a",
  muted: "#6b7280",
  danger: "#dc2626",
};

export const SIDEBAR_WIDTH = 230;
export const DRAWER_WIDTH = 264;

export function makeCss(dir, isMobile = false, navOpen = false) {
  const rtl = dir === "rtl";
  // Off-canvas direction: the drawer slides in from the inline-start edge, which
  // flips with the language.
  const hidden = rtl ? "translateX(100%)" : "translateX(-100%)";

  return {
    app: {
      display: "flex",
      // dvh tracks mobile browser chrome (address bar) so the shell never gets
      // clipped or leaves a dead strip at the bottom.
      height: isMobile ? "100dvh" : "100vh",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      background: colors.light,
      direction: dir,
      overflow: "hidden",
    },
    sidebar: isMobile
      ? {
          position: "fixed",
          insetBlock: 0,
          [rtl ? "right" : "left"]: 0,
          width: DRAWER_WIDTH,
          maxWidth: "85vw",
          background: colors.primary,
          display: "flex",
          flexDirection: "column",
          zIndex: 900,
          transform: navOpen ? "translateX(0)" : hidden,
          transition: "transform .22s ease",
          boxShadow: navOpen ? "0 0 40px rgba(0,0,0,.35)" : "none",
        }
      : {
          width: SIDEBAR_WIDTH,
          background: colors.primary,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        },
    sidebarBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.45)",
      zIndex: 890,
      opacity: navOpen ? 1 : 0,
      pointerEvents: navOpen ? "auto" : "none",
      transition: "opacity .22s ease",
    },
    hamburger: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 38,
      height: 38,
      flexShrink: 0,
      borderRadius: 8,
      border: `1px solid ${colors.border}`,
      background: colors.white,
      color: colors.primary,
      fontSize: 18,
      lineHeight: 1,
      cursor: "pointer",
      padding: 0,
    },
    sidebarTop: { padding: "20px 20px 16px", borderBottom: `1px solid rgba(255,255,255,.1)`, display: "flex", alignItems: "center", gap: 10 },
    sidebarLogo: { width: 42, height: 42, borderRadius: 8, background: "#fff", flexShrink: 0, objectFit: "contain", padding: 2 },
    sidebarTitle: { color: colors.gold, fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.3 },
    sidebarSub: { color: "rgba(255,255,255,.5)", fontSize: 10, marginTop: 3 },
    navScroll: { padding: "12px 0", flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" },
    navItem: (active) => ({
      display: "flex", alignItems: "center", gap: 10,
      // Roomier tap target on touch screens.
      padding: isMobile ? "13px 20px" : "10px 20px",
      cursor: "pointer",
      color: active ? colors.gold : "rgba(255,255,255,.75)", background: active ? "rgba(201,168,76,.12)" : "transparent",
      borderLeft: `3px solid ${active ? colors.gold : "transparent"}`, fontSize: 14, transition: "all .15s",
      userSelect: "none",
    }),
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
    topbar: {
      background: colors.white, borderBottom: `1px solid ${colors.border}`,
      padding: isMobile ? "0 12px" : "0 28px",
      height: isMobile ? 54 : 56,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: isMobile ? 8 : 0,
      flexShrink: 0,
    },
    pageTitle: {
      fontSize: isMobile ? 15 : 18, fontWeight: 700, color: colors.primary, margin: 0,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    },
    content: {
      flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
      // Safety net for any wide element that isn't inside a scrollable card.
      overflowX: "auto",
      padding: isMobile ? 14 : 28,
    },
    card: {
      background: colors.white, borderRadius: 10, border: `1px solid ${colors.border}`,
      padding: isMobile ? 16 : 24,
      marginBottom: isMobile ? 14 : 20,
      // Lets wide tables scroll inside the card instead of blowing out the page.
      overflowX: "auto",
    },
    btn: (variant = "primary") => ({
      padding: isMobile ? "10px 16px" : "8px 18px",
      borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
      background: variant === "primary" ? colors.primary : variant === "gold" ? colors.gold : variant === "danger" ? colors.danger : "#f3f4f6",
      color: variant === "ghost" ? colors.text : "#fff", transition: "opacity .15s",
    }),
    // 16px font on mobile stops iOS Safari from auto-zooming on focus.
    input: { width: "100%", padding: isMobile ? "10px 12px" : "8px 12px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: isMobile ? 16 : 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    select: { width: "100%", padding: isMobile ? "10px 12px" : "8px 12px", border: `1px solid ${colors.border}`, borderRadius: 6, fontSize: isMobile ? 16 : 14, outline: "none", background: "#fff", boxSizing: "border-box", fontFamily: "inherit" },
    label: { display: "block", fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 },
    grid2: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 },
    grid3: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: isMobile ? 12 : 16 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 13 : 14 },
    th: {
      textAlign: rtl ? "right" : "left", padding: isMobile ? "9px 10px" : "10px 12px",
      background: colors.light, color: colors.muted, fontWeight: 600, fontSize: 12,
      textTransform: "uppercase", letterSpacing: .5, borderBottom: `2px solid ${colors.border}`,
      // On mobile this keeps columns legible; the card scrolls horizontally
      // instead of squashing every cell into unreadable slivers.
      whiteSpace: isMobile ? "nowrap" : "normal",
    },
    td: {
      padding: isMobile ? "9px 10px" : "10px 12px", borderBottom: `1px solid ${colors.border}`,
      color: colors.text, verticalAlign: "middle",
      whiteSpace: isMobile ? "nowrap" : "normal",
    },
    badge: (color, bg) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color, background: bg }),
    statCard: (accent) => ({ background: colors.white, borderRadius: 10, border: `1px solid ${colors.border}`, padding: isMobile ? 14 : 20, display: "flex", flexDirection: "column", gap: 8, borderTop: `3px solid ${accent}` }),
    statsGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, 1fr)",
      gap: isMobile ? 10 : 16,
      marginBottom: isMobile ? 14 : 20,
    },
    modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 16 },
    modalBox: {
      background: colors.white,
      borderRadius: isMobile ? "14px 14px 0 0" : 12,
      width: "100%", maxWidth: 560,
      maxHeight: isMobile ? "92dvh" : "90vh",
      overflowY: "auto", WebkitOverflowScrolling: "touch",
      padding: isMobile ? 18 : 28,
      boxShadow: "0 8px 40px rgba(0,0,0,.2)",
    },
    modalTitle: { fontSize: isMobile ? 16 : 18, fontWeight: 700, color: colors.primary, marginBottom: isMobile ? 14 : 20 },
    formRow: { marginBottom: 14 },
    formActions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20, justifyContent: "flex-end" },
    // Generic responsive toolbar: filter/search/button rows that must wrap on small screens.
    toolbar: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: isMobile ? 8 : 12 },
    levelPill: (level, active) => ({
      padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer",
      background: active ? (level === "junior" ? "#0c5460" : colors.primary) : "#f3f4f6",
      color: active ? "#fff" : colors.muted, border: "none",
    }),
  };
}
