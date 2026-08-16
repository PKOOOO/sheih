import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// CBC level chip (EE1, ME2, …). The colours are *data*, not design tokens —
// admins edit them in Grade Scale Settings and they are stored per school — so
// they arrive as hex on the grade object and are applied inline rather than
// through a Tailwind class.
export default function CbcBadge({ level, showLabel = false, className, ...props }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge
      variant="secondary"
      // Print keeps background colours; see the print block in globals.css.
      style={{ color: level.color, backgroundColor: level.bg }}
      className={cn("border-transparent font-bold", className)}
      {...props}
    >
      {showLabel ? `${level.code} — ${level.label}` : level.code}
    </Badge>
  );
}
