import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get("unread") === "true"
    const type = searchParams.get("type") || ""

    const where: any = {}
    if (unreadOnly) where.isRead = false
    if (type) where.type = type

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: { isRead: false },
    })

    return NextResponse.json({ data: notifications, unreadCount })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { type, title, message, entityType, entityId, thresholdDays } = body

    if (!type || !title) {
      return NextResponse.json({ error: "Type and title are required" }, { status: 400 })
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        entityType: entityType || null,
        entityId: entityId || null,
        thresholdDays: thresholdDays || 3,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true, data: notification })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, isRead, all } = body

    if (all) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return NextResponse.json({ success: true, message: "All notifications marked as read" })
    }

    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: isRead !== undefined ? isRead : true, readAt: new Date() },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

// Endpoint to check for stale statuses and create notifications
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const { searchParams: putParams } = new URL(req.url)
    const thresholdDays = parseInt(putParams.get("thresholdDays") || "3")
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000
    const thresholdAgo = new Date(now.getTime() - thresholdMs)

    // Find stale sales (status unchanged for 3+ days)
    const staleSales = await prisma.sale.findMany({
      where: {
        updatedAt: { lte: thresholdAgo },
        status: { notIn: ["DELIVERED", "CANCELLED", "RETURNED"] },
      },
      select: { id: true, orderNumber: true, status: true, customerName: true, updatedAt: true },
    })

    // Find stale POs (status unchanged for 3+ days)
    const stalePOs = await prisma.purchaseOrder.findMany({
      where: {
        updatedAt: { lte: thresholdAgo },
        status: { notIn: ["RECEIVED", "CANCELLED"] },
      },
      select: { id: true, poNumber: true, status: true, supplierName: true, updatedAt: true },
    })

    // Find stale stock requests
    const staleRequests = await prisma.stockRequest.findMany({
      where: {
        updatedAt: { lte: thresholdAgo },
        status: { notIn: ["FULFILLED", "CANCELLED"] },
      },
      select: { id: true, requestNumber: true, status: true, warehouse: { select: { name: true } }, updatedAt: true },
    })

    // Create notifications for stale items
    let created = 0

    for (const sale of staleSales) {
      const hoursSinceUpdate = Math.floor((now.getTime() - sale.updatedAt.getTime()) / (1000 * 60 * 60))
      await prisma.notification.upsert({
        where: { id: `stale-sale-${sale.id}` },
        update: { message: `Status \"${sale.status.toLowerCase()}\" for ${hoursSinceUpdate}h` },
        create: {
          id: `stale-sale-${sale.id}`,
          type: "stale_status",
          title: `Order ${sale.orderNumber} stuck in ${sale.status.toLowerCase()}`,
          message: `Customer: ${sale.customerName || "Guest"} — ${hoursSinceUpdate}h in current status`,
          entityType: "sale",
          entityId: sale.id,
          thresholdDays: 3,
        },
      })
      created++
    }

    for (const po of stalePOs) {
      const hoursSinceUpdate = Math.floor((now.getTime() - po.updatedAt.getTime()) / (1000 * 60 * 60))
      await prisma.notification.upsert({
        where: { id: `stale-po-${po.id}` },
        update: { message: `Status \"${po.status.toLowerCase()}\" for ${hoursSinceUpdate}h` },
        create: {
          id: `stale-po-${po.id}`,
          type: "stale_status",
          title: `PO ${po.poNumber} stuck in ${po.status.toLowerCase()}`,
          message: `Supplier: ${po.supplierName} — ${hoursSinceUpdate}h in current status`,
          entityType: "purchase_order",
          entityId: po.id,
          thresholdDays: 3,
        },
      })
      created++
    }

    for (const req of staleRequests) {
      const hoursSinceUpdate = Math.floor((now.getTime() - req.updatedAt.getTime()) / (1000 * 60 * 60))
      await prisma.notification.upsert({
        where: { id: `stale-sr-${req.id}` },
        update: { message: `Status \"${req.status.toLowerCase()}\" for ${hoursSinceUpdate}h` },
        create: {
          id: `stale-sr-${req.id}`,
          type: "stale_status",
          title: `Stock request ${req.requestNumber} stuck in ${req.status.toLowerCase()}`,
          message: `Warehouse: ${req.warehouse?.name || "Unknown"} — ${hoursSinceUpdate}h in current status`,
          entityType: "stock_request",
          entityId: req.id,
          thresholdDays: 3,
        },
      })
      created++
    }

    return NextResponse.json({
      success: true,
      message: `Checked and created ${created} stale-status notifications`,
      created,
      details: {
        sales: staleSales.length,
        purchaseOrders: stalePOs.length,
        stockRequests: staleRequests.length,
      },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
