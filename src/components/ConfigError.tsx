import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { ErrorState } from "./ErrorState";
import { config } from "../lib/config";

/** Shown instead of backend-powered pages when Supabase env vars are missing. */
export function ConfigError() {
  return (
    <ErrorState
      title="Backend not configured"
      message={`Missing environment variable${config.missing.length > 1 ? "s" : ""}: ${config.missing.join(", ")}. Copy .env.example to .env, fill in your Supabase project URL and publishable key, then restart the dev server.`}
    >
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/demo" className="btn-primary"><Settings className="h-4 w-4" aria-hidden /> TRY THE SIMULATION INSTEAD</Link>
        <Link to="/" className="btn-secondary">BACK TO HOME</Link>
      </div>
    </ErrorState>
  );
}

