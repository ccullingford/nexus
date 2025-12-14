import React from 'react';
import { ClipboardList } from 'lucide-react';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function ResidentForms() {
  return (
    <PlaceholderPage
      title="Resident Forms"
      description="Create and manage resident requests, architectural applications, maintenance submissions, and more."
      icon={ClipboardList}
    />
  );
}