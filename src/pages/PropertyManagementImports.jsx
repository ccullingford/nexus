import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Upload, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PropertyManagementImports() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#414257]">Property Management Imports</h1>
        <p className="text-[#5c5f7a] mt-1">Import and sync data from external systems</p>
      </div>

      {/* Import Types */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* AppFolio Homeowner Directory */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-[#414257]">AppFolio Homeowner Directory</CardTitle>
                  <CardDescription className="mt-1">
                    Import associations, units, and owners from AppFolio CSV export
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-[#5c5f7a]">
                <p className="mb-2">Expected file format:</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">homeowner_directory-YYYYMMDD.csv</code>
              </div>
              <Link to={createPageUrl('PropertyManagementImportsAppFolioHomeownerDirectory')}>
                <Button className="w-full bg-[#414257] hover:bg-[#5c5f7a]">
                  <Upload className="w-4 h-4 mr-2" />
                  Start Import
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Future Import Types - Placeholder */}
        <Card className="border-0 shadow-sm opacity-60">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <CardTitle className="text-[#414257]">More Import Types</CardTitle>
                  <CardDescription className="mt-1">
                    Additional import sources coming soon
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-[#414257] mb-2">How Imports Work</h3>
          <ul className="space-y-2 text-sm text-[#5c5f7a]">
            <li>• Upload your CSV export file</li>
            <li>• Map CSV columns to system fields</li>
            <li>• Review and confirm the mapping</li>
            <li>• Run the import and track progress</li>
            <li>• View import history and results</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}