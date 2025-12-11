import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { requirePermission } from './checkPermission.js';
import { PERMISSIONS } from '../utils/permissions.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request body
    const { to, cc, subject, htmlBody, textBody, attachments } = await req.json();
    
    console.log('=== sendEmailViaGraph function called ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Parameters received:', { 
      to, 
      cc, 
      subject, 
      hasHtmlBody: !!htmlBody, 
      hasTextBody: !!textBody,
      attachmentCount: attachments?.length || 0 
    });
    
    // VALIDATION: to array
    if (!to || !Array.isArray(to) || to.length === 0) {
      const error = 'Missing or invalid "to" parameter. Must be a non-empty array of email addresses.';
      console.error('[VALIDATION ERROR]', error);
      return Response.json({
        success: false,
        error: error
      }, { status: 400 });
    }
    
    // VALIDATION: subject
    if (!subject) {
      const error = 'Missing "subject" parameter.';
      console.error('[VALIDATION ERROR]', error);
      return Response.json({
        success: false,
        error: error
      }, { status: 400 });
    }
    
    // VALIDATION: email body
    if (!htmlBody && !textBody) {
      const error = 'Email body must contain htmlBody or textBody.';
      console.error('[VALIDATION ERROR]', error);
      return Response.json({
        success: false,
        error: error
      }, { status: 400 });
    }
    
    // VALIDATION: attachments format (if present)
    if (attachments && Array.isArray(attachments)) {
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (!att.fileName || !att.contentType || !att.contentBytes) {
          const error = `Attachment at index ${i} is missing required fields (fileName, contentType, contentBytes).`;
          console.error('[VALIDATION ERROR]', error);
          return Response.json({
            success: false,
            error: error
          }, { status: 400 });
        }
      }
    }

    // Get secrets from environment
    const tenantId = Deno.env.get('GRAPH_TENANT_ID');
    const clientId = Deno.env.get('GRAPH_CLIENT_ID');
    const clientSecret = Deno.env.get('GRAPH_CLIENT_SECRET');
    const senderAddress = Deno.env.get('GRAPH_SENDER_ADDRESS');

    console.log('Secrets check:', {
      hasTenantId: !!tenantId,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasSenderAddress: !!senderAddress
    });

    if (!tenantId || !clientId || !clientSecret || !senderAddress) {
      const error = 'Missing required Graph API secrets. Please configure GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_SENDER_ADDRESS.';
      console.error('[CONFIGURATION ERROR]', error);
      return Response.json({
        success: false,
        error: error
      }, { status: 500 });
    }

    // Get access token using client credentials flow
    console.log('Requesting access token from Azure AD...');
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        })
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      const error = `Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}`;
      console.error('[GRAPH AUTH ERROR]', new Date().toISOString(), error, errorData);
      return Response.json({
        success: false,
        error: error
      }, { status: 500 });
    }

    const { access_token } = await tokenResponse.json();
    console.log('Access token obtained successfully');

    // Build the email message in Microsoft Graph format
    const message = {
      subject: subject,
      body: {
        contentType: htmlBody ? 'HTML' : 'Text',
        content: htmlBody || textBody
      },
      toRecipients: to.map(email => ({
        emailAddress: { address: email }
      }))
    };

    // Add CC recipients if provided
    if (cc && Array.isArray(cc) && cc.length > 0) {
      message.ccRecipients = cc.map(email => ({
        emailAddress: { address: email }
      }));
    }

    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      message.attachments = attachments.map(attachment => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.fileName,
        contentType: attachment.contentType,
        contentBytes: attachment.contentBytes
      }));
      console.log(`Added ${attachments.length} attachment(s)`);
    }
    
    const payload = {
      message,
      saveToSentItems: true
    };

    // Send email via Microsoft Graph API using the sender address
    console.log('Sending email via Microsoft Graph...');
    console.log('Sender address:', senderAddress);
    console.log('Recipients (to):', to);
    console.log('Recipients (cc):', cc || '(none)');
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${senderAddress}/sendMail`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = `Microsoft Graph API error: ${response.status} ${response.statusText}`;
      console.error('[GRAPH API ERROR]', new Date().toISOString(), error, errorData);
      return Response.json({
        success: false,
        error: error
      }, { status: 500 });
    }

    console.log('=== Email sent successfully ===', new Date().toISOString());
    
    return Response.json({
      success: true
    });

  } catch (error) {
    console.error('=== Error in sendEmailViaGraph ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});