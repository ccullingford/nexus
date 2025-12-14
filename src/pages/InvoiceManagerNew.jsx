import React from 'react';
import InvoiceForm from '@/components/invoice/InvoiceForm';

export default function InvoiceManagerNew() {
  const params = new URLSearchParams(window.location.search);
  const customerId = params.get('customerId');
  
  return <InvoiceForm mode="create" preselectedCustomerId={customerId} />;
}