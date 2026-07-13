"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { User, DollarSign, Percent, Globe, ChevronRight, Building2, Plus, Shield, CreditCard, FolderTree } from "lucide-react"

const settingsMenu = [
  { title: "Profile", desc: "Manage company profile and merchant info", icon: Building2, href: "/settings/profile", color: "bg-blue-100 text-blue-600" },
  { title: "Subscription", desc: "Manage plan, validity, and system data", icon: CreditCard, href: "/settings/subscription", color: "bg-purple-100 text-purple-600" },
  { title: "Currency", desc: "Multi-currency with default IDR conversion", icon: DollarSign, href: "/settings/currency", color: "bg-green-100 text-green-600" },
  { title: "Tax", desc: "Configure PPN, PPh and other tax rates", icon: Percent, href: "/settings/tax", color: "bg-yellow-100 text-yellow-600" },
  { title: "E-Commerce", desc: "Manage API connectors for online platforms", icon: Globe, href: "/settings/ecommerce", color: "bg-purple-100 text-purple-600" },
  { title: "Users", desc: "Manage user accounts and assign roles", icon: Plus, href: "/settings/users", color: "bg-indigo-100 text-indigo-600" },
  { title: "Categories", desc: "Manage product categories for inventory", icon: FolderTree, href: "/settings/categories", color: "bg-cyan-100 text-cyan-600" },
  { title: "Roles", desc: "Configure role-based permissions per feature", icon: Shield, href: "/settings/roles", color: "bg-rose-100 text-rose-600" },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Settings</h3>
        <p className="text-sm text-gray-500 mt-1">Configure your system settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsMenu.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.color}`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
