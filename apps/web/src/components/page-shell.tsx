import type { PropsWithChildren, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface PageShellProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  className?: string | undefined;
  compact?: boolean;
  mode?: "host" | "player";
}

export function PageShell({ title, subtitle, actions, className, compact = false, mode, children }: PageShellProps) {
  const { pathname } = useLocation();
  const resolvedMode = mode ?? (pathname.startsWith("/join") || pathname.startsWith("/play/") ? "player" : "host");

  return (
    <main className={`page-shell page-shell--${resolvedMode}${compact ? " page-shell--compact" : ""}${className ? ` ${className}` : ""}`}>
      <header className="topbar">
        <Link className="wordmark" to="/">
          HÀNH TRÌNH LIÊN MINH
        </Link>
        {actions}
      </header>
      <section className="page-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>
      {children}
    </main>
  );
}
