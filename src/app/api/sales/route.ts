import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { pushStockUpdateToPlatforms } from "@/lib/ecommerce/stock-sync"
import { postSaleJournal } from "@/lib/accounting/journal-helpers"
import { ActivityActions } from "@/lib/activity-logger"

async function syncStockToEcommerce(saleId: string) {
  // After a sale is created, auto-deduct stock and push changes to connected e-commerce platforms
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        branch: {
          include: {
            ecommerceConnector: true,
            warehouses: {
              include: { warehouse: { select: { id: true } } },
            },
          },
        },
      },
    })

    if (!sale) return

    // Get the branch's linked warehouse IDs
    const branchWarehouseIds = sale.branch?.warehouses?.map((wb) => wb.warehouse.id) || []

    // Decrease warehouse stock for each item sold
    for (const item of sale.items) {
      // First, try to deduct from branch-linked warehouses
      let stock = null
      if (branchWarehouseIds.length > 0) {
        stock = await prisma.warehouseStock.findFirst({
          where: {
            productId: item.productId,
            warehouseId: { in: branchWarehouseIds },
            quantity: { gte: item.quantity },
          },
          orderBy: { quantity: "desc" },
        })
      }

      // Fallback: if no stock found in branch warehouses, try any warehouse
      if (!stock) {
        stock = await prisma.warehouseStock.findFirst({
          where: { productId: item.productId, quantity: { gte: item.quantity } },
          orderBy: { quantity: "desc" },
        })
      }

      if (stock) {
        await prisma.warehouseStock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity - item.quantity },
        })

        // Log stock movement
        await prisma.warehouseStockMovement.create({
          data: {
            reference: `SALE-${sale.orderNumber}`,
            type: "SALE",
            productId: item.productId,
            fromWarehouseId: stock.warehouseId,
            quantity: item.quantity,
            notes: `Auto-deduct from sale ${sale.orderNumber}`,
          },
        })

        // Push updated stock to all connected e-commerce platforms
        await pushStockUpdateToPlatforms(item.productId)
      } else {
        console.warn(
          `Insufficient stock for product ${item.productId} (${item.product?.sku || ""}) on sale ${sale.orderNumber}`
        )
      }
    }
  } catch (error) {
    console.error("Auto stock sync failed:", error)
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "sales", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status") || ""
    const branchId = searchParams.get("branchId") || ""

    const where: any = {}
    if (status) where.status = status
    if (branchId) where.branchId = branchId

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: { include: { product: true } },
          branch: true,
          connector: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.sale.count({ where }),
    ])

    return NextResponse.json({ data: sales, total, page, limit, totalPages: Math.ceil(total / limit) })
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
  const permErr = await requirePermission(session, "sales", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { items, ...saleData } = body

    const sale = await prisma.sale.create({
      data: {
        orderNumber: `INV-${Date.now()}`,
        customerName: saleData.customerName,
        customerEmail: saleData.customerEmail,
        customerPhone: saleData.customerPhone,
        shippingAddress: saleData.shippingAddress,
        subtotal: parseFloat(saleData.subtotal) || 0,
        taxAmount: parseFloat(saleData.taxAmount) || 0,
        shippingCost: parseFloat(saleData.shippingCost) || 0,
        discountAmount: parseFloat(saleData.discountAmount) || 0,
        totalAmount: parseFloat(saleData.totalAmount) || 0,
        currency: saleData.currency || "IDR",
        exchangeRate: parseFloat(saleData.exchangeRate) || 1,
        connectorId: saleData.connectorId,
        branchId: saleData.branchId,
        notes: saleData.notes,
        // Create sale items inline
        ...(Array.isArray(items) && items.length > 0
          ? {
              items: {
                create: items.map((item: any) => ({
                  productId: item.productId,
                  quantity: parseInt(item.quantity) || 1,
                  unitPrice: parseFloat(item.unitPrice) || 0,
                  totalPrice:
                    (parseInt(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
                })),
              },
            }
          : {}),
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        branch: { select: { id: true, name: true } },
      },
    })

    // Auto-sync stock changes to warehouse and e-commerce
    await syncStockToEcommerce(sale.id)

    // Auto-post journal entry (Dr. Kas, Cr. Pendapatan Penjualan)
    try {
      await postSaleJournal(sale.id, session.user.id)
    } catch (journalErr) {
      console.error("Auto journal posting failed for sale:", journalErr)
    }

    // Log activity
    ActivityActions.sale.create(session!.user!.id, sale.id, sale.orderNumber)

    return NextResponse.json({ success: true, data: sale })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
