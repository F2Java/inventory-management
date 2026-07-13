import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "inventory", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: any = {}
    if (status) where.status = status

    const [data, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          requestedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockAdjustment.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "inventory", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { productId, warehouseId, newQuantity, reason, photoEvidence } = body

    if (!productId || !warehouseId || newQuantity === undefined || !reason?.trim()) {
      return NextResponse.json({ error: "Missing required fields: productId, warehouseId, newQuantity, reason" }, { status: 400 })
    }

    const newQty = parseInt(newQuantity)
    if (isNaN(newQty) || newQty < 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 })
    }

    // Get current stock
    const stock = await prisma.warehouseStock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    })
    const previousQty = stock?.quantity || 0

    const adjustmentNumber = `ADJ-${Date.now()}`

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        adjustmentNumber,
        product: { connect: { id: productId } },
        warehouse: { connect: { id: warehouseId } },
        previousQty,
        newQty,
        difference: newQty - previousQty,
        reason: reason.trim(),
        photoEvidence: photoEvidence || null,
        status: "PENDING",
        requestedBy: { connect: { id: session.user.id } },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: adjustment })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
