"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Save, X, Layers, Package, DollarSign, Edit3, GripVertical } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VariantGroup {
  id?: string
  name: string
  sortOrder: number
  options: VariantOption[]
}

export interface VariantOption {
  id?: string
  name: string
  value: string
  sortOrder: number
}

export interface VariantData {
  id?: string
  sku: string
  skuMethod: "AUTO" | "MANUAL"
  barcode: string
  costPerUnit: number
  sellPerUnit: number
  unit: string
  weight?: number | null
  optionIds: string[]  // References to VariantOption IDs
  optionLabels: string[] // Display labels
  warehouseStock?: { warehouse: { id: string; name: string; code: string }; quantity: number }[]
  isExisting?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

interface VariantManagerProps {
  groups: VariantGroup[]
  variants: VariantData[]
  parentSku: string
  defaultUnit: string
  allWarehouses?: { id: string; name: string }[]
  onGroupsChange: (groups: VariantGroup[]) => void
  onVariantsChange: (variants: VariantData[]) => void
}

export function VariantManager({
  groups,
  variants,
  parentSku,
  defaultUnit,
  allWarehouses = [],
  onGroupsChange,
  onVariantsChange,
}: VariantManagerProps) {
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [newOptionName, setNewOptionName] = useState("")
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null)

  // ─── Group Management ──────────────────────────────────────────────────

  const addGroup = () => {
    const name = prompt("Enter variant group name (e.g. Size, Color, Gender):")
    if (!name?.trim()) return
    const newGroup: VariantGroup = {
      name: name.trim(),
      sortOrder: groups.length,
      options: [],
    }
    onGroupsChange([...groups, newGroup])
  }

  const removeGroup = (index: number) => {
    const group = groups[index]
    // Check if any variant uses options from this group
    const groupOptionIds = group.options.map(o => o.id || o.name + o.value)
    const inUse = variants.some(v =>
      v.optionIds.some(oid => groupOptionIds.includes(oid))
    )
    if (inUse && !confirm(`Remove "${group.name}"? Variants using this group will lose their option labels.`)) return
    onGroupsChange(groups.filter((_, i) => i !== index))
  }

