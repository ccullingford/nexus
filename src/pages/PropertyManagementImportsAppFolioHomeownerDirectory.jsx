import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const IMPORT_TYPE = 'appfolio_homeowner_directory';

const DEFAULT_MAPPING = {
  'Property Name': 'association.name',
  'Unit': 'unit.unit_number',
  'First Name': 'owner.first_name',
  'Last Name': 'owner.last_name',
  'Emails': 'owner.email',
  'Phone Numbers': 'owner.phone',
  'Unit Street Address 1': 'unit.street_address',
  'Property Street Address 1': 'association.street_address',
  'Property City': 'association.city',
  'Property State': 'association.state',
  'Property Zip': 'association.zip',
  'Unit City': 'association.city',
  'Unit State': 'association.state',
  'Unit Zip': 'association.zip'
};

export default function PropertyManagementImportsAppFolioHomeownerDirectory() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('upload'); // upload, map, review, processing
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [csvColumns, setCsvColumns] = useState([]);
  const [csvPreviewData, setCsvPreviewData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');

  const { data: templates = [] } = useQuery({
    queryKey: ['import-templates', IMPORT_TYPE],
    queryFn: () => base44.entities.ImportMappingTemplate.filter({ type: IMPORT_TYPE }),
  });

  const { data: importHistory = [] } = useQuery({
    queryKey: ['import-jobs', IMPORT_TYPE],
    queryFn: () => base44.entities.ImportJob.filter({ type: IMPORT_TYPE }),
  });

  const createJobMutation = useMutation({
    mutationFn: (data) => base44.entities.ImportJob.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
    },
  });

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploading(true);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setFileUrl(file_url);

      // Fetch and parse CSV to extract columns
      const response = await fetch(file_url);
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());

      // CSV parser that handles quoted fields with commas
      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      if (lines.length > 0) {
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
        setCsvColumns(headers);

        // Parse first 5 rows for preview
        const previewRows = lines.slice(1, 6).map(line => {
          const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index] || '';
            return obj;
          }, {});
        });
        setCsvPreviewData(previewRows);

        // Initialize mapping with defaults
        const initialMapping = {};
        headers.forEach(header => {
          initialMapping[header] = DEFAULT_MAPPING[header] || 'skip';
        });
        setColumnMapping(initialMapping);

        setStep('map');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadTemplate = (templateId) => {
    if (templateId === 'default') {
      const initialMapping = {};
      csvColumns.forEach(header => {
        initialMapping[header] = DEFAULT_MAPPING[header] || 'skip';
      });
      setColumnMapping(initialMapping);
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setColumnMapping(template.column_mappings);
      }
    }
    setSelectedTemplateId(templateId);
  };

  const handleMappingChange = (csvColumn, targetField) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: targetField
    }));
  };

  const handleReview = () => {
    setStep('review');
  };

  const handleRunImport = async () => {
    setProcessing(true);
    try {
      // Filter out 'skip' mappings
      const filteredColumnMapping = Object.fromEntries(
        Object.entries(columnMapping).filter(([, target]) => target !== 'skip' && target !== '')
      );

      // Log the mappings for debugging
      console.log('Column Mappings:', filteredColumnMapping);
      
      // Create import job
      const job = await createJobMutation.mutateAsync({
        type: IMPORT_TYPE,
        status: 'pending',
        file_name: file.name,
        file_url: fileUrl,
        mapping_template_id: selectedTemplateId,
        started_at: new Date().toISOString(),
        total_rows: csvPreviewData.length,
        column_mappings: filteredColumnMapping
      });
      
      console.log('Created job:', job);

      // Trigger backend processing
      const processResult = await base44.functions.invoke('processAppFolioImport', {
        importJobId: job.id
      });

      if (processResult.data.success) {
        alert(`Import completed!\n\nProcessed: ${processResult.data.processedRows} rows\nCreated: ${processResult.data.createdRecords} records\nUpdated: ${processResult.data.updatedRecords} records\nErrors: ${processResult.data.errorCount}`);
      } else {
        alert('Import failed: ' + processResult.data.error);
      }
      
      window.location.href = createPageUrl('PropertyManagementImports');
    } catch (error) {
      console.error('Error running import:', error);
      alert('Failed to run import: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const targetFieldOptions = [
    { value: 'skip', label: '-- Skip --' },
    { value: 'association.name', label: 'Association: Name' },
    { value: 'association.code', label: 'Association: Code' },
    { value: 'association.street_address', label: 'Association: Street Address' },
    { value: 'association.city', label: 'Association: City' },
    { value: 'association.state', label: 'Association: State' },
    { value: 'association.zip', label: 'Association: ZIP' },
    { value: 'unit.unit_number', label: 'Unit: Unit Number' },
    { value: 'unit.bedrooms', label: 'Unit: Bedrooms' },
    { value: 'unit.street_address', label: 'Unit: Street Address' },
    { value: 'owner.first_name', label: 'Owner: First Name' },
    { value: 'owner.last_name', label: 'Owner: Last Name' },
    { value: 'owner.email', label: 'Owner: Email' },
    { value: 'owner.phone', label: 'Owner: Phone' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.location.href = createPageUrl('PropertyManagementImports')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#414257]">AppFolio Homeowner Directory Import</h1>
          <p className="text-[#5c5f7a] mt-1">Import associations, units, and owners from CSV</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-[#414257]' : 'text-[#5c5f7a]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step !== 'upload' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {step !== 'upload' ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Upload File</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 mx-4" />
            <div className={`flex items-center gap-2 ${step === 'map' ? 'text-[#414257]' : 'text-[#5c5f7a]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['review', 'processing'].includes(step) ? 'bg-green-100 text-green-700' : 
                step === 'map' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
              }`}>
                {['review', 'processing'].includes(step) ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="font-medium">Map Columns</span>
            </div>
            <div className="flex-1 h-px bg-gray-200 mx-4" />
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-[#414257]' : 'text-[#5c5f7a]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'processing' ? 'bg-green-100 text-green-700' : 
                step === 'review' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
              }`}>
                {step === 'processing' ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <span className="font-medium">Review & Run</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#414257]">Upload CSV File</CardTitle>
            <CardDescription>
              Select your AppFolio homeowner directory CSV export (homeowner_directory-YYYYMMDD.csv)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-[#e3e4ed] rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-[#5c5f7a] mx-auto mb-4" />
              <p className="text-[#414257] font-medium mb-2">Choose CSV file to upload</p>
              <p className="text-sm text-[#5c5f7a] mb-4">CSV format required</p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
                disabled={uploading}
              />
            </div>

            {uploading && (
              <div className="flex items-center justify-center gap-2 text-[#414257]">
                <Loader className="w-5 h-5 animate-spin" />
                <p>Processing file...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map Columns */}
      {step === 'map' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#414257]">Map CSV Columns to Fields</CardTitle>
                  <CardDescription>
                    Match your CSV columns to the system fields
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Template:</Label>
                  <Select value={selectedTemplateId} onValueChange={handleLoadTemplate}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Mapping</SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CSV Column</TableHead>
                      <TableHead>Sample Data</TableHead>
                      <TableHead>Maps To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvColumns.map((column) => (
                      <TableRow key={column}>
                        <TableCell className="font-medium">{column}</TableCell>
                        <TableCell className="text-sm text-[#5c5f7a]">
                          {csvPreviewData[0]?.[column] || '—'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={columnMapping[column] || 'skip'}
                            onValueChange={(value) => handleMappingChange(column, value)}
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Select target field" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetFieldOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button onClick={handleReview} className="bg-[#414257] hover:bg-[#5c5f7a]">
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#414257]">Review Import Configuration</CardTitle>
              <CardDescription>
                Verify your settings before running the import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-[#5c5f7a] text-sm">File</Label>
                <p className="font-medium text-[#414257]">{file?.name}</p>
              </div>

              <div>
                <Label className="text-[#5c5f7a] text-sm mb-2 block">Active Mappings</Label>
                <div className="space-y-2">
                  {Object.entries(columnMapping).filter(([_, target]) => target).map(([csvCol, target]) => (
                    <div key={csvCol} className="flex items-center justify-between p-2 bg-[#e3e4ed] rounded">
                      <span className="text-sm text-[#414257]">{csvCol}</span>
                      <span className="text-sm text-[#5c5f7a]">→</span>
                      <Badge variant="secondary">{target}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Important</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      This will create or update associations, units, and owners based on the mapped data.
                      Existing records will be matched by name/code and updated.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep('map')}>
              Back to Mapping
            </Button>
            <Button 
              onClick={handleRunImport} 
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating Job...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Import
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}