import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, MousePointerClick, MoveRight, Send, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type ElKind = "heading" | "text" | "button" | "link" | "input";

export const KIND_LABEL: Record<ElKind, string> = {
  heading: "عنوان",
  text: "نص",
  button: "زر",
  link: "رابط",
  input: "حقل كتابة",
};

export type TargetPoint = { x: number; y: number };

/** نقطة صفراء تشير إلى مكان التأثير داخل لقطة الشاشة — قابلة للتمرير */
export function TargetDot({
  point,
  confirmed,
  label,
  onDrag,
  onDragEnd,
}: {
  point: TargetPoint;
  confirmed?: boolean;
  label?: string;
  onDrag?: (p: TargetPoint) => void;
  onDragEnd?: (p: TargetPoint) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const holderRef = useRef<HTMLSpanElement>(null);

  const relative = (e: React.PointerEvent): TargetPoint | null => {
    const parent = holderRef.current?.parentElement;
    if (!parent) return null;
    const r = parent.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    };
  };

  return (
    <span
      ref={holderRef}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      <span
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          if (!onDrag) return;
          e.stopPropagation();
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!dragging || !onDrag) return;
          const p = relative(e);
          if (p) onDrag(p);
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          setDragging(false);
          const p = relative(e);
          if (p) onDragEnd?.(p);
        }}
        className={cn(
          "block h-4 w-4 rounded-full bg-warning ring-4 ring-warning/30",
          onDrag ? "cursor-grab touch-none" : "pointer-events-none",
          dragging && "cursor-grabbing scale-110",
          !confirmed && !dragging && "animate-pulse",
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute right-1/2 top-5 translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px]",
          confirmed && !dragging
            ? "bg-warning text-black"
            : "border border-warning/60 bg-black/70 text-warning",
        )}
        dir="ltr"
      >
        {label ?? `${Math.round(point.x)}% , ${Math.round(point.y)}%`}
      </span>
    </span>
  );
}


/** مؤشر كتابة يقفز داخل حقل الكتابة */
export function Caret() {
  return (
    <span className="mr-0.5 inline-block h-[1.1em] w-[2px] animate-[blink_1s_steps(1)_infinite] bg-black/70 align-middle" />
  );
}

/** لوحة صغيرة تظهر عند الضغط على لقطة الشاشة */
export function ClickActionCard({
  point,
  pixel,
  onMove,
  onSend,
  onClose,
}: {
  point: TargetPoint;
  pixel: TargetPoint;
  onMove: () => void;
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  return (
    <div
      className={cn(
        "absolute z-30 w-[196px] rounded-lg border border-border bg-popover p-2 shadow-lg",
      )}
      style={{
        left: `${clamp(point.x, 28, 72)}%`,
        top: `${clamp(point.y + 3, 3, 72)}%`,
        marginLeft: -98,
      }}
      dir="rtl"
    >
      <div className="mb-2 flex items-center justify-between gap-1">
        <span className="mono text-[10px] text-warning" dir="ltr">
          X {Math.round(pixel.x)} · Y {Math.round(pixel.y)}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1 text-[11px] text-muted-foreground hover:text-foreground"
          aria-label="إغلاق"
        >
          ✕
        </button>
      </div>

      <button
        type="button"
        onClick={onMove}
        className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90"
      >
        <MousePointerClick className="h-3.5 w-3.5" />
        نقر هنا
      </button>


      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) onSend(text.trim());
          }}
          placeholder="نص لإدخاله هنا"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-[11px] outline-none focus:border-ring"
        />
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => onSend(text.trim())}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground disabled:opacity-40"
          aria-label="إرسال النص"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** إدخال الإحداثيات يدوياً: تحديد ثم تأكيد */
export function CoordinateTargeting({
  max,
  onMark,
  onConfirm,
  marked,
}: {
  max: TargetPoint;
  onMark: (p: TargetPoint) => void;
  onConfirm: () => void;
  marked: boolean;
}) {
  const [x, setX] = useState("");
  const [y, setY] = useState("");

  const valid = x !== "" && y !== "" && Number(x) >= 0 && Number(y) >= 0;

  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["X", x, setX, max.x],
            ["Y", y, setY, max.y],
          ] as const
        ).map(([label, value, set, limit]) => (
          <label key={label} className="flex items-center gap-1.5">
            <span className="mono w-3 text-[11px] text-accent">{label}</span>
            <input
              type="number"
              min={0}
              max={limit}
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={`0-${limit}`}
              className="mono min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-[11px] outline-none focus:border-ring"
              dir="ltr"
            />
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          disabled={!valid}
          onClick={() =>
            onMark({
              x: Math.min(Number(x), max.x),
              y: Math.min(Number(y), max.y),
            })
          }
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-warning/60 px-2 py-1.5 text-[11px] text-warning hover:bg-warning/10 disabled:opacity-40"
        >
          <Target className="h-3.5 w-3.5" />
          تحديد
        </button>
        <button
          type="button"
          disabled={!marked}
          onClick={onConfirm}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" />
          تأكيد
        </button>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Crosshair className="h-3 w-3 shrink-0" />
        النقطة الصفراء توضح مكان التأثير قبل التأكيد
      </p>
    </div>
  );
}

/** شريط كتابة يظهر عند اختيار حقل كتابة */
export function FieldComposer({
  value,
  onChange,
  onSend,
  onMoveOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onMoveOnly: () => void;
}) {
  return (
    <div className="mt-2 rounded-lg border border-accent/50 bg-accent/5 p-2.5">
      <p className="mb-2 text-[11px] text-muted-foreground">
        حقل كتابة نشط — المؤشر يقفز داخل الحقل
      </p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSend();
        }}
        placeholder="اكتب النص هنا"
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-[12px] outline-none focus:border-ring"
      />
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          disabled={!value.trim()}
          onClick={onSend}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-[11px] font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          إرسال
        </button>
        <button
          type="button"
          onClick={onMoveOnly}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <MoveRight className="h-3.5 w-3.5" />
          نقل بدون إرسال
        </button>
      </div>
    </div>
  );
}
