import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, btn, card, inputCls } from "@/components/Shell";
import { invoiceTotals, naira, setState, uid, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Invoices — Crate Ledger" },
      { name: "description", content: "Wholesale beverage invoices with crate returns and partial payments." },
      { property: "og:title", content: "Invoices — Crate Ledger" },
      { property: "og:description", content: "Wholesale beverage invoices with crate returns and partial payments." },
    ],
  }),
  component: Index,
});

function Index() {
  const s = useStore();
  const nav = useNavigate();
  const [cust, setCust] = useState("");
  const [newName, setNewName] = useState("");

  const create = () => {
    let customerId = cust;
    const name = newName.trim().slice(0, 80);
    if (!customerId && !name) return;
    const id = uid();
    setState((st) => {
      const customers = [...st.customers];
      if (!customerId) {
        customerId = uid();
        customers.push({ id: customerId, name, phone: "" });
      }
      const number = st.invoices.reduce((m, i) => Math.max(m, i.number), 0) + 1;
      return {
        ...st,
        customers,
        invoices: [{ id, number, customerId, date: new Date().toISOString(), lines: [], payments: [] }, ...st.invoices],
      };
    });
    nav({ to: "/invoice/$id", params: { id } });
  };

  return (
    <Shell title="Invoices">
      <div className={card + " space-y-3"}>
        <div className="font-semibold">New invoice</div>
        <select className={inputCls} value={cust} onChange={(e) => setCust(e.target.value)}>
          <option value="">+ New customer</option>
          {s.customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {!cust && (
          <input className={inputCls} placeholder="Customer name" value={newName} maxLength={80} onChange={(e) => setNewName(e.target.value)} />
        )}
        <button className={btn + " w-full"} onClick={create}>Create invoice</button>
      </div>

      {s.invoices.length === 0 && <p className="text-center text-muted-foreground">No invoices yet.</p>}
      {s.invoices.map((inv) => {
        const t = invoiceTotals(inv);
        const c = s.customers.find((x) => x.id === inv.customerId);
        return (
          <Link key={inv.id} to="/invoice/$id" params={{ id: inv.id }} className={card + " block"}>
            <div className="flex justify-between">
              <span className="font-semibold">#{inv.number} · {c?.name}</span>
              <span className="font-mono font-bold">{naira(t.total)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm text-muted-foreground">
              <span>{new Date(inv.date).toLocaleDateString()} · {t.outstanding} crates out</span>
              <span className={t.balance !== 0 ? "font-semibold text-destructive" : "text-primary"}>
                {t.balance > 0 ? `Owes ${naira(t.balance)}` : t.balance < 0 ? `We owe ${naira(-t.balance)}` : "Paid"}
              </span>
            </div>
          </Link>
        );
      })}
    </Shell>
  );
}
