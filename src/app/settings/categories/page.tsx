"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Package,
  AlertTriangle,
  Layers,
  ChevronDown,
  FolderOpen,
  File,
} from "lucide-react"
import Link from "next/link"

interface Category {
  id: string
  name: string
  description: string | null
  parentId: string | null
  parent: { id: string; name: string } | null
  children: { id: string; name: string }[]
  _count: { products: number }
}

/** Build a list of topologically sorted categories so children follow their parent. */
function buildTreeList(cats: Category[]): Category[] {
  const root = cats.filter((c) => !c.parentId)
  const children = cats.filter((c) => c.parentId)
  const result: Category[] = [...root]
  const added = new Set(result.map((c) => c.id))
  let prevSize = 0
  // Keep iterating until no more children can be placed after their parent
  while (result.length > prevSize) {
    prevSize = result.length
    for (const child of children) {
      if (!added.has(child.id) && added.has(child.parentId!)) {
        result.push(child)
        added.add(child.id)
      }
    }
  }
  // Append any remaining (orphaned children whose parent is missing)
  for (const child of children) {
    if (!added.has(child.id)) result.push(child)
  }
  return result
}

/** Flattened tree depth map: { id: depth } */
function buildDepthMap(cats: Category[]): Map<string, number> {
  const depth = new Map<string, number>()
  const lookup = new Map(cats.map((c) => [c.id, c]))
  for (const c of cats) {
    let d = 0
    let cur: Category | undefined = c
    while (cur?.parentId) {
      d++
      cur = lookup.get(cur.parentId)
    }
    depth.set(c.id, d)
  }
  return depth
}

