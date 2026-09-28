import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";
import "../character-selection.css";

export function StorybookShell({ title, subtitle, mode = "host", actions, children }: PropsWithChildren<{
  title: string;
  subtitle: string;
  mode?: "host" | "player" | "gallery";
  actions?: ReactNode;
}>) {
  return (
    <main className={`storybook storybook--${mode}`}>
      <div className="storybook__landscape" aria-hidden="true"><i /><i /><i /></div>
      <header className="storybook__topbar">
        <Link to="/" className="storybook__brand">HÀNH TRÌNH LIÊN MINH</Link>
        {actions}
      </header>
      <section className="storybook__heading">
        <span className="storybook__ornament" aria-hidden="true">✦</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </section>
      {children}
    </main>
  );
}
