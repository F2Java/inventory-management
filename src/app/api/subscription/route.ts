import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "subscription", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: session.user.merchantId as string },
      select: {
        id: true,
        code: true,
        companyName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        subscriptionReminderSent: true,
        createdAt: true,
      },
    })

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
    }

    // Calculate days remaining and reminder status
    let daysRemaining: number | null = null
    let isExpiringSoon = false
    let needsReminder = false

    if (merchant.subscriptionEnd) {
      const now = new Date()
      const end = new Date(merchant.subscriptionEnd)
      daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      isExpiringSoon = daysRemaining <= 90 && daysRemaining > 0

      // Check if we need to send reminder (3 months = ~90 days before expiry)
      if (daysRemaining <= 90 && daysRemaining > 0 && !merchant.subscriptionReminderSent) {
        needsReminder = true
      }
    }

    return NextResponse.json({
      data: {
        ...merchant,
        daysRemaining,
        isExpiringSoon,
        needsReminder,
      },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "subscription", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { subscriptionPlan, subscriptionStatus, subscriptionStart, subscriptionEnd } = body

    const updateData: any = {}
    if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus
    if (subscriptionStart !== undefined) updateData.subscriptionStart = new Date(subscriptionStart)
    if (subscriptionEnd !== undefined) updateData.subscriptionEnd = new Date(subscriptionEnd)

    // Reset reminder flag when subscription is updated
    updateData.subscriptionReminderSent = false

    const merchant = await prisma.merchant.update({
      where: { id: session.user.merchantId as string },
      data: updateData,
      select: {
        id: true,
        code: true,
        companyName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
      },
    })

    return NextResponse.json({ success: true, data: merchant })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

// Endpoint to acknowledge/clear the reminder
export async function PATCH() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "subscription", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    await prisma.merchant.update({
      where: { id: session.user.merchantId as string },
      data: { subscriptionReminderSent: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
