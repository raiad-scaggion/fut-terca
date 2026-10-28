import type { ReactNode } from "react";

type PageProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function Page({ title, subtitle, children }: PageProps) {
  return (
    <section className="page">
      <header className="page__header">
        <h1 className="page__title">{title}</h1>
        {subtitle && <p className="page__subtitle">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