  const addOption = (groupIndex: number) => {
    const name = prompt(`Enter option name for "${groups[groupIndex].name}":`)
    if (!name?.trim()) return
    const value = prompt(`Enter option code/short-value for "${name}" (e.g. "S" for "Small", "RD" for "Red"):`) || name.substring(0, 2).toUpperCase()

    const updated = [...groups]
    updated[groupIndex] = {
      ...updated[groupIndex],
      options: [
        ...updated[groupIndex].options,
        { name: name.trim(), value: value.toUpperCase(), sortOrder: updated[groupIndex].options.length },
      ],
    }
    onGroupsChange(updated)
  }

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const updated = [...groups]
    updated[groupIndex].options = updated[groupIndex].options.filter((_, i) => i !== optionIndex)
    onGroupsChange(updated)
  }

  // ─── Variant Generation ────────────────────────────────────────────────

  const generateAllCombinations = () => {
    // Get all option arrays
    const optionSets = groups.map(g => g.options.map(o => o))
    if (optionSets.some(s => s.length === 0)) {
      alert("Each group must have at least one option")
      return
    }

    // Generate all combinations
    const combinations = cartesianProduct(optionSets)

    // Filter out already created variants
    const existingKeys = new Set(
      variants.map(v => v.optionIds.sort().join("|"))
    )

    let newVariants: VariantData[] = []

    for (const combo of combinations) {
      const ids = combo.map(o => o.id || o.name + o.value).sort()
      const key = ids.join("|")
      if (existingKeys.has(key)) continue

      const optionIds = combo.map(o => o.id || o.name + o.value)
      const optionLabels = combo.map(o => o.name)
      const suffix = combo.map(o => o.value).join("-")
      const sku = `${parentSku}-${suffix}`

      newVariants.push({
        sku,
        skuMethod: "AUTO",
        barcode: "",
        costPerUnit: 0,
        sellPerUnit: 0,
        unit: defaultUnit,
        optionIds,
        optionLabels,
      })
    }

    if (newVariants.length === 0) {
      alert("All combinations already exist as variants")
      return
    }

    onVariantsChange([...variants, ...newVariants])
  }

  const addManualVariant = () => {
    if (groups.length === 0) {
      const name = prompt("Enter variant name/SKU:")
      if (!name?.trim()) return
      onVariantsChange([
        ...variants,
        {
          sku: `${parentSku}-${name.trim().toUpperCase().replace(/\s+/g, "-")}`,
          skuMethod: "MANUAL",
          barcode: "",
          costPerUnit: 0,
          sellPerUnit: 0,
          unit: defaultUnit,
          optionIds: [],
          optionLabels: [name.trim()],
        },
      ])
    } else {
      generateAllCombinations()
    }
  }

  const removeVariant = (index: number) => {
    if (!confirm("Remove this variant?")) return
    onVariantsChange(variants.filter((_, i) => i !== index))
  }

  const updateVariant = (index: number, updates: Partial<VariantData>) => {
    const updated = [...variants]
    updated[index] = { ...updated[index], ...updates }
    onVariantsChange(updated)
  }

  const totalVariantStock = (v: VariantData) =>
    (v.warehouseStock || []).reduce((sum, s) => sum + s.quantity, 0)

  return (
    <div className="space-y-4">
      {/* Groups */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-500" />
          Variant Groups (Size, Color, Type, etc.)
        </h4>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addGroup}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">
          No variant groups defined. Add groups like &ldquo;Size&rdquo;, &ldquo;Color&rdquo;, or &ldquo;Gender&rdquo; to organize your variant options.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((group, gi) => (
            <Card key={gi} className="border border-gray-200">
              <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 text-gray-300" />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    {group.name}
                  </CardTitle>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeGroup(gi)}>
                  <X className="h-3 w-3 text-red-400" />
                </Button>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {group.options.map((opt, oi) => (
                    <Badge key={oi} variant="outline" className="text-[10px] pr-1 group">
                      <span>{opt.name}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(gi, oi)}
                        className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => addOption(gi)} className="text-[10px] h-6 w-full">
                  <Plus className="h-3 w-3 mr-1" /> Add Option
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Variant List */}
      <div className="flex items-center justify-between pt-2 border-t">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-500" />
          Sub-SKUs / Variants
          {variants.length > 0 && (
            <Badge variant="status" status="active" className="text-[10px]">
              {variants.length} variants
            </Badge>
          )}
        </h4>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addManualVariant}
            disabled={groups.some(g => g.options.length === 0) && groups.length > 0}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {groups.length > 0 ? "Generate All Combinations" : "Add Variant"}
          </Button>
        </div>
      </div>

      {variants.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">
          No sub-SKUs yet. Define variant groups and options above, then click &ldquo;Generate All Combinations&rdquo; to auto-create variants.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((v, vi) => {
            const isExisting = v.isExisting
            const totalStock = totalVariantStock(v)
            const isExpanded = expandedVariant === `v-${vi}`

            return (
              <Card key={vi} className={`border ${isExisting ? "border-blue-100 bg-blue-50/30" : "border-gray-200"}`}>
                <CardContent className="py-2.5 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1">
                        {v.optionLabels.map((label, li) => (
                          <Badge key={li} variant="outline" className="text-[10px] bg-gray-50">
                            {label}
                          </Badge>
                        ))}
                      </div>
                      <code className="text-xs font-mono text-gray-500">{v.sku}</code>
                      <span className="text-xs text-gray-400">Rp {formatCurrency(v.costPerUnit)} / Rp {formatCurrency(v.sellPerUnit)}</span>
                      {isExisting && (
                        <span className="text-[10px] text-blue-500">Saved</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${totalStock <= 0 ? "text-red-500" : "text-gray-600"}`}>
                        Stock: {totalStock}
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => setExpandedVariant(isExpanded ? null : `v-${vi}`)}>
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      {!isExisting && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => removeVariant(vi)}>
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-500">SKU</label>
                        <Input
                          size={1}
                          value={v.sku}
                          onChange={e => updateVariant(vi, { sku: e.target.value, skuMethod: "MANUAL" })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-500">Barcode</label>
                        <Input
                          size={1}
                          value={v.barcode}
                          onChange={e => updateVariant(vi, { barcode: e.target.value })}
                          className="h-7 text-xs"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-500">Cost (HPP)</label>
                        <Input
                          size={1}
                          type="number"
                          value={v.costPerUnit}
                          onChange={e => updateVariant(vi, { costPerUnit: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-500">Sell Price</label>
                        <Input
                          size={1}
                          type="number"
                          value={v.sellPerUnit}
                          onChange={e => updateVariant(vi, { sellPerUnit: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-gray-500">Unit</label>
                        <Input
                          size={1}
                          value={v.unit}
                          onChange={e => updateVariant(vi, { unit: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>
                      {isExisting && v.warehouseStock && v.warehouseStock.length > 0 && (
                        <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                          <label className="text-[10px] font-medium text-gray-500">Stock per Warehouse</label>
                          <div className="flex flex-wrap gap-2">
                            {v.warehouseStock.map((ws, wi) => (
                              <Badge key={wi} variant="outline" className="text-[10px]">
                                {ws.warehouse.name}: {ws.quantity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap(a => curr.map(b => [...a, b])),
    [[]]
  )
}
