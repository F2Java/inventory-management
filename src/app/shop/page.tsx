"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Package, ShoppingCart, Loader2, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface Product {
  id: string
  name: string
  sku: string
  price: number
  unit: string
  image: string | null
  thumbnail: string | null
  category: string
  totalStock: number
  uom: string
}

interface Category {
  id: string
  name: string
}

export default function ShopHomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [cart, setCart] = useState<Record<string, number>>({})

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (selectedCategory) params.set("category", selectedCategory)
        const res = await fetch(`/api/b2b/products?${params.toString()}`)
        const json = await res.json()
        if (json.data) setProducts(json.data)
        if (json.categories) setCategories(json.categories)
      } catch (err) {
        console.error("Failed to load products:", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [selectedCategory])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("b2b_cart")
      if (saved) setCart(JSON.parse(saved))
    } catch {}
  }, [])

  const addToCart = (productId: string) => {
    const newCart = { ...cart, [productId]: (cart[productId] || 0) + 1 }
    setCart(newCart)
    localStorage.setItem("b2b_cart", JSON.stringify(newCart))
  }

  const filtered = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 md:p-12 mb-8 text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Wholesale Inventory Portal</h1>
        <p className="text-blue-100 text-lg mb-6 max-w-2xl">
          Browse our complete catalog and place bulk orders for your business. Competitive wholesale pricing with flexible payment terms.
        </p>
        <div className="flex items-center gap-2 text-blue-100 text-sm">
          <Star className="h-4 w-4 fill-current" />
          <span>B2B pricing · Net payment terms · Fast delivery</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedCategory ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No products found</p>
          <p className="text-sm mt-1">Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-200 group">
              <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-16 w-16 text-gray-300" />
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <Badge variant="outline" className="text-[10px] mb-1">{product.category}</Badge>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{product.sku}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</p>
                    <p className="text-xs text-gray-400">per {product.uom}</p>
                  </div>
                  <p className={`text-xs font-medium ${product.totalStock > 10 ? "text-green-600" : product.totalStock > 0 ? "text-orange-600" : "text-red-600"}`}>
                    {product.totalStock > 0 ? `${product.totalStock} in stock` : "Out of stock"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/shop/products/${product.sku}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">Details</Button>
                  </Link>
                  <Button size="sm" className="flex items-center gap-1 text-xs" onClick={() => addToCart(product.id)} disabled={product.totalStock <= 0}>
                    <ShoppingCart className="h-3 w-3" /> Add
                  </Button>
                </div>
                {cart[product.id] && (
                  <div className="bg-blue-50 rounded-lg p-2 text-center text-xs font-medium text-blue-700">{cart[product.id]} in cart</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
