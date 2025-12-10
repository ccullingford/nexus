import React from 'react';
import InvoiceForm from '@/components/invoice/InvoiceForm';

export default function InvoiceManagerEdit() {
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get('id');

  return <InvoiceForm mode="edit" invoiceId={invoiceId} />;
}