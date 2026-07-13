import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const thresholds = await prisma.stockThreshold.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: [{ product: { name: "asc" } }],
    })

    // Fetch stock quantities separately (no direct relation from threshold to stock)
    const stocks = await prisma.warehouseStock.findMany({
      where: {
        OR: thresholds.map((t) => ({
          productId: t.productId,
          warehouseId: t.warehouseId,
        })),
      },
      select: { productId: true, warehouseId: true, quantity: true, minStock: true, maxStock: true },
    })

    const stockMap = new Map(stocks.map((s) => [`${s.productId}-${s.warehouseId}`, s]))

    const enriched = thresholds.map((t) => {
      const stock = stockMap.get(`${t.productId}-${t.warehouseId}`)
      return {
        ...t,
        currentStock: stock?.quantity || 0,
        warehouseMinStock: stock?.minStock || t.minLevel,
        warehouseMaxStock: stock?.maxStock || t.maxLevel,
      }
    })

    return NextResponse.json({ data: enriched })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { stockId, productId, warehouseId, minStock, maxStock } = body

    // Resolve the target stock record: by stockId or by productId+warehouseId
    let targetStockId = stockId
    if (!targetStockId) {
      if (!productId || !warehouseId) {
        return NextResponse.json({ error: "stockId or (productId + warehouseId) is required" }, { status: 400 })
      }
      // Look up or create the warehouseStock record
      const existing = await prisma.warehouseStock.upsert({
        where: {
          productId_warehouseId: { productId, warehouseId },
        },
        update: {}, // No update yet
        create: {
          productId,
          warehouseId,
          quantity: 0,
          minStock: 0,
        },
        select: { id: true },
      })
      targetStockId = existing.id
    }

    const data: any = {}
    if (minStock !== undefined) data.minStock = parseInt(minStock) || 0
    if (maxStock !== undefined) data.maxStock = maxStock ? parseInt(maxStock) : null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "minStock or maxStock must be provided" }, { status: 400 })
    }

    const updated = await prisma.warehouseStock.update({
      where: { id: targetStockId },
      data,
      select: { id: true, minStock: true, maxStock: true, productId: true, warehouseId: true },
    })

    // Also sync to StockThreshold table
    await prisma.stockThreshold.upsert({
      where: {
        productId_warehouseId: { productId: updated.productId, warehouseId: updated.warehouseId },
      },
      update: {
        minLevel: data.minStock ?? undefined,
        maxLevel: data.maxStock ?? undefined,
      },
      create: {
        productId: updated.productId,
        warehouseId: updated.warehouseId,
        minLevel: data.minStock ?? 0,
        maxLevel: data.maxStock ?? null,
        alert: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
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
    // Find all warehouse stock records where quantity is at or below minStock
    // Note: Prisma does not support field-to-field comparison in where clauses,
    // so we fetch records with configured thresholds and filter in-memory.
    const allStock = await prisma.warehouseStock.findMany({
      where: {
        minStock: { gt: 0 }, // Only consider records where a threshold is actually set
        product: { isActive: true },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, sellPerUnit: true } },
        warehouse: { select: { id: true, name: true } },
      },
    })

    const belowThreshold = allStock.filter((s) => s.quantity <= s.minStock)

    if (belowThreshold.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No products below minimum stock level found.",
        requestsCreated: 0,
      })
    }

    // Group by warehouse
    const byWarehouse = new Map<string, typeof belowThreshold>()
    for (const item of belowThreshold) {
      const existing = byWarehouse.get(item.warehouseId) || []
      existing.push(item)
      byWarehouse.set(item.warehouseId, existing)
    }

    // Create a stock request for each warehouse
    let totalRequests = 0
    for (const [warehouseId, items] of byWarehouse) {
      const requestNumber = `AUTO-SR-${Date.now().toString(36).toUpperCase()}-${totalRequests}`

      await prisma.stockRequest.create({
        data: {
          requestNumber,
          warehouseId,
          priority: "HIGH",
          notes: `Auto-generated: ${items.length} item(s) below minimum stock`,
          requestedById: session.user.id,
          items: {
            create: items.map((item) => {
              // Calculate suggested reorder quantity
              const defaultQty = Number(item.product.sellPerUnit) > 0
                ? Math.ceil(Number(item.product.sellPerUnit) * 3)
                : 50
              const reorderQty = Math.max(defaultQty - item.quantity, 10)
              return {
                productId: item.productId,
                quantityRequested: reorderQty,
                notes: `Current: ${item.quantity}, Min: ${item.minStock}`,
              }
            }),
          },
        },
      })
      totalRequests++
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${totalRequests} stock request(s) from ${belowThreshold.length} low-stock product(s).`,
      requestsCreated: totalRequests,
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
