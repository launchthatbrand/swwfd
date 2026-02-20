import type { ReactNode } from "react";

interface AdminPageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const AdminPageShell = ({
  title,
  description,
  actions,
  children,
}: AdminPageShellProps) => {
  return (
    <main className="container space-y-4 py-6">
      <section className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </section>
      {children}
    </main>
  );
};

