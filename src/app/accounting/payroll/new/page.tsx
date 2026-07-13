"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2, Users, Calculator } from "lucide-react"

interface Employee {
  id: string
  name: string
  position: string
  department: string
  baseSalary: number
  payType: string
}

export default function NewPayrollPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split("T")[0])
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split("T")[0])
  const [payType, setPayType] = useState("MONTHLY")
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [postToJournal, setPostToJournal] = useState(true)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setEmployees(j.data)
          setSelectedEmployees(j.data.map((e: Employee) => e.id))
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  const selectAll = () => setSelectedEmployees(employees.map((e) => e.id))
  const deselectAll = () => setSelectedEmployees([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!periodStart || !periodEnd) { setError("Period is required"); return }
    if (selectedEmployees.length === 0) { setError("Select at least one employee"); return }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd, payType, employeeIds: selectedEmployees, notes, postToJournal }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      router.push("/accounting/payroll")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/accounting/payroll" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></Link>
        <div><h3 className="text-lg font-medium text-gray-900">New Payroll</h3><p className="text-sm text-gray-500 mt-1">Calculate salary for selected period</p></div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-blue-500" /> Payroll Period</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Period Start <span className="text-red-500">*</span></label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Period End <span className="text-red-500">*</span></label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pay Type</label>
                <Select options={[{ label: "Monthly", value: "MONTHLY" }, { label: "Daily", value: "DAILY" }]} value={payType} onChange={(e) => setPayType(e.target.value)} />
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={postToJournal} onChange={(e) => setPostToJournal(e.target.checked)} className="rounded" />
                  Post to Journal on Approve
                </label>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payroll notes..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> Employees ({selectedEmployees.length}/{employees.length})</CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>Clear</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No active employees found. Add employees first.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map((emp) => (
                  <label
                    key={emp.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedEmployees.includes(emp.id)
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.position || emp.department || "—"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{emp.payType}</Badge>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/accounting/payroll"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Calculate & Save Payroll
          </Button>
        </div>
      </form>
    </div>
  )
}
