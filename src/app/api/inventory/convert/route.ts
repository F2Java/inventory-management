import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const permErr = await requirePermission(session, "inventory", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { stockId, direction, targetUomId, quantity, reason } = body
    // direction: "split" = break larger UoM into smaller (e.g., 1 carton → 50 pcs)
    //            "combine" = combine smaller into larger (e.g., 50 pcs → 1 carton)

    if (!stockId || !direction || !targetUomId) {
      return NextResponse.json(
        { error: "stockId, direction (split|combine), and targetUomId are required" },
        { status: 400 }
      )
    }

    if (!["split", "combine"].includes(direction)) {
      return NextResponse.json(
        { error: "direction must be 'split' or 'combine'" },
        { status: 400 }
      )
    }

    // Fetch the stock record with product + UoM info
    const stockRecord = await prisma.warehouseStock.findUnique({
      where: { id: stockId },
      include: {
        product: {
          include: {
            uoms: {
              include: { uom: true },
            },
          },
        },
        warehouse: { select: { id: true, name: true } },
      },
    })

    if (!stockRecord) {
      return NextResponse.json({ error: "Stock record not found" }, { status: 404 })
    }

    // Find the source UoM and base UoM
    const targetUom = stockRecord.product.uoms.find((u) => u.uomId === targetUomId)
    const baseUom = stockRecord.product.uoms.find((u) => u.isBase)

    if (!targetUom) {
      return NextResponse.json({ error: "Target UoM not found for this product" }, { status: 400 })
    }

    if (!baseUom) {
      return NextResponse.json(
        { error: "Product has no base UoM configured. Set a base unit first in product settings." },
        { status: 400 }
      )
    }

    // Determine which UoM is larger vs smaller based on conversionToBase
    // conversionToBase = how many base units make 1 of this UoM
    // Larger number = bigger UoM (e.g., carton=50, pcs=1)
    const conversionRate = targetUom.conversionToBase

    const qtyInSourceUom = parseInt(quantity) || 1
    // The conversion to base units: how many base units this operation affects
    const baseQtyAffected = qtyInSourceUom * conversionRate

    if (stockRecord.quantity < baseQtyAffected) {
      return NextResponse.json(
        {
          error: `Insufficient stock. Conversion requires ${baseQtyAffected} ${baseUom.uom.abbreviation} but only ${stockRecord.quantity} available.`,
        },
        { status: 400 }
      )
    }

    // Generate a unique reference number
    const refNumber = `CONV-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Create a movement record tracking the conversion
    // Stock quantity stays in base units (pcs) — conversion doesn't change total
    // But we record the event for audit trail
    await prisma.warehouseStockMovement.create({
      data: {
        reference: refNumber,
        type: "CONVERSION" as any,
        productId: stockRecord.productId,
        fromWarehouseId: stockRecord.warehouseId, // conversion happens within this warehouse
        toWarehouseId: stockRecord.warehouseId,
        quantity: baseQtyAffected,
        referenceType: "conversion",
        referenceId: stockRecord.id,
        notes: reason
          ? `[${direction.toUpperCase()}] ${qtyInSourceUom} × ${targetUom.uom.abbreviation} → ${baseQtyAffected} ${baseUom.uom.abbreviation}: ${reason}`
          : `[${direction.toUpperCase()}] ${qtyInSourceUom} × ${targetUom.uom.abbreviation} → ${baseQtyAffected} ${baseUom.uom.abbreviation}`,
        createdById: session!.user!.id,
      },
    })

    // Calculate dual-UoM representation
    const inBaseUom = stockRecord.quantity // total stock in base units (unchanged)
    const inSourceUom = Math.floor(inBaseUom / conversionRate) // full units in the larger UoM
    const remainderInBase = inBaseUom % conversionRate // leftover base units

    return NextResponse.json({
      success: true,
      message: `Converted ${qtyInSourceUom} ${targetUom.uom.abbreviation} to ${baseQtyAffected} ${baseUom.uom.abbreviation} (${direction})`,
      data: {
        refNumber,
        stockId,
        productName: stockRecord.product.name,
        productId: stockRecord.productId,
        warehouseId: stockRecord.warehouseId,
        warehouseName: stockRecord.warehouse.name,
        direction,
        sourceUom: targetUom.uom.abbreviation,
        sourceUomName: targetUom.uom.name,
        baseUom: baseUom.uom.abbreviation,
        baseUomName: baseUom.uom.name,
        conversionRate: conversionRate,
        qtyConverted: qtyInSourceUom,
        baseQtyConverted: baseQtyAffected,
        totalBaseQty: inBaseUom,
        dualUom: {
          inSourceUom,        // e.g., 2 (carton)
          remainderInBase,    // e.g., 40 (pcs)
          sourceAbbr: targetUom.uom.abbreviation,
          baseAbbr: baseUom.uom.abbreviation,
        },
      },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
