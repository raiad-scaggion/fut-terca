import type { ReactNode } from "react";

type PageProps = {
  title: string;
  subtitle?: string;
  info?: ReactNode;
  children: ReactNode;
};

export function Page({ title, subtitle, info, children }: PageProps) {
  return (
    <section className="page">
      <header className="page__header">
        <div className="page__title-row">
          <h1 className="page__title">{title}</h1>
          {info}
        </div>
        {subtitle && <p className="page__subtitle">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
