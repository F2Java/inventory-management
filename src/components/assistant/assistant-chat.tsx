"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Send, Loader2, Bot, User, Download, ChevronRight, Mic, MicOff } from "lucide-react"
import { ChatChart } from "./chat-chart"

interface ChartConfig {
  type: "bar" | "line" | "pie" | "donut"
  title: string
  labels: string[]
  datasets: { label: string; data: number[]; color?: string }[]
}

interface ActionButton {
  label: string
  type: "navigate" | "api_call" | "download"
  url?: string
  method?: string
  body?: any
  confirmMessage?: string
  filename?: string
  csvData?: string
}

interface AssistantMsg {
  message: string
  chart?: ChartConfig
  actions?: ActionButton[]
  timestamp: string
}

interface ChatMessage {
  role: "user" | "assistant"
  text: string
  chart?: ChartConfig
  actions?: ActionButton[]
  timestamp: string
}

// ─── Quick Action Suggestion Chips ────────────────────────────────────────

const SUGGESTIONS = [
  "📦 Cek stok barang",
  "⚠️ Stok rendah",
  "💰 Lihat penjualan",
  "✅ Pending approval",
  "📊 Grafik perbandingan",
]

// ─── Helper: Download CSV ─────────────────────────────────────────────────

function downloadCSV(filename: string, csvData?: string) {
  if (!csvData) return
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// ─── Helper: Execute action ───────────────────────────────────────────────

async function executeAction(action: ActionButton, setLoading: (v: boolean) => void): Promise<string | null> {
  if (action.confirmMessage && !window.confirm(action.confirmMessage)) return null

  if (action.type === "navigate" && action.url) {
    window.location.href = action.url
    return null
  }

  if (action.type === "download") {
    downloadCSV(action.filename || "report.csv", action.csvData)
    return `📥 Download "${action.filename || "report.csv"}" dimulai!`
  }

  if (action.type === "api_call" && action.url) {
    setLoading(true)
    try {
      const res = await fetch(action.url, {
        method: action.method || "GET",
        headers: { "Content-Type": "application/json" },
        body: action.body ? JSON.stringify(action.body) : undefined,
      })

      // Check if response is empty or not JSON before parsing
      const text = await res.text()
      if (!text) {
        return res.ok
          ? "✅ Aksi berhasil!"
          : `❌ Gagal: Server mengembalikan response kosong (${res.status})`
      }

      let json: any
      try {
        json = JSON.parse(text)
      } catch {
        return `❌ Gagal: Server mengembalikan format yang tidak valid (${text.slice(0, 100)})`
      }

      if (json.success) {
        return `✅ Aksi berhasil! ${json.message || ""}`
      }
      return `❌ Gagal: ${json.error || "Terjadi kesalahan"}`
    } catch (e: any) {
      return `❌ Error: ${e.message}`
    } finally {
      setLoading(false)
    }
  }

  return null
}

// ─── Main Chat Component ─────────────────────────────────────────────────

export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Halo! 👋 Saya asisten AI Anda. Saya bisa membantu mengecek stok, penjualan, approval, dan membuat grafik perbandingan. Ada yang bisa saya bantu?",
      actions: [
        { label: "📦 Cek Stok", type: "api_call", url: "/api/inventory" },
        { label: "💰 Cek Penjualan", type: "navigate", url: "/dashboard" },
        { label: "📖 Bantuan", type: "api_call", url: "/api/assistant/chat", method: "POST", body: { message: "Bantuan" } },
      ],
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean | null>(null)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevMessagesLength = useRef(messages.length)

  // ─── Speech Recognition ────────────────────────────────────────────
  useEffect(() => {
    // Check browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSpeechSupported(!!SpeechRecognition)

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.lang = "id-ID"
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        const text = finalTranscript || interimTranscript
        setInput(text)
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsRecording(false)

        const errorMessages: Record<string, string> = {
          "not-allowed": "🔇 Akses mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser Anda, atau ketik manual.",
          "network": "🌐 Gagal terhubung ke server speech recognition. Periksa koneksi internet Anda, atau ketik manual.",
          "no-speech": "🎤 Tidak ada suara terdeteksi. Coba berbicara lebih keras atau dekatkan ke mikrofon.",
          "audio-capture": "🎤 Tidak dapat mengakses mikrofon. Periksa apakah mikrofon terhubung dengan benar.",
          "aborted": "",
        }

        const text = errorMessages[event.error] ||
          (event.error !== "aborted"
            ? `❌ Terjadi kesalahan speech recognition (${event.error}). Silakan coba lagi atau ketik manual.`
            : null)

        if (text) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text,
              timestamp: new Date().toISOString(),
            },
          ])
        }
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (e) {
        console.error("Failed to start recognition:", e)
      }
    }
  }, [isRecording])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && prevMessagesLength.current === messages.length) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
    prevMessagesLength.current = messages.length
  }, [isOpen])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    const userMsg: ChatMessage = {
      role: "user",
      text: text.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)
    setShowSuggestions(false)

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      })

      // Defensive: check response before parsing JSON
      const responseText = await res.text()
      if (!responseText) {
        throw new Error("Server mengembalikan response kosong")
      }
      let json: any
      try {
        json = JSON.parse(responseText)
      } catch {
        throw new Error(`Server mengembalikan format tidak valid: ${responseText.slice(0, 100)}`)
      }
      if (!json.response) {
        throw new Error("Response dari server tidak lengkap")
      }
      const resp: AssistantMsg = json.response

      const assistantMsg: ChatMessage = {
        role: "assistant",
        text: resp.message,
        chart: resp.chart,
        actions: resp.actions,
        timestamp: resp.timestamp,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Maaf, terjadi kesalahan koneksi. Silakan coba lagi. 🙏",
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isRecording])

  const handleActionClick = async (action: ActionButton) => {
    const result = await executeAction(action, setActionLoading)
    if (result) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // ─── Markdown-like rendering ─────────────────────────────────────────
  function renderMessage(text: string) {
    // Bold: **text**
    const withBold = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Italic: *text*
    const withItalic = withBold.replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Line breaks
    const withBreaks = withItalic.replace(/\n/g, "<br/>")
    return withBreaks
  }

  return (
    <>
      {/* ─── Chat Button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? "bg-gray-800 rotate-90 scale-110"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-110 active:scale-95"
        }`}
        title={isOpen ? "Tutup chat" : "Buka AI Assistant"}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Bot className="h-6 w-6 text-white" />
        )}
        {/* Notification dot */}
        {!isOpen && messages.length <= 1 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* ─── Chat Panel ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">AI Assistant</h3>
              <p className="text-xs text-blue-100">Inventory Management — Bahasa Indonesia</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "assistant"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-md"
                      : "bg-gray-100 text-gray-700 rounded-tl-md"
                  }`}
                >
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMessage(msg.text) }}
                  />

                  {/* Chart */}
                  {msg.chart && <ChatChart chart={msg.chart} />}

                  {/* Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.actions.map((action, ai) => (
                        <button
                          key={ai}
                          onClick={() => handleActionClick(action)}
                          disabled={actionLoading}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            action.type === "navigate"
                              ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              : action.type === "download"
                              ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                              : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                          }`}
                        >
                          {action.type === "download" && <Download className="h-3 w-3" />}
                          {action.type === "navigate" && <ChevronRight className="h-3 w-3" />}
                          <span>{action.label.replace(/^[^\s]+\s/, "")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 mb-1.5 font-medium">Coba tanyakan:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.replace(/^[^\s]+\s/, ""))}
                    disabled={isLoading}
                    className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 shrink-0 bg-white">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanya apa saja..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none py-1.5"
              />

              {/* Microphone Button */}
              {isSpeechSupported !== false && (
                <button
                  onClick={toggleRecording}
                  disabled={isLoading}
                  className={`relative p-1.5 rounded-lg transition-all duration-300 ${
                    isRecording
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                  }`}
                  title={isRecording ? "Hentikan rekaman" : "Mulai rekaman suara"}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-4 w-4" />
                      {/* Waveform Animation */}
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                      </span>
                    </>
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              )}

              <button
                onClick={() => sendMessage(input)}
                disabled={(!input.trim() && !isRecording) || isLoading}
                className="p-1.5 rounded-lg bg-blue-600 text-white disabled:bg-gray-200 disabled:text-gray-400 hover:bg-blue-700 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Voice Recording Waveform Indicator */}
            {isRecording && (
              <div className="flex items-center justify-center gap-0.5 mt-2 h-6">
                <span className="text-[10px] text-red-500 font-medium mr-1.5 max-w-[200px] truncate">
                  {input || "Mendengarkan..."}
                </span>
                <span className="w-0.5 h-3 bg-red-400 rounded-full animate-voice-waveform" style={{ animationDelay: "0ms" }} />
                <span className="w-0.5 h-5 bg-red-500 rounded-full animate-voice-waveform" style={{ animationDelay: "150ms" }} />
                <span className="w-0.5 h-4 bg-red-400 rounded-full animate-voice-waveform" style={{ animationDelay: "300ms" }} />
                <span className="w-0.5 h-6 bg-red-500 rounded-full animate-voice-waveform" style={{ animationDelay: "450ms" }} />
                <span className="w-0.5 h-3 bg-red-400 rounded-full animate-voice-waveform" style={{ animationDelay: "600ms" }} />
                <span className="w-0.5 h-5 bg-red-500 rounded-full animate-voice-waveform" style={{ animationDelay: "750ms" }} />
              </div>
            )}

            <p className="text-[10px] text-gray-400 mt-1 text-center">
              AI Assistant dapat menjawab pertanyaan seputar stok, penjualan, dan laporan
            </p>
          </div>
        </div>
      )}
    </>
  )
}
