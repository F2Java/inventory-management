// Shared journal posting helpers for transactional lifecycle events
// Provides auto-journal generation for sales, purchase orders, and other events

import prisma from "@/lib/prisma"

/**
 * Generate the next journal number in sequence.
 */
async function nextJournalNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.journal.count()
  return `JNL-${year}-${String(count + 1).padStart(4, "0")}`
}

/**
 * Find a chart-of-account by its code. Throws if not found.
 */
async function requireAccount(accountCode: string) {
  const account = await prisma.chartOfAccount.findUnique({
    where: { accountCode },
    select: { id: true, accountCode: true, accountName: true },
  })
  if (!account) {
    throw new Error(
      `Required account "${accountCode}" not found in Chart of Accounts. Please seed it first.`
    )
  }
  return account
}

/**
 * Post a complete journal for a sale including COGS and PPN:
 *
 * ┌────────────────────────────────┬──────────┬──────────┐
 * │ Account                        │ Debit    │ Credit   │
 * ├────────────────────────────────┼──────────┼──────────┤
 * │ Kas (1-1000)                   │ totalAmt │          │
 * │ Pendapatan Penjualan (4-1000)  │          │ revenue  │
 * │ Hutang Pajak PPN (2-1010)      │          │ taxAmt   │
 * │ Harga Pokok Penjualan (5-1000) │ cogs     │          │
 * │ Persediaan Barang (1-1030)     │          │ cogs     │
 * └────────────────────────────────┴──────────┴──────────┘
 */
export async function postSaleJournal(
  saleId: string,
  userId: string
) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      orderNumber: true,
      subtotal: true,
      taxAmount: true,
      discountAmount: true,
      shippingCost: true,
      totalAmount: true,
      currency: true,
      items: {
        include: {
          product: { select: { id: true, costPerUnit: true, name: true } },
        },
      },
    },
  })
  if (!sale) throw new Error("Sale not found")

  // Don't double-post
  const existing = await prisma.journal.findFirst({
    where: { referenceType: "sale", referenceId: saleId },
  })
  if (existing) return existing

  const total = Number(sale.totalAmount)
  if (total <= 0) return null

  // Calculate revenue (subtotal minus discount + shipping cost charged to customer)
  const revenue = Number(sale.subtotal) - Number(sale.discountAmount) + Number(sale.shippingCost)
  const taxAmt = Number(sale.taxAmount)
  const cogs = sale.items.reduce((sum, item) => {
    return sum + item.quantity * Number(item.product.costPerUnit)
  }, 0)

  // Resolve accounts
  const kasAccount = await requireAccount("1-1000")
  const revenueAccount = await requireAccount("4-1000")
  const ppnPayableAccount = await requireAccount("2-1010")
  const hppAccount = await requireAccount("5-1000")
  const inventoryAccount = await requireAccount("1-1030")

  const journalNumber = await nextJournalNumber()

  return prisma.journal.create({
    data: {
      journalNumber,
      description: `Penjualan ${sale.orderNumber}`,
      date: new Date(),
      reference: sale.orderNumber,
      referenceType: "sale",
      referenceId: sale.id,
      postedAt: new Date(),
      createdById: userId,
      entries: {
        create: [
          // 1. Cash received (debit)
          {
            accountId: kasAccount.id,
            debit: total,
            credit: 0,
            description: `Sale ${sale.orderNumber} — total received`,
          },
          // 2. Revenue (credit) — subtotal minus discount
          {
            accountId: revenueAccount.id,
            debit: 0,
            credit: revenue,
            description: `Revenue from ${sale.orderNumber}`,
          },
          // 3. PPN Output Tax payable (credit)
          ...(taxAmt > 0
            ? [
                {
                  accountId: ppnPayableAccount.id,
                  debit: 0,
                  credit: taxAmt,
                  description: `PPN Keluaran ${sale.orderNumber}`,
                },
              ]
            : []),
          // 4. COGS (debit) — cost of goods sold
          ...(cogs > 0
            ? [
                {
                  accountId: hppAccount.id,
                  debit: cogs,
                  credit: 0,
                  description: `HPP ${sale.orderNumber}`,
                },
              ]
            : []),
          // 5. Inventory reduction (credit) — matching COGS
          ...(cogs > 0
            ? [
                {
                  accountId: inventoryAccount.id,
                  debit: 0,
                  credit: cogs,
                  description: `Inventory out ${sale.orderNumber}`,
                },
              ]
            : []),
        ],
      },
    },
    include: { entries: true },
  })
}

/**
 * Post a journal for a received purchase order:
 *   Dr. Persediaan Barang (1-1030)  xxx
 *   Cr. Hutang Usaha (2-1000)       xxx
 */
export async function postPurchaseJournal(
  poId: string,
  userId: string
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: { id: true, poNumber: true, grandTotal: true },
  })
  if (!po) throw new Error("Purchase order not found")

  // Don't double-post
  const existing = await prisma.journal.findFirst({
    where: { referenceType: "purchase", referenceId: poId },
  })
  if (existing) return existing

  const total = Number(po.grandTotal)
  if (total <= 0) return null

  const inventoryAccount = await requireAccount("1-1030")
  const payableAccount = await requireAccount("2-1000")

  const journalNumber = await nextJournalNumber()

  return prisma.journal.create({
    data: {
      journalNumber,
      description: `Pembelian ${po.poNumber}`,
      date: new Date(),
      reference: po.poNumber,
      referenceType: "purchase",
      referenceId: po.id,
      postedAt: new Date(),
      createdById: userId,
      entries: {
        create: [
          {
            accountId: inventoryAccount.id,
            debit: total,
            credit: 0,
            description: `Inventory from ${po.poNumber}`,
          },
          {
            accountId: payableAccount.id,
            debit: 0,
            credit: total,
            description: `Payable for ${po.poNumber}`,
          },
        ],
      },
    },
    include: { entries: true },
  })
}
