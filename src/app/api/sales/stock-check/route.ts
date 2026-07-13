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
    const productId = searchParams.get("productId")
    const branchId = searchParams.get("branchId")

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 })
    }

    // Get the branch's linked warehouses
    let warehouseIds: string[] = []
    if (branchId) {
      const branchWarehouses = await prisma.warehouseBranch.findMany({
        where: { branchId },
        select: { warehouseId: true },
      })
      warehouseIds = branchWarehouses.map((wb) => wb.warehouseId)
    }

    // Query stock for this product in the branch's warehouses
    const where: any = { productId }
    if (warehouseIds.length > 0) {
      where.warehouseId = { in: warehouseIds }
    }

    const stockRecords = await prisma.warehouseStock.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { quantity: "desc" },
    })

    const totalAvailable = stockRecords.reduce((sum, s) => sum + s.quantity, 0)
    const totalReserved = stockRecords.reduce((sum, s) => sum + s.reservedQty, 0)

    return NextResponse.json({
      data: {
        totalAvailable,
        totalReserved,
        netAvailable: totalAvailable - totalReserved,
        warehouses: stockRecords.map((s) => ({
          id: s.warehouse.id,
          name: s.warehouse.name,
          code: s.warehouse.code,
          quantity: s.quantity,
          reservedQty: s.reservedQty,
          minStock: s.minStock,
        })),
      },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
