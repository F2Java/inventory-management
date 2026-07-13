import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth, requirePermission } from "@/lib/auth"
import { logActivity } from "@/lib/activity-logger"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const permErr = await requirePermission(session, "subscription", "delete")
  if (permErr) return NextResponse.json(permErr, { status: permErr.status })

  // Require confirmation body
  const body = await req.json()
  if (body.confirm !== "RESET_ALL_DATA") {
    return NextResponse.json({ error: "Confirmation required. Send { confirm: 'RESET_ALL_DATA' }" }, { status: 400 })
  }

  try {
    // Delete all transactional data but keep: Merchant, Users (except admin reassign), Roles, Account types, Categories, UoMs, Shifts
    // Order matters due to foreign key constraints

    // 1. Delete sales & related
    await prisma.orderTracking.deleteMany()
    await prisma.orderStatus.deleteMany()
    await prisma.saleItem.deleteMany()
    await prisma.sale.deleteMany()

    // 2. Delete purchase orders & related
    await prisma.purchaseOrderItem.deleteMany()
    await prisma.purchaseOrder.deleteMany()

    // 3. Delete stock requests
    await prisma.stockRequestItem.deleteMany()
    await prisma.stockRequest.deleteMany()

    // 4. Delete stock movements
    await prisma.stockMovement.deleteMany()
    await prisma.warehouseStockMovement.deleteMany()
    await prisma.warehouseStock.deleteMany()
    await prisma.stockThreshold.deleteMany()

    // 5. Delete expenses & journals
    await prisma.journalEntry.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.payrollItem.deleteMany()
    await prisma.payroll.deleteMany()
    await prisma.journal.deleteMany()

    // 6. Delete payroll & attendance
    await prisma.attendance.deleteMany()
    await prisma.leave.deleteMany()
    await prisma.leaveBalance.deleteMany()
    await prisma.employeeShift.deleteMany()
    await prisma.employee.deleteMany()

    // 7. Delete product relations
    await prisma.productImage.deleteMany()
    await prisma.productUom.deleteMany()
    await prisma.supplierProduct.deleteMany()
    await prisma.product.deleteMany()
    await prisma.supplier.deleteMany()

    // 8. Delete e-commerce sync logs & connectors
    await prisma.syncLog.deleteMany()
    await prisma.ecommerceConnector.deleteMany()

    // 9. Delete warehouse-branch links, branches, warehouses
    await prisma.warehouseBranch.deleteMany()
    await prisma.branch.deleteMany()
    await prisma.warehouse.deleteMany()

    // 10. Delete activity logs
    await prisma.activityLog.deleteMany()

    // 11. Delete notifications
    await prisma.notification.deleteMany()

    // Log reset
    await logActivity({
      userId: session.user.id,
      action: "delete",
      entity: "setting",
      entityId: "system-reset",
      details: { action: "reset_all_data", triggeredBy: session.user.email },
    })

    return NextResponse.json({
      success: true,
      message: "All data has been reset. Merchant, users, roles, account types, categories, UoMs, and shifts have been preserved.",
    })
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
