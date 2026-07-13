"use client"

import { Plus, Search, Clock } from "lucide-react"
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

const shifts = [
  { name: "Pagi", start: "07:00", end: "15:00", tolerance: 15, employees: 3, status: "active" },
  { name: "Siang", start: "15:00", end: "23:00", tolerance: 15, employees: 2, status: "active" },
  { name: "Malam", start: "23:00", end: "07:00", tolerance: 15, employees: 1, status: "active" },
  { name: "Part-time", start: "08:00", end: "12:00", tolerance: 10, employees: 2, status: "active" },
]

const schedules = [
  { employee: "Ahmad Rizki", mon: "Pagi", tue: "Pagi", wed: "Pagi", thu: "Siang", fri: "Siang", sat: "-", sun: "-" },
  { employee: "Siti Nurhaliza", mon: "Siang", tue: "Siang", wed: "Pagi", thu: "Pagi", fri: "-", sat: "Pagi", sun: "-" },
  { employee: "Rudi Hartono", mon: "Pagi", tue: "Pagi", wed: "Pagi", thu: "Pagi", fri: "Pagi", sat: "-", sun: "-" },
  { employee: "Bambang Susilo", mon: "Malam", tue: "Malam", wed: "-", thu: "Siang", fri: "Siang", sat: "Siang", sun: "-" },
]

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function ShiftsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Shift & Schedule Management</h3>
          <p className="text-sm text-gray-500 mt-1">Manage employee shifts and work schedules</p>
        </div>
        <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Shift</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shift Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Tolerance</TableHead>
                  <TableHead className="text-right">Staff</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="font-medium"><Clock className="h-4 w-4 inline mr-2 text-gray-400" />{s.name}</TableCell>
                    <TableCell className="font-mono">{s.start}</TableCell>
                    <TableCell className="font-mono">{s.end}</TableCell>
                    <TableCell className="text-right">{s.tolerance} min</TableCell>
                    <TableCell className="text-right">{s.employees}</TableCell>
                    <TableCell><Badge variant="status" status="active">Active</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Schedule (This Week)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  {days.map((d) => (
                    <TableHead key={d} className="text-center text-xs">{d}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.employee}>
                    <TableCell className="font-medium text-sm">{s.employee}</TableCell>
                    {days.map((d) => {
                      const dayKey = d.toLowerCase() as keyof typeof s
                      const shift = s[dayKey]
                      return (
                        <TableCell key={d} className="text-center">
                          <Badge variant={shift === "-" ? "outline" : "default"} className="text-xs">
                            {shift || "-"}
                          </Badge>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
