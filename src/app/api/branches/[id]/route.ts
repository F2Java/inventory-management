import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        warehouses: {
          include: {
            warehouse: {
              include: {
                stock: {
                  include: { product: { select: { id: true, name: true, sku: true, sellPerUnit: true, unit: true } } },
                  orderBy: { quantity: "desc" },
                  take: 100,
                },
              },
            },
          },
        },
        ecommerceConnector: true,
        sales: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        },
        _count: { select: { sales: true, products: true } },
      },
    })

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    // Flatten warehouse stock for easy consumption
    const stockSummary = branch.warehouses.flatMap((wb) =>
      wb.warehouse.stock.map((s) => ({
        stockId: s.id,
        warehouseId: s.warehouseId,
        warehouseName: wb.warehouse.name,
        productId: s.productId,
        productName: s.product.name,
        productSku: s.product.sku,
        quantity: s.quantity,
        reservedQty: s.reservedQty,
        available: s.quantity - s.reservedQty,
        unit: s.product.unit,
        sellPrice: Number(s.product.sellPerUnit),
      }))
    )

    return NextResponse.json({
      data: {
        ...branch,
        stockSummary,
        warehouses: branch.warehouses.map((wb) => ({
          id: wb.warehouse.id,
          code: wb.warehouse.code,
          name: wb.warehouse.name,
          type: wb.warehouse.type,
          stockCount: wb.warehouse.stock.length,
        })),
      },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
