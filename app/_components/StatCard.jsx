import { Card, CardContent } from "@/components/ui/card";

// Headline figure with a coloured rule across the top. `accent` is a CSS colour
// (often brand or CBC-derived), so it is set inline rather than as a class.
export default function StatCard({ icon: Icon, label, value, accent = "var(--primary)" }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div aria-hidden="true" className="h-[3px] w-full" style={{ backgroundColor: accent }} />
      <CardContent className="flex flex-col gap-1.5 p-3.5 md:p-5">
        {Icon && <Icon className="size-6" style={{ color: accent }} aria-hidden="true" />}
        <p className="text-2xl font-extrabold text-primary md:text-3xl">{value}</p>
        <p className="text-[13px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
