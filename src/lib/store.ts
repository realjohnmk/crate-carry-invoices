import { useSyncExternalStore } from "react";

export type Product = { id: string; name: string; price: number };
export type Customer = { id: string; name: string; phone: string };
export type Line = {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  returned: number | null; // null = all returned
  missing: number;
};
export type Payment = { id: string; amount: number; date: string };
export type HistoryEntry = { id: string; date: string; action: string; details: string[] };
export type Invoice = {
  id: string;
  number: number;
  customerId: string;
  date: string;
  lines: Line[];
  payments: Payment[];
  history?: HistoryEntry[];
};
type State = { products: Product[]; customers: Customer[]; invoices: Invoice[] };

const KEY = "crate-ledger-v1";
export const uid = () => Math.random().toString(36).slice(2, 10);

const initial: State = {
  products: [
    { id: "p1", name: "Life", price: 8500 },
    { id: "p2", name: "Hero", price: 8500 },
    { id: "p3", name: "Trophy", price: 8500 },
    { id: "p4", name: "Gulder", price: 11200 },
    { id: "p5", name: "Star", price: 11200 },
  ],
  customers: [],
  invoices: [],
};

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
}

export function setState(fn: (s: State) => State) {
  load();
  state = fn(state);
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useStore() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => initial,
  );
}

export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
export const crates = (n: number) => `${n} crate${n === 1 ? "" : "s"}`;
export const isHalfStep = (n: number) => n > 0 && Number.isInteger(n * 2);

export const lineReturned = (l: Line) => (l.returned === null ? l.qty : Math.min(l.returned, l.qty));
export const lineOutstanding = (l: Line) => l.qty - lineReturned(l);

export function invoiceTotals(inv: Invoice) {
  const total = inv.lines.reduce((s, l) => s + l.qty * l.price, 0);
  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
  const sold = inv.lines.reduce((s, l) => s + l.qty, 0);
  const returned = inv.lines.reduce((s, l) => s + lineReturned(l), 0);
  const missing = inv.lines.reduce((s, l) => s + l.missing, 0);
  return { total, paid, balance: total - paid, sold, returned, outstanding: sold - returned, missing };
}

export function customerTotals(s: State, customerId: string) {
  const invs = s.invoices.filter((i) => i.customerId === customerId);
  const acc = { total: 0, paid: 0, balance: 0, outstanding: 0, missing: 0 };
  for (const i of invs) {
    const t = invoiceTotals(i);
    acc.total += t.total;
    acc.paid += t.paid;
    acc.balance += t.balance;
    acc.outstanding += t.outstanding;
    acc.missing += t.missing;
  }
  return { ...acc, invoices: invs };
}

export function updateInvoice(id: string, fn: (i: Invoice) => Invoice) {
  setState((s) => ({ ...s, invoices: s.invoices.map((i) => (i.id === id ? fn(i) : i)) }));
}

const fmtQty = (n: number) => String(n);

/** Compare saved lines with edited lines and produce history entries (one per kind of change). */
export function diffLines(inv: Invoice, next: Line[]): HistoryEntry[] {
  const date = new Date().toISOString();
  const before = invoiceTotals(inv);
  const after = invoiceTotals({ ...inv, lines: next });
  const entry = (action: string, details: string[]): HistoryEntry => ({ id: uid(), date, action, details });

  if (!inv.history || inv.history.length === 0) {
    return [
      entry("Invoice created", [
        ...next.map((l) => `${l.name}: ${crates(l.qty)} × ${naira(l.price)} = ${naira(l.qty * l.price)}`),
        ...next.filter((l) => l.returned !== null).map((l) => `${l.name} crates returned: ${lineReturned(l)}`),
        ...next.filter((l) => l.missing > 0).map((l) => `${l.name} missing bottles: ${l.missing}`),
        `Total: ${naira(after.total)}`,
        `Outstanding crates: ${after.outstanding}`,
      ]),
    ];
  }

  const details: string[] = [];
  const returns: string[] = [];
  const missing: string[] = [];
  const oldMap = new Map(inv.lines.map((l) => [l.id, l]));
  const newMap = new Map(next.map((l) => [l.id, l]));
  for (const l of next) {
    const o = oldMap.get(l.id);
    if (!o) { details.push(`Product added: ${l.name}, ${crates(l.qty)} × ${naira(l.price)}`); continue; }
    if (o.qty !== l.qty) details.push(`${l.name} quantity: ${fmtQty(o.qty)} → ${fmtQty(l.qty)} crates`);
    if (o.price !== l.price) details.push(`${l.name} price: ${naira(o.price)} → ${naira(l.price)}`);
    const ro = lineReturned(o), rn = lineReturned(l);
    if (ro !== rn) {
      const d = rn - ro;
      returns.push(d > 0 ? `${l.name} crates returned: ${d}` : `${l.name} returns reduced by ${-d}`);
      returns.push(`${l.name} returned total: ${ro} → ${rn}`);
    }
    if (o.missing !== l.missing) missing.push(`${l.name} missing bottles: ${o.missing} → ${l.missing}`);
  }
  for (const o of inv.lines) if (!newMap.has(o.id)) details.push(`Product removed: ${o.name}, ${crates(o.qty)}`);

  const out: HistoryEntry[] = [];
  if (details.length) {
    if (before.total !== after.total) details.push(`Total: ${naira(before.total)} → ${naira(after.total)}`, `Balance: ${naira(before.balance)} → ${naira(after.balance)}`);
    out.push(entry("Invoice details changed", details));
  }
  if (returns.length) out.push(entry("Crate return", [...returns, `Outstanding crates: ${before.outstanding} → ${after.outstanding}`]));
  if (missing.length) out.push(entry("Missing bottles", [...missing, `Total missing bottles: ${before.missing} → ${after.missing}`]));
  if (!details.length && before.outstanding !== after.outstanding && !returns.length)
    out.push(entry("Crates adjusted", [`Outstanding crates: ${before.outstanding} → ${after.outstanding}`]));
  return out;
}

