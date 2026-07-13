"use client"

import { SessionProvider } from "next-auth/react"
import { Sidebar } from "./sidebar"
import { Navbar } from "./navbar"
import { AssistantChat } from "@/components/assistant/assistant-chat"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
      <AssistantChat />
    </SessionProvider>
  )
}
