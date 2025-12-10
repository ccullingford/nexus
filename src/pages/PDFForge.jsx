import React from 'react';
import { FileType } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function PDFForge() {
  return (
    <PlaceholderPage
      title="PDFForge"
      description="Generate, merge, split, and transform PDF documents with powerful document automation tools."
      icon={FileType}
    />
  );
}