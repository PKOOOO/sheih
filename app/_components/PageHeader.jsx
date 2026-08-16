// Standard screen header: title on the start edge, actions on the end edge,
// wrapping onto its own line on narrow screens. `.print-hide` because none of
// these controls belong on a printed report.
export default function PageHeader({ title, description, children }) {
  return (
    <div className="print-hide flex flex-wrap items-center justify-between gap-2.5">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-primary">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
