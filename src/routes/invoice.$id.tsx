import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Stat, btn, btnGhost, card, inputCls } from "@/components/Shell";
import {
  crates, invoiceTotals, isHalfStep, lineOutstanding, lineReturned, naira, setState, uid, updateInvoice, useStore, type Line,
} from "@/lib/store";

export const Route = createFileRoute("/invoice/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — Crate Ledger" },
      { name: "description", content: "Invoice lines, crate returns, missing bottles and payments." },
      { property: "og:title", content: "Invoice — Crate Ledger" },
      { property: "og:description", content: "Invoice lines, crate returns, missing bottles and payments." },
    ],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const s = useStore();
  const nav = useNavigate();
  const inv = s.invoices.find((i) => i.id === id);
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("1");
  const [pay, setPay] = useState("");
  const [err, setErr] = useState("");

  if (!inv) return <Shell title="Invoice"><p className="text-muted-foreground">Not found (it may still be loading).</p></Shell>;
  const cust = s.customers.find((c) => c.id === inv.customerId);
  const t = invoiceTotals(inv);
  const setLine = (lid: string, patch: Partial<Line>) =>
    updateInvoice(id, (i) => ({ ...i, lines: i.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));

  const addLine = () => {
    const p = s.products.find((x) => x.id === (pid || s.products[0]?.id));
    const q = parseFloat(qty);
    if (!p) return setErr("Add a product first");
    if (!isHalfStep(q)) return setErr("Use whole or half crates (1, 1.5, 2…)");
    setErr("");
    updateInvoice(id, (i) => ({
      ...i,
      lines: [...i.lines, { id: uid(), productId: p.id, name: p.name, price: p.price, qty: q, returned: null, missing: 0 }],
    }));
    setQty("1");
  };

  const addPayment = () => {
    const a = parseFloat(pay);
    if (!(a > 0)) return;
    updateInvoice(id, (i) => ({ ...i, payments: [...i.payments, { id: uid(), amount: a, date: new Date().toISOString() }] }));
    setPay("");
  };

  return (
    <Shell
      title={`Invoice #${inv.number}`}
      action={
        <button
          className="text-sm text-destructive"
          onClick={() => {
            if (!confirm("Delete this invoice?")) return;
            setState((st) => ({ ...st, invoices: st.invoices.filter((i) => i.id !== id) }));
            nav({ to: "/" });
          }}
        >Delete</button>
      }
    >
      <div className="flex justify-between text-sm">
        <Link to="/customer/$id" params={{ id: inv.customerId }} className="font-semibold text-primary underline">{cust?.name}</Link>
        <span className="text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={naira(t.total)} />
        <Stat label="Paid" value={naira(t.paid)} tone="good" />
        <Stat label="Balance" value={naira(t.balance)} tone={t.balance > 0 ? "warn" : "good"} />
        <Stat label="Sold" value={t.sold} />
        <Stat label="Returned" value={t.returned} />
        <Stat label="Crates out" value={t.outstanding} tone={t.outstanding > 0 ? "warn" : undefined} />
      </div>
      {t.missing > 0 && <div className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">Missing bottles: {t.missing}</div>}

      <div className={card + " space-y-2"}>
        <div className="font-semibold">Add product</div>
        <div className="flex gap-2">
          <select className={inputCls} value={pid} onChange={(e) => setPid(e.target.value)}>
            {s.products.map((p) => <option key={p.id} value={p.id}>{p.name} — {naira(p.price)}</option>)}
          </select>
          <input className={inputCls + " w-24"} type="number" inputMode="decimal" step="0.5" min="0.5" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {[0.5, 1, 1.5, 2, 2.5, 3, 5].map((n) => (
            <button key={n} className="flex-1 rounded border py-1 text-sm" onClick={() => setQty(String(n))}>{n}</button>
          ))}
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className={btn + " w-full"} onClick={addLine}>Add to invoice</button>
      </div>

      {inv.lines.map((l) => (
        <div key={l.id} className={card + " space-y-3"}>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-lg font-bold">{l.name}</div>
              <div className="text-sm text-muted-foreground">{crates(l.qty)} × {naira(l.price)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold">{naira(l.qty * l.price)}</div>
              <button className="text-xs text-destructive" onClick={() => updateInvoice(id, (i) => ({ ...i, lines: i.lines.filter((x) => x.id !== l.id) }))}>Remove</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <label className="space-y-1">
              <span className="text-muted-foreground">Quantity</span>
              <input className={inputCls} type="number" step="0.5" min="0.5" defaultValue={l.qty}
                onBlur={(e) => { const q = parseFloat(e.target.value); if (isHalfStep(q)) setLine(l.id, { qty: q }); else e.target.value = String(l.qty); }} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Returned</span>
              <select className={inputCls} value={l.returned === null ? "all" : String(l.returned)}
                onChange={(e) => setLine(l.id, { returned: e.target.value === "all" ? null : parseFloat(e.target.value) })}>
                <option value="all">All</option>
                {Array.from({ length: l.qty * 2 }, (_, k) => k / 2).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Missing btl</span>
              <input className={inputCls} type="number" min="0" step="1" value={l.missing}
                onChange={(e) => setLine(l.id, { missing: Math.max(0, parseInt(e.target.value) || 0) })} />
            </label>
          </div>
          <div className="flex justify-between text-sm">
            <span>Returned: <b>{lineReturned(l)}</b></span>
            <span className={lineOutstanding(l) > 0 ? "font-semibold text-destructive" : "text-primary"}>Outstanding: {lineOutstanding(l)}</span>
          </div>
        </div>
      ))}

      {inv.lines.length > 0 && (
        <div className={card + " overflow-x-auto p-0"}>
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>{["Product", "Qty", "Price", "Total", "Returned", "Outstanding", "Missing"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody className="font-mono">
              {inv.lines.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2 font-sans font-semibold">{l.name}</td>
                  <td className="px-3 py-2">{l.qty}</td>
                  <td className="px-3 py-2">{naira(l.price)}</td>
                  <td className="px-3 py-2">{naira(l.qty * l.price)}</td>
                  <td className="px-3 py-2">{lineReturned(l)}</td>
                  <td className="px-3 py-2">{lineOutstanding(l)}</td>
                  <td className="px-3 py-2">{l.missing}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t font-mono font-bold">
              <tr><td className="px-3 py-2 font-sans" colSpan={3}>Invoice Total</td><td className="px-3 py-2" colSpan={4}>{naira(t.total)}</td></tr>
              <tr><td className="px-3 py-2 font-sans" colSpan={3}>Amount Paid</td><td className="px-3 py-2" colSpan={4}>{naira(t.paid)}</td></tr>
              <tr><td className="px-3 py-2 font-sans" colSpan={3}>Balance</td><td className="px-3 py-2 text-destructive" colSpan={4}>{naira(t.balance)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className={card + " space-y-2"}>
        <div className="font-semibold">Payments</div>
        {inv.payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{new Date(p.date).toLocaleString()}</span>
            <span className="flex items-center gap-3">
              <b className="font-mono">{naira(p.amount)}</b>
              <button className="text-xs text-destructive" onClick={() => updateInvoice(id, (i) => ({ ...i, payments: i.payments.filter((x) => x.id !== p.id) }))}>✕</button>
            </span>
          </div>
        ))}
        <div className="flex gap-2">
          <input className={inputCls} type="number" inputMode="numeric" placeholder="Amount ₦" value={pay} onChange={(e) => setPay(e.target.value)} />
          <button className={btnGhost} onClick={addPayment}>Add</button>
        </div>
        {t.balance > 0 && <button className="text-sm text-primary underline" onClick={() => setPay(String(t.balance))}>Pay full balance</button>}
      </div>
    </Shell>
  );
}
