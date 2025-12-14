import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  FileText, 
  Upload, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Plus,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  sent: 'bg-purple-100 text-purple-800 border-purple-200',
  paid: 'bg-green-100 text-green-800 border-green-200'
};

export default function InvoiceManager() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 100),
  });

  // Calculate metrics
  const metrics = React.useMemo(() => {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const outstandingInvoices = invoices.filter(inv => inv.status !== 'paid');
    const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const statusCounts = {
      draft: invoices.filter(inv => inv.status === 'draft').length,
      approved: invoices.filter(inv => inv.status === 'approved').length,
      sent: invoices.filter(inv => inv.status === 'sent').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
    };

    return {
      totalInvoices,
      totalAmount,
      outstandingCount: outstandingInvoices.length,
      outstandingAmount,
      ...statusCounts
    };
  }, [invoices]);

  const recentInvoices = invoices.slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#414257]">Invoice Manager</h1>
            <p className="text-[#5c5f7a] mt-1">Manage invoices, customers, and billing</p>
          </div>
          <Link to={createPageUrl('InvoiceManagerAdmin')}>
            <Button variant="ghost" size="sm" className="text-[#5c5f7a] hover:text-[#414257]">
              Admin
            </Button>
          </Link>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl('InvoiceManagerUpload')}>
            <Button variant="outline" className="border-[#414257] text-[#414257] hover:bg-[#e3e4ed]">
              <Upload className="w-4 h-4 mr-2" />
              Upload Receipt
            </Button>
          </Link>
          <Link to={createPageUrl('InvoiceManagerNew')}>
            <Button className="bg-[#414257] hover:bg-[#5c5f7a]">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5c5f7a] mb-1">Total Invoices</p>
                <p className="text-2xl font-bold text-[#414257]">{metrics.totalInvoices}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5c5f7a] mb-1">Outstanding</p>
                <p className="text-2xl font-bold text-[#414257]">{metrics.outstandingCount}</p>
                <p className="text-xs text-[#5c5f7a] mt-1">${metrics.outstandingAmount.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5c5f7a] mb-1">Total Billed</p>
                <p className="text-2xl font-bold text-[#414257]">${metrics.totalAmount.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#5c5f7a] mb-1">Paid Invoices</p>
                <p className="text-2xl font-bold text-[#414257]">{metrics.paid}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to={createPageUrl('InvoiceManagerInvoices')}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#e3e4ed] flex items-center justify-center group-hover:bg-[#414257] transition-colors">
                  <FileText className="w-6 h-6 text-[#414257] group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#414257] group-hover:text-[#5c5f7a] transition-colors">
                    View All Invoices
                  </h3>
                  <p className="text-sm text-[#5c5f7a]">{metrics.totalInvoices} total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('InvoiceManagerCustomers')}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#e3e4ed] flex items-center justify-center group-hover:bg-[#414257] transition-colors">
                  <Users className="w-6 h-6 text-[#414257] group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#414257] group-hover:text-[#5c5f7a] transition-colors">
                    Manage Customers
                  </h3>
                  <p className="text-sm text-[#5c5f7a]">Billing contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('InvoiceManagerUpload')}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#e3e4ed] flex items-center justify-center group-hover:bg-[#414257] transition-colors">
                  <Upload className="w-6 h-6 text-[#414257] group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#414257] group-hover:text-[#5c5f7a] transition-colors">
                    Upload Receipt
                  </h3>
                  <p className="text-sm text-[#5c5f7a]">AI extraction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Invoices */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#414257]">Recent Invoices</CardTitle>
              <CardDescription>Latest invoices by creation date</CardDescription>
            </div>
            <Link to={createPageUrl('InvoiceManagerInvoices')}>
              <Button variant="ghost" size="sm" className="text-[#414257]">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-[#5c5f7a]">Loading invoices...</div>
          ) : recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-[#5c5f7a]">
              No invoices yet. Create your first invoice to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => window.location.href = createPageUrl('InvoiceManagerDetail') + `?id=${invoice.id}`}
                    >
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>
                        {invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="font-semibold">${(invoice.total || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${statusColors[invoice.status]} border capitalize`}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}