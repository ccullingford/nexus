import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Upload, FileText, Loader, Check, Plus, Trash2, Save, Split } from 'lucide-react';
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
  const [step, setStep] = useState('upload'); // upload, review
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [createSeparateInvoices, setCreateSeparateInvoices] = useState(false);

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
        const newReceipt = {
          id: Date.now().toString(),
          fileName: file.name,
          receiptUrl: file_url,
          vendorName: result.output.vendor_name,
          invoiceDate: result.output.issue_date,
          lineItems: result.output.line_items || [],
          subtotal: result.output.subtotal,
          tax: result.output.tax,
          total: result.output.total_amount
        };
        
        setReceipts([...receipts, newReceipt]);
        
        // Auto-set form title from first receipt
        if (receipts.length === 0 && result.output.vendor_name) {
          setFormData(prev => ({ ...prev, title: result.output.vendor_name }));
        }
        
        setFile(null);
        if (receipts.length === 0) {
          setStep('review');
        }
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

  const removeReceipt = (receiptId) => {
    setReceipts(receipts.filter(r => r.id !== receiptId));
    if (receipts.length === 1) {
      setStep('upload');
    }
  };

  const deduplicateLineItems = (allLineItems) => {
    const dedupMap = {};
    
    allLineItems.forEach(item => {
      const key = `${item.description.toLowerCase().trim()}_${item.price}`;
      
      if (dedupMap[key]) {
        dedupMap[key].quantity += item.quantity;
        dedupMap[key].amount = dedupMap[key].quantity * dedupMap[key].price;
      } else {
        dedupMap[key] = { ...item };
      }
    });
    
    return Object.values(dedupMap);
  };

  const getCombinedLineItems = () => {
    const allLineItems = receipts.flatMap(r => r.lineItems);
    return deduplicateLineItems(allLineItems);
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

  const combinedLineItems = step === 'review' ? getCombinedLineItems() : formData.line_items;
  const subtotal = combinedLineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const total = subtotal + (formData.tax || 0);

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

    if (receipts.length === 0) {
      alert('Please upload at least one receipt');
      return;
    }

    const addressParts = [
      selectedCustomer.address,
      selectedCustomer.city,
      selectedCustomer.state,
      selectedCustomer.zip
    ].filter(Boolean);
    const customerAddress = addressParts.join(', ');

    if (createSeparateInvoices) {
      // Create separate invoice for each receipt
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];
        const invoiceNumber = `INV-${Date.now()}-${i + 1}`;
        const receiptSubtotal = receipt.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        const receiptTotal = receiptSubtotal + (receipt.tax || 0);

        const invoiceData = {
          invoice_number: invoiceNumber,
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          customer_email: selectedCustomer.email || '',
          customer_secondary_email: selectedCustomer.secondary_email || '',
          customer_send_only_to_secondary_email: selectedCustomer.send_only_to_secondary_email || false,
          customer_address: customerAddress,
          title: receipt.vendorName || formData.title,
          issue_date: receipt.invoiceDate || formData.issue_date,
          due_date: formData.due_date,
          notes: formData.notes,
          line_items: receipt.lineItems.filter(item => item.description),
          subtotal: receiptSubtotal,
          tax: receipt.tax || 0,
          total: receiptTotal,
          status: 'draft',
          vendor_name: receipt.vendorName,
          receipt_url: receipt.receiptUrl
        };

        await base44.entities.Invoice.create(invoiceData);
      }

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      window.location.href = createPageUrl('InvoiceManagerInvoices');
    } else {
      // Create single combined invoice
      const invoiceNumber = `INV-${Date.now()}`;
      const vendorNames = [...new Set(receipts.map(r => r.vendorName).filter(Boolean))].join(', ');
      const receiptUrls = receipts.map(r => r.receiptUrl).join('\n');

      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        customer_email: selectedCustomer.email || '',
        customer_secondary_email: selectedCustomer.secondary_email || '',
        customer_send_only_to_secondary_email: selectedCustomer.send_only_to_secondary_email || false,
        customer_address: customerAddress,
        title: formData.title,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        notes: formData.notes + (receipts.length > 1 ? `\n\nCombined from ${receipts.length} receipts` : ''),
        line_items: combinedLineItems.filter(item => item.description),
        subtotal: subtotal,
        tax: formData.tax,
        total: total,
        status: 'draft',
        vendor_name: vendorNames,
        receipt_url: receiptUrls
      };

      createInvoiceMutation.mutate(invoiceData);
    }
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

      {/* Upload Step */}
      {(step === 'upload' || step === 'review') && (
        <>
          {receipts.length > 0 && (
            <Card className="border-0 shadow-sm bg-blue-50">
              <CardContent className="p-4">
                <p className="text-blue-800 font-medium">
                  {receipts.length} receipt{receipts.length > 1 ? 's' : ''} uploaded. Line items will be combined and deduplicated.
                </p>
              </CardContent>
            </Card>
          )}

          {receipts.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#414257]">Uploaded Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-3 bg-[#e3e4ed] rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-[#414257]">{receipt.fileName}</p>
                        <div className="flex gap-4 mt-1 text-sm text-[#5c5f7a]">
                          {receipt.vendorName && <span>Vendor: {receipt.vendorName}</span>}
                          <span>{receipt.lineItems.length} items</span>
                          {receipt.total && <span>Total: ${receipt.total.toFixed(2)}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeReceipt(receipt.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#414257]">
                {receipts.length > 0 ? 'Add Another Receipt' : 'Upload Receipt File'}
              </CardTitle>
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

              <div className="flex justify-end gap-3">
                {receipts.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                    }}
                  >
                    Continue to Invoice
                  </Button>
                )}
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
                      {receipts.length > 0 ? 'Add Receipt' : 'Upload & Extract'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Review Step */}
      {step === 'review' && receipts.length > 0 && (
        <div className="space-y-6">
          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-800">
                {receipts.length} receipt{receipts.length > 1 ? 's' : ''} processed! Line items have been combined and duplicates merged.
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

          {/* Invoice Options */}
          {receipts.length > 1 && (
            <Card className="border-0 shadow-sm bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Split className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createSeparateInvoices}
                          onChange={(e) => setCreateSeparateInvoices(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="font-medium text-amber-900">
                          Create separate invoice for each receipt
                        </span>
                      </label>
                    </div>
                    <p className="text-sm text-amber-800 mt-1">
                      {createSeparateInvoices 
                        ? `Will create ${receipts.length} individual invoices, one for each receipt` 
                        : 'Will combine all receipts into one invoice with deduplicated line items'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
          {!createSeparateInvoices && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#414257]">
                  {receipts.length > 1 ? 'Combined Line Items' : 'Line Items'}
                </CardTitle>
                {receipts.length > 1 && (
                  <p className="text-sm text-[#5c5f7a] mt-1">
                    Duplicate items with matching description and price have been combined
                  </p>
                )}
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
                    {combinedLineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.price?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">${item.amount?.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
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
          )}

          {/* Summary for separate invoices */}
          {createSeparateInvoices && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#414257]">Invoices to Create</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {receipts.map((receipt, index) => {
                    const receiptSubtotal = receipt.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
                    const receiptTotal = receiptSubtotal + (receipt.tax || 0);
                    return (
                      <div key={receipt.id} className="p-3 bg-[#e3e4ed] rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-[#414257]">Invoice #{index + 1}</p>
                            <p className="text-sm text-[#5c5f7a] mt-1">
                              {receipt.vendorName || 'No vendor'} • {receipt.lineItems.length} items
                            </p>
                          </div>
                          <p className="font-semibold text-[#414257]">${receiptTotal.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    Total: {receipts.length} invoice{receipts.length > 1 ? 's' : ''} will be created for {selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : 'the selected customer'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('upload');
                setFile(null);
                setReceipts([]);
              }}
            >
              Add More Receipts
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