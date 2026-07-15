import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  const permErr = await requirePermission(session, "accounting", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const today = new Date()

    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      },
      include: {
        customer: { select: { id: true, companyName: true, contactPerson: true, email: true, phone: true } },
        payments: { select: { id: true, amount: true } },
      },
      orderBy: { dueDate: "asc" },
    })

    const aging = invoices.map((inv) => {
      const dueDate = new Date(inv.dueDate)
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const balanceDue = Number(inv.balanceDue)

      let bucket = "current"
      if (diffDays > 0 && diffDays <= 30) bucket = "1-30"
      else if (diffDays > 30 && diffDays <= 60) bucket = "31-60"
      else if (diffDays > 60 && diffDays <= 90) bucket = "61-90"
      else if (diffDays > 90) bucket = "90+"

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        daysOverdue: diffDays > 0 ? diffDays : 0,
        totalAmount: Number(inv.totalAmount),
        amountPaid: Number(inv.amountPaid),
        balanceDue,
        bucket,
        status: inv.status,
      }
    })

    // Summarize by bucket
    const summary = {
      current: aging.filter((a) => a.bucket === "current").reduce((s, a) => s + a.balanceDue, 0),
      "1-30": aging.filter((a) => a.bucket === "1-30").reduce((s, a) => s + a.balanceDue, 0),
      "31-60": aging.filter((a) => a.bucket === "31-60").reduce((s, a) => s + a.balanceDue, 0),
      "61-90": aging.filter((a) => a.bucket === "61-90").reduce((s, a) => s + a.balanceDue, 0),
      "90+": aging.filter((a) => a.bucket === "90+").reduce((s, a) => s + a.balanceDue, 0),
    }

    const totalOutstanding = Object.values(summary).reduce((s, v) => s + v, 0)

    return NextResponse.json({
      data: aging,
      summary: {
        ...summary,
        totalOutstanding,
        totalInvoices: aging.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load aging report"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
