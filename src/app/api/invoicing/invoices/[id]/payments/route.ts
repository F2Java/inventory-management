import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { postPaymentJournal } from "@/lib/invoicing/invoice-journal"
import type { InvoiceStatus } from "@prisma/client"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "accounting", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const body = await req.json()
    const { amount, paymentDate, paymentMethod, referenceNumber, bankName, notes } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 })
    }

    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    if (invoice.status === "PAID" || invoice.status === "CANCELLED" || invoice.status === "VOID") {
      return NextResponse.json({ error: `Cannot record payment for ${invoice.status} invoice` }, { status: 400 })
    }

    const paymentAmount = parseFloat(amount)
    const currentPaid = Number(invoice.amountPaid)
    const newPaid = currentPaid + paymentAmount
    const balanceDue = Number(invoice.totalAmount) - newPaid

    // Determine new invoice status
    let newStatus: InvoiceStatus = invoice.status as InvoiceStatus
    if (balanceDue <= 0) {
      newStatus = "PAID" as InvoiceStatus
    } else if (newPaid > 0) {
      newStatus = "PARTIAL" as InvoiceStatus
    }

    const paymentCount = await prisma.invoicePayment.count()
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(4, "0")}`

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.invoicePayment.create({
        data: {
          paymentNumber,
          invoiceId: id,
          amount: paymentAmount,
          paymentDate: new Date(paymentDate) || new Date(),
          paymentMethod: paymentMethod || "BANK_TRANSFER",
          referenceNumber,
          bankName,
          notes,
          receivedById: session.user.id,
        },
      })

      await tx.invoice.update({
        where: { id },
        data: {
          amountPaid: newPaid,
          balanceDue,
          status: newStatus,
        },
      })

      return payment
    })

    // Auto-post journal entry
    try {
      await postPaymentJournal(result.id, session.user.id)
    } catch (journalErr) {
      console.error("Auto journal posting failed for payment:", journalErr)
    }

    return NextResponse.json({
      success: true,
      data: result,
      newBalance: balanceDue,
      newStatus,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record payment"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
