import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category") || ""

    const where: any = { isActive: true }
    if (category) where.categoryId = category

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true, thumbnail: true } },
        warehouseStock: {
          select: { quantity: true, warehouse: { select: { name: true } } },
        },
        uoms: {
          include: { uom: true },
          where: { isBase: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    })

    const mapped = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      sku: p.sku,
      price: Number(p.sellPerUnit),
      unit: p.unit,
      image: p.images[0]?.url || null,
      thumbnail: p.images[0]?.thumbnail || null,
      category: p.category.name,
      totalStock: p.warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0),
      uom: p.uoms[0]?.uom?.abbreviation || p.unit,
    }))

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: mapped, categories })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load products"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
