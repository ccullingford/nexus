import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Edit, Trash2, Mail, CheckCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import InvoicePreview from '@/components/invoice/InvoicePreview';
import { format } from 'date-fns';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  sent: 'bg-purple-100 text-purple-800 border-purple-200',
  paid: 'bg-green-100 text-green-800 border-green-200'
};

export default function InvoiceManagerDetail() {
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get('id');
  
  const [sendingEmail, setSendingEmail] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.filter({ id: invoiceId });
      return invoices[0];
    },
    enabled: !!invoiceId,
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Invoice.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Invoice.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      window.location.href = createPageUrl('InvoiceManagerInvoices');
    },
  });

  const handleStatusChange = async (newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'paid') {
      updateData.paid_date = new Date().toISOString();
    }
    updateInvoiceMutation.mutate({ id: invoiceId, data: updateData });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoiceMutation.mutate(invoiceId);
    }
  };

  const handleOpenPreview = () => {
    if (!invoice.customer_email && !invoice.customer_secondary_email) {
      alert('This invoice does not have a valid email address. Please update the Customer\'s email before sending.');
      return;
    }
    setPreviewModalOpen(true);
  };

  const handleConfirmSend = async () => {
    setSendingEmail(true);

    try {
      // Build recipient list based on send-only-to-secondary flag
      const recipients = [];

      if (invoice.customer_send_only_to_secondary_email && invoice.customer_secondary_email) {
        // Send only to secondary email
        recipients.push(invoice.customer_secondary_email);
      } else {
        // Default behavior: primary is main recipient
        if (invoice.customer_email) recipients.push(invoice.customer_email);
        // Secondary as CC (handled separately below)
      }

      // Generate PDF
      console.log('Generating PDF for invoice...');
      const pdfResult = await base44.functions.invoke('generateInvoicePdf', { invoice });

      if (!pdfResult.data.success) {
        throw new Error(pdfResult.data.error || 'Failed to generate PDF');
      }

      const { pdfBase64, fileName } = pdfResult.data;
      console.log('PDF generated:', fileName);

      // Build HTML email body
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #414257; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Invoice ${invoice.invoice_number}</h1>
          </div>

          <div style="padding: 20px; border: 1px solid #e3e4ed; border-top: none; border-radius: 0 0 8px 8px;">
            ${invoice.title ? `<h2 style="color: #414257; margin-top: 0;">${invoice.title}</h2>` : ''}

            <p style="color: #414257;">Dear ${invoice.customer_name},</p>

            <p style="color: #414257;">Please find attached your invoice for the amount of <strong>$${invoice.total?.toFixed(2)}</strong>.</p>

            <div style="margin: 20px 0; padding: 15px; background: #f8f8fb; border-radius: 6px;">
              <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p style="margin: 5px 0;"><strong>Issue Date:</strong> ${invoice.issue_date ? format(new Date(invoice.issue_date), 'MMMM d, yyyy') : 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Due Date:</strong> ${invoice.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Amount Due:</strong> $${invoice.total?.toFixed(2)}</p>
            </div>

            ${invoice.notes ? `<div style="margin: 20px 0; padding: 15px; background: #fffbf0; border-left: 4px solid #f59e0b; border-radius: 6px;"><p style="margin: 0;"><strong>Additional Notes:</strong></p><p style="margin: 5px 0;">${invoice.notes}</p></div>` : ''}

            <p style="color: #5c5f7a; font-size: 14px; margin-top: 30px;">
              If you have any questions about this invoice, please contact us.
            </p>
          </div>
        </div>
      `;

      // Send via Microsoft Graph with PDF attachment
      const result = await base44.functions.invoke('sendEmailViaGraph', {
        to: recipients,
        cc: !invoice.customer_send_only_to_secondary_email && invoice.customer_secondary_email 
          ? [invoice.customer_secondary_email] 
          : undefined,
        subject: `Invoice ${invoice.invoice_number}${invoice.title ? ` - ${invoice.title}` : ''}`,
        htmlBody: htmlBody,
        attachments: [
          {
            fileName: fileName,
            contentType: 'application/pdf',
            contentBytes: pdfBase64
          }
        ]
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to send email');
      }

      // Update status to sent if not already paid
      if (invoice.status !== 'paid') {
        await updateInvoiceMutation.mutateAsync({ id: invoiceId, data: { status: 'sent' } });
      }

      setPreviewModalOpen(false);
      alert('Invoice sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send invoice email: ' + error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-[#5c5f7a]">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-12 text-[#5c5f7a]">Invoice not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#414257]">Invoice {invoice.invoice_number}</h1>
              <Badge variant="secondary" className={`${statusColors[invoice.status]} border capitalize`}>
                {invoice.status}
              </Badge>
            </div>
            {invoice.title && <p className="text-[#5c5f7a] mt-1">{invoice.title}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          {/* TODO: Later require "invoice-manager:write" permission */}
          <Button
            variant="outline"
            onClick={() => window.location.href = createPageUrl('InvoiceManagerEdit') + `?id=${invoiceId}`}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Actions Bar */}
      <Card className="border-0 shadow-sm bg-[#e3e4ed]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={invoice.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Set to Draft</SelectItem>
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="sent">Mark as Sent</SelectItem>
                <SelectItem value="paid">Mark as Paid</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleOpenPreview}
              disabled={!invoice.customer_email && !invoice.customer_secondary_email}
              className="bg-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send via Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#414257]">Invoice Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dates */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-[#5c5f7a] mb-1">Issue Date</p>
              <p className="font-medium text-[#414257]">
                {invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#5c5f7a] mb-1">Due Date</p>
              <p className="font-medium text-[#414257]">
                {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            {invoice.paid_date && (
              <div>
                <p className="text-sm text-[#5c5f7a] mb-1">Paid Date</p>
                <p className="font-medium text-green-600">
                  {format(new Date(invoice.paid_date), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div>
            <p className="text-sm text-[#5c5f7a] mb-2">Bill To</p>
            <div className="p-4 bg-[#e3e4ed] rounded-lg">
              <p className="font-semibold text-[#414257]">{invoice.customer_name}</p>
              {invoice.customer_email && (
                <p className="text-sm text-[#5c5f7a] mt-1">{invoice.customer_email}</p>
              )}
              {invoice.customer_address && (
                <p className="text-sm text-[#5c5f7a] mt-1">{invoice.customer_address}</p>
              )}
            </div>
            
            {/* Email routing info (internal only) */}
            {invoice.customer_secondary_email && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-800 mb-1">Email Routing</p>
                {invoice.customer_send_only_to_secondary_email ? (
                  <p className="text-xs text-blue-700">
                    Invoices sent only to: <strong>{invoice.customer_secondary_email}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-blue-700">
                    Primary recipient: <strong>{invoice.customer_email}</strong><br/>
                    CC: <strong>{invoice.customer_secondary_email}</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div>
            <p className="text-sm text-[#5c5f7a] mb-3">Line Items</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.line_items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.price?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">${item.amount?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between">
                <span className="text-[#5c5f7a]">Subtotal:</span>
                <span className="font-semibold text-[#414257]">${invoice.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5c5f7a]">Tax:</span>
                <span className="font-semibold text-[#414257]">${invoice.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg border-t pt-2">
                <span className="font-semibold text-[#414257]">Total:</span>
                <span className="font-bold text-[#414257]">${invoice.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <p className="text-sm text-[#5c5f7a] mb-2">Notes</p>
              <div className="p-4 bg-[#e3e4ed] rounded-lg">
                <p className="text-[#414257] whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            </div>
          )}

          {/* Source Document */}
          {invoice.receipt_url && (
            <div>
              <p className="text-sm text-[#5c5f7a] mb-2">Source Document</p>
              <div className="p-4 bg-[#e3e4ed] rounded-lg">
                <a
                  href={invoice.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#414257] hover:text-[#5c5f7a] font-medium"
                >
                  <FileText className="w-4 h-4" />
                  View Uploaded Receipt
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[#414257]">Preview Invoice Before Sending</DialogTitle>
            <p className="text-sm text-[#5c5f7a]">Review the invoice below before sending it by email.</p>
          </DialogHeader>
          
          <InvoicePreview invoice={invoice} />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewModalOpen(false)}
              disabled={sendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSend}
              disabled={sendingEmail}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendingEmail ? 'Sending...' : 'Send Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}