const styles: Record<string, string> = {
  on_track: "bg-teal/10 text-teal-dark",
  needs_attention: "bg-amber/15 text-amber-dark",
  complete: "bg-teal/10 text-teal-dark",
  new: "bg-line text-charcoal/70",
};

const labels: Record<string, string> = {
  on_track: "On track",
  needs_attention: "Needs attention",
  complete: "Complete",
  new: "New",
};

export default function StatusBadge({ status }: { status: keyof typeof styles }) {
  return (
    <span className={`text-[10px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
