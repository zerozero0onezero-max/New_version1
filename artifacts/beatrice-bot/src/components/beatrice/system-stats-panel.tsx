import { Cpu, HardDrive, MemoryStick, Layers } from "lucide-react";
import { Meter, SectionTitle } from "@/components/beatrice/primitives";
import { useSystemStats } from "@/hooks/use-system-stats";

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-2.5 py-2">
      <Icon className="h-4 w-4 shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{label}</span>
      <span className="mono shrink-0 text-[11px] text-foreground" dir="ltr">
        {value}
      </span>
    </div>
  );
}

export function SystemStatsPanel() {
  const s = useSystemStats();

  const fmtGB = (v: number | null) => (v == null ? "—" : `${v.toFixed(2)} GB`);
  const fmtMB = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)} MB`);

  return (
    <div>
      <SectionTitle hint="LIVE">استهلاك النظام</SectionTitle>
      <div className="grid gap-3">
        <Meter label="المعالج (تقديري)" value={s.cpu} />
        <Meter label="الذاكرة المستهلكة" value={s.memoryPercent} tone="accent" />
      </div>

      <div className="mt-3 grid gap-1.5">
        <Stat icon={HardDrive} label="مساحة الرام الكلية" value={fmtGB(s.totalRamGB)} />
        <Stat icon={MemoryStick} label="الرام المستعملة" value={fmtGB(s.usedRamGB)} />
        <Stat icon={Layers} label="استهلاك الصفحة" value={fmtMB(s.pageMB)} />
        <Stat icon={Cpu} label="أنوية المعالج" value={s.cores ? `${s.cores}` : "—"} />
      </div>

      {!s.supported ? (
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          بعض القيم غير متاحة في هذا المتصفح (قياس الذاكرة مدعوم في المتصفحات المبنية على
          Chromium).
        </p>
      ) : null}
    </div>
  );
}
