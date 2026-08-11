import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function IconButton({
  children,
  label,
  active,
  tone = "ghost",
  onClick,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  tone?: "ghost" | "primary" | "accent";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-md border border-transparent transition-colors",
        tone === "ghost" &&
          "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        tone === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        tone === "accent" && "bg-accent text-accent-foreground hover:opacity-90",
        active && tone === "ghost" && "border-border bg-surface-2 text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function Meter({
  label,
  value,
  suffix = "%",
  tone = "primary",
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: "primary" | "accent" | "success";
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="mono shrink-0 text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            tone === "primary" && "bg-primary",
            tone === "accent" && "bg-accent",
            tone === "success" && "bg-success",
          )}
          style={{ width: `${Math.min(100, Math.max(2, value))}%` }}
        />
      </div>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="truncate text-[13px] font-semibold text-foreground">{children}</h3>
      {hint ? (
        <span className="mono shrink-0 text-[10px] tracking-widest text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
