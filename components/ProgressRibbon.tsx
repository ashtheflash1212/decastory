export default function ProgressRibbon({ current, total }: { current: number; total: number }) {
  const segments = Array.from({ length: total }, (_, i) => i + 1);
  const climaxBoundary = Math.ceil(total * 0.8);

  return (
    <div className="px-6 pt-5">
      <div className="flex gap-1">
        {segments.map((n) => {
          const passed = n <= current;
          const isBoundary = n === climaxBoundary;
          return (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-sm ${
                passed ? "gauge-tick--passed" : isBoundary ? "gauge-tick--boundary" : "gauge-tick"
              }`}
              title={`Slide ${n}${isBoundary ? " — climax threshold" : ""}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="font-mech text-[11px] text-muted">SLIDE {current}/{total}</span>
        <span className="font-mech text-[11px] text-muted">{Math.round((current / total) * 100)}% complete</span>
      </div>
    </div>
  );
}
