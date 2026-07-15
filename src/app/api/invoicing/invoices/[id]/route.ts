import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { postInvoiceJournal } from "@/lib/invoicing/invoice-journal"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const permErr = await requirePermission(session, "accounting", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: {
          include: {
            items: {
              include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
        journal: {
          include: {
            entries: {
              include: { account: { select: { accountCode: true, accountName: true } } },
            },
          },
        },
      },
    })
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    return NextResponse.json({ data: invoice })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load invoice"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "accounting", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const body = await req.json()
    const { status, notes, terms, dueDate } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (terms !== undefined) updateData.terms = terms
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    })

    // Post journal if marked as posted
    if (body.postToJournal && !invoice.postedToJournal) {
      try {
        await postInvoiceJournal(invoice.id, session.user.id)
      } catch (journalErr) {
        console.error("Journal posting failed:", journalErr)
      }
    }

    return NextResponse.json({ success: true, data: invoice })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update invoice"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
