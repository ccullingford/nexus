import React from 'react';
import { FileText } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function InvoiceFlow() {
  return (
    <PlaceholderPage
      title="Invoice Flow"
      description="Streamline invoice processing with automated workflows, approval chains, and payment tracking."
      icon={FileText}
    />
  );
}