export default function CategoriesSettingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editParentId, setEditParentId] = useState<string>("")
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newParentId, setNewParentId] = useState<string>("")
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories")
      const json = await res.json()
      if (json.data) setCategories(json.data)
    } catch (err) {
      setError("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCategories() }, [])

  const treeList = useMemo(() => buildTreeList(categories), [categories])
  const depthMap = useMemo(() => buildDepthMap(categories), [categories])

  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0)
  const rootCount = categories.filter((c) => !c.parentId).length
  const maxDepth = Math.max(0, ...Array.from(depthMap.values()))

  /** Options for parent selector (excludes current category when editing). */
  const parentOptions = useMemo(() => {
    const excludeId = editingId || "__none__"
    return categories
      .filter((c) => c.id !== excludeId && !isDescendant(c.id, excludeId))
      .map((c) => ({ label: c.name, value: c.id }))
  }, [categories, editingId])

  /** Check if `targetId` is a descendant of `ancestorId` (circular reference check). */
  function isDescendant(targetId: string, ancestorId: string): boolean {
    if (!ancestorId || !targetId) return false
    const lookup = new Map(categories.map((c) => [c.id, c]))
    let cur = lookup.get(targetId)
    while (cur) {
      if (cur.parentId === ancestorId) return true
      cur = cur.parentId ? lookup.get(cur.parentId) : undefined
    }
    return false
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditDescription(cat.description || "")
    setEditParentId(cat.parentId || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditDescription("")
    setEditParentId("")
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    setSaving(id)
    try {
      const payload: any = { name: editName.trim(), description: editDescription.trim() || null }
      // Only send parentId if it changed
      const original = categories.find((c) => c.id === id)
      if (original && editParentId !== (original.parentId || "")) {
        payload.parentId = editParentId || null
      }
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "Failed to update")
        return
      }
      cancelEdit()
      await loadCategories()
    } catch (err) {
      setError("Failed to update category")
    } finally {
      setSaving(null)
    }
  }

  const addCategory = async () => {
    if (!newName.trim()) return
    setIsAdding(true)
    setError("")
    try {
      const payload: any = { name: newName.trim(), description: newDescription.trim() || null }
      if (newParentId) payload.parentId = newParentId

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to create")
        return
      }
      setNewName("")
      setNewDescription("")
      setNewParentId("")
      await loadCategories()
    } catch (err) {
      setError("Failed to create category")
    } finally {
      setIsAdding(false)
    }
  }

  const deleteCategory = async (cat: Category) => {
    if (cat._count.products > 0) {
      setError(`Cannot delete "${cat.name}" — ${cat._count.products} product(s) are using it.`)
      return
    }
    if (cat.children.length > 0) {
      setError(`Cannot delete "${cat.name}" — it has ${cat.children.length} sub-category(ies). Remove them first.`)
      return
    }
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return

    setSaving(cat.id)
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "Failed to delete")
        return
      }
      await loadCategories()
    } catch (err) {
      setError("Failed to delete category")
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Product Categories</h3>
          <p className="text-sm text-gray-500 mt-1">
            Organize categories into a hierarchy — sub-categories appear indented under their parent
          </p>
        </div>
        <Link href="/products/new" className="text-sm text-blue-600 hover:text-blue-800 underline">
          Create a product
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
              <FolderTree className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              <p className="text-sm text-gray-500">Categories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-green-100 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rootCount}</p>
              <p className="text-sm text-gray-500">Root categories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
              <p className="text-sm text-gray-500">Products assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center">
              <Layers className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{maxDepth + 1}</p>
              <p className="text-sm text-gray-500">Hierarchy levels</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add new category form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-500" />
            Add New Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
            </div>
            <div className="flex-[2]">
              <Input
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { label: "No parent (root category)", value: "" },
                  ...categories.map((c) => ({ label: c.name, value: c.id })),
                ]}
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                placeholder="Parent category"
              />
            </div>
            <Button
              onClick={addCategory}
              disabled={isAdding || !newName.trim()}
              className="shrink-0"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories table */}
      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No categories yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your first category above</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Category Name</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center w-20">Products</TableHead>
                  <TableHead className="text-center w-28">Sub-Categories</TableHead>
                  <TableHead className="text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treeList.map((cat) => {
                  const depth = depthMap.get(cat.id) || 0
                  const isEditing = editingId === cat.id
                  const hasChildren = cat.children.length > 0

                  return (
                    <TableRow
                      key={cat.id}
                      className={depth > 0 ? (isEditing ? "" : "bg-gray-50/40") : ""}
                    >
                      {isEditing ? (
                        <>
                          <TableCell>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              options={[
                                { label: "No parent (root category)", value: "" },
                                ...parentOptions,
                              ]}
                              value={editParentId}
                              onChange={(e) => setEditParentId(e.target.value)}
                              placeholder="Parent category"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Description"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="status" status={cat._count.products > 0 ? "active" : "inactive"}>
                              {cat._count.products}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-500">
                            {cat.children.length}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 text-green-600"
                                disabled={saving === cat.id}
                                onClick={() => saveEdit(cat.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 text-gray-500"
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 20 }}>
                              {/* Tree connector */}
                              {depth > 0 && (
                                <div className="flex items-center shrink-0">
                                  <div className="w-3 h-px bg-gray-300" />
                                </div>
                              )}
                              {hasChildren ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              ) : (
                                <File className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              )}
                              <span className="font-medium text-gray-900 text-sm">{cat.name}</span>
                              {depth === 0 && !cat.parentId && (
                                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                                  root
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {cat.parent ? (
                              <span className="text-gray-600">{cat.parent.name}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                            {cat.description || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="status" status={cat._count.products > 0 ? "active" : "inactive"}>
                              {cat._count.products}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {hasChildren ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {cat.children.map((child) => (
                                  <Badge key={child.id} variant="outline" className="text-xs">
                                    {child.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                onClick={() => startEdit(cat)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 text-gray-500 hover:text-red-600"
                                onClick={() => deleteCategory(cat)}
                                disabled={saving === cat.id}
                                title="Delete"
                              >
                                {saving === cat.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
