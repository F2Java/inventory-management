import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: { select: { products: true, purchaseOrders: true } },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ data: suppliers })
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
    const supplier = await prisma.supplier.create({
      data: {
        code: body.code,
        name: body.name,
        contactPerson: body.contactPerson,
        email: body.email,
        phone: body.phone,
        address: body.address,
        taxId: body.taxId,
        paymentTerms: body.paymentTerms,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        notes: body.notes,
        merchantId: session.user.merchantId,
      },
    })

    return NextResponse.json({ success: true, data: supplier })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: `A supplier with this ${error.meta?.target?.[0] || 'field'} already exists` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, code, name, contactPerson, email, phone, address, taxId, paymentTerms, bankName, bankAccount, notes, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { code, name, contactPerson, email, phone, address, taxId, paymentTerms, bankName, bankAccount, notes, isActive },
    })

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 })

    // Check if supplier has active purchase orders
    const poCount = await prisma.purchaseOrder.count({
      where: { supplierId: id, status: { notIn: ["CANCELLED", "RECEIVED"] } },
    })
    if (poCount > 0) {
      return NextResponse.json({
        error: `Cannot delete supplier with ${poCount} active purchase order(s). Close POs first.`,
      }, { status: 400 })
    }

    // Hard delete (cascades to supplier_products)
    await prisma.supplier.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
