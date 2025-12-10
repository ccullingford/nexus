import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, addDays } from 'date-fns';

export default function InvoiceManagerNew() {
  const queryClient = useQueryClient();
  
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('name', 500),
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    notes: '',
    line_items: [{ description: '', quantity: 1, price: 0, amount: 0 }],
    tax: 0
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;
    
    // Build customer address
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
      status: 'draft'
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
          <h1 className="text-2xl font-bold text-[#414257]">New Invoice</h1>
          <p className="text-[#5c5f7a] mt-1">Create a new invoice manually</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#414257]">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Customer *</Label>
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
            </div>
            
            {selectedCustomer && (
              <div className="p-4 bg-[#e3e4ed] rounded-lg">
                <p className="font-medium text-[#414257]">{selectedCustomer.name}</p>
                {selectedCustomer.email && <p className="text-sm text-[#5c5f7a]">{selectedCustomer.email}</p>}
                {selectedCustomer.address && (
                  <p className="text-sm text-[#5c5f7a] mt-1">
                    {selectedCustomer.address}
                    {selectedCustomer.city && `, ${selectedCustomer.city}`}
                    {selectedCustomer.state && `, ${selectedCustomer.state}`}
                    {selectedCustomer.zip && ` ${selectedCustomer.zip}`}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#414257]">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title (optional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Monthly Services - January 2024"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or payment instructions..."
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
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#414257] hover:bg-[#5c5f7a]"
            disabled={createInvoiceMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}