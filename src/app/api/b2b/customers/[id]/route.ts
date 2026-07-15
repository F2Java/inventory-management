import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const permErr = await requirePermission(session, "customers", "view")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const customer = await prisma.b2BCustomer.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true, invoices: true } },
      },
    })
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

    return NextResponse.json({
      data: {
        ...customer,
        creditLimit: Number(customer.creditLimit),
        currentBalance: Number(customer.currentBalance),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load customer"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "customers", "edit")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    const body = await req.json()
    const { companyName, contactPerson, email, phone, billingAddress, shippingAddress, taxId, paymentTerms, creditLimit, status, notes } = body

    const updateData: any = {}
    if (companyName !== undefined) updateData.companyName = companyName
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (billingAddress !== undefined) updateData.billingAddress = billingAddress
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress
    if (taxId !== undefined) updateData.taxId = taxId
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (creditLimit !== undefined) updateData.creditLimit = parseFloat(creditLimit)
    if (status !== undefined) {
      updateData.status = status
      if (status === "ACTIVE") {
        updateData.approvedById = session.user.id
        updateData.approvedAt = new Date()
      }
    }
    if (notes !== undefined) updateData.notes = notes

    const customer = await prisma.b2BCustomer.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true, data: customer })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update customer"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "customers", "delete")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  try {
    const { id } = await params
    await prisma.b2BCustomer.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Customer deleted" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete customer"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
