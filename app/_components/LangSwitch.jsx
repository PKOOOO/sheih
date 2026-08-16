"use client";
import { Button } from "@/components/ui/button";

const LANGS = [
  { code: "en", label: "English" },
  { code: "ar", label: "عربي" },
];

// Small EN/AR language toggle. Rendered on the dark sidebar and on the light
// login card, so the inactive state stays transparent and inherits its border
// from whichever surface it sits on.
export default function LangSwitch({ lang, setLang, onSidebar = false }) {
  return (
    <div role="group" aria-label="Language" className="flex items-center gap-1.5">
      {LANGS.map(({ code, label }) => {
        const active = lang === code;
        return (
          <Button
            key={code}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            aria-pressed={active}
            onClick={() => setLang(code)}
            className={
              onSidebar && !active
                ? "border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/10 hover:text-gold"
                : undefined
            }
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
