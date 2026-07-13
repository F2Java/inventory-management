"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/ui/image-upload"
import { BarcodeInput } from "@/components/ui/barcode-input"
import { UomSelector, type ProductUomEntry, type UomOption } from "@/components/ui/uom-selector"
import { VariantManager, type VariantGroup, type VariantData } from "@/components/ui/variant-manager"
import { ArrowLeft, Save, Package, Image, Ruler, Barcode, Layers } from "lucide-react"
import Link from "next/link"

const skuMethods = [
  { label: "Auto Generate", value: "AUTO" },
  { label: "Manual Input", value: "MANUAL" },
]

export default function NewProductPage() {
  const router = useRouter()
  const [skuMethod, setSkuMethod] = useState("AUTO")
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [unit, setUnit] = useState("pcs")
  const [weight, setWeight] = useState("")
  const [costPerUnit, setCostPerUnit] = useState("")
  const [sellPerUnit, setSellPerUnit] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [initialStock, setInitialStock] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Image state
  const [images, setImages] = useState<{ url: string; thumbnail?: string; isPrimary?: boolean; file?: File }[]>([])

  // UoM state
  const [availableUoms, setAvailableUoms] = useState<UomOption[]>([])
  const [productUoms, setProductUoms] = useState<ProductUomEntry[]>([])

  // Variant state
  const [enableVariants, setEnableVariants] = useState(false)
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [variants, setVariants] = useState<VariantData[]>([])

  // Categories state (fetched from DB)
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([])

  // Warehouses state (fetched from DB)
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([])

  // Fetch UoMs on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [catJson, whJson, uomJson] = await Promise.all([
          fetch("/api/categories").then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
          fetch("/api/warehouses").then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
          fetch("/api/uoms").then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
        ])

        // Categories
        if (catJson.data) {
          setCategories(
            catJson.data.map((c: any) => ({
              label: c.name,
              value: c.id,
            }))
          )
        }

        // Warehouses
        if (whJson.data) {
          setWarehouses(
            whJson.data.map((w: any) => ({
              label: w.name,
              value: w.id,
            }))
          )
        }

        // UoMs
        if (uomJson.data) {
          setAvailableUoms(
            uomJson.data.map((u: any) => ({
              id: u.id,
              name: u.name,
              abbreviation: u.abbreviation,
            }))
          )
        }
      } catch (err) {
        console.error("Failed to load data:", err)
      }
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    if (!name || !categoryId) {
      setError("Product name and category are required")
      setIsSubmitting(false)
      return
    }

    try {
      const payload: any = {
        name,
        description,
        sku,
        skuMethod,
        barcode,
        categoryId,
        costPerUnit,
        sellPerUnit,
        unit,
        weight: weight || null,
        warehouseId: warehouseId || null,
        initialStock: initialStock || null,
        images: images.map((img, i) => ({
          url: img.url,
          thumbnail: img.thumbnail,
          isPrimary: img.isPrimary || i === 0,
        })),
        uoms: productUoms.map((u) => ({
          uomId: u.uomId,
          isBase: u.isBase,
          conversionToBase: u.conversionToBase,
          sellPrice: u.sellPrice || null,
          costPrice: u.costPrice || null,
        })),
        hasVariants: enableVariants,
      }

      // Add variant data if enabled
      if (enableVariants && variantGroups.length > 0) {
        payload.variantGroups = variantGroups.map((g) => ({
          name: g.name,
          sortOrder: g.sortOrder,
          options: g.options.map((o) => ({
            name: o.name,
            value: o.value,
            sortOrder: o.sortOrder,
          })),
        }))
        payload.variants = variants.map((v) => ({
          sku: v.sku,
          barcode: v.barcode || null,
          costPerUnit: v.costPerUnit,
          sellPerUnit: v.sellPerUnit,
          unit: v.unit || unit,
          optionNames: v.optionLabels,
        }))
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Failed to create product")
      }

      router.push("/products")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Add New Product</h3>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the product details below — images auto-resize for faster loading
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter product name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  className="flex min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Product description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select
                  options={categories}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  placeholder="Select category"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  SKU Method
                </label>
                <Select
                  options={skuMethods}
                  value={skuMethod}
                  onChange={(e) => setSkuMethod(e.target.value)}
                />
              </div>

              {skuMethod === "MANUAL" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    SKU Code
                  </label>
                  <Input
                    placeholder="Enter SKU code"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Barcode className="h-3.5 w-3.5 text-gray-400" />
                  Barcode
                </label>
                <BarcodeInput
                  value={barcode}
                  onChange={setBarcode}
                  placeholder="Scan barcode or type manually..."
                  onBarcodeDetected={(code) => {
                    setBarcode(code)
                    // If name is empty, could auto-fill from product lookup
                  }}
                />
                <p className="text-xs text-gray-400">
                  USB barcode scanners auto-detect — just scan!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" />
              Product Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              images={images}
              onChange={setImages}
              maxImages={5}
            />
          </CardContent>
        </Card>

        {/* Units of Measure */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-4 w-4 text-blue-500" />
              Units of Measure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UomSelector
              uoms={productUoms}
              availableUoms={availableUoms}
              onChange={setProductUoms}
              defaultBaseUom="Pcs"
            />
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing & Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Base Unit
                </label>
                <Select
                  options={[
                    { label: "Pcs", value: "pcs" },
                    { label: "Kg", value: "kg" },
                    { label: "Box", value: "box" },
                    { label: "Liter", value: "liter" },
                    { label: "Meter", value: "meter" },
                  ]}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Weight (kg)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Cost per Unit (HPP) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rp
                  </span>
                  <Input
                    className="pl-10"
                    type="number"
                    placeholder="0"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Sell Price per Unit <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rp
                  </span>
                  <Input
                    className="pl-10"
                    type="number"
                    placeholder="0"
                    value={sellPerUnit}
                    onChange={(e) => setSellPerUnit(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variants / Sub-SKUs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              Variants / Sub-SKUs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enableVariants}
                  onChange={(e) => setEnableVariants(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700">
                  Enable Variants (Sub-SKUs)
                </span>
              </label>
              {enableVariants && (
                <span className="text-xs text-gray-400">
                  Each variant gets its own SKU, cost price, sell price, and stock
                </span>
              )}
            </div>

            {enableVariants && (
              <VariantManager
                groups={variantGroups}
                variants={variants}
                parentSku={sku || name.substring(0, 3).toUpperCase()}
                defaultUnit={unit}
                allWarehouses={warehouses.map(w => ({ id: w.value, name: w.label }))}
                onGroupsChange={setVariantGroups}
                onVariantsChange={setVariants}
              />
            )}

            {!enableVariants && (
              <p className="text-xs text-gray-400 italic">
                Toggle on to add sub-SKUs with different pricing and stock. Useful for products with sizes, colors, or other variations.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Initial Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Initial Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Warehouse
                </label>
                <Select
                  options={warehouses}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  placeholder="Select warehouse"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Initial Quantity
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/products">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </form>
    </div>
  )
}
