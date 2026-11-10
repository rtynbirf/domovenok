"use client";

// Компонент-спидометр «Индекса порядка дома»: SVG-полукруг с анимацией.
import { motion } from "framer-motion";
import { homeIndexVerdict } from "@/lib/home-index";

function scoreColor(score: number): { stroke: string; text: string } {
  if (score >= 75) return { stroke: "#10b981", text: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 50) return { stroke: "#f59e0b", text: "text-amber-600 dark:text-amber-400" };
  return { stroke: "#f43f5e", text: "text-rose-600 dark:text-rose-400" };
}

export function HomeGauge({ score }: { score: number }) {
  // Полукруг: длина дуги = π * r
  const r = 80;
  const arc = Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = arc * (1 - clamped / 100);
  const { stroke, text } = scoreColor(clamped);
  const verdict = homeIndexVerdict(clamped);

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Индекс порядка дома: ${clamped} из 100`}>
      <svg viewBox="0 0 200 112" className="w-full max-w-56" aria-hidden="true">
        <path
          d={`M 20 100 A ${r} ${r} 0 0 1 180 100`}
          fill="none"
          stroke="currentColor"
          className="text-muted/60"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <motion.path
          d={`M 20 100 A ${r} ${r} 0 0 1 180 100`}
          fill="none"
          stroke={stroke}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ strokeDasharray: arc, strokeDashoffset: arc }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
        />
      </svg>
      <div className="-mt-10 flex flex-col items-center gap-1">
        <span className={`text-5xl font-bold tabular-nums ${text}`}>{clamped}</span>
        <span className="text-xs text-muted-foreground">из 100</span>
      </div>
      <p className="mt-3 text-lg font-semibold">
        <span aria-hidden="true">{verdict.emoji}</span> {verdict.label}
      </p>
    </div>
  );
}
