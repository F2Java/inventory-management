import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, hasTrackingStatusPermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") || ""

    // Fetch order tracking with sale and product info
    const where: any = {}
    if (statusFilter) where.status = statusFilter

    const tracking = await prisma.orderTracking.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true, orderNumber: true, customerName: true,
            status: true, createdAt: true, branch: { select: { name: true } },
          },
        },
        product: { select: { id: true, name: true, sku: true, barcode: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    })

    // Calculate stale statuses
    const now = new Date()
    const enriched = tracking.map((t) => {
      const lastChange = t.lastStatusChangeAt || t.createdAt
      const hoursInStatus = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60))
      const daysInStatus = Math.floor(hoursInStatus / 24)
      const isStale = daysInStatus >= 3

      return {
        ...t,
        hoursInStatus,
        daysInStatus,
        isStale,
        statusSteps: getStatusSteps(t.status, isStale),
      }
    })

    return NextResponse.json({ data: enriched })
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

  try {
    const body = await req.json()
    const { saleId, productId, status, barcode, trackingNumber, courier, notes } = body

    // Check tracking status permission if status is provided
    if (status && !hasTrackingStatusPermission(session.user.role, session.user.permissions, status)) {
      return NextResponse.json({
        error: `Forbidden: you don't have permission to update tracking to "${status}" status.`,
      }, { status: 403 })
    }

    // Upsert tracking record
    const tracking = await prisma.orderTracking.upsert({
      where: { saleId },
      update: {
        status,
        barcode: barcode || undefined,
        trackingNumber: trackingNumber || undefined,
        courier: courier || undefined,
        notes: notes || undefined,
        lastStatusChangeAt: new Date(),
        statusDuration: 0,
        ...(status === "packed" ? { packagedAt: new Date() } : {}),
        ...(status === "handover" ? { handedOverAt: new Date(), handoverBy: session.user.name || undefined } : {}),
        ...(status === "delivered" ? { deliveredAt: new Date() } : {}),
      },
      create: {
        saleId,
        productId,
        status: status || "pending",
        barcode,
        trackingNumber,
        courier,
        notes,
        lastStatusChangeAt: new Date(),
      },
    })

    // Record status change in order statuses
    await prisma.orderStatus.create({
      data: {
        saleId,
        status: status || "pending",
        description: `Status updated to ${status}${notes ? `: ${notes}` : ""}`,
        updatedBy: session.user.id,
      },
    })

    // Also update the sale's status to match
    if (status) {
      await prisma.sale.update({
        where: { id: saleId },
        data: { status: status.toUpperCase() as any },
      })
    }

    return NextResponse.json({ success: true, data: tracking })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

function getStatusSteps(currentStatus: string, isStale: boolean) {
  const steps = ["pending", "packaging", "packed", "handover", "delivered"]
  const currentIdx = steps.indexOf(currentStatus)
  return steps.map((step, i) => ({
    key: step,
    label: step.charAt(0).toUpperCase() + step.slice(1),
    completed: i <= currentIdx,
    active: i === currentIdx,
    stale: i === currentIdx && isStale,
  }))
}
