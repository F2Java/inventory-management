import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "inventory", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const type = searchParams.get("type") || ""
    const productId = searchParams.get("productId") || ""

    const where: any = {}
    if (type) where.type = type
    if (productId) where.productId = productId

    const [data, total] = await Promise.all([
      prisma.warehouseStockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          fromWarehouse: { select: { id: true, name: true } },
          toWarehouse: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.warehouseStockMovement.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
