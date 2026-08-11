import { useEffect, useState } from "react";

export type SystemStats = {
  /** استهلاك المعالج التقديري % */
  cpu: number;
  /** نسبة الذاكرة المستعملة من المتاحة للصفحة % */
  memoryPercent: number;
  /** إجمالي الرام المتاحة للجهاز (GB) */
  totalRamGB: number | null;
  /** الرام المستعملة تقديرياً (GB) */
  usedRamGB: number | null;
  /** استهلاك الصفحة الحالية (MB) */
  pageMB: number | null;
  /** حد الذاكرة المسموح للصفحة (MB) */
  limitMB: number | null;
  cores: number | null;
  supported: boolean;
};

type PerfMemory = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

const MB = 1024 * 1024;

export function useSystemStats(intervalMs = 1500): SystemStats {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    memoryPercent: 0,
    totalRamGB: null,
    usedRamGB: null,
    pageMB: null,
    limitMB: null,
    cores: null,
    supported: false,
  });

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    let fps = 60;

    const loop = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        fps = (frames * 1000) / (now - last);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const read = () => {
      const nav = navigator as Navigator & { deviceMemory?: number };
      const mem = (performance as Performance & { memory?: PerfMemory }).memory;

      const pageMB = mem ? mem.usedJSHeapSize / MB : null;
      const limitMB = mem ? mem.jsHeapSizeLimit / MB : null;
      const totalRamGB = nav.deviceMemory ?? null;
      const usedRamGB = pageMB != null && totalRamGB != null ? pageMB / 1024 : null;

      // تقدير حمل المعالج من انخفاض معدل الإطارات
      const cpu = Math.round(Math.min(100, Math.max(2, (1 - fps / 60) * 100)));

      setStats({
        cpu,
        memoryPercent:
          mem ? Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100) : 0,
        totalRamGB,
        usedRamGB,
        pageMB,
        limitMB,
        cores: nav.hardwareConcurrency ?? null,
        supported: Boolean(mem),
      });
    };

    read();
    const id = window.setInterval(read, intervalMs);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return stats;
}
