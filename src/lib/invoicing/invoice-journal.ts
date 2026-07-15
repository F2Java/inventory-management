// Invoice Journal Helper
// Auto-generates journal entries for invoices and payments
// Dr. Piutang Usaha (1-1020) / Cr. Pendapatan Penjualan (4-1000) / Cr. Hutang Pajak (2-1010)
// Dr. Kas (1-1000) / Cr. Piutang Usaha (1-1020) when payment received

import prisma from "@/lib/prisma"

async function nextJournalNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.journal.count()
  return `JNL-${year}-${String(count + 1).padStart(4, "0")}`
}

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
 * Post journal for a new invoice:
 *
 * Dr. Piutang Usaha (1-1020)     totalAmount
 *    Cr. Pendapatan Penjualan (4-1000)   subtotal - discount
 *    Cr. Hutang Pajak PPN (2-1010)       taxAmount
 */
export async function postInvoiceJournal(
  invoiceId: string,
  userId: string
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      subtotal: true,
      discountAmount: true,
      taxAmount: true,
      shippingCost: true,
      totalAmount: true,
      postedToJournal: true,
      journalId: true,
    },
  })

  if (!invoice) throw new Error("Invoice not found")
  if (invoice.postedToJournal) return { alreadyPosted: true, journalId: invoice.journalId }
  if (Number(invoice.totalAmount) <= 0) return null

  const revenue = Number(invoice.subtotal) - Number(invoice.discountAmount) + Number(invoice.shippingCost)
  const taxAmt = Number(invoice.taxAmount)

  const receivableAccount = await requireAccount("1-1020")
  const revenueAccount = await requireAccount("4-1000")
  const ppnAccount = await requireAccount("2-1010")

  const journalNumber = await nextJournalNumber()

  const journal = await prisma.journal.create({
    data: {
      journalNumber,
      description: `Invoice ${invoice.invoiceNumber}`,
      date: new Date(),
      reference: invoice.invoiceNumber,
      referenceType: "invoice",
      referenceId: invoice.id,
      postedAt: new Date(),
      createdById: userId,
      entries: {
        create: [
          {
            accountId: receivableAccount.id,
            debit: Number(invoice.totalAmount),
            credit: 0,
            description: `Piutang from ${invoice.invoiceNumber}`,
          },
          {
            accountId: revenueAccount.id,
            debit: 0,
            credit: revenue,
            description: `Revenue from ${invoice.invoiceNumber}`,
          },
          ...(taxAmt > 0
            ? [
                {
                  accountId: ppnAccount.id,
                  debit: 0,
                  credit: taxAmt,
                  description: `PPN ${invoice.invoiceNumber}`,
                },
              ]
            : []),
        ],
      },
    },
  })

  // Mark invoice as posted
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { postedToJournal: true, journalId: journal.id },
  })

  return { journal }
}

/**
 * Post journal for a payment received:
 *
 * Dr. Kas (1-1000)        amount
 *    Cr. Piutang Usaha (1-1020)   amount
 */
export async function postPaymentJournal(
  paymentId: string,
  userId: string
) {
  const payment = await prisma.invoicePayment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        select: { id: true, invoiceNumber: true, postedToJournal: true },
      },
    },
  })

  if (!payment) throw new Error("Payment not found")
  if (payment.postedToJournal) return { alreadyPosted: true }
  if (Number(payment.amount) <= 0) return null

  const kasAccount = await requireAccount("1-1000")
  const receivableAccount = await requireAccount("1-1020")

  const journalNumber = await nextJournalNumber()

  const journal = await prisma.journal.create({
    data: {
      journalNumber,
      description: `Pembayaran ${payment.paymentNumber} untuk ${payment.invoice.invoiceNumber}`,
      date: new Date(),
      reference: payment.paymentNumber,
      referenceType: "payment",
      referenceId: payment.id,
      postedAt: new Date(),
      createdById: userId,
      entries: {
        create: [
          {
            accountId: kasAccount.id,
            debit: Number(payment.amount),
            credit: 0,
            description: `Penerimaan dari ${payment.invoice.invoiceNumber}`,
          },
          {
            accountId: receivableAccount.id,
            debit: 0,
            credit: Number(payment.amount),
            description: `Pengurangan piutang ${payment.invoice.invoiceNumber}`,
          },
        ],
      },
    },
  })

  await prisma.invoicePayment.update({
    where: { id: payment.id },
    data: { postedToJournal: true },
  })

  return { journal }
}
