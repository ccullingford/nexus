import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, FileText, Loader, Check, Plus, Trash2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, addDays } from 'date-fns';

export default function InvoiceManagerUpload() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('upload'); // upload, extracted, preview
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('name', 500),
  });

  const [formData, setFormData] = useState({
    title: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    notes: '',
    line_items: [],
    tax: 0
  });

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;

    setUploading(true);
    
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from receipt
      const extractionSchema = {
        type: 'object',
        properties: {
          vendor_name: { type: 'string' },
          issue_date: { type: 'string', format: 'date' },
          total_amount: { type: 'number' },
          subtotal: { type: 'number' },
          tax: { type: 'number' },
          line_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' },
                amount: { type: 'number' }
              }
            }
          }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: extractionSchema
      });

      if (result.status === 'success' && result.output) {
        setExtractedData({
          ...result.output,
          receipt_url: file_url
        });
        
        setFormData({
          title: result.output.vendor_name || '',
          issue_date: result.output.issue_date || format(new Date(), 'yyyy-MM-dd'),
          due_date: format(addDays(new Date(result.output.issue_date || new Date()), 30), 'yyyy-MM-dd'),
          notes: '',
          line_items: result.output.line_items || [],
          tax: result.output.tax || 0
        });
        
        setStep('extracted');
      } else {
        alert('Failed to extract data from receipt: ' + (result.details || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading/extracting:', error);
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index] = {
      ...newLineItems[index],
      [field]: field === 'description' ? value : parseFloat(value) || 0
    };
    
    if (field === 'quantity' || field === 'price') {
      newLineItems[index].amount = newLineItems[index].quantity * newLineItems[index].price;
    }
    
    setFormData({ ...formData, line_items: newLineItems });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, price: 0, amount: 0 }]
    });
  };

  const removeLineItem = (index) => {
    setFormData({
      ...formData,
      line_items: formData.line_items.filter((_, i) => i !== index)
    });
  };

  const subtotal = formData.line_items.reduce((sum, item) => sum + item.amount, 0);
  const total = subtotal + formData.tax;

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData) => {
      return await base44.entities.Invoice.create(invoiceData);
    },
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      window.location.href = createPageUrl('InvoiceManagerDetail') + `?id=${newInvoice.id}`;
    },
  });

  const handleSaveInvoice = async () => {
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    const invoiceNumber = `INV-${Date.now()}`;
    
    const addressParts = [
      selectedCustomer.address,
      selectedCustomer.city,
      selectedCustomer.state,
      selectedCustomer.zip
    ].filter(Boolean);
    const customerAddress = addressParts.join(', ');

    const invoiceData = {
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_email: selectedCustomer.email || '',
      customer_address: customerAddress,
      title: formData.title,
      issue_date: formData.issue_date,
      due_date: formData.due_date,
      notes: formData.notes,
      line_items: formData.line_items.filter(item => item.description),
      subtotal: subtotal,
      tax: formData.tax,
      total: total,
      status: 'draft',
      vendor_name: extractedData?.vendor_name,
      receipt_url: extractedData?.receipt_url
    };

    createInvoiceMutation.mutate(invoiceData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#414257]">Upload Receipt</h1>
          <p className="text-[#5c5f7a] mt-1">Extract invoice data from receipt using AI</p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#414257]">Upload Receipt File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-[#e3e4ed] rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-[#5c5f7a] mx-auto mb-4" />
              <p className="text-[#414257] font-medium mb-2">
                {file ? file.name : 'Choose a file to upload'}
              </p>
              <p className="text-sm text-[#5c5f7a] mb-4">
                Supports PDF, PNG, JPG, JPEG
              </p>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="max-w-xs mx-auto"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleUploadAndExtract}
                disabled={!file || uploading}
                className="bg-[#414257] hover:bg-[#5c5f7a]"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Extract
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Edit Extracted Data */}
      {step === 'extracted' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-800">
                Data extracted successfully! Review and edit below, then select a customer.
              </p>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#414257]">Select Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.email && `(${customer.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#414257]">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Invoice title"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#414257]">Line Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="w-[15%]">Qty</TableHead>
                      <TableHead className="w-[20%]">Price</TableHead>
                      <TableHead className="w-[20%]">Amount</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.line_items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => handleLineItemChange(index, 'price', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${item.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {formData.line_items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 space-y-3 max-w-sm ml-auto">
                <div className="flex justify-between">
                  <span className="text-[#5c5f7a]">Subtotal:</span>
                  <span className="font-semibold text-[#414257]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label>Tax:</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                    className="w-32"
                  />
                </div>
                <div className="flex justify-between text-lg border-t pt-3">
                  <span className="font-semibold text-[#414257]">Total:</span>
                  <span className="font-bold text-[#414257]">${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('upload');
                setFile(null);
                setExtractedData(null);
              }}
            >
              Start Over
            </Button>
            <Button
              onClick={handleSaveInvoice}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
              disabled={createInvoiceMutation.isPending || !selectedCustomerId}
            >
              <Save className="w-4 h-4 mr-2" />
              {createInvoiceMutation.isPending ? 'Saving...' : 'Save Invoice'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}