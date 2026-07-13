import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "inventory", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const warehouseId = searchParams.get("warehouseId") || ""
    const status = searchParams.get("status") || "" // low_stock, out_of_stock, over_stock

    const where: any = {}
    if (warehouseId) where.warehouseId = warehouseId

    let stock = await prisma.warehouseStock.findMany({
      where,
      include: {
        product: { include: { category: true, uoms: { include: { uom: true } } } },
        warehouse: true,
      },
      orderBy: { updatedAt: "desc" },
    })

    // Filter by status
    if (status === "low_stock") {
      stock = stock.filter((s) => s.quantity > 0 && s.quantity <= s.minStock)
    } else if (status === "out_of_stock") {
      stock = stock.filter((s) => s.quantity === 0)
    } else if (status === "over_stock") {
      stock = stock.filter((s) => s.maxStock && s.quantity > s.maxStock)
    }

    return NextResponse.json({ data: stock })
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
  const permErr = await requirePermission(session, "inventory", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { productId, warehouseId, quantity, newQuantity, type, notes } = body

    // Find or create stock record
    let stock = await prisma.warehouseStock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    })

    if (!stock) {
      stock = await prisma.warehouseStock.create({
        data: { productId, warehouseId, quantity: 0 },
      })
    }

    const previousStock = stock.quantity

    // Determine new stock value and movement type
    let newStock: number
    let movementType: string
    let movementQty: number
    let movementNotes: string

    if (type === "adjustment" && newQuantity !== undefined) {
      // Absolute adjustment: set stock to exact newQuantity value
      const qty = parseInt(newQuantity) || 0
      newStock = qty
      movementType = "ADJUSTMENT"
      const diff = newStock - previousStock
      movementQty = Math.abs(diff)
      movementNotes = notes || `Stock adjusted from ${previousStock} to ${newStock}`
    } else {
      // Delta-based in/out
      const delta = parseInt(quantity) || 0
      newStock = type === "in" ? previousStock + delta : previousStock - delta
      movementType = type === "in" ? "IN" : "OUT"
      movementQty = delta
      movementNotes = notes || ""
    }

    // Prevent negative stock
    if (newStock < 0) newStock = 0

    // Update stock
    await prisma.warehouseStock.update({
      where: { id: stock.id },
      data: { quantity: newStock },
    })

    // Create stock movement record if quantity changed
    if (movementQty > 0 || type === "adjustment") {
      const reference = `MOV-${Date.now()}`
      const isIncrease = type === "in" || (type === "adjustment" && newStock > previousStock)
      await prisma.warehouseStockMovement.create({
        data: {
          reference,
          type: movementType as any,
          productId,
          ...(isIncrease
            ? { toWarehouseId: warehouseId }
            : { fromWarehouseId: warehouseId }
          ),
          quantity: movementQty,
          notes: movementNotes,
          createdById: session.user.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { previousStock, newStock, reference: `MOV-${Date.now()}`, type: movementType },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
