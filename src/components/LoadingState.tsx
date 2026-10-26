export function LoadingState({ rows = 3, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-4">
      <div className="skeleton h-10 w-2/3" />
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-16 w-full" />)}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

