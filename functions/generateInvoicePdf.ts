import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice } = await req.json();

    if (!invoice) {
      throw new Error('Invoice data is required');
    }

    console.log('Generating PDF for invoice:', invoice.invoice_number);

    const doc = new jsPDF();

    // Header
    doc.setFillColor(65, 66, 87);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(`Invoice ${invoice.invoice_number}`, 15, 20);

    // Reset text color
    doc.setTextColor(65, 66, 87);

    // Title (if exists)
    let yPos = 45;
    if (invoice.title) {
      doc.setFontSize(16);
      doc.text(invoice.title, 15, yPos);
      yPos += 10;
    }

    // Bill To section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', 15, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 7;
    doc.text(invoice.customer_name, 15, yPos);
    
    if (invoice.customer_address) {
      yPos += 5;
      doc.setFontSize(10);
      doc.setTextColor(92, 95, 122);
      const addressLines = doc.splitTextToSize(invoice.customer_address, 80);
      doc.text(addressLines, 15, yPos);
      yPos += addressLines.length * 5;
    }

    doc.setTextColor(65, 66, 87);
    doc.setFontSize(12);
    yPos += 10;

    // Dates
    if (invoice.issue_date) {
      doc.setFont(undefined, 'bold');
      doc.text('Issue Date: ', 15, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(new Date(invoice.issue_date).toLocaleDateString(), 50, yPos);
      yPos += 7;
    }

    if (invoice.due_date) {
      doc.setFont(undefined, 'bold');
      doc.text('Due Date: ', 15, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(new Date(invoice.due_date).toLocaleDateString(), 50, yPos);
      yPos += 7;
    }

    yPos += 10;

    // Line items table
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Description', 15, yPos);
    doc.text('Qty', 120, yPos, { align: 'center' });
    doc.text('Price', 150, yPos, { align: 'right' });
    doc.text('Amount', 195, yPos, { align: 'right' });
    
    yPos += 3;
    doc.line(15, yPos, 195, yPos);
    yPos += 7;

    // Line items
    doc.setFont(undefined, 'normal');
    if (invoice.line_items && invoice.line_items.length > 0) {
      invoice.line_items.forEach((item) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const description = doc.splitTextToSize(item.description || '', 90);
        doc.text(description, 15, yPos);
        doc.text(String(item.quantity || 0), 120, yPos, { align: 'center' });
        doc.text(`$${(item.price || 0).toFixed(2)}`, 150, yPos, { align: 'right' });
        doc.text(`$${(item.amount || 0).toFixed(2)}`, 195, yPos, { align: 'right' });
        
        yPos += Math.max(description.length * 5, 7);
      });
    }

    yPos += 5;
    doc.line(15, yPos, 195, yPos);
    yPos += 10;

    // Totals
    doc.setFont(undefined, 'normal');
    doc.text('Subtotal:', 140, yPos);
    doc.text(`$${(invoice.subtotal || 0).toFixed(2)}`, 195, yPos, { align: 'right' });
    yPos += 7;

    doc.text('Tax:', 140, yPos);
    doc.text(`$${(invoice.tax || 0).toFixed(2)}`, 195, yPos, { align: 'right' });
    yPos += 7;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Total:', 140, yPos);
    doc.text(`$${(invoice.total || 0).toFixed(2)}`, 195, yPos, { align: 'right' });

    // Notes (if exists)
    if (invoice.notes) {
      yPos += 15;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Notes:', 15, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      const notesLines = doc.splitTextToSize(invoice.notes, 180);
      doc.text(notesLines, 15, yPos);
    }

    // Get PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    console.log('PDF generated successfully');

    return Response.json({
      success: true,
      pdfBase64: pdfBase64,
      fileName: `Invoice-${invoice.invoice_number}.pdf`
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});