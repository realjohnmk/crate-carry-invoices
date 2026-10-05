import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Shell({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="font-display text-xl font-extrabold tracking-tight">{title}</h1>
        {action}
      </header>
      <main className="space-y-4 p-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card">
        <div className="mx-auto grid max-w-2xl grid-cols-3 text-sm font-semibold">
          {[
            ["/", "Invoices"],
            ["/customers", "Customers"],
            ["/products", "Products"],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to as "/"}
              activeOptions={{ exact: to === "/" }}
              className="py-4 text-center text-muted-foreground"
              activeProps={{ className: "py-4 text-center text-primary border-t-2 border-primary" }}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring";
export const btn = "rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground active:scale-95 transition";
export const btnGhost = "rounded-md border px-3 py-2 font-semibold active:scale-95 transition";
export const card = "rounded-lg border bg-card p-4";

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "warn" | "good" }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-mono text-lg font-bold ${tone === "warn" ? "text-destructive" : tone === "good" ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}
