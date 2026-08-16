"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Junior/Senior selector. Used both as a single-choice filter (`multiple={false}`,
// the common case) and as a multi-select for "which levels does this subject
// belong to". Junior keeps its teal identity; senior uses the brand green.
const LEVEL_ACTIVE = {
  junior: "bg-[#0c5460] text-white hover:bg-[#0c5460]/90",
  senior: "bg-primary text-primary-foreground hover:bg-primary/90",
};

export default function LevelToggle({ t, value, onChange, multiple = false, className }) {
  const selected = multiple ? value : [value];

  const isOn = (lv) => selected.includes(lv);
  const toggle = (lv) => {
    if (!multiple) return onChange(lv);
    onChange(isOn(lv) ? selected.filter(x => x !== lv) : [...selected, lv]);
  };

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      className={cn("flex gap-2", className)}
    >
      {["junior", "senior"].map(lv => (
        <Button
          key={lv}
          type="button"
          variant={isOn(lv) ? "default" : "secondary"}
          role={multiple ? undefined : "radio"}
          aria-checked={multiple ? undefined : isOn(lv)}
          aria-pressed={multiple ? isOn(lv) : undefined}
          onClick={() => toggle(lv)}
          className={cn("flex-1 rounded-full", isOn(lv) && LEVEL_ACTIVE[lv])}
        >
          {t.dashboard[lv]}
        </Button>
      ))}
    </div>
  );
}
