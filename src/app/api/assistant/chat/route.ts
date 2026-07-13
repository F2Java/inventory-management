import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseIntent, generateResponse } from "@/lib/assistant/intents"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({
        response: {
          message: "Halo! Ada yang bisa saya bantu? Silakan ketik pertanyaan Anda.",
          actions: [
            { label: "📦 Cek Stok", type: "api_call", url: "/api/inventory" },
            { label: "📊 Lihat Dashboard", type: "navigate", url: "/dashboard" },
            { label: "📖 Bantuan", type: "api_call", url: "/api/assistant/chat" },
          ],
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Parse intent from natural language
    const intent = parseIntent(message)

    // Generate structured response
    const response = await generateResponse(intent, session)

    return NextResponse.json({ response })
  } catch (error: any) {
    console.error("Assistant API error:", error)
    return NextResponse.json({
      response: {
        message: "Maaf, terjadi kesalahan teknis. Silakan coba lagi nanti. 🙏",
        timestamp: new Date().toISOString(),
      },
    })
  }
}
