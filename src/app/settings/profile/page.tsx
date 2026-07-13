"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, User, Building2, Phone, Mail } from "lucide-react"

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Profile Settings</h3>
        <p className="text-sm text-gray-500 mt-1">Manage your merchant profile and account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Merchant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-blue-600" />
              </div>
              <div>
                <Button variant="outline" size="sm">Change Logo</Button>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG. Max 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <Input value="PT Inventory Nusantara" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Legal Name</label>
                <Input value="PT Inventory Nusantara" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input value="admin@inventory.com" type="email" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input value="+62 21 1234 5678" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tax ID (NPWP)</label>
                <Input value="01.234.567.8-901.000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Timezone</label>
                <select className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option>Asia/Jakarta (WIB)</option>
                  <option>Asia/Makassar (WITA)</option>
                  <option>Asia/Jayapura (WIT)</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" defaultValue="Jl. Sudirman No. 123, Jakarta Pusat" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
