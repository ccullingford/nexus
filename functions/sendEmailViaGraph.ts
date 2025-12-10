/**
 * Send email via Microsoft Graph API using client credentials
 * 
 * @param {Object} params
 * @param {string[]} params.to - Array of recipient email addresses
 * @param {string[]} [params.cc] - Array of CC email addresses (optional)
 * @param {string} params.subject - Email subject
 * @param {string} [params.htmlBody] - HTML email body (optional)
 * @param {string} [params.textBody] - Plain text email body (optional)
 * @returns {Object} - { success: boolean, messageId?: string, error?: string }
 */
export default async function sendEmailViaGraph({ to, cc, subject, htmlBody, textBody }, { base44, secrets }) {
  try {
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

    // Get secrets
    const tenantId = secrets.GRAPH_TENANT_ID;
    const clientId = secrets.GRAPH_CLIENT_ID;
    const clientSecret = secrets.GRAPH_CLIENT_SECRET;
    const senderAddress = secrets.GRAPH_SENDER_ADDRESS;

    if (!tenantId || !clientId || !clientSecret || !senderAddress) {
      throw new Error('Missing required Graph API secrets. Please configure GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, and GRAPH_SENDER_ADDRESS.');
    }

    // Get access token using client credentials flow
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
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}. ${JSON.stringify(errorData)}`);
    }

    const { access_token } = await tokenResponse.json();

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
      throw new Error(
        `Microsoft Graph API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    return {
      success: true,
      message: 'Email sent successfully via Microsoft Graph'
    };

  } catch (error) {
    console.error('Error sending email via Graph:', error);
    return {
      success: false,
      error: error.message
    };
  }
}