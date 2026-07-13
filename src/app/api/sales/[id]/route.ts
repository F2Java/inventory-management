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
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true, sellPerUnit: true, image: true } },
            uom: { select: { name: true, abbreviation: true } },
          },
        },
        branch: { select: { id: true, name: true, code: true } },
        connector: { select: { id: true, platform: true, storeName: true } },
        orderStatuses: { orderBy: { createdAt: "desc" } },
        orderTracking: true,
      },
    })

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }

    return NextResponse.json({ data: sale })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
