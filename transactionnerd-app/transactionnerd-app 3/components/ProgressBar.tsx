export default function ProgressBar({ percent, color = "bg-teal" }: { percent: number; color?: string }) {
  return (
    <div className="bg-line rounded-sm h-1.5 overflow-hidden">
      <div className={`${color} h-full rounded-sm transition-all`} style={{ width: `${percent}%` }} />
    </div>
  );
}
