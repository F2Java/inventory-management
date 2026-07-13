import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { generatePONumber } from "@/lib/utils"
import { postPurchaseJournal } from "@/lib/accounting/journal-helpers"
import { ActivityActions, logActivity } from "@/lib/activity-logger"

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "procurement", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || ""
    const poNumber = searchParams.get("poNumber") || ""

    const where: any = {}
    if (status) where.status = status
    if (poNumber) where.poNumber = { contains: poNumber }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
        },
        warehouse: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        stockRequests: { select: { requestNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ data: orders })
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
  const permErr = await requirePermission(session, "procurement", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { supplierId, supplierName, supplierContact, notes, branchId, warehouseId, expectedAt, items, status } = body

    if (!items?.length) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 })
    }

    const poNumber = generatePONumber()
    let totalAmount = 0

    const poItems = items.map((item: any) => {
      const qty = parseInt(item.quantity) || 0
      const cost = parseFloat(item.unitCost) || 0
      const total = qty * cost
      totalAmount += total
      return { productId: item.productId, quantity: qty, unitCost: cost, totalCost: total }
    })

    const taxAmount = totalAmount * 0.11
    const grandTotal = totalAmount + taxAmount

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: supplierId || null,
        supplierName: supplierName || "Unknown Supplier",
        supplierContact: supplierContact || null,
        status: status || "DRAFT",
        notes,
        totalAmount,
        taxAmount,
        grandTotal,
        branchId: branchId || null,
        warehouseId: warehouseId || null,
        expectedAt: expectedAt ? new Date(expectedAt) : null,
        requestedById: session.user.id,
        items: { create: poItems },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        warehouse: { select: { id: true, name: true } },
      },
    })

    // Log activity
    ActivityActions.purchaseOrder.create(session!.user!.id, order.id, order.poNumber)

    return NextResponse.json({ success: true, data: order })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

// PATCH: PO status workflow — approve, send, receive, cancel
// Cancelling after APPROVED requires "delete" permission (elevated authorization)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const permErr = await requirePermission(session, "procurement", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: "PO ID and status are required" }, { status: 400 })
    }

    const validTransitions: Record<string, string[]> = {
      DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
      PENDING_APPROVAL: ["APPROVED", "CANCELLED"],
      APPROVED: ["SENT"],
      SENT: ["PARTIALLY_RECEIVED", "RECEIVED"],
      PARTIALLY_RECEIVED: ["RECEIVED"],
    }

    const currentPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!currentPO) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    const allowedNext = validTransitions[currentPO.status] || []

    // Cancelling after approval (APPROVED, SENT, PARTIALLY_RECEIVED) requires elevated "delete" permission
    // RECEIVED and CANCELLED POs cannot be cancelled under any circumstances
    if (status === "CANCELLED") {
      const cancelAllowed = [...allowedNext, "CANCELLED"]
      if (!cancelAllowed.includes("CANCELLED")) {
        return NextResponse.json({
          error: `Cannot cancel a PO with status "${currentPO.status}".`,
        }, { status: 400 })
      }

      const isBeforeApproval = ["DRAFT", "PENDING_APPROVAL"].includes(currentPO.status)
      if (!isBeforeApproval) {
        // Require elevated delete permission for cancelling after approval
        const delPermErr = await requirePermission(session, "procurement", "delete")
        if (delPermErr) {
          return NextResponse.json({
            error: "Cancelling an approved/released PO requires elevated authorization (delete permission).",
          }, { status: 403 })
        }
      }
      // DRAFT and PENDING_APPROVAL can cancel with edit permission (already checked above)
    } else {
      // Non-cancel transitions — standard validation
      if (!allowedNext.includes(status)) {
        return NextResponse.json({
          error: `Cannot transition from ${currentPO.status} to ${status}. Allowed: ${allowedNext.join(", ") || "none"}`,
        }, { status: 400 })
      }
    }

    const updateData: any = { status }
    if (status === "APPROVED") updateData.approvedById = session.user.id
    if (status === "RECEIVED") updateData.receivedAt = new Date()

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    })

    // If received, update warehouse stock
    if (status === "RECEIVED") {
      for (const item of updated.items) {
        const stock = await prisma.warehouseStock.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: updated.warehouseId || "",
            },
          },
        })

        if (stock) {
          await prisma.warehouseStock.update({
            where: { id: stock.id },
            data: { quantity: stock.quantity + item.quantity },
          })
        } else if (updated.warehouseId) {
          await prisma.warehouseStock.create({
            data: {
              productId: item.productId,
              warehouseId: updated.warehouseId,
              quantity: item.quantity,
            },
          })
        }

        // Record movement
        await prisma.warehouseStockMovement.create({
          data: {
            reference: `PO-${updated.poNumber}-${item.id}`,
            type: "PURCHASE",
            productId: item.productId,
            toWarehouseId: updated.warehouseId,
            quantity: item.quantity,
            referenceType: "purchase_order",
            referenceId: updated.id,
            notes: `PO ${updated.poNumber} received`,
            createdById: session.user.id,
          },
        })
      }

      // Auto-post journal entry (Dr. Persediaan, Cr. Hutang Usaha)
      try {
        await postPurchaseJournal(updated.id, session.user.id)
      } catch (journalErr) {
        console.error("Auto journal posting failed for PO:", journalErr)
      }
    }

    // Log status change
    logActivity({
      userId: session!.user!.id,
      action: "status_change",
      entity: "purchase_order",
      entityId: updated.id,
      details: { poNumber: updated.poNumber, from: currentPO.status, to: status },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
