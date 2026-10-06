import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell, Stat, card } from "@/components/Shell";
import { customerTotals, invoiceTotals, naira, useStore } from "@/lib/store";

export const Route = createFileRoute("/customer/$id")({
  head: () => ({
    meta: [
      { title: "Customer account — Crate Ledger" },
      { name: "description", content: "Amount owed, payments, outstanding crates and invoice history." },
      { property: "og:title", content: "Customer account — Crate Ledger" },
      { property: "og:description", content: "Amount owed, payments, outstanding crates and invoice history." },
    ],
  }),
  component: CustomerPage,
});

function CustomerPage() {
  const { id } = Route.useParams();
  const s = useStore();
  const c = s.customers.find((x) => x.id === id);
  if (!c) return <Shell title="Customer"><p className="text-muted-foreground">Not found.</p></Shell>;
  const t = customerTotals(s, id);
  return (
    <Shell title={c.name}>
      {c.phone && <a href={`tel:${c.phone}`} className="text-sm text-primary underline">{c.phone}</a>}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Amount owed" value={naira(t.balance)} tone={t.balance > 0 ? "warn" : "good"} />
        <Stat label="Total payments" value={naira(t.paid)} tone="good" />
        {t.credit > 0 && <Stat label="We owe them (change)" value={naira(t.credit)} tone="warn" />}
        <Stat label="Crates outstanding" value={t.outstanding} tone={t.outstanding > 0 ? "warn" : undefined} />
        <Stat label="Missing bottles" value={t.missing} tone={t.missing > 0 ? "warn" : undefined} />
      </div>
      <h2 className="font-display text-lg font-bold">Invoice history</h2>
      {t.invoices.length === 0 && <p className="text-muted-foreground">No invoices.</p>}
      {t.invoices.map((inv) => {
        const it = invoiceTotals(inv);
        return (
          <Link key={inv.id} to="/invoice/$id" params={{ id: inv.id }} className={card + " block"}>
            <div className="flex justify-between font-semibold">
              <span>#{inv.number} · {new Date(inv.date).toLocaleDateString()}</span>
              <span className="font-mono">{naira(it.total)}</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Paid {naira(it.paid)} · {it.balance < 0 ? `We owe ${naira(-it.balance)}` : `Balance ${naira(it.balance)}`} · {it.outstanding} crates out · {it.missing} missing
            </div>
          </Link>
        );
      })}
    </Shell>
  );
}
