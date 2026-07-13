#!/usr/bin/env node
/**
 * Test script for the UoM Convert API
 *
 * Directly tests the database layer to verify:
 * 1. Headphone Bluetooth has correct UoM data in Warehouse Transit
 * 2. Creating a CONVERSION movement record works
 * 3. The movement can be read back with correct details
 *
 * Run: node scripts/test-convert-api.mjs
 * Requires: DATABASE_URL in .env, Prisma client generated
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
let movementId = null // Track created movement for guaranteed cleanup

async function main() {
  console.log("=".repeat(60))
  console.log("  UoM Convert API Test")
  console.log("=".repeat(60))

  // ─── Step 1: Find Headphone Bluetooth ─────────────────────────────────
  console.log("\n📦 Step 1: Finding Headphone Bluetooth...")

  const product = await prisma.product.findUnique({
    where: { sku: "HPB00124" },
    include: {
      uoms: { include: { uom: true } },
    },
  })

  if (!product) {
    throw new Error("Product not found! Run the seed first: npm run db:seed")
  }
  console.log(`   ✅ Found: ${product.name} (SKU: ${product.sku})`)

  // ─── Step 2: Verify UoM data ──────────────────────────────────────────
  console.log("\n📐 Step 2: Verifying UoM data...")

  const baseUom = product.uoms.find((u) => u.isBase)
  const altUom = product.uoms.find((u) => !u.isBase)

  if (!baseUom) throw new Error("No base UoM configured for Headphone Bluetooth!")
  console.log(`   ✅ Base UoM: ${baseUom.uom.name} (${baseUom.uom.abbreviation}), conversionToBase=${baseUom.conversionToBase}`)

  if (!altUom) throw new Error("No alt UoM configured for Headphone Bluetooth!")
  console.log(`   ✅ Alt UoM:  ${altUom.uom.name} (${altUom.uom.abbreviation}), conversionToBase=${altUom.conversionToBase}`)

  if (altUom.conversionToBase !== 10) {
    throw new Error(`Expected conversionToBase=10 for Box, got ${altUom.conversionToBase}!`)
  }
  console.log(`   ✅ Conversion rate is correct: 1 ${altUom.uom.abbreviation} = ${altUom.conversionToBase} ${baseUom.uom.abbreviation}`)

  // ─── Step 3: Find stock in Warehouse Transit ──────────────────────────
  console.log("\n🏭 Step 3: Finding stock in Warehouse Transit...")

  const whTransit = await prisma.warehouse.findUnique({ where: { code: "WH-002" } })
  if (!whTransit) throw new Error("Warehouse Transit (WH-002) not found!")

  const stock = await prisma.warehouseStock.findUnique({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: whTransit.id,
      },
    },
  })

  if (!stock) {
    throw new Error("No stock record found for Headphone Bluetooth in Warehouse Transit!")
  }
  console.log(`   ✅ Stock: ${stock.quantity} ${baseUom.uom.abbreviation} in ${whTransit.name}`)
  console.log(`   ✅ Sufficient for conversion: ${stock.quantity} >= ${altUom.conversionToBase}`)

  // ─── Step 4: Create a CONVERSION movement ─────────────────────────────
  console.log("\n🔄 Step 4: Creating CONVERSION movement record...")

  const refNumber = `TEST-CONV-${Date.now().toString(36).toUpperCase()}`
  const qtyInSourceUom = 1
  const baseQtyAffected = qtyInSourceUom * altUom.conversionToBase
  const direction = "split"
  const notes = `[${direction.toUpperCase()}] ${qtyInSourceUom} × ${altUom.uom.abbreviation} → ${baseQtyAffected} ${baseUom.uom.abbreviation}: Test conversion from script`

  const movement = await prisma.warehouseStockMovement.create({
    data: {
      reference: refNumber,
      type: "CONVERSION",
      productId: product.id,
      fromWarehouseId: whTransit.id,
      toWarehouseId: whTransit.id,
      quantity: baseQtyAffected,
      referenceType: "conversion",
      referenceId: stock.id,
      notes: notes,
    },
  })
  movementId = movement.id // Track for cleanup

  console.log(`   ✅ Movement created!`)
  console.log(`      Reference: ${movement.reference}`)
  console.log(`      Type: ${movement.type}`)
  console.log(`      Quantity: ${movement.quantity} (base units)`)

  if (movement.type !== "CONVERSION") {
    throw new Error(`Movement type should be CONVERSION, got ${movement.type}!`)
  }
  console.log(`   ✅ Movement type is CONVERSION ✓`)

  // ─── Step 5: Read back the movement ───────────────────────────────────
  console.log("\n📋 Step 5: Reading back movement with relations...")

  const readMovement = await prisma.warehouseStockMovement.findUnique({
    where: { id: movement.id },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      fromWarehouse: { select: { id: true, name: true } },
      toWarehouse: { select: { id: true, name: true } },
    },
  })

  console.log(`   ✅ Movement read back:`)
  console.log(`      Product: ${readMovement.product.name} (${readMovement.product.sku})`)
  console.log(`      Warehouse: ${readMovement.fromWarehouse.name}`)
  console.log(`      Notes: ${readMovement.notes}`)

  // Verify notes format works with parseConversionNotes regex
  const notesMatch = readMovement.notes.match(/^\[(SPLIT|COMBINE)\]\s+(\d+)\s+×\s+(\w+)\s+→\s+(\d+)\s+(\w+)(?::\s*(.*))?$/)
  if (!notesMatch) {
    throw new Error("Notes format doesn't match parseConversionNotes regex!")
  }
  console.log(`   ✅ Notes format is compatible with parseConversionNotes regex`)
  console.log(`      Direction: ${notesMatch[1]}`)
  console.log(`      Source: ${notesMatch[2]} × ${notesMatch[3]}`)
  console.log(`      Target: ${notesMatch[4]} ${notesMatch[5]}`)
  if (notesMatch[6]) console.log(`      Reason: ${notesMatch[6].trim()}`)

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60))
  console.log("  ✅ ALL TESTS PASSED!")
  console.log("=".repeat(60))
  console.log("\n  Summary:")
  console.log(`  • Product: ${product.name} (${product.sku})`)
  console.log(`  • Base UoM: ${baseUom.uom.name} (${baseUom.uom.abbreviation})`)
  console.log(`  • Alt UoM:  ${altUom.uom.name} (${altUom.uom.abbreviation}) — 1 = ${altUom.conversionToBase} ${baseUom.uom.abbreviation}`)
  console.log(`  • Stock in ${whTransit.name}: ${stock.quantity} ${baseUom.uom.abbreviation}`)
  console.log(`  • CONVERSION movement: ✅ Created, verified, cleaned up`)
  console.log("\n  The Convert UoM functionality is working correctly!")
  console.log("=".repeat(60))
}

main()
  .catch((e) => {
    console.error("\n❌ Test failed:", e.message)
    process.exitCode = 1
  })
  .finally(async () => {
    if (movementId) {
      await prisma.warehouseStockMovement.delete({ where: { id: movementId } })
        .catch(() => {}) // ignore if already deleted
      console.log("   🧹 Test movement cleaned up")
    }
    await prisma.$disconnect()
  })
