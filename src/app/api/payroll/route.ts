import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

function generatePayrollNumber(): string {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, "0")
  return `PR-${year}${month}-${Date.now().toString(36).toUpperCase()}`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "payroll", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || ""

    const where: any = {}
    if (status) where.status = status

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        items: {
          include: { employee: { select: { id: true, name: true, position: true, department: true } } },
        },
        journal: { select: { journalNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    })

    return NextResponse.json({ data: payrolls })
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
  const permErr = await requirePermission(session, "payroll", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { periodStart, periodEnd, payType, employeeIds, notes, postToJournal } = body

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "Period start and end are required" }, { status: 400 })
    }

    const startDate = new Date(periodStart)
    const endDate = new Date(periodEnd)

    // Get employees to include in payroll
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        ...(employeeIds?.length ? { id: { in: employeeIds } } : {}),
      },
      select: {
        id: true, name: true, baseSalary: true, payType: true,
        position: true, department: true,
      },
    })

    if (employees.length === 0) {
      return NextResponse.json({ error: "No active employees found" }, { status: 400 })
    }

    const useDaily = payType === "DAILY" || employees.some((e) => e.payType === "DAILY")
    const type = useDaily ? "DAILY" : "MONTHLY"

    // Calculate payroll items
    const payrollItems = []
    let totalGross = 0
    let totalDeductions = 0
    let totalAllowances = 0

    for (const emp of employees) {
      const baseSalary = Number(emp.baseSalary)
      let daysWorked = 0
      let dailyRate = 0
      let grossAmount = 0
      let deductions = [{ name: "PPH 21", amount: 0 }]
      let allowances = [{ name: "Transport", amount: 0 }, { name: "Meal", amount: 0 }]

      if (useDaily) {
        // Count workdays in period (excluding weekends)
        let count = 0
        const d = new Date(startDate)
        while (d <= endDate) {
          const day = d.getDay()
          if (day !== 0 && day !== 6) count++ // Mon-Fri
          d.setDate(d.getDate() + 1)
        }
        daysWorked = count
        dailyRate = baseSalary / 22 // 22 working days per month
        grossAmount = Math.round(dailyRate * daysWorked)

        // Default allowances for daily workers
        allowances = [
          { name: "Transport", amount: Math.round(25000 * daysWorked) },
          { name: "Meal", amount: Math.round(15000 * daysWorked) },
        ]
      } else {
        grossAmount = baseSalary
        daysWorked = 22
        dailyRate = Math.round(baseSalary / 22)

        // Default allowances for monthly workers
        allowances = [
          { name: "Transport", amount: 500000 },
          { name: "Meal", amount: 300000 },
        ]
      }

      // Calculate PPH 21 (simplified: 5% of gross above PTKP)
      const pph21 = grossAmount > 4500000 ? Math.round((grossAmount - 4500000) * 0.05) : 0
      deductions = [{ name: "PPH 21", amount: pph21 }]

      const totalDed = deductions.reduce((s, d) => s + d.amount, 0)
      const totalAllow = allowances.reduce((s, a) => s + a.amount, 0)
      const netAmount = grossAmount + totalAllow - totalDed

      totalGross += grossAmount
      totalDeductions += totalDed
      totalAllowances += totalAllow

      payrollItems.push({
        employeeId: emp.id,
        baseSalary,
        daysWorked,
        dailyRate,
        grossAmount,
        deductions: JSON.parse(JSON.stringify(deductions)),
        allowances: JSON.parse(JSON.stringify(allowances)),
        netAmount,
      })
    }

    // Create the payroll
    const payrollNumber = generatePayrollNumber()
    const totalNet = totalGross + totalAllowances - totalDeductions

    const payroll = await prisma.payroll.create({
      data: {
        payrollNumber,
        periodStart: startDate,
        periodEnd: endDate,
        payType: type,
        status: "DRAFT",
        totalGross,
        totalDeductions,
        totalAllowances,
        totalNet,
        notes: notes || `Payroll ${formatPeriod(startDate, endDate)}`,
        createdById: session.user.id,
        items: { create: payrollItems },
      },
      include: {
        items: {
          include: { employee: { select: { id: true, name: true, position: true } } },
        },
      },
    })

    // Post to journal if requested
    if (postToJournal) {
      const journal = await postPayrollToJournal(payroll, session.user.id)
      await prisma.payroll.update({
        where: { id: payroll.id },
        data: { journalId: journal.id, postedToJournal: true },
      })
    }

    const result = await prisma.payroll.findUnique({
      where: { id: payroll.id },
      include: {
        items: { include: { employee: { select: { id: true, name: true, position: true, department: true } } } },
        journal: { select: { journalNumber: true } },
      },
    })

    return NextResponse.json({ success: true, data: result })
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
  const permErr = await requirePermission(session, "payroll", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { id, status, postToJournal } = body

    if (!id || !status) {
      return NextResponse.json({ error: "Payroll ID and status are required" }, { status: 400 })
    }

    const updateData: any = { status }

    // Post to journal on approve
    if ((status === "APPROVED" || status === "PAID") && postToJournal) {
      const payroll = await prisma.payroll.findUnique({
        where: { id },
        include: { items: true },
      })
      if (payroll && !payroll.postedToJournal) {
        const journal = await postPayrollToJournal(payroll, session.user.id)
        updateData.journalId = journal.id
        updateData.postedToJournal = true
      }
    }

    if (status === "PAID") {
      updateData.paidAt = new Date()
    }

    const updated = await prisma.payroll.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: { employee: { select: { id: true, name: true, position: true } } },
        },
        journal: { select: { journalNumber: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

async function postPayrollToJournal(payroll: any, userId: string) {
  const year = new Date().getFullYear()
  const count = await prisma.journal.count()
  const journalNumber = `JNL-${year}-${String(count + 1).padStart(4, "0")}`

  const gajiAccount = await prisma.chartOfAccount.findFirst({ where: { accountCode: "5-1010" } })
  const hutangGajiAccount = await prisma.chartOfAccount.findFirst({ where: { accountCode: "2-1020" } })
  const kasAccount = await prisma.chartOfAccount.findFirst({ where: { accountCode: "1-1000" } })

  if (!gajiAccount || !hutangGajiAccount || !kasAccount) {
    throw new Error("Required accounts (5-1010, 2-1020, 1-1000) not found")
  }

  const totalNet = Number(payroll.totalNet)

  return prisma.journal.create({
    data: {
      journalNumber,
      description: `Payroll: ${payroll.payrollNumber}`,
      date: new Date(),
      reference: payroll.payrollNumber,
      referenceType: "payroll",
      referenceId: payroll.id,
      postedAt: new Date(),
      createdById: userId,
      entries: {
        create: [
          { accountId: gajiAccount.id, debit: totalNet, credit: 0, description: `Payroll ${payroll.payrollNumber}` },
          { accountId: kasAccount.id, debit: 0, credit: totalNet, description: `Salary payment ${payroll.payrollNumber}` },
        ],
      },
    },
  })
}

function formatPeriod(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`
}
