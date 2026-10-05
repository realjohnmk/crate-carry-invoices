import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Stat, btn, btnGhost, card, inputCls } from "@/components/Shell";
import {
  confirmInvoice, crates, invoiceTotals, isHalfStep, isLocked, lineOutstanding, lineReturned, naira,
  recordBottles, recordPayment, recordReturn, setState, uid, updateInvoice, useStore, type Invoice, type Line,
} from "@/lib/store";

export const Route = createFileRoute("/invoice/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — Crate Ledger" },
      { name: "description", content: "Original sale, crate returns, missing bottles, payments and history." },
      { property: "og:title", content: "Invoice — Crate Ledger" },
      { property: "og:description", content: "Original sale, crate returns, missing bottles, payments and history." },
    ],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const s = useStore();
  const nav = useNavigate();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv) return <Shell title="Invoice"><p className="text-muted-foreground">Not found (it may still be loading).</p></Shell>;
  const cust = s.customers.find((c) => c.id === inv.customerId);
  const locked = isLocked(inv);
  const t = invoiceTotals(inv);

  return (
    <Shell
      title={`Invoice #${inv.number}`}
      action={
        !locked ? (
          <button className="text-sm text-destructive" onClick={() => {
            if (!confirm("Discard this draft invoice?")) return;
            setState((st) => ({ ...st, invoices: st.invoices.filter((i) => i.id !== id) }));
            nav({ to: "/" });
          }}>Discard draft</button>
        ) : (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">🔒 Locked</span>
        )
      }
    >
      <div className="flex justify-between text-sm">
        <Link to="/customer/$id" params={{ id: inv.customerId }} className="font-semibold text-primary underline">{cust?.name}</Link>
        <span className="text-muted-foreground">{new Date(inv.date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
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

      {locked ? <LockedView inv={inv} /> : <DraftView inv={inv} />}

      {inv.lines.length > 0 && <SaleTable inv={inv} />}

      <div id="history" className={card + " space-y-3"}>
        <div className="font-semibold">History</div>
        {!locked && <p className="text-sm text-muted-foreground">History starts when you confirm the invoice.</p>}
        <ol className="space-y-3 border-l-2 border-border pl-4">
          {[...(inv.history ?? [])].reverse().map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="text-xs text-muted-foreground">{new Date(h.date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
              <div className="font-semibold">{h.action}</div>
              <ul className="list-disc pl-5 text-sm">{h.details.map((d, k) => <li key={k}>{d}</li>)}</ul>
            </li>
          ))}
        </ol>
      </div>
    </Shell>
  );
}

function SaleTable({ inv }: { inv: Invoice }) {
  const t = invoiceTotals(inv);
  return (
    <div className={card + " overflow-x-auto p-0"}>
      <div className="px-3 pt-3 text-sm font-semibold">{isLocked(inv) ? "Original sale" : "Sale preview"}</div>
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
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
  );
}

/* ---------- Before confirmation: build the sale ---------- */
function DraftView({ inv }: { inv: Invoice }) {
  const s = useStore();
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("1");
  const [err, setErr] = useState("");
  const setLines = (fn: (ls: Line[]) => Line[]) => updateInvoice(inv.id, (i) => ({ ...i, lines: fn(i.lines) }));
  const setLine = (lid: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === lid ? { ...l, ...patch } : l)));

  const addLine = () => {
    const p = s.products.find((x) => x.id === (pid || s.products[0]?.id));
    const q = parseFloat(qty);
    if (!p) return setErr("Add a product first");
    if (!isHalfStep(q)) return setErr("Use whole or half crates (1, 1.5, 2…)");
    setErr("");
    setLines((ls) => [...ls, { id: uid(), productId: p.id, name: p.name, price: p.price, qty: q, returned: null, missing: 0 }]);
    setQty("1");
  };

  return (
    <>
      <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Draft — once confirmed, products, quantities and prices are locked permanently.
      </div>
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
              <button className="text-xs text-destructive" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}>Remove</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-muted-foreground">Quantity</span>
              <input className={inputCls} type="number" step="0.5" min="0.5" key={"q" + l.qty} defaultValue={l.qty}
                onBlur={(e) => { const q = parseFloat(e.target.value); if (isHalfStep(q)) setLine(l.id, { qty: q }); else e.target.value = String(l.qty); }} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Price ₦</span>
              <input className={inputCls} type="number" min="0" key={"p" + l.price} defaultValue={l.price}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (v >= 0) setLine(l.id, { price: v }); else e.target.value = String(l.price); }} />
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
          <div className="text-right text-sm">Outstanding: <b>{lineOutstanding(l)}</b></div>
        </div>
      ))}

      {inv.lines.length > 0 && (
        <button className={btn + " sticky bottom-16 z-10 w-full py-3 shadow-lg"}
          onClick={() => confirm("Confirm invoice? The sale will be locked.") && confirmInvoice(inv.id)}>
          Confirm invoice · {naira(invoiceTotals(inv).total)}
        </button>
      )}
    </>
  );
}

