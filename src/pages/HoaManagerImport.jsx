import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Upload, FileJson, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HoaManagerImport() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/json') {
        setError('Please select a valid JSON file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const fileText = await file.text();
      const exportData = JSON.parse(fileText);

      const response = await base44.functions.invoke('importHoaManagerExport', {
        exportData
      });

      if (response.data.success) {
        setResult(response.data.summary);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
      } else {
        setError(response.data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import data. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  const renderSummary = () => {
    if (!result) return null;

    const entities = [
      { key: 'associations', label: 'Associations' },
      { key: 'units', label: 'Units' },
      { key: 'owners', label: 'Owners' },
      { key: 'tenants', label: 'Tenants' },
      { key: 'vehicles', label: 'Vehicles' },
      { key: 'permits', label: 'Permits' },
      { key: 'violations', label: 'Violations' },
      { key: 'notes', label: 'Notes' }
    ];

    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <CardTitle className="text-green-900">Import Completed Successfully</CardTitle>
              <CardDescription className="text-green-700">
                Data has been imported from HOA Manager
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {entities.map(entity => {
            const stats = result[entity.key];
            if (!stats || (stats.created === 0 && stats.updated === 0 && stats.skipped === 0)) {
              return null;
            }

            return (
              <div key={entity.key} className="p-3 bg-white rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#414257]">{entity.label}</span>
                </div>
                <div className="flex gap-3 text-sm">
                  {stats.created > 0 && (
                    <Badge className="bg-blue-100 text-blue-800">
                      Created: {stats.created}
                    </Badge>
                  )}
                  {stats.updated > 0 && (
                    <Badge className="bg-purple-100 text-purple-800">
                      Updated: {stats.updated}
                    </Badge>
                  )}
                  {stats.skipped > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Skipped: {stats.skipped}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.location.href = createPageUrl('GeneralSettings')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#414257]">HOA Manager Import</h1>
          <p className="text-[#5c5f7a] mt-1">
            Import data from HOA Manager Pro JSON export
          </p>
        </div>
      </div>

      {/* Instructions Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#414257]">How to Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[#5c5f7a]">
          <ol className="list-decimal list-inside space-y-2">
            <li>Export your data from HOA Manager Pro as a JSON file</li>
            <li>Upload the JSON file using the form below</li>
            <li>Review the import summary after completion</li>
            <li>The import is idempotent - you can re-run it safely to update existing records</li>
          </ol>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Existing records are matched by legacy_id and will be updated. 
              New records will be created for any data not previously imported.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#414257]">Upload JSON Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-[#e3e4ed] rounded-lg p-8 bg-[#f8f8fb]">
            <FileJson className="w-12 h-12 text-[#5c5f7a] mb-4" />
            <input
              id="file-input"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-input">
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-input').click()}
                disabled={importing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select JSON File
              </Button>
            </label>
            {file && (
              <p className="mt-3 text-sm text-[#414257] font-medium">
                Selected: {file.name}
              </p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full bg-[#414257] hover:bg-[#5c5f7a]"
            size="lg"
          >
            {importing ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Import Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {renderSummary()}
    </div>
  );
}