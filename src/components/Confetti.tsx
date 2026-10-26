import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#2f7bff", "#8b5cf6", "#d946ef", "#22d3ee", "#facc15", "#34d399"];

export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      dur: 3 + Math.random() * 3,
      size: 6 + Math.random() * 8,
      rot: Math.random() * 720 - 360,
      color: COLORS[i % COLORS.length],
    })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block rounded-[2px]"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.6, background: p.color }}
          initial={{ y: -40, opacity: 1, rotate: 0 }}
          animate={{ y: "105vh", opacity: [1, 1, 0], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

