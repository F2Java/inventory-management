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
    const categoryId = searchParams.get("categoryId") || ""

    const where: any = {}
    if (warehouseId) where.warehouseId = warehouseId

    let stock = await prisma.warehouseStock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            costPerUnit: true,
            sellPerUnit: true,
            category: { select: { id: true, name: true } },
            uoms: {
              include: { uom: true },
            },
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ product: { name: "asc" } }],
    })

    // Filter by category if specified
    if (categoryId) {
      stock = stock.filter((s) => s.product.category?.id === categoryId)
    }

    const reportData = stock.map((s) => {
      const costPerUnit = Number(s.product.costPerUnit)
      const totalValue = s.quantity * costPerUnit

      // Dual-UoM calculation
      const uoms = s.product.uoms || []
      const baseUom = uoms.find((u) => u.isBase) || uoms[0]
      const altUom = uoms.find((u) => !u.isBase)
      let dualUom = null
      if (altUom && baseUom && altUom.conversionToBase > 1) {
        const convRate = altUom.conversionToBase
        const fullUnits = Math.floor(s.quantity / convRate)
        const remainder = s.quantity % convRate
        dualUom = {
          fullUnits,
          remainder,
          altAbbr: altUom.uom?.abbreviation || "",
          baseAbbr: baseUom.uom?.abbreviation || "",
          altName: altUom.uom?.name || "Alt",
          baseName: baseUom.uom?.name || "Base",
        }
      }

      return {
        id: s.id,
        productId: s.product.id,
        productName: s.product.name,
        sku: s.product.sku,
        unit: s.product.unit,
        category: s.product.category?.name || "—",
        warehouseId: s.warehouse.id,
        warehouseName: s.warehouse.name,
        warehouseCode: s.warehouse.code,
        quantity: s.quantity,
        reservedQty: s.reservedQty,
        availableQty: s.quantity - s.reservedQty,
        costPerUnit,
        sellPerUnit: Number(s.product.sellPerUnit),
        totalValue,
        dualUom,
      }
    })

    // Summaries
    const totalItems = reportData.length
    const totalUnits = reportData.reduce((sum, r) => sum + r.quantity, 0)
    const totalInventoryValue = reportData.reduce((sum, r) => sum + r.totalValue, 0)

    return NextResponse.json({
      data: reportData,
      summary: { totalItems, totalUnits, totalInventoryValue },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
