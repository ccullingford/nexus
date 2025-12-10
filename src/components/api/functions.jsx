import { base44 } from '@/api/base44Client';

export const sendEmailViaGraph = (payload) => 
  base44.functions.invoke('sendEmailViaGraph', payload);

export const generateInvoicePdf = (payload) => 
  base44.functions.invoke('generateInvoicePdf', payload);