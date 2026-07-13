import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "income_statement"

    let data: any = {}

    switch (type) {
      case "income_statement": {
        // Get revenue accounts (type 4) and expense accounts (type 5)
        const revenueType = await prisma.accountType.findUnique({ where: { code: "4" } })
        const expenseType = await prisma.accountType.findUnique({ where: { code: "5" } })

        const revenues = await prisma.chartOfAccount.findMany({
          where: { accountTypeId: revenueType?.id, isActive: true },
          select: { id: true, accountCode: true, accountName: true, balance: true },
          orderBy: { accountCode: "asc" },
        })

        const expenses = await prisma.chartOfAccount.findMany({
          where: { accountTypeId: expenseType?.id, isActive: true },
          select: { id: true, accountCode: true, accountName: true, balance: true },
          orderBy: { accountCode: "asc" },
        })

        data = { revenues, expenses }
        break
      }

      case "balance_sheet": {
        const assetType = await prisma.accountType.findUnique({ where: { code: "1" } })
        const liabilityType = await prisma.accountType.findUnique({ where: { code: "2" } })
        const equityType = await prisma.accountType.findUnique({ where: { code: "3" } })

        const [assets, liabilities, equities] = await Promise.all([
          prisma.chartOfAccount.findMany({
            where: { accountTypeId: assetType?.id, isActive: true },
            select: { id: true, accountCode: true, accountName: true, balance: true },
            orderBy: { accountCode: "asc" },
          }),
          prisma.chartOfAccount.findMany({
            where: { accountTypeId: liabilityType?.id, isActive: true },
            select: { id: true, accountCode: true, accountName: true, balance: true },
            orderBy: { accountCode: "asc" },
          }),
          prisma.chartOfAccount.findMany({
            where: { accountTypeId: equityType?.id, isActive: true },
            select: { id: true, accountCode: true, accountName: true, balance: true },
            orderBy: { accountCode: "asc" },
          }),
        ])

        data = { assets, liabilities, equities }
        break
      }

      case "general_ledger": {
        const entries = await prisma.journalEntry.findMany({
          include: {
            account: { select: { accountCode: true, accountName: true } },
            journal: { select: { journalNumber: true, date: true, description: true } },
          },
          orderBy: [{ journal: { date: "desc" } }, { id: "asc" }],
          take: 200,
        })

        data = { entries }
        break
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
