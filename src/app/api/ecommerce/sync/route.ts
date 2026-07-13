import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runSync } from "@/lib/ecommerce/connector"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { connectorId, syncType } = body

    if (!connectorId || !syncType) {
      return NextResponse.json(
        { error: "connectorId and syncType are required" },
        { status: 400 }
      )
    }

    const result = await runSync({ connectorId, syncType })
    return NextResponse.json(result)
  } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      return NextResponse.json({ error: message }, { status: 500 })
    }
}
