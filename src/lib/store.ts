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
export type Invoice = {
  id: string;
  number: number;
  customerId: string;
  date: string;
  lines: Line[];
  payments: Payment[];
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
