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
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, purchaseOrders: true } },
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { poNumber: true, status: true, grandTotal: true, createdAt: true },
        },
        products: {
          include: { product: { select: { name: true, sku: true } } },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json({ data: supplier })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
