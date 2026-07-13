import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { pushStockUpdateToPlatforms, bulkSyncAllStock } from "@/lib/ecommerce/stock-sync"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { productId, quantity, bulk } = body

    // Bulk sync all products
    if (bulk) {
      const result = await bulkSyncAllStock()
      return NextResponse.json(result)
    }

    // Single product sync
    if (!productId) {
      return NextResponse.json(
        { error: "productId is required (or use bulk: true for full sync)" },
        { status: 400 }
      )
    }

    const result = await pushStockUpdateToPlatforms(productId, quantity ? parseInt(quantity) : undefined)
    return NextResponse.json(result)
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