/* ---------- After confirmation: only smart follow-up actions ---------- */
function LockedView({ inv }: { inv: Invoice }) {
  const t = invoiceTotals(inv);
  const [pay, setPay] = useState("");
  const [err, setErr] = useState("");
  const out = inv.lines.filter((l) => lineOutstanding(l) > 0);

  const addPayment = () => {
    const a = parseFloat(pay);
    if (!(a > 0)) return setErr("Enter an amount");
    if (a > t.balance) return setErr(`Amount is more than the balance (${naira(t.balance)})`);
    setErr(""); recordPayment(inv.id, a); setPay("");
  };

  return (
    <>
      {/* Payment */}
      <div className={card + " space-y-2"}>
        <div className="flex items-center justify-between">
          <div className="font-semibold">Payment</div>
          {t.balance <= 0 && <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">✓ Paid</span>}
        </div>
        {inv.payments.map((p) => (
          <div key={p.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{new Date(p.date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
            <b className="font-mono">{naira(p.amount)}</b>
          </div>
        ))}
        {t.balance > 0 && (
          <>
            <div className="flex gap-2">
              <input className={inputCls} type="number" inputMode="numeric" placeholder={`Amount (balance ${naira(t.balance)})`} value={pay} onChange={(e) => setPay(e.target.value)} />
              <button className={btn} onClick={addPayment}>Add Payment</button>
            </div>
            <button className="text-sm text-primary underline" onClick={() => setPay(String(t.balance))}>Pay full balance</button>
            {err && <p className="text-sm text-destructive">{err}</p>}
          </>
        )}
      </div>

      {/* Crates */}
      <div className={card + " space-y-3"}>
        <div className="flex items-center justify-between">
          <div className="font-semibold">Crate returns</div>
          {out.length === 0 && <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-primary">✓ All crates returned</span>}
        </div>
        {out.map((l) => <ReturnRow key={l.id} invId={inv.id} line={l} />)}
      </div>

      {/* Bottles */}
      <div className={card + " space-y-3"}>
        <div className="font-semibold">Bottles</div>
        {inv.lines.map((l) => <BottleRow key={l.id} invId={inv.id} line={l} />)}
      </div>

      <a href="#history" className={btnGhost + " block text-center"}>View History</a>
    </>
  );
}

function ReturnRow({ invId, line }: { invId: string; line: Line }) {
  const left = lineOutstanding(line);
  const [n, setN] = useState(String(left));
  const opts = Array.from({ length: left * 2 }, (_, k) => (k + 1) / 2);
  return (
    <div className="space-y-2 rounded-md bg-muted p-3">
      <div className="flex justify-between text-sm">
        <b>{line.name}</b>
        <span className="font-semibold text-destructive">{crates(left)} outstanding</span>
      </div>
      <button className={btn + " w-full"} onClick={() => recordReturn(invId, line.id, left)}>
        Return {left === 1 ? "1 remaining" : `all ${left} remaining`} {line.name} crate{left === 1 ? "" : "s"}
      </button>
      {left > 0.5 && (
        <div className="flex gap-2">
          <select className={inputCls} value={n} onChange={(e) => setN(e.target.value)}>
            {opts.map((o) => <option key={o} value={o}>{crates(o)}</option>)}
          </select>
          <button className={btnGhost + " whitespace-nowrap"} onClick={() => recordReturn(invId, line.id, parseFloat(n))}>Return some</button>
        </div>
      )}
    </div>
  );
}

function BottleRow({ invId, line }: { invId: string; line: Line }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(String(line.missing));
  return (
    <div className="space-y-2 rounded-md bg-muted p-3">
      <div className="flex items-center justify-between text-sm">
        <b>{line.name}</b>
        <span>{line.missing > 0 ? <span className="font-semibold text-destructive">{line.missing} missing</span> : "No missing bottles"}</span>
      </div>
      {!open ? (
        <button className={btnGhost + " w-full bg-card text-sm"} onClick={() => { setV(String(line.missing)); setOpen(true); }}>
          {line.missing > 0 ? "Update / record bottle return" : "Record missing bottles"}
        </button>
      ) : (
        <div className="flex gap-2">
          <input className={inputCls} type="number" min="0" step="1" value={v} onChange={(e) => setV(e.target.value)} aria-label="Missing bottles now" />
          <button className={btn} onClick={() => { const c = parseInt(v); if (c >= 0) recordBottles(invId, line.id, c); setOpen(false); }}>Save</button>
          <button className={btnGhost} onClick={() => setOpen(false)}>✕</button>
        </div>
      )}
    </div>
  );
}
