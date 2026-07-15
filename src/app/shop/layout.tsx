"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingCart, Store, Package, LogOut, User, PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<any>(null)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const sess = localStorage.getItem("b2b_session")
    if (sess) setCustomer(JSON.parse(sess))

    const updateCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("b2b_cart") || "{}")
        setCartCount(Object.values(cart).reduce((s: number, v: any) => s + v, 0))
      } catch {}
    }
    updateCart()
    window.addEventListener("storage", updateCart)
    return () => window.removeEventListener("storage", updateCart)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("b2b_session")
    setCustomer(null)
    window.location.href = "/shop"
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/shop" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">B2B Portal</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/shop/cart" className="relative flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
              {customer ? (
                <>
                  <Link href="/shop/orders" className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1">
                    <PackageOpen className="h-4 w-4" /> Orders
                  </Link>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{customer.companyName}</span>
                  </div>
                  <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link href="/shop/auth/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                    Sign In
                  </Link>
                  <Link href="/shop/auth/register" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-500">B2B Wholesale Portal</span>
            </div>
            <p className="text-xs text-gray-400">© 2026 Inventory Management System</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
