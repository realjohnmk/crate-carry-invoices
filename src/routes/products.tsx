import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, btn, card, inputCls } from "@/components/Shell";
import { setState, uid, useStore } from "@/lib/store";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products & prices — Crate Ledger" },
      { name: "description", content: "Edit drink products and price per crate." },
      { property: "og:title", content: "Products & prices — Crate Ledger" },
      { property: "og:description", content: "Edit drink products and price per crate." },
    ],
  }),
  component: Products,
});

function Products() {
  const s = useStore();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const edit = (id: string, patch: { name?: string; price?: number }) =>
    setState((st) => ({ ...st, products: st.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const add = () => {
    const n = name.trim().slice(0, 60);
    const pr = parseFloat(price);
    if (!n || !(pr > 0)) return;
    setState((st) => ({ ...st, products: [...st.products, { id: uid(), name: n, price: pr }] }));
    setName(""); setPrice("");
  };
  return (
    <Shell title="Products">
      <p className="text-sm text-muted-foreground">Price per full crate. New prices apply to new invoice lines.</p>
      {s.products.map((p) => (
        <div key={p.id} className={card + " flex items-center gap-2 p-3"}>
          <input className={inputCls} value={p.name} maxLength={60} onChange={(e) => edit(p.id, { name: e.target.value })} />
          <input className={inputCls + " w-32 font-mono"} type="number" value={p.price} onChange={(e) => edit(p.id, { price: Math.max(0, parseFloat(e.target.value) || 0) })} />
          <button className="px-2 text-destructive" onClick={() => confirm(`Delete ${p.name}?`) && setState((st) => ({ ...st, products: st.products.filter((x) => x.id !== p.id) }))}>✕</button>
        </div>
      ))}
      <div className={card + " space-y-2"}>
        <div className="flex gap-2">
          <input className={inputCls} placeholder="New product" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls + " w-32"} type="number" placeholder="₦/crate" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <button className={btn + " w-full"} onClick={add}>Add product</button>
      </div>
    </Shell>
  );
}
