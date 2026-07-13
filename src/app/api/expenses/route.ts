import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { ActivityActions } from "@/lib/activity-logger"

// Helper to generate expense number
function generateExpenseNumber(count: number): string {
  const year = new Date().getFullYear()
  return `EXP-${year}-${String(count + 1).padStart(4, "0")}`
}

// Helper to auto-post journal entry for an expense
async function postExpenseToJournal(expense: any, userId: string) {
  const year = new Date().getFullYear()
  const count = await prisma.journal.count()
  const journalNumber = `JNL-${year}-${String(count + 1).padStart(4, "0")}`

  // Find default accounts if not specified
  let debitAccountId = expense.accountId
  if (!debitAccountId) {
    // Find "Beban Operasional" account or first expense account
    const expenseAccount = await prisma.chartOfAccount.findFirst({
      where: { accountCode: { contains: "5-1000" } },
    })
    debitAccountId = expenseAccount?.id
  }

  // Find Kas account for credit
  const kasAccount = await prisma.chartOfAccount.findFirst({
    where: { accountCode: "1-1000" },
  })

  if (!debitAccountId || !kasAccount) {
    throw new Error("Required accounts not found. Please set up chart of accounts first.")
  }

  const netAmount = Number(expense.netAmount || expense.amount)

  const journal = await prisma.journal.create({
    data: {
      journalNumber,
      description: `Expense: ${expense.description} (${expense.expenseNumber})`,
      date: new Date(expense.date),
      reference: expense.expenseNumber,
      referenceType: "expense",
      referenceId: expense.id,
      postedAt: new Date(),
      createdById: userId,
      entries: {
        create: [
          {
            accountId: debitAccountId,
            debit: netAmount,
            credit: 0,
            description: expense.description,
          },
          {
            accountId: kasAccount.id,
            debit: 0,
            credit: netAmount,
            description: `Payment for ${expense.description}`,
          },
        ],
      },
    },
    include: { entries: true },
  })

  return journal
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "accounting", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category") || ""
    const isPettyCash = searchParams.get("pettyCash") || ""

    const where: any = {}
    if (category) where.category = category
    if (isPettyCash === "true") where.isPettyCash = true
    if (isPettyCash === "false") where.isPettyCash = false

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        account: { select: { id: true, accountCode: true, accountName: true } },
        journal: { select: { journalNumber: true, postedAt: true } },
      },
      orderBy: { date: "desc" },
      take: 50,
    })

    return NextResponse.json({ data: expenses })
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
  const permErr = await requirePermission(session, "accounting", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { description, category, amount, taxAmount, date, accountId, branchId, isPettyCash, notes, autoPost } = body

    if (!description || !amount) {
      return NextResponse.json({ error: "Description and amount are required" }, { status: 400 })
    }

    const count = await prisma.expense.count()
    const expenseNumber = generateExpenseNumber(count)
    const parsedAmount = parseFloat(amount)
    const parsedTax = taxAmount ? parseFloat(taxAmount) : 0
    const netAmount = parsedAmount - parsedTax

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        description,
        category: category || "OPERATIONAL",
        amount: parsedAmount,
        taxAmount: parsedTax,
        netAmount,
        date: new Date(date || new Date()),
        accountId: accountId || null,
        branchId: branchId || null,
        isPettyCash: isPettyCash || false,
        isPosted: autoPost || false,
        notes,
        createdById: session.user.id,
      },
    })

    // Auto-post to journal if requested
    let journal = null
    if (autoPost) {
      journal = await postExpenseToJournal(expense, session.user.id)
      await prisma.expense.update({
        where: { id: expense.id },
        data: { journalId: journal.id, isPosted: true },
      })
    }

    // Log activity
    ActivityActions.expense.create(session!.user!.id, expense.id, description, parsedAmount)

    return NextResponse.json({
      success: true,
      data: { ...expense, journal },
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const permErr = await requirePermission(session, "accounting", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { id, isPosted, accountId } = body

    if (!id) return NextResponse.json({ error: "Expense ID is required" }, { status: 400 })

    // Post to journal if requested
    if (isPosted && accountId) {
      const expense = await prisma.expense.findUnique({ where: { id } })
      if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

      const journal = await postExpenseToJournal(
        { ...expense, accountId },
        session.user.id
      )

      await prisma.expense.update({
        where: { id },
        data: { journalId: journal.id, isPosted: true, accountId },
      })

      return NextResponse.json({ success: true, data: { journal } })
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: { isPosted, accountId },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
