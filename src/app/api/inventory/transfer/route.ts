import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { pushStockUpdateToPlatforms } from "@/lib/ecommerce/stock-sync"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "inventory", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = body

    // ─── Validation ───────────────────────────────────────────────────────
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields: productId, fromWarehouseId, toWarehouseId, quantity" },
        { status: 400 }
      )
    }

    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json(
        { error: "Source and destination warehouses must be different" },
        { status: 400 }
      )
    }

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 })
    }

    // ─── Validate warehouses exist ───────────────────────────────────────
    const [fromWarehouse, toWarehouse] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
      prisma.warehouse.findUnique({ where: { id: toWarehouseId } }),
    ])

    if (!fromWarehouse) {
      return NextResponse.json({ error: "Source warehouse not found" }, { status: 404 })
    }
    if (!toWarehouse) {
      return NextResponse.json({ error: "Destination warehouse not found" }, { status: 404 })
    }

    // ─── Validate product exists ─────────────────────────────────────────
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // ─── Check source stock ──────────────────────────────────────────────
    const fromStock = await prisma.warehouseStock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
    })

    const currentQty = fromStock?.quantity || 0
    if (currentQty < qty) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${currentQty}, Requested: ${qty}` },
        { status: 400 }
      )
    }

    // ─── Execute transfer in a transaction ───────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrease source warehouse
      if (fromStock) {
        await tx.warehouseStock.update({
          where: { id: fromStock.id },
          data: { quantity: { decrement: qty } },
        })
      }

      // 2. Increase destination warehouse (create if not exists)
      const toStock = await tx.warehouseStock.findUnique({
        where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
      })

      if (toStock) {
        await tx.warehouseStock.update({
          where: { id: toStock.id },
          data: { quantity: { increment: qty } },
        })
      } else {
        await tx.warehouseStock.create({
          data: {
            productId,
            warehouseId: toWarehouseId,
            quantity: qty,
          },
        })
      }

      // 3. Record movement
      const reference = `TRF-${Date.now()}`
      await tx.warehouseStockMovement.create({
        data: {
          reference,
          type: "TRANSFER",
          productId,
          fromWarehouseId,
          toWarehouseId,
          quantity: qty,
          notes: notes || `Transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
          createdById: session.user.id,
        },
      })

      return { reference, fromName: fromWarehouse.name, toName: toWarehouse.name, qty }
    })

    // ─── Auto-sync stock to connected e-commerce platforms ────────────
    // Push update after transfer so Tokopedia/Shopee reflects new stock levels
    pushStockUpdateToPlatforms(productId).catch((err) =>
      console.error(`E-commerce sync failed after transfer: ${err.message}`)
    )

    return NextResponse.json({
      success: true,
      data: {
        reference: result.reference,
        message: `Transferred ${result.qty} units from ${result.fromName} to ${result.toName}`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
