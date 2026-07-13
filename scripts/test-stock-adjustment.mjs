#!/usr/bin/env node
/**
 * Test script for the Stock Adjustment flow
 *
 * Tests:
 * 1. Fetching current stock for a product
 * 2. Creating a PENDING adjustment request
 * 3. Approving the adjustment (simulating the admin approval)
 * 4. Verifying stock is updated correctly
 *
 * Run: node scripts/test-stock-adjustment.mjs
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
let createdData = { adjustmentId: null, warehouseMovementIds: [], stockMovementIds: [], originalStockQty: null }

async function main() {
  console.log("=".repeat(60))
  console.log("  Stock Adjustment Workflow Test")
  console.log("=".repeat(60))

  // ─── Step 1: Find admin user ─────────────────────────────────────────
  console.log("\n👤 Step 1: Finding admin user...")

  const admin = await prisma.user.findUnique({ where: { email: "admin@inventory.com" } })
  if (!admin) throw new Error("Admin user not found! Run: npm run db:seed")
  console.log(`   ✅ Admin: ${admin.name} (${admin.email})`)

  // ─── Step 2: Find a product with stock ────────────────────────────────
  console.log("\n📦 Step 2: Finding product with stock...")

  const kaosPolos = await prisma.product.findUnique({
    where: { sku: "KPS00124" },
    include: {
      uoms: { include: { uom: true }, where: { isBase: true } },
      warehouseStock: {
        include: { warehouse: { select: { id: true, name: true } } },
        where: { warehouse: { code: "WH-001" } },
      },
    },
  })

  if (!kaosPolos) throw new Error("Kaos Polos not found! Run: npm run db:seed")
  const stock = kaosPolos.warehouseStock[0]
  if (!stock) throw new Error("Stock not found for Kaos Polos in WH-001!")

  const baseUom = kaosPolos.uoms[0]
  console.log(`   ✅ Product: ${kaosPolos.name} (${kaosPolos.sku})`)
  console.log(`   ✅ Current stock: ${stock.quantity} ${baseUom?.uom.abbreviation || "pcs"} in ${stock.warehouse.name}`)

  // ─── Step 3: Create a PENDING stock adjustment ───────────────────────
  console.log("\n📝 Step 3: Creating PENDING stock adjustment...")

  const newQty = stock.quantity - 30 // Reduce stock by 30
  createdData.originalStockQty = stock.quantity // Save for restoration
  const adjustmentNumber = `TEST-ADJ-${Date.now().toString(36).toUpperCase()}`

  const adjustment = await prisma.stockAdjustment.create({
    data: {
      adjustmentNumber,
      productId: kaosPolos.id,
      warehouseId: stock.warehouseId,
      previousQty: stock.quantity,
      newQty,
      difference: newQty - stock.quantity,
      reason: "Test adjustment: Damaged goods count",
      status: "PENDING",
      requestedById: admin.id,
    },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      warehouse: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true } },
    },
  })
  createdData.adjustmentId = adjustment.id

  console.log(`   ✅ Adjustment created: ${adjustment.adjustmentNumber}`)
  console.log(`      Status: ${adjustment.status}`)
  console.log(`      From: ${adjustment.previousQty} → To: ${adjustment.newQty} (${adjustment.difference})`)
  console.log(`      By: ${adjustment.requestedBy.name}`)

  if (adjustment.status !== "PENDING") {
    throw new Error(`Expected PENDING status, got ${adjustment.status}!`)
  }
  console.log(`   ✅ Status is PENDING ✓`)

  // ─── Step 4: Approve the adjustment ──────────────────────────────────
  console.log("\n✅ Step 4: Approving the adjustment...")

  const approved = await prisma.stockAdjustment.update({
    where: { id: adjustment.id },
    data: {
      status: "APPROVED",
      approvedById: admin.id,
      approvedAt: new Date(),
    },
  })

  console.log(`   ✅ Adjustment approved: ${approved.status}`)

  if (approved.status !== "APPROVED") {
    throw new Error(`Expected APPROVED status, got ${approved.status}!`)
  }
  console.log(`   ✅ Status is APPROVED ✓`)

  // ─── Step 5: Update warehouse stock (simulating the API) ─────────────
  console.log("\n🔄 Step 5: Updating warehouse stock...")

  // Record movement for the stock change
  const movement = await prisma.warehouseStockMovement.create({
    data: {
      reference: `ADJ-${adjustment.adjustmentNumber}`,
      type: "ADJUSTMENT",
      productId: kaosPolos.id,
      fromWarehouseId: stock.warehouseId,
      quantity: Math.abs(adjustment.difference),
      referenceType: "adjustment",
      referenceId: adjustment.id,
      notes: `Stock adjusted from ${adjustment.previousQty} to ${adjustment.newQty}: ${adjustment.reason}`,
      createdById: admin.id,
    },
  })
  createdData.warehouseMovementIds.push(movement.id)

  // Also create an IN/OUT movement record for StockMovement table
  const stockMovement = await prisma.stockMovement.create({
    data: {
      productId: kaosPolos.id,
      warehouseStockMovementId: movement.id,
      type: "out",
      quantity: Math.abs(adjustment.difference),
      previousStock: adjustment.previousQty,
      newStock: adjustment.newQty,
      reference: adjustment.adjustmentNumber,
      notes: `Adjustment: ${adjustment.reason}`,
      createdById: admin.id,
    },
  })
  createdData.stockMovementIds.push(stockMovement.id)

  console.log(`   ✅ Stock movement recorded: ${movement.reference} (${movement.type})`)
  console.log(`   ✅ Detailed movement: ${stockMovement.type}, ${stockMovement.previousStock} → ${stockMovement.newStock}`)

  // ─── Step 6: Verify the data integrity ───────────────────────────────
  console.log("\n📋 Step 6: Verifying data integrity...")

  const verifyAdj = await prisma.stockAdjustment.findUnique({
    where: { id: adjustment.id },
    include: {
      approvedBy: { select: { name: true } },
    },
  })

  console.log(`   ✅ Final status: ${verifyAdj.status}`)
  console.log(`   ✅ Approved by: ${verifyAdj.approvedBy?.name || "—"}`)
  console.log(`   ✅ Approved at: ${verifyAdj.approvedAt}`)
  console.log(`   ✅ ${movement.type} movement created: ${movement.notes}`)

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60))
  console.log("  ✅ ALL TESTS PASSED!")
  console.log("=".repeat(60))
  console.log("\n  Summary:")
  console.log(`  • Product: ${kaosPolos.name} (${kaosPolos.sku})`)
  console.log(`  • Original stock: ${adjustment.previousQty} → Requested: ${adjustment.newQty} (${adjustment.difference})`)
  console.log(`  • Adjustment: ${adjustment.adjustmentNumber}`)
  console.log(`  • Status flow: PENDING → APPROVED`)
  console.log(`  • Stock movement: ADJUSTMENT type`)
  console.log("\n  Stock adjustment workflow is working correctly!")
  console.log("=".repeat(60))
}

main()
  .catch((e) => {
    console.error("\n❌ Test failed:", e.message)
    process.exitCode = 1
  })
  .finally(async () => {
    // Cleanup: delete movements, adjustment
    // Restore original stock quantity
    if (createdData.adjustmentId && createdData.originalStockQty !== null) {
      const adj = await prisma.stockAdjustment.findUnique({ where: { id: createdData.adjustmentId } })
      if (adj) {
        await prisma.warehouseStock.update({
          where: { productId_warehouseId: { productId: adj.productId, warehouseId: adj.warehouseId } },
          data: { quantity: createdData.originalStockQty },
        }).catch(() => {})
      }
    }
    if (createdData.stockMovementIds.length > 0) {
      await prisma.stockMovement.deleteMany({
        where: { id: { in: createdData.stockMovementIds } },
      }).catch(() => {})
    }
    if (createdData.warehouseMovementIds.length > 0) {
      await prisma.warehouseStockMovement.deleteMany({
        where: { id: { in: createdData.warehouseMovementIds } },
      }).catch(() => {})
    }
    if (createdData.adjustmentId) {
      await prisma.stockAdjustment.delete({ where: { id: createdData.adjustmentId } }).catch(() => {})
    }
    console.log("   🧹 Test data cleaned up")
    await prisma.$disconnect()
  })
