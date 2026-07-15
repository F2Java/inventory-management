import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { companyName, contactPerson, email, phone, password, billingAddress, shippingAddress, taxId } = body

    if (!companyName || !contactPerson || !email || !password) {
      return NextResponse.json({ error: "Company name, contact person, email, and password are required" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const existing = await prisma.b2BCustomer.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Get first merchant (default)
    const merchant = await prisma.merchant.findFirst({ orderBy: { createdAt: "asc" } })

    // Generate customer code
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
        merchantId: merchant?.id,
        status: "PENDING", // Requires admin approval
      },
    })

    return NextResponse.json({
      success: true,
      message: "Registration successful! Please wait for admin approval.",
      data: {
        id: customer.id,
        code: customer.code,
        companyName: customer.companyName,
        contactPerson: customer.contactPerson,
        email: customer.email,
        status: customer.status,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
