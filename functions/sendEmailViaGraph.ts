import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request body
    const { to, cc, subject, htmlBody, textBody } = await req.json();
    
    console.log('=== sendEmailViaGraph function called ===');
    console.log('Parameters received:', { to, cc, subject, hasHtmlBody: !!htmlBody, hasTextBody: !!textBody });
    
    // Validate required parameters
    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new Error('Missing or invalid "to" parameter. Must be a non-empty array of email addresses.');
    }
    if (!subject) {
      throw new Error('Missing "subject" parameter.');
    }
    if (!htmlBody && !textBody) {
      throw new Error('Either "htmlBody" or "textBody" must be provided.');
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
      throw new Error('Missing required Graph API secrets. Please configure GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_SENDER_ADDRESS.');
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
      console.error('Token request failed:', errorData);
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}. ${JSON.stringify(errorData)}`);
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
        body: JSON.stringify({ message })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Graph API error response:', errorData);
      throw new Error(
        `Microsoft Graph API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    console.log('=== Email sent successfully ===');
    
    return Response.json({
      success: true,
      message: 'Email sent successfully via Microsoft Graph'
    });

  } catch (error) {
    console.error('=== Error in sendEmailViaGraph ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});