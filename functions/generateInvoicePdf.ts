import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { invoice } = await req.json();

    console.log('=== generateInvoicePdf function called ===');
    console.log('Timestamp:', new Date().toISOString());
    
    // VALIDATION: invoice object
    if (!invoice) {
      const error = 'Invoice data is required';
      console.error('[VALIDATION ERROR]', error);
      return Response.json({ 
        success: false,
        error: error 
      }, { status: 400 });
    }

    console.log('Generating PDF for invoice:', invoice.invoice_number);

    const doc = new jsPDF();

    // Fetch and add logo
    try {
      const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69399eba1974c30a72b7b5de/06e4cf148_NewLogo.png';
      const logoResponse = await fetch(logoUrl);
      const logoArrayBuffer = await logoResponse.arrayBuffer();
      const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoArrayBuffer)));
      const logoDataUrl = `data:image/png;base64,${logoBase64}`;
      
      // Add logo (small size, top left)
      doc.addImage(logoDataUrl, 'PNG', 15, 15, 25, 10);
    } catch (logoError) {
      console.warn('[LOGO ERROR]', 'Failed to load logo:', logoError.message);
      // Continue without logo
    }

    // Company Header (top left, next to logo) and Invoice Info (top right)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('JCC Property Group', 42, 20);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('PO Box 1799', 42, 26);
    doc.text('Indian Trail, NC 28079 United States', 42, 31);
    doc.text('INFO@JCCPG.COM | (704) 595-9282', 42, 36);

    // Invoice number and issue date (top right)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Invoice #${invoice.invoice_number}`, 195, 20, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('Issue date', 195, 26, { align: 'right' });
    if (invoice.issue_date) {
      doc.text(new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 195, 31, { align: 'right' });
    }

    // Gray separator line
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(15, 42, 195, 42);

    // Main Invoice Heading
    let yPos = 55;
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Invoice #${invoice.invoice_number}`, 15, yPos);
    
    // Subtitle (title field)
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    if (invoice.title) {
      doc.text(invoice.title, 15, yPos);
    }

    // Three-column section: Customer | Invoice Details | Payment
    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    
    // Customer column
    doc.text('Customer', 15, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.customer_name, 15, yPos + 5);
    if (invoice.customer_email) {
      doc.text(invoice.customer_email, 15, yPos + 10);
    }

    // Invoice Details column
    doc.setFont(undefined, 'bold');
    doc.text('Invoice Details', 80, yPos);
    doc.setFont(undefined, 'normal');
    const createdDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    doc.text(`PDF created ${createdDate}`, 80, yPos + 5);
    doc.text(`$${(invoice.total || 0).toFixed(2)}`, 80, yPos + 10);

    // Payment column
    doc.setFont(undefined, 'bold');
    doc.text('Payment', 145, yPos);
    doc.setFont(undefined, 'normal');
    if (invoice.due_date) {
      const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      doc.text(`Due ${dueDate}`, 145, yPos + 5);
    }
    doc.text(`$${(invoice.total || 0).toFixed(2)}`, 145, yPos + 10);

    yPos += 25;

    // Line items table header
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Items', 15, yPos);
    doc.text('Quantity', 130, yPos, { align: 'right' });
    doc.text('Price', 160, yPos, { align: 'right' });
    doc.text('Amount', 195, yPos, { align: 'right' });
    
    yPos += 2;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(15, yPos, 195, yPos);
    yPos += 8;

    // Line items
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    if (invoice.line_items && invoice.line_items.length > 0) {
      invoice.line_items.forEach((item) => {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        const description = doc.splitTextToSize(item.description || '', 110);
        doc.text(description, 15, yPos);
        doc.text(String(item.quantity || 0), 130, yPos, { align: 'right' });
        doc.text(`$${(item.price || 0).toFixed(2)}`, 160, yPos, { align: 'right' });
        doc.text(`$${(item.amount || 0).toFixed(2)}`, 195, yPos, { align: 'right' });
        
        yPos += Math.max(description.length * 5, 8);
      });
    }

    yPos += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(15, yPos, 195, yPos);
    yPos += 8;

    // Subtotal
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('Subtotal', 15, yPos);
    doc.text(`$${(invoice.subtotal || 0).toFixed(2)}`, 195, yPos, { align: 'right' });
    
    // Only show tax if it exists
    if (invoice.tax && invoice.tax > 0) {
      yPos += 7;
      doc.text('Tax', 15, yPos);
      doc.text(`$${invoice.tax.toFixed(2)}`, 195, yPos, { align: 'right' });
    }

    yPos += 15;

    // Total Due - prominent
    doc.setFont(undefined, 'bold');
    doc.setFontSize(16);
    doc.text('Total Due', 15, yPos);
    doc.text(`$${(invoice.total || 0).toFixed(2)}`, 195, yPos, { align: 'right' });

    // Notes (if exists)
    if (invoice.notes) {
      yPos += 20;
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Notes:', 15, yPos);
      yPos += 6;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80, 80, 80);
      const notesLines = doc.splitTextToSize(invoice.notes, 180);
      doc.text(notesLines, 15, yPos);
      doc.setTextColor(0, 0, 0);
    }

    // Footer - Page number
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Page 1 of 1', 195, 285, { align: 'right' });

    // Get PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    console.log('=== PDF generated successfully ===', new Date().toISOString());

    return Response.json({
      success: true,
      pdfBase64: pdfBase64,
      fileName: `Invoice-${invoice.invoice_number}.pdf`
    });

  } catch (error) {
    console.error('=== Error in generateInvoicePdf ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});