import type { Invoice } from "./store";
import { invoiceTotals, lineOutstanding, lineReturned } from "./store";

// jsPDF's built-in fonts don't include the ₦ glyph, so money is written as "NGN 8,500".
const money = (n: number) => "NGN " + Math.round(n).toLocaleString("en-NG");
const dt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export async function exportInvoicePdf(inv: Invoice, customerName: string) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF();
  const t = invoiceTotals(inv);
  let y = 14;

  doc.setFontSize(16);
  doc.text(`Invoice #${inv.number}`, 14, y);
  doc.setFontSize(10);
  y += 7;
  doc.text(`Customer: ${customerName}`, 14, y);
  y += 5;
  doc.text(`Date: ${dt(inv.date)}`, 14, y);
  y += 7;

  autoTable(doc, {
    startY: y,
    head: [["Product", "Qty", "Price", "Total", "Returned", "Outstanding", "Missing"]],
    body: inv.lines.map((l) => [
      l.name,
      String(l.qty),
      money(l.price),
      money(l.qty * l.price),
      String(lineReturned(l)),
      String(lineOutstanding(l)),
      String(l.missing),
    ]),
    foot: [
      ["Invoice Total", "", "", money(t.total), "", "", ""],
      ["Amount Paid", "", "", money(t.paid), "", "", ""],
      ["Balance", "", "", money(Math.max(0, t.balance)), "", "", ""],
      ...(t.balance < 0 ? [["Owed to customer (change)", "", "", money(-t.balance), "", "", ""]] : []),
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 83, 45] },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  if (inv.payments.length) {
    doc.setFontSize(12);
    doc.text("Payments", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Date", "Amount"]],
      body: inv.payments.map((p) => [
        dt(p.date),
        p.amount < 0 ? `Change given ${money(-p.amount)}` : money(p.amount),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 83, 45] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  const history = inv.history ?? [];
  if (history.length) {
    doc.setFontSize(12);
    doc.text("History", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Date & Time", "Action", "What changed"]],
      body: history.map((h) => [dt(h.date), h.action, h.details.join("\n")]),
      styles: { fontSize: 8, cellWidth: "wrap" },
      columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 35 } },
      headStyles: { fillColor: [20, 83, 45] },
    });
  }

  doc.save(`invoice-${inv.number}.pdf`);
}
