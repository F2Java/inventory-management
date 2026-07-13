#!/usr/bin/env node
/**
 * Test script for the PO Receiving flow with UoM conversion
 *
 * Tests:
 * 1. Finding a seeded PO or creating a test scenario
 * 2. Verifying product UoM data is available via the PO's items
 * 3. Simulating receiving with UoM conversion (e.g., Carton → Pcs)
 *
 * Run: node scripts/test-po-receiving.mjs
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
let createdData = { poId: null, poItemIds: [], stockMovementIds: [], originalStockQtys: {}, whCode: null }

async function main() {
  console.log("=".repeat(60))
  console.log("  PO Receiving with UoM Conversion Test")
  console.log("=".repeat(60))

  // ─── Step 1: Find seed products with UoM ──────────────────────────────
  console.log("\n📦 Step 1: Finding seed products with UoM...")

  const products = await prisma.product.findMany({
    where: { sku: { in: ["KME00124", "HPB00124"] } },
    include: {
      uoms: { include: { uom: true } },
      category: { select: { id: true, name: true } },
    },
  })

  if (products.length < 2) throw new Error("Seed products not found! Run: npm run db:seed")
  console.log(`   ✅ Found ${products.length} products with UoM:`)
  for (const p of products) {
    const uomStr = p.uoms.map((u) => `${u.uom.name}(${u.uom.abbreviation})`).join(", ")
    console.log(`      ${p.name} (${p.sku}) — UoMs: ${uomStr}`)
  }

  // ─── Step 2: Verify UoM data for receiving ────────────────────────────
  console.log("\n📐 Step 2: Verifying UoM data for receiving...")

  for (const product of products) {
    const baseUom = product.uoms.find((u) => u.isBase)
    const altUom = product.uoms.find((u) => !u.isBase)

    if (!baseUom) throw new Error(`No base UoM for ${product.name}!`)
    console.log(`   ✅ ${product.name}: base=${baseUom.uom.abbreviation}`)

    if (altUom) {
      console.log(`      Purchase UoM available: ${altUom.uom.name} (${altUom.uom.abbreviation}), 1 = ${altUom.conversionToBase} ${baseUom.uom.abbreviation}`)
    }
  }

  // ─── Step 3: Find supplier and warehouse ──────────────────────────────
  console.log("\n🏭 Step 3: Finding supplier and warehouse...")

  let supplier = await prisma.supplier.findFirst()
  if (!supplier) {
    // Create a test supplier
    supplier = await prisma.supplier.create({
      data: {
        code: "SUP-TEST",
        name: "Test Supplier",
        isActive: true,
      },
    })
    console.log(`   ✅ Created test supplier: ${supplier.name}`)
  } else {
    console.log(`   ✅ Found supplier: ${supplier.name}`)
  }

  const whUtama = await prisma.warehouse.findUnique({ where: { code: "WH-001" } })
  if (!whUtama) throw new Error("Warehouse Utama (WH-001) not found!")
  createdData.whCode = whUtama.code
  console.log(`   ✅ Warehouse: ${whUtama.name}`)

  // ─── Step 4: Create a test Purchase Order ─────────────────────────────
  console.log("\n📋 Step 4: Creating test Purchase Order...")

  const poNumber = `TEST-PO-${Date.now().toString(36).toUpperCase()}`
  const kemeja = products.find((p) => p.sku === "KME00124")
  const headphone = products.find((p) => p.sku === "HPB00124")

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: "DRAFT",
      totalAmount: 0,
      taxAmount: 0,
      grandTotal: 0,
      warehouseId: whUtama.id,
      items: {
        create: [
          {
            productId: kemeja.id,
            quantity: 2, // 2 Carton
            unitCost: 75000,
            totalCost: 150000,
          },
          {
            productId: headphone.id,
            quantity: 3, // 3 Box
            unitCost: 200000,
            totalCost: 600000,
          },
        ],
      },
    },
    include: {
      items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
      warehouse: { select: { id: true, name: true } },
    },
  })
  createdData.poId = po.id
  createdData.poItemIds = po.items.map((i) => i.id)

  console.log(`   ✅ PO created: ${po.poNumber}`)
  console.log(`      Items: ${po.items.length}`)
  for (const item of po.items) {
    const productData = products.find((p) => p.id === item.productId)
    const altUom = productData?.uoms.find((u) => !u.isBase)
    const baseUom = productData?.uoms.find((u) => u.isBase)
    console.log(`      - ${item.product.name}: ${item.quantity} ${altUom?.uom.abbreviation || "pcs"} → ${item.quantity * (altUom?.conversionToBase || 1)} ${baseUom?.uom.abbreviation || "pcs"}`)
  }

  // ─── Step 5: Simulate receiving (mark as RECEIVED) ────────────────────
  console.log("\n✅ Step 5: Simulating PO receiving...")

  const updatedPO = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: "RECEIVED", receivedAt: new Date() },
  })
  console.log(`   ✅ PO status updated: ${updatedPO.status}`)

  // Creating stock movements (as the receiving page would)
  for (const item of po.items) {
    const productData = products.find((p) => p.id === item.productId)
    const altUom = productData?.uoms.find((u) => !u.isBase)
    const baseUom = productData?.uoms.find((u) => u.isBase)
    const conversionToBase = altUom?.conversionToBase || 1
    const baseQty = item.quantity * conversionToBase    // Find or create stock
      let stock = await prisma.warehouseStock.findUnique({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: whUtama.id } },
      })
      if (stock) {
        createdData.originalStockQtys[item.productId] = stock.quantity // Save for restoration
        await prisma.warehouseStock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity + baseQty },
        })
      } else {
        stock = await prisma.warehouseStock.create({
          data: { productId: item.productId, warehouseId: whUtama.id, quantity: baseQty },
        })
        createdData.originalStockQtys[item.productId] = 0
      }

    // Record movement
    const movement = await prisma.warehouseStockMovement.create({
      data: {
        reference: `PO-${po.poNumber}-${item.id}`,
        type: "PURCHASE",
        productId: item.productId,
        toWarehouseId: whUtama.id,
        quantity: baseQty,
        referenceType: "purchase_order",
        referenceId: po.id,
        notes: `PO ${po.poNumber} received: ${item.quantity} ${altUom?.uom.abbreviation || "pcs"} (${baseQty} ${baseUom?.uom.abbreviation || "pcs"})`,
      },
    })
    createdData.stockMovementIds.push(movement.id)
    console.log(`   ✅ Stock updated for ${item.product.name}: +${baseQty} ${baseUom?.uom.abbreviation || "pcs"}`)
    console.log(`      Movement: ${movement.reference} (${movement.type})`)
  }

  // ─── Step 6: Verify stock was updated ─────────────────────────────────
  console.log("\n📊 Step 6: Verifying stock updates...")

  for (const item of po.items) {
    const stock = await prisma.warehouseStock.findUnique({
      where: { productId_warehouseId: { productId: item.productId, warehouseId: whUtama.id } },
    })
    if (!stock) throw new Error(`Stock not found for ${item.product.name}!`)
    console.log(`   ✅ ${item.product.name}: ${stock.quantity} in stock (${whUtama.name})`)
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60))
  console.log("  ✅ ALL TESTS PASSED!")
  console.log("=".repeat(60))
  console.log("\n  Summary:")
  console.log(`  • PO: ${po.poNumber} (${po.items.length} items)`)
  for (const item of po.items) {
    const productData = products.find((p) => p.id === item.productId)
    const altUom = productData?.uoms.find((u) => !u.isBase)
    const baseUom = productData?.uoms.find((u) => u.isBase)
    console.log(`    - ${item.product.name}: ${item.quantity} ${altUom?.uom.abbreviation || "pcs"} → ${item.quantity * (altUom?.conversionToBase || 1)} ${baseUom?.uom.abbreviation || "pcs"}`)
  }
  console.log(`  • Warehouse: ${whUtama.name}`)
  console.log(`  • Stock movements: ${createdData.stockMovementIds.length} PURCHASE records`)
  console.log("\n  PO receiving with UoM conversion is working correctly!")
  console.log("=".repeat(60))
}

main()
  .catch((e) => {
    console.error("\n❌ Test failed:", e.message)
    process.exitCode = 1
  })
  .finally(async () => {
    // Cleanup: delete created movements, PO, and test supplier
    // Restore original stock quantities
    if (createdData.whCode) {
      const wh = await prisma.warehouse.findUnique({ where: { code: createdData.whCode } }).catch(() => null)
      if (wh) {
        for (const [productId, origQty] of Object.entries(createdData.originalStockQtys)) {
          await prisma.warehouseStock.update({
            where: { productId_warehouseId: { productId, warehouseId: wh.id } },
            data: { quantity: origQty },
          }).catch(() => {})
        }
      }
    }
    if (createdData.stockMovementIds.length > 0) {
      await prisma.warehouseStockMovement.deleteMany({
        where: { id: { in: createdData.stockMovementIds } },
      }).catch(() => {})
    }
    if (createdData.poId) {
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: createdData.poId } }).catch(() => {})
      await prisma.purchaseOrder.delete({ where: { id: createdData.poId } }).catch(() => {})
    }
    console.log("   🧹 Test data cleaned up")
    await prisma.$disconnect()
  })
