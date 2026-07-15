import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  const permErr = await requirePermission(session, "customers", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || ""
    const search = searchParams.get("search") || ""

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ]
    }

    const customers = await prisma.b2BCustomer.findMany({
      where,
      include: {
        _count: { select: { orders: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const mapped = customers.map((c) => ({
      id: c.id,
      code: c.code,
      companyName: c.companyName,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone,
      taxId: c.taxId,
      paymentTerms: c.paymentTerms,
      creditLimit: Number(c.creditLimit),
      currentBalance: Number(c.currentBalance),
      status: c.status,
      orderCount: c._count.orders,
      invoiceCount: c._count.invoices,
      createdAt: c.createdAt,
    }))

    return NextResponse.json({ data: mapped })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load customers"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "customers", "create")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const body = await req.json()
    const { companyName, contactPerson, email, phone, password, billingAddress, shippingAddress, taxId, paymentTerms, creditLimit } = body

    if (!companyName || !contactPerson || !email) {
      return NextResponse.json({ error: "Company name, contact person, and email are required" }, { status: 400 })
    }

    const passwordHash = password ? await bcrypt.hash(password, 12) : await bcrypt.hash("changeme123", 12)

    const count = await prisma.b2BCustomer.count()
    const code = `B2B-${String(count + 1).padStart(4, "0")}`

    const customer = await prisma.b2BCustomer.create({
      data: {
        code,
        companyName,
        contactPerson,
        email,
        phone,
        passwordHash,
        billingAddress,
        shippingAddress,
        taxId,
        paymentTerms: paymentTerms || "net30",
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        status: "ACTIVE",
        createdById: session.user.id,
      },
    })

    return NextResponse.json({ success: true, data: customer })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : "Failed to create customer"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
