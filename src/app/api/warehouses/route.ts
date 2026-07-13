import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  const permErr = await requirePermission(session, "warehouses", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: { select: { stock: true } },
        branches: { include: { branch: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: warehouses })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const permErr = await requirePermission(session, "warehouses", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const warehouse = await prisma.warehouse.create({
      data: {
        code: body.code,
        name: body.name,
        type: body.type || "MAIN",
        address: body.address,
        phone: body.phone,
        merchantId: session.user.merchantId!,
      },
    })

    return NextResponse.json({ success: true, data: warehouse })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const permErr = await requirePermission(session, "warehouses", "delete")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 })

    // Check if warehouse has stock
    const stockCount = await prisma.warehouseStock.count({ where: { warehouseId: id } })
    if (stockCount > 0) {
      return NextResponse.json({
        error: `Cannot delete warehouse with ${stockCount} product(s) in stock. Move or remove stock first.`,
      }, { status: 400 })
    }

    // Delete warehouse connections first
    await prisma.warehouseBranch.deleteMany({ where: { warehouseId: id } })
    await prisma.stockThreshold.deleteMany({ where: { warehouseId: id } })

    await prisma.warehouse.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
