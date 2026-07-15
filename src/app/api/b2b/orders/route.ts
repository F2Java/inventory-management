import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get("customerId") || ""
  const status = searchParams.get("status") || ""

  // If filtering by customer (B2B customer view), skip admin auth
  if (customerId) {
    const customer = await prisma.b2BCustomer.findUnique({ where: { id: customerId } })
    if (!customer || customer.status !== "ACTIVE") {
      return NextResponse.json({ error: "Customer not found or inactive" }, { status: 403 })
    }
  } else {
    // Admin view - require permission
    const permErr = await requirePermission(session, "sales", "view")
    if (permErr) return NextResponse.json(permErr, { status: permErr.status })
  }

  try {
    const where: any = {}
    if (customerId) where.customerId = customerId
    if (status) where.status = status

    const orders = await prisma.b2BOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, companyName: true, contactPerson: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const mapped = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customer: o.customer,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      taxAmount: Number(o.taxAmount),
      shippingCost: Number(o.shippingCost),
      totalAmount: Number(o.totalAmount),
      paymentTerms: o.paymentTerms,
      shippingAddress: o.shippingAddress,
      notes: o.notes,
      invoice: o.invoice,
      createdAt: o.createdAt,
      confirmedAt: o.confirmedAt,
    }))

    return NextResponse.json({ data: mapped })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load orders"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Accepts orders from:
  // 1. Internal admin users (authenticated via NextAuth)
  // 2. B2B customers (via customerId in request body - validated against DB)
  try {
    const body = await req.json()
    const { customerId, items, shippingAddress, notes, paymentTerms } = body

    if (!customerId || !items || items.length === 0) {
      return NextResponse.json({ error: "Customer ID and items are required" }, { status: 400 })
    }

    // Validate customer exists and is active
    const customer = await prisma.b2BCustomer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }
    if (customer.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account is not active. Please wait for approval." }, { status: 403 })
    }

    // Calculate totals from product prices
    let subtotal = 0
    const orderItems = []
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 })
      const unitPrice = Number(item.unitPrice) || Number(product.sellPerUnit)
      const totalPrice = item.quantity * unitPrice
      subtotal += totalPrice
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      })
    }

    const count = await prisma.b2BOrder.count()
    const orderNumber = `B2B-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`

    const order = await prisma.b2BOrder.create({
      data: {
        orderNumber,
        customerId,
        status: "PENDING",
        shippingAddress,
        notes,
        subtotal,
        paymentTerms: paymentTerms || customer.paymentTerms || "net30",
        items: { create: orderItems },
      },
      include: {
        customer: { select: { companyName: true, email: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    })

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
