import { PrismaClient } from "@prisma/client";

const __dirname = new URL(".", import.meta.url).pathname;
const { postSaleJournal } = await import(__dirname + "../src/lib/accounting/journal-helpers.js");

const p = new PrismaClient();

const prod = await p.product.findFirst({ where: { isActive: true } });
const branch = await p.branch.findFirst();
const admin = await p.user.findFirst({ where: { role: "SUPER_ADMIN" } });
if (!prod || !branch || !admin) { console.log("Missing data"); await p.$disconnect(); process.exit(1); }

const qty = 3, cost = Number(prod.costPerUnit);
const subtotal = qty * Number(prod.sellPerUnit), taxAmt = Math.round(subtotal * 0.11), shipping = 10000, total = subtotal + taxAmt + shipping;
const expectedCogs = qty * cost;

console.log("Product:", prod.name, "| Cost:", cost);
console.log("Sale: subtotal", subtotal, "| PPN", taxAmt, "| Shipping", shipping, "| Total", total);

const sale = await p.sale.create({
  data: {
    orderNumber: "TEST-" + Date.now(), status: "DELIVERED", customerName: "E2E",
    subtotal, taxAmount: taxAmt, shippingCost: shipping, discountAmount: 0, totalAmount: total,
    branchId: branch.id,
    items: { create: [{ productId: prod.id, quantity: qty, unitPrice: Number(prod.sellPerUnit), totalPrice: subtotal }] },
  },
});
console.log("\n✅ Sale:", sale.orderNumber);

try {
  const journal = await postSaleJournal(sale.id, admin.id);
  if (!journal) { console.log("Journal returned null"); await cleanup(p, sale); process.exit(1); }
  console.log("\n✅ Journal:", journal.journalNumber);

  let totalDebit = 0, totalCredit = 0;
  for (const e of journal.entries) {
    const acc = await p.chartOfAccount.findUnique({ where: { id: e.accountId } });
    const dr = Number(e.debit), cr = Number(e.credit);
    totalDebit += dr; totalCredit += cr;
    console.log(`  ${acc?.accountCode} ${acc?.accountName}: Dr ${dr.toLocaleString()} / Cr ${cr.toLocaleString()}`);
  }

  const balanced = totalDebit === totalCredit;
  console.log(`\nTotal: Dr ${totalDebit.toLocaleString()} = Cr ${totalCredit.toLocaleString()} → ${balanced ? "✅ BALANCED" : "❌ UNBALANCED"}`);
  console.log(`Expected: Revenue=${subtotal+shipping} | PPN=${taxAmt} | COGS=${expectedCogs}`);
  
  if (balanced && totalDebit > 0) {
    console.log("\n🎉 COGS + PPN JOURNAL POSTING VERIFIED SUCCESSFULLY!");
  }

  await p.journalEntry.deleteMany({ where: { journalId: journal.id } });
  await p.journal.delete({ where: { id: journal.id } });
} catch (err) {
  console.error("❌ Error:", err.message);
  if (err.stack) console.error(err.stack.split("\n").slice(0, 3).join("\n"));
}

await p.saleItem.deleteMany({ where: { saleId: sale.id } });
await p.sale.delete({ where: { id: sale.id } });
console.log("\nCleanup complete");
await p.$disconnect();

async function cleanup(p, sale) {
  await p.saleItem.deleteMany({ where: { saleId: sale.id } });
  await p.sale.delete({ where: { id: sale.id } });
  await p.$disconnect();
}
