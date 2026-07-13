"use client"

import { useState, useEffect, Fragment } from "react"
import { Plus, Search, CheckCircle2, Loader2, BookOpen, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { formatCurrency, formatDate } from "@/lib/utils"

interface JournalEntry {
  id: string
  account: { accountCode: string; accountName: string }
  debit: number
  credit: number
  description?: string
}

interface Journal {
  id: string
  journalNumber: string
  description?: string
  reference?: string
  referenceType?: string
  postedAt?: string
  date: string
  createdAt: string
  entries: JournalEntry[]
}

export default function JournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/accounting/journal")
        const json = await res.json()
        if (json.data) setJournals(json.data)
        else throw new Error(json.error || "Failed to load")
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = journals.filter((j) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      j.journalNumber.toLowerCase().includes(q) ||
      (j.description || "").toLowerCase().includes(q) ||
      (j.referenceType || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Journal Entries</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "Loading..." : `${journals.length} journals — auto-generated from transactions`}
          </p>
        </div>
        <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Journal</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Journals</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search journals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-medium text-gray-500">No journal entries yet</p>
              <p className="text-sm mt-1">Journals are auto-generated when you create sales, purchases, expenses, or payroll</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Journal #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((j) => {
                  const totalDebit = j.entries.reduce((s, e) => s + Number(e.debit), 0)
                  const isExpanded = expandedId === j.id
                  return (
                    <Fragment key={j.id}>
                      <TableRow
                        key={j.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedId(isExpanded ? null : j.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium">{j.journalNumber}</TableCell>
                        <TableCell className="max-w-xs truncate">{j.description || "—"}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className="text-xs">{j.referenceType || "manual"}</Badge>
                          {j.reference && (
                            <span className="ml-2 font-mono text-xs">{j.reference}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="status" status={j.postedAt ? "posted" : "draft"}>
                            {j.postedAt ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Posted</> : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(j.date || j.createdAt)}</TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${j.id}-entries`}>
                          <TableCell colSpan={6} className="bg-gray-50 p-0">
                            <div className="px-6 py-4">
                              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                Journal Entries — Total Debit: {formatCurrency(totalDebit)} — {j.entries.length} line(s)
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Account</TableHead>
                                    <TableHead className="text-xs">Description</TableHead>
                                    <TableHead className="text-right text-xs">Debit</TableHead>
                                    <TableHead className="text-right text-xs">Credit</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {j.entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                      <TableCell className="text-sm">
                                        <span className="font-mono text-xs text-gray-500">{entry.account.accountCode}</span>
                                        <span className="ml-2">{entry.account.accountName}</span>
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-500">{entry.description || "—"}</TableCell>
                                      <TableCell className="text-right font-medium text-sm">
                                        {Number(entry.debit) > 0 ? formatCurrency(Number(entry.debit)) : ""}
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-sm">
                                        {Number(entry.credit) > 0 ? formatCurrency(Number(entry.credit)) : ""}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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
