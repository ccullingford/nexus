import React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function InvoicePreview({ invoice }) {
  return (
    <div className="bg-white p-8 rounded-lg border border-gray-200 max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="border-b-2 border-[#414257] pb-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#414257]">INVOICE</h1>
            {invoice.title && (
              <p className="text-lg text-[#5c5f7a] mt-2">{invoice.title}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-[#5c5f7a]">Invoice Number</p>
            <p className="text-lg font-semibold text-[#414257]">{invoice.invoice_number}</p>
          </div>
        </div>
      </div>

      {/* Dates and Bill To */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-semibold text-[#414257] mb-3">Bill To:</h3>
          <div className="text-[#5c5f7a]">
            <p className="font-semibold text-[#414257]">{invoice.customer_name}</p>
            {invoice.customer_email && (
              <p className="text-sm mt-1">{invoice.customer_email}</p>
            )}
            {invoice.customer_address && (
              <p className="text-sm mt-1">{invoice.customer_address}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="space-y-2">
            <div>
              <span className="text-sm text-[#5c5f7a]">Issue Date: </span>
              <span className="font-medium text-[#414257]">
                {invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : '—'}
              </span>
            </div>
            <div>
              <span className="text-sm text-[#5c5f7a]">Due Date: </span>
              <span className="font-medium text-[#414257]">
                {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="text-center font-semibold">Qty</TableHead>
              <TableHead className="text-right font-semibold">Price</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
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

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between">
            <span className="text-[#5c5f7a]">Subtotal:</span>
            <span className="font-semibold text-[#414257]">${invoice.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5c5f7a]">Tax:</span>
            <span className="font-semibold text-[#414257]">${invoice.tax?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-[#414257] pt-2">
            <span className="font-semibold text-[#414257]">Total:</span>
            <span className="text-xl font-bold text-[#414257]">${invoice.total?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold text-[#414257] mb-2">Notes:</h3>
          <p className="text-sm text-[#5c5f7a] whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}