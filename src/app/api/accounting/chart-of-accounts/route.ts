import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const accounts = await prisma.chartOfAccount.findMany({
      include: {
        category: { include: { accountType: true } },
        _count: { select: { journalEntries: true } },
      },
      orderBy: { accountCode: "asc" },
    })

    return NextResponse.json({ data: accounts })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
