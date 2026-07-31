import { seatsLeft, type ClassRecord } from "@/lib/classes";

export function StatusPill({ cls }: { cls: ClassRecord }) {
  const left = seatsLeft(cls);

  const { text, tone } = !cls.isOpen
    ? { text: "Closed", tone: "bg-surface-muted text-muted" }
    : left === 0
      ? { text: "Full", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" }
      : { text: "Open", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      {text}
    </span>
  );
}

export function SeatMeter({ cls }: { cls: ClassRecord }) {
  const left = seatsLeft(cls);
  const filled = cls.capacity > 0 ? (cls.applicantCount / cls.capacity) * 100 : 0;
  const pct = Math.min(100, Math.max(0, filled));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">
          {cls.applicantCount} of {cls.capacity} seats taken
        </span>
        <span
          className={
            left === 0
              ? "font-semibold text-amber-600 dark:text-amber-400"
              : "font-semibold text-foreground"
          }
        >
          {left === 0 ? "No seats left" : `${left} left`}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={cls.applicantCount}
        aria-valuemin={0}
        aria-valuemax={cls.capacity}
        aria-label="Seats taken"
      >
        <div
          className={`h-full rounded-full transition-all ${
            left === 0 ? "bg-amber-500" : "bg-brand"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
