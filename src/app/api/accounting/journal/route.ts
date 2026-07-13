import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const journals = await prisma.journal.findMany({
      include: {
        entries: {
          include: { account: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ data: journals })
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
    const { description, date, entries, reference, referenceType, referenceId } = body

    // Auto-generate journal number
    const year = new Date().getFullYear()
    const count = await prisma.journal.count()
    const journalNumber = `JNL-${year}-${String(count + 1).padStart(4, "0")}`

    const journal = await prisma.journal.create({
      data: {
        journalNumber,
        description,
        date: new Date(date),
        reference,
        referenceType,
        referenceId,
        postedAt: new Date(),
        createdById: session.user.id,
        entries: {
          create: entries.map((e: any) => ({
            accountId: e.accountId,
            debit: parseFloat(e.debit) || 0,
            credit: parseFloat(e.credit) || 0,
            description: e.description,
          })),
        },
      },
      include: { entries: true },
    })

    return NextResponse.json({ success: true, data: journal })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
