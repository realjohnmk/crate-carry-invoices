import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, btn, card, inputCls } from "@/components/Shell";
import { customerTotals, naira, setState, uid, useStore } from "@/lib/store";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Crate Ledger" },
      { name: "description", content: "Customer balances, outstanding crates and missing bottles." },
      { property: "og:title", content: "Customers — Crate Ledger" },
      { property: "og:description", content: "Customer balances, outstanding crates and missing bottles." },
    ],
  }),
  component: Customers,
});

function Customers() {
  const s = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const add = () => {
    const n = name.trim().slice(0, 80);
    if (!n) return;
    setState((st) => ({ ...st, customers: [...st.customers, { id: uid(), name: n, phone: phone.trim().slice(0, 20) }] }));
    setName(""); setPhone("");
  };
  return (
    <Shell title="Customers">
      <div className={card + " space-y-2"}>
        <input className={inputCls} placeholder="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="Phone (optional)" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} />
        <button className={btn + " w-full"} onClick={add}>Add customer</button>
      </div>
      {s.customers.map((c) => {
        const t = customerTotals(s, c.id);
        return (
          <Link key={c.id} to="/customer/$id" params={{ id: c.id }} className={card + " block"}>
            <div className="flex justify-between font-semibold">
              <span>{c.name}</span>
              <span className={`font-mono ${t.balance > 0 ? "text-destructive" : "text-primary"}`}>{naira(t.balance)}</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t.credit > 0 && <span className="font-semibold text-destructive">We owe {naira(t.credit)} · </span>}
              {t.outstanding} crates out · {t.missing} missing bottles · {t.invoices.length} invoices
            </div>
          </Link>
        );
      })}
    </Shell>
  );
}
