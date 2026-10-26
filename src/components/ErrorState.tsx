import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { title?: string; message: string; onRetry?: () => void; children?: ReactNode }

export function ErrorState({ title = "Something went wrong", message, onRetry, children }: Props) {
  return (
    <div role="alert" className="card border-rose-400/30 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" aria-hidden />
      <h2 className="mt-4 font-display text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-300">{message}</p>
      {onRetry && (
        <button className="btn-primary mt-6" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden /> TRY AGAIN
        </button>
      )}
      {children}
    </div>
  );
}

