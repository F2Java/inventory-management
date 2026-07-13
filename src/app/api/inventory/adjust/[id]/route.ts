import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "inventory", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const body = await req.json()
    const { action, rejectionReason } = body

    if (!action || !["approve", "reject", "approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Use 'approve'/'approved' or 'reject'/'rejected'." }, { status: 400 })
    }

    const isApprove = action === "approve" || action === "approved"

    // Fetch the pending adjustment
    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
      },
    })

    if (!adjustment) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 })
    }

    if (adjustment.status !== "PENDING") {
      return NextResponse.json(
        { error: `Adjustment is already ${adjustment.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    if (!isApprove) {
      const updated = await prisma.stockAdjustment.update({
        where: { id },
        data: {
          status: "REJECTED",
          approvedById: session.user.id,
          approvedAt: new Date(),
          rejectionReason: rejectionReason?.trim() || null,
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          requestedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
        },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    // Approve: update status, stock, and create movement in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update adjustment status
      await tx.stockAdjustment.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      })

      // 2. Upsert warehouse stock (create or update)
      await tx.warehouseStock.upsert({
        where: {
          productId_warehouseId: {
            productId: adjustment.productId,
            warehouseId: adjustment.warehouseId,
          },
        },
        update: { quantity: adjustment.newQty },
        create: {
          productId: adjustment.productId,
          warehouseId: adjustment.warehouseId,
          quantity: adjustment.newQty,
          minStock: 0,
        },
      })

      // 3. Create stock movement record (skip if no actual change)
      if (adjustment.difference !== 0) {
        const isIncrease = adjustment.difference > 0
        await tx.warehouseStockMovement.create({
          data: {
            reference: adjustment.adjustmentNumber,
            type: "ADJUSTMENT",
            productId: adjustment.productId,
            ...(isIncrease
              ? { toWarehouseId: adjustment.warehouseId }
              : { fromWarehouseId: adjustment.warehouseId }
            ),
            quantity: Math.abs(adjustment.difference),
            notes: `Approved adjustment: ${adjustment.reason} (${adjustment.previousQty} → ${adjustment.newQty})`,
            createdById: session.user.id,
            referenceType: "adjustment",
            referenceId: adjustment.id,
          },
        })
      }

      return tx.stockAdjustment.findUnique({
        where: { id },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          requestedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
        },
      })
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
