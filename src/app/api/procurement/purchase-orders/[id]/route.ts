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
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, code: true, contactPerson: true, phone: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: true, sellPerUnit: true } } },
        },
        warehouse: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        stockRequests: { select: { requestNumber: true, status: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json({ data: order })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
