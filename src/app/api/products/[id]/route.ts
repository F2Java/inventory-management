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
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        uoms: { include: { uom: true } },
        warehouseStock: { include: { warehouse: true } },
        suppliers: { include: { supplier: true } },
        thresholds: true,
        warehouseStockMovements: {
          take: 50,
          orderBy: { createdAt: "desc" },
          include: {
            fromWarehouse: { select: { id: true, name: true, code: true } },
            toWarehouse: { select: { id: true, name: true, code: true } },
          },
        },
        // Variant support
        variantGroups: {
          include: { options: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        childVariants: {
          where: { isActive: true },
          include: {
            warehouseStock: {
              include: { warehouse: { select: { id: true, name: true, code: true } } },
            },
            variantOptionAssignments: {
              include: {
                option: { include: { group: { select: { id: true, name: true } } } },
              },
            },
            uoms: { include: { uom: true } },
          },
          orderBy: { sku: "asc" },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ data: product })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
