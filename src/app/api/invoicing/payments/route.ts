import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  const permErr = await requirePermission(session, "accounting", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const payments = await prisma.invoicePayment.findMany({
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            customer: { select: { companyName: true } },
          },
        },
        // receivedById is a scalar field, not a relation
      },
      orderBy: { paymentDate: "desc" },
      take: 100,
    })

    const mapped = payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      invoiceNumber: p.invoice.invoiceNumber,
      customerName: p.invoice.customer?.companyName || "—",
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      bankName: p.bankName,
      notes: p.notes,
      receivedBy: "—",
      postedToJournal: p.postedToJournal,
      createdAt: p.createdAt,
    }))

    return NextResponse.json({ data: mapped })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payments"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
