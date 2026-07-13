import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generatePONumber } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || ""
    const warehouseId = searchParams.get("warehouseId") || ""

    const where: any = {}
    if (status) where.status = status
    if (warehouseId) where.warehouseId = warehouseId

    const requests = await prisma.stockRequest.findMany({
      where,
      include: {
        warehouse: true,
        items: { include: { product: { select: { id: true, name: true, sku: true, sellPerUnit: true } } } },
        purchaseOrder: { select: { poNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ data: requests })
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
    const { warehouseId, priority, notes, items } = body

    if (!warehouseId || !items?.length) {
      return NextResponse.json({ error: "Warehouse and items are required" }, { status: 400 })
    }

    const requestNumber = `SR-${Date.now().toString(36).toUpperCase()}`

    const stockRequest = await prisma.stockRequest.create({
      data: {
        requestNumber,
        warehouseId,
        priority: priority || "NORMAL",
        notes,
        requestedById: session.user.id,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantityRequested: parseInt(item.quantityRequested) || 0,
            notes: item.notes,
          })),
        },
      },
      include: {
        warehouse: true,
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })

    return NextResponse.json({ success: true, data: stockRequest })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

// PATCH: Update status, approve, or release as PO
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, status, approvedById, supplierId, supplierName } = body

    if (!id || !status) {
      return NextResponse.json({ error: "Request ID and status are required" }, { status: 400 })
    }

    // If releasing as PO, create a purchase order (or link existing one)
    if (status === "RELEASED") {
      // If purchaseOrderId is provided, link existing PO (from manual creation)
      if (body.purchaseOrderId) {
        const updated = await prisma.stockRequest.update({
          where: { id },
          data: {
            status: "RELEASED",
            approvedById: approvedById || session.user.id,
            approvedAt: new Date(),
            purchaseOrderId: body.purchaseOrderId,
          },
          include: {
            warehouse: true,
            items: { include: { product: { select: { name: true, sku: true } } } },
            purchaseOrder: { select: { poNumber: true, grandTotal: true } },
          },
        })
        return NextResponse.json({ success: true, data: updated })
      }

      // Auto-generate PO from the request (inline release)
      const request = await prisma.stockRequest.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, warehouse: true },
      })

      if (!request) {
        return NextResponse.json({ error: "Stock request not found" }, { status: 404 })
      }

      const poNumber = generatePONumber()
      let totalAmount = 0
      const poItems = request.items.map((item) => {
        const unitCost = Number(item.product.sellPerUnit) * 0.7
        const total = unitCost * item.quantityRequested
        totalAmount += total
        return {
          productId: item.productId,
          quantity: item.quantityRequested,
          unitCost,
          totalCost: total,
        }
      })

      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: supplierId || null,
          supplierName: supplierName || "Auto-Generated from Stock Request",
          status: "PENDING_APPROVAL",
          totalAmount,
          taxAmount: totalAmount * 0.11,
          grandTotal: totalAmount * 1.11,
          warehouseId: request.warehouseId,
          notes: `Auto-generated from stock request ${request.requestNumber}`,
          items: { create: poItems },
        },
      })

      const updated = await prisma.stockRequest.update({
        where: { id },
        data: {
          status: "RELEASED",
          approvedById: approvedById || session.user.id,
          approvedAt: new Date(),
          purchaseOrderId: purchaseOrder.id,
        },
        include: {
          warehouse: true,
          items: { include: { product: { select: { name: true, sku: true } } } },
          purchaseOrder: { select: { poNumber: true, grandTotal: true } },
        },
      })

      return NextResponse.json({ success: true, data: updated, generatedPO: purchaseOrder })
    }

    // Simple status update
    const data: any = { status }
    if (status === "APPROVED") {
      data.approvedById = approvedById || session.user.id
      data.approvedAt = new Date()
    }

    const updated = await prisma.stockRequest.update({
      where: { id },
      data,
      include: {
        warehouse: true,
        items: { include: { product: { select: { name: true, sku: true } } } },
        purchaseOrder: { select: { poNumber: true, status: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Request ID is required" }, { status: 400 })

    // Only PENDING requests can be deleted
    const request = await prisma.stockRequest.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!request) {
      return NextResponse.json({ error: "Stock request not found" }, { status: 404 })
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({
        error: `Cannot delete stock request with status "${request.status}". Only PENDING requests can be deleted.`,
      }, { status: 400 })
    }

    await prisma.stockRequest.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
