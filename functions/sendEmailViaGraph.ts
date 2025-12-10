/**
 * Send email via Microsoft Graph API
 * 
 * @param {Object} params
 * @param {string[]} params.to - Array of recipient email addresses
 * @param {string[]} [params.cc] - Array of CC email addresses (optional)
 * @param {string} params.subject - Email subject
 * @param {string} [params.htmlBody] - HTML email body (optional)
 * @param {string} [params.textBody] - Plain text email body (optional)
 * @returns {Object} - { success: boolean, messageId?: string, error?: string }
 */
export default async function sendEmailViaGraph({ to, cc, subject, htmlBody, textBody }, { base44 }) {
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

    // Get Microsoft Graph access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('microsoftgraph');
    
    if (!accessToken) {
      throw new Error('Microsoft Graph access token not available. Please connect your Microsoft account.');
    }

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

    // Send email via Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

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