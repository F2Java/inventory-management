import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { postInvoiceJournal } from "@/lib/invoicing/invoice-journal"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const permErr = await requirePermission(session, "sales", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const order = await prisma.b2BOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true, sellPerUnit: true } } } },
        invoice: { include: { payments: true } },
      },
    })
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    return NextResponse.json({ data: order })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "sales", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const body = await req.json()
    const { status, notes, shippingAddress } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress

    // If confirming, set timestamps and generate invoice
    if (status === "CONFIRMED") {
      updateData.confirmedById = session.user.id
      updateData.confirmedAt = new Date()

      // Generate invoice automatically
      const order = await prisma.b2BOrder.findUnique({
        where: { id },
        include: { customer: true, items: true },
      })
      if (order && !order.invoiceId) {
        const invoiceCount = await prisma.invoice.count()
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, "0")}`
        const dueDate = new Date()
        const days = parseInt(order.paymentTerms?.replace("net", "") || "30")
        dueDate.setDate(dueDate.getDate() + days)

        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            customerId: order.customerId,
            orderId: order.id,
            invoiceDate: new Date(),
            dueDate,
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            taxAmount: order.taxAmount,
            shippingCost: order.shippingCost,
            totalAmount: order.totalAmount,
            balanceDue: order.totalAmount,
            notes: `Auto-generated from order ${order.orderNumber}`,
            createdById: session.user.id,
            terms: order.paymentTerms ? `Payment due within ${order.paymentTerms.replace('net', '')} days` : null,
          },
        })

        updateData.invoiceId = invoice.id

        // Auto-post journal
        try {
          await postInvoiceJournal(invoice.id, session.user.id)
        } catch (journalErr) {
          console.error("Auto journal posting failed for invoice:", journalErr)
        }
      }
    }

    // If cancelling, also cancel invoice if exists
    if (status === "CANCELLED") {
      const order = await prisma.b2BOrder.findUnique({ where: { id }, select: { invoiceId: true } })
      if (order?.invoiceId) {
        await prisma.invoice.update({
          where: { id: order.invoiceId },
          data: { status: "CANCELLED" },
        })
      }
    }

    const order = await prisma.b2BOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { companyName: true } },
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
      },
    })

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
