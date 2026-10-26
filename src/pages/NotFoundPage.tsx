import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-xl text-center">
      <p className="gradient-text font-display text-7xl font-bold">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary mt-6">BACK TO HOME</Link>
    </div>
  );
}

