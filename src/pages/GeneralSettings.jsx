import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Settings, FileSpreadsheet, Shield, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GeneralSettings() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#414257]">General Settings</h1>
        <p className="text-[#5c5f7a] mt-1">
          Settings and tools that are used occasionally, including imports and admin utilities
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Property Imports */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-[#414257]">Property Imports</CardTitle>
                  <CardDescription className="mt-1">
                    Import AppFolio homeowner directory CSVs and sync associations, units, and owners
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('PropertyManagementImports')}>
              <Button className="w-full bg-[#414257] hover:bg-[#5c5f7a]">
                Open Property Imports
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Invoice Manager Admin */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-[#414257]">Invoice Manager Admin</CardTitle>
                  <CardDescription className="mt-1">
                    Test Microsoft Graph email integration and manage invoice-related tools
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('InvoiceManagerAdmin')}>
              <Button className="w-full bg-[#414257] hover:bg-[#5c5f7a]">
                Open Invoice Manager Admin
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Future Expansion Placeholders */}
      <Card className="border-0 shadow-sm bg-gray-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-[#414257] mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Future Tools & Settings
          </h3>
          <ul className="space-y-2 text-sm text-[#5c5f7a]">
            <li>• TODO: Add link/card for global email templates</li>
            <li>• TODO: Add link/card for AppFolio integration settings or automation schedule</li>
            <li>• TODO: Add link/card for system-level tools (debug logs, import history, etc.)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}