export function paymentEntry(inv: Invoice, amount: number, removed = false): HistoryEntry {
  const t = invoiceTotals(inv);
  const nb = removed ? t.balance + amount : t.balance - amount;
  return {
    id: uid(),
    date: new Date().toISOString(),
    action: removed ? "Payment removed" : "Payment",
    details: [
      `${removed ? "Payment removed" : "Payment received"}: ${naira(amount)}`,
      `Previous balance: ${naira(t.balance)}`,
      `New balance: ${naira(nb)}`,
    ],
  };
}

export const isLocked = (inv: Invoice) => (inv.history?.length ?? 0) > 0;
const now = () => new Date().toISOString();

/** Confirm a draft invoice: locks the sale and writes the "Invoice created" record. */
export function confirmInvoice(id: string) {
  updateInvoice(id, (i) => ({ ...i, date: now(), history: diffLines({ ...i, history: [] }, i.lines) }));
}

/** Record crates returned for one line as a new event (sale stays untouched). */
export function recordReturn(id: string, lineId: string, n: number) {
  updateInvoice(id, (i) => {
    const l = i.lines.find((x) => x.id === lineId);
    if (!l || n <= 0) return i;
    const before = invoiceTotals(i);
    const prev = lineReturned(l);
    const add = Math.min(n, l.qty - prev);
    if (add <= 0) return i;
    const lines = i.lines.map((x) => (x.id === lineId ? { ...x, returned: prev + add } : x));
    const after = invoiceTotals({ ...i, lines });
    const left = l.qty - prev - add;
    return {
      ...i,
      lines,
      history: [...(i.history ?? []), { id: uid(), date: now(), action: "Crate return", details: [
        `${l.name} crates returned: ${add}`,
        `${l.name} outstanding: ${l.qty - prev} → ${left}`,
        `Invoice outstanding crates: ${before.outstanding} → ${after.outstanding}`,
      ] }],
    };
  });
}

/** Record a missing-bottle count change for one line as a new event. */
export function recordBottles(id: string, lineId: string, count: number) {
  updateInvoice(id, (i) => {
    const l = i.lines.find((x) => x.id === lineId);
    if (!l || count < 0 || count === l.missing) return i;
    const lines = i.lines.map((x) => (x.id === lineId ? { ...x, missing: count } : x));
    const diff = count - l.missing;
    return {
      ...i,
      lines,
      history: [...(i.history ?? []), { id: uid(), date: now(), action: diff > 0 ? "Missing bottles" : "Bottle return", details: [
        diff > 0 ? `${l.name} missing bottles recorded: ${diff}` : `${l.name} bottles returned: ${-diff}`,
        `${l.name} missing bottles: ${l.missing} → ${count}`,
        `Invoice missing bottles: ${invoiceTotals(i).missing} → ${invoiceTotals({ ...i, lines }).missing}`,
      ] }],
    };
  });
}

export function recordPayment(id: string, amount: number) {
  updateInvoice(id, (i) => ({
    ...i,
    payments: [...i.payments, { id: uid(), amount, date: now() }],
    history: [...(i.history ?? []), paymentEntry(i, amount)],
  }));
}
