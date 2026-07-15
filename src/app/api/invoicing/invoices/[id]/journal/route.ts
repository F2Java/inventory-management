import { NextRequest, NextResponse } from "next/server"
import { auth, requirePermission } from "@/lib/auth"
import { postInvoiceJournal } from "@/lib/invoicing/invoice-journal"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "accounting", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const result = await postInvoiceJournal(id, session.user.id)

    if (!result) {
      return NextResponse.json({ error: "Invoice total is zero or negative" }, { status: 400 })
    }

    if (result.alreadyPosted) {
      return NextResponse.json({ message: "Journal already posted", journalId: result.journalId })
    }

    return NextResponse.json({
      success: true,
      message: "Journal posted successfully",
      data: result.journal,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to post journal"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
