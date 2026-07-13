import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { generateEmployeeNumber } from "@/lib/utils"

export async function GET() {
  const session = await auth()
  const permErr = await requirePermission(session, "employees", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const employees = await prisma.employee.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: employees })
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
  const permErr = await requirePermission(session, "employees", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()

    // Generate employee number
    const year = new Date().getFullYear()
    const count = await prisma.employee.count()
    const employeeNumber = generateEmployeeNumber(year, count + 1)

    const employee = await prisma.employee.create({
      data: {
        employeeNumber,
        name: body.name,
        email: body.email,
        phone: body.phone,
        position: body.position,
        department: body.department,
        baseSalary: parseFloat(body.baseSalary) || 0,
        payType: body.payType || "MONTHLY",
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        taxId: body.taxId,
        joinDate: body.joinDate ? new Date(body.joinDate) : null,
        address: body.address,
        merchantId: session.user.merchantId!,
      },
    })

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
