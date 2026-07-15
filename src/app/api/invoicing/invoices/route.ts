import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { postInvoiceJournal } from "@/lib/invoicing/invoice-journal"

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "accounting", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    // Auto-update overdue invoices before returning results
    const now = new Date()
    await prisma.invoice.updateMany({
      where: {
        dueDate: { lt: now },
        status: { in: ["PENDING", "PARTIAL"] },
      },
      data: { status: "OVERDUE" },
    })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || ""
    const search = searchParams.get("search") || ""

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customer: { companyName: { contains: search, mode: "insensitive" } } },
      ]
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true, contactPerson: true, email: true } },
        order: { select: { orderNumber: true } },
        payments: { select: { id: true, amount: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    const mapped = invoices.map((inv) => {
      const isOverdue = inv.status === "OVERDUE" || (inv.status === "PENDING" && new Date(inv.dueDate) < now)
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer,
        orderNumber: inv.order?.orderNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        status: isOverdue && inv.status !== "PAID" ? "OVERDUE" : inv.status,
        subtotal: Number(inv.subtotal),
        discountAmount: Number(inv.discountAmount),
        taxAmount: Number(inv.taxAmount),
        shippingCost: Number(inv.shippingCost),
        totalAmount: Number(inv.totalAmount),
        amountPaid: Number(inv.amountPaid),
        balanceDue: Number(inv.balanceDue),
        currency: inv.currency,
        postedToJournal: inv.postedToJournal,
        paymentCount: inv._count.payments,
        createdAt: inv.createdAt,
      }
    })

    const totalOutstanding = mapped.filter((i) => i.status === "PENDING" || i.status === "PARTIAL" || i.status === "OVERDUE")
      .reduce((s, i) => s + i.balanceDue, 0)
    const totalOverdue = mapped.filter((i) => i.status === "OVERDUE")
      .reduce((s, i) => s + i.balanceDue, 0)
    const totalCollected = mapped.filter((i) => i.status === "PAID")
      .reduce((s, i) => s + i.totalAmount, 0)

    return NextResponse.json({
      data: mapped,
      stats: {
        total: mapped.length,
        totalOutstanding,
        totalOverdue,
        totalCollected,
        pending: mapped.filter((i) => i.status === "PENDING").length,
        overdue: mapped.filter((i) => i.status === "OVERDUE").length,
        paid: mapped.filter((i) => i.status === "PAID").length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load invoices"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "accounting", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { customerId, orderId, invoiceDate, dueDate, subtotal, discountAmount, taxAmount, shippingCost, notes, terms } = body

    const count = await prisma.invoice.count()
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`
    const total = (subtotal || 0) - (discountAmount || 0) + (taxAmount || 0) + (shippingCost || 0)

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        orderId,
        invoiceDate: new Date(invoiceDate) || new Date(),
        dueDate: new Date(dueDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: parseFloat(subtotal) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        taxAmount: parseFloat(taxAmount) || 0,
        shippingCost: parseFloat(shippingCost) || 0,
        totalAmount: total,
        balanceDue: total,
        notes,
        terms,
        createdById: session.user.id,
      },
    })

    try {
      await postInvoiceJournal(invoice.id, session.user.id)
    } catch (journalErr) {
      console.error("Auto journal posting failed:", journalErr)
    }

    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invoice"